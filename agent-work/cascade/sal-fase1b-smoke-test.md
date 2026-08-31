# Fase 1b — Smoke Test end-to-end (Cloud TTLock)

Guía de verificación manual para el flujo MVP cloud de SmartLock tras la Fase 1b.

## 0. Precondiciones (ya en DEV)

- Migración `20260716000001_smart_lock_rename_and_constraints.sql` aplicada (Fase 1a).
- Migración `20260716000002_smart_lock_plan_features_seed.sql` aplicada (Fase 1b/4).
- `TTLOCK_CLIENT_ID` y `TTLOCK_CLIENT_SECRET` en Supabase secrets.
- 20 Edge Functions `sal-*` desplegadas en DEV, incluidas las nuevas:
  - `sal-change-plan`
  - `sal-provision-shard`
- Servicio `smart_access_lock` en `saas_services` (id `cd45a152-16c1-42d1-a43e-387786e7d350`) con 2 planes:
  - `basic` (max_locks=20, max_actors=5, sin common_areas/groups/audit_logs)
  - `sal_starter` (todo habilitado, sin límites, BLE local aún desactivado)

Checks ya realizados automáticamente (Cascade):

- `sal-change-plan` responde con `VALIDATION_ERROR` a body vacío (400).
- `sal-provision-shard` responde con `VALIDATION_ERROR` a body vacío (400).
- El schema DEV tiene los 18 features por plan correctamente poblados.

## 1. Aprovisionar el primer shard (superadmin)

Requiere un JWT válido de superadmin. Ejecuta desde el navegador con sesión superadmin activa, o con `Authorization: Bearer <jwt>`:

```bash
curl -X POST 'https://lqwyyyttjamirccdtlvl.supabase.co/functions/v1/sal-provision-shard' \
  -H "Authorization: Bearer <SUPERADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "shard_code": "srr-shard-01",
    "username":   "srrshard01",
    "password":   "<password_fuerte_aleatoria>",
    "region":     "eu",
    "max_locks":  500,
    "max_clients": 50,
    "notes":      "Shard inicial DEV — smoke test Fase 1b"
  }'
```

Respuesta esperada:
```json
{
  "ok": true,
  "data": {
    "pool_id":          "<uuid>",
    "shard_code":       "srr-shard-01",
    "ttlock_email":     "<clientId>_srrshard01",
    "managed_username": "<clientId>_srrshard01",
    "region":           "eu",
    "token_expires_at": "..."
  }
}
```

**Guarda la `password` en un gestor de secretos personal**: la EF hará MD5 y guardará el MD5 en Vault, pero el usuario/superadmin necesita la password original si algún día quiere usar la app oficial TTLock con este shard.

Si el `username` ya está registrado en TTLock (por un intento anterior), añade `"reuse_user": true` para saltar el `/v3/user/register` y hacer login directo.

## 2. Verificar el shard en base de datos

```sql
SELECT id, shard_code, ttlock_email, provider, status, region,
       max_locks, current_locks_count, is_blocked
FROM lock_provider_pools
WHERE shard_code = 'srr-shard-01';
```

Esperado: 1 fila con `status='active'`, `is_blocked=false`, `vault_key_ref` no nulo.

## 3. Crear un cliente de prueba con suscripción SAL activa

En DEV, elige un `client_account` existente (o crea uno). Añade suscripción al servicio SmartAccessLock:

```sql
-- Sustituir :CLIENT_ACCOUNT_ID por el UUID real del cliente de prueba
INSERT INTO saas_service_subscriptions (
    client_account_id,
    saas_service_id,
    saas_service_plan_id,
    status,
    activated_at
)
VALUES (
    ':CLIENT_ACCOUNT_ID',
    'cd45a152-16c1-42d1-a43e-387786e7d350',  -- smart_access_lock
    'b3df6529-0bdb-4356-8833-90983ddcb38b',  -- plan basic
    'active',
    now()
)
ON CONFLICT DO NOTHING;
```

## 4. Asignar el cliente al shard (superadmin)

```sql
INSERT INTO lock_provider_pool_assignments (
    client_account_id,
    pool_id,
    provider,
    status,
    assigned_at
)
VALUES (
    ':CLIENT_ACCOUNT_ID',
    (SELECT id FROM lock_provider_pools WHERE shard_code = 'srr-shard-01'),
    'ttlock',
    'active',
    now()
);
```

## 5. Conectar la integración

```bash
curl -X POST 'https://lqwyyyttjamirccdtlvl.supabase.co/functions/v1/sal-connect-integration' \
  -H "Authorization: Bearer <ADMIN_JWT_DEL_CLIENTE>" \
  -H "Content-Type: application/json" \
  -d '{ "client_account_id": ":CLIENT_ACCOUNT_ID" }'
```

