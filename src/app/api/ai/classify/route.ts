import { NextRequest, NextResponse } from "next/server";
import { classifyTransaction } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { description } = await req.json();

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }

    const classification = await classifyTransaction(description);

    return NextResponse.json(classification);
  } catch (error: any) {
    console.error("API Error - Classify:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
