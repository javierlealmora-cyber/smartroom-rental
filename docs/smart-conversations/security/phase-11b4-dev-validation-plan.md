# Phase 11B4 — DEV Validation Plan

Estado: PENDIENTE (Fase 11B2D)
Prerrequisito: GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING
No desplegar hasta que el equipo autorice Fase 11B2D.

---

## Objetivo

Validar en entorno DEV real los controles de seguridad que no pueden verificarse offline.
Al completar este plan, GATE_1 puede evaluarse para cierre.

---

## Prerrequisitos de entorno

Antes de iniciar:
- [ ] Branch `develop` (nunca `main`, `staging`, ni `pre`)
- [ ] `npm run dev:preflight` pasa sin errores
- [ ] Supabase DEV project configurado (URL ≠ PRE ≠ PRO)
- [ ] Variables de entorno: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- [ ] Migración `20260723000001_sc_security_b3.sql` aplicada en DEV
- [ ] EFs desplegadas en DEV (Supabase Functions)

---

## Plan de validación

### Paso 1 — RLS (estimado: 30 min)

**Objetivo**: Verificar que ninguna tabla `conv_*` es accesible directamente sin la política
correcta.

```bash
# 1a. Como anon, intentar leer conv_sessions → debe dar 401/403
curl -H "apikey: ANON_KEY" https://DEV_SUPABASE_URL/rest/v1/conv_sessions
# Esperado: {"code":"42501","details":null,"hint":null,"message":"permission denied"}

# 1b. Como authenticated (sin tenant correcto), leer conv_messages → 403
# Usar JWT de Tenant B para leer mensajes de Tenant A

# 1c. RPC get_wa_webhook_secret como anon → 403
curl -H "apikey: ANON_KEY" -X POST \
  https://DEV_SUPABASE_URL/rest/v1/rpc/get_wa_webhook_secret \
  -d '{"p_tenant_id":"tenant-a"}'

# 1d. RPC purge_old_raw_payloads como anon → 403
```

Criterio de éxito: todos los comandos devuelven 401/403, 0 filas expuestas.

### Paso 2 — Cross-tenant isolation (estimado: 45 min)

**Objetivo**: Tenant B no puede leer ni modificar datos de Tenant A.

Setup:
- Crear 2 tenants de prueba: `tenant-dev-a` y `tenant-dev-b`
- Crear usuario para cada tenant con JWT válido

Pruebas:
- JWT de B → leer `conv_sessions` de A → 0 filas o 403
- JWT de B → leer `conv_messages` de A → 0 filas o 403
- JWT de B → escribir en `conv_sessions` de A → error RLS

Criterio de éxito: 0 filas cross-tenant expuestas en todas las pruebas.

### Paso 3 — Webhook DEV real (estimado: 60 min)

**Objetivo**: Validar que los controles de webhook funcionan con eventos reales.

```bash
# 3a. Evento con timestamp antiguo (>300s) → 200 opaco, sin procesar
STALE_TS=$(date -d "10 minutes ago" +%s)
curl -X POST https://DEV_SUPABASE_URL/functions/v1/conv-wa-webhook \
  -H "X-Hub-Signature-256: sha256=INVALID" \
  -H "X-Timestamp: $STALE_TS" \
  -d '{"entry":[]}'
# Esperado: 200 (opaco), 0 mensajes en conv_messages

# 3b. Evento con firma incorrecta → 200 opaco
# 3c. Replay (mismo provider_message_id) → 200 opaco, sin duplicado en BD
# 3d. Evento válido → 200, mensaje en conv_messages
```

Criterio de éxito: solo eventos válidos crean registros en la base de datos.

### Paso 4 — CORS en Vercel DEV (estimado: 20 min)

**Objetivo**: Verificar headers CORS reales en Supabase Functions DEV.

```bash
# 4a. Origin permitido → ACAO = origin
curl -I -H "Origin: https://APP_URL" \
  https://DEV_SUPABASE_URL/functions/v1/conv-web-session

# 4b. Origin no permitido → sin ACAO
curl -I -H "Origin: https://evil.com" \
  https://DEV_SUPABASE_URL/functions/v1/conv-web-session

# 4c. Preflight OPTIONS → 204
curl -I -X OPTIONS \
  -H "Origin: https://APP_URL" \
  -H "Access-Control-Request-Method: POST" \
  https://DEV_SUPABASE_URL/functions/v1/conv-web-session
```

Criterio de éxito: 4a → ACAO=origin; 4b → sin ACAO; 4c → 204.

### Paso 5 — CSP en Vercel DEV (estimado: 15 min)

```bash
# Verificar CSP en respuesta HTML
curl -I https://DEV_APP_URL | grep -i "content-security-policy"
curl -I https://DEV_APP_URL | grep -i "x-frame-options"
curl -I https://DEV_APP_URL | grep -i "x-content-type-options"
```

Criterio de éxito: CSP-Report-Only presente, X-Frame-Options: DENY, XCTO: nosniff.

### Paso 6 — Idempotencia WebChat DEV (estimado: 30 min)

**Objetivo**: Doble submit del mismo `client_message_id` → 1 solo mensaje.

```javascript
// Script de prueba
const CLIENT_ID = 'test-idemp-' + Date.now();
const payload = { session_id: 'sess-dev-1', message_text: 'test', client_message_id: CLIENT_ID };

// Enviar dos veces
const r1 = await fetch('/functions/v1/conv-web-message', { method: 'POST', body: JSON.stringify(payload) });
const r2 = await fetch('/functions/v1/conv-web-message', { method: 'POST', body: JSON.stringify(payload) });

// Verificar en BD: 1 solo mensaje con ese client_message_id
const { data } = await supabase.from('conv_messages').select('*').eq('client_message_id', CLIENT_ID);
console.assert(data.length === 1, 'Idempotency failed: ' + data.length + ' messages found');
```

Criterio de éxito: exactamente 1 mensaje en `conv_messages` para el `client_message_id`.

### Paso 7 — Rate limiting DEV (estimado: 20 min)

**Objetivo**: Polling agresivo es rechazado después del límite.

```bash
# Enviar 50 requests en 10 segundos desde la misma sesión
for i in {1..50}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://DEV_SUPABASE_URL/functions/v1/conv-web-deliver \
    -H "Authorization: Bearer SERVICE_ROLE_KEY" \
    -d '{"session_id":"sess-rate-test"}' &
done
# Esperar y verificar que algunos devuelven 429
```

Criterio de éxito: ≥1 respuesta 429 antes de completar las 50 requests.

---

## Criterio de finalización del plan

El plan está completo cuando:
- [ ] Pasos 1..7 ejecutados y documentados
- [ ] 0 hallazgos nuevos CRITICAL o HIGH sin mitigación
- [ ] Todos los hallazgos `open_dev_validation` actualizados a `mitigated_dev` o `accepted`
- [ ] `security-findings.md` actualizado con resultados DEV
- [ ] Checklist `gate-1-closure-checklist.md` Sección B completa (todos ✅)

Solo entonces proceder con la evaluación de cierre de GATE_1.

---

## Restricciones

- NO ejecutar este plan en PRE ni PRO
- NO usar credenciales de producción en las pruebas
- NO modificar datos de inquilinos reales
- NO desplegar sin `npm run dev:preflight` pasando
- Usar siempre datos de prueba (`tenant-dev-*`, usuarios sintéticos)
