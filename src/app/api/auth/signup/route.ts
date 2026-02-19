import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendOtpEmail } from "@/lib/email";
import { NextResponse } from "next/server";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { email, password, fullName } = parsed.data;
    const supabase = await createClient();

    // 1. Sign Up using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Signup failed to create user object." },
        { status: 500 },
      );
    }

    // 2. Generate custom OTP for verification
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // 3. Store OTP in verification_codes table
    const { error: dbError } = await supabase
      .from("verification_codes")
      .insert({
        email,
        code,
        type: "email_verification",
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error("OTP Storage Error:", dbError);
      return NextResponse.json(
        { error: "Failed to generate verification code." },
        { status: 500 },
      );
    }

    // 4. Send Email
    try {
      await sendOtpEmail(email, code);
    } catch (emailError) {
      console.error("Email Sending Error:", emailError);
      // We don't necessarily want to fail the whole signup if email fails,
      // but the user won't be able to verify.
      return NextResponse.json(
        {
          message: "User created but failed to send verification email.",
          email,
          error: "Email delivery failed",
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        message: "Signup successful. Verification code sent.",
        email,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Signup API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
