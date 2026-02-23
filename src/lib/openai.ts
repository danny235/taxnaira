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

    Transaction Description: "${description}"

    Return ONLY a JSON object:
    {
      "category": "string",
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
      category: categorizeTransaction(description, false),
      confidence: 0,
      reasoning: "Error during classification",
    };
  }
}

export async function extractDataFromStatement(
  fileData: string,
  fileType: string,
) {
  // Use a slightly larger chunk size for 4o-mini to reduce requests
  const CHUNK_SIZE = 30000;

  if (fileData.length <= CHUNK_SIZE) {
    return await processChunk(fileData, fileType);
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
      const transactions = await processChunk(chunks[i], fileType);
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
async function processChunk(chunkData: string, fileType: string) {
  const prompt = `
    Analyze this part of a ${fileType} bank statement or financial document content.
    Extract every transaction and return them as a JSON object with a key "transactions" which is an array of objects.
    Each object must have:
    - date: (ISO 8601 format)
    - description: (string - Extract the description EXACTLY as it appears in the source file. DO NOT rewrite, DO NOT summarize, DO NOT translate shorthand. It must be a 1:1 copy of the narration.)
    - amount: (number - Extract the value EXACTLY as written. NEVER round. 100.99 must stay 100.99. Return as a clean number without commas or currency symbols. Verified against original line.)
    - is_income: (boolean)
    - category: (Use categories: salary, business_revenue, freelance_income, foreign_income, capital_gains, crypto_sale, subscriptions, professional_fees, maintenance, health, donations, tax_payments, bank_charges, expense, personal_expense)

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
