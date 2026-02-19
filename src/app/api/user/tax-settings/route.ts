import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year =
      searchParams.get("year") || new Date().getFullYear().toString();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tax_settings")
      .select("*")
      .eq("tax_year", year)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    // Default fallback if no settings found
    return NextResponse.json(
      data || {
        exemption_threshold: 800000,
      },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
