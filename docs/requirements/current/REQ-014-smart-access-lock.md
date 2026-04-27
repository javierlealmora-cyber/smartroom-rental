# REQ-014: SmartAccessLock — Módulo de Acceso Inteligente

**Estado:** 🟡 En diseño  
**Última actualización:** 2026-04-12  
**Versión:** 1.2  
**Autor:** Solution Architecture  
**Depende de:** REQ-013 (SaaS Services Catalog)

---

## Objetivo

Gestionar accesos inteligentes en alojamientos mediante cerraduras físicas conectadas: entradas, habitaciones y zonas comunes. El sistema es agnóstico al proveedor de hardware — el proveedor inicial es TTLock.

---

## Principios de Diseño

| Principio | Decisión |
|-----------|----------|
| Vendor-agnostic | Tablas genéricas con campo `provider = 'ttlock'` |
| No-provisioning desde web | La web NO da de alta locks nuevas; solo sincroniza las existentes del proveedor |
| Add-on independiente | No modifica planes principales; se contrata aparte |
| Backend primero | Toda lógica crítica en Edge Functions; no llamadas directas del frontend al proveedor |
| Responsive | Desktop, tablet y móvil desde v1 |
| Sin dependencia de webhooks | Polling periódico vía **n8n** como mecanismo primario; pg_cron solo como fallback técnico si n8n no disponible; webhooks como mejora futura |

---

## Alcance

### Incluye
- Gestión del catálogo SaaS para SmartAccessLock (superadmin) → ver REQ-013
- Contratación y billing del add-on (client_account)
- Conexión con proveedor de locks (TTLock en Fase 1)
- Sincronización de locks existentes (manual + periódica)
- Definición de estructura de accesos (accommodation entry, rooms, common areas)
- Gestión de zonas comunes (`common_areas`)
- Múltiples locks por habitación/zona/entrada (con propósito y reglas de auto-asignación)
- Actores no-inquilinos (owner, manager, cleaning, maintenance, etc.)
- Grupos de acceso con scopes jerárquicos
- Acceso efectivo acumulado de grupos para cada actor
- Auto-grants para inquilinos al asignar habitación
- Auto-revocación al hacer checkout
- Credenciales (PIN, tarjeta, app key) con trazabilidad completa
- Notificaciones por email (Fase 1); SMS/WhatsApp futuro
- Auditoría completa (lock_records sincronizados del proveedor)
- Unlock remoto si el proveedor lo soporta

### No Incluye
- Provisioning de cerraduras nuevas desde la web (se hace con app TTLock)
- Gestión de hardware físico
- Firma digital de contratos de acceso
- Control de cámaras o alarmas

---

## Actores del Sistema

| Actor | Descripción | Nivel |
|-------|-------------|-------|
| Superadmin | Gestiona catálogo, activa el servicio por cliente | Plataforma |
| Client Admin | Configura el módulo, gestiona actores y grupos | client_account |
| Inquilino (lodger) | Recibe credenciales automáticamente | lodger |
| Actor de acceso | Personal de limpieza, mantenimiento, agentes, etc. | client_account |

---

## FASE 1 — SUPERADMIN

### Objetivo
El superadmin puede crear SmartAccessLock como servicio SaaS, definir planes, activarlo para clientes y monitorizar su estado.

### Árbol de Pantallas (Superadmin)

```
/v2/superadmin/
  saas-servicios/                                    → Lista add-ons SaaS
    nuevo/                                           → Crear servicio (code=smart_access_lock)
    :serviceId/
      editar/                                        → Editar metadatos del servicio
      planes/                                        → CRUD planes + pricing
      features/                                      → Feature flags por plan
      visibilidad/                                   → Control visibilidad

  cuentas/:clientAccountId/
    smart-access/
      estado/                                        → Estado general del add-on para este cliente
      activacion/                                    → Activar / cambiar plan / suspender
      settings/                                      → Config global del módulo
```

### Feature Codes para SmartAccessLock

| feature_code | Descripción |
|---|---|
| `provider_integration` | Puede conectar proveedor de locks |
| `common_areas` | Puede crear zonas comunes |
| `multiple_locks_per_room` | Múltiples locks por habitación |
| `multiple_locks_per_area` | Múltiples locks por zona común |
| `actors` | Puede registrar actores no-inquilinos |
| `access_groups` | Puede crear grupos de acceso |
| `lodger_auto_grant` | Auto-grant al asignar habitación a inquilino |
| `group_auto_grant` | Auto-grant al añadir miembro a grupo |
| `remote_unlock` | Unlock remoto desde la web |
| `audit_logs` | Acceso a logs de auditoría |
| `notifications_email` | Notificaciones por email |
| `notifications_sms` | Notificaciones SMS (futuro) |
| `notifications_whatsapp` | Notificaciones WhatsApp (futuro) |
| `max_locks` | Límite de locks (config.value = número) |
| `max_actors` | Límite de actores (config.value = número) |
| `max_groups` | Límite de grupos (config.value = número) |

### Vista por Cliente (Superadmin)

