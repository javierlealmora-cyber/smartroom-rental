# Authentication & Authorization Matrix — SmartConversations
<!-- Fase 11B1 · Auditoría 2026-07-21 -->

> Inventario de todas las Edge Functions conv-*. No modifica código ni contratos.
>
> Clasificaciones:
> - `public_untrusted`: pública sin autenticación ni firma
> - `public_signed`: pública con firma HMAC
> - `public_authenticated`: pública con token de sesión WebChat
> - `provider_webhook`: webhook de proveedor externo con firma
> - `internal_service`: requiere service_role Bearer
> - `admin_only`: requiere JWT con rol admin
> - `scheduled_internal`: invocada por cron / queue processor interno
> - `unknown`: clasificación imposible sin más información

---

## Clasificación y métricas por tipo

| Clasificación | Count | EFs |
|---|---|---|
| `public_untrusted` | 1 | conv-web-session |
| `public_signed` | 2 | conv-web-message (legacy: untrusted / signed_token: signed), conv-web-poll (ídem) |
| `provider_webhook` | 1 | conv-wa-webhook |
| `internal_service` | 17 | conv-ingest, conv-dispatch-message, conv-routing-engine, conv-send-wa, conv-web-deliver, conv-process-send-queue, conv-escalate-case, conv-close-case, conv-core-validate-identity, conv-core-publish-activity, conv-core-get-tenant-features, conv-core-create-incident, conv-core-create-lead, conv-core-query-listings, conv-core-query-help-kb, conv-core-create-help-ticket, conv-identity-progressive |
| `scheduled_internal` | 1 | conv-process-send-queue (también invocable con service_role) |
| `unknown` | 3 | conv-wf20-incidents, conv-wf30-listings, conv-wf40-help (internal; ver nota) |

> Nota: conv-wf20/30/40 se invocan exclusivamente desde conv-dispatch-message con service_role. No tienen endpoint público. Clasificación → `internal_service`. Marcados como `unknown` inicialmente para forzar finding; finding resuelto tras inspección → SEC-014 (INFO).

**Total EFs inventariadas:** 24 / 24

---

## Tabla completa

