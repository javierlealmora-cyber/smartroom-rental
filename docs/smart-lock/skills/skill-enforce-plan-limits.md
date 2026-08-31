# skill-enforce-plan-limits.md — Aplicar Límites y Capacidades de Plan

## 1. Objetivo

Guiar la implementación de `resolveSalPlanConfiguration()` y su uso en las Edge Functions `sal-*` para validar límites numéricos y capacidades booleanas antes de ejecutar cualquier operación limitable por plan.

## 2. Cuándo Usar Este Skill

- Implementar una Edge Function nueva que cree un recurso limitable (cerradura, actor, grupo, gateway).
- Implementar una Edge Function que exponga una capacidad condicionada por plan (unlock remoto, audit logs, provider BLE local).
- Diagnosticar por qué un cliente no puede crear un recurso a pesar de tener SmartLock activo.

## 3. Preconditions

Leer antes:
- `rules-20-tenant-activation-and-lifecycle.md`
- `rules-21-subscription-plan-configuration.md`
- `contract-subscription-plan-configuration.md`

## 4. Restricciones de Origen

- La validación de suscripción (nivel 1, `rules-20`) y la validación de plan (`rules-21`) son comprobaciones distintas y ambas obligatorias, en ese orden.
- Los límites siempre se validan en backend antes de insertar. El frontend solo anticipa para UX.
- No existe una tabla `lock_*` de límites; todo viene de `saas_service_plans.features`.

## 5. Estrategia de Implementación

Cada Edge Function que cree un recurso limitable sigue el mismo patrón de tres pasos: (1) validar suscripción activa, (2) resolver `SalPlanConfiguration`, (3) validar el límite/capacidad específico antes de la escritura.

## 6. Pasos Recomendados

### Paso 1 — Implementar `resolveSalPlanConfiguration()`

```typescript
// _shared/sal-helpers.ts
export async function resolveSalPlanConfiguration(
  supabase: SupabaseClient,
  clientAccountId: string,
): Promise<SalPlanConfiguration> {
  const { data: subscription } = await supabase
    .from("saas_service_subscriptions")
    .select("id, plan_id, status")
    .eq("client_account_id", clientAccountId)
    .eq("service_code", "smart_access_lock")
    .eq("status", "active")
    .single();

  if (!subscription) {
    throw new SalForbiddenError("SmartLock no está activo para esta cuenta");
  }

  const { data: plan } = await supabase
    .from("saas_service_plans")
    .select("code, features")
    .eq("id", subscription.plan_id)
    .single();

  const features = plan.features ?? {};

  return {
    providerIntegration:  Boolean(features.provider_integration),
    commonAreas:           Boolean(features.common_areas),
    multipleLocksPerRoom:  Boolean(features.multiple_locks_per_room),
    multipleLocksPerArea:  Boolean(features.multiple_locks_per_area),
    actorsEnabled:         Boolean(features.actors),
    accessGroupsEnabled:   Boolean(features.access_groups),
    lodgerAutoGrant:       Boolean(features.lodger_auto_grant),
    groupAutoGrant:        Boolean(features.group_auto_grant),
    remoteUnlock:          Boolean(features.remote_unlock),
    auditLogs:             Boolean(features.audit_logs),
    notificationsEmail:    Boolean(features.notifications_email),
    notificationsSms:      Boolean(features.notifications_sms),
    notificationsWhatsapp: Boolean(features.notifications_whatsapp),
    providerLocalBle:      Boolean(features.provider_local_ble),
    maxLocks:    features.max_locks    ?? 0,
    maxActors:   features.max_actors   ?? 0,
    maxGroups:   features.max_groups   ?? 0,
    maxGateways: features.max_gateways ?? 0,
    planCode: plan.code,
    subscriptionId: subscription.id,
    resolvedAt: new Date().toISOString(),
  };
}
```

### Paso 2 — Validar un límite numérico antes de insertar

