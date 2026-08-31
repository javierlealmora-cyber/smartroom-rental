# Edge Function DB Client Audit — SmartConversations
<!-- Fase 11B2A · Verificación 2026-07-21 -->

> Auditoría de clientes de base de datos en las Edge Functions conv-*.
> CORRECCIÓN CRÍTICA: El auth matrix previo era incorrecto. Este documento registra el estado REAL verificado.
> No modifica código. No aplica cambios.

---

## CORRECCIÓN CRÍTICA — Auth Matrix Anterior Incorrecta

El documento de auditoría previo afirmaba que las EFs públicas "no usan service_role". Esto era **incorrecto**.

**Hallazgo verificado (Fase 11B2A)**: Todas las EFs con acceso a base de datos usan `SUPABASE_SERVICE_ROLE_KEY`. No existe ninguna EF que use `SUPABASE_ANON_KEY` para conectarse a las tablas conv_*.

| EF | Auth matrix anterior | Estado real verificado |
|---|---|---|
| conv-web-session | "no usa service_role" | ❌ INCORRECTO — usa service_role (línea 53-54, 81-83) |
| conv-web-message | "no usa service_role" | ❌ INCORRECTO — usa service_role (línea 73-74, 150-152) |
| conv-web-poll | "no usa service_role" | ❌ INCORRECTO — usa service_role (línea 89-90, 170-172) |
| conv-wa-webhook | "no usa service_role" | ❌ INCORRECTO — usa service_role (línea 120-121, 137-139) |

**Consecuencia**: El aislamiento multi-tenant depende COMPLETAMENTE del código EF. RLS no protege contra cross-tenant access porque service_role bypasa RLS.

---

## 1. Patrón de cliente DB en EFs públicas

Las EFs públicas (accesibles sin JWT admin) crean su cliente Supabase de la siguiente manera:

```typescript
// Patrón verificado — igual en las 4 EFs públicas
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

No existe ningún helper compartido `createDbClient` en `_shared/`. Cada EF crea su propio cliente inline.

---

## 2. Clasificación de EFs por tipo de cliente

### Tipo A: EF pública con service_role (accesible sin JWT admin)
Estas EFs son accesibles por el widget WebChat o por WhatsApp. Usan service_role. BYPASSRLS aplica. La protección multi-tenant es 100% código.

### Tipo B: EF interna con service_role (solo llamada por EFs internas)
Estas EFs solo reciben llamadas de otras EFs, no del frontend. Usan service_role.

### Tipo C: EF sin acceso DB directo
Estas EFs no crean clientes Supabase. Llaman a otras EFs o servicios externos.

---

## 3. Auditoría por EF

### 3.1 conv-web-session
| Campo | Valor |
|---|---|
| Tipo | Tipo A — EF pública WebChat |
| URL pública | `/functions/v1/conv-web-session` |
| Autenticación | Sin JWT (acceso anónimo del widget) |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` ✅ verificado línea 53-54 |
| createClient | Sí — línea 81-83 |
| Tablas leídas | `conv_wc_configs` (validar tenant), `conv_sessions` (read/create) |
| Operaciones | SELECT, INSERT |
| Filtro tenant | `eq('client_account_id', clientAccountId)` en todas las queries |
| Rate limit | SEC-006 — ausente en esta EF |
| Auth mode check | Lee `auth_mode` de `conv_wc_configs` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | MEDIO — sin rate limit en creación de sesión |

**Queries verificadas**:
```typescript
// Verificar tenant activo
supabase.from('conv_wc_configs')
  .select('is_active, auth_mode, rate_limit_mode')
  .eq('client_account_id', clientAccountId)
  .single();

// Crear sesión
supabase.from('conv_sessions')
  .insert({ client_account_id: clientAccountId, channel: 'webchat', ... });
```

---

### 3.2 conv-web-message
| Campo | Valor |
|---|---|
| Tipo | Tipo A — EF pública WebChat |
| URL pública | `/functions/v1/conv-web-message` |
| Autenticación | Session token del widget (no JWT Supabase) |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` ✅ verificado línea 73-74 |
| createClient | Sí — línea 150-152 |
| Tablas leídas | `conv_wc_configs`, `conv_sessions`, `conv_messages` |
| Tablas escritas | `conv_messages`, `conv_send_queue` |
| Filtro tenant | `eq('client_account_id', clientAccountId)` |
| Rate limit | SEC-002 — mock mode por defecto |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | CRÍTICO — rate limit en mock |

---

### 3.3 conv-web-poll
| Campo | Valor |
|---|---|
| Tipo | Tipo A — EF pública WebChat |
| URL pública | `/functions/v1/conv-web-poll` |
| Autenticación | Session token del widget (no JWT Supabase) |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` ✅ verificado línea 89-90 |
| createClient | Sí — línea 170-172 |
| Tablas leídas | `conv_messages`, `conv_sessions` |
| Filtro tenant | `eq('client_account_id', clientAccountId)` |
| Rate limit | SEC-006 — ausente en polling endpoint |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | MEDIO — sin rate limit en polling |

---

