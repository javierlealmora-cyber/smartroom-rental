// Supabase Edge Function: update_company
// Actualiza una empresa existente
// Solo accesible por superadmin o admin de la misma empresa

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Tipos
interface CompanyPatch {
  name?: string;
  slug?: string;
  plan?: string;
  status?: string;
  theme_primary_color?: string;
  logo_url?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

interface RequestBody {
  company_id: string;
  company: CompanyPatch;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Crear cliente Service Role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Obtener el JWT token desde el header
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar el JWT y obtener el usuario
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth verification failed:", userError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Authentication failed",
          detail: userError?.message || "Invalid token",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // Obtener el perfil del usuario para verificar permisos
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(
        JSON.stringify({ ok: false, error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parsear body
    const body: RequestBody = await req.json();
    const { company_id, company: patch } = body;

    // Validaciones básicas
    if (!company_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!patch || typeof patch !== "object") {
      return new Response(
        JSON.stringify({ ok: false, error: "company patch data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar permisos: superadmin puede editar cualquier empresa, admin solo su empresa
    if (profile.role === "superadmin") {
      // OK - superadmin puede editar cualquier empresa
    } else if (profile.role === "admin") {
      // Admin solo puede editar su propia empresa
      if (profile.company_id !== company_id) {
        return new Response(
          JSON.stringify({ ok: false, error: "Forbidden: You can only update your own company" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: "Forbidden: Only superadmin or admin can update companies" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preparar los campos a actualizar (solo los que se envían)
    const updateData: Record<string, any> = {};

    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.slug !== undefined) updateData.slug = patch.slug;
    if (patch.plan !== undefined) updateData.plan = patch.plan;
    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.theme_primary_color !== undefined) updateData.theme_primary_color = patch.theme_primary_color;
    if (patch.logo_url !== undefined) updateData.logo_url = patch.logo_url;
    if (patch.contact_name !== undefined) updateData.contact_name = patch.contact_name;
    if (patch.contact_email !== undefined) updateData.contact_email = patch.contact_email;
    if (patch.contact_phone !== undefined) updateData.contact_phone = patch.contact_phone;

    // Agregar timestamp de actualización
    updateData.updated_at = new Date().toISOString();

    console.log("Updating company:", company_id, "with data:", updateData);

    // Actualizar la empresa
    const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from("companies")
      .update(updateData)
      .eq("id", company_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating company:", updateError);

      // Detectar si es error de slug duplicado
      const isDuplicateSlug = updateError.message?.includes("duplicate key value") ||
                              updateError.code === "23505";

      const errorMessage = isDuplicateSlug
        ? `El slug "${patch.slug}" ya está en uso. Elige otro nombre.`
        : "Error al actualizar la empresa";

      return new Response(
        JSON.stringify({
          ok: false,
          error: errorMessage,
          detail: updateError.message
        }),
        {
          status: isDuplicateSlug ? 400 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        company: updatedCompany,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal server error", detail: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
