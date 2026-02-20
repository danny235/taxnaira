/**
 * Generic Rule-Based Parser
 * Attempts to extract transactions from raw text using patterns common in Nigerian bank statements.
 */
export async function parseGenericStatement(text: string) {
  const lines = text.split("\n");
  const transactions: any[] = [];

  // Pattern for Date: DD-MMM-YYYY or DD/MM/YYYY or DD MMM YYYY
  const dateRegex =
    /(\d{1,2}[-/ ](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2})[-/ ]\d{2,4})/i;

  // Pattern for Amount: support currency symbols and multiple decimal types
  const amountRegex =
    /(?:[₦$£€\s])*\s*((?:(?:\d{1,3}(?:,\d{3})+)|(?:\d+))(?:\.\d{2})?)/g;

  lines.forEach((line, index) => {
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      const date = dateMatch[0];
      let remaining = line.replace(date, "").trim();

      // Find all potential amounts on the line
      const amountMatches = Array.from(remaining.matchAll(amountRegex));

      if (amountMatches && amountMatches.length >= 1) {
        // Take the last amount as the likely value (often the balance or the transaction amount)
        // In many statements: Date | Description | Debit | Credit | Balance
        // We want the primary transaction amount.
        const amountStr = amountMatches[amountMatches.length - 1][1];
        const fullAmountStr = amountMatches[amountMatches.length - 1][0];
        const amount = parseFloat(amountStr.replace(/,/g, ""));

        const description = remaining.replace(fullAmountStr, "").trim();

        if (amount > 0 && description.length > 3) {
          transactions.push({
            date: parseDate(date),
            description: description,
            amount: amount,
            is_income: detectIncome(line, description),
            category: categorize(description),
            ai_confidence: 0.5,
          });
        }
      }
    }
  });

  return transactions;
}

function parseDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function detectIncome(line: string, description: string): boolean {
  const lower = (line + " " + description).toLowerCase();
  const incomeKeywords = [
    "credit",
    "cr",
    "deposit",
    "salary",
    "transfer from",
    "inward",
  ];
  const expenseKeywords = [
    "debit",
    "dr",
    "withdrawal",
    "transfer to",
    "payment to",
    "pos",
    "atm",
  ];

  // Check for explicit markers
  if (line.includes(" CR ") || line.endsWith("CR")) return true;
  if (line.includes(" DR ") || line.endsWith("DR")) return false;

  for (const kw of incomeKeywords) if (lower.includes(kw)) return true;
  for (const kw of expenseKeywords) if (lower.includes(kw)) return false;

  return false; // Default to expense if unsure
}

function categorize(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes("salary") || lower.includes("payroll")) return "salary";
  if (
    lower.includes("uber") ||
    lower.includes("bolt") ||
    lower.includes("transport")
  )
    return "transportation";
  if (
    lower.includes("restaurant") ||
    lower.includes("eatery") ||
    lower.includes("food")
  )
    return "food";
  if (lower.includes("rent")) return "rent";
  if (lower.includes("pension")) return "pension_contributions";
  if (
    lower.includes("airtime") ||
    lower.includes("data") ||
    lower.includes("mtn") ||
    lower.includes("glo")
  )
    return "utilities";
  return "expense";
}
