import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const BRAND_APP_URL = Deno.env.get("BRAND_APP_URL") || "https://new.maamarmordechai.org";
const BRAND_LOGO_URL = Deno.env.get("BRAND_LOGO_URL") || `${BRAND_APP_URL.replace(/\/$/, "")}/logo-email.png`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized — missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized — invalid or expired token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { to, subject, message, headline } = body;

    if (!to || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured. Missing RESEND_API_KEY." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const safeHeadline = escapeHtml(headline || subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");

    const htmlBody = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 12px;font-family:Montserrat,Arial,sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dbe3ee;box-shadow:0 10px 30px rgba(10,22,40,0.08);">
              <tr>
                <td style="background:#0a1628;background-image:linear-gradient(135deg,#0a1628 0%,#12294a 100%);padding:26px 30px;text-align:center;">
                  <img src="${BRAND_LOGO_URL}" alt="DouseFire" width="210" style="display:block;border:0;outline:none;text-decoration:none;margin:0 auto 12px;max-width:100%;height:auto;" />
                  <div style="font-size:13px;color:#dbe7f5;letter-spacing:0.6px;">FIRE INSPECTION PLATFORM</div>
                </td>
              </tr>
              <tr>
                <td style="padding:30px 30px 18px;color:#111827;">
                  <h2 style="margin:0 0 14px;font-size:26px;line-height:1.2;color:#0f172a;">${safeHeadline}</h2>
                  <p style="margin:0;font-size:15px;line-height:1.75;color:#475569;">${safeMessage}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 30px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:11px;line-height:1.8;color:#64748b;">
                    DouseFire Team<br/>
                    Sent automatically from ${BRAND_APP_URL}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DouseFire <billing@dousefire.com>",
        to: [to],
        subject,
        html: htmlBody,
        text: message,
      }),
    });

    const resendData = await res.json();
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
