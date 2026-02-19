import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function checkAdmin(supabase: any, user: any) {
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile && profile.role === "admin";
}

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
      .single();

    if (error && error.code !== "PGRST116") throw error; // Ignore not found
    return NextResponse.json(data || {});
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

    if (!user || !(await checkAdmin(supabase, user))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    let query;
    if (body.id) {
      query = supabase.from("tax_settings").update(body).eq("id", body.id);
    } else {
      query = supabase.from("tax_settings").insert(body);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
