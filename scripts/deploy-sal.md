# Deploy — SmartAccessLock (SAL)

> Instrucciones para Cascade (o cualquier operador).  
> Ejecutar en orden. Cada bloque indica si es DEV, STAGING o ambos.

---

## ⚡ Para Cascade — ejecutar AHORA (sesión 2026-04-16)

> Solo estos dos pasos. El resto del documento es la guía completa de referencia.

### Paso 1 — Aplicar migración nueva

```bash
supabase db push
```

Migración incluida: `20260416000001_add_ttlock_platform_to_integrations.sql`
- Añade columna `ttlock_platform text NOT NULL DEFAULT 'intl' CHECK (ttlock_platform IN ('intl', 'eu'))` a `lock_integrations`

O ejecutar directamente en SQL Editor de Supabase si `db push` da conflicto:
```sql
ALTER TABLE public.lock_integrations
  ADD COLUMN IF NOT EXISTS ttlock_platform text
    NOT NULL DEFAULT 'intl'
    CHECK (ttlock_platform IN ('intl', 'eu'));
```

### Paso 2 — Redesplegar Edge Function modificada

```bash
supabase functions deploy sal-connect-integration
```

**Cambios incluidos en esta versión de `sal-connect-integration`:**
- Recibe `ttlock_platform` del frontend (`"intl"` o `"eu"`)
- Resuelve URL base correcta: `api.ttlock.com` (intl) o `euapi.ttlock.com` (eu)
- Añade `grant_type=password` al token request OAuth2 ROPC (era la causa del error de autenticación)
- Persiste `ttlock_platform` en la columna nueva de `lock_integrations`
- Guarda `api_base` en el secreto Vault para que los EFs de sync usen el endpoint correcto
- Validación de teléfono: acepta email o número con prefijo `+XX`

**También redesplegar el shared que cambió:**
> `_shared/sal-ttlock-client.ts` — cambia junto con la EF. Se empaqueta automáticamente al hacer deploy.

### Verificación rápida

```bash
# Debe devolver 405 (la EF existe y solo acepta POST)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer <ANON_KEY>" \
  https://<PROJECT_REF>.supabase.co/functions/v1/sal-connect-integration
```

---

## 0. Prerequisitos

```bash
# Verificar que Supabase CLI está instalado y autenticado
supabase --version
supabase projects list

# Verificar que estás en el directorio raíz del proyecto
cd /ruta/al/proyecto/smartroom-rental
```

---

## 1. Migraciones de base de datos

> Aplicar en DEV primero. Verificar. Luego aplicar en STAGING.  
> Las migraciones SAL se aplican **en este orden exacto** — no alterar.

```bash
# Conectar al proyecto correcto antes de cada entorno:
# DEV:     supabase link --project-ref <DEV_PROJECT_REF>
# STAGING: supabase link --project-ref <STAGING_PROJECT_REF>

supabase db push
```

### Migraciones SAL pendientes (aplicar si no están ya en el proyecto)

| Archivo | Qué hace |
|---|---|
| `20260411000001_add_owner_fields_to_client_accounts.sql` | Añade `owner_first_name`, `owner_last_name1`, `owner_last_name2` a `client_accounts` |
| `20260411000002_rename_owner_fields_client_accounts.sql` | Renombra → `last_name1`, `last_name2` (elimina `owner_first_name`) |
| `20260412000001_create_saas_services_catalog.sql` | Crea `saas_services`, `saas_service_plans`, `saas_service_features`, `saas_service_subscriptions` |
| `20260412000002_create_smart_access_lock_core.sql` | Crea `lock_integrations`, `locks`, `common_areas`, `lock_placements` |
| `20260412000003_create_smart_access_lock_access.sql` | Crea `lock_access_grants`, `lock_credentials`, `lock_records`, `lock_notifications` |
| `20260412000004_smart_access_lock_rls.sql` | RLS para todas las tablas SAL |
| `20260412000006_sal_corrections.sql` | `group_type`, `auto_assign_to_lodger=false`, vista `saas_catalog_public`, permisos agent |
| `20260412000007_sal_triggers.sql` | Triggers BD: auto-grant al asignar habitación, revocación al checkout |
| `20260412170000_automation_jobs.sql` | Tablas `automation_jobs` + `automation_job_runs` + RLS |
| `20260412180000_vault_helpers.sql` | Funciones helper para Supabase Vault (cifrado de secretos TTLock) |

