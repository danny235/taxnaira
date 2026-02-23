import OpenAI from "openai";
import { categorizeTransaction } from "./parsers/rule-categorizer";

const apiKey = process.env.KIMI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ KIMI_API_KEY is not set in environment variables.");
}

// Moonshot has two platforms: .cn (China) and .ai (Global).
// Diagnostics confirmed that this key works only on the global (.ai) platform.
const kimi = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.moonshot.ai/v1",
});

const buildUserContextStr = (userContext?: any) => {
  if (!userContext) return "";
  const isEmployee = userContext.employment_type === "salary_earner";

  let str = `
    USER CONTEXT:
    - Employment Type: ${userContext.employment_type || "Unknown"}
    - Sector/Business: ${isEmployee ? "Employee" : "Entrepreneur"}
    - State: ${userContext.state_of_residence || "Unknown"}
    - Receives Foreign Income: ${userContext.receives_foreign_income ? "Yes" : "No"}
    - Account Type: ${userContext.accountType || "mixed"}
  `;

  if (userContext.importRules) {
    str += `
    CRITICAL USER-DEFINED MAPPINGS:
    ${userContext.importRules}
    `;
  }

  return str;
};

import { repairJson } from "./utils/json-repair";

/**
 * Helper to clean and parse JSON from AI responses.
 * Handles markdown blocks and common formatting issues.
 */
const cleanJsonResponse = (content: string) => {
  try {
    const repaired = repairJson(content);
    return JSON.parse(repaired);
  } catch (e) {
    console.error("Failed to parse JSON even after repair:", e);
    return { transactions: [] };
  }
};

export async function extractDataFromStatement(
  fileData: string,
  fileType: string,
  userContext?: any,
) {
  const contextStr = buildUserContextStr(userContext);

  const prompt = `
    You are a Nigerian tax expert assistant. Analyze this ${fileType} bank statement or financial document content for a Nigerian user.
    ${contextStr}

    Extract every transaction and return them as a JSON object with a key "transactions" which is an array of objects.
    Each object must have:
    - date: (ISO 8601 format, note: input dates use Nigerian DD/MM/YYYY format)
    - description: (string - Extract the description EXACTLY as it appears in the source file. DO NOT rewrite, DO NOT summarize, DO NOT translate shorthand, DO NOT add "expert" polish. It must be a 1:1 copy of the narration.)
    - amount: (number - Extract the value EXACTLY as written. Remove commas and currency symbols. Return as a plain number. NEVER round up or down. 100.45 must stay 100.45, not 100.5. Double-check this against the source content for EVERY transaction.)
    - is_income: (boolean)
    - category: (Categorize based on Nigerian tax logic. Choices: salary, business_revenue, freelance_income, foreign_income, capital_gains, crypto_sale, rent, utilities, transportation, food_and_travel, maintenance, health, donations, professional_fees, subscriptions, tax_payments, bank_charges, business_expense, personal_expense)
    - reasoning: (string - why you chose this specific category)

    SELF-AUDIT RULE:
    Before finalizing the JSON, you MUST re-read the input text and verify that every 'amount' and 'date' in your output matches the original document precisely.

    CRITICAL: COMPLETENESS
    - Extract EVERY SINGLE TRANSACTION from the document.
    - DO NOT summarize. DO NOT skip any rows.
    - If the document has 100 transactions, you must return 100 objects in the array.
    - Accuracy and completeness are prioritized over brevity.

    Return ONLY the JSON. No markdown wrappers.

    Content:
    ${fileData}
  `;

  try {
    const response = await kimi.chat.completions.create({
      model: "moonshot-v1-128k",
      messages: [
        {
          role: "system",
          content:
            "You are a professional Nigerian tax data extractor. You must output ONLY valid JSON. Ensure all strings are properly escaped (especially quotes within descriptions).",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 16384, // Ample space even for chunks with 50+ transactions
      temperature: 0, // Keep it deterministic for better JSON
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from Kimi");

    try {
      return cleanJsonResponse(content).transactions || [];
    } catch (parseError) {
      console.error("🛑 Kimi JSON Parse Failure!");
      console.error(
        "Raw content snippet (last 200 chars):",
        content.slice(-200),
      );
      console.error("Content length:", content.length);
      throw parseError;
    }
  } catch (error: any) {
    console.error("Kimi Extraction Error Details:", {
      status: error.status,
      message: error.message,
      type: error.type,
      model: "moonshot-v1-128k",
      baseUrl: "https://api.moonshot.ai/v1",
    });
    throw error;
  }
}

export async function classifyTransaction(
  description: string,
  userContext?: any,
) {
  const contextStr = buildUserContextStr(userContext);

  const prompt = `
    You are a Nigerian tax expert assistant. Your task is to categorize a financial transaction based on its description.
    
    ${contextStr}

    CATEGORIES & GUIDELINES:
    Income: 'salary', 'business_revenue', 'freelance_income', 'foreign_income', 'capital_gains', 'crypto_sale', 'other_income'.
    Expenses: 'rent', 'utilities', 'food_and_travel', 'transportation', 'business_expense', 'subscriptions', 'professional_fees', 'maintenance', 'health', 'donations', 'tax_payments', 'bank_charges', 'pension_contributions', 'nhf_contributions', 'insurance', 'transfers', 'crypto_purchase', 'personal_expense', 'miscellaneous'.

    Instructions: Choose the MOST specific category possible (e.g., 'rent' instead of 'business_expense'). 

    Extract the transaction description EXACTLY as it appears in the input. DO NOT rewrite or refine it.

    Transaction Description: "${description}"

    Return ONLY a JSON object:
    {
      "category": "string",
      "confidence": number,
      "reasoning": "string",
      "description": "string" 
    }

    Return ONLY the JSON. No markdown wrappers.
  `;

  try {
    const response = await kimi.chat.completions.create({
      model: "moonshot-v1-8k",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that outputs only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from Kimi");

    return cleanJsonResponse(content);
  } catch (error: any) {
    console.error("Kimi Classification Error Details:", {
      status: error.status,
      message: error.message,
      model: "moonshot-v1-8k",
      baseUrl: "https://api.moonshot.ai/v1",
    });
    return {
      category: categorizeTransaction(description, false),
      confidence: 0,
      reasoning: "Error during Kimi classification",
    };
  }
}