Pantalla `/v2/superadmin/cuentas/:id/smart-access/estado` muestra:
- Estado: contratado sí/no, plan activo, fecha activación
- Integración con proveedor: conectada sí/no, última sync
- Métricas: nº locks, nº actores, nº grupos, nº grants activos
- Incidencias recientes (sync errors, credential errors)

---

## CLIENT_ACCOUNT — Roadmap por fases

> **Decisión de roadmap cerrada:**
> - **Fase 1:** el cliente NO puede autoactivarse. Solo puede solicitar información. La activación la ejecuta el superadmin manualmente. Sin Stripe operativo.
> - **Fase 2:** contratación directa por el cliente, Stripe operativo, activación automatizada.
>
> Todo lo descrito en esta sección corresponde a Fase 1 salvo que se indique explícitamente `[Fase 2]`.

### Árbol de Pantallas (Admin Cliente)

```
/v2/admin/
  smart-access/
    /                                               → Overview / dashboard del módulo
    configuracion/                                   → Plan, billing, estado suscripción
    integracion/                                     → Conectar proveedor + sync manual
    estructura/                                      → Estructura de accesos visual
    zonas-comunes/                                   → CRUD common areas
    cerraduras/                                      → Lista de locks sincronizadas
      :lockId/                                       → Detalle lock + grants + logs
    actores/                                         → Lista actores no-inquilinos
      nuevo/                                         → Crear actor
      :actorId/                                      → Detalle actor + grupos + grants
    grupos/                                          → Lista grupos de acceso
      nuevo/                                         → Crear grupo
      :groupId/                                      → Detalle grupo + miembros + scopes
    accesos/                                         → Vista global de grants activos
    credenciales/                                    → Gestión de credenciales
    registros/                                       → Audit logs del proveedor
```

### Flujo UI Completo — Fase 2

#### Paso 1: Estado del servicio y solicitud

**Fase 1 — Pantalla:** `/v2/admin/smart-access/configuracion`
- Muestra estado actual: no contratado / plan activo / suspendido
- Si no contratado: botón "Solicitar información" → formulario de contacto o email a soporte
- **No hay botón "Contratar" funcional en Fase 1** — el cliente no puede autoactivarse
- Una vez activo (activado por superadmin): acceso al resto del módulo

**[Fase 2] — Contratación directa:**
- Botón "Contratar SmartAccessLock" → info del servicio + pricing + confirmación
- Si se confirma: llama `sal-activate-subscription` → crea `saas_service_subscriptions` + Stripe subscription item
- Una vez activo: acceso al resto del módulo

#### Paso 2: Conectar Proveedor
**Pantalla:** `/v2/admin/smart-access/integracion`
- Selector de proveedor (solo TTLock en Fase 1)
- Formulario de credenciales TTLock — 4 campos obligatorios:
  - App `client_id` (en claro)
  - App `client_secret` (cifrado en Vault)
  - Cuenta TTLock `username` / email (en claro)
  - Cuenta TTLock `password` (cifrado en Vault, se envía a TTLock como MD5)
- Botón "Conectar" → llama `sal-connect-integration` → valida con proveedor (ROPC) → guarda en `lock_integrations`
- Estado de conexión: 🟢 Conectado / 🔴 Error / 🟡 Desconectado
- Botón "Sincronizar ahora" → llama `sal-sync-locks` → actualiza `locks`
- Historial: última sync, nº locks sincronizadas, errores

#### Paso 3: Estructura de Accesos
**Pantalla:** `/v2/admin/smart-access/estructura`

Vista jerárquica responsive por alojamiento:
```
🏠 Nombre Alojamiento
  ├── 🚪 Entrada Principal
  │     └── [locks asignadas] + [+ Añadir lock]
  ├── 🛏 HAB-001 — Doble
  │     └── [locks asignadas] + [+ Añadir lock]
  ├── 🛏 HAB-002 — Individual
  │     └── [locks asignadas] + [+ Añadir lock]
  └── 🏛 Zonas Comunes
        ├── Lavandería → [locks]
        └── Cuarto bicicletas → [locks]
```

Para cada lock asignada se puede ver/editar:
- `lock_purpose`: entry_door | parcel_locker | safe_box | common_area_entry | storage_lock | custom
- `auto_assign_to_lodger`: toggle sí/no
- `display_name`: nombre personalizado
- Botón "Desvincular"

Modal "Añadir lock":
- Select de locks sincronizadas disponibles (las que no están ya asignadas)
- Seleccionar propósito
- Toggle auto-asignar a inquilinos

#### Paso 4: Zonas Comunes
**Pantalla:** `/v2/admin/smart-access/zonas-comunes`
- Lista de common_areas del alojamiento seleccionado
- Crear: nombre, tipo (laundry, bicycle_room, luggage_room, storage, gym, terrace, parking, custom)
- Editar / desactivar
- Ver locks asociadas → link a estructura

#### Paso 5: Gestión de Cerraduras
**Pantalla:** `/v2/admin/smart-access/cerraduras`
- Lista con: nombre, modelo, batería, estado online, ubicación asignada, grants activos
- Toggle vista cards/tabla
- Filtros: por alojamiento, por estado, por propósito

