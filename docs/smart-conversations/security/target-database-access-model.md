# Target Database Access Model — SmartConversations
<!-- Fase 11B2A · Verificación 2026-07-21 -->

> Modelo objetivo de acceso a la base de datos para las 8 tablas conv_*.
> No modifica SQL. No aplica cambios. Define el target state para Fase 11B2B.

---

## 1. Resumen ejecutivo

| Tabla | Acceso actual | Acceso objetivo | Riesgo actual | Riesgo objetivo |
|---|---|---|---|---|
| conv_service_activations | service_role only | service_role only | BAJO (solo EFs internas) | BAJO |
| conv_wa_sessions | service_role only | service_role only | BAJO (solo EFs internas) | BAJO |
| conv_wc_configs | service_role only | service_role only | MEDIO (leída por EFs públicas) | BAJO |
| conv_sessions | service_role only | service_role only | MEDIO (creada/leída por EFs públicas) | BAJO |
| conv_cases | service_role only | service_role only | BAJO (gestión interna) | BAJO |
| conv_messages | service_role only | service_role only | MEDIO (recibe mensajes de usuarios) | BAJO |
| conv_send_queue | service_role only | service_role only | BAJO (gestión interna) | BAJO |
| conv_admin_notifications | service_role only | service_role only | BAJO (solo lectura admin) | BAJO |

**Nota clave**: Todas las EFs conv-* usan `service_role` con BYPASSRLS. El aislamiento multi-tenant depende enteramente del código EF (filtros `client_account_id`), no de las políticas RLS.

---

## 2. conv_service_activations

| Propiedad | Valor |
|---|---|
| Propósito | Registro de activaciones del servicio SC por tenant |
| Tipo de acceso | internal_only |
| EFs que acceden | conv-core-get-tenant-features (read) |
| Acceso frontend directo | ❌ No |
| Filtro tenant | `client_account_id` |
| Columnas sensibles | `config` (JSON), `metadata` |
| Columnas nunca expuestas | `config.webhook_secret`, `config.signing_secret` |

### Policy actual
```sql
CREATE POLICY "conv_service_activations: service_role only"
  ON conv_service_activations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Policy objetivo (sin cambio de estructura)
Misma policy. No es necesario dar acceso a `authenticated` o `anon`. El acceso vía dashboard admin pasa por una EF interna que filtra por tenant.

### Columnas sensibles en config (objetivo: SEC-005)
- `webhook_secret`: mover a Supabase Vault en Fase 11B2B
- `signing_secret`: mover a Supabase Vault en Fase 11B2B

---

## 3. conv_wa_sessions

| Propiedad | Valor |
|---|---|
| Propósito | Sesiones de WhatsApp activas |
| Tipo de acceso | internal_only |
| EFs que acceden | conv-wa-webhook (read/write), conv-routing-engine (read) |
| Acceso frontend directo | ❌ No |
| Filtro tenant | `client_account_id` |
| Columnas sensibles | `sender_phone` |
| Columnas nunca expuestas al frontend | `sender_phone` (PII) |

### Policy actual
```sql
CREATE POLICY "conv_wa_sessions: service_role only"
  ON conv_wa_sessions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Policy objetivo
Sin cambio. EF conv-wa-webhook es el único punto de entrada; el número de teléfono nunca cruza al WebChat frontend.

### Validación EF necesaria (target)
- `conv-wa-webhook`: verificar que `client_account_id` corresponda al tenant del webhook antes de crear o actualizar sesión.

---

## 4. conv_wc_configs

| Propiedad | Valor |
|---|---|
| Propósito | Configuración del widget WebChat por tenant |
| Tipo de acceso | internal_ef_read |
| EFs que acceden | conv-web-session (read), conv-web-message (read), conv-web-poll (read) |
| Acceso frontend directo | ❌ No (widget lee vía EF, no directamente) |
| Filtro tenant | `client_account_id` |
| Columnas sensibles | `auth_mode`, `rate_limit_mode`, `signing_secret` |
| Columnas nunca expuestas | `signing_secret`, `rate_limit_mode` |

