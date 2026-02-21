import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year =
      searchParams.get("year") || new Date().getFullYear().toString();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("tax_calculations")
      .select("*")
      .eq("user_id", user.id)
      .eq("tax_year", year)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tax_year, total_income, taxable_income, final_tax_liability } =
      body;

    const { data, error } = await supabase
      .from("tax_calculations")
      .upsert(
        {
          user_id: user.id,
          tax_year,
          total_income,
          taxable_income,
          tax_due: final_tax_liability || 0,
          calculation_details: body,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,tax_year",
        },
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
