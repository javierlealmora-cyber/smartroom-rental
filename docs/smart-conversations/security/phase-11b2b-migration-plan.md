# Phase 11B2B Migration Plan — SmartConversations Security Remediation
<!-- Fase 11B2A · Diseño Verificable · 2026-07-21 -->

> Plan de remediación de seguridad diseñado en Fase 11B2A.
> **NO EJECUTAR** ningún SQL de este documento hasta que Fase 11B2B lo especifique con tests de rollback.
> No aplica cambios. Solo diseño.

---

## 0. Restricciones absolutas en Fase 11B2B

- NO modificar ninguna EF funcional existente sin tests de regresión previos
- NO crear nuevas tablas conv_* (usar las existentes)
- NO añadir estados/eventos no en contrato (WF-02, WEAK_MATCH, UNVERIFIED standalone, next_retry_at, attempt_count)
- NO usar Supabase real ni credenciales reales en CI
- NO declarar GATE_1 aprobado sin pasar todos los tests de seguridad

---

## 1. Scope de Fase 11B2B

Remediar los findings de Fase 11B1 en el siguiente orden de prioridad:

| Prioridad | Finding | Tipo | Estimación |
|---|---|---|---|
| 1 | SEC-002 (rate limit) | Config guard | 2h |
| 2 | SEC-004 (auth mode) | Config guard | 2h |
| 3 | SEC-006 (session rate limit) | EF code change | 4h |
| 4 | SEC-001 (FORCE RLS) | Migration SQL | 1h |
| 5 | SEC-005 (secrets en DB) | Vault migration | 8h |
| 6 | SEC-026 (webhook timestamp) | EF code change | 2h |
| 7 | SEC-007 (raw_payload purge) | Migration + cron | 4h |
| 8 | SEC-003 (CSP headers) | EF headers config | 2h |
| 9 | SEC-008 (Snyk CI) | CI config | 1h |

---

## 2. Remediation A: Config Guards (SEC-002, SEC-004)

### Problema
`WEBCHAT_RATE_LIMIT_MODE` defaul a `'mock'` y `WEBCHAT_AUTH_MODE` default a `'legacy'`. No hay guard que bloquee configuración insegura en entornos no-local.

### Diseño de guard de configuración (NO EJECUTAR — solo diseño)

```typescript
// En conv-web-session/index.ts (guard al inicio de la función)
// NO EJECUTAR — diseño Fase 11B2A

const rateLimitMode = Deno.env.get('WEBCHAT_RATE_LIMIT_MODE') ?? 'mock';
const authMode = Deno.env.get('WEBCHAT_AUTH_MODE') ?? 'legacy';
const environment = Deno.env.get('APP_ENVIRONMENT') ?? 'local';

// Guard: bloquear configuración insegura en sandbox+
if (environment !== 'local' && rateLimitMode === 'mock') {
  throw new Error(
    `SEC-002: WEBCHAT_RATE_LIMIT_MODE=mock is not allowed in environment '${environment}'. ` +
    `Set WEBCHAT_RATE_LIMIT_MODE=database.`
  );
}

if (environment !== 'local' && authMode === 'legacy') {
  throw new Error(
    `SEC-004: WEBCHAT_AUTH_MODE=legacy is not allowed in environment '${environment}'. ` +
    `Set WEBCHAT_AUTH_MODE=signed_token.`
  );
}
```

### Variables de entorno por ambiente (objetivo)

| Variable | local | sandbox | staging | production |
|---|---|---|---|---|
| `WEBCHAT_RATE_LIMIT_MODE` | `mock` | `database` | `database` | `database` |
| `WEBCHAT_AUTH_MODE` | `legacy` | `signed_token` | `signed_token` | `signed_token` |
| `APP_ENVIRONMENT` | `local` | `sandbox` | `staging` | `production` |

### Tests requeridos (pre-merge)
- [ ] Guard bloquea `mock` en sandbox (unit test con env mock)
- [ ] Guard bloquea `legacy` en sandbox
- [ ] Guard permite `mock` en local
- [ ] Guard permite `legacy` en local
- [ ] Validator detecta `mock` + non-local como SEC-002 violation

---

## 3. Remediation B: Rate Limit en EF (SEC-006)

### Problema
`conv-web-session` no tiene rate limit en creación de sesiones. Un atacante puede crear infinitas sesiones para un tenant.

### Diseño de rate limit en conv-web-session (NO EJECUTAR — solo diseño)

```typescript
// Query de rate limit para conv-web-session (NO EJECUTAR — diseño)
// Contar sesiones creadas desde la misma IP en los últimos 60 segundos

const rateLimitCheck = await supabase
  .from('conv_sessions')
  .select('id', { count: 'exact', head: true })
  .eq('client_account_id', clientAccountId)
  .eq('channel', 'webchat')
  .gte('created_at', new Date(Date.now() - 60_000).toISOString());

if ((rateLimitCheck.count ?? 0) > SESSION_RATE_LIMIT_PER_MINUTE) {
  return new Response(
    JSON.stringify({ error: 'rate_limit_exceeded', retry_after: 60 }),
    { status: 429, headers: { 'Retry-After': '60', ...corsHeaders } }
  );
}
```