**Pantalla detalle:** `/v2/admin/smart-access/cerraduras/:lockId`
- Info técnica (modelo, firmware, batería, última vez online)
- Ubicación actual (placement)
- Grants activos sobre esta lock
- Credenciales activas
- Botón "Unlock remoto" (si `supports_remote_unlock = true`)
- Historial de eventos (lock_records)

#### Paso 6: Actores
**Pantalla:** `/v2/admin/smart-access/actores`
- Lista: nombre, tipo, grupos a los que pertenece, nº grants activos, estado
- Crear actor: full_name, email, phone, actor_type, notas

**Pantalla detalle:** `/v2/admin/smart-access/actores/:actorId`
- Datos del actor
- Grupos a los que pertenece (con vigencia)
- Grants activos (resultado del acceso efectivo de los grupos)
- Botón "Revocar todos los accesos"
- Botón "Reenviar credenciales"
- Historial de notificaciones

#### Paso 7: Grupos de Acceso
**Pantalla:** `/v2/admin/smart-access/grupos`
- Lista: nombre, tipo de actor, nº miembros, nº scopes, estado

**Pantalla detalle:** `/v2/admin/smart-access/grupos/:groupId`
- Info del grupo + política de credencial (tipo, validez, auto-renew)
- **Tab Miembros:** lista actores, botón añadir/quitar, vigencia por miembro
- **Tab Scopes:** qué tiene acceso el grupo (por alojamiento/habitación/zona/lock)
  - Selector jerárquico: Alojamiento → Habitación / Zona común / Lock concreta
  - Política de horario (time_policy): días + horas si aplica
- **Tab Acceso Efectivo:** vista resumen de todas las locks a las que tiene acceso el grupo
- **Tab Historial:** cambios recientes en el grupo

**Regla acceso efectivo:** Si un actor está en grupos A y B, sus grants = UNIÓN de scopes de A + B.

#### Paso 8: Alta Inquilino — Auto-Grant
Cuando se asigna habitación a un inquilino (`lodger_room_assignments` INSERT):

> **Implementación en Fase 1:** Supabase Database Webhook sobre `lodger_room_assignments` (evento INSERT) → llama `sal-process-room-assignment` automáticamente, sin intervención del frontend.  
> **Alternativa técnica:** trigger SQL con `pg_net` en migración `20260412000007`.

1. DB Webhook / trigger POST → `sal-process-room-assignment` con `{ lodger_room_assignment_id }`
2. Edge Function verifica que SmartAccessLock está activo para el cliente
3. Resuelve locks con `auto_assign_to_lodger = true` para:
   - Entrada del alojamiento (`placement_type='accommodation_entry'`)
   - Habitación asignada (`placement_type='room'`)
4. Para cada lock: crea `lock_access_grants` + llama TTLock API para emitir PIN → `lock_credentials`
5. Envía email con hint de credencial al inquilino → `lock_notifications`
6. Si la credencial no se puede crear (p. ej., sin gateway activo): `lock_credentials.provider_sync_status = 'error'`; n8n reconciliará

> **Nota:** para nuestra implementación web cloud-first de Fase 1, la creación remota de credenciales requiere un gateway activo. TTLock también soporta esta operación vía app/BLE/SDK, pero esas vías no forman parte de Fase 1. El inquilino recibirá aviso de que sus credenciales están pendientes de sincronización.

#### Paso 9: Checkout — Auto-Revocación
Cuando se registra `move_out_date` en `lodger_room_assignments` (UPDATE de NULL a valor):

> **Implementación en Fase 1:** Supabase Database Webhook sobre `lodger_room_assignments` (evento UPDATE de `move_out_date`) → llama `sal-process-checkout` automáticamente, sin intervención del frontend.  
> **Alternativa técnica:** trigger SQL con `pg_net` (`after_move_out_set`) en migración `20260412000007`.  
> **Revocación inmediata:** aunque `move_out_date` sea en el futuro, los accesos se revocan en el momento en que se registra.

1. DB Webhook / trigger POST → `sal-process-checkout` con `{ lodger_room_assignment_id }`
2. Edge Function busca todos `lock_access_grants` activos del lodger (`status='active'`)
3. Para cada grant: llama TTLock API para revocar credencial (`deleteType=1` con gateway disponible, `=2` solo en cloud si no hay gateway)
4. Actualiza `lock_credentials.status = 'revoked'` + `lock_access_grants.status = 'revoked'`
5. Envía notificación de revocación al inquilino → `lock_notifications`
6. Si la revocación física falla (nuestra implementación Fase 1 requiere gateway para `deleteType=1`): revocación en BD completada inmediatamente; n8n completa la revocación física cuando el gateway esté disponible. TTLock también permite revocar físicamente vía app/BLE, pero esa vía no forma parte de Fase 1.

#### Paso 10: Operativa Diaria
**Accesos** (`/v2/admin/smart-access/accesos`):
- Vista global de todos los grants activos: por lodger o por actor
- Acciones: revocar, renovar, reenviar credenciales

