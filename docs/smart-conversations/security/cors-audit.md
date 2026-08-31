# CORS Audit — SmartConversations
<!-- Fase 11B1 · Auditoría 2026-07-21 -->

> Auditoría de configuración CORS. No modifica código ni headers.

---

## Implementación CORS actual

### Origen del corsHeaders

En `supabase/functions/_shared/smart-conversations/response.ts` (inferido del uso consistente en EFs):

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
```

Este objeto se aplica uniformemente en TODAS las EFs con `{ headers: { ...corsHeaders, ... } }`.

---

## Tabla de CORS por Edge Function

| EF | Access-Control-Allow-Origin | Wildcard | Reflection | Allowlist | Credentials | Métodos | Headers | Preflight | Vary: Origin | Sin Origin | Origin no permitido | Config por tenant | Finding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| conv-web-session | `*` | ✅ Sí | No | No global; validación de Origin vs allowed_origins en lógica | No | POST, OPTIONS | authorization, x-client-info, apikey, content-type | Sí (OPTIONS → corsHeaders) | No | Acepta (no hay Origin check) | Acepta | Sí (allowed_origins en DB) | **SEC-017** |
| conv-web-message | `*` | ✅ Sí | No | No | No | POST, OPTIONS | ídem | Sí | No | Acepta | Acepta | No | **SEC-017** |
| conv-web-poll | `*` | ✅ Sí | No | No | No | POST, OPTIONS | ídem | Sí | No | Acepta | Acepta | No | **SEC-017** |
| conv-wa-webhook | `*` | ✅ Sí | No | No (HMAC autentica) | No | POST, OPTIONS | ídem | Sí | No | Acepta | Acepta | No | INFO: webhook no necesita CORS browser |
| conv-ingest | `*` | ✅ Sí | No | N/A (no público) | No | POST, OPTIONS | ídem | Sí | No | N/A (requiere service_role) | N/A | No | INFO: internal, CORS irrelevante |
| Todas las EFs internas | `*` | ✅ Sí | No | N/A | No | POST, OPTIONS | ídem | Sí | No | N/A | N/A | No | INFO: interno, CORS no aplicable |

---

## Análisis detallado: conv-web-session CORS vs Origin validation

**conv-web-session** tiene validación de Origin **a nivel de lógica de aplicación**, no a nivel de CORS:

```typescript
// En el handler de conv-web-session:
const origin = req.headers.get('origin') ?? req.headers.get('Origin') ?? '';
const allowedOrigins = config.allowed_origins ?? [];

if (origin && allowedOrigins.length > 0) {
  if (!allowedOrigins.includes(origin)) {
    return err(ERROR_CODES.FORBIDDEN, 'Origin no permitido', 403);
  }
}
```

**Problemas de este enfoque:**

1. **La respuesta `Access-Control-Allow-Origin: *`** en el CORS preflight (OPTIONS) NO refleja la validación de allowed_origins. El browser nunca sabe que el origin fue rechazado hasta que el POST real recibe 403.

2. **Sin Origin header:** Si el request llega sin `Origin` (server-side, Postman, curl), la validación se salta completamente (`if (origin && ...)`). Esto permite llamadas desde cualquier origen no-browser.

3. **allowedOrigins vacío:** Si `conv_wc_configs.allowed_origins` está vacío o NULL, la validación se salta. Un tenant que no configure `allowed_origins` tiene CORS completamente abierto.

---

## Hallazgos específicos CORS

### SEC-017: Access-Control-Allow-Origin wildcard en endpoints públicos WebChat

**Descripción:** Las 3 EFs públicas WebChat (conv-web-session, conv-web-message, conv-web-poll) devuelven `Access-Control-Allow-Origin: *` en todas las respuestas.

**Impacto:** Cualquier sitio web puede hacer requests a estas EFs con JavaScript del navegador. Sin credenciales, esto no permite acceder a cookies de Supabase, pero sí permite:
- Crear sesiones en nombre de cualquier `client_account_id` conocido
- Enviar mensajes WebChat desde sitios maliciosos
- Hacer polling de mensajes si se conoce session_id + sender_ref

**Distinción importante:**
- `*` con `credentials: false` → No expone cookies/tokens de Supabase del usuario
- Pero sí permite cross-origin requests que crean sesiones y envían mensajes

**Mitigación recomendada:** Implementar `Access-Control-Allow-Origin` dinámico basado en `allowed_origins` de `conv_wc_configs`, reflejando el Origin del request si está en la allowlist.

---

## Reglas CORS verificadas

| Regla | Estado | Evidencia |
|---|---|---|
| No permitir `*` con credenciales | ✅ OK | No se usan cookies ni `withCredentials`; `*` sin credenciales |
| No reflejar cualquier Origin | ✅ OK | No hay reflection dinámica de Origin |
| No confiar en Origin en body | ✅ OK | Origin se lee de header, no del body |
| WebChat real debe usar allowlist | ❌ Pendiente | Lógica existe en conv-web-session pero ACAO sigue siendo `*` |
| Endpoints internos no necesitan CORS público | ⚠️ Informativo | CORS `*` también en EFs internas; sin impacto real (requieren service_role) |
| Wasender webhook no necesita CORS browser | ⚠️ Informativo | CORS `*` en conv-wa-webhook; sin impacto (HMAC protege) |
| Preflight no revela secretos | ✅ OK | OPTIONS solo devuelve corsHeaders estáticos |
| Errores CORS no exponen datos internos | ✅ OK | Errores genéricos con SAFE_ERROR_TEXT |

---

## CORS objetivo (propuesto para 11B3)

```typescript
// Para EFs WebChat públicas:
async function buildDynamicCorsHeaders(req: Request, allowedOrigins: string[]): Promise<HeadersInit> {
  const origin = req.headers.get('origin') ?? '';
  const isAllowed = allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// Para EFs internas (no necesitan CORS):
// Sin Access-Control-Allow-Origin (solo reciben requests server-to-server)
```

---

## Estado de GATE_1

CORS auditado. Finding principal: SEC-017 (wildcard en EFs públicas).

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**
