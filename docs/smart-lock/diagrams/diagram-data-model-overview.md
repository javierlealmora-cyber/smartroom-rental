# diagram-data-model-overview.md — Vista General del Modelo de Datos

## 1. Propósito

Mostrar las tablas principales de SmartLock, sus relaciones internas, y sus puntos de conexión (unidireccional) hacia el Core.

## 2. Alcance

Cubre las tablas descritas en `rules-30-schema-isolation.md`. No detalla columnas exhaustivas; solo relaciones clave.

## 3. Diagrama

```
                    ┌───────────────────────┐
                    │   CORE (solo lectura)  │
                    │ rooms · accommodations │
                    │ common_areas · lodgers │
                    │ lodger_room_assignments│
                    └───────────▲────────────┘
                                │  FK (SAL → Core, único sentido permitido)
                                │
┌───────────────────────────────┴──────────────────────────────────────┐
│                         SMARTLOCK (lock_*)                           │
│                                                                        │
│  lock_provider_pools ──┐                                              │
│  lock_provider_pool_   │                                              │
│    assignments ────────┼──► lock_integrations ──► locks               │
│                         │         │                    │              │
│  lock_gateways ─────────┼─────────┘                    │              │
│    │                    │                               │              │
│    ├─► lock_gateway_    │                               ├─► lock_placements ──► (rooms/accommodations/common_areas)
│    │     links          │                               │
│    └─► lock_gateway_    │                               ├─► lock_credentials
│          claim_sessions │                               │
│                         │                               ├─► lock_records
│  lock_access_actors ────┼──► lock_access_group_members ─┤
│         │                │           │                   ├─► lock_sync_commands
│         │                │           ▼                   │
│         └────────────────┼──► lock_access_groups         └─► lock_notifications
│                          │           │
│                          │           ▼
│                          │   lock_access_group_scopes
│                          │           │
│                          │           ▼
│                          └──► lock_access_grants ──► (actor, lock, vigencia)
│
│  lock_claim_sessions (reclamación inicial de una cerradura descubierta)
└────────────────────────────────────────────────────────────────────┘
```

## 4. Notas de Lectura

- Las únicas flechas que cruzan hacia el Core apuntan desde `lock_placements` (hacia `rooms`/`accommodations`/`common_areas`) — nunca al revés.
- `lock_access_grants` es el resultado del acceso efectivo: unión de los scopes de todos los grupos a los que pertenece un actor.
- `lock_provider_pools` / `lock_provider_pool_assignments` solo tienen filas relevantes cuando `lock_integrations.provider = 'ttlock'`.
- `lock_gateways` / `lock_gateway_links` solo tienen filas relevantes cuando `lock_integrations.provider = 'ttlock_ble'`.

## 5. Dependencias

- `rules-30-schema-isolation.md`
- `rules-10-provider-model.md`

## 6. Limitaciones

Este diagrama omite columnas de auditoría estándar (`created_at`, `updated_at`, `client_account_id`) presentes en todas las tablas, por brevedad visual.
