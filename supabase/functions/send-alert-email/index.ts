import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch unsent triggers with alert + procedure details
    const { data: triggers, error: fetchError } = await supabase
      .from("price_alert_triggers")
      .select(
        `
        id,
        alert_id,
        price_alerts!inner(user_id, procedure_type, city, state, frequency),
        procedures!inner(procedure_type, price_paid, provider_name, city, state)
      `
      )
      .eq("was_sent", false)
      .eq("price_alerts.frequency", "instant")
      .limit(100);

    if (fetchError) {
      return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
        status: 500,
      });
    }

    if (!triggers || triggers.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Group triggers by user_id to batch emails
    const byUser: Record<string, typeof triggers> = {};
    for (const trigger of triggers) {
      const userId = (trigger.price_alerts as any).user_id;
      if (!byUser[userId]) byUser[userId] = [];
      byUser[userId].push(trigger);
    }

    let sentCount = 0;
    const triggerIds: string[] = [];

    for (const [userId, userTriggers] of Object.entries(byUser)) {
      // Get user email
      const {
        data: { user },
      } = await supabase.auth.admin.getUserById(userId);
      if (!user?.email) continue;

      // Build email body
      const lines = userTriggers.map((t) => {
        const proc = t.procedures as any;
        return `- ${proc.procedure_type}: $${Number(proc.price_paid).toLocaleString()} at ${proc.provider_name} (${proc.city}, ${proc.state})`;
      });

      const body = `Hi there!\n\nNew prices matching your alerts have been posted on GlowBuddy:\n\n${lines.join("\n")}\n\nView your alerts: https://glowbuddy.com/alerts\n\n— GlowBuddy`;

      // Send via Resend
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "GlowBuddy <alerts@glowbuddy.com>",
          to: [user.email],
          subject: `New ${userTriggers.length === 1 ? "price" : "prices"} matching your alert`,
          text: body,
        }),
      });

      if (res.ok) {
        sentCount++;
        triggerIds.push(...userTriggers.map((t) => t.id));
      }
    }

    // Mark triggers as sent
    if (triggerIds.length > 0) {
      await supabase
        .from("price_alert_triggers")
        .update({ was_sent: true })
        .in("id", triggerIds);
    }

    return new Response(JSON.stringify({ sent: sentCount }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500 }
    );
  }
});
