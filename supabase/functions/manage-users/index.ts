import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ─── Auth Guard ──────────────────────────────────────────
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.8");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the caller's JWT
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized — invalid or expired token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify the caller is an admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return new Response(
      JSON.stringify({ success: false, error: "Forbidden — admin access required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // ─── End Auth Guard ──────────────────────────────────────

  try {
    const body = await req.json();
    const { action, email, password, full_name, role, user_id, phone, sip_uri } = body;

    switch (action) {
      case "create": {
        if (!email || !password || !full_name || !role) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing required fields: email, password, full_name, role" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: existingUsers, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr) {
          return new Response(
            JSON.stringify({ success: false, error: `Auth list error: ${listErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const exists = existingUsers?.users?.find((u: any) => u.email === email);
        if (exists) {
          return new Response(
            JSON.stringify({ success: false, error: "A user with this email already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: `Auth create error: ${error.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (data.user) {
          const profileData: any = { role, email, full_name };
          if (phone) profileData.phone = phone;
          if (sip_uri) profileData.sip_uri = sip_uri;
          await supabase.from("profiles").update(profileData).eq("id", data.user.id);

          return new Response(
            JSON.stringify({
              success: true,
              user: {
                id: data.user.id,
                email: data.user.email,
                full_name,
                role,
                phone: phone || null,
                sip_uri: sip_uri || null,
                created_at: data.user.created_at,
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: "User creation returned no user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!user_id) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing user_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: profileErr } = await supabase.from("profiles").delete().eq("id", user_id);
        if (profileErr) {
          return new Response(
            JSON.stringify({ success: false, error: `Profile delete error: ${profileErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: authErr } = await supabase.auth.admin.deleteUser(user_id);
        if (authErr) {
          return new Response(
            JSON.stringify({ success: false, error: `Auth delete error: ${authErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "edit": {
        if (!user_id) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing user_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updateData: any = {};
        if (email) updateData.email = email;
        if (full_name) updateData.user_metadata = { full_name };

        if (Object.keys(updateData).length > 0) {
          const { error: authErr } = await supabase.auth.admin.updateUserById(user_id, updateData);
          if (authErr) {
            return new Response(
              JSON.stringify({ success: false, error: `Auth update error: ${authErr.message}` }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        const profileUpdate: any = {};
        if (email) profileUpdate.email = email;
        if (full_name !== undefined) profileUpdate.full_name = full_name;
        if (role) profileUpdate.role = role;
        if (phone !== undefined) profileUpdate.phone = phone;
        if (sip_uri !== undefined) profileUpdate.sip_uri = sip_uri;

        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileErr } = await supabase.from("profiles").update(profileUpdate).eq("id", user_id);
          if (profileErr) {
            return new Response(
              JSON.stringify({ success: false, error: `Profile update error: ${profileErr.message}` }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "change_password": {
        if (!user_id || !password) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing user_id or password" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: pwErr } = await supabase.auth.admin.updateUserById(user_id, {
          password,
        });

        if (pwErr) {
          return new Response(
            JSON.stringify({ success: false, error: `Password change error: ${pwErr.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list": {
        const { data: users, error } = await supabase.auth.admin.listUsers();

        if (error) {
          return new Response(
            JSON.stringify({ success: false, error: `Auth list error: ${error.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: profiles } = await supabase.from("profiles").select("id, role, full_name, email, phone, sip_uri, created_at");

        const merged = (users?.users || []).map((u: any) => {
          const profile = profiles?.find((p: any) => p.id === u.id);
          return {
            id: u.id,
            email: u.email,
            full_name: profile?.full_name || u.user_metadata?.full_name || "",
            role: profile?.role || "technician",
            phone: profile?.phone || null,
            sip_uri: profile?.sip_uri || null,
            created_at: u.created_at || profile?.created_at,
            last_sign_in_at: u.last_sign_in_at,
          };
        });

        return new Response(
          JSON.stringify({ success: true, users: merged }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid action. Use: create, delete, edit, change_password, list" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: `Server error: ${err.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
