import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { email, code } = parsed.data;
    const supabase = await createClient();

    // 1. Validate the verification code against the database
    const { data: codeData, error: queryError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("type", "email_verification")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (queryError || !codeData) {
      return NextResponse.json(
        { error: "Invalid or expired verification code." },
        { status: 400 },
      );
    }

    // 2. Mark the user as verified in public.users table
    const { error: updateError } = await supabase
      .from("users")
      .update({ is_verified: true })
      .eq("email", email);

    if (updateError) {
      console.error("User Update Error", updateError);
      return NextResponse.json(
        { error: "Failed to update user verification status." },
        { status: 500 },
      );
    }

    // 3. Delete the used verification code
    await supabase.from("verification_codes").delete().eq("id", codeData.id);

    return NextResponse.json(
      { message: "Email verified successfully. You can now log in." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Verify API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
