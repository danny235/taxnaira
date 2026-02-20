import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "1000");
    const year = searchParams.get("year");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(limit);

    if (year) {
      query = query.eq("tax_year", year);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
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
    const { transactions, fileId } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: "Invalid transactions data" },
        { status: 400 },
      );
    }

    // Add user_id to each transaction and map source_file_id to file_id
    const records = transactions.map((tx: any) => {
      const { source_file_id, ai_confidence, ...rest } = tx;
      return {
        ...rest,
        user_id: user.id,
        file_id: source_file_id || tx.file_id,
      };
    });

    const { data, error } = await supabase
      .from("transactions")
      .insert(records)
      .select();

    if (error) throw error;

    // Update file status if fileId is provided
    if (fileId) {
      await supabase
        .from("uploaded_files")
        .update({
          processed: true,
          transactions_count: records.length,
        })
        .eq("id", fileId);
    }

    return NextResponse.json({ success: true, count: data.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
