import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      // If table doesn't exist or other query error, fallback to free plan
      console.error("Subscription fetch error (fallback to free):", error.message);
      return NextResponse.json({ plan: "free" });
    }

    return NextResponse.json(data || { plan: "free" });
  } catch (error: any) {
    console.error("Subscription API caught error:", error.message);
    return NextResponse.json({ plan: "free" });
  }
}
