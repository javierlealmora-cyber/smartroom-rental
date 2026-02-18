// Supabase Edge Function: stripe_webhook
// Recibe webhooks de Stripe y actualiza el estado de las cuentas:
// - checkout.session.completed → active
// - invoice.payment_failed → suspended
// - customer.subscription.deleted → canceled

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
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

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const rawBody = await req.text();

    // Validar firma de Stripe (si tenemos secreto real)
    if (
      webhookSecret &&
      !webhookSecret.includes("PLACEHOLDER") &&
      !signature
    ) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing stripe-signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parsear el evento
    // NOTA: En produccion, se debe verificar la firma criptografica con Stripe SDK.
    // Con placeholders, parseamos directamente.
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const eventId = event.id as string;
    const eventType = event.type as string;
    const eventData = event.data as Record<string, unknown>;
    const eventObject = eventData?.object as Record<string, unknown>;

    console.log(`Stripe webhook received: ${eventType} (${eventId})`);

    // --- Idempotency check ---
    if (eventId) {
      const { data: existing } = await supabaseAdmin
        .from("stripe_events")
        .select("id")
        .eq("stripe_event_id", eventId)
        .eq("processed", true)
        .maybeSingle();

      if (existing) {
        console.log(`Event ${eventId} already processed, skipping`);
        return new Response(
          JSON.stringify({ ok: true, message: "Already processed" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // --- checkout.session.completed ---
    if (eventType === "checkout.session.completed") {
      const metadata = eventObject?.metadata as Record<string, string>;
      const clientAccountId = metadata?.client_account_id;

      if (!clientAccountId) {
        console.error("checkout.session.completed: missing client_account_id");
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Actualizar client_account → active
      const { error: accountUpdateError } = await supabaseAdmin
        .from("client_accounts")
        .update({
          status: "active",
          stripe_customer_id: (eventObject.customer as string) || null,
          stripe_subscription_id:
            (eventObject.subscription as string) || null,
        })
        .eq("id", clientAccountId);

      if (accountUpdateError) {
        console.error(
          "Error activating account:",
          accountUpdateError
        );
      }

      // Actualizar profiles con esta cuenta → onboarding_status = 'active'
      const { error: profilesUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ onboarding_status: "active" })
        .eq("client_account_id", clientAccountId)
        .eq("onboarding_status", "payment_pending");

      if (profilesUpdateError) {
        console.error(
          "Error updating profiles onboarding:",
          profilesUpdateError
        );
      }

      console.log(`Account ${clientAccountId} activated successfully`);
    }

    // --- invoice.payment_failed ---
    if (eventType === "invoice.payment_failed") {
      const customerId = eventObject?.customer as string;

      if (customerId) {
        const { error } = await supabaseAdmin
          .from("client_accounts")
          .update({ status: "suspended" })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("Error suspending account:", error);
        }
        console.log(
          `Account with customer ${customerId} suspended`
        );
      }
    }

    // --- customer.subscription.deleted ---
    if (eventType === "customer.subscription.deleted") {
      const subscriptionId = eventObject?.id as string;

      if (subscriptionId) {
        const { error } = await supabaseAdmin
          .from("client_accounts")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          console.error("Error canceling account:", error);
        }
        console.log(
          `Account with subscription ${subscriptionId} canceled`
        );
      }
    }

    // --- invoice.paid (renewal confirmation) ---
    if (eventType === "invoice.paid") {
      const customerId = eventObject?.customer as string;
      if (customerId) {
        console.log(`Invoice paid for customer ${customerId}`);
        // Ensure account stays active after successful renewal
        await supabaseAdmin
          .from("client_accounts")
          .update({ status: "active" })
          .eq("stripe_customer_id", customerId)
          .in("status", ["suspended", "payment_pending"]);
      }
    }

    // --- customer.subscription.updated (plan changes) ---
    if (eventType === "customer.subscription.updated") {
      const subscriptionId = eventObject?.id as string;
      const status = eventObject?.status as string;
      if (subscriptionId) {
        console.log(
          `Subscription ${subscriptionId} updated, status: ${status}`
        );
      }
    }

    // --- Record processed event for idempotency ---
    if (eventId) {
      await supabaseAdmin.from("stripe_events").upsert(
        {
          stripe_event_id: eventId,
          type: eventType,
          payload: event,
          processed: true,
        },
        { onConflict: "stripe_event_id" }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, received: eventType }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("stripe_webhook error:", message);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
