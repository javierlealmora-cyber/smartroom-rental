# RLS Audit — SmartConversations
<!-- Fase 11B1 · Auditoría 2026-07-21 -->

> Auditoría de Row Level Security de todas las tablas conv_*.
> Fuente: supabase/migrations/20260716000001_smart_conversations_core_schema.sql
> No modifica SQL, políticas ni permisos.

---

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Tablas conv_* | 8 |
| Tablas con ENABLE ROW LEVEL SECURITY | 8 (100%) |
| Tablas con FORCE ROW LEVEL SECURITY | 0 (0%) — **SEC-001** |
| Políticas SELECT | 0 (solo ALL) |
| Políticas INSERT | 0 (solo ALL) |
| Políticas UPDATE | 0 (solo ALL) |
| Políticas DELETE | 0 (solo ALL) |
| Políticas ALL (service_role only) | 8 |
| Políticas con auth.uid() | 0 |
| Políticas con JWT claims | 0 |
| Políticas con client_account_id filter | 0 (servie_role bypassa RLS en Supabase) |
| Tablas accesibles por `anon` | 0 |
| Tablas accesibles por `authenticated` | 0 |
| Funciones SECURITY DEFINER | 0 |
| Triggers | 0 |
| Views | 0 |
| RPCs SC | 0 |
| GRANT explícitos | 0 |
| REVOKE explícitos | 0 |

---

## Tabla detallada por tabla conv_*

### conv_service_activations

| Campo | Valor |
|---|---|
| Contiene client_account_id | ✅ Sí |
| Contiene PII | No directamente (config jsonb podría contener PII si operador lo configura) |
| RLS ENABLED | ✅ Sí (línea 47 migración) |
| RLS FORCED | ❌ No — **SEC-001** |
| Política SELECT | `"conv_service_activations: service_role only" FOR ALL TO service_role USING (true)` |
| Política INSERT | — (incluida en FOR ALL) |
| Política UPDATE | — (incluida en FOR ALL) |
| Política DELETE | — (incluida en FOR ALL) |
| Roles afectados | service_role (ALLOW) · anon (DENY implícito) · authenticated (DENY implícito) |
| Usa auth.uid() | No |
| Usa JWT claims | No |
| Filtra client_account_id en política | No (service_role bypassa RLS en Supabase; validación en EF) |
| Permite anon | No |
| Permite authenticated | No |
| Permite service_role | Sí (FOR ALL USING true) |
| FK a Core prohibida | No FK a Core |
| Exposición frontend prevista | No directa |
| Aislamiento multi-tenant | Sí (enforced en EF; no en política RLS porque service_role) |
| Finding | SEC-001 (no FORCE RLS) |
| Severidad | HIGH |
| Remediación | `ALTER TABLE conv_service_activations FORCE ROW LEVEL SECURITY;` |

---

### conv_wa_sessions

| Campo | Valor |
|---|---|
| Contiene client_account_id | ✅ Sí |
| Contiene PII | ✅ webhook_secret (HMAC secret), api_key_secret_name (nombre de Vault), wasender_session_id |
| RLS ENABLED | ✅ Sí (línea 88) |
| RLS FORCED | ❌ No — **SEC-001** |
| Política FOR ALL | `TO service_role USING (true)` |
| Roles afectados | service_role ALLOW; anon/authenticated DENY |
| webhook_secret | Texto claro en DB — **SEC-005** |
| Aislamiento multi-tenant | Enforced en EF; UNIQUE por client_account_id en DB |
| Finding | SEC-001, SEC-005 |
| Severidad | CRITICAL (webhook_secret plaintext) |
| Remediación 1 | `FORCE ROW LEVEL SECURITY` |
| Remediación 2 | Migrar webhook_secret a Supabase Vault |

---

### conv_wc_configs

| Campo | Valor |
|---|---|
| Contiene client_account_id | ✅ Sí |
| Contiene PII | No directo (allowed_origins, widget_title, widget_color — no PII) |
| RLS ENABLED | ✅ Sí (línea 127) |
| RLS FORCED | ❌ No — **SEC-001** |
| Política FOR ALL | `TO service_role USING (true)` |
| TODO en migración | `-- TODO: añadir política de lectura pública limitada con anon para verificar allowed_origins` |
| Implicación del TODO | En Fase 2+, conv-web-session necesitará leer allowed_origins con anon key para validar CORS. La política de lectura pública necesita retornar SOLO allowed_origins, no config completa |
| Finding | SEC-001, SEC-009 |
| Severidad | HIGH (TODO no implementado) |
| Remediación | FORCE RLS + política SELECT anon limitada a `allowed_origins` por `client_account_id` |

---

### conv_sessions

| Campo | Valor |
|---|---|
| Contiene client_account_id | ✅ Sí |
| Contiene PII | ✅ sender_ref (potencialmente teléfono en WA), profile_id, identity_data (jsonb con full_name, email, phone, etc.) |
| RLS ENABLED | ✅ Sí (línea 195) |
| RLS FORCED | ❌ No — **SEC-001** |
| Política FOR ALL | `TO service_role USING (true)` |
| TODO en migración | `-- TODO: política de lectura restringida para anon por session_id verificado` |
| Implicación del TODO | Realtime y polling necesitarán leer estado de sesión con anon key verificado. Debe excluir profile_id e identity_data |
| Aislamiento multi-tenant | UNIQUE(client_account_id, channel, sender_ref) en DB; enforced en EF |
| Finding | SEC-001, SEC-010 |
| Severidad | CRITICAL (PII incluyendo phone, email, full_name en identity_data) |
| Remediación | FORCE RLS + política SELECT con `session_id = current_setting('app.current_session_id')` excluyendo PII |