### Policy actual
```sql
CREATE POLICY "conv_wc_configs: service_role only"
  ON conv_wc_configs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Policy objetivo
Sin cambio. `conv-web-session` y otras EFs WebChat leen esta tabla para validar el tenant. No exponer campos sensibles en respuesta.

### Validación EF necesaria (target)
- `conv-web-session`: leer solo `is_active`, `auth_mode`, `rate_limit_mode`. Nunca retornar `signing_secret` al frontend.
- Guardar en SEC-005: `signing_secret` debe migrarse a Vault.

---

## 5. conv_sessions

| Propiedad | Valor |
|---|---|
| Propósito | Sesiones de conversación activas (WebChat + WhatsApp) |
| Tipo de acceso | ef_managed |
| EFs que acceden | conv-web-session (create/read), conv-web-message (read/write), conv-web-poll (read), conv-wa-webhook (read/write), conv-routing-engine (read), conv-close-case (write) |
| Acceso frontend directo | ❌ No (widget usa session token opaco) |
| Filtro tenant | `client_account_id` |
| Columnas sensibles | `sender_ref`, `metadata` |
| Columnas nunca expuestas | `metadata.identity_token`, `metadata.verification_token` |

### Policy actual
```sql
CREATE POLICY "conv_sessions: service_role only"
  ON conv_sessions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Policy objetivo (target con aislamiento)
```sql
-- NO EJECUTAR — Solo diseño conceptual Fase 11B2A
-- En Fase 11B2B se aplicará con migraciones verificadas

-- Mantener service_role only (toda la lógica es via EF)
-- Considerar añadir columna status_index para evitar full table scan
-- en poll con alta concurrencia
```

### Validación EF necesaria (target)
- Toda EF que acceda `conv_sessions` debe incluir `eq('client_account_id', clientAccountId)`.
- `conv-web-poll`: implementar SEC-006 (rate limit por session).

---

## 6. conv_cases

| Propiedad | Valor |
|---|---|
| Propósito | Casos de soporte abiertos y cerrados |
| Tipo de acceso | internal_only |
| EFs que acceden | conv-routing-engine (create/read), conv-close-case (write), conv-escalate-case (write), conv-core-create-help-ticket (write) |
| Acceso frontend directo | ❌ No |
| Filtro tenant | `client_account_id` |
| Columnas sensibles | `user_data` (PII), `resolution_notes` |
| Columnas nunca expuestas al frontend | `user_data` (solo dashboard admin interno) |

### Policy actual
```sql
CREATE POLICY "conv_cases: service_role only"
  ON conv_cases
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Policy objetivo
Sin cambio. El acceso al dashboard admin para ver casos se hace vía EF interna autenticada con JWT del admin, no acceso directo a tabla.

### Columnas PII (target SEC-007)
- `user_data`: campo JSON con datos del usuario. Registrar en PII log (SEC-023).
- Definir retención: purgar casos cerrados > 90 días (SEC-007 raw_payload policy).

---

## 7. conv_messages

| Propiedad | Valor |
|---|---|
| Propósito | Mensajes de conversación (entrantes y salientes) |
| Tipo de acceso | ef_managed |
| EFs que acceden | conv-web-message (create/read), conv-wa-webhook (create), conv-routing-engine (read), conv-core-publish-activity (read) |
| Acceso frontend directo | ❌ No |
| Filtro tenant | `client_account_id` |
| Columnas sensibles | `content` (PII — mensaje del usuario), `sender_ref`, `raw_payload` |
| Columnas nunca expuestas | `raw_payload` (JSON crudo de WhatsApp API, contiene metadatos de mensajes) |

### Policy actual
```sql
CREATE POLICY "conv_messages: service_role only"
  ON conv_messages
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Policy objetivo
Sin cambio de tipo de acceso. Añadir índice por `client_account_id + created_at` para rate limit queries (SEC-002 database mode).