### Constante objetivo
- `SESSION_RATE_LIMIT_PER_MINUTE = 10` sesiones nuevas por tenant por minuto
- `MESSAGE_RATE_LIMIT_PER_MINUTE = 30` mensajes por sender por minuto (SEC-002)

### Índice DB necesario (NO EJECUTAR — solo diseño)
```sql
-- NO EJECUTAR — Diseño para Fase 11B2B
-- Índice para optimizar la query de rate limit
CREATE INDEX IF NOT EXISTS idx_conv_sessions_rate_limit
  ON conv_sessions (client_account_id, channel, created_at DESC)
  WHERE created_at > NOW() - INTERVAL '5 minutes';
```

---

## 4. Remediation C: FORCE ROW LEVEL SECURITY (SEC-001 — LOW)

### Análisis previo
SEC-001 re-evaluado a LOW (rls-role-model.md §4). FORCE RLS no restringe service_role (BYPASSRLS). Valor es puramente defense-in-depth.

### Decisión de implementación
FORCE RLS **sí se aplica** en Fase 11B2B como buena práctica, pero con baja prioridad (LOW severity, no bloqueante).

### SQL conceptual (NO EJECUTAR — solo diseño)
```sql
-- NO EJECUTAR — Diseño para Fase 11B2B
-- Aplicar FORCE ROW LEVEL SECURITY a todas las tablas conv_*

ALTER TABLE conv_service_activations FORCE ROW LEVEL SECURITY;
ALTER TABLE conv_wa_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE conv_wc_configs FORCE ROW LEVEL SECURITY;
ALTER TABLE conv_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE conv_cases FORCE ROW LEVEL SECURITY;
ALTER TABLE conv_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE conv_send_queue FORCE ROW LEVEL SECURITY;
ALTER TABLE conv_admin_notifications FORCE ROW LEVEL SECURITY;
```

### Rollback conceptual (NO EJECUTAR)
```sql
-- NO EJECUTAR — Solo referencia de rollback
ALTER TABLE conv_service_activations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE conv_wa_sessions NO FORCE ROW LEVEL SECURITY;
-- ... (repetir para las 8 tablas)
```

### Prechecks requeridos
- [ ] Verificar que service_role sigue teniendo BYPASSRLS después de FORCE RLS
- [ ] Verificar que EFs con service_role siguen funcionando (prueba de integración)
- [ ] Verificar que authenticated y anon siguen bloqueados

---

## 5. Remediation D: Secrets a Vault (SEC-005)

### Problema
`webhook_secret` y `signing_secret` están en columnas de la tabla `conv_service_activations` y `conv_wc_configs`. Cualquier leak de service_role expone todos los secrets.

### Diseño de migración a Vault (NO EJECUTAR — solo diseño)

```sql
-- NO EJECUTAR — Diseño conceptual para Fase 11B2B
-- Paso 1: Añadir columna para referencia de Vault
ALTER TABLE conv_service_activations
  ADD COLUMN IF NOT EXISTS webhook_secret_vault_id UUID,
  ADD COLUMN IF NOT EXISTS signing_secret_vault_id UUID;

-- Paso 2: Migrar secrets existentes a Vault (vía función)
-- La función crea el secret en vault.secrets y retorna el UUID
-- SELECT vault.create_secret(secret_value, 'conv_webhook_secret_' || client_account_id)
-- UPDATE conv_service_activations SET webhook_secret_vault_id = <uuid>

-- Paso 3: Eliminar columnas plaintext (después de verificar que todo funciona)
-- ALTER TABLE conv_service_activations DROP COLUMN IF EXISTS webhook_secret;
```

### Orden de migración de secrets
1. `conv_service_activations.webhook_secret` → `vault.secrets`
2. `conv_service_activations.signing_secret` → `vault.secrets`
3. `conv_wc_configs.signing_secret` → `vault.secrets`
4. Actualizar EFs para leer de Vault en lugar de columna

### Tests requeridos (pre-merge)
- [ ] Secret no aparece en logs de EF
- [ ] Secret no aparece en respuestas HTTP
- [ ] EF puede leer secret desde Vault correctamente
- [ ] Rollback no expone secrets en columnas

---

## 6. Remediation E: Webhook Timestamp Validation (SEC-026)

### Problema
`conv-wa-webhook` no valida el timestamp del webhook de WaSender. Vulnerable a replay attacks.

### Diseño de validación (NO EJECUTAR — solo diseño)

