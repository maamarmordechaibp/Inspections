import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatE164(phone: string): string {
  const digits = phone.replace(/[\s\-\(\)\.]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits;
}

async function logCall(
  supabaseUrl: string,
  supabaseKey: string,
  entry: {
    inspector_id?: string;
    inspector_name: string;
    customer_id?: string;
    customer_name: string;
    customer_phone?: string;
    call_sid: string;
    action: "call" | "bridge";
    status: string;
    using_sip: boolean;
  }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from("call_logs").insert(entry);
  } catch (_) {
    // Best-effort logging — never block the call for a log failure
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Parse body first so we can check action before auth
  let body: any;
  try {
    body = await req.json();
  } catch {
    // IVR calls from SignalWire come as form-encoded, not JSON
    body = {};
  }

  const { action } = body;

  // IVR webhook from SignalWire — no JWT, must bypass auth
  const isIvr = action === "ivr";

  if (!isIvr) {
    // ─── Auth Guard (skip for IVR) ─────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized — missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized — missing token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized — invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ─── End Auth Guard ────────────────────────────────────
  }

  try {
    const { toNumber, fromNumber } = body;

    const signalwireSpace = Deno.env.get("SIGNALWIRE_SPACE")!;
    const signalwireProject = Deno.env.get("SIGNALWIRE_PROJECT")!;
    const signalwireToken = Deno.env.get("SIGNALWIRE_TOKEN")!;
    const signalwireFrom = Deno.env.get("SIGNALWIRE_FROM")!;

    const auth = btoa(`${signalwireProject}:${signalwireToken}`);
    const apiBase = `https://${signalwireSpace}/api/laml/2010-04-01/Accounts/${signalwireProject}`;

    // ─── OUTBOUND DIRECT CALL ──────────────────────────────
    if (action === "call") {
      if (!toNumber) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing toNumber" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const formattedTo = formatE164(toNumber);
      const formData = new URLSearchParams();
      formData.append("Url", "https://readdy.ai/api/signalwire-dial-tone");
      formData.append("To", formattedTo);
      formData.append("From", signalwireFrom);

      const response = await fetch(`${apiBase}/Calls.json`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const result = await response.json();

      if (response.ok && result.sid) {
        logCall(supabaseUrl, supabaseKey, {
          inspector_id: body.inspectorId,
          inspector_name: body.inspectorName || "Unknown",
          customer_id: body.customerId,
          customer_name: body.customerName || toNumber,
          customer_phone: formattedTo,
          call_sid: result.sid,
          action: "call",
          status: result.status || "initiated",
          using_sip: false,
        });
      }

      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: result.message || "Call initiation failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          callSid: result.sid,
          status: result.status,
          from: signalwireFrom,
          to: formattedTo,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── BRIDGE CALL (inspector-first → customer) ──────────
    if (action === "bridge") {
      const inspectorNumber = body.inspectorNumber;
      const customerNumber = body.customerNumber;
      const inspectorSip = body.inspectorSip;
      const customerSip = body.customerSip;

      let inspectorDest = inspectorSip || inspectorNumber;
      if (!inspectorDest) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing inspectorNumber or inspectorSip" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let customerDest = customerSip || customerNumber;
      if (!customerDest) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing customerNumber or customerSip" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const usingSip = !!(inspectorSip || customerSip);

      let dialTarget = "";
      if (customerSip) {
        dialTarget = `<Sip>${customerSip}</Sip>`;
      } else {
        dialTarget = `<Number>${formatE164(customerDest)}</Number>`;
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to the customer now.</Say>
  <Dial callerId="${signalwireFrom}" timeout="30" record="record-from-answer">
    ${dialTarget}
  </Dial>
  <Say voice="alice">The call could not be completed. The customer may be unavailable. Please try again.</Say>
</Response>`;

      const formData = new URLSearchParams();
      formData.append("Twiml", twiml);

      if (inspectorSip) {
        formData.append("To", inspectorSip);
        formData.append("From", inspectorSip);
      } else {
        formData.append("To", formatE164(inspectorDest));
        formData.append("From", signalwireFrom);
      }

      const response = await fetch(`${apiBase}/Calls.json`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const result = await response.json();

      if (response.ok && result.sid) {
        logCall(supabaseUrl, supabaseKey, {
          inspector_id: body.inspectorId,
          inspector_name: body.inspectorName || inspectorDest,
          customer_id: body.customerId,
          customer_name: body.customerName || customerDest,
          customer_phone: customerNumber || customerSip || customerDest,
          call_sid: result.sid,
          action: "bridge",
          status: result.status || "initiated",
          using_sip: usingSip,
        });
      }

      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: result.message || "Bridge call initiation failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          callSid: result.sid,
          status: result.status,
          bridge: true,
          inspectorDest,
          customerDest,
          usingSip,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── INBOUND IVR WEBHOOK (no JWT — called by SignalWire) ──
    if (action === "ivr") {
      const callerNumber = fromNumber || "";

      const normalized = callerNumber.replace(/[\s\-\(\)\.]/g, "").replace(/^\+1/, "");
      const custUrl = `${supabaseUrl}/rest/v1/customers?phone=ilike.*${normalized}*&select=id,name,company,phone,email,contact_name,last_inspection_date&limit=1`;
      const custResp = await fetch(custUrl, {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      });
      const custData = custResp.ok ? await custResp.json() : [];
      const customer = custData.length > 0 ? custData[0] : null;

      if (!customer) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling DouseFire Inspection Services. We don't recognize your number. Please call us during business hours at 8 4 5, 2 4 1, 3 4 7 3, or visit our website to schedule an inspection. Goodbye.</Say>
  <Hangup/>
</Response>`;
        return new Response(twiml, {
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }

      const lastInspection = customer.last_inspection_date
        ? new Date(customer.last_inspection_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "not on file";

      const slots: string[] = [];
      const now = new Date();
      let day = new Date(now);
      day.setDate(day.getDate() + 1);
      let found = 0;
      while (found < 3) {
        const dow = day.getDay();
        if (dow !== 0 && dow !== 6) {
          slots.push(day.toISOString().split("T")[0]);
          found++;
        }
        day.setDate(day.getDate() + 1);
      }

      const slotText = slots.map((s, i) => {
        const d = new Date(s + "T00:00:00");
        return `Option ${i + 1}: ${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`;
      }).join(". ");

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, and welcome to DouseFire for ${customer.name}.</Say>
  <Say voice="alice">Your last fire safety inspection was completed on ${lastInspection}.</Say>
  <Say voice="alice">To schedule your next inspection, here are the next available dates: ${slotText}.</Say>
  <Say voice="alice">Press 1 for ${slots[0] ? new Date(slots[0] + "T00:00:00").toLocaleDateString("en-US", {weekday: "long", month: "long", day: "numeric"}) : "the first option"}, press 2 for the second, or press 3 for the third.</Say>
  <Gather numDigits="1" action="${apiBase}/Calls/schedule-hook" method="POST" timeout="10">
    <Say voice="alice">Please make your selection now.</Say>
  </Gather>
  <Say voice="alice">No selection received. A DouseFire representative will call you back within one business day to schedule your inspection. Thank you, goodbye.</Say>
  <Hangup/>
</Response>`;

      return new Response(twiml, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action. Use: call, bridge, ivr" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: `Server error: ${err.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