Esperado:
```json
{
  "ok": true,
  "data": {
    "integration_id":   "<uuid>",
    "shard_code":       "srr-shard-01",
    "ttlock_email":     "<clientId>_srrshard01",
    "vault_configured": true,
    "status":           "connected",
    "installation_status": "incomplete"
  }
}
```

## 6. Sincronizar cerraduras (opcional — requiere hardware TTLock)

Si has emparejado alguna cerradura al shard vía la app TTLock (login con el `managed_username` + password del paso 1):

```bash
curl -X POST 'https://lqwyyyttjamirccdtlvl.supabase.co/functions/v1/sal-sync-locks' \
  -H "Authorization: Bearer <ADMIN_JWT_DEL_CLIENTE>" \
  -H "Content-Type: application/json" \
  -d '{ "client_account_id": ":CLIENT_ACCOUNT_ID" }'
```

Verificación:
```sql
SELECT id, name, provider_lock_id, model, battery_level, is_online, is_active
FROM locks
WHERE client_account_id = ':CLIENT_ACCOUNT_ID';
```

## 7. Probar cambio de plan (upgrade y downgrade)

### 7.1 Upgrade `basic` → `sal_starter`

```bash
curl -X POST 'https://lqwyyyttjamirccdtlvl.supabase.co/functions/v1/sal-change-plan' \
  -H "Authorization: Bearer <ADMIN_JWT_DEL_CLIENTE>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_account_id": ":CLIENT_ACCOUNT_ID",
    "target_plan_id":    "938992c7-9c32-4d56-bd79-76d58725d505"
  }'
```

Esperado: `ok:true`, `previous_plan_id` = basic, `new_plan_id` = starter.

### 7.2 Downgrade `sal_starter` → `basic` con más de 20 cerraduras activas

Precondición: tener >20 cerraduras activas sincronizadas.

Esperado:
```json
{
  "ok": false,
  "error": {
    "code": "PLAN_DOWNGRADE_BLOCKED",
    "message": "No se puede cambiar de plan: hay recursos que exceden el plan destino",
    "detail": {
      "conflicts": [
        { "resource": "locks", "current": 25, "newLimit": 20 }
      ],
      "from": "sal_starter",
      "to":   "basic"
    }
  }
}
```

## 8. Gating de frontend

Con la sesión del cliente admin en el navegador:

- Sin suscripción activa: la entrada "Smart Access" **no debe aparecer** en el menú lateral. Navegar directamente a `/v2/admin/smart-access` debe redirigir a `/v2/admin`.
- Con suscripción activa: la entrada aparece, la ruta renderiza `SalGestion` con sus 10 tabs.

Con sesión de superadmin: la entrada siempre aparece (bypass).

## 9. Rollback (si es necesario deshacer el smoke)

```sql
DELETE FROM lock_provider_pool_assignments WHERE pool_id = (SELECT id FROM lock_provider_pools WHERE shard_code='srr-shard-01');
DELETE FROM lock_integrations WHERE client_account_id = ':CLIENT_ACCOUNT_ID';
DELETE FROM saas_service_subscriptions WHERE client_account_id = ':CLIENT_ACCOUNT_ID' AND saas_service_id = 'cd45a152-16c1-42d1-a43e-387786e7d350';
DELETE FROM lock_provider_pools WHERE shard_code = 'srr-shard-01';
-- El secreto en Vault queda huérfano; borrarlo con: SELECT vault.delete_secret(<uuid>);
```

## Criterios de aceptación

- [ ] Shard `srr-shard-01` creado con vault_key_ref no nulo.
- [ ] Cliente de prueba conectado con integración `status='connected'`.
- [ ] Menu lateral respeta el gating (aparece/desaparece según suscripción).
- [ ] Guard de rutas redirige correctamente sin suscripción.
- [ ] `sal-change-plan` acepta upgrade y rechaza downgrade con conflictos.
- [ ] `PLAN_DOWNGRADE_BLOCKED` incluye `detail.conflicts[]` correcto.

## Errores conocidos y mitigación

- **TTLock errcode=30013 "Duplicate username"**: significa que `username` ya está registrado en TTLock. Reintenta con `"reuse_user": true`.
- **TTLock errcode=10007 "User not found"**: la cuenta que intentas usar no fue creada por *nuestra* App developer. TTLock exige que las cuentas sean las que registremos vía `/v3/user/register`; no acepta cuentas TTLock personales.
- **Warning "failed to read file: _shared/_shared/..."** durante el deploy de EFs: es un warning cosmético del CLI resolviendo imports; las EFs desplegaron correctamente. No es error.