**Verificar que todas están aplicadas:**
```sql
-- Ejecutar en SQL Editor de Supabase
SELECT name FROM supabase_migrations.schema_migrations ORDER BY name;
```

---

## 2. Edge Functions — despliegue completo SAL

> Desplegar todas las EFs SAL de una vez.  
> El orden no importa para el despliegue, sí para la operativa (ver §3).

```bash
# Desplegar todas las EFs SAL
supabase functions deploy sal-activate-subscription
supabase functions deploy sal-connect-integration
supabase functions deploy sal-sync-locks
supabase functions deploy sal-sync-lock-records
supabase functions deploy sal-place-lock
supabase functions deploy sal-grant-access
supabase functions deploy sal-revoke-access
supabase functions deploy sal-process-room-assignment
supabase functions deploy sal-process-checkout
supabase functions deploy sal-process-group-change
supabase functions deploy sal-renew-credential
supabase functions deploy sal-remote-unlock
```

**O desplegar todas de una vez:**
```bash
supabase functions deploy --no-verify-jwt
```

> ⚠️ `--no-verify-jwt` solo para EFs que son llamadas desde DB Webhooks o n8n con service_role_key.  
> Las EFs llamadas desde el frontend sí validan JWT — no usar `--no-verify-jwt` en producción salvo las que lo requieran explícitamente.

### Despliegue individual (cuando solo cambia una EF)

```bash
# Solo la que ha cambiado en este ciclo de trabajo:
supabase functions deploy sal-connect-integration
```

---

## 3. Variables de entorno necesarias en Supabase

> Configurar en Dashboard → Settings → Edge Functions → Secrets.  
> O via CLI:

```bash
supabase secrets set NOMBRE_VAR=valor
```

| Variable | Descripción | Requerida |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto (se inyecta automáticamente) | Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (se inyecta automáticamente) | Auto |
| `SUPABASE_ANON_KEY` | Anon key (se inyecta automáticamente) | Auto |
| `RESEND_API_KEY` | API key de Resend para emails (notificaciones SAL) | Cuando `sal-send-notification` esté implementado |

> Las credenciales TTLock (client_secret, tokens) **no van en env vars** — se almacenan cifradas en Supabase Vault. El admin las introduce desde la UI en Configuración → Smart Access Lock.

---

## 4. Seed de datos SAL en Supabase (solo DEV / STAGING)

> Crear el servicio SmartAccessLock en el catálogo SaaS.  
> En producción lo hace el superadmin desde la UI.

```sql
-- Ejecutar en SQL Editor (DEV / STAGING únicamente)
INSERT INTO public.saas_services (
  code, name, description, status, visible_in_catalog,
  requires_manual_activation, provider
) VALUES (
  'smart_access_lock',
  'SmartAccessLock',
  'Gestión de accesos con cerraduras inteligentes TTLock',
  'active',
  true,
  true,
  'ttlock'
) ON CONFLICT (code) DO NOTHING;

-- Plan Básico SAL
INSERT INTO public.saas_service_plans (
  saas_service_id, name, billing_period, price_amount, price_currency, is_active
)
SELECT id, 'Plan Básico', 'monthly', 29.00, 'EUR', true
FROM public.saas_services WHERE code = 'smart_access_lock'
ON CONFLICT DO NOTHING;
```

---

## 5. Database Webhooks — configurar en Supabase Dashboard

