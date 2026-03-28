import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Admin check
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user?.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, message, type = "info", user_id = null } = await req.json();

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        title,
        message,
        type,
        user_id, // NULL for all, specific UUID for single user
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
