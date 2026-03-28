import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyTransaction } from "@/lib/kimi";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Basic admin check - you might want to make this stricter
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user?.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch transactions that need migration
    const { data: transactions, error: fetchError } = await supabase
      .from("transactions")
      .select("*, users(*)")
      .is("main_category", null)
      .limit(50); // Process in small batches to avoid timeouts

    if (fetchError) throw fetchError;

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ message: "No transactions left to migrate" });
    }

    const results = [];
    
    for (const tx of transactions) {
      try {
        const userContext = tx.users || {};
        const classification = await classifyTransaction(tx.description, userContext);
        
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            main_category: classification.main_category,
            sub_category: classification.sub_category
          })
          .eq("id", tx.id);
          
        if (updateError) throw updateError;
        
        results.push({ id: tx.id, status: "success", ...classification });
      } catch (err: any) {
        results.push({ id: tx.id, status: "error", error: err.message });
      }
    }

    return NextResponse.json({ 
      processed: transactions.length, 
      results 
    });
  } catch (error: any) {
    console.error("Migration Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
