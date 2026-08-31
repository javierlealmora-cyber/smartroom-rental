# diagram-cloud-onboarding-flow.md — Flujo de Onboarding del Provider Cloud

## 1. Propósito

Visualizar la secuencia completa de alta de un cliente en SmartLock usando el provider `ttlock` cloud, en sus dos variantes (Fase 1 manual y Fase 2 self-service con Stripe), incluyendo la rama de fallo de asignación de pool.

## 2. Alcance

Cubre el flujo descrito normativamente en `skill-gateway-onboarding.md` (rutas 2a y común) y en `rules-40-ttlock-cloud-provider.md` §4.6 (fallo de asignación). No cubre el flujo BLE local (ver `diagram-ble-gateway-topology.md`).

## 3. Diagrama

### 3.1 Variante Fase 1 — Activación manual por superadmin (estado actual)

```
Admin cliente                Backend SmartRoom Rental              TTLock
     │                                │                              │
     │ 1. Solicita información        │                              │
     ├───────────────────────────────►│                              │
     │                                │ Superadmin activa manualmente │
     │◄───────────────────────────────┤ saas_service_subscriptions   │
     │  Módulo desbloqueado            │  = active (sin Stripe)        │
     │                                │                              │
     │                    (continúa en 3.3 — común a ambas variantes) │
```

### 3.2 Variante Fase 2 — Contratación directa por el cliente (Stripe, autoservicio)

```
Cliente admin                 Backend SmartRoom Rental              TTLock
     │                                │                              │
     │ 1. Cliente admin activa        │                              │
     │    suscripción SAL             │                              │
     │    (billing Stripe)            │                              │
     ├───────────────────────────────►│                              │
     │                                │ sal-activate-subscription     │
     │                                │  ├─ Marca saas_service_       │
     │                                │  │   subscriptions = active   │
     │                                │  └─ Habilita features SAL     │
     │◄───────────────────────────────┤     en UI                     │
     │                                │                              │
     │ 2. UI: "Conecta tu proveedor   │                              │
     │    de cerraduras"              │                              │
     │                                │                              │
     │ 3. Confirma conexión           │                              │
     ├───────────────────────────────►│                              │
     │                                │ sal-connect-integration       │
     │                                │  (superadmin o                │
     │                                │   auto-asignación)            │
     │                                │  ├─ Elige shard libre         │
     │                                │  │   (menos ocupado)          │
     │                                │  │                            │
     │                                │  ▼                            │
     │                        ┌───────────────────┐                  │
     │                        │ ¿Shard con margen  │                  │
     │                        │ y no bloqueado?     │                  │
     │                        └────┬──────────┬────┘                  │
     │                          SÍ │          │ NO                    │
     │                             ▼          ▼                       │
     │                  ┌─────────────┐  ┌─────────────────────────┐ │
     │                  │ Inserta      │  │ Rama de fallo            │ │
     │                  │ provider_    │  │ (rules-40 §4.6):         │ │
     │                  │ account_     │  │  - Aprovisiona shard     │ │
     │                  │ assignments  │  │    nuevo automáticamente │ │
     │                  │ (client→pool)│  │    y reintenta, o        │ │
     │                  │              │  │  - Notifica a superadmin │ │
     │                  │ Genera OAuth │  │    para asignación manual│ │
     │                  │ token con    │  │  - lock_integrations.    │ │
     │                  │ credentials  │  │    status = 'error' hasta│ │
     │                  │ del shard    │  │    resolverse            │ │
     │                  │              │  └───────────┬─────────────┘ │
     │                  │ Guarda en    │              │ (reintento)    │
     │                  │ Vault        │◄─────────────┘                │
     │                  └──────┬───────┘                               │
     │                         │                                       │
     │                         ▼                                       │
     │                  testConnection() contra el shard                │
     │                         │                                       │
     │              ┌──────────┴──────────┐                            │
     │           OK │                     │ Error                      │
     │              ▼                     ▼                            │
     │   lock_integrations.status   lock_integrations.status = 'error' │
     │   = 'connected'              + alerta a superadmin               │
     │              │                                                   │
     │◄─────────────┘                                                   │
     │  4. UI: "Descarga la app TTLock, haz login con estas             │
     │     credenciales" (email tipo srr-shard-01@smartroomrental.com)  │
     │                                                                   │
     │                    (continúa en 3.3 — común a ambas variantes)   │
```

