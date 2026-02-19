import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export async function classifyTransaction(description: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    You are a Nigerian tax expert assistant. Your task is to categorize a financial transaction based on its description.
    The categories are:
    - 'salary': Regular employment income.
    - 'business_revenue': Income from business operations or sales.
    - 'freelance_income': Income from freelance work or gig economy.
    - 'foreign_income': Income received in foreign currency (USD, GBP, etc).
    - 'capital_gains': Profit from sale of assets.
    - 'crypto_sale': Profit from cryptocurrency sales.
    - 'expense': Any business or deductible expense.
    - 'personal_expense': Non-deductible personal spending.
    - 'pension_contributions': Employee contributions to pension.
    - 'nhf_contributions': National Housing Fund contributions.

    Transaction Description: "${description}"

    Return ONLY a JSON object with the following fields:
    {
      "category": "string",
      "confidence": number,
      "reasoning": "string"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Clean potential markdown code blocks
    const jsonString = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini Classification Error:", error);
    return {
      category: "other_income",
      confidence: 0,
      reasoning: "Error during classification",
    };
  }
}

export async function extractDataFromStatement(
  fileData: string,
  fileType: string,
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Analyze this ${fileType} bank statement or financial document content.
    Extract every transaction and return them as a JSON array of objects.
    Each object must have:
    - date: (ISO 8601 format)
    - description: (string)
    - amount: (number, always positive)
    - is_income: (boolean)
    - category: (Use the same categories: salary, business_revenue, freelance_income, foreign_income, capital_gains, crypto_sale, expense)

    Content:
    ${fileData}
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonString = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    return [];
  }
}