**Credenciales** (`/v2/admin/smart-access/credenciales`):
- Lista filtrable: por persona, por lock, por estado, por tipo
- Acciones: revocar, reenviar, ver PIN (si autorizado)
- Indicador de sync con proveedor

**Registros** (`/v2/admin/smart-access/registros`):
- Log de eventos del proveedor (unlock, failed_attempt, battery_low, etc.)
- Filtros: por lock, por fecha, por tipo de evento
- Indicador "último sync hace X minutos"

---

## MODELO SQL COMPLETO

> **Versión canónica de migraciones:** La única versión válida de `20260412000006_sal_corrections.sql` es la que endurece la policy de `saas_services` a `status = 'active' AND visible_in_catalog = true`. Cualquier revisión anterior que usara `status != 'draft'` o `USING (true)` queda obsoleta y no debe aplicarse. El SQL del bloque `lock_notifications` de este REQ usa `profiles(id)`, alineado con la migración `20260412000003` ya corregida.

### `lock_integrations`
```sql
CREATE TABLE public.lock_integrations (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id         uuid        NOT NULL REFERENCES public.client_accounts(id),
  provider                  text        NOT NULL DEFAULT 'ttlock',
  status                    text        NOT NULL DEFAULT 'disconnected'
                            CHECK (status IN ('connected','disconnected','error','syncing')),
  provider_account_id       text,
  provider_client_id        text,
  -- Credenciales cifradas (usar Supabase Vault o cifrado en Edge Function)
  provider_credentials      jsonb,
  -- Webhooks (futuro)
  webhook_configured        boolean     NOT NULL DEFAULT false,
  webhook_url               text,
  webhook_secret            text,
  -- Sync state
  last_sync_at              timestamptz,
  last_sync_status          text        CHECK (last_sync_status IN ('success','partial','error')),
  last_sync_error           text,
  locks_synced_count        int         NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_account_id, provider)
);
```

### `locks`
```sql
CREATE TABLE public.locks (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id         uuid        NOT NULL REFERENCES public.client_accounts(id),
  lock_integration_id       uuid        NOT NULL REFERENCES public.lock_integrations(id),
  provider                  text        NOT NULL,
  provider_lock_id          text        NOT NULL,
  name                      text        NOT NULL,
  display_name              text,
  model                     text,
  -- Estado (sincronizado del proveedor)
  battery_level             int         CHECK (battery_level BETWEEN 0 AND 100),
  is_online                 boolean     NOT NULL DEFAULT false,
  last_seen_at              timestamptz,
  firmware_version          text,
  -- Capacidades
  supports_remote_unlock    boolean     NOT NULL DEFAULT false,
  supports_auto_lock        boolean     NOT NULL DEFAULT false,
  supports_passage_mode     boolean     NOT NULL DEFAULT false,
  -- Datos raw del proveedor
  raw_data                  jsonb,
  synced_at                 timestamptz,
  is_active                 boolean     NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lock_integration_id, provider_lock_id)
);
```

### `common_areas`
```sql
CREATE TABLE public.common_areas (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id         uuid        NOT NULL REFERENCES public.client_accounts(id),
  accommodation_id          uuid        NOT NULL REFERENCES public.accommodations(id),
  name                      text        NOT NULL,
  area_type                 text        NOT NULL DEFAULT 'custom'
                            CHECK (area_type IN (
                              'laundry','bicycle_room','luggage_room','storage',
                              'gym','terrace','parking','kitchen','common_room','custom'
                            )),
  description               text,
  is_active                 boolean     NOT NULL DEFAULT true,
  sort_order                int         NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
```

### `lock_placements`
```sql
CREATE TABLE public.lock_placements (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id         uuid        NOT NULL REFERENCES public.client_accounts(id),
  lock_id                   uuid        NOT NULL REFERENCES public.locks(id),
  -- Dónde está colocada la lock
  placement_type            text        NOT NULL
                            CHECK (placement_type IN ('accommodation_entry','room','common_area')),
  accommodation_id          uuid        REFERENCES public.accommodations(id),
  room_id                   uuid        REFERENCES public.rooms(id),
  common_area_id            uuid        REFERENCES public.common_areas(id),
  -- Propósito
  lock_purpose              text        NOT NULL DEFAULT 'entry_door'
                            CHECK (lock_purpose IN (
                              'entry_door','parcel_locker','safe_box',
                              'common_area_entry','storage_lock','custom'
                            )),
  display_name              text,
  -- Reglas de asignación (DEFAULT false — la UI sugiere true solo para lock_purpose='entry_door')
  auto_assign_to_lodger     boolean     NOT NULL DEFAULT false,
  -- Meta
  sort_order                int         NOT NULL DEFAULT 0,
  notes                     text,
  is_active                 boolean     NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  -- Validación: los campos correctos deben estar rellenos según placement_type
  CONSTRAINT lock_placements_type_coherence CHECK (
    (placement_type = 'accommodation_entry' AND accommodation_id IS NOT NULL AND room_id IS NULL AND common_area_id IS NULL) OR
    (placement_type = 'room' AND room_id IS NOT NULL AND accommodation_id IS NOT NULL AND common_area_id IS NULL) OR
    (placement_type = 'common_area' AND common_area_id IS NOT NULL AND accommodation_id IS NOT NULL AND room_id IS NULL)
  )
);

-- Solución canónica: índice único parcial (no EXCLUDE/btree_gist — ver migración 20260412000002)
-- Una lock activa solo puede tener un placement activo a la vez
-- CREATE UNIQUE INDEX idx_lock_placements_one_active ON public.lock_placements (lock_id) WHERE is_active = true;
```

