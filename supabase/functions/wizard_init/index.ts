// Supabase Edge Function: wizard_init
// Marca el perfil del usuario como "in_progress" para iniciar el wizard de onboarding

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

    // Verificar que el usuario no tiene ya un tenant activo
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("onboarding_status, client_account_id")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_status === "active" && profile?.client_account_id) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "User already has an active account",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Marcar onboarding como in_progress
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ onboarding_status: "in_progress" })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating onboarding status:", updateError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to initialize wizard",
          detail: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, step: "A" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("wizard_init error:", message);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
