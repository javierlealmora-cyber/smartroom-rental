// Supabase Edge Function: provision_client_account_superadmin
// Similar a wizard_submit pero:
// - Solo accesible por superadmin
// - Crea cuenta en estado 'draft' (sin Stripe)
// - No requiere checkout

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface PayerPayload {
  legal_type: string;
  legal_name?: string;
  first_name?: string;
  last_name1?: string;
  last_name2?: string;
  tax_id?: string;
  billing_email?: string;
  phone?: string;
  country?: string;
  province?: string;
  city?: string;
  zip?: string;
  street?: string;
  street_number?: string;
  address_extra?: string;
}

interface AdminPayload {
  email: string;
  full_name?: string;
  is_primary?: boolean;
}

interface ProvisionPayload {
  account_name: string;
  slug: string;
  plan_code: string;
  billing_cycle: string;
  start_date?: string;
  status?: string;
  branding_name?: string;
  branding_primary_color?: string;
  branding_secondary_color?: string;
  branding_logo_url?: string;
  payer: PayerPayload;
  admins?: AdminPayload[];
}

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

    // Verificar que sea superadmin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "superadmin") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Forbidden: Only superadmin can provision accounts",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parsear body
    const body: ProvisionPayload = await req.json();

    if (!body.account_name || !body.slug || !body.plan_code || !body.payer) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Obtener limites del plan
    const { data: plan } = await supabaseAdmin
      .from("plans_catalog")
      .select("max_owners, max_admin_users")
      .eq("code", body.plan_code)
      .eq("status", "active")
      .single();

    if (!plan) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid or inactive plan" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determinar estado — superadmin puede elegir, default 'draft'
    const validStatuses = [
      "draft",
      "pending_payment",
      "active",
      "suspended",
      "canceled",
    ];
    const accountStatus =
      body.status && validStatuses.includes(body.status)
        ? body.status
        : "draft";

    // --- PASO 1: Crear client_account ---
    const { data: newAccount, error: accountError } = await supabaseAdmin
      .from("client_accounts")
      .insert({
        name: body.account_name,
        slug: body.slug,
        plan_code: body.plan_code,
        billing_cycle: body.billing_cycle || "monthly",
        status: accountStatus,
        start_date: body.start_date || new Date().toISOString().split("T")[0],
        branding_name: body.branding_name,
        branding_primary_color: body.branding_primary_color,
        branding_secondary_color: body.branding_secondary_color,
        branding_logo_url: body.branding_logo_url,
      })
      .select()
      .single();

    if (accountError) {
      console.error("Error creating client_account:", accountError);
      const isDuplicateSlug =
        accountError.message?.includes("duplicate key value") ||
        accountError.code === "23505";
      return new Response(
        JSON.stringify({
          ok: false,
          error: isDuplicateSlug
            ? `El slug "${body.slug}" ya esta en uso`
            : "Error creating account",
          detail: accountError.message,
        }),
        {
          status: isDuplicateSlug ? 400 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clientAccountId = newAccount.id;

    // --- PASO 2: Crear entidad pagadora (payer) ---
    const { error: payerError } = await supabaseAdmin
      .from("entities")
      .insert({
        client_account_id: clientAccountId,
        type: "payer",
        legal_type: body.payer.legal_type,
        legal_name: body.payer.legal_name,
        first_name: body.payer.first_name,
        last_name1: body.payer.last_name1,
        last_name2: body.payer.last_name2,
        tax_id: body.payer.tax_id,
        billing_email: body.payer.billing_email,
        phone: body.payer.phone,
        country: body.payer.country || "Espana",
        province: body.payer.province,
        city: body.payer.city,
        zip: body.payer.zip,
        street: body.payer.street,
        street_number: body.payer.street_number,
        address_extra: body.payer.address_extra,
      });

    if (payerError) {
      console.error("Error creating payer entity:", payerError);
      await supabaseAdmin
        .from("client_accounts")
        .delete()
        .eq("id", clientAccountId);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Error creating payer entity",
          detail: payerError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- PASO 3: Crear entidad propietaria por defecto (owner) ---
    const { error: ownerError } = await supabaseAdmin
      .from("entities")
      .insert({
        client_account_id: clientAccountId,
        type: "owner",
        legal_type: body.payer.legal_type,
        legal_name: body.payer.legal_name,
        first_name: body.payer.first_name,
        last_name1: body.payer.last_name1,
        last_name2: body.payer.last_name2,
        tax_id: body.payer.tax_id,
        billing_email: body.payer.billing_email,
        phone: body.payer.phone,
        country: body.payer.country || "Espana",
        province: body.payer.province,
        city: body.payer.city,
        zip: body.payer.zip,
        street: body.payer.street,
        street_number: body.payer.street_number,
        address_extra: body.payer.address_extra,
      });

    if (ownerError) {
      console.error("Error creating owner entity:", ownerError);
      await supabaseAdmin
        .from("client_accounts")
        .delete()
        .eq("id", clientAccountId);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Error creating owner entity",
          detail: ownerError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- PASO 4: Crear/invitar admins ---
    const createdAdmins: { id: string; email: string; status: string }[] = [];

    if (body.admins && body.admins.length > 0) {
      for (const admin of body.admins) {
        if (!admin.email) continue;

        const isPrimary = !!admin.is_primary;

        // Buscar si el usuario ya existe en auth.users
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u) => u.email?.toLowerCase() === admin.email.toLowerCase()
        );

        if (existingUser) {
          // Usuario ya existe en Auth → actualizar su perfil
          console.log(`Admin ${admin.email} already exists in Auth (id: ${existingUser.id}), updating profile`);

          // Intentar update (si ya tiene profile) o insert (si no)
          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("id", existingUser.id)
            .maybeSingle();

          if (existingProfile) {
            // Actualizar perfil existente
            const { error: updateError } = await supabaseAdmin
              .from("profiles")
              .update({
                role: "admin",
                client_account_id: clientAccountId,
                onboarding_status: "active",
                is_primary_admin: isPrimary,
                full_name: admin.full_name || existingProfile.full_name || null,
              })
              .eq("id", existingUser.id);

            if (updateError) {
              console.error(`Error updating profile for ${admin.email}:`, updateError);
              continue;
            }
          } else {
            // Crear perfil para usuario existente sin profile
            const { error: insertError } = await supabaseAdmin
              .from("profiles")
              .insert({
                id: existingUser.id,
                role: "admin",
                client_account_id: clientAccountId,
                full_name: admin.full_name || null,
                email: admin.email,
                onboarding_status: "active",
                is_primary_admin: isPrimary,
              });

            if (insertError) {
              console.error(`Error creating profile for existing user ${admin.email}:`, insertError);
              continue;
            }
          }

          createdAdmins.push({ id: existingUser.id, email: admin.email, status: "existing_user_linked" });
        } else {
          // Usuario nuevo → crear en Auth + profile
          const { data: newUser, error: adminUserError } =
            await supabaseAdmin.auth.admin.createUser({
              email: admin.email,
              email_confirm: false,
              user_metadata: { full_name: admin.full_name || null },
            });

          if (adminUserError) {
            console.error(`Error creating admin ${admin.email}:`, adminUserError);
            continue;
          }

          const { error: adminProfileError } = await supabaseAdmin
            .from("profiles")
            .insert({
              id: newUser.user.id,
              role: "admin",
              client_account_id: clientAccountId,
              full_name: admin.full_name || null,
              email: admin.email,
              onboarding_status: "active",
              is_primary_admin: isPrimary,
            });

          if (adminProfileError) {
            console.error(`Error creating admin profile ${admin.email}:`, adminProfileError);
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
            continue;
          }

          createdAdmins.push({ id: newUser.user.id, email: admin.email, status: "new_user_created" });
        }
      }
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        ok: true,
        client_account_id: clientAccountId,
        admins_created: createdAdmins,
        status: accountStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("provision_client_account_superadmin error:", message);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal server error",
        detail: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