```typescript
// dentro de sal-sync-locks, antes de insertar cerraduras nuevas
const config = await resolveSalPlanConfiguration(supabase, clientAccountId);

const { count: currentActiveLocks } = await supabase
  .from("locks")
  .select("id", { count: "exact", head: true })
  .eq("client_account_id", clientAccountId)
  .eq("is_active", true);

const newLocksToInsert = discoveredLocks.length;

if (config.maxLocks !== null && (currentActiveLocks + newLocksToInsert) > config.maxLocks) {
  return err(ERROR_CODES.PLAN_LIMIT_EXCEEDED, "Límite de cerraduras del plan alcanzado", {
    limit: config.maxLocks,
    current: currentActiveLocks,
    requested: newLocksToInsert,
  });
}
```

### Paso 3 — Validar una capacidad booleana

```typescript
// dentro de sal-connect-integration, si integration.provider === 'ttlock_ble'
const config = await resolveSalPlanConfiguration(supabase, clientAccountId);

if (!config.providerLocalBle) {
  return err(ERROR_CODES.FORBIDDEN, "Tu plan no incluye el proveedor BLE local");
}
```

### Paso 4 — Validar un cambio de plan (upgrade / downgrade)

```typescript
// sal-change-plan
interface PlanChangeConflict {
  resource?:   string;  // "locks" | "actors" | "groups" | "gateways"
  capability?: string;  // "common_areas" | "provider_local_ble" | ...
  current?:    number;  // uso actual (solo para conflictos de límite numérico)
  newLimit?:   number;  // límite del plan destino (solo para conflictos de límite numérico)
  activeResources?: number; // recursos activos que dependen de la capacidad (solo para conflictos de capacidad)
}

async function validatePlanChange(
  supabase: SupabaseClient,
  clientAccountId: string,
  targetPlanId: string,
): Promise<{ allowed: boolean; conflicts: PlanChangeConflict[] }> {
  const currentConfig = await resolveSalPlanConfiguration(supabase, clientAccountId);
  const targetConfig  = await resolveSalPlanConfigurationForPlan(supabase, targetPlanId);

  const conflicts: PlanChangeConflict[] = [];

  // 1. Límites numéricos: solo importa si el nuevo límite es MENOR que el actual
  for (const key of ["maxLocks", "maxActors", "maxGroups", "maxGateways"] as const) {
    const newLimit = targetConfig[key];
    if (newLimit === null) continue; // ilimitado, nunca bloquea
    const currentUsage = await countActiveResource(supabase, clientAccountId, key);
    if (currentUsage > newLimit) {
      conflicts.push({ resource: resourceNameFor(key), current: currentUsage, newLimit });
    }
  }

  // 2. Capacidades booleanas: solo importa si pasa de true a false
  const booleanCapabilities = [
    "commonAreas", "accessGroupsEnabled", "providerLocalBle", "actorsEnabled",
  ] as const;
  for (const key of booleanCapabilities) {
    if (currentConfig[key] === true && targetConfig[key] === false) {
      const activeCount = await countActiveResourcesForCapability(supabase, clientAccountId, key);
      if (activeCount > 0) {
        conflicts.push({ capability: key, activeResources: activeCount });
      }
    }
  }

  return { allowed: conflicts.length === 0, conflicts };
}
```

```typescript
// Uso en la Edge Function sal-change-plan
const { allowed, conflicts } = await validatePlanChange(supabase, clientAccountId, targetPlanId);

if (!allowed) {
  return err(ERROR_CODES.PLAN_DOWNGRADE_BLOCKED, "No se puede cambiar de plan: hay recursos que exceden el nuevo plan", {
    conflicts,
  });
}

await supabase
  .from("saas_service_subscriptions")
  .update({ plan_id: targetPlanId })
  .eq("client_account_id", clientAccountId)
  .eq("service_code", "smart_access_lock");
```

