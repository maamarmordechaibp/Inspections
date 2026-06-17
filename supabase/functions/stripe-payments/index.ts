import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecret) {
    return new Response(
      JSON.stringify({ error: "Stripe not configured. Please connect Stripe in settings." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { action } = body;

  try {
    switch (action) {
      case "create-customer": {
        const { email, name, customer_id } = body;
        const customer = await stripe.customers.create({
          email,
          name,
          metadata: { dousefire_customer_id: customer_id },
        });
        return new Response(
          JSON.stringify({ stripe_customer_id: customer.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create-setup-intent": {
        const { stripe_customer_id } = body;
        const setupIntent = await stripe.setupIntents.create({
          customer: stripe_customer_id,
          payment_method_types: ["card"],
        });
        return new Response(
          JSON.stringify({ client_secret: setupIntent.client_secret }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create-payment-intent": {
        const { stripe_customer_id, amount, description, metadata, payment_method_id } = body;
        const params: any = {
          amount: Math.round(amount * 100),
          currency: "usd",
          description,
          metadata,
          automatic_payment_methods: { enabled: true },
        };
        if (stripe_customer_id) {
          params.customer = stripe_customer_id;
        }
        if (payment_method_id) {
          params.payment_method = payment_method_id;
          params.off_session = true;
          params.confirm = true;
        }
        const paymentIntent = await stripe.paymentIntents.create(params);
        return new Response(
          JSON.stringify({
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id,
            status: paymentIntent.status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-saved-cards": {
        const { stripe_customer_id } = body;
        const paymentMethods = await stripe.paymentMethods.list({
          customer: stripe_customer_id,
          type: "card",
        });
        const cards = paymentMethods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
        }));
        return new Response(
          JSON.stringify({ cards }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "charge-saved-card": {
        const { stripe_customer_id, payment_method_id, amount, description, metadata } = body;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: "usd",
          customer: stripe_customer_id,
          payment_method: payment_method_id,
          off_session: true,
          confirm: true,
          description,
          metadata,
        });
        return new Response(
          JSON.stringify({
            payment_intent_id: paymentIntent.id,
            status: paymentIntent.status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "detach-payment-method": {
        const { payment_method_id } = body;
        await stripe.paymentMethods.detach(payment_method_id);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err: any) {
    console.error("Stripe error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Stripe error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
