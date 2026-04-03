import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import webpush from "web-push";

// Configure web-push
webpush.setVapidDetails(
  "mailto:support@azawise.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const { user_id, title, body, url, tag } = await request.json();

    if (!user_id || !title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. First, create app notifications
    if (user_id === 'all') {
        const { data: allUsers } = await supabase.from('users').select('id');
        if (allUsers && allUsers.length > 0) {
            await supabase.from('notifications').insert(
                allUsers.map(u => ({
                    user_id: u.id,
                    title,
                    message: body,
                    link: url || '/dashboard',
                    type: 'info'
                }))
            );
        }
    } else {
        await supabase.from('notifications').insert({
            user_id,
            title,
            message: body,
            link: url || '/dashboard',
            type: 'info'
        });
    }

    // 2. Fetch subscriptions
    let subQuery = supabase.from("push_subscriptions").select("*");
    if (user_id !== "all") {
      subQuery = subQuery.eq("user_id", user_id);
    }
    
    const { data: subscriptions, error: subError } = await subQuery;

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, delivered: 0, message: "No devices registered for push" });
    }

    // 3. Send to all registered devices
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        return webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title,
            body,
            url: url || "/dashboard",
            tag: tag || "azawise-push"
          })
        );
      })
    );

    const deliveredCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({ 
      success: true, 
      delivered: deliveredCount, 
      failed: failedCount 
    });
  } catch (error: any) {
    console.error("Error in admin push send:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
