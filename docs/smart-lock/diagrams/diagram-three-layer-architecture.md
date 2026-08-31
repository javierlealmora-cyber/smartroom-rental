# diagram-three-layer-architecture.md — Arquitectura de Tres Capas de SmartLock

## 1. Propósito

Mostrar las tres capas que componen SmartLock (Core, Add-on, Gateway físico), la dirección permitida de las relaciones de datos, y por qué el SDK BLE no puede ejecutarse en la nube.

## 2. Alcance

Cubre:
- Las tres capas y sus responsabilidades.
- La dirección de las FKs entre Core y Add-on.
- La frontera física entre la nube y el gateway BLE.

No cubre:
- El detalle de mensajes MQTT (ver `diagram-ble-gateway-topology.md`).
- El flujo paso a paso de onboarding (ver `diagram-cloud-onboarding-flow.md`).

## 3. Diagrama

```
┌──────────────────────────────────────────────────────────────────┐
│  CAPA 0 — CORE SMARTROOM RENTAL                                  │
│  rooms · accommodations · lodgers · entities · client_accounts   │
│                                                                    │
│  ⛔ CERO columnas "lock_*"     ⛔ CERO FKs hacia lock_*           │
└───────────────────────────────┬──────────────────────────────────┘
                                 │  FK permitida SOLO en este sentido
                                 │  (lock_placements.room_id → rooms.id)
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  CAPA 2 — SMARTLOCK ADD-ON (Supabase Edge + UI React)             │
│                                                                    │
│  Tablas: lock_integrations · locks · lock_placements ·            │
│          lock_access_actors/groups/grants · lock_credentials ·    │
│          lock_records · lock_provider_pools · lock_gateways       │
│                                                                    │
│  Edge Functions: sal-* (26+)                                      │
│  Providers: ILockProvider → ttlock (cloud) | ttlock_ble (local)   │
│  Gating: saas_service_subscriptions = 'smart_access_lock'         │
└───────────────┬───────────────────────────────┬──────────────────┘
                │ HTTPS (OAuth REST)             │ HTTPS + MQTT (saliente)
                ▼                                ▼
  ┌─────────────────────────┐      ┌──────────────────────────────┐
  │  TTLock Cloud            │      │  CAPA 1 — Gateway físico      │
  │  (Open Platform)         │      │  (solo si provider=ttlock_ble)│
  │  Gestiona shards/subctas │      │  Raspberry Pi + BLE dongle    │
  │  Habla BLE con gateway   │      │  Docker: ttlock-sdk-js +      │
  │  G2 del cliente          │      │  cliente MQTT + SQLite local  │
  └──────────┬───────────────┘      └───────────────┬───────────────┘
             │ BLE (proximidad física, gestionado    │ BLE (proximidad física,
             │ por TTLock, fuera de nuestro control) │ gestionado por nuestro SDK)
             ▼                                        ▼
     ┌───────────────┐                        ┌───────────────┐
     │ Gateway G2     │                        │ Cerraduras     │
     │ (TTLock)       │                        │ físicas        │
     │      │         │                        │ (PLDT190, etc.)│
     │      ▼         │                        └───────────────┘
     │ Cerraduras     │
     │ físicas        │
     └───────────────┘
```

## 4. Notas de Lectura

- La flecha entre Core y Add-on solo existe en un sentido: el Add-on puede leer/referenciar el Core, nunca al revés.
- El Gateway físico (Capa 1) **no existe** cuando el cliente usa el provider `ttlock` cloud — en ese caso, el propio gateway G2 de TTLock cumple ese rol, pero es gestionado por la infraestructura de TTLock, no por SmartRoom Rental.
- La conexión BLE siempre es local: ningún servidor remoto puede saltarse el salto físico de radio de corto alcance.

## 5. Dependencias

- `rules-00-scope-and-principles.md`
- `rules-10-provider-model.md`
- `rules-30-schema-isolation.md`

## 6. Limitaciones

Este diagrama es conceptual y no representa el detalle de despliegue de red (VPC, firewalls, balanceadores). Para el detalle de comunicación MQTT, ver `diagram-ble-gateway-topology.md`.
