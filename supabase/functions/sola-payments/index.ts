import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, origin, x-requested-with, x-supabase-api-version, supabase-auth-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

// Sola (Cardknox) gateway. Primary environment is x1, with x2 and b1 as backups.
const SOLA_API_URL =
  Deno.env.get("SOLA_API_URL") || "https://x1.cardknox.com/gatewayjson";
const SOLA_API_KEY = Deno.env.get("SOLA_API_KEY") || "";
const SOLA_SOFTWARE_NAME = Deno.env.get("SOLA_SOFTWARE_NAME") || "DouseFire";
const SOLA_SOFTWARE_VERSION = Deno.env.get("SOLA_SOFTWARE_VERSION") || "1.0.0";
const SOLA_API_VERSION = "5.0.0";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function gateway(payload: Record<string, unknown>) {
  const res = await fetch(SOLA_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      xKey: SOLA_API_KEY,
      xVersion: SOLA_API_VERSION,
      xSoftwareName: SOLA_SOFTWARE_NAME,
      xSoftwareVersion: SOLA_SOFTWARE_VERSION,
      ...payload,
    }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected gateway response: ${text.slice(0, 200)}`);
  }
}

function formatAmount(amount: unknown): string {
  const n = Number(amount);
  if (!isFinite(n) || n <= 0) throw new Error("Invalid amount");
  return n.toFixed(2);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ─── Auth Guard ──────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") || "";
  if (!token) {
    return jsonResponse({ error: "Unauthorized — missing token" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return jsonResponse({ error: "Unauthorized — invalid or expired token" }, 401);
  }
  // ─── End Auth Guard ──────────────────────────────────────

  if (!SOLA_API_KEY) {
    return jsonResponse(
      { error: "Payments not configured. Please add the SOLA_API_KEY secret to this edge function." },
      500,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const action = String(body.action || "");

  try {
    switch (action) {
      // One-time sale using either single-use tokens from iFields (xCardNum + xCVV + xExp)
      // or a previously stored card-on-file token (xToken).
      case "sale": {
        const amount = formatAmount(body.amount);
        const invoiceId = (body.invoice_id as string) || "";
        const customerId = (body.customer_id as string) || "";

        const payload: Record<string, unknown> = {
          xCommand: "cc:sale",
          xAmount: amount,
          xInvoice: (body.invoice_number as string) || invoiceId || undefined,
          xDescription: (body.description as string) || "Payment",
          xName: (body.name as string) || undefined,
          xEmail: (body.email as string) || undefined,
          xStreet: (body.street as string) || undefined,
          xZip: (body.zip as string) || undefined,
          xCustReceipt: body.email ? "TRUE" : undefined,
        };

        if (body.token) {
          // Card-on-file: charge a stored token.
          payload.xToken = body.token;
        } else {
          // New card via iFields single-use tokens.
          if (!body.card_token || !body.exp) {
            return jsonResponse({ error: "Missing card details." }, 400);
          }
          payload.xCardNum = body.card_token; // SUT for card number
          payload.xExp = body.exp; // MMYY
          if (body.cvv_token) payload.xCVV = body.cvv_token; // SUT for CVV
        }

        const result = await gateway(payload);

        if (result.xResult !== "A") {
          return jsonResponse(
            { approved: false, error: result.xError || "Payment declined.", refnum: result.xRefNum || null },
            402,
          );
        }

        // Record the payment and settle the invoice server-side.
        try {
          await supabase.from("payments").insert({
            customer_id: customerId || null,
            invoice_id: invoiceId || null,
            amount: Number(amount),
            status: "succeeded",
            stripe_payment_intent_id: result.xRefNum || null,
            stripe_payment_method_id: result.xToken || null,
            description: (body.description as string) || "Payment",
            metadata: {
              invoice_id: invoiceId,
              customer_id: customerId,
              gateway: "sola",
              auth_code: result.xAuthCode || null,
              masked_card: result.xMaskedCardNumber || null,
              card_type: result.xCardType || null,
            },
          });
          if (invoiceId) {
            await supabase
              .from("invoices")
              .update({ status: "paid", paid_at: new Date().toISOString() })
              .eq("id", invoiceId);
          }
        } catch (recordErr) {
          console.error("Payment approved but failed to record:", recordErr);
        }

        return jsonResponse({
          approved: true,
          refnum: result.xRefNum,
          token: result.xToken || null,
          masked_card: result.xMaskedCardNumber || null,
          card_type: result.xCardType || null,
          auth_amount: result.xAuthAmount || amount,
        });
      }

      // Tokenize a card without charging (card-on-file setup).
      case "save-card": {
        if (!body.card_token || !body.exp) {
          return jsonResponse({ error: "Missing card details." }, 400);
        }
        const result = await gateway({
          xCommand: "cc:save",
          xCardNum: body.card_token,
          xExp: body.exp,
          xName: (body.name as string) || undefined,
          xStreet: (body.street as string) || undefined,
          xZip: (body.zip as string) || undefined,
        });
        if (result.xResult !== "A") {
          return jsonResponse({ approved: false, error: result.xError || "Could not save card." }, 402);
        }
        return jsonResponse({
          approved: true,
          token: result.xToken,
          masked_card: result.xMaskedCardNumber || null,
          card_type: result.xCardType || null,
        });
      }

      // Refund a settled or pending transaction by reference number.
      case "refund": {
        const refnum = (body.refnum as string) || "";
        if (!refnum) return jsonResponse({ error: "Missing refnum." }, 400);
        const payload: Record<string, unknown> = { xCommand: "cc:refund", xRefNum: refnum };
        if (body.amount) payload.xAmount = formatAmount(body.amount);
        const result = await gateway(payload);
        if (result.xResult !== "A") {
          return jsonResponse({ approved: false, error: result.xError || "Refund failed." }, 402);
        }
        return jsonResponse({ approved: true, refnum: result.xRefNum });
      }

      // Void a transaction that has not yet settled.
      case "void": {
        const refnum = (body.refnum as string) || "";
        if (!refnum) return jsonResponse({ error: "Missing refnum." }, 400);
        const result = await gateway({ xCommand: "cc:void", xRefNum: refnum });
        if (result.xResult !== "A") {
          return jsonResponse({ approved: false, error: result.xError || "Void failed." }, 402);
        }
        return jsonResponse({ approved: true, refnum: result.xRefNum });
      }

      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    console.error("Sola error:", err);
    return jsonResponse({ error: (err as Error)?.message || "Payment error" }, 500);
  }
});
