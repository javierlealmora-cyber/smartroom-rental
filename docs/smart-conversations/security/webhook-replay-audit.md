# Webhook & Replay Audit — SmartConversations
<!-- Fase 11B1 · Auditoría 2026-07-21 -->

> Auditoría de webhooks, firmas HMAC, protección contra replay y deduplicación.
> No modifica implementaciones.

---

## Webhooks existentes

| Webhook | EF receptora | Proveedor | Firma | Implementada |
|---|---|---|---|---|
| Wasender → SmartConversations | conv-wa-webhook | Wasender | HMAC-SHA256 (`X-Wasender-Signature`) | ✅ Sí |
| SmartConversations → n8n | (outbound) | n8n | Secret header (configuración) | Pendiente (mock) |
| SmartConversations → Core | (outbound) | Core | Por definir | Pendiente (mock) |
| SmartConversations → Wasender | (outbound) | Wasender | API key en header | Pendiente (Vault) |

---

## Auditoría: conv-wa-webhook (webhook entrante de Wasender)

### 1. Firma HMAC

| Verificación | Estado | Implementación | Finding |
|---|---|---|---|
| Algoritmo | ✅ HMAC-SHA256 | `crypto.subtle.verify('HMAC', key, ...)` | — |
| Header de firma | ✅ `X-Wasender-Signature` | `req.headers.get('X-Wasender-Signature')` | — |
| Prefijo `sha256=` | ✅ Normalizado | `sigHex.startsWith('sha256=') ? sigHex.slice(7) : sigHex` | — |
| Importación de clave | ✅ `importKey('raw', ...)` | `{name: 'HMAC', hash: 'SHA-256'}` | — |
| Body raw vs parsed | ✅ Body raw | `const body = await req.text()` antes de parsear | — |

### 2. Comparación constant-time

| Verificación | Estado | Implementación | Finding |
|---|---|---|---|
| Uso de crypto.subtle.verify | ✅ Sí | `await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body))` | — |
| Constant-time en Web Crypto | ✅ Garantizado por Web Crypto API spec | `crypto.subtle.verify` es inherentemente constant-time | — |
| Comparación de service_role key (ef-auth.ts) | ❌ `===` string comparison | `token === serviceRoleKey` | SEC-012 (MEDIUM) |

### 3. Timestamp / Ventana de tolerancia

| Verificación | Estado | Finding |
|---|---|---|
| Validación de timestamp en header | ❌ No implementada | SEC-026 |
| Ventana de replay (e.g., 5 minutos) | ❌ No implementada | SEC-026 |
| Nonce por request | ❌ No implementado | SEC-026 |

### 4. Deduplicación

| Verificación | Estado | Implementación | Finding |
|---|---|---|---|
| Deduplica por wasender_message_id | ✅ Sí | UNIQUE parcial en conv_messages `WHERE wasender_message_id IS NOT NULL` | — |
| Replay → no crea mensaje duplicado | ✅ Sí (DB UNIQUE constraint) | INSERT con `onConflict: 'ignore'` o similar | — |
| Orden de validación | ✅ Correcto | Firma verificada → tenant verificado → DB write | — |

### 5. Manejo de errores

| Verificación | Estado | Implementación | Finding |
|---|---|---|---|
| Firma inválida → 200 OK (silentOk) | ✅ Sí | `return silentOk('Firma inválida')` | — |
| No revela si firma fue válida o no | ✅ Sí | `silentOk()` en todos los casos de error | — |
| No revela detalles de webhook_secret | ✅ Sí | Logger redacta webhook_secret | — |
| No revela tenant existence | ✅ Sí | silentOk si tenant no encontrado también | — |

### 6. Rate limiting en webhook

| Verificación | Estado | Finding |
|---|---|---|
| Rate limit por IP en conv-wa-webhook | ❌ No implementado | TH-018 (MEDIUM) |
| Rate limit por client_account_id | ❌ No implementado | TH-018 |

### 7. Secret rotation

| Verificación | Estado | Finding |
|---|---|---|
| Mecanismo de rotación de webhook_secret | ❌ No implementado (manual) | SEC-005 |
| webhook_secret en Vault | ❌ Pendiente (Fase 9) | SEC-005 |
| Invalidación de webhooks tras rotación | ❌ No documentado | SEC-005 |

---

## Auditoría: replay de mensajes WebChat

| Verificación | Estado | Finding |
|---|---|---|
| Deduplicación de mensajes WebChat | ❌ No implementada | SEC-027 |
| Nonce o idempotency key en conv-web-message | ❌ No implementada | SEC-027 |
| Replay de mismo payload → múltiples mensajes | ⚠️ Posible | TH-023 |
| Retry de widget (reconexión) puede duplicar mensajes | ⚠️ Posible si timing adverso | TH-023 |
| Deduplicación a nivel de dispatch (UPDATE WHERE status=received) | ✅ Parcial | Previene procesamiento doble, no creación doble |

---

## Auditoría: salida de webhooks (outbound)

### SmartConversations → n8n (stub)

| Verificación | Estado | Finding |
|---|---|---|
| Header de autenticación a n8n | ✅ Secret header configurado | Pendiente verificación real |
| Payload PII guards | ✅ PII_FIELDS_FORBIDDEN_IN_N8N activos | Guards en código |
| Retry en error de n8n | ❌ No documentado | Pendiente |
| Replay de evento a n8n si retry | ❌ Riesgo teórico | TH-026 |

### SmartConversations → Wasender (outbound)

| Verificación | Estado | Finding |
|---|---|---|
| Autenticación Wasender | Pendiente Vault | SEC-005 |
| Idempotencia de send (evitar doble send) | ✅ Parcial | conv_send_queue status machine + dispatch idempotente |
| Retry de envío en error | ✅ Documentado | conv_send_queue.attempts + max_retries |

---

## Resumen de hallazgos de webhook/replay

| Finding | Descripción | Severidad |
|---|---|---|
| SEC-012 | service_role key comparison non-constant-time (`===`) | MEDIUM |
| SEC-026 | Sin validación de timestamp en webhook Wasender (ventana de replay indefinida) | HIGH |
| SEC-027 | Sin deduplicación de mensajes WebChat (replay posible) | MEDIUM |
| SEC-005 | webhook_secret en plaintext; sin mecanismo de rotación | CRITICAL |
| TH-018 | Sin rate limiting en conv-wa-webhook | MEDIUM |
| TH-023 | Replay de mensajes WebChat crea mensajes duplicados | MEDIUM |

---

## Estado de GATE_1

Webhook auditado. Firma HMAC correcta. Timestamp y deduplicación WebChat pendientes.

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**
