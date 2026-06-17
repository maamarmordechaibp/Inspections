import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledAsset {
  asset_name: string;
  asset_type: string;
  location: string;
  inspection_type: string;
}

interface NotificationPayload {
  inspector_id: string;
  inspector_name: string;
  scheduled_date: string;
  assets: ScheduledAsset[];
  inspection_type: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ─── Auth Guard ──────────────────────────────────────────
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized — invalid or expired token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // ─── End Auth Guard ──────────────────────────────────────

  try {
    const payload: NotificationPayload = await req.json();
    const { inspector_id, inspector_name, scheduled_date, assets, inspection_type } = payload;

    if (!inspector_id || !inspector_name || !scheduled_date || !assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedDate = new Date(scheduled_date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const title = `New inspections assigned — ${formattedDate}`;

    const assetList = assets
      .slice(0, 5)
      .map((a) => `• ${a.asset_name} (${a.asset_type}) — ${a.inspection_type}`)
      .join("\n");

    const extra = assets.length > 5 ? `\n... and ${assets.length - 5} more` : "";

    const body = `You have been assigned ${assets.length} inspection${assets.length !== 1 ? "s" : ""} on ${formattedDate}:\n\n${assetList}${extra}\n\nInspection type: ${inspection_type}`;

    // Insert notification record
    const { error: insertErr } = await supabase
      .from("notifications")
      .insert({
        inspector_id,
        inspector_name,
        title,
        body,
        inspection_count: assets.length,
        scheduled_date,
      });

    if (insertErr) {
      console.error("Failed to insert notification:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to store notification", details: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification stored for ${inspector_name} — ${assets.length} inspection${assets.length !== 1 ? "s" : ""}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
