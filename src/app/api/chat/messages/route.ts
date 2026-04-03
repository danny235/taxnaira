import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

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

    const { content, user_id } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    // Identify if the sender is an admin
    const { data: profile } = await supabase
      .from("users")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";
    
    // If not admin, the 'user_id' this chat belongs to MUST be the current user
    const targetUserId = isAdmin ? (user_id || user.id) : user.id;

    // Insert Chat Message
    const { data: msgData, error: msgError } = await supabase
      .from("chat_messages")
      .insert({
        user_id: targetUserId,
        sender_id: user.id,
        content,
        is_read: false,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Trigger Notification for the recipient
    if (isAdmin) {
      // Admin -> User: Notify the specific user
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        type: "message",
        title: "New Support Message",
        message: content.length > 60 ? content.substring(0, 57) + "..." : content,
        link: "/support" // Adjust if there's a specific support page
      });
    } else {
      // User -> Admin: Notify all admins
      const { data: admins } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin");
      
      if (admins && admins.length > 0) {
        const adminNotifications = admins.map(admin => ({
          user_id: admin.id,
          type: "message",
          title: `Support: ${profile?.full_name || 'New Message'}`,
          message: content.length > 60 ? content.substring(0, 57) + "..." : content,
          link: "/admin/support"
        }));
        
        await supabase.from("notifications").insert(adminNotifications);
      }
    }

    return NextResponse.json(msgData);
  } catch (error: any) {
    console.error("Error in chat POST:", error);
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

    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Role check: Only the user themselves OR an admin can mark as read
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";
    
    if (!isAdmin && user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark all unread messages in this conversation as read
    // For Admin: mark messages where sender_id = user_id (the user's messages)
    // For User: mark messages where sender_id != user_id (the admin's messages)
    const { error } = await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("user_id", user_id)
      .eq("is_read", false)
      .neq("sender_id", user.id); // Don't mark own messages as read (shouldn't be necessary but safe)

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in chat PATCH:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
