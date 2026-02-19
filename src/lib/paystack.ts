export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

export async function initializeTransaction(email: string, amount: number) {
  try {
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Paystack uses kobo
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/verify`,
        }),
      },
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Paystack Initialization Error:", error);
    return { status: false, message: "Initialization failed" };
  }
}

export async function verifyTransaction(reference: string) {
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Paystack Verification Error:", error);
    return { status: false, message: "Verification failed" };
  }
}