| EF | Clasificación | Endpoint relativo | Actor permitido | Pública | Requiere JWT | Requiere service_role | Requiere HMAC | Requiere token WebChat | Requiere widget key | Requiere tenant | Tenant obtenido de | Valida session_id | Valida sender_ref | Verifica ownership | DB con anon | DB con service_role | Llama otra EF | Dependencia externa | Datos sensibles | Rate limit | CORS | Riesgo | Finding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| conv-web-session | public_untrusted | POST /conv-web-session | A-01, A-08 | Sí | No | No (entrada); Sí (interno) | No | No | No | Sí | Query param / config DB | No | No | No | No | Sí (interno) | No | No | client_account_id, sender_ref generado | No (SEC-006) | Sí (allowed_origins de DB) | CRITICAL: sin rate limit | SEC-006 |
| conv-web-message | public_signed (legacy: untrusted) | POST /conv-web-message | A-01, A-16 | Sí | No | No (entrada); Sí (interno) | No | Sí (signed_token) o No (legacy) | No | Sí | Body + DB lookup | Sí (DB) | Sí (opaque check) | Sí (DB ownership) | No | Sí (interno) | Sí (conv-ingest) | No | message_text, session_id, sender_ref | Sí (rate limiter; pero mock por defecto — SEC-002) | Sí | HIGH: modo legacy sin token | SEC-004 |
| conv-web-poll | public_signed (legacy: untrusted) | POST /conv-web-poll | A-01, A-16 | Sí | No | No (entrada); Sí (interno) | No | Sí (signed_token) o No (legacy) | No | Sí | Body + DB lookup | Sí (DB) | Sí (opaque check) | Sí (DB ownership) | No | Sí (interno) | No | No | messages outbound | Sí (límite en DB; mock por defecto) | Sí | HIGH: modo legacy sin token | SEC-004 |
| conv-wa-webhook | provider_webhook | POST /conv-wa-webhook | A-09, A-08 | Sí (HTTP) | No | No (entrada) | Sí (HMAC-SHA256) | No | No | Sí | Query param `?client_account_id=` | No | No | HMAC verifica payload | No | Sí (interno) | Sí (conv-ingest) | No | raw_payload WA, sender_ref WA | No (SEC-018) | Sí (silentOk) | HIGH: client_account_id en query param | SEC-018 |
| conv-ingest | internal_service | POST /conv-ingest | A-18 (EFs) | No | No | Sí | No | No | No | Sí | Payload (confiable: llamante es service_role) | Sí | Sí (JID check) | N/A (interno) | No | Sí | Sí (conv-core-validate-identity, conv-dispatch) | No | message_text, sender_ref WA, identity | N/A | Sí | MEDIUM: procesa PII | TH-013 |
| conv-dispatch-message | internal_service | POST /conv-dispatch-message | A-18 | No | No | Sí | No | No | No | Sí | Payload (service_role origen) | Sí (DB) | No directo | Sí (DB) | No | Sí | Sí (conv-routing-engine, WFs, conv-send-wa, conv-web-deliver) | No | message_id, session_id | N/A | Sí | LOW | — |
| conv-routing-engine | internal_service | POST /conv-routing-engine | A-18 | No | No | Sí | No | No | No | Sí | Payload | Sí (DB) | No | Sí (DB) | No | Sí | No | No | identity_level, profile_id | N/A | Sí | LOW | — |
| conv-send-wa | internal_service | POST /conv-send-wa | A-18 | No | No | Sí | No | No | No | Sí | Payload (DB) | Sí (DB) | No (de DB) | Sí (DB) | No | Sí | No | Sí (Wasender — mock) | sender_ref WA (de DB) | N/A | Sí | MEDIUM: llama Wasender real en Fase 9 | SEC-008 |
| conv-web-deliver | internal_service | POST /conv-web-deliver | A-18 | No | No | Sí | No | No | No | Sí | Payload | Sí (DB) | No | Sí (DB) | No | Sí | No | Sí (Realtime — mock) | session_id | N/A | Sí | LOW (Realtime desactivado) | SEC-011 |
| conv-process-send-queue | scheduled_internal | POST /conv-process-send-queue | A-18 / cron | No | No | Sí | No | No | No | N/A (batch) | De DB | Sí (por item) | No | Sí (por item) | No | Sí | Sí (conv-dispatch) | No | queue items | N/A | Sí | LOW | — |
| conv-escalate-case | internal_service | POST /conv-escalate-case | A-18 | No | No | Sí | No | No | No | Sí | Payload (confiable) | No | No | Sí (DB) | No | Sí | Sí (conv-core-publish-activity) | No | case_id, reason (whitelist) | N/A | Sí | LOW | — |
| conv-close-case | internal_service | POST /conv-close-case | A-18 | No | No | Sí | No | No | No | Sí | Payload (confiable) | No | No | Sí (DB) | No | Sí | Sí (conv-core-publish-activity) | No | case_id, session_id | N/A | Sí | LOW | — |
| conv-core-validate-identity | internal_service | POST /conv-core-validate-identity | A-18 | No | No | Sí | No | No | No | Sí | Payload (confiable) | No | No | N/A | No | Sí | No | Sí (Core — mock) | phone, profile_id | N/A | Sí | HIGH: PII al Core | TH-027 |
| conv-core-publish-activity | internal_service | POST /conv-core-publish-activity | A-18 | No | No | Sí | No | No | No | Sí | Payload (confiable) | No | No | N/A | No | Sí | No | Sí (Core — mock) | event_type, IDs opacos | N/A | Sí | MEDIUM: verificar PII guards | TH-028 |
| conv-core-get-tenant-features | internal_service | POST /conv-core-get-tenant-features | A-18 | No | No | Sí | No | No | No | Sí | Payload | No | No | N/A | No | Sí | No | No | client_account_id | N/A | Sí | LOW | SEC-016 |
| conv-core-create-incident | internal_service | POST /conv-core-create-incident | A-18 | No | No | Sí | No | No | No | Sí | Payload | No | No | N/A | No | Sí | No | Sí (Core — mock) | case data | N/A | Sí | MEDIUM | TH-026 |
| conv-core-create-lead | internal_service | POST /conv-core-create-lead | A-18 | No | No | Sí | No | No | No | Sí | Payload | No | No | N/A | No | Sí | No | Sí (Core — mock) | case data | N/A | Sí | MEDIUM | TH-026 |
| conv-core-query-listings | internal_service | POST /conv-core-query-listings | A-18 | No | No | Sí | No | No | No | Sí | Payload | No | No | N/A | No | Sí | No | Sí (Core — mock) | room_id, assignment_id | N/A | Sí | MEDIUM: room_id no al widget | TH-010 |
| conv-core-query-help-kb | internal_service | POST /conv-core-query-help-kb | A-18 | No | No | Sí | No | No | No | Sí | Payload | No | No | N/A | No | Sí | No | Sí (Core — mock) | búsqueda texto | N/A | Sí | LOW | — |
| conv-core-create-help-ticket | internal_service | POST /conv-core-create-help-ticket | A-18 | No | No | Sí | No | No | No | Sí | Payload | No | No | N/A | No | Sí | No | Sí (Core — mock) | ticket data | N/A | Sí | LOW | — |
| conv-identity-progressive | internal_service | POST /conv-identity-progressive | A-18 | No | No | Sí | No | No | No | Sí | Payload (DB) | Sí (DB) | No | Sí (DB) | No | Sí | Sí (conv-core-validate-identity) | No | identity_level, profile_id | N/A | Sí | HIGH: gestiona identity progression | TH-002 |
| conv-wf20-incidents | internal_service | POST /conv-wf20-incidents | A-18 (via dispatch) | No | No | Sí | No | No | No | Sí | Payload | Sí (DB) | No | Sí (DB) | No | Sí | Sí (conv-core-create-incident, conv-close-case, conv-escalate-case) | Sí (n8n — mock) | case data | N/A | Sí | MEDIUM | TH-026 |
| conv-wf30-listings | internal_service | POST /conv-wf30-listings | A-18 (via dispatch) | No | No | Sí | No | No | No | Sí | Payload | Sí (DB) | No | Sí (DB) | No | Sí | Sí (conv-core-query-listings, conv-close-case) | Sí (n8n — mock) | room_id, assignment_id | N/A | Sí | MEDIUM | TH-010 |
| conv-wf40-help | internal_service | POST /conv-wf40-help (inferido) | A-18 (via dispatch) | No | No | Sí | No | No | No | Sí | Payload | Sí (DB) | No | Sí (DB) | No | Sí | Sí (conv-core-query-help-kb, conv-core-create-help-ticket) | No | KB match text | N/A | Sí | LOW | — |

