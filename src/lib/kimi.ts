import OpenAI from "openai";
import { categorizeTransaction } from "./parsers/rule-categorizer";

const apiKey = process.env.KIMI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ KIMI_API_KEY is not set in environment variables.");
}

// Kimi uses OpenAI-compatible API
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
    - description: (string)
    - amount: (number, always positive)
    - is_income: (boolean)
    - category: (Categorize based on Nigerian tax logic: salary, business revenue, freelance income, foreign income, capital gains, crypto sale, subscriptions, professional_fees, maintenance, health, donations, tax_payments, bank_charges, expense, personal expense)
    - reasoning: (string - why you chose this category)

    Return ONLY the JSON.

    Content:
    ${fileData}
  `;

  try {
    const response = await kimi.chat.completions.create({
      model: "moonshot-v1-128k",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that outputs JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from Kimi");

    const result = JSON.parse(content);
    return result.transactions || [];
  } catch (error) {
    console.error("Kimi Extraction Error:", error);
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
    Income: 'salary', 'business revenue', 'freelance income', 'foreign income', 'capital gains', 'crypto sale', 'other income'.
    Expenses: 'rent', 'utilities', 'food', 'transportation', 'business expenses', 'subscriptions', 'professional_fees', 'maintenance', 'health', 'donations', 'tax_payments', 'bank_charges', 'pension contributions', 'nhf contributions', 'insurance', 'transfers', 'crypto purchase', 'personal expense', 'miscellaneous'.

    Transaction Description: "${description}"

    Return ONLY a JSON object:
    {
      "category": "string",
      "confidence": number,
      "reasoning": "string"
    }
  `;

  try {
    const response = await kimi.chat.completions.create({
      model: "kimi-k2.5",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that outputs JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from Kimi");

    return JSON.parse(content);
  } catch (error) {
    console.error("Kimi Classification Error:", error);
    return {
      category: categorizeTransaction(description, false),
      confidence: 0,
      reasoning: "Error during Kimi classification",
    };
  }
}