> Dashboard → Database → Webhooks → Create a new hook

| Webhook | Tabla | Evento | EF destino |
|---|---|---|---|
| `sal_room_assignment` | `lodger_room_assignments` | INSERT | `sal-process-room-assignment` |
| `sal_checkout` | `lodger_room_assignments` | UPDATE | `sal-process-checkout` |

**Configuración de cada webhook:**
- Method: POST
- URL: `https://<PROJECT_REF>.supabase.co/functions/v1/<nombre-ef>`
- Headers: `Authorization: Bearer <SERVICE_ROLE_KEY>`
- HTTP Timeout: 5000ms

---

## 6. Verificación post-despliegue

```bash
# Verificar que las EFs responden (deben devolver 405 Method Not Allowed para GET)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer <ANON_KEY>" \
  https://<PROJECT_REF>.supabase.co/functions/v1/sal-connect-integration

# Esperado: 405 (Method Not Allowed — la EF existe pero solo acepta POST)
```

**Checklist UI:**
- [ ] `/v2/superadmin/saas-servicios` → muestra SmartAccessLock en catálogo
- [ ] `/v2/superadmin/cuentas/:id/smart-access` → puede activar SAL para un cliente
- [ ] `/v2/admin/servicios?tab=smart-access` → tab "Configuración" visible con suscripción activa
- [ ] Formulario TTLock → "Probar conexión" devuelve OK con credenciales correctas
- [ ] "Conectar TTLock" → `lock_integrations.status = 'connected'` en BD

---

## 7. Paso a STAGING — diferencias vs DEV

| Aspecto | DEV | STAGING |
|---|---|---|
| Project ref | `<DEV_REF>` | `<STAGING_REF>` |
| URL Supabase | `*.supabase.co` (DEV) | `*.supabase.co` (STAGING) |
| Credenciales TTLock | Cuenta de prueba | Cuenta real del cliente |
| Stripe | Modo test | Modo test (Fase 1: sin Stripe) |
| Emails (Resend) | Dominio sandbox | Dominio verificado |
| n8n | No requerido en Fase 1 | Configurar WF-01/02/03 si disponible |

```bash
# Cambiar al proyecto STAGING
supabase link --project-ref <STAGING_PROJECT_REF>

# Aplicar migraciones en STAGING
supabase db push

# Desplegar EFs en STAGING
supabase functions deploy sal-activate-subscription
supabase functions deploy sal-connect-integration
supabase functions deploy sal-sync-locks
supabase functions deploy sal-sync-lock-records
supabase functions deploy sal-place-lock
supabase functions deploy sal-grant-access
supabase functions deploy sal-revoke-access
supabase functions deploy sal-process-room-assignment
supabase functions deploy sal-process-checkout
supabase functions deploy sal-process-group-change
supabase functions deploy sal-renew-credential
supabase functions deploy sal-remote-unlock
```

---

## 8. Rollback

```bash
# Si una EF falla en producción, revertir a la versión anterior:
# (Supabase guarda versiones — desde Dashboard → Functions → historial de versiones)

# O redesplegar desde la rama anterior de git:
git checkout <commit-anterior>
supabase functions deploy sal-connect-integration
```

---

## Resumen rápido — solo EFs SAL que han cambiado en la última sesión

> Para Cascade: estas son las EFs modificadas en el último ciclo de desarrollo.

```bash
supabase functions deploy sal-connect-integration
```

**Cambios incluidos:**
- `_shared/sal-ttlock-client.ts`: añadido `grant_type=password` en OAuth ROPC; URL base ahora es `api.ttlock.com` (plataforma internacional lock2); `euapi.ttlock.com` como alternativa EU configurable; `apiBase` propagado a `fetchAllLocks` y `fetchLockRecords`
- `sal-connect-integration/index.ts`: soporte para `ttlock_platform` (intl/eu); guarda `api_base` en Vault para que todos los EFs posteriores usen el endpoint correcto
