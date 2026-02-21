"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { sendOtpEmail } from "@/lib/email";

// Schemas
const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
});

export async function signup(formData: FormData) {
  const data = Object.fromEntries(formData);
  const parsed = signupSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { email, password, fullName } = parsed.data;
  const supabase = await createClient();

  // 1. Check if user already exists in public.users?
  // Supabase Auth handles uniqueness of email, but we might want to check early.

  // 2. Sign Up (Standard) - This will trigger Supabase's email if configured.
  // To use Custom OTP, we ideally want to suppress that or use Admin API.
  // WITHOUT Service Role Key, we can only use standard signUp.
  // Standard signUp returns a session if auto-confirm is on, or null if off.

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
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Signup failed to create user object." };
  }

  // 3. Generate OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  // 4. Store OTP in verification_codes table
  // We need to use valid Supabase client for this.
  // If RLS allows insert for anyone (as configured), this works.
  const { error: dbError } = await supabase.from("verification_codes").insert({
    email,
    code,
    type: "email_verification",
    expires_at: expiresAt.toISOString(),
  });

  if (dbError) {
    console.error("OTP Storage Error:", dbError);
    // Continue anyway? Or fail? If we can't verify, user is stuck.
    return { error: "Failed to generate verification code." };
  }

  // ... (inside signup function)

  // 5. Send Email
  await sendOtpEmail(email, code);

  // 6. Return success and redirect path
  return {
    success: true,
    redirectUrl: `/verify`,
  };
}

export async function verifyOtp(formData: FormData) {
  const data = Object.fromEntries(formData);
  const parsed = verifySchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { email, code } = parsed.data;
  const supabase = await createClient();

  // 1. Validate Code
  const { data: codes, error: queryError } = await supabase
    .from("verification_codes")
    .select("*")
    .eq("email", email)
    .eq("code", code)
    .eq("type", "email_verification")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (queryError || !codes) {
    return { error: "Invalid or expired verification code." };
  }

  // 2. "Verify" User
  // Since we don't have Admin API key yet, we can't forcibly confirm the email
  // unless we use Supabase's built-in OTP (which we are not, we are using custom table).
  // WORKAROUND: We can mark `is_verified` in `public.users` table.
  // The Auth User will remain "unconfirmed" in Supabase Auth if allow checks is on.
  // This might block login if Supabase enforces email confirmation.

  // For now, let's update public.users
  const { error: updateError } = await supabase
    .from("users")
    .update({ is_verified: true })
    .eq("email", email);

  if (updateError) {
    console.error("User Update Error", updateError);
  }

  // 3. Delete used code
  await supabase.from("verification_codes").delete().eq("id", codes.id);

  // 4. Return success and redirect path
  return { success: true, redirectUrl: "/login?verified=true" };
}

export async function login(formData: FormData) {
  const data = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!user) {
    return { error: "Login failed to return user data." };
  }

  // 4. Fetch profile to return to client
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // 5. Return success, redirect path, and profile data
  return {
    success: true,
    redirectUrl: "/dashboard",
    user,
    profile,
  };
}