### Validación rate limit (target — SEC-002 database mode)
```sql
-- NO EJECUTAR — Solo diseño conceptual Fase 11B2A
-- Cómputo del rate limit por sender en ventana de 60s:
SELECT COUNT(*) FROM conv_messages
WHERE client_account_id = $1
  AND sender_ref = $2
  AND channel = 'webchat'
  AND created_at > NOW() - INTERVAL '60 seconds';
```

### Columnas PII (target SEC-007)
- `content`: mensaje del usuario. Nunca logear completo en actividad pública.
- `raw_payload`: contiene el JSON crudo del mensaje. Purgar en 90 días (SEC-007).

---

## 8. conv_send_queue

| Propiedad | Valor |
|---|---|
| Propósito | Cola de envío de mensajes salientes |
| Tipo de acceso | internal_only |
| EFs que acceden | conv-routing-engine (create), conv-process-send-queue (read/write), conv-web-deliver (read) |
| Acceso frontend directo | ❌ No |
| Filtro tenant | `client_account_id` |
| Columnas sensibles | `payload` (contiene mensaje saliente) |
| Columnas nunca expuestas | `payload` (datos de envío) |

### Policy actual
```sql
CREATE POLICY "conv_send_queue: service_role only"
  ON conv_send_queue
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Policy objetivo
Sin cambio. Añadir limpieza de registros procesados > 24 horas (eficiencia, no seguridad).

---

## 9. conv_admin_notifications

| Propiedad | Valor |
|---|---|
| Propósito | Notificaciones para administradores de tenant |
| Tipo de acceso | internal_read_admin |
| EFs que acceden | conv-escalate-case (create), conv-routing-engine (create) |
| Acceso frontend directo | ❌ No (dashboard admin lee vía EF) |
| Filtro tenant | `client_account_id` |
| Columnas sensibles | `message` (puede contener resumen de conversación) |
| Columnas nunca expuestas | N/A (notificaciones internas) |

### Policy actual
```sql
CREATE POLICY "conv_admin_notifications: service_role only"
  ON conv_admin_notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Policy objetivo
Sin cambio. El dashboard admin accede vía EF interna con JWT auth, no acceso directo.

---

## 10. Matriz de columnas PII por tabla

| Tabla | Columnas PII | Nivel | Retención objetivo | Finding |
|---|---|---|---|---|
| conv_wa_sessions | `sender_phone` | ALTA | Purgar sesiones cerradas > 30d | SEC-007 |
| conv_sessions | `sender_ref`, `metadata.identity_token` | ALTA | Purgar sesiones cerradas > 30d | SEC-007 |
| conv_cases | `user_data` | ALTA | Purgar casos cerrados > 90d | SEC-007 |
| conv_messages | `content`, `raw_payload` | MEDIA-ALTA | Purgar mensajes > 90d | SEC-007 |
| conv_admin_notifications | `message` (resumen) | BAJA | Purgar > 30d | — |

---

## 11. Findings relacionados

| Finding | Tabla afectada | Tipo | Estado |
|---|---|---|---|
| SEC-001 | Todas conv_* | FORCE RLS ausente | severity_changed → LOW |
| SEC-002 | conv_messages | Rate limit mock mode | CRITICAL — open |
| SEC-004 | conv_wc_configs | Auth mode legacy | CRITICAL — open |
| SEC-005 | conv_service_activations, conv_wc_configs | Secrets en DB | HIGH — open |
| SEC-007 | conv_messages, conv_cases, conv_sessions | raw_payload sin purge | HIGH — open |
| SEC-009 | Todas conv_* | RLS policies comentadas en historia | HIGH — open |
| SEC-013 | Todas conv_* | Tenant isolation UUID-dependent | HIGH — open |

---

## Estado GATE_1

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**

Modelo de acceso objetivo documentado. No se aplica ningún cambio de SQL. Todas las políticas permanecen `service_role only` (CURRENT STATE). Fase 11B2B aplicará los cambios de SEC-002 (rate limit), SEC-004 (auth mode guards) y SEC-005 (Vault migration).
