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

    // Admin role check
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch unique conversations (grouped by user_id)
    // We'll also join with 'users' to get their names/emails.
    // However, Supabase doesn't support 'distinct on' with join directly in its standard API easily.
    // We'll use a simpler approach: get unique user_ids from chat_messages.
    
    // Actually, we can just get the latest message from each user.
    const { data, error } = await supabase
      .from("chat_messages")
      .select("user_id, content, created_at, is_read, users(full_name, email)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Deduplicate on the server manually (usually better in SQL but this works)
    const conversations = Array.from(
      data.reduce((acc, msg) => {
        if (!acc.has(msg.user_id)) {
          acc.set(msg.user_id, {
            user_id: msg.user_id,
            lastMessage: msg.content,
            lastDate: msg.created_at,
            is_read: msg.is_read,
            user: msg.users,
            unreadCount: 0,
          });
        }
        if (!msg.is_read) {
          acc.get(msg.user_id).unreadCount += 1;
        }
        return acc;
      }, new Map()).values()
    );

    return NextResponse.json(conversations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
