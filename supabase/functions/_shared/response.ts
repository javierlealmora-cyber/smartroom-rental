/**
 * Helpers de respuesta estándar para Edge Functions
 * Formato: { ok: boolean, data?: any, error?: { code, message, detail? } }
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function err(
  code: string,
  message: string,
  status = 400,
  detail?: unknown
): Response {
  return new Response(
    JSON.stringify({ ok: false, error: { code, message, ...(detail !== undefined && { detail }) } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export function optionsResponse(): Response {
  return new Response("ok", { headers: corsHeaders });
}

// Códigos de error estándar del proyecto
export const ERROR_CODES = {
  UNAUTHORIZED:           "UNAUTHORIZED",
  FORBIDDEN:              "FORBIDDEN",
  NOT_FOUND:              "NOT_FOUND",
  CONFLICT:               "CONFLICT",
  VALIDATION:             "VALIDATION_ERROR",
  PLAN_LIMIT_EXCEEDED:    "PLAN_LIMIT_EXCEEDED",
  INTERNAL:               "INTERNAL_ERROR",
  INVALID_ACTION:         "INVALID_ACTION",
  ACCOUNT_INACTIVE:       "ACCOUNT_INACTIVE",
} as const;
