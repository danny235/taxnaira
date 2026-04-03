import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, all } = await request.json();

    if (all) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      
      if (error) throw error;
    } else if (id) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