### `lock_access_actors`
```sql
CREATE TABLE public.lock_access_actors (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id         uuid        NOT NULL REFERENCES public.client_accounts(id),
  actor_type                text        NOT NULL
                            CHECK (actor_type IN (
                              'owner','manager','leasing_agent',
                              'cleaning','maintenance','service_company','custom'
                            )),
  full_name                 text        NOT NULL,
  email                     text,
  phone                     text,
  notes                     text,
  is_active                 boolean     NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
```

### `lock_access_groups`
```sql
CREATE TABLE public.lock_access_groups (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id         uuid        NOT NULL REFERENCES public.client_accounts(id),
  name                      text        NOT NULL,
  description               text,
  -- Clasificación del grupo (añadido en migración 000006)
  group_type                text        NOT NULL DEFAULT 'custom'
                            CHECK (group_type IN (
                              'leasing_agent','cleaning','maintenance',
                              'service_company','owner','custom'
                            )),
  -- Política de credencial por defecto para este grupo
  -- type: 'pin'|'card'|'app_key'|'qr'
  -- validity: 'permanent'|'time_limited'|'single_use'
  -- validity_days: número (si time_limited)
  -- auto_renew: boolean
  credential_policy         jsonb       NOT NULL DEFAULT '{
    "type": "pin",
    "validity": "permanent",
    "auto_renew": false
  }'::jsonb,
  is_active                 boolean     NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
```

### `lock_access_group_members`
```sql
CREATE TABLE public.lock_access_group_members (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_access_group_id      uuid        NOT NULL REFERENCES public.lock_access_groups(id),
  lock_access_actor_id      uuid        NOT NULL REFERENCES public.lock_access_actors(id),
  valid_from                timestamptz NOT NULL DEFAULT now(),
  valid_to                  timestamptz,
  is_active                 boolean     NOT NULL DEFAULT true,
  added_by                  text,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lock_access_group_id, lock_access_actor_id)
);
```

### `lock_access_group_scopes`
```sql
CREATE TABLE public.lock_access_group_scopes (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_access_group_id      uuid        NOT NULL REFERENCES public.lock_access_groups(id),
  client_account_id         uuid        NOT NULL REFERENCES public.client_accounts(id),
  -- Qué tiene acceso el grupo
  scope_type                text        NOT NULL
                            CHECK (scope_type IN (
                              'all_accommodations','accommodation','room','common_area','lock'
                            )),
  accommodation_id          uuid        REFERENCES public.accommodations(id),
  room_id                   uuid        REFERENCES public.rooms(id),
  common_area_id            uuid        REFERENCES public.common_areas(id),
  lock_id                   uuid        REFERENCES public.locks(id),
  -- Restricciones de horario (dependiente del proveedor para enforcement)
  -- {days: ["mon","tue","wed","thu","fri"], hours: {from: "08:00", to: "18:00"}}
  time_policy               jsonb,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lock_group_scopes_type_coherence CHECK (
    (scope_type = 'all_accommodations') OR
    (scope_type = 'accommodation' AND accommodation_id IS NOT NULL) OR
    (scope_type = 'room' AND room_id IS NOT NULL) OR
    (scope_type = 'common_area' AND common_area_id IS NOT NULL) OR
    (scope_type = 'lock' AND lock_id IS NOT NULL)
  )
);
```

### `lock_access_grants`
```sql
CREATE TABLE public.lock_access_grants (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id               uuid        NOT NULL REFERENCES public.client_accounts(id),
  -- Quién tiene el acceso (lodger_id apunta a profiles, no a una tabla lodgers — eliminada)
  grant_type                      text        NOT NULL CHECK (grant_type IN ('lodger','actor')),
  lodger_id                       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  lock_access_actor_id            uuid        REFERENCES public.lock_access_actors(id),
  -- Origen del grant (para actores vía grupos)
  lock_access_group_id            uuid        REFERENCES public.lock_access_groups(id),
  lock_access_group_member_id     uuid        REFERENCES public.lock_access_group_members(id),
  -- A qué lock
  lock_id                         uuid        NOT NULL REFERENCES public.locks(id),
  lock_placement_id               uuid        REFERENCES public.lock_placements(id),
  -- Vigencia
  valid_from                      timestamptz NOT NULL DEFAULT now(),
  valid_to                        timestamptz,
  -- Estado
  status                          text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','active','revoked','expired')),
  -- Trazabilidad del origen
  source_type                     text        NOT NULL
                                  CHECK (source_type IN ('room_assignment','group_membership','manual')),
  source_id                       uuid,
  -- Revocación
  revoked_at                      timestamptz,
  revoked_by                      text,
  revoke_reason                   text,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lock_grants_actor_xor CHECK (
    (grant_type = 'lodger' AND lodger_id IS NOT NULL AND lock_access_actor_id IS NULL) OR
    (grant_type = 'actor' AND lock_access_actor_id IS NOT NULL AND lodger_id IS NULL)
  )
);
```

