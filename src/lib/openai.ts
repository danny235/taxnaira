import OpenAI from "openai";
import { categorizeTransaction } from "./parsers/rule-categorizer";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ OPENAI_API_KEY is not set in environment variables.");
}

const openai = new OpenAI({
  apiKey: apiKey,
});

/**
 * Robust retry wrapper with exponential backoff
 */
async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 2000,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (
      retries > 0 &&
      (error.status === 429 ||
        error.status >= 500 ||
        error.message?.includes("quota"))
    ) {
      console.warn(
        `⚠️ OpenAI error (${error.status}). Retrying in ${delay}ms... (${retries} left)`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function classifyTransaction(description: string) {
  const prompt = `
    You are a Nigerian tax expert assistant. Your task is to categorize a financial transaction based on its description.
    The categories are:
    - 'salary', 'business_revenue', 'freelance_income', 'foreign_income', 'capital_gains', 'crypto_sale', 'subscriptions', 'professional_fees', 'maintenance', 'health', 'donations', 'tax_payments', 'bank_charges', 'expense', 'personal_expense', 'pension_contributions', 'nhf_contributions'
    - sub_category: (string - A dynamic, highly specific 1-3 word category name derived from the narration. E.g. "logistics", "groceries", "web_hosting", "commute".)

    Transaction Description: "${description}"

    Return ONLY a JSON object:
    {
      "main_category": "Choices: Business, Personal",
      "category": "Broad category label (e.g., fuel, rent, salary)",
      "sub_category": "Specific merchant or detail string",
      "confidence": number,
      "reasoning": "string"
    }
  `;

  try {
    const response = await retry(() =>
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that outputs JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from OpenAI");

    return JSON.parse(content);
  } catch (error) {
    console.error("OpenAI Classification Error:", error);
    return {
      main_category: "Personal",
      category: "miscellaneous",
      sub_category: "",
      confidence: 0,
      reasoning: "Error during classification",
    };
  }
}

export async function extractDataFromStatement(
  fileData: string,
  fileType: string,
  userContext?: any,
) {
  // Use a slightly larger chunk size for 4o-mini to reduce requests
  const CHUNK_SIZE = 30000;

  if (fileData.length <= CHUNK_SIZE) {
    return await processChunk(fileData, fileType, userContext);
  }

  console.log(
    `📄 Large file detected (${fileData.length} chars). Splitting into ${Math.ceil(fileData.length / CHUNK_SIZE)} chunks...`,
  );

  const chunks: string[] = [];
  for (let i = 0; i < fileData.length; i += CHUNK_SIZE) {
    chunks.push(fileData.slice(i, i + CHUNK_SIZE));
  }

  let allTransactions: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
    try {
      const transactions = await processChunk(chunks[i], fileType, userContext);
      allTransactions = [...allTransactions, ...transactions];

      // Small pause between chunks to avoid TPM limits
      if (chunks.length > 1 && i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`Error processing chunk ${i + 1}:`, error.message);
      if (error.status === 429) {
        console.warn(
          "⚠️ Rate limit hit. Attempting to return partial results.",
        );
        break;
      }
    }
  }

  return allTransactions;
}

/**
 * Internal helper to process a single chunk of data
 */
async function processChunk(chunkData: string, fileType: string, userContext?: any) {
  const contextPlan = userContext?.accountType 
    ? `The user is importing ${userContext.accountType} transactions. Default all transactions to this type unless clearly otherwise.` 
    : "";

  const prompt = `
    Analyze this part of a ${fileType} bank statement or financial document content.
    ${contextPlan}
    
    Extract every transaction and return them as a JSON object with a key "transactions" which is an array of objects.
    Each object must have:
        - description (string): Clean merchant name or transaction type.
        - amount (number): Positive for both income and expense.
        - date (string): ISO format YYYY-MM-DD.
        - is_income (boolean): true if money entry, false if exit.
        - currency (string): Usually 'NGN'.
        - main_category (string): ONLY "Business" or "Personal".
        - sub_category (string): Specific descriptive name (e.g., 'Bybit', 'Amazon', 'Salary', 'Rent').
        - reasoning (string): Brief logic for the classification.
        - ai_confidence (number): 0 to 1.
    - account_name: (string - Extract the sender or beneficiary name if clearly present in the narration.)

    SELF-AUDIT RULE:
    Double-check every extracted amount against the source text before returning the JSON. Precision is 100% mandatory.

    Content:
    ${chunkData}
  `;

  try {
    const response = await retry(() =>
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that outputs JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 16384,
        temperature: 0,
      }),
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from OpenAI");

    const { repairJson } = await import("./utils/json-repair");
    const result = JSON.parse(repairJson(content));
    return result.transactions || (Array.isArray(result) ? result : []);
  } catch (error: any) {
    console.error("OpenAI Extraction Error:", error.message);
    throw error;
  }
}