### 3.4 conv-wa-webhook
| Campo | Valor |
|---|---|
| Tipo | Tipo A — EF pública WhatsApp |
| URL pública | `/functions/v1/conv-wa-webhook` |
| Autenticación | HMAC webhook signature (de WaSender) |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` ✅ verificado línea 120-121 |
| createClient | Sí — línea 137-139 |
| Tablas leídas | `conv_service_activations`, `conv_wa_sessions` |
| Tablas escritas | `conv_sessions`, `conv_messages`, `conv_wa_sessions` |
| Filtro tenant | `eq('client_account_id', tenantId)` (derivado del webhook) |
| Firma webhook | SEC-026 — sin validación de timestamp |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | ALTO — sin validación de timestamp en webhook |

---

### 3.5 conv-routing-engine
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` (presunto, patrón estándar) |
| Tablas | `conv_sessions`, `conv_cases`, `conv_messages`, `conv_send_queue` |
| Filtro tenant | Hereda `client_account_id` del evento entrante |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | MEDIO — toda la lógica de routing depende de código |

---

### 3.6 conv-dispatch-message
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_send_queue`, `conv_messages` |
| Filtro tenant | Heredado del mensaje entrante |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO — solo gestiona cola de salida |

---

### 3.7 conv-process-send-queue
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_send_queue`, `conv_messages` |
| Filtro tenant | `client_account_id` en todos los updates |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.8 conv-web-deliver
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_send_queue` (read) |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.9 conv-ingest
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_messages`, `conv_sessions` |
| Filtro tenant | `client_account_id` heredado del evento |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.10 conv-close-case
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_sessions`, `conv_cases` |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.11 conv-escalate-case
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_cases`, `conv_admin_notifications` |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.12 conv-send-wa
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna (llama a WaSender API) |
| Clave DB | Mínimo o ninguno |
| External call | WaSender API |
| Clasificación | `EXTERNO_SIN_DB` |
| Riesgo | MEDIO — SEC-005 (wasender_api_key) |

---

### 3.13 conv-identity-progressive
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_sessions` (update identity) |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.14 conv-core-validate-identity
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_sessions`, tablas de perfiles de tenant |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.15 conv-core-get-tenant-features
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_service_activations` |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.16 conv-core-query-listings
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | Tablas de listings del tenant |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.17 conv-core-query-help-kb
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | Tablas de knowledge base |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.18 conv-core-create-help-ticket
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_cases`, tablas del sistema de tickets |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.19 conv-core-create-incident
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_cases` |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.20 conv-core-create-lead
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | Tablas de leads del tenant |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.21 conv-core-publish-activity
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_messages`, activity_log |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | MEDIO — SEC-024: puede publicar contenido PII en actividad |
| Finding | SEC-024 |

---

### 3.22 conv-wf20-incidents
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna (workflow WF-20) |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | `conv_cases`, `conv_messages` |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.23 conv-wf30-listings
| Campo | Valor |
|---|---|
| Tipo | Tipo B — EF interna (workflow WF-30) |
| Clave DB | `SUPABASE_SERVICE_ROLE_KEY` |
| Tablas | tablas de listings, `conv_sessions` |
| Filtro tenant | `client_account_id` |
| Clasificación | `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` |
| Riesgo | BAJO |

---

### 3.24 conv-web-session (revisita — SEC-006 target)
Registrado en 3.1. Requiere implementar rate limit de creación de sesiones en Fase 11B2B (SEC-006).

---

## 4. Resumen de clasificaciones

| Clasificación | Count | EFs |
|---|---|---|
| `FUNCIONA_CON_SERVICE_ROLE_BYPASSRLS` | 22 | Todas las EFs con DB |
| `EXTERNO_SIN_DB` | 1 | conv-send-wa |
| `FUNCIONA_CON_RLS_ACTUAL` | 0 | Ninguna — service_role bypasa RLS |

**Corrección importante**: La clasificación `FUNCIONA_CON_RLS_ACTUAL` es inaplicable porque service_role tiene BYPASSRLS. Ninguna EF respeta las políticas RLS.

---

## 5. Findings confirmados desde esta auditoría

| Finding | EF principal | Descripción | Severidad |
|---|---|---|---|
| SEC-001 | Todas (conv_*) | No FORCE RLS | LOW (severity_changed) |
| SEC-002 | conv-web-message | Rate limit mock mode | CRITICAL |
| SEC-004 | conv-web-session | Auth mode legacy por defecto | CRITICAL |
| SEC-005 | conv-service-activations | Secrets en columna DB | HIGH |
| SEC-006 | conv-web-session, conv-web-poll | Sin rate limit en session/poll | HIGH |
| SEC-013 | Todas | Tenant isolation solo en código | HIGH |
| SEC-024 | conv-core-publish-activity | PII potencial en activity log | INFO |
| SEC-026 | conv-wa-webhook | Sin validación timestamp webhook | HIGH |

---

## 6. Findings NO creados y motivo

| ID | Estado | Motivo |
|---|---|---|
| SEC-015 | `not_created` | Numeración reservada; never created; no finding asociado |
| SEC-024 | Creado (INFO) | conv-core-publish-activity PII en activity log |
| SEC-028 | `not_created` | SECURITY DEFINER function es SEGURA (SET search_path fijado) |

---

## 7. Checklist de validación EF target (para Fase 11B2B)

Para cada EF de Tipo A, verificar antes de merge:

- [ ] `client_account_id` en TODAS las queries a tablas conv_*
- [ ] Sin logging de `content`, `raw_payload`, `signing_secret`, `sender_phone`
- [ ] Rate limit activado si `WEBCHAT_RATE_LIMIT_MODE=database` en env objetivo
- [ ] Auth mode `signed_token` si `WEBCHAT_AUTH_MODE=signed_token` en env objetivo
- [ ] Webhook signature validada con timestamp (conv-wa-webhook)
- [ ] Sin `service_role` key en ningún log o respuesta HTTP

---

## Estado GATE_1

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**

Auditoría de clientes DB completa. Auth matrix corregida. No se modifica ninguna EF en Fase 11B2A.
