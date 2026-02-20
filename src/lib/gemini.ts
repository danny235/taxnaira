import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry<T>(
  fn: () => Promise<T>,
  retries = 5,
  delayMs = 2000,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (
      retries > 0 &&
      (error.status === 429 || error.message?.includes("429"))
    ) {
      console.warn(
        `Gemini 429 hit. Retrying in ${delayMs}ms... (${retries} left)`,
      );
      await delay(delayMs);
      return retry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export async function classifyTransaction(
  description: string,
  userContext?: any,
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const contextStr = userContext
    ? `
    USER CONTEXT:
    - Employment Type: ${userContext.employment_type || "Unknown"}
    - State: ${userContext.state_of_residence || "Unknown"}
    - Receives Foreign Income: ${userContext.receives_foreign_income ? "Yes" : "No"}
  `
    : "";

  const prompt = `
    You are a Nigerian tax expert assistant. Your task is to categorize a financial transaction based on its description.
    
    ${contextStr}

    CATEGORIES & GUIDELINES:
    Income:
    - 'salary': Regular pay from an employer (e.g., "NET PAY", "SALARY", "PAYROLL").
    - 'business revenue': Sales, service fees, or client payments for a business owner/freelancer.
    - 'freelance income': Gig work if specifically identifiable (e.g., "UPWORK", "FIVERR").
    - 'foreign income': Payments arriving in USD/GBP/EUR or from foreign entities.
    - 'capital gains': Profit from selling stock, property, or other assets.
    - 'crypto sale': Specific proceeds from selling cryptocurrency.
    - 'other income': Interest, dividends, or miscellaneous business-related inflows.

    Deductible Expenses (Business-related):
    - 'rent': Business premises rent or office lease.
    - 'utilities': Electricity (IKEDC/PHCN), Internet (Spectranet/Smile/MTN Data), Water.
    - 'food': Business-related meals (not personal groceries).
    - 'transportation': Fuel, Uber/Bolt/GIGM for business trips, vehicle maintenance.
    - 'business expenses': Domain names, software (SaaS), office supplies, marketing.
    - 'pension contributions': Statutory employee pension deductions.
    - 'nhf contributions': National Housing Fund deductions.
    - 'insurance': Business or health insurance premiums.
    - 'transfers': Business-related transfers (e.g. to vendors).
    - 'crypto purchase': Buying crypto for business purposes.
    - 'miscellaneous': Other deductible operational costs.

    Non-Deductible:
    - 'personal expense': Private spending (e.g. Cinema, Personal gifts, family support).

    FEW-SHOT EXAMPLES:
    - "POS DEBIT: JUMIA" -> personal expense (likely shopping)
    - "TRANSFER from OLUWASEUN" -> other income (or business revenue if user is business_owner)
    - "AIRTIME TOP-UP: MTN" -> utilities
    - "NET PAY SEP" -> salary
    - "UBER TRIP" -> transportation
    - "VAT ON FEE" -> miscellaneous
    - "WHT ON DIVIDEND" -> other_income (tax credit)

    Transaction Description: "${description}"

    Return ONLY a JSON object with the following fields:
    {
      "category": "string",
      "confidence": number,
      "reasoning": "string"
    }
  `;

  try {
    const result = await retry(() => model.generateContent(prompt));
    const text = result.response.text();
    // Clean potential markdown code blocks
    const jsonString = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini Classification Error:", error);
    // Return default/error object rather than throwing to avoid breaking entire batch processing
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
  userContext?: any,
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const contextStr = userContext
    ? `
    USER CONTEXT:
    - Employment Type: ${userContext.employment_type || "Unknown"}
    - Sector/Business: ${userContext.employment_type === "salary_earner" ? "Employee" : "Entrepreneur"}
    - Receives Foreign Income: ${userContext.receives_foreign_income ? "Yes" : "No"}
  `
    : "";

  const prompt = `
    Analyze this ${fileType} bank statement or financial document content for a Nigerian user.
    ${contextStr}

    Extract every transaction and return them as a JSON array of objects.
    Each object must have:
    - date: (ISO 8601 format, note: input dates use Nigerian DD/MM/YYYY format)
    - description: (string)
    - amount: (number, always positive)
    - is_income: (boolean)
    - category: (Categorize based on Nigerian tax logic: salary, business revenue, freelance income, foreign income, capital gains, crypto sale, expense, personal expense)
    - reasoning: (string - why you chose this category)

    Content:
    ${fileData}
  `;

  try {
    const result = await retry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonString = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error; // Rethrow to let the API know it failed
  }
}
export async function extractDataFromPdfBuffer(
  buffer: Buffer,
  userContext?: any,
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const contextStr = userContext
    ? `
    USER CONTEXT:
    - Employment Type: ${userContext.employment_type || "Unknown"}
    - Sector/Business: ${userContext.employment_type === "salary_earner" ? "Employee" : "Entrepreneur"}
  `
    : "";

  const prompt = `
    Analyze this bank statement PDF for a Nigerian user.
    ${contextStr}

    Extract every transaction and return them as a JSON array of objects.
    Each object must have:
    - date: (ISO 8601 format, note: input dates use Nigerian DD/MM/YYYY format)
    - description: (string)
    - amount: (number, always positive)
    - is_income: (boolean)
    - category: (Categorize based on Nigerian tax logic: salary, business revenue, freelance income, foreign income, capital gains, crypto sale, expense, personal expense)
    - reasoning: (string - why you chose this category)
  `;

  try {
    const result = await retry(() =>
      model.generateContent([
        prompt,
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: "application/pdf",
          },
        },
      ]),
    );

    const text = result.response.text();
    const jsonString = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini PDF Extraction Error:", error);
    throw error;
  }
}

export async function categorizeTransactionsBatch(
  transactions: { description: string; amount: number; is_income: boolean }[],
  userContext?: any,
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const contextStr = userContext
    ? `
    USER CONTEXT:
    - Employment Type: ${userContext.employment_type || "Unknown"}
    - Sector/Business: ${userContext.employment_type === "salary_earner" ? "Employee" : "Entrepreneur"}
    - Receives Foreign Income: ${userContext.receives_foreign_income ? "Yes" : "No"}
  `
    : "";

  const prompt = `
    You are a Nigerian tax expert assistant. Your task is to categorize a batch of financial transactions for a P&L statement.
    
    ${contextStr}

    SYSTEM CATEGORIES:
    Income: 
    - 'salary', 'business revenue', 'freelance income', 'foreign income', 'capital gains', 'crypto sale', 'other income'.

    Expenses:
    - 'rent': Business rent.
    - 'utilities': Power, internet, data.
    - 'food': Business meals.
    - 'transportation': Uber, Fuel, Travel.
    - 'business expenses': Operational costs.
    - 'pension contributions': Pension.
    - 'nhf contributions': National Housing Fund.
    - 'insurance': Premiums.
    - 'transfers': Vendor payments.
    - 'crypto purchase': Crypto buys.
    - 'personal expense': Private spending (cinema, lifestyle).
    - 'miscellaneous': Other business costs.
    
    GUIDELINES:
    1. If user is a 'salary_earner', large transfers are likely personal or savings.
    2. If user is a 'business_owner', most transfers to names are likely 'business expenses' or 'transfers'.
    3. Look for "VAT", "Tax", "Fee" - these are usually 'miscellaneous' or tied to the service.
    4. POS purchases are 'personal expense' unless specifically business-related (e.g. "OFFICE CREATIONS").

    TRANSACTIONS TO CATEGORIZE:
    ${JSON.stringify(transactions, null, 2)}

    Return ONLY a JSON array of objects in the same order, each with:
    {
      "category": "string",
      "confidence": number,
      "reasoning": "string"
    }
  `;

  try {
    const result = await retry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonString = text.replace(/```json|```/gi, "").trim();
    const categories = JSON.parse(jsonString);

    return transactions.map((tx, i) => ({
      ...tx,
      category:
        categories[i]?.category ||
        (tx.is_income ? "other_income" : "miscellaneous"),
      ai_confidence: categories[i]?.confidence || 0,
      reasoning: categories[i]?.reasoning || "Categorized based on description",
    }));
  } catch (error) {
    console.error("Gemini Batch Categorization Error:", error);
    return transactions.map((tx) => ({
      ...tx,
      category: tx.is_income ? "other_income" : "miscellaneous",
      ai_confidence: 0,
      reasoning: "Classification failed",
    }));
  }
}