```typescript
// En conv-wa-webhook/index.ts (NO EJECUTAR — diseño)
const webhookTimestamp = req.headers.get('X-Webhook-Timestamp');
const webhookSignature = req.headers.get('X-Webhook-Signature');

if (!webhookTimestamp || !webhookSignature) {
  return new Response('Missing webhook headers', { status: 400 });
}

const timestampMs = parseInt(webhookTimestamp, 10);
const ageMs = Date.now() - timestampMs;

// Rechazar webhooks con más de 5 minutos de antigüedad
if (ageMs > 5 * 60 * 1000 || ageMs < -30_000) {
  return new Response('Webhook timestamp out of range', { status: 400 });
}

// Verificar firma con timestamp incluido
const payload = await req.text();
const signatureData = `${webhookTimestamp}.${payload}`;
// ... HMAC verificación
```

---

## 7. Remediation F: PII Purge Policy (SEC-007)

### Diseño de purge (NO EJECUTAR — solo diseño)

```sql
-- NO EJECUTAR — Diseño conceptual para Fase 11B2B
-- Función de purge de raw_payload en conv_messages

CREATE OR REPLACE FUNCTION purge_conv_messages_raw_payload()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH purged AS (
    UPDATE conv_messages
    SET raw_payload = NULL
    WHERE raw_payload IS NOT NULL
      AND created_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER FROM purged;
$$;
```

### Programa de purge objetivo
- `conv_messages.raw_payload`: NULL después de 90 días
- `conv_sessions` sesiones cerradas: purge `metadata.identity_token` después de 30 días
- `conv_wa_sessions` sesiones cerradas: purge `sender_phone` después de 30 días

---

## 8. Orden de ejecución en Fase 11B2B

```
Fase 11B2B Step 1: Tests de regresión de estado actual (baseline)
Fase 11B2B Step 2: Config Guards (SEC-002, SEC-004) — sin DB changes
Fase 11B2B Step 3: Rate Limit en conv-web-session (SEC-006) — EF change + índice
Fase 11B2B Step 4: Rate Limit en conv-web-message (SEC-002 database mode) — EF change
Fase 11B2B Step 5: FORCE RLS en 8 tablas (SEC-001) — migration
Fase 11B2B Step 6: Webhook timestamp validation (SEC-026) — EF change
Fase 11B2B Step 7: PII purge policy (SEC-007) — migration + function
Fase 11B2B Step 8: Secrets a Vault (SEC-005) — migration compleja
Fase 11B2B Step 9: CSP headers (SEC-003) — EF headers
Fase 11B2B Step 10: Snyk CI (SEC-008) — CI config
Fase 11B2B Step 11: Tests de validación post-remediación
Fase 11B2B Step 12: Declarar GATE_1 = PASS si 100% tests pasan
```

---

## 9. Prechecks globales para Fase 11B2B

### Antes de cada migration:
- [ ] `pg_dump` de tablas conv_* (backup)
- [ ] Tests de regresión en entorno sandbox pasan
- [ ] `SUPABASE_SERVICE_ROLE_KEY` verificado como BYPASSRLS en target
- [ ] Variables de entorno correctas en target (sandbox/staging)

### Antes de cada EF change:
- [ ] Tests unitarios de la EF pasan sin cambios
- [ ] EF se despliega en branch de test, no en producción
- [ ] Logs verificados sin leaks de secrets

### Gate de validación post-Fase 11B2B:
- [ ] `npm run test:sc:security-baseline` — 0 failures
- [ ] `npm run validate:sc:security-baseline` — AUDIT_COMPLETE
- [ ] `npm run test:sc:security-remediation-design` — 0 failures
- [ ] Todos los findings CRITICAL → remediados o mitigados
- [ ] Todos los findings HIGH → remediados o aceptados con evidencia
- [ ] `node scripts/smart-conversations/validate-release-readiness.mjs` — PASS

---

## 10. Criterios de aceptación para GATE_1 = PASS

| Criterio | Verificación |
|---|---|
| SEC-002 remediado | `WEBCHAT_RATE_LIMIT_MODE=database` en sandbox; guard bloquea `mock` |
| SEC-004 remediado | `WEBCHAT_AUTH_MODE=signed_token` en sandbox; guard bloquea `legacy` |
| SEC-006 remediado | Rate limit activo en conv-web-session; 429 tras 10 sesiones/min |
| SEC-001 aplicado | `FORCE ROW LEVEL SECURITY` en 8 tablas conv_* |
| SEC-026 remediado | Webhook rechaza timestamps > 5 min de antigüedad |
| 100% tests pasan | `npm run test:sc:*` sin failures |
| 0 findings CRITICAL | security-findings.md: 0 CRITICAL open |
| 0 findings HIGH sin aceptar | Todos HIGH tienen `estado: mitigated` o `estado: accepted` con evidencia |

---

## Estado

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**

Este plan de remediación es el output verificado de Fase 11B2A. No se ha ejecutado ningún SQL ni modificado ningún archivo de código.
