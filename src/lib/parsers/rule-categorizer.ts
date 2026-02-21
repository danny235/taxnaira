/**
 * Shared Rule-Based Transaction Categorizer
 * Provides standard categorization logic across different statement parsers.
 */
export function categorizeTransaction(
  description: string,
  isIncome: boolean,
): string {
  const lower = description.toLowerCase();

  if (isIncome) {
    if (
      lower.includes("salary") ||
      lower.includes("payroll") ||
      lower.includes("net pay")
    )
      return "salary";
    if (
      lower.includes("revenue") ||
      lower.includes("sales") ||
      lower.includes("payment from") ||
      lower.includes("invoice")
    )
      return "business revenue";
    if (
      lower.includes("fiverr") ||
      lower.includes("upwork") ||
      lower.includes("freelance") ||
      lower.includes("gig")
    )
      return "freelance income";
    if (
      lower.includes("dividend") ||
      lower.includes("interest") ||
      lower.includes("investment")
    )
      return "other income";
    return "other income";
  }

  // Expense Categories
  if (
    lower.includes("uber") ||
    lower.includes("bolt") ||
    lower.includes("transport") ||
    lower.includes("fuel") ||
    lower.includes("filling station")
  )
    return "transportation";

  if (
    lower.includes("restaurant") ||
    lower.includes("eatery") ||
    lower.includes("food") ||
    lower.includes("canteen") ||
    lower.includes("kitchen")
  )
    return "food";

  if (
    lower.includes("rent") ||
    lower.includes("lease") ||
    lower.includes("office space")
  )
    return "rent";

  if (
    lower.includes("mtn") ||
    lower.includes("glo") ||
    lower.includes("airtime") ||
    lower.includes("data") ||
    lower.includes("spectranet") ||
    lower.includes("smile") ||
    lower.includes("internet")
  )
    return "utilities";

  if (
    lower.includes("sms fee") ||
    lower.includes("maintenance fee") ||
    lower.includes("stamp duty") ||
    lower.includes("levy") ||
    lower.includes("card maintenance") ||
    lower.includes("bank charge")
  )
    return "bank_charges";

  if (
    lower.includes("firs") ||
    lower.includes("lirs") ||
    lower.includes("tax") ||
    lower.includes("wht") ||
    lower.includes("withholding") ||
    lower.includes("vat")
  )
    return "tax_payments";

  if (
    lower.includes("aws") ||
    lower.includes("google cloud") ||
    lower.includes("netflix") ||
    lower.includes("spotify") ||
    lower.includes("zoom") ||
    lower.includes("microsoft") ||
    lower.includes("subscription")
  )
    return "subscriptions";

  if (lower.includes("pension") || lower.includes("pencom"))
    return "pension contributions";

  if (lower.includes("nhf") || lower.includes("housing fund"))
    return "nhf_contributions";

  if (
    lower.includes("legal") ||
    lower.includes("consultant") ||
    lower.includes("audit") ||
    lower.includes("accounting") ||
    lower.includes("professional fee")
  )
    return "professional_fees";

  if (
    lower.includes("repair") ||
    lower.includes("maintenance") ||
    lower.includes("servicing") ||
    lower.includes("fix")
  )
    return "maintenance";

  if (
    lower.includes("medical") ||
    lower.includes("hospital") ||
    lower.includes("pharmacy") ||
    lower.includes("health") ||
    lower.includes("tests")
  )
    return "health";

  if (
    lower.includes("charity") ||
    lower.includes("donation") ||
    lower.includes("gift") ||
    lower.includes("offering") ||
    lower.includes("tithe")
  )
    return "donations";

  return "business expenses"; // Default to business expense instead of 'expense' or 'misc'
}
