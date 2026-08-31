# diagram-shard-model.md — Modelo de Shards del Provider Cloud

## 1. Propósito

Visualizar cómo se agrupan los clientes de SmartRoom Rental dentro de sub-cuentas ("shards") de TTLock, y cómo se traduce esa jerarquía a las tablas de base de datos.

## 2. Alcance

Cubre exclusivamente el provider `ttlock` cloud. No aplica al provider `ttlock_ble`.

## 3. Diagrama

```
TTLock Open Platform
│
├── Developer "SmartRoom Rental"
│    (TTLOCK_CLIENT_ID / TTLOCK_CLIENT_SECRET — Supabase secrets)
│
│    ┌─────────────────────────────────────────────────────────┐
│    │ Shard 01 — srr-shard-01@smartroomrental.com              │
│    │  lock_provider_pools.id = <uuid-shard-01>                │
│    │  vault_key_ref → { email, password, access_token }       │
│    │  current_locks_count = 300 / max_locks = 500              │
│    │                                                            │
│    │  Clientes asignados (lock_provider_pool_assignments):     │
│    │   - client_account A → lock_integrations (provider=ttlock)│
│    │       └── locks: 2 cerraduras (habitación 3, entrada)     │
│    │   - client_account B → lock_integrations (provider=ttlock)│
│    │       └── locks: 5 cerraduras                              │
│    └─────────────────────────────────────────────────────────┘
│
│    ┌─────────────────────────────────────────────────────────┐
│    │ Shard 02 — srr-shard-02@smartroomrental.com              │
│    │  current_locks_count = 100 / max_locks = 500              │
│    │  Clientes asignados: client_account C                     │
│    └─────────────────────────────────────────────────────────┘
│
│    (Shard nuevo se aprovisiona automáticamente al superar 80% de ocupación)
```

## 4. Notas de Lectura

- Cada shard es una cuenta TTLock real, indistinguible para TTLock de una cuenta de usuario normal.
- Un `client_account` nunca ve el nombre del shard directamente salvo durante el flujo de onboarding (para configurar la app TTLock).
- La ocupación se mide en `current_locks_count / max_locks`; el balanceo prioriza el shard con menor ocupación relativa.

## 5. Dependencias

- `rules-40-ttlock-cloud-provider.md`
- `skill-shard-management.md`
- `test-shard-capacity-spec.md`

## 6. Limitaciones

Este diagrama no representa el flujo de creación de un shard nuevo paso a paso (ver `skill-shard-management.md`, Paso 1).
