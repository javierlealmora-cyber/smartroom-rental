// Supabase Edge Function: wizard_submit
// Procesa el wizard completo de autoregistro:
// 1. Crea client_account
// 2. Crea entidad pagadora (payer)
// 3. Crea entidad propietaria (owner) por defecto
// 4. Crea/invita admins adicionales
// 5. Actualiza perfil del usuario
// 6. Crea Stripe Checkout Session (si autoregistro)

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

interface WizardPayload {
  // Datos del contrato (Step A)
  account_name: string;
  slug: string;
  plan_code: string;
  billing_cycle: string;
  start_date?: string;
  contact_email?: string;
  contact_phone?: string;
  // Branding (Step B)
  branding_name?: string;
  branding_primary_color?: string;
  branding_secondary_color?: string;
  branding_logo_url?: string;
  // Entidad pagadora (Step C)
  payer: PayerPayload;
  // Admins adicionales (Step D)
  admins?: AdminPayload[];
  // Modo
  mode: "self_signup" | "superadmin_create";
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

    // Verificar perfil — no debe tener tenant activo
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, onboarding_status, client_account_id")
      .eq("id", user.id)
      .single();

    if (
      profile?.onboarding_status === "active" &&
      profile?.client_account_id
    ) {
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

    // Parsear body
    const body: WizardPayload = await req.json();

    // Validaciones basicas
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

    // Validar numero de admins
    const adminCount = (body.admins?.length || 0) + 1; // +1 por el usuario actual
    if (plan.max_admin_users !== -1 && adminCount > plan.max_admin_users) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Plan allows max ${plan.max_admin_users} admin users`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determinar estado segun modo
    const accountStatus =
      body.mode === "self_signup" ? "pending_payment" : "draft";

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
        contact_email: body.contact_email || null,
        contact_phone: body.contact_phone || null,
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
      // Rollback: eliminar cuenta
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
    // Usa los mismos datos del payer como owner inicial
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
      // Rollback
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

    // --- PASO 4: Crear/invitar admins adicionales ---
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
          // Usuario ya existe en Auth — vincular a esta cuenta
          console.log(`Admin ${admin.email} already exists (id: ${existingUser.id}), linking`);

          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("id", existingUser.id)
            .maybeSingle();

          if (existingProfile) {
            await supabaseAdmin
              .from("profiles")
              .update({
                role: "admin",
                client_account_id: clientAccountId,
                onboarding_status: "active",
                is_primary_admin: isPrimary,
                full_name: admin.full_name || null,
              })
              .eq("id", existingUser.id);
          } else {
            await supabaseAdmin
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
          }

          createdAdmins.push({ id: existingUser.id, email: admin.email, status: "existing_user_linked" });
        } else {
          // Usuario nuevo — crear en Auth + profile
          const { data: newUser, error: adminUserError } =
            await supabaseAdmin.auth.admin.createUser({
              email: admin.email,
              email_confirm: false,
              user_metadata: { full_name: admin.full_name || null },
            });

          if (adminUserError) {
            console.error(`Error creating admin user ${admin.email}:`, adminUserError);
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

    // --- PASO 5: Crear/actualizar perfil del usuario actual (UPSERT) ---
    const onboardingStatus =
      body.mode === "self_signup" ? "payment_pending" : "active";

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: user.id,
        role: "admin",
        client_account_id: clientAccountId,
        onboarding_status: onboardingStatus,
        is_primary_admin: true,
        email: user.email || body.contact_email || null,
        full_name: user.user_metadata?.full_name || null,
      }, { onConflict: "id" });

    if (profileUpdateError) {
      console.error("Error upserting user profile:", profileUpdateError);
    }

    // --- PASO 6: Stripe Checkout (si autoregistro) ---
    let checkout_url: string | null = null;

    if (body.mode === "self_signup") {
      const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

      if (stripeSecretKey && !stripeSecretKey.includes("PLACEHOLDER")) {
        // Stripe real — crear Checkout Session via API
        try {
          const stripeResponse = await fetch(
            "https://api.stripe.com/v1/checkout/sessions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${stripeSecretKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                mode: "subscription",
                "line_items[0][price]": "price_placeholder",
                "line_items[0][quantity]": "1",
                success_url: `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "")}?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "")}?stripe=cancel`,
                "metadata[client_account_id]": clientAccountId,
                customer_email: user.email || "",
              }),
            }
          );

          const session = await stripeResponse.json();
          checkout_url = session.url || null;
        } catch (stripeErr) {
          console.error("Stripe checkout error:", stripeErr);
          // No bloqueamos — la cuenta ya esta creada como pending_payment
        }
      } else {
        // Stripe no configurado — modo mock: activar cuenta directamente
        console.log("Stripe mock mode — activando cuenta directamente:", clientAccountId);

        // Activar client_account
        await supabaseAdmin
          .from("client_accounts")
          .update({ status: "active" })
          .eq("id", clientAccountId);

        // Activar perfil del usuario (upsert por si PASO 5 tuvo problemas)
        await supabaseAdmin
          .from("profiles")
          .upsert({
            id: user.id,
            role: "admin",
            client_account_id: clientAccountId,
            onboarding_status: "active",
            is_primary_admin: true,
            email: user.email || body.contact_email || null,
            full_name: user.user_metadata?.full_name || null,
          }, { onConflict: "id" });

        // No devolvemos checkout_url — el front mostrara exito directamente
        checkout_url = null;
      }
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        ok: true,
        client_account_id: clientAccountId,
        checkout_url,
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
    console.error("wizard_submit error:", message);
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
