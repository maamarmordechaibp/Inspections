import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const BRAND_APP_URL = Deno.env.get("BRAND_APP_URL") || "https://new.maamarmordechai.org";
const BRAND_LOGO_URL = Deno.env.get("BRAND_LOGO_URL") || `${BRAND_APP_URL.replace(/\/$/, "")}/logo-email.png`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized — invalid or expired token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // ─── End Auth Guard ──────────────────────────────────────

  try {
    const body = await req.json();
    const { invoice_id, customer_id, customer_email, customer_name, invoice_number, total, payment_url } = body;

    if (!customer_email || !invoice_number || !payment_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: customer_email, invoice_number, payment_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Email service not configured. Please add a RESEND_API_KEY secret to this edge function.",
          payment_url,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedTotal = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(total || 0);

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
                  <div style="display:inline-block;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:700;letter-spacing:0.4px;border-radius:999px;padding:6px 12px;margin-bottom:14px;">PAYMENT REQUEST</div>
                  <h2 style="margin:0 0 10px;font-size:26px;line-height:1.2;color:#0f172a;">Invoice ${invoice_number}</h2>
                  <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#475569;">
                    Hello${customer_name ? ` ${customer_name}` : ''}, your invoice is ready for payment. Use the secure button below to complete payment online.
                  </p>

                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#64748b;">Invoice</td>
                        <td style="padding:4px 0;font-size:13px;color:#111827;font-weight:700;text-align:right;">${invoice_number}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#64748b;">Amount Due</td>
                        <td style="padding:4px 0;font-size:22px;color:#0f172a;font-weight:800;text-align:right;">${formattedTotal}</td>
                      </tr>
                    </table>
                  </div>

                  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
                    <tr>
                      <td>
                        <a href="${payment_url}" style="display:inline-block;background:#f5c518;color:#0a1628;text-decoration:none;font-weight:800;font-size:14px;padding:13px 20px;border-radius:10px;letter-spacing:0.2px;">Pay Invoice Now</a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0;font-size:12px;line-height:1.75;color:#64748b;word-break:break-all;">Secure payment link: ${payment_url}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 30px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:11px;line-height:1.8;color:#64748b;">
                    DouseFire Billing Team<br/>
                    Questions? Visit ${BRAND_APP_URL}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const textBody = `DouseFire — Payment Request\n\nInvoice ${invoice_number}\nAmount Due: ${formattedTotal}\n\nPay online at: ${payment_url}\n\nThis is a secure payment link. Card details are encrypted and never stored on our servers.`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DouseFire <billing@dousefire.com>",
        to: [customer_email],
        subject: `Invoice ${invoice_number} — Payment Due (${formattedTotal})`,
        html: htmlBody,
        text: textBody,
      }),
    });

    const resendData = await res.json();

    if (!res.ok) {
      console.error("Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email. Please check your RESEND_API_KEY and sender configuration." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `Payment link sent to ${customer_email}`, id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