### `lock_credentials`
```sql
CREATE TABLE public.lock_credentials (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  lock_access_grant_id        uuid        NOT NULL REFERENCES public.lock_access_grants(id),
  lock_id                     uuid        NOT NULL REFERENCES public.locks(id),
  -- Credencial
  credential_type             text        NOT NULL
                              CHECK (credential_type IN ('pin','card','app_key','qr','remote_only')),
  -- ⚠️ SEGURIDAD CRÍTICA: credential_value DEBE estar cifrado a nivel de aplicación
  -- Usar Supabase Vault o cifrado AES en Edge Function antes de persistir
  credential_value            text,
  provider_credential_id      text,
  -- Ciclo de vida
  status                      text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','active','revoked','expired')),
  issued_at                   timestamptz,
  expires_at                  timestamptz,
  revoked_at                  timestamptz,
  -- Sync con proveedor
  provider_sync_status        text        NOT NULL DEFAULT 'pending'
                              CHECK (provider_sync_status IN ('synced','pending','error')),
  provider_synced_at          timestamptz,
  provider_sync_error         text,
  provider_sync_retries       int         NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
```

### `lock_records`
```sql
CREATE TABLE public.lock_records (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  lock_id                     uuid        NOT NULL REFERENCES public.locks(id),
  lock_credential_id          uuid        REFERENCES public.lock_credentials(id),
  -- Evento
  event_type                  text        NOT NULL
                              CHECK (event_type IN (
                                'unlock','lock','failed_attempt','battery_low',
                                'online','offline','tamper','door_open','door_close'
                              )),
  event_at                    timestamptz NOT NULL,
  actor_description           text,
  -- Deduplicación: provider_record_id evita registros duplicados en syncs repetidas
  provider_record_id          text        NOT NULL,
  raw_data                    jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lock_id, provider_record_id)
);
```

### `lock_notifications`
```sql
CREATE TABLE public.lock_notifications (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  lock_access_actor_id        uuid        REFERENCES public.lock_access_actors(id),
  -- lodger_id apunta a profiles (tabla lodgers eliminada — ver migración 000003)
  lodger_id                   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  lock_credential_id          uuid        REFERENCES public.lock_credentials(id),
  -- Destinatario
  recipient_email             text,
  recipient_phone             text,
  -- Contenido
  notification_type           text        NOT NULL
                              CHECK (notification_type IN (
                                'credential_issued','credential_expiring','credential_revoked',
                                'access_denied','service_activated','sync_error'
                              )),
  channel                     text        NOT NULL DEFAULT 'email'
                              CHECK (channel IN ('email','sms','whatsapp','push','ui')),
  template_code               text        NOT NULL,
  payload                     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Estado
  status                      text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','sent','failed','cancelled')),
  sent_at                     timestamptz,
  retry_count                 int         NOT NULL DEFAULT 0,
  last_error                  text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
```

---

## EDGE FUNCTIONS (Backend)

| Función | Trigger | Descripción |
|---------|---------|-------------|
| `sal-activate-subscription` | Superadmin manual | Activa add-on para client_account; crea Stripe item |
| `sal-connect-integration` | Admin cliente | Valida credenciales del proveedor y guarda `lock_integrations` |
| `sal-sync-locks` | Manual o **n8n** (cada 4h) | Obtiene locks del proveedor y upserta en `locks` |
| `sal-sync-lock-records` | Manual o **n8n** (cada 5min) | Obtiene eventos del proveedor y upserta en `lock_records` |
| `sal-place-lock` | Admin cliente | Crea/actualiza `lock_placements` |
| `sal-grant-access` | Varios | Crea `lock_access_grants` + credencial en proveedor + `lock_credentials` |
| `sal-revoke-access` | Varios | Revoca grants + credenciales en proveedor + actualiza registros |
| `sal-renew-credential` | Manual o **n8n** (diario) | Renueva credencial próxima a expirar |
| `sal-process-room-assignment` | DB Webhook post-insert `lodger_room_assignments` | Auto-grant a inquilino (locks auto_assign_to_lodger=true) |
| `sal-process-checkout` | DB Webhook post-update `move_out_date` | Auto-revocación de todos los grants del inquilino |
| `sal-process-group-change` | Post-cambio en grupo/scope/miembro | Recalcula acceso efectivo del actor; emite/revoca credenciales |
| `sal-remote-unlock` | Admin cliente | Unlock remoto vía API del proveedor |
| `sal-send-notification` | Interno | Envía email (Fase 1) y guarda en `lock_notifications` |
| `sal-reconcile-credentials` | **n8n** (cada 1h); pg_cron solo como fallback | Compara grants activos vs proveedor; reintenta pending; detecta desincronías |

---

## ESTRATEGIA DE SINCRONIZACIÓN