---

## Hallazgos de clasificación `unknown` resueltos

| EF | Clasificación inicial | Clasificación final | Evidencia | Finding generado |
|---|---|---|---|---|
| conv-wf20-incidents | unknown | internal_service | Solo invocada desde conv-dispatch-message con service_role | SEC-014 (INFO) |
| conv-wf30-listings | unknown | internal_service | Solo invocada desde conv-dispatch-message con service_role | SEC-014 (INFO) |
| conv-wf40-help | unknown | internal_service | Solo invocada desde conv-dispatch-message con service_role | SEC-014 (INFO) |

**No quedan EFs con clasificación `unknown` sin finding.**

---

## EFs públicas con análisis extendido de autorización

### conv-web-session — Análisis de flujo de autorización

```
Entrada pública (widget) →
  1. CORS check (Origin en allowed_origins de DB)
  2. detectForbiddenPublicInput() → rechaza campos PII
  3. Verifica client_account_id en conv_wc_configs (DB con service_role)
  4. Verifica is_active=true en conv_wc_configs
  → Sin verificación de identidad del llamante (correcto: WebChat anónimo)
  
RIESGO: Sin rate limiting → TH-016, SEC-006
```

### conv-web-message — Análisis de flujo de autorización

```
Entrada pública (widget) →
  Modo legacy (default):
    1. isOpaqueSenderRef() → verifica formato wc_<32hex>
    2. DB lookup: sesión existe con ese session_id y sender_ref
    3. → Sin token; cualquier poseedor de session_id+sender_ref puede enviar
  
  Modo signed_token:
    1. extractBearerToken() → Authorization header
    2. verifyWebchatSessionToken() → HMAC-SHA256
    3. Verifica claims: client_account_id, session_id, sender_ref
    4. Verifica expiración
    → Token HMAC robusto; no repudiable

RIESGO: Default es legacy (inseguro) → SEC-004
```

---

## Estado de GATE_1

24/24 EFs inventariadas. 0 con clasificación `unknown` sin finding.

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**
