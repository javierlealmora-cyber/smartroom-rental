# contract-subscription-plan-configuration.md — SalPlanConfiguration

## 1. Propósito

`SalPlanConfiguration` es la representación tipada y lista para validar de los límites y capacidades del plan de SmartLock contratado por un `client_account`, derivada de `saas_service_plans.features`.

## 2. Cuándo se Usa

Se calcula al inicio de cualquier Edge Function `sal-*` que cree, active o module un recurso limitable (cerraduras, actores, grupos, gateways, zonas comunes) o que exponga una capacidad condicionada por plan (unlock remoto, audit logs, provider BLE local).

## 3. Productor

La función compartida `resolveSalPlanConfiguration(supabase, clientAccountId)` en `_shared/sal-helpers.ts`, que resuelve la suscripción activa, su plan, y mapea `saas_service_plans.features` a esta estructura.

## 4. Consumidor

Todas las Edge Functions listadas en `rules-21-subscription-plan-configuration.md` §4.3 y §4.4, y el hook de frontend `useSalPlanConfiguration()` (solo para UX, no autoritativo).

## 5. Estructura

```typescript
interface SalPlanConfiguration {
  // Capacidades booleanas
  providerIntegration:      boolean;
  commonAreas:               boolean;
  multipleLocksPerRoom:      boolean;
  multipleLocksPerArea:      boolean;
  actorsEnabled:             boolean;
  accessGroupsEnabled:       boolean;
  lodgerAutoGrant:           boolean;
  groupAutoGrant:            boolean;
  remoteUnlock:              boolean;
  auditLogs:                 boolean;
  notificationsEmail:        boolean;
  notificationsSms:          boolean;
  notificationsWhatsapp:     boolean;
  providerLocalBle:          boolean;

  // Límites numéricos (null = ilimitado)
  maxLocks:     number | null;
  maxActors:    number | null;
  maxGroups:    number | null;
  maxGateways:  number | null;

  // Metadatos de resolución
  planCode:        string;   // código del plan resuelto, p.ej. "smart_access_lock_basic"
  subscriptionId:  string;   // UUID de saas_service_subscriptions
  resolvedAt:      string;   // ISO 8601 UTC — momento de cálculo, para trazabilidad de cache
}
```

## 6. Campos Obligatorios

Todos los campos son obligatorios en toda instancia de `SalPlanConfiguration`. Ningún campo puede ser `undefined`; los `feature_code` ausentes en `saas_service_plans.features` deben resolverse a su valor por defecto más restrictivo (`false` para booleanos, `0` para numéricos, nunca `null` salvo que el propio plan declare explícitamente "ilimitado").

## 7. Campos Opcionales

Ninguno. La ausencia de un dato de origen se resuelve con el valor por defecto restrictivo, nunca con un campo ausente en la estructura resultante.

## 8. Reglas de Validación

1. `maxLocks`, `maxActors`, `maxGroups`, `maxGateways` deben ser `null` (ilimitado) o un entero `>= 0`.
2. `providerLocalBle = true` es condición necesaria pero no suficiente para usar `ttlock_ble`; también se requiere que el gateway físico esté registrado y online (ver `rules-50-ttlock-ble-provider.md`).
3. `resolvedAt` debe usarse para invalidar cualquier cache de `SalPlanConfiguration` con antigüedad mayor a un umbral operativo (recomendado: 5 minutos, o invalidación inmediata al detectar cambio de plan).
4. Ninguna Edge Function debe mutar los valores de `SalPlanConfiguration` tras resolverlo; es de solo lectura durante el ciclo de vida del request.
5. Todo cambio de `saas_service_subscriptions.plan_id` debe validarse comparando el `SalPlanConfiguration` actual contra el del plan destino, según `rules-21-subscription-plan-configuration.md` §4.5. Un downgrade que reduzca cualquier límite por debajo del uso actual, o que retire una capacidad booleana con recursos activos dependientes, debe rechazarse con `PLAN_DOWNGRADE_BLOCKED` y el detalle de cada conflicto (ver `PlanChangeConflict` en `skill-enforce-plan-limits.md`).

## 9. Ejemplos Válidos

```json
{
  "providerIntegration": true,
  "commonAreas": false,
  "multipleLocksPerRoom": false,
  "multipleLocksPerArea": false,
  "actorsEnabled": true,
  "accessGroupsEnabled": false,
  "lodgerAutoGrant": true,
  "groupAutoGrant": false,
  "remoteUnlock": true,
  "auditLogs": false,
  "notificationsEmail": true,
  "notificationsSms": false,
  "notificationsWhatsapp": false,
  "providerLocalBle": false,
  "maxLocks": 20,
  "maxActors": 5,
  "maxGroups": 0,
  "maxGateways": 0,
  "planCode": "smart_access_lock_basic",
  "subscriptionId": "9f1b2c3d-4e5f-6789-abcd-ef1234567890",
  "resolvedAt": "2026-07-23T10:00:00Z"
}
```

```json
{
  "providerIntegration": true,
  "commonAreas": true,
  "multipleLocksPerRoom": true,
  "multipleLocksPerArea": true,
  "actorsEnabled": true,
  "accessGroupsEnabled": true,
  "lodgerAutoGrant": true,
  "groupAutoGrant": true,
  "remoteUnlock": true,
  "auditLogs": true,
  "notificationsEmail": true,
  "notificationsSms": true,
  "notificationsWhatsapp": true,
  "providerLocalBle": true,
  "maxLocks": null,
  "maxActors": null,
  "maxGroups": null,
  "maxGateways": null,
  "planCode": "smart_access_lock_enterprise",
  "subscriptionId": "1a2b3c4d-5e6f-7890-abcd-ef1234567891",
  "resolvedAt": "2026-07-23T10:05:00Z"
}
```

## 10. Ejemplos Inválidos

```json
{
  "maxLocks": "20",
  "actorsEnabled": "yes"
}
```
Inválido: `maxLocks` debe ser `number | null`, no `string`; `actorsEnabled` debe ser `boolean`, no `string`. Además faltan el resto de campos obligatorios de la estructura completa.

## 11. Notas de Versionado

Añadir un nuevo `feature_code` implica añadir un campo nuevo a esta estructura, con su valor por defecto restrictivo documentado. Es un cambio no-breaking si el nuevo campo se añade con default seguro y los consumidores existentes lo ignoran hasta implementarlo explícitamente.

## 12. Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
- `REQ-013-saas-services-catalog.md`
