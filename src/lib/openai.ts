import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ OPENAI_API_KEY is not set in environment variables.");
}

const openai = new OpenAI({
  apiKey: apiKey,
});

export async function classifyTransaction(description: string) {
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
    if (!content) throw new Error("No content returned from OpenAI");

    return JSON.parse(content);
  } catch (error) {
    console.error("OpenAI Classification Error:", error);
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
  const prompt = `
    Analyze this ${fileType} bank statement or financial document content.
    Extract every transaction and return them as a JSON object with a key "transactions" which is an array of objects.
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
    if (!content) throw new Error("No content returned from OpenAI");

    const result = JSON.parse(content);

    if (result.transactions && Array.isArray(result.transactions)) {
      return result.transactions;
    }

    // Fallback if structure is unexpected but might still be an array at root (less likely with json_object mode but possible if model ignores system)
    if (Array.isArray(result)) return result;

    return [];
  } catch (error: any) {
    console.error("OpenAI Extraction Error Details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });

    // Fallback for demo/testing purposes if AI fails (Quota or Rate Limit)
    if (
      error.status === 429 ||
      error.code === "insufficient_quota" ||
      error.message?.includes("quota")
    ) {
      console.warn(
        "⚠️ OpenAI Quota Exceeded. Returning mock data for demonstration.",
      );
      return [
        {
          date: new Date().toISOString(),
          description: "FALLBACK: Salary Payment (Mock)",
          amount: 500000,
          is_income: true,
          category: "salary",
        },
        {
          date: new Date().toISOString(),
          description: "FALLBACK: Grocery Store (Mock)",
          amount: 25000,
          is_income: false,
          category: "food",
        },
        {
          date: new Date().toISOString(),
          description: "FALLBACK: Uber Ride (Mock)",
          amount: 4500,
          is_income: false,
          category: "transportation",
        },
        {
          date: new Date().toISOString(),
          description: "FALLBACK: Freelance Project (Mock)",
          amount: 150000,
          is_income: true,
          category: "freelance_income",
        },
      ];
    }

    throw error;
  }
}
