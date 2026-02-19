const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY || "";

export async function convertCurrency(
  amount: number,
  from: string,
  to: string = "NGN",
) {
  if (from === to) return amount;

  try {
    // Using ExchangeRate-API (example provider)
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/pair/${from}/${to}/${amount}`,
    );
    const data = await response.json();

    if (data.result === "success") {
      return data.conversion_result;
    }

    // Fallback to static common rates if API fails or key is missing
    const fallbacks: Record<string, number> = {
      USD: 1500,
      GBP: 1900,
      EUR: 1600,
    };

    return amount * (fallbacks[from] || 1);
  } catch (error) {
    console.error("Currency Conversion Error:", error);
    return amount * 1500; // Safe default NGN/USD
  }
}
