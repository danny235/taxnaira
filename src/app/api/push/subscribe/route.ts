import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Extract keys for storage
    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // Upsert subscription
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, endpoint'
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in push subscribe:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint } = await request.json();

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