---

### conv_cases

| Campo | Valor |
|---|---|
| Contiene client_account_id | ✅ Sí |
| Contiene PII | summary y metadata (jsonb) pueden contener resumen con PII si mal construido |
| RLS ENABLED | ✅ Sí (línea 254) |
| RLS FORCED | ❌ No — **SEC-001** |
| Política FOR ALL | `TO service_role USING (true)` |
| Aislamiento multi-tenant | FK a conv_sessions (ON DELETE SET NULL) |
| Finding | SEC-001 |
| Severidad | HIGH |
| Remediación | FORCE RLS; verificar que summary no contiene PII |

---

### conv_messages

| Campo | Valor |
|---|---|
| Contiene client_account_id | ✅ Sí |
| Contiene PII | ✅ text (message_text del usuario), raw_payload (jsonb con payload completo WA), wasender_message_id |
| RLS ENABLED | ✅ Sí (línea 318) |
| RLS FORCED | ❌ No — **SEC-001** |
| Política FOR ALL | `TO service_role USING (true)` |
| TODO en migración | `-- TODO: política de lectura por session_id verificado, excluyendo raw_payload` |
| raw_payload retención | 30 días (comentario en migración). Sin trigger de purga — **SEC-007** |
| wasender_message_id | UNIQUE parcial (WHERE wasender_message_id IS NOT NULL) — deduplica mensajes WA |
| Finding | SEC-001, SEC-007, SEC-010 |
| Severidad | CRITICAL (PII: message_text, raw_payload) |
| Remediación | FORCE RLS + política SELECT excluyendo raw_payload + trigger de purga |

---

### conv_send_queue

| Campo | Valor |
|---|---|
| Contiene client_account_id | ✅ Sí |
| Contiene PII | payload (jsonb) — payload de envío; puede contener referencias a mensajes |
| RLS ENABLED | ✅ Sí (línea 371) |
| RLS FORCED | ❌ No — **SEC-001** |
| Política FOR ALL | `TO service_role USING (true)` |
| Aislamiento multi-tenant | FK a conv_sessions, conv_messages |
| Finding | SEC-001 |
| Severidad | HIGH |
| Remediación | FORCE RLS; política interna solo service_role (no se expone al widget) |

---

### conv_admin_notifications

| Campo | Valor |
|---|---|
| Contiene client_account_id | ✅ Sí |
| Contiene PII | context (jsonb) puede contener IDs de sesión/caso |
| RLS ENABLED | ✅ Sí (línea 423) |
| RLS FORCED | ❌ No — **SEC-001** |
| Política FOR ALL | `TO service_role USING (true)` |
| TODO en migración | `-- TODO: política de lectura para rol 'admin' filtrada por client_account_id` |
| Finding | SEC-001, SEC-009 (TODO no implementado) |
| Severidad | HIGH |
| Remediación | FORCE RLS + política SELECT para rol `manager` filtrada por `client_account_id` |

---

## Funciones SECURITY DEFINER

| Resultado | Evidencia |
|---|---|
| 0 funciones SECURITY DEFINER encontradas | Migración revisada completamente; no hay CREATE FUNCTION con SECURITY DEFINER |

> En futures migraciones que requieran SECURITY DEFINER, se debe verificar search_path seguro (`SET search_path = ''`).

---

## Triggers

| Resultado | Evidencia |
|---|---|
| 0 triggers encontrados | No hay CREATE TRIGGER en la migración |

---

## Views

| Resultado | Evidencia |
|---|---|
| 0 views encontradas | No hay CREATE VIEW en la migración |

---

## Análisis de riesgo de service_role sin validación de tenant en EF

El diseño actual es:
1. Todas las tablas: acceso solo con service_role
2. Las EFs internas reciben service_role y hacen queries sin filtro RLS de tenant
3. El filtro de tenant (`client_account_id`) es responsabilidad de la lógica de la EF

**Riesgo:** Si una EF tiene un bug que permita inyectar un `client_account_id` arbitrario, toda la separación multi-tenant depende de ese bug no existir. No hay segunda línea de defensa a nivel de DB.

**Mitigación recomendada (11B2):** En futures políticas de acceso interno, derivar `client_account_id` de `auth.jwt() -> app.current_account` en lugar de (o además de) el payload de la EF.

---

## Resumen de findings RLS

| Finding | Tablas afectadas | Severidad |
|---|---|---|
| SEC-001: No FORCE ROW LEVEL SECURITY | 8/8 tablas | HIGH |
| SEC-005: webhook_secret plaintext | conv_wa_sessions | CRITICAL (CRITICAL via TH-012) |
| SEC-007: raw_payload sin purga automática | conv_messages | HIGH |
| SEC-009: Políticas TODO no implementadas | conv_wc_configs, conv_sessions, conv_messages, conv_admin_notifications | HIGH |
| SEC-010: Política anon con exclusión de PII no implementada | conv_sessions, conv_messages | HIGH |

---

## Estado de GATE_1

8/8 tablas inventariadas. 0 tablas sin estado RLS conocido. 5 findings de RLS documentados.

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**
