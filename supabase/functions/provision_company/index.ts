// Supabase Edge Function: provision_company
// Crea una empresa nueva + admin user/profile
// Solo accesible por superadmin

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Tipos
interface CompanyPayload {
  name: string;
  slug: string;
  plan: string;
  status: string;
  start_date: string;
  theme_primary_color: string;
  logo_url?: string | null;
}

interface AdminPayload {
  email: string;
  full_name?: string | null;
}

interface RequestBody {
  company: CompanyPayload;
  admin: AdminPayload;
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
    // Crear cliente Service Role para validar el usuario y realizar operaciones
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

    console.log("User authenticated successfully:", user.id);

    // Verificar que el usuario sea superadmin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "superadmin") {
      console.error("Permission denied:", { userId: user.id, role: profile?.role });
      return new Response(
        JSON.stringify({ ok: false, error: "Forbidden: Only superadmin can provision companies" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parsear body
    const body: RequestBody = await req.json();
    const { company, admin } = body;

    // Validaciones básicas
    if (!company?.name || !company?.slug || !admin?.email) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crear la empresa en la tabla companies
    const { data: newCompany, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: company.name,
        slug: company.slug,
        plan: company.plan,
        status: company.status,
        start_date: company.start_date,
        theme_primary_color: company.theme_primary_color,
        logo_url: company.logo_url || null,
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);

      // Detectar si es error de slug duplicado (unique constraint)
      const isDuplicateSlug = companyError.message?.includes("duplicate key value") ||
                              companyError.code === "23505";

      const errorMessage = isDuplicateSlug
        ? `El slug "${company.slug}" ya está en uso. Elige otro nombre para la empresa.`
        : "Error al crear la empresa";

      return new Response(
        JSON.stringify({
          ok: false,
          error: errorMessage,
          detail: companyError.message
        }),
        {
          status: isDuplicateSlug ? 400 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Crear el usuario admin con Supabase Auth Admin API
    const { data: newUser, error: userCreationError } = await supabaseAdmin.auth.admin.createUser({
      email: admin.email,
      email_confirm: false, // Requerirá confirmación por email
      user_metadata: {
        full_name: admin.full_name || null,
      },
    });

    if (userCreationError) {
      console.error("Error creating admin user:", userCreationError);

      // Rollback: eliminar la empresa creada
      await supabaseAdmin.from("companies").delete().eq("id", newCompany.id);

      // Detectar si es error de email duplicado
      const isDuplicateEmail = userCreationError.message?.includes("already been registered") ||
                               userCreationError.code === "email_exists";

      const errorMessage = isDuplicateEmail
        ? `El email ${admin.email} ya está registrado. Usa otro email para el administrador.`
        : "Error al crear el usuario administrador";

      return new Response(
        JSON.stringify({
          ok: false,
          error: errorMessage,
          detail: userCreationError.message
        }),
        {
          status: isDuplicateEmail ? 400 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Crear el perfil del admin en la tabla profiles
    const { error: profileInsertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: newUser.user.id,
        role: "admin",
        company_id: newCompany.id,
        full_name: admin.full_name || null,
        email: admin.email,
      });

    if (profileInsertError) {
      console.error("Error creating admin profile:", profileInsertError);

      // Rollback: eliminar usuario y empresa
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      await supabaseAdmin.from("companies").delete().eq("id", newCompany.id);

      return new Response(
        JSON.stringify({ ok: false, error: "Error creating admin profile", detail: profileInsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        company: newCompany,
        admin: {
          id: newUser.user.id,
          email: newUser.user.email,
        },
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
