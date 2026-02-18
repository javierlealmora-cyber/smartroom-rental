// Supabase Edge Function: whoami
// Devuelve datos completos del usuario autenticado:
// perfil, client_account, branding, plan

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar JWT
    const authHeader =
      req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Authentication failed" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Obtener perfil
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        "role, company_id, client_account_id, onboarding_status, is_primary_admin, full_name, email"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ ok: false, error: "Profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Respuesta base
    const result: Record<string, unknown> = {
      ok: true,
      user_id: user.id,
      email: profile.email || user.email,
      full_name: profile.full_name,
      role: profile.role,
      company_id: profile.company_id,
      client_account_id: profile.client_account_id,
      onboarding_status: profile.onboarding_status,
      is_primary_admin: profile.is_primary_admin,
    };

    // Si tiene client_account_id, cargar branding + plan
    if (profile.client_account_id) {
      const { data: account } = await supabaseAdmin
        .from("client_accounts")
        .select(
          "name, slug, plan_code, billing_cycle, status, branding_name, branding_primary_color, branding_secondary_color, branding_logo_url"
        )
        .eq("id", profile.client_account_id)
        .single();

      if (account) {
        result.plan_code = account.plan_code;
        result.billing_cycle = account.billing_cycle;
        result.account_status = account.status;
        result.branding = {
          name: account.branding_name || account.name,
          logo_url: account.branding_logo_url,
          primary_color: account.branding_primary_color,
          secondary_color: account.branding_secondary_color,
        };
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("whoami error:", message);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
