# skill-gateway-onboarding.md — Onboarding de Cliente (Cloud y BLE Local)

## 1. Objetivo

Guiar la implementación del flujo completo de alta de un cliente en SmartLock, cubriendo ambas rutas: provider cloud (`ttlock`) y provider BLE local (`ttlock_ble`).

## 2. Cuándo Usar Este Skill

- Implementar el wizard de conexión de proveedor en `/v2/admin/smart-lock/integracion` (o el path final del módulo).
- Diagnosticar por qué un cliente no puede completar el onboarding.
- Diseñar la UI de "Registrar gateway" para BLE local.

## 3. Preconditions

Leer antes:
- `rules-20-tenant-activation-and-lifecycle.md`
- `rules-21-subscription-plan-configuration.md`
- `rules-40-ttlock-cloud-provider.md`
- `rules-50-ttlock-ble-provider.md`

## 4. Restricciones de Origen

- Sin suscripción activa, ningún paso de este flujo es accesible.
- El emparejamiento físico de cerraduras cloud requiere la app oficial TTLock; no se implementa pairing BLE directo en la ruta cloud.
- La asignación a shard (Paso 2a) puede fallar (shard saturado, bloqueado o con token inválido); debe manejarse según `rules-40-ttlock-cloud-provider.md` §4.6, nunca dejando `lock_integrations.status = 'connected'` sin `testConnection()` exitoso.
- La sincronización de cerraduras (Paso 5) y cualquier operación posterior deben validar `SalPlanConfiguration` (`rules-21`) antes de crear recursos o exponer capacidades.

## 5. Estrategia de Implementación

Dos flujos paralelos que comparten los mismos pasos 1 y 5-8, y difieren en los pasos 2-4 según el provider elegido.

## 6. Pasos Recomendados

### Paso 1 — Activación de la suscripción (común)

```
1. Admin ve /v2/admin/smart-lock/configuracion
2. Si no contratado: botón "Solicitar información" (Fase 1) o "Contratar" (Fase 2 con Stripe)
3. Superadmin activa manualmente (Fase 1) → saas_service_subscriptions.status = 'active'
4. useSalSubscription() detecta el cambio → UI del módulo se desbloquea
```

### Paso 2a — Conexión de provider cloud (`ttlock`)

```
1. Admin selecciona "TTLock Cloud" en el wizard
2. sal-connect-integration:
   a. Busca shard con margen de capacidad y no bloqueado
   b. Si NO hay shard válido → aprovisiona uno nuevo automáticamente
      (skill-shard-management.md, Paso 1) y continúa
   c. Asigna client_account al shard (lock_provider_pool_assignments)
   d. Genera OAuth token con las credenciales del shard, guarda en Vault
   e. Ejecuta testConnection() contra el shard
      - Si falla: lock_integrations.status = 'error', alerta a superadmin,
        el flujo se detiene aquí hasta resolver (ver rules-40 §4.6)
      - Si éxito: lock_integrations.status = 'connected'
   f. Muestra credenciales del shard (email/password) al admin
3. Admin instala app TTLock, hace login con esas credenciales
4. Admin empareja físicamente sus cerraduras y gateway G2 desde la app
5. Admin vuelve a la web, pulsa "Sincronizar" → sal-sync-locks
   (valida SalPlanConfiguration.maxLocks antes de insertar cada cerradura)
```

### Paso 2b — Conexión de provider BLE local (`ttlock_ble`)

```
1. Admin selecciona "Gateway propio (BLE local)" en el wizard
2. sal-gateway-register genera { gateway_id, gateway_jwt }
3. UI muestra instrucciones: "Configura este token en tu gateway y enciéndelo"
4. Operador instala la imagen Docker del gateway con el JWT
5. Gateway se conecta al broker MQTT → lock_gateways.is_online = true
6. Operador empareja cerraduras desde la herramienta local del gateway
   (ver skill-implement-ble-provider.md, Paso 2)
7. Tras cada emparejamiento exitoso, la cerradura aparece automáticamente
   en locks vía el flujo de confirmación de lockData
```

### Paso 3 — Migración de cerraduras existentes (solo cloud, clientes con TTLock personal previo)

```
1. Detectar en el wizard si el cliente indica "ya tengo cerraduras TTLock"
2. Ofrecer instrucciones de "Transferencia de propiedad" (app TTLock → cuenta del shard)
3. Alternativa: unpair + factory reset + re-pairing (con aviso de pérdida de PINs existentes)
```

### Paso 4 — Estructura de accesos (común)

```
1. Admin asigna cada cerradura sincronizada a una habitación/entrada/zona común
   (sal-place-lock → lock_placements)
2. Admin configura actores, grupos, y políticas de credencial
```

### Paso 5 — Operación diaria (común)

A partir de aquí ambos providers exponen la misma UI y las mismas Edge Functions de negocio (`sal-grant-access`, `sal-revoke-access`, `sal-remote-unlock`, etc.), sin diferencias visibles para el admin del cliente.

## 7. Datos / Contratos Involucrados

- `rules-20-tenant-activation-and-lifecycle.md`
- `rules-40-ttlock-cloud-provider.md`, `rules-50-ttlock-ble-provider.md`
- `lock_integrations`, `lock_provider_pool_assignments`, `lock_gateways`

## 8. Errores Comunes

- Permitir avanzar el wizard sin verificar que la suscripción está activa.
- No distinguir claramente en la UI cuál de los dos flujos (2a/2b) está en curso, generando confusión sobre qué credenciales usar.
- Olvidar mostrar el aviso de pérdida de PINs en el flujo de migración por unpair/re-pairing.

## 9. Qué No Debe Hacerse

- No implementar pairing BLE directo desde la web para el provider cloud (no es soportado por TTLock cloud API).
- No mostrar el `access_token` del shard en la UI (solo email/password para la app TTLock).
- No mostrar el `gateway_jwt` más de una vez tras su generación.

## 10. Escenarios Mínimos de Prueba

- Cliente sin suscripción no puede acceder a ningún paso del wizard.
- Cliente con suscripción activa completa el flujo cloud end-to-end.
- Cliente con suscripción activa completa el flujo BLE local end-to-end (cuando esté implementado).
- Cliente indica "ya tengo cerraduras" y recibe instrucciones de migración correctas.

## 11. Criterio de Done

- Ambos flujos (cloud y BLE local) llegan al mismo punto de operación diaria sin duplicar lógica de negocio.
- El wizard no permite avanzar sin cumplir las precondiciones de cada paso.

## 12. Documentos Relacionados

- `rules-20-tenant-activation-and-lifecycle.md`
- `rules-21-subscription-plan-configuration.md`
- `rules-40-ttlock-cloud-provider.md`, `rules-50-ttlock-ble-provider.md`
- `skill-shard-management.md`, `skill-enforce-plan-limits.md`
- `diagram-cloud-onboarding-flow.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