### Sincronización Manual (botón "Sincronizar ahora")
- **Qué:** Lista completa de locks del proveedor
- **Cuándo:** Setup inicial, tras alta de lock nueva en app TTLock, ante incidencias
- **Resultado:** Upsert en `locks`; actualiza `lock_integrations.last_sync_at`

### Sincronización Automática (n8n — mecanismo primario)

> **Jerarquía de scheduling:** n8n es el orquestador principal para todos los jobs periódicos (sync, reconciliación, reintentos, mantenimiento). pg_cron actúa exclusivamente como fallback técnico si n8n no está disponible — no es el diseño base.

| Job | Trigger | Frecuencia | Qué hace |
|-----|---------|-----------|---------|
| `sal-sync-locks` | n8n Schedule | Cada 4h | Actualiza metadatos de locks (batería, online, firmware) |
| `sal-sync-lock-state` | n8n Schedule | Cada 15min | Solo batería + online status de locks activas |
| `sal-sync-lock-records` | n8n Schedule | Cada 5min | Obtiene logs nuevos del proveedor; dedup por `provider_record_id` |
| `sal-reconcile-credentials` | n8n Schedule | Cada 1h | Reintenta credentials en `provider_sync_status='error'`; detecta desincronía |
| Renovación credenciales | n8n Schedule | Diario 09:00 | Renueva credenciales con `expires_at < now()+3d` y `auto_renew=true` |
| Room assignments sin grants | n8n Schedule | Cada 1h | Detecta asignaciones activas sin grants SAL; llama `sal-process-room-assignment` |
| Reintentos notificaciones | n8n Schedule | Cada 30min | Reintenta `lock_notifications WHERE status='failed' AND retry_count < 3` |
| Limpieza lock_records | n8n Schedule | Semanal | DELETE `lock_records WHERE event_at < now() - 90 days` |

### Restricciones
- **No dependencia de webhooks**: el sistema funciona correctamente sin webhooks
- **Rate limiting TTLock**: implementar exponential backoff; no superar límites de la API
- **Deduplicación**: `lock_records.UNIQUE(lock_id, provider_record_id)` previene duplicados en re-sync

---

## IMPACTO SOBRE PANTALLAS EXISTENTES

### AccommodationDetail (`src/pages/v2/admin/accommodations/AccommodationDetail.jsx`)
```jsx
// Badge en la cabecera del alojamiento (si smart_access activo)
{isSmartAccessActive && (
  <Tag color="blue">Smart Access Activo</Tag>
)}

// Acción en el menú de habitación
{isSmartAccessActive && room.has_lock && (
  <Button onClick={() => navigate(`/v2/admin/smart-access/cerraduras?room=${room.id}`)}>
    Gestionar acceso
  </Button>
)}
```

### RoomCard
- Badge "🔒 Cerradura conectada" si la habitación tiene `lock_placements` activos
- Link "Gestionar acceso" → `/v2/admin/smart-access/cerraduras?room=:roomId`

### TenantDetail
- Badge "🔐 Acceso activo" si el inquilino tiene grants activos
- Link "Ver accesos" → `/v2/admin/smart-access/accesos?lodger=:lodgerId`

**Clientes sin SmartAccessLock contratado:** no ven ningún cambio.

---

## ESTRATEGIA DE NOTIFICACIONES

### Fase 1 (implementar)
1. **Email**: Resend o SendGrid. Plantillas: `credential_issued`, `credential_revoked`, `credential_expiring`
2. **Display en UI**: Credencial visible en detalle del grant para copiar/reenviar manualmente
3. **Reenvío manual**: Botón "Reenviar credenciales" en detalle de actor/inquilino

### Trazabilidad
- Todo envío registrado en `lock_notifications` con canal, estado, reintentos, error
- Estado: `pending → sent | failed`
- Hasta 3 reintentos automáticos en caso de fallo

### Futuro
- SMS (Twilio)
- WhatsApp Business API
- Push (FCM)

---

## RIESGOS Y CONTRADICCIONES

| # | Riesgo | Severidad | Mitigación |
|---|--------|-----------|------------|
| R1 | **PINs en BD sin cifrar**: `credential_value` puede contener PINs | 🔴 CRÍTICO | Usar Supabase Vault o cifrado AES en Edge Function antes de persistir |
| R2 | **Rate limits TTLock**: sync demasiado frecuente puede bloquear la API | 🔴 CRÍTICO | Exponential backoff; respetar límites; caching de respuestas |
| R3 | **Hook room_assignment**: si el DB Webhook falla o la EF está en timeout, el inquilino no tiene acceso | 🟠 ALTO | n8n job "room assignments sin grants" detecta la brecha cada 1h y llama `sal-process-room-assignment`; pg_cron solo como fallback técnico si n8n no está disponible |
| R4 | **Crecimiento de lock_records**: sincronizar logs cada 5min genera miles de filas/mes | 🟠 ALTO | Política de retención (ej. 90 días en caliente + archivado); índice en `event_at` |
| R5 | **Acceso efectivo grupos — performance**: actor en muchos grupos con scopes amplios puede generar muchos grants | 🟡 MEDIO | Calcular acceso efectivo en la Edge Function con UNION de scopes; límite de grupos por actor en plan |
| R6 | **`lock_placements` — unicidad de placement activo** | ✅ Resuelto | Solución canónica adoptada: índice único parcial `idx_lock_placements_one_active ON lock_placements(lock_id) WHERE is_active = true`. No se usa `EXCLUDE`/`btree_gist`. La migración `20260412000002` ya implementa esta solución. |
| R7 | **Stripe no activo actualmente**: `saas_service_subscriptions` referencia Stripe pero la integración puede no estar completa | 🟡 MEDIO | Diseñar para que la activación manual (sin Stripe) funcione en Fase 1; Stripe se activa en Fase 2 billing |
| R8 | **time_policy en scopes**: horarios de acceso dependen de que el proveedor soporte códigos periódicos | 🟡 MEDIO | Documentar como "feature dependiente del proveedor"; en Fase 1 se guarda pero no se enforce automáticamente |
| R10 | **Secrets de proveedor en BD**: `provider_credentials` JSONB puede contener access_tokens sensibles | 🔴 CRÍTICO | Usar Supabase Vault para almacenar secretos; solo referenciar por vault key en la tabla |