### 3.3 Tramo común — emparejamiento, sincronización y operación diaria

```
Admin cliente                Backend SmartRoom Rental              TTLock
     │                                │                              │
     │ 5. Instala app TTLock,         │                              │
     │    login con credenciales      │                              │
     │    de shard                    │                              │
     ├─────────────────────────────────────────────────────────────►│
     │                                │                              │
     │ 6. Empareja cerraduras y       │                              │
     │    gateway G2 (BLE, vía app)   │                              │
     ├─────────────────────────────────────────────────────────────►│
     │                                │                              │
     │ 7. Vuelve a la web,            │                              │
     │    pulsa "Sincronizar          │                              │
     │    cerraduras"                 │                              │
     ├───────────────────────────────►│                              │
     │                                │ sal-sync-locks                │
     │                                │  (valida SalPlanConfiguration │
     │                                │   .maxLocks antes de insertar)│
     │                                ├─────────────────────────────►│
     │                                │◄─────────────────────────────┤
     │                                │  listLocks() → NormalizedLock│
     │                                │  → INSERT locks               │
     │◄───────────────────────────────┤                              │
     │  Cerraduras visibles en UI     │                              │
     │                                │                              │
     │ 8. Asigna cada cerradura a     │                              │
     │    habitación / entrada /      │                              │
     │    zona común                  │                              │
     ├───────────────────────────────►│                              │
     │                                │ sal-place-lock                │
     │                                │  → INSERT lock_placements     │
     │                                │                              │
     │ 9. Sistema listo: crea PINs,   │                              │
     │    abre remotamente, ve        │                              │
     │    histórico. Nunca más        │                              │
     │    necesita la app TTLock.     │                              │
     ├───────────────────────────────►│                              │
     │                                │ sal-grant-access,             │
     │                                │ sal-remote-unlock, etc.       │
     │                                │  (valida SalPlanConfiguration │
     │                                │   por cada operación)         │
     │                                ├─────────────────────────────►│
     │                                │◄─────────────────────────────┤
     │◄───────────────────────────────┤                              │
```

## 4. Notas de Lectura

- La diferencia entre Fase 1 y Fase 2 está únicamente en el paso 1: quién y cómo se activa la suscripción (superadmin manual vs. autoservicio con Stripe). A partir de "Conecta tu proveedor de cerraduras", el flujo es idéntico.
- La rama de fallo de asignación de pool (sección 3.2) es obligatoria de implementar desde el primer despliegue del flujo self-service: nunca debe dejarse `lock_integrations.status = 'connected'` sin que `testConnection()` haya confirmado éxito contra el shard asignado (`rules-40-ttlock-cloud-provider.md` §4.6).
- Los pasos 5 y 6 ocurren fuera de la web de SmartRoom Rental, en la app oficial TTLock, usando las credenciales del shard (no las del cliente final).
- A partir del paso 8, el admin no necesita volver a abrir la app TTLock.
- Los pasos 7 y 9 incluyen validación de `SalPlanConfiguration` (`rules-21-subscription-plan-configuration.md`): un cliente no puede sincronizar más cerraduras de las que su plan permite, ni usar capacidades (unlock remoto, etc.) que su plan no incluya.
- Si el cliente ya tenía cerraduras en su propia cuenta TTLock, el paso 5-6 se sustituye por el flujo de "transferencia de propiedad" documentado en `rules-40-ttlock-cloud-provider.md` §4.3.

## 5. Dependencias

- `skill-gateway-onboarding.md`
- `skill-shard-management.md`
- `rules-40-ttlock-cloud-provider.md` (incluida §4.6, fallo de asignación)
- `rules-21-subscription-plan-configuration.md`
- `test-cloud-mvp-e2e-spec.md`
- `test-shard-capacity-spec.md`

## 6. Limitaciones

Este diagrama no representa el detalle de reintentos con backoff en la rama de fallo (ver `rules-90-observability-and-failure-handling.md` para la política general de reintentos).
