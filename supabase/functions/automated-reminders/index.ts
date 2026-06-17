import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Parse body early so we can decide whether auth is required
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { action, inspectionIds } = body;

  // `scan` is a cron-triggered action — no JWT available
  const isCronAction = action === "scan";

  if (!isCronAction) {
    // ─── Auth Guard (skip for cron scan) ───────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — missing token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ─── End Auth Guard ────────────────────────────────────
  }

  try {
    if (action === "trigger") {
      // Manually trigger reminders for specific inspections
      if (!inspectionIds || !Array.isArray(inspectionIds) || inspectionIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "inspectionIds required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: inspections, error: inspErr } = await supabaseClient
        .from("inspections")
        .select("id, customer_id, scheduled_date, inspection_type, status, assets:asset_id(name, location), customers:customer_id(name, email, contact_name)")
        .in("id", inspectionIds);

      if (inspErr) throw inspErr;

      const notifications = [];
      for (const insp of (inspections || [])) {
        const customer = insp.customers;
        const asset = insp.assets;

        if (!customer?.email) continue;

        const dueDate = new Date(insp.scheduled_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
        const isOverdue = daysUntilDue < 0;

        const title = isOverdue
          ? `Overdue: ${insp.inspection_type} for ${asset?.name || "Unknown Asset"}`
          : `Reminder: ${insp.inspection_type} scheduled for ${asset?.name || "Unknown Asset"}`;

        const body = isOverdue
          ? `Your ${insp.inspection_type} at ${customer.name} (${asset?.location || "N/A"}) was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? "s" : ""} ago. Please schedule immediately.`
          : `Your ${insp.inspection_type} for ${asset?.name || "Unknown Asset"} at ${customer.name} is scheduled for ${dueDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} (${daysUntilDue} day${daysUntilDue > 1 ? "s" : ""} from now).`;

        // Insert notification
        const { data: notif } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: insp.customer_id,
            title,
            body,
            type: isOverdue ? "overdue" : "reminder",
            inspection_id: insp.id,
            read: false,
          })
          .select()
          .single();

        notifications.push({ inspectionId: insp.id, customer_email: customer.email, notification: notif, sent: true });
      }

      return new Response(
        JSON.stringify({ success: true, notifications, count: notifications.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "scan") {
      // Cron-triggered scan: no auth required
      const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const now = new Date().toISOString().slice(0, 10);

      const { data: dueInspections, error: scanErr } = await supabaseClient
        .from("inspections")
        .select("id, customer_id, scheduled_date, inspection_type, status, assets:asset_id(name, location), customers:customer_id(name, email, contact_name)")
        .lte("scheduled_date", sevenDaysFromNow)
        .in("status", ["scheduled", "overdue"])
        .order("scheduled_date");

      if (scanErr) throw scanErr;

      const results = [];
      for (const insp of (dueInspections || [])) {
        const customer = insp.customers;
        const asset = insp.assets;
        const dueDate = new Date(insp.scheduled_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
        const isOverdue = daysUntilDue < 0;

        if (!customer?.email) {
          results.push({ inspectionId: insp.id, skipped: true, reason: "No customer email" });
          continue;
        }

        // Check if already notified today
        const { data: existing } = await supabaseClient
          .from("notifications")
          .select("id")
          .eq("inspection_id", insp.id)
          .eq("type", isOverdue ? "overdue" : "reminder")
          .gte("created_at", new Date(Date.now() - 86400000).toISOString())
          .maybeSingle();

        if (existing) {
          results.push({ inspectionId: insp.id, skipped: true, reason: "Already notified today" });
          continue;
        }

        const title = isOverdue
          ? `Overdue: ${insp.inspection_type} for ${asset?.name || "Unknown Asset"}`
          : `Reminder: ${insp.inspection_type} in ${daysUntilDue} day${daysUntilDue > 1 ? "s" : ""}`;

        const body = isOverdue
          ? `Your ${insp.inspection_type} at ${customer.name} (${asset?.location || "N/A"}) was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? "s" : ""} ago.`
          : `Your ${insp.inspection_type} for ${asset?.name || "Unknown Asset"} at ${customer.name} is scheduled for ${dueDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.`;

        await supabaseClient.from("notifications").insert({
          user_id: insp.customer_id,
          title,
          body,
          type: isOverdue ? "overdue" : "reminder",
          inspection_id: insp.id,
          read: false,
        });

        results.push({ inspectionId: insp.id, customer_email: customer.email, sent: true });
      }

      return new Response(
        JSON.stringify({ success: true, scanned: (dueInspections || []).length, results, sent: results.filter((r: any) => r.sent).length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "stats") {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

      const { count: dueCount } = await supabaseClient
        .from("inspections")
        .select("*", { count: "exact", head: true })
        .lte("scheduled_date", sevenDaysFromNow)
        .in("status", ["scheduled", "overdue"]);

      const { count: overdueCount } = await supabaseClient
        .from("inspections")
        .select("*", { count: "exact", head: true })
        .lt("scheduled_date", new Date().toISOString().slice(0, 10))
        .in("status", ["scheduled", "overdue"]);

      const { count: sentToday } = await supabaseClient
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .in("type", ["reminder", "overdue"])
        .gte("created_at", new Date(Date.now() - 86400000).toISOString());

      return new Response(
        JSON.stringify({
          dueSoon: dueCount || 0,
          overdue: overdueCount || 0,
          remindersSentToday: sentToday || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: trigger, scan, or stats" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Reminders error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
