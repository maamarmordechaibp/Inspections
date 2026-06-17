import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

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
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
        <div style="background: #0a1628; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #F5C518; margin: 0; font-size: 24px;">DouseFire</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 32px 24px; border-radius: 0 0 12px 12px;">
          <h2 style="color: #111827; font-size: 18px; margin: 0 0 8px;">Invoice ${invoice_number} — Payment Request</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
            Hello${customer_name ? ' ' + customer_name : ''},<br/><br/>
            Your invoice <strong>${invoice_number}</strong> for <strong>${formattedTotal}</strong> is ready for payment. Please use the secure link below to view and pay your invoice online.
          </p>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #6b7280;">Invoice</td>
                <td style="padding: 4px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${invoice_number}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #6b7280;">Amount Due</td>
                <td style="padding: 4px 0; font-size: 18px; color: #111827; font-weight: 700; text-align: right;">${formattedTotal}</td>
              </tr>
            </table>
          </div>

          <a href="${payment_url}" style="display: block; background: #F5C518; color: #ffffff; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Pay Invoice Now
          </a>

          <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0; text-align: center;">
            This is a secure payment link. Card details are encrypted and never stored on our servers.<br/>
            If you have questions, please contact DouseFire support.
          </p>
        </div>
      </div>
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
