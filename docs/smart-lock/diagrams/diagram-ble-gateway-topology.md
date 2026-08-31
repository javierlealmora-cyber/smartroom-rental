# diagram-ble-gateway-topology.md — Topología de Comunicación del Gateway BLE

## 1. Propósito

Visualizar los topics MQTT y las llamadas HTTPS entre el gateway físico BLE y la cloud de SmartRoom Rental, y la dirección obligatoria de cada conexión.

## 2. Alcance

Cubre la Fase 2 (`ttlock_ble`). No cubre el flujo cloud (`ttlock`), documentado en `diagram-cloud-onboarding-flow.md`.

## 3. Diagrama

```
┌─────────────────────────────────────────┐         ┌──────────────────────────────────┐
│  GATEWAY FÍSICO (casa del cliente)      │         │  SUPABASE / BROKER MQTT (cloud)   │
│  Raspberry Pi + dongle BLE               │         │                                    │
│                                           │         │                                    │
│  ┌─────────────────────────────────┐    │         │  ┌──────────────────────────────┐  │
│  │ Daemon Docker                    │    │         │  │ Edge Functions sal-gateway-* │  │
│  │  - ttlock-sdk-js (BLE)           │    │         │  │  - register                  │  │
│  │  - Cliente MQTT (TLS)            │────┼─────────┼─►│  - store-lockdata (HTTPS)     │  │
│  │  - SQLite local (cache)          │    │ saliente│  │  - get-lockdata (HTTPS)        │  │
│  └─────────────────────────────────┘    │ siempre │  └──────────────────────────────┘  │
│              │                           │         │                                    │
│              │ BLE (proximidad física)   │         │  ┌──────────────────────────────┐  │
│              ▼                           │         │  │ Broker MQTT (TLS)             │  │
│  ┌─────────────────────────┐            │         │  │                                │  │
│  │ Cerraduras físicas       │            │         │  │  Topics:                       │  │
│  │ (PLDT190, etc.)          │            │◄────────┼──┤   sal/{gw_id}/cmd/#  (sub)     │  │
│  └─────────────────────────┘            │  MQTT   │  │   sal/{gw_id}/heartbeat (pub)  │  │
│                                           │ persist.│  │   sal/{gw_id}/cmd_result (pub) │  │
│                                           │         │  │   sal/{gw_id}/evt/* (pub)      │  │
│                                           │         │  │   sal/{gw_id}/telemetry (pub)  │  │
│                                           │         │  └──────────────┬───────────────┘  │
│                                           │         │                 │                    │
│                                           │         │                 ▼                    │
│                                           │         │  ┌──────────────────────────────┐  │
│                                           │         │  │ Puente de ingesta MQTT         │  │
│                                           │         │  │  → lock_records                │  │
│                                           │         │  │  → lock_sync_commands           │  │
│                                           │         │  │  → lock_gateways (telemetría)   │  │
│                                           │         │  └──────────────────────────────┘  │
└───────────────────────────────────────────┘         └────────────────────────────────────┘

Regla de dirección: TODAS las flechas de conexión se originan en el Gateway.
Supabase NUNCA abre una conexión hacia el Gateway.
```

## 4. Notas de Lectura

- El único canal HTTPS síncrono es el de `store-lockdata` / `get-lockdata`; todo lo demás va por MQTT.
- El "Puente de ingesta MQTT" es el componente (Edge Function o servicio suscrito) que traduce mensajes MQTT en escrituras a tablas `lock_*`.
- Cuando el gateway está offline, los comandos emitidos por el backend quedan en `lock_sync_commands` con estado `pending` hasta que el gateway reconecte y los reciba vía `sal/{gw_id}/cmd/#`.

## 5. Dependencias

- `rules-60-gateway-communication.md`
- `contract-gateway-command.md`, `contract-gateway-event.md`, `contract-vault-lockdata.md`

## 6. Limitaciones

Este diagrama no detalla el mecanismo interno del broker (clustering, HA). La elección concreta de proveedor de broker (HiveMQ Cloud, Mosquitto propio) es una decisión operativa que puede cambiar sin afectar este diagrama.