---

## PLAN DE IMPLEMENTACIÓN POR FASES

### Fase 0 — Infraestructura DB y Catálogo (1-2 semanas)
- Migraciones SQL: catálogo SaaS + tablas SmartAccessLock
- Seed: `saas_services` con code=`smart_access_lock`
- RLS policies para todas las tablas nuevas
- Superadmin: CRUD de `saas_services` y `saas_service_plans`

### Fase 1 — Superadmin (1 semana)
- Pantallas superadmin: lista servicios, planes, features, visibilidad
- Activación manual de suscripción para client_account (sin Stripe aún)
- Vista estado del módulo por client_account

### Fase 2 — Billing con Stripe (1 semana)
- Edge Function `sal-activate-subscription` + Stripe subscription item
- Pantalla de contratación para client_account
- Guard en frontend: módulo bloqueado si `saas_service_subscriptions.status != 'active'`

### Fase 3 — Conexión Proveedor + Sync (2 semanas)
- Edge Function `sal-connect-integration` (TTLock OAuth)
- Edge Function `sal-sync-locks`
- Pantalla `/integracion`: conectar + sync manual
- n8n jobs para sync periódica (pg_cron solo como fallback técnico)

### Fase 4 — Estructura de Accesos (2 semanas)
- CRUD `common_areas`
- Edge Function `sal-place-lock`
- Pantalla `/estructura` visual jerárquica
- Pantalla `/zonas-comunes`
- Pantalla `/cerraduras` (lista + detalle)

### Fase 5 — Actores y Grupos (2 semanas)
- CRUD `lock_access_actors`
- CRUD `lock_access_groups` + members + scopes
- Edge Function `sal-process-group-change`
- Pantallas `/actores` y `/grupos`

### Fase 6 — Grants y Credenciales (2 semanas)
- Edge Functions: `sal-grant-access`, `sal-revoke-access`, `sal-renew-credential`
- Integración con TTLock API para emitir/revocar PINs
- Pantallas `/accesos` y `/credenciales`
- Cifrado de `credential_value` con Supabase Vault

### Fase 7 — Auto-Grants (Inquilinos) (1 semana)
- Edge Function `sal-process-room-assignment`
- Edge Function `sal-process-checkout`
- **Database Webhooks** sobre `lodger_room_assignments` (INSERT → `sal-process-room-assignment`; UPDATE `move_out_date` → `sal-process-checkout`); trigger SQL con `pg_net` como alternativa técnica (migración `20260412000007`)
- n8n job de reconciliación horaria: detecta asignaciones activas sin grants y los crea retroactivamente

### Fase 8 — Notificaciones (1 semana)
- Edge Function `sal-send-notification` + plantillas email
- Tabla `lock_notifications` + trazabilidad
- UI: ver credencial, copiar, reenviar manualmente

### Fase 9 — Auditoría + Remote Unlock (1 semana)
- Edge Function `sal-sync-lock-records`
- Edge Function `sal-remote-unlock`
- Pantalla `/registros` con filtros
- n8n job para sync periódica de logs

### Fase 10 — Madurez + Webhooks (futuro)
- Soporte de webhooks TTLock para eventos en tiempo real
- SMS / WhatsApp notifications
- App móvil para provisioning de locks nuevas
- Soporte multi-proveedor (Nuki, Igloohome)

---

## Referencias

- REQ-013: SaaS Services Catalog
- REQ-003: Room Assignment (auto-grant al asignar habitación)
- Migraciones incluidas en este diseño:
  - `20260412000001_create_saas_services_catalog.sql`
  - `20260412000002_create_smart_access_lock_core.sql`
  - `20260412000003_create_smart_access_lock_access.sql`
  - `20260412000004_smart_access_lock_rls.sql`
  - `20260412000006_sal_corrections.sql` ← versión canónica única (`status = 'active'`)
  - `20260412000007_sal_triggers.sql`
- TTLock API documentation (euapi.ttlock.com)
- Supabase Vault: documentación de cifrado de secretos
