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

  // Pattern for Amount: Look for numbers with commas and decimals
  // This is tricky as it could be balanced, credit, or debit
  const amountRegex = /((?:(?:\d{1,3}(?:,\d{3})+)|(?:\d+))(?:\.\d{2})?)/;

  lines.forEach((line, index) => {
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      const date = dateMatch[0];

      // Remove date from line to find description and amount
      let remaining = line.replace(date, "").trim();

      // Try to find amount
      // Often at the end of the line
      const amountMatches = remaining.match(
        new RegExp(amountRegex.source, "g"),
      );

      if (amountMatches && amountMatches.length >= 1) {
        // Heuristic: The last one or two numbers are usually credit/debit or balance
        const amountStr = amountMatches[amountMatches.length - 1];
        const amount = parseFloat(amountStr.replace(/,/g, ""));

        // Description is what stays in the middle
        const description = remaining.replace(amountStr, "").trim();

        if (amount > 0 && description.length > 3) {
          transactions.push({
            date: parseDate(date),
            description: description,
            amount: amount,
            is_income: detectIncome(line, description),
            category: categorize(description),
            ai_confidence: 0.5, // Rule-based is marked as 0.5 to show it's heuristic
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
