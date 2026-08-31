# Gate 1 Remediation Plan — SmartConversations
<!-- Fase 11B1 · Plan 2026-07-21 -->

> Plan de remediación separado en fases 11B2, 11B3 y 11B4.
> No implementa cambios en esta fase. Solo define el plan.
>
> GATE_1 solo puede cerrarse después de completar 11B2, 11B3 y 11B4.

---

## Prioridades

| Prioridad | Descripción |
|---|---|
| P0 | Bloquea sandbox; debe resolverse antes de cualquier despliegue |
| P1 | Bloquea preproducción; crítico para seguridad |
| P2 | Bloquea producción; importante pero no urgente para sandbox |
| P3 | Mejora significativa; no bloquea ningún gate inmediato |

---

## Fase 11B2 — Remediación de base de datos, RLS y autenticación

### Objetivo

Resolver todos los P0 y P1 relacionados con base de datos, RLS, autenticación y secretos.

### Tareas ordenadas por prioridad

#### P0: SEC-002 — Activar rate limiting WebChat

| Campo | Valor |
|---|---|
| finding | SEC-002 |
| acción | Cambiar default de `WEBCHAT_RATE_LIMIT_MODE` de 'mock' a 'database' en documentación de deployment; o añadir validación en EF que rechace modo mock en producción |
| archivos afectados | `_shared/smart-conversations/webchat-rate-limiter.ts` (agregar validación de env) |
| restricción | No modificar contratos de EF; solo configuración/validación de arranque |
| evidencia de cierre | Rate limiter activo en staging; test de flood rechazado con 429 |
| gate | Bloquea sandbox |

#### P0: SEC-006 — Rate limiting en conv-web-session

| Campo | Valor |
|---|---|
| finding | SEC-006 |
| acción | Implementar rate limiting por IP o por client_account_id en conv-web-session usando almacenamiento efímero o tabla conv_rate_limits |
| restricción | No crear tablas nuevas sin aprobación; alternativa: usar Redis/Upstash o límite por Supabase rate limiting |
| gate | Bloquea sandbox |

#### P1: SEC-004 — Activar signed_token mode

| Campo | Valor |
|---|---|
| finding | SEC-004 |
| acción | Cambiar default de WEBCHAT_AUTH_MODE a 'signed_token'; asegurar que widget envía token en Authorization header |
| archivos afectados | `_shared/smart-conversations/webchat-session-token.ts`, `conv-web-message`, `conv-web-poll`, frontend WebChat |
| restricción | No modificar contratos; el cambio es de variable de entorno + validación de arranque |
| evidencia de cierre | conv-web-message rechaza request sin token válido; test de modo legacy desactivado |
| gate | Bloquea preproducción |

#### P1: SEC-001 — FORCE ROW LEVEL SECURITY

| Campo | Valor |
|---|---|
| finding | SEC-001 |
| acción | Nueva migración: `ALTER TABLE conv_* FORCE ROW LEVEL SECURITY;` para las 8 tablas |
| restricción | **No modificar políticas existentes**; solo añadir FORCE RLS |
| sql propuesto | `ALTER TABLE conv_service_activations FORCE ROW LEVEL SECURITY; ALTER TABLE conv_wa_sessions FORCE ROW LEVEL SECURITY; ...` (8 statements) |
| evidencia de cierre | Test de bypass RLS con postgres role falla |
| gate | Bloquea preproducción |

#### P1: SEC-005 — Migrar webhook_secret a Supabase Vault

| Campo | Valor |
|---|---|
| finding | SEC-005 |
| acción | 1. Crear migration que añade columna `webhook_secret_vault_key` y depreca `webhook_secret`. 2. EF conv-wa-webhook leerá de Vault por nombre. 3. Migrar secrets de tenants existentes |
| restricción | Requiere Supabase Vault habilitado en el proyecto |
| evidencia de cierre | conv_wa_sessions.webhook_secret vacío o NULL; Vault tiene los secrets |
| gate | Bloquea preproducción |

#### P1: SEC-008 — Remover continue-on-error de Snyk

| Campo | Valor |
|---|---|
| finding | SEC-008 |
| acción | Remover `continue-on-error: true` del job security en pr-checks.yml |
| archivos afectados | `.github/workflows/pr-checks.yml` |
| restricción | Puede bloquear PRs si hay vulnerabilidades conocidas; definir threshold de severidad aceptable |
| gate | Bloquea preproducción |

#### P1: SEC-009 — Implementar políticas RLS TODO

| Campo | Valor |
|---|---|
| finding | SEC-009 |
| acción | Crear políticas RLS para conv_wc_configs (SELECT anon limitado), conv_sessions (SELECT anon por session_id), conv_messages (SELECT excluyendo raw_payload), conv_admin_notifications (SELECT para admin) |
| restricción | **Coordinar con Fase de activación de Realtime y dashboard admin**; no activar hasta que los componentes que las necesitan estén listos |
| gate | Bloquea preproducción |

#### P1: SEC-007 — raw_payload purge automático

| Campo | Valor |
|---|---|
| finding | SEC-007 |
| acción | Implementar pg_cron job o EF periódica: `UPDATE conv_messages SET raw_payload = NULL WHERE created_at < NOW() - INTERVAL '30 days'` |
| restricción | No modificar schema de conv_messages; solo UPDATE de datos |
| gate | Bloquea preproducción |

#### P1: SEC-013 — Documentar y reforzar aislamiento tenant

| Campo | Valor |
|---|---|
| finding | SEC-013 |
| acción | Cuando SEC-004 (signed_token) se active, el aislamiento multi-tenant queda criptográficamente garantizado. Documentar como cerrado cuando signed_token sea el default |
| gate | Bloquea preproducción |

---

## Fase 11B3 — CORS, CSP, secretos, logging y privacidad