Un **upgrade puro** (todos los límites del plan destino son `null` o mayores, y todas las capacidades del plan destino son `true` o iguales) siempre produce `conflicts = []` con esta lógica, porque el bucle 1 solo genera conflicto cuando el límite nuevo es menor, y el bucle 2 solo cuando una capacidad pasa de `true` a `false`. No se requiere una rama de código separada para "upgrade vs downgrade": la misma función cubre ambos casos correctamente.

### Paso 5 — Anticipar en frontend (no autoritativo)

```typescript
// useSalPlanConfiguration() — hook de solo lectura para UX
const { config, isLoading } = useSalPlanConfiguration();
const usagePercent = (currentLocksCount / config.maxLocks) * 100;

if (usagePercent >= 80) {
  showWarningBanner(`Estás usando ${currentLocksCount} de ${config.maxLocks} cerraduras permitidas`);
}
```

## 7. Datos / Contratos Involucrados

- `contract-subscription-plan-configuration.md`
- `saas_service_plans.features`
- `rules-21-subscription-plan-configuration.md`

## 8. Errores Comunes

- Validar el límite después de insertar y luego hacer rollback (genera condiciones de carrera). Validar siempre antes.
- Calcular el conteo de recursos activos con una query distinta a la que usa el resto del sistema, generando inconsistencias.
- No invalidar el cache de `SalPlanConfiguration` en frontend tras un cambio de plan, mostrando límites obsoletos.
- Permitir un downgrade y desactivar recursos automáticamente para "hacerlo encajar" sin bloquear ni pedir confirmación al cliente.
- Bloquear un upgrade por error al reutilizar la misma lógica de comparación sin verificar correctamente la dirección del cambio (la función de `validatePlanChange` debe compararse siempre "actual vs destino", nunca asumir de antemano cuál es mayor).

## 9. Qué No Debe Hacerse

- No confiar en el frontend para bloquear la creación de un recurso por límite de plan.
- No hardcodear límites numéricos en el código de una Edge Function; siempre deben leerse de `saas_service_plans.features`.
- No mezclar la validación de suscripción (nivel 1) con la validación de plan (nivel 2) en la misma comprobación; son conceptualmente distintas aunque se ejecuten en secuencia.
- No permitir cambiar `saas_service_subscriptions.plan_id` por ninguna vía que no sea `sal-change-plan` (o equivalente que ejecute `validatePlanChange`).

## 10. Escenarios Mínimos de Prueba

- Cliente en plan con `max_locks = 20` que ya tiene 20 activas no puede sincronizar una cerradura nueva.
- Cliente en plan `enterprise` con `max_locks = null` puede sincronizar sin límite.
- Cliente sin `provider_local_ble` en su plan no puede conectar una integración `ttlock_ble`.
- Cambiar de plan básico a plan superior desbloquea inmediatamente la creación de recursos adicionales sin cambios de código.
- Cliente con 35 cerraduras activas intenta bajar a un plan con `max_locks = 20` → bloqueado con `PLAN_DOWNGRADE_BLOCKED` y detalle `{ resource: "locks", current: 35, newLimit: 20 }`.
- Cliente con 3 zonas comunes activas intenta bajar a un plan con `common_areas = false` → bloqueado con detalle `{ capability: "commonAreas", activeResources: 3 }`.
- Cliente con 10 cerraduras intenta bajar a un plan con `max_locks = 20` (usage cabe) → permitido sin conflictos.
- Cliente sube de plan básico a enterprise → siempre permitido, sin conflictos, independientemente del uso actual.

## 11. Criterio de Done

- Toda Edge Function de creación de recurso limitable usa `resolveSalPlanConfiguration()` antes de insertar.
- Todo cambio de plan pasa por `validatePlanChange()` antes de escribir el nuevo `plan_id`.
- Los tests de `test-plan-limits-enforcement-spec.md` pasan, incluidos los escenarios de downgrade bloqueado.

## 12. Documentos Relacionados

- `rules-21-subscription-plan-configuration.md`
- `contract-subscription-plan-configuration.md`
- `test-plan-limits-enforcement-spec.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