### Objetivo

Resolver P2 relacionados con frontend, CORS, logging y webhook hardening.

### Tareas

#### P2: SEC-003 — Implementar CSP

| Campo | Valor |
|---|---|
| finding | SEC-003 |
| acción | Crear `vercel.json` con headers de seguridad incluyendo CSP objetivo documentada en csp-frontend-audit.md |
| restricción | Verificar que AntD no requiere unsafe-eval; probar en staging antes de producción |
| gate | Bloquea producción |

#### P2: SEC-017 — CORS dinámico basado en allowed_origins

| Campo | Valor |
|---|---|
| finding | SEC-017 |
| acción | Refactorizar corsHeaders en EFs públicas WebChat para devolver `Access-Control-Allow-Origin: <origin>` solo si origin está en allowed_origins del tenant |
| archivos afectados | `_shared/smart-conversations/response.ts`, conv-web-session, conv-web-message, conv-web-poll |
| restricción | No modificar contratos; solo comportamiento de headers |
| gate | Bloquea producción |

#### P2: SEC-011 — Realtime channel RLS

| Campo | Valor |
|---|---|
| finding | SEC-011 |
| acción | Configurar Supabase Realtime RLS para autorizar suscripción a canal `webchat:<session_id>` solo al cliente con ese session_id (usando signed_token) |
| restricción | Requiere Supabase Realtime RLS habilitado y SEC-004 completada |
| gate | Bloquea producción |

#### P2: SEC-026 — Timestamp validation en webhook Wasender

| Campo | Valor |
|---|---|
| finding | SEC-026 |
| acción | Añadir validación de X-Wasender-Timestamp; rechazar webhooks > 5 minutos de antigüedad |
| archivos afectados | conv-wa-webhook/index.ts |
| restricción | Verificar que Wasender realmente envía timestamp header |
| gate | Bloquea producción |

#### P2: SEC-012 — Constant-time comparison

| Campo | Valor |
|---|---|
| finding | SEC-012 |
| acción | Reemplazar `token === serviceRoleKey` con `crypto.subtle.timingSafeEqual()` en ef-auth.ts |
| archivos afectados | `_shared/smart-conversations/ef-auth.ts` |
| gate | Bloquea producción |

#### P2: SEC-027 — Deduplicación de mensajes WebChat

| Campo | Valor |
|---|---|
| finding | SEC-027 |
| acción | Añadir `idempotency_key` (UUID cliente) a payload de conv-web-message; deduplicar en DB con UNIQUE constraint |
| gate | Bloquea producción |

#### P2: SEC-025 — Sanitización de message_text para IA

| Campo | Valor |
|---|---|
| finding | SEC-025 |
| acción | Implementar capa de sanitización en adapter IA que elimine patrones de PII antes de construir prompt |
| gate | Bloquea producción (cuando IA sea real) |

#### P3: SEC-007 (adicional) — Retención de conv_sessions

| Acción | Implementar TTL y purga periódica de conv_sessions inactivas |
| gate | No bloquea gate inmediato |

#### P3: SEC-020, SEC-021 — Headers de seguridad adicionales

| Acción | X-Frame-Options, X-Content-Type-Options, Referrer-Policy en vercel.json |
| gate | No bloquea preproducción |

#### P3: SEC-023 — Ampliar lista PII de ef-logger

| Acción | Añadir 'api_key', 'key', 'credential' a PII_FIELDS_TO_REDACT |
| gate | No bloquea ningún gate |

---

## Fase 11B4 — Pruebas adversariales, tests y cierre de GATE_1

### Objetivo

Verificar que todas las remediaciones de 11B2 y 11B3 son efectivas mediante pruebas.

### Tareas

#### Tests de RLS

- Test de intento de bypass RLS con postgres role → debe fallar
- Test de acceso con anon → debe fallar en todas las tablas conv_*
- Test de acceso con authenticated → debe fallar
- Test con service_role → debe pasar con FORCE RLS

#### Tests multi-tenant

- Test: crear sesión de Tenant A; intentar polling con datos de Tenant B → debe fallar (403)
- Test: token de Tenant A con session_id de Tenant B → debe fallar (HMAC inválido)
- Test: flood de conv-web-session → debe recibir 429 después del límite

#### Tests de CORS

- Test: request desde origin no en allowlist → debe recibir corsHeaders vacíos o CORS bloqueado
- Test: request desde origin en allowlist → debe pasar

#### Tests de CSP

- Test: cargar página en browser con CSP activa → verificar ausencia de violaciones en staging

#### Tests de webhook

- Test: replay de webhook Wasender con timestamp antiguo → debe rechazarse
- Test: webhook con firma inválida → silentOk (no revela error)
- Test: wasender_message_id duplicado → no crea mensaje duplicado

#### Cierre de findings

- Revisar cada finding open y marcar como mitigated con evidencia
- Informe final de GATE_1 en `gate-1-report.md`

---

## Resumen de findings por fase de remediación

| Fase | Findings | Count |
|---|---|---|
| 11B2 | SEC-001, SEC-002, SEC-004, SEC-005, SEC-006, SEC-007, SEC-008, SEC-009, SEC-010, SEC-013 | 10 |
| 11B3 | SEC-003, SEC-011, SEC-012, SEC-017, SEC-019, SEC-020, SEC-021, SEC-022, SEC-023, SEC-025, SEC-026, SEC-027 | 12 |
| 11B4 | SEC-014, SEC-016, SEC-018, SEC-024 + verificación de todos | 4 |

---

## Estado de GATE_1

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**

GATE_1 solo podrá cerrarse después de:
1. 11B2 completada y verificada
2. 11B3 completada y verificada
3. 11B4 completada con pruebas adversariales
4. Informe gate-1-report.md generado
