# Sistema de Logs y Actividad Reciente

**Fecha:** 13 de Abril de 2026  
**Versión:** 1.0  
**Autor:** Sistema SmartRoom Rental

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Base de Datos](#base-de-datos)
3. [Índices de Rendimiento](#índices-de-rendimiento)
4. [Seguridad (RLS)](#seguridad-rls)
5. [Edge Functions](#edge-functions)
6. [RPC Functions](#rpc-functions)
7. [Frontend](#frontend)
8. [Flujo de Datos](#flujo-de-datos)
9. [Catálogo de Acciones](#catálogo-de-acciones)
10. [Ejemplos de Datos](#ejemplos-de-datos)
11. [Limitaciones Actuales](#limitaciones-actuales)
12. [Mejoras Propuestas](#mejoras-propuestas)

---

## Resumen Ejecutivo

El sistema de logs (`audit_log`) registra todas las acciones importantes realizadas en la plataforma SmartRoom Rental. Proporciona trazabilidad completa de operaciones CRUD sobre entidades principales (inquilinos, alojamientos, habitaciones, entidades) y se visualiza en el dashboard como "Actividad Reciente".

**Características principales:**
- ✅ Multi-tenant por `client_account_id`
- ✅ Registro automático desde Edge Functions y RPCs
- ✅ Almacenamiento de valores antiguos y nuevos (JSONB)
- ✅ Visualización en tiempo real en dashboard
- ✅ Navegación directa a entidades desde logs
- ✅ Optimizado con índices compuestos

---

## Base de Datos

### Tabla `audit_log`

**Ubicación:** `supabase/migrations/baseline/00000000000001_baseline_schema.sql` (líneas 486-506)

```sql
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  
  -- Actor (quién realizó la acción)
  actor_user_id uuid,
  actor_role text,
  
  -- Entidad afectada (sobre qué se actuó)
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  
  -- Cambios realizados
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  
  -- Auditoría temporal
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Descripción de Campos

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `id` | uuid | Identificador único del log | `550e8400-e29b-41d4-a716-446655440000` |
| `client_account_id` | uuid | Cuenta del cliente (multi-tenant) | `123e4567-e89b-12d3-a456-426614174000` |
| `actor_user_id` | uuid | ID del usuario que realizó la acción | `789e0123-e89b-12d3-a456-426614174000` |
| `actor_role` | text | Rol del actor | `admin`, `agent`, `viewer`, `system` |
| `entity_type` | text | Tipo de entidad afectada | `lodger`, `accommodation`, `room`, `entity` |
| `entity_id` | uuid | ID de la entidad específica | `456e7890-e89b-12d3-a456-426614174000` |
| `action` | text | Acción realizada | `create`, `update`, `delete`, `reassign_room` |
| `old_values` | jsonb | Valores antes del cambio | `{"status": "inactive"}` |
| `new_values` | jsonb | Valores después del cambio | `{"status": "active", "name": "Juan"}` |
| `metadata` | jsonb | Información adicional contextual | `{"checkout_date": "2026-04-14"}` |
| `created_at` | timestamptz | Timestamp de creación | `2026-04-13 18:30:00+00` |

---

## Índices de Rendimiento

**Ubicación:** `supabase/migrations/performance/20260326000001_add_performance_indexes.sql` (líneas 142-153)

### Índice por Cliente y Fecha

```sql
CREATE INDEX idx_audit_log_client_created 
ON public.audit_log(client_account_id, created_at DESC);
```

**Uso:** Consultas del dashboard ordenadas cronológicamente por tenant.

**Query optimizada:**
```sql
SELECT * FROM audit_log 
WHERE client_account_id = ? 
ORDER BY created_at DESC 
LIMIT 20;
```

### Índice por Entidad

```sql
CREATE INDEX idx_audit_log_entity 
ON public.audit_log(entity_type, entity_id, created_at DESC);
```

**Uso:** Historial de cambios de una entidad específica.

**Query optimizada:**
```sql
SELECT * FROM audit_log 
WHERE entity_type = 'lodger' 
  AND entity_id = ? 
ORDER BY created_at DESC;
```

### Índice por Actor

```sql
CREATE INDEX idx_audit_log_actor 
ON public.audit_log(actor_user_id, created_at DESC);
```

**Uso:** Actividad de un usuario específico.

**Query optimizada:**
```sql
SELECT * FROM audit_log 
WHERE actor_user_id = ? 
ORDER BY created_at DESC;
```

---

## Seguridad (RLS)

**Ubicación:** `supabase/migrations/baseline/00000000000003_baseline_rls.sql` (líneas 602-605)

```sql
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_policy" ON public.audit_log 
FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin' 
  OR client_account_id = get_my_client_account_id()
);
```

### Políticas Activas

| Operación | Rol | Condición |
|-----------|-----|-----------|
| **SELECT** | `authenticated` | Superadmin O mismo `client_account_id` |
| **INSERT** | ❌ No permitido | Solo Edge Functions/RPCs con SECURITY DEFINER |
| **UPDATE** | ❌ No permitido | Los logs son inmutables |
| **DELETE** | ❌ No permitido | Los logs son permanentes |

### Importante

⚠️ **Los usuarios NO pueden escribir directamente en `audit_log`**. Solo pueden leer sus propios logs.

✅ **Edge Functions y RPCs** escriben usando:
- Service role (Edge Functions)
- `SECURITY DEFINER` (RPC Functions)

---

## Edge Functions

### 1. manage_lodger (Inquilinos)

**Ubicación:** `supabase/functions/manage_lodger/index.ts`

#### Acciones Registradas

| Acción | Línea | Descripción |
|--------|-------|-------------|
| `create` | 181 | Crear nuevo inquilino |
| `update` | 225 | Actualizar datos de inquilino |
| `activate` / `deactivate` | 268 | Cambiar estado del inquilino |
| `send_invite` | 314 | Enviar invitación por email |
| `delete` | 431 | Eliminar inquilino |
| `create` (assignment) | 540 | Asignar habitación a inquilino |
| `schedule_checkout` | 607 | Programar baja de inquilino |

#### Ejemplo de Código

```typescript
// Crear inquilino
await supabase.from("audit_log").insert({
  client_account_id: clientAccountId,
  actor_user_id: user.id,
  actor_role: profile.role,
  entity_type: "lodger",
  entity_id: newLodger.id,
  action: "create",
  new_values: newLodger,
});
```

```typescript
// Actualizar inquilino
await supabase.from("audit_log").insert({
  client_account_id: clientAccountId,
  actor_user_id: user.id,
  actor_role: profile.role,
  entity_type: "lodger",
  entity_id: id,
  action: "update",
  old_values: oldLodger,
  new_values: updatedLodger,
});
```

---

### 2. manage_entity (Entidades)

**Ubicación:** `supabase/functions/manage_entity/index.ts`

#### Acciones Registradas

| Acción | Línea | Descripción |
|--------|-------|-------------|
| `create` | 129 | Crear nueva entidad |
| `update` | 171 | Actualizar datos de entidad |
| `activate` / `deactivate` | 214 | Cambiar estado de entidad |

#### Ejemplo de Código

```typescript
await supabase.from("audit_log").insert({
  client_account_id: clientAccountId,
  actor_user_id: user.id,
  actor_role: profile.role,
  entity_type: "entity",
  entity_id: newEntity.id,
  action: "create",
  new_values: newEntity,
});
```

---

### 3. manage_accommodation (Alojamientos y Habitaciones)

**Ubicación:** `supabase/functions/manage_accommodation/index.ts`

#### Acciones Registradas

| Acción | Línea | Descripción |
|--------|-------|-------------|
| `create` (accommodation) | 165 | Crear nuevo alojamiento |
| `update` (accommodation) | 204 | Actualizar alojamiento |
| `activate` / `deactivate` (accommodation) | 245 | Cambiar estado alojamiento |
| `create` (room) | 303 | Crear nueva habitación |
| `update` (room) | 341 | Actualizar habitación |
| `activate` / `deactivate` (room) | 382 | Cambiar estado habitación |

#### Ejemplo de Código

```typescript
// Crear habitación
await supabase.from("audit_log").insert({
  client_account_id: clientAccountId,
  actor_user_id: user.id,
  actor_role: profile.role,
  entity_type: "room",
  entity_id: newRoom.id,
  action: "create",
  new_values: newRoom,
  metadata: { accommodation_id: accommodationId },
});
```

---

## RPC Functions

### reassign_lodger_room

**Ubicación:** `supabase/migrations/schema/20260412160000_reassign_room_rpc.sql`

**Función:** Reasignación atómica de habitación (Check-Out + Check-In)

**Características:**
- ✅ `SECURITY DEFINER` - Ejecuta con permisos elevados
- ✅ Transacción atómica
- ✅ Registro automático en `audit_log`
- ✅ No requiere Edge Function (evita problemas de sesión)

#### Código SQL

```sql
-- Registrar en audit_log (SECURITY DEFINER evita restricción RLS INSERT)
INSERT INTO public.audit_log (
  client_account_id,
  actor_user_id,
  actor_role,
  entity_type,
  entity_id,
  action,
  old_values,
  new_values,
  metadata
) VALUES (
  v_client_account_id,
  auth.uid(),
  v_actor_role,
  'lodger',
  p_lodger_id,
  'reassign_room',
  jsonb_build_object(
    'old_room_id', v_old_room_id,
    'old_accommodation_id', v_old_accommodation_id
  ),
  jsonb_build_object(
    'new_room_id', p_new_room_id,
    'new_accommodation_id', p_new_accommodation_id,
    'move_in_date', p_new_move_in_date
  ),
  jsonb_build_object(
    'checkout_date', p_checkout_date,
    'deposit_amount', p_new_deposit_amount
  )
);
```

#### Uso desde Frontend

```javascript
const { error } = await supabase.rpc("reassign_lodger_room", {
  p_lodger_id: lodger.id,
  p_current_asgn_id: activeAssignment?.id ?? null,
  p_checkout_date: checkoutDate,
  p_new_accommodation_id: newAccommodationId,
  p_new_room_id: newRoomId,
  p_new_move_in_date: moveInDate,
  p_new_deposit_amount: depositAmount,
});
```

---

## Frontend

### 1. DashboardAdmin.jsx (Dashboard Principal)

**Ubicación:** `src/pages/v2/admin/DashboardAdmin.jsx`

#### Función de Carga

```javascript
const loadActivity = useCallback(async () => {
  if (!clientAccountId) return;
  setActivityLoading(true);
  
  try {
    // 1. Consultar logs
    const { data } = await supabase
      .from("audit_log")
      .select("id,entity_type,entity_id,action,actor_role,actor_user_id,new_values,old_values,created_at")
      .eq("client_account_id", clientAccountId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!data?.length) { 
      setActivity([]); 
      return; 
    }

    // 2. Batch-fetch nombres de actores únicos
    const actorIds = [...new Set(data.map(d => d.actor_user_id).filter(Boolean))];
    const { data: actors } = actorIds.length
      ? await supabase.from("profiles").select("id,full_name").in("id", actorIds)
      : { data: [] };
    
    const actorMap = Object.fromEntries((actors || []).map(a => [a.id, a.full_name]));

    // 3. Enriquecer datos con nombres de actores
    setActivity(data.map(item => ({ 
      ...item, 
      actorName: actorMap[item.actor_user_id] || null 
    })));
    
  } catch {
    setActivity([]);
  } finally {
    setActivityLoading(false);
  }
}, [clientAccountId]);
```

#### Metadatos de Visualización

```javascript
const ACTION_META = {
  create:            { label: "Creado",          color: "#059669" },
  update:            { label: "Actualizado",     color: "#2563EB" },
  delete:            { label: "Eliminado",       color: "#DC2626" },
  activate:          { label: "Activado",        color: "#059669" },
  deactivate:        { label: "Desactivado",     color: "#6B7280" },
  send_invite:       { label: "Invitación",      color: "#7C3AED" },
  schedule_checkout: { label: "Baja programada", color: "#EA580C" },
  reassign_room:     { label: "Reasignación",    color: "#0891B2" },
};

const ENTITY_LABEL = {
  accommodation:   "Alojamiento", 
  room:            "Habitación", 
  lodger:          "Inquilino",
  entity:          "Entidad", 
  service:         "Servicio", 
  energy_bill:     "Factura",
  bulletin:        "Boletín", 
  lodger_service:  "Servicio inquilino",
};
```

#### Renderizado de Actividad

```javascript
<HoverCard style={{ display: "flex", flexDirection: "column" }}>
  <p style={S.cardLabel}>Actividad reciente</p>
  <div style={S.feed}>
    {activityLoading ? (
      <p style={S.empty}>Cargando...</p>
    ) : activity.length === 0 ? (
      <p style={S.empty}>Sin actividad registrada</p>
    ) : activity.map((item) => {
      const act = ACTION_META[item.action] || { label: item.action, color: "#94A3B8" };
      const entity = ENTITY_LABEL[item.entity_type] || item.entity_type;
      const v = item.new_values || item.old_values || {};
      const name = v.full_name || v.name || v.legal_name || v.number || "";
      const actorDisplay = item.actorName || item.actor_role || "—";
      
      const ENTITY_ROUTE = {
        accommodation: `/v2/admin/alojamientos/${item.entity_id}/habitaciones`,
        lodger:        `/v2/admin/inquilinos/${item.entity_id}/detalle-inquilino`,
        entity:        `/v2/admin/entidades/${item.entity_id}`,
      };
      const route = item.entity_id ? ENTITY_ROUTE[item.entity_type] : null;
      
      return (
        <div 
          key={item.id}
          style={{ ...S.feedItem, cursor: route ? "pointer" : "default" }}
          onClick={route ? () => navigate(route) : undefined}
        >
          <div style={{ ...S.feedBar, background: act.color }} />
          <div style={S.feedBody}>
            <span style={S.feedAction}>
              <span style={{ color: act.color }}>{act.label}</span>
              {" · "}{entity}{name ? `: ${name}` : ""}
            </span>
            <span style={S.feedMeta}>
              {actorDisplay} · {timeAgo(item.created_at)}
            </span>
          </div>
        </div>
      );
    })}
  </div>
</HoverCard>
```

#### Función timeAgo

```javascript
function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  const days = Math.floor(s / 86400);
  return days === 1 ? "Ayer" : `${days}d`;
}
```

---

### 2. DashboardAdminV3New.jsx (Dashboard V3)

**Ubicación:** `src/pages/v2/admin/DashboardAdminV3New.jsx`

#### Consulta Simplificada

```javascript
const { data: auditLog } = await supabase
  .from("audit_log")
  .select("id,entity_type,action,actor_role,actor_user_id,created_at")
  .eq("client_account_id", clientAccountId)
  .order("created_at", { ascending: false })
  .limit(10);

setActividadData(auditLog || []);
```

#### Componente ActividadReciente

```javascript
function ActividadReciente({ items, loading }) {
  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
        borderRadius: 16,
        padding: 24,
        border: '1px solid #E5E7EB',
        minHeight: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
          Cargando actividad...
        </div>
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
        borderRadius: 16,
        padding: 24,
        border: '1px solid #E5E7EB',
        minHeight: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        color: '#9CA3AF',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <div>No hay actividad reciente</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
      borderRadius: 16,
      padding: 24,
      border: '1px solid #E5E7EB',
    }}>
      <h3 style={{
        margin: 0,
        marginBottom: 16,
        fontSize: 18,
        fontWeight: 700,
        color: '#1F2937',
      }}>
        Actividad Reciente
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, idx) => (
          <div
            key={item.id}
            style={{
              padding: 12,
              background: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
              {getActionLabel(item.action)} · {getEntityLabel(item.entity_type)}
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
              {item.actor_name || item.actor_role || 'Sistema'} · {timeAgo(item.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ACCIÓN DEL USUARIO (Frontend)                               │
│    - Crear inquilino, actualizar entidad, reasignar habitación │
│    - Componentes: TenantsList, EntityEdit, ChangeRoomModal     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. LLAMADA A BACKEND                                            │
│    A) Edge Function (fetch)                                     │
│       - manage_lodger, manage_entity, manage_accommodation      │
│    B) RPC Function (supabase.rpc)                              │
│       - reassign_lodger_room                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. OPERACIÓN PRINCIPAL                                          │
│    - INSERT/UPDATE/DELETE en tabla principal                   │
│    - Validaciones de negocio                                    │
│    - Transacciones atómicas                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. INSERCIÓN EN audit_log                                       │
│    INSERT INTO audit_log (                                      │
│      client_account_id,                                         │
│      actor_user_id,                                             │
│      actor_role,                                                │
│      entity_type,                                               │
│      entity_id,                                                 │
│      action,                                                    │
│      old_values,                                                │
│      new_values,                                                │
│      metadata                                                   │
│    )                                                            │
│    - Service Role (Edge Functions)                             │
│    - SECURITY DEFINER (RPC Functions)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. CONSULTA EN DASHBOARD (Frontend)                            │
│    SELECT * FROM audit_log                                      │
│    WHERE client_account_id = ?                                  │
│    ORDER BY created_at DESC                                     │
│    LIMIT 10-20                                                  │
│    - Componentes: DashboardAdmin, DashboardAdminV3New          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. ENRIQUECIMIENTO DE DATOS                                     │
│    - Batch fetch de nombres de actores (profiles.full_name)    │
│    - Mapeo de action → label + color (ACTION_META)             │
│    - Mapeo de entity_type → label español (ENTITY_LABEL)       │
│    - Extracción de nombre desde new_values/old_values          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. RENDERIZADO EN UI                                            │
│    - Card "Actividad Reciente"                                  │
│    - Lista de items con:                                        │
│      • Barra de color según acción                             │
│      • Acción + Entidad + Nombre                               │
│      • Actor + Tiempo relativo                                 │
│      • Click para navegar a detalle                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Catálogo de Acciones

### Tabla de Acciones

| Acción | Label | Color | Hex | Entidades Aplicables |
|--------|-------|-------|-----|----------------------|
| `create` | Creado | Verde | `#059669` | lodger, entity, accommodation, room, service, bulletin |
| `update` | Actualizado | Azul | `#2563EB` | lodger, entity, accommodation, room |
| `delete` | Eliminado | Rojo | `#DC2626` | lodger |
| `activate` | Activado | Verde | `#059669` | lodger, entity, accommodation, room |
| `deactivate` | Desactivado | Gris | `#6B7280` | lodger, entity, accommodation, room |
| `send_invite` | Invitación | Morado | `#7C3AED` | lodger |
| `schedule_checkout` | Baja programada | Naranja | `#EA580C` | lodger |
| `reassign_room` | Reasignación | Cyan | `#0891B2` | lodger |

### Tabla de Entidades

| Entity Type | Label Español | Rutas de Navegación |
|-------------|---------------|---------------------|
| `lodger` | Inquilino | `/v2/admin/inquilinos/{id}/detalle-inquilino` |
| `accommodation` | Alojamiento | `/v2/admin/alojamientos/{id}/habitaciones` |
| `room` | Habitación | N/A (navega a alojamiento padre) |
| `entity` | Entidad | `/v2/admin/entidades/{id}` |
| `service` | Servicio | N/A |
| `energy_bill` | Factura | N/A |
| `bulletin` | Boletín | N/A |
| `lodger_service` | Servicio inquilino | N/A |

---

## Ejemplos de Datos

### 1. Crear Inquilino

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "client_account_id": "123e4567-e89b-12d3-a456-426614174000",
  "actor_user_id": "789e0123-e89b-12d3-a456-426614174000",
  "actor_role": "admin",
  "entity_type": "lodger",
  "entity_id": "456e7890-e89b-12d3-a456-426614174000",
  "action": "create",
  "old_values": null,
  "new_values": {
    "id": "456e7890-e89b-12d3-a456-426614174000",
    "full_name": "Juan Pérez García",
    "email": "juan.perez@example.com",
    "phone": "+34600123456",
    "onboarding_status": "pending_invite",
    "created_at": "2026-04-13T18:30:00Z"
  },
  "metadata": null,
  "created_at": "2026-04-13T18:30:00Z"
}
```

**Visualización:**
```
🟢 Creado · Inquilino: Juan Pérez García
   Admin Usuario · 2m
```

---

### 2. Actualizar Entidad

```json
{
  "id": "660e9511-f30c-52e5-b827-557766551111",
  "client_account_id": "123e4567-e89b-12d3-a456-426614174000",
  "actor_user_id": "789e0123-e89b-12d3-a456-426614174000",
  "actor_role": "admin",
  "entity_type": "entity",
  "entity_id": "777e8901-e89b-12d3-a456-426614174000",
  "action": "update",
  "old_values": {
    "legal_name": "Inversiones ABC S.L.",
    "tax_id": "B12345678",
    "billing_email": "old@example.com"
  },
  "new_values": {
    "legal_name": "Inversiones ABC S.L.",
    "tax_id": "B12345678",
    "billing_email": "new@example.com"
  },
  "metadata": null,
  "created_at": "2026-04-13T17:45:00Z"
}
```

**Visualización:**
```
🔵 Actualizado · Entidad: Inversiones ABC S.L.
   María López · 45m
```

---

### 3. Reasignar Habitación

```json
{
  "id": "770e0622-g41d-63f6-c938-668877662222",
  "client_account_id": "123e4567-e89b-12d3-a456-426614174000",
  "actor_user_id": "789e0123-e89b-12d3-a456-426614174000",
  "actor_role": "admin",
  "entity_type": "lodger",
  "entity_id": "456e7890-e89b-12d3-a456-426614174000",
  "action": "reassign_room",
  "old_values": {
    "old_room_id": "888e9012-e89b-12d3-a456-426614174000",
    "old_accommodation_id": "999e0123-e89b-12d3-a456-426614174000"
  },
  "new_values": {
    "new_room_id": "000e1234-e89b-12d3-a456-426614174000",
    "new_accommodation_id": "111e2345-e89b-12d3-a456-426614174000",
    "move_in_date": "2026-04-15"
  },
  "metadata": {
    "checkout_date": "2026-04-14",
    "deposit_amount": 500.00
  },
  "created_at": "2026-04-13T16:20:00Z"
}
```

**Visualización:**
```
🔵 Reasignación · Inquilino: Juan Pérez García
   Admin Usuario · 2h
```

---

### 4. Activar Alojamiento

```json
{
  "id": "880f1733-h52e-74g7-d049-779988773333",
  "client_account_id": "123e4567-e89b-12d3-a456-426614174000",
  "actor_user_id": "789e0123-e89b-12d3-a456-426614174000",
  "actor_role": "admin",
  "entity_type": "accommodation",
  "entity_id": "222e3456-e89b-12d3-a456-426614174000",
  "action": "activate",
  "old_values": {
    "status": "inactive"
  },
  "new_values": {
    "status": "active",
    "name": "Edificio Central"
  },
  "metadata": null,
  "created_at": "2026-04-13T15:10:00Z"
}
```

**Visualización:**
```
🟢 Activado · Alojamiento: Edificio Central
   Carlos Ruiz · 3h
```

---

### 5. Enviar Invitación

```json
{
  "id": "990g2844-i63f-85h8-e150-880099884444",
  "client_account_id": "123e4567-e89b-12d3-a456-426614174000",
  "actor_user_id": "789e0123-e89b-12d3-a456-426614174000",
  "actor_role": "agent",
  "entity_type": "lodger",
  "entity_id": "456e7890-e89b-12d3-a456-426614174000",
  "action": "send_invite",
  "old_values": null,
  "new_values": {
    "email": "juan.perez@example.com",
    "full_name": "Juan Pérez García"
  },
  "metadata": {
    "magic_link_sent": true,
    "invite_type": "onboarding"
  },
  "created_at": "2026-04-13T14:30:00Z"
}
```

**Visualización:**
```
🟣 Invitación · Inquilino: Juan Pérez García
   Ana Martínez · 4h
```

---

### 6. Eliminar Inquilino

```json
{
  "id": "001h3955-j74g-96i9-f261-991100995555",
  "client_account_id": "123e4567-e89b-12d3-a456-426614174000",
  "actor_user_id": "789e0123-e89b-12d3-a456-426614174000",
  "actor_role": "admin",
  "entity_type": "lodger",
  "entity_id": "456e7890-e89b-12d3-a456-426614174000",
  "action": "delete",
  "old_values": {
    "full_name": "Pedro González",
    "email": "pedro@example.com",
    "onboarding_status": "inactive"
  },
  "new_values": null,
  "metadata": {
    "reason": "duplicate_entry",
    "deleted_by_admin": true
  },
  "created_at": "2026-04-13T13:15:00Z"
}
```

**Visualización:**
```
🔴 Eliminado · Inquilino: Pedro González
   Admin Usuario · 5h
```

---

## Limitaciones Actuales

### 1. Sin Servicio Dedicado

❌ **No existe `activity.service.js`**

Las consultas se realizan directamente desde los componentes del dashboard:
- `DashboardAdmin.jsx`
- `DashboardAdminV3New.jsx`

**Impacto:**
- Código duplicado entre dashboards
- Dificulta reutilización en otras vistas
- Lógica de enriquecimiento dispersa

---

### 2. Solo Política SELECT en RLS

❌ **Usuarios no pueden escribir directamente**

```sql
-- ✅ Permitido
CREATE POLICY "audit_log_select_policy" ON public.audit_log FOR SELECT

-- ❌ No existe
CREATE POLICY "audit_log_insert_policy" ON public.audit_log FOR INSERT
```

**Razón:** Seguridad - Los logs deben ser inmutables y solo escritos por el backend.

**Solución actual:** Edge Functions y RPCs con `SECURITY DEFINER`.

---

### 3. Sin Paginación Real

❌ **Solo usa `.limit(10-20)`**

```javascript
.order("created_at", { ascending: false })
.limit(20);
```

**Impacto:**
- No se pueden ver logs antiguos
- No hay navegación entre páginas
- Limitado a las últimas 10-20 acciones

---

### 4. Sin Filtros en UI

❌ **No hay filtros por:**
- Tipo de acción (`create`, `update`, `delete`)
- Tipo de entidad (`lodger`, `accommodation`, `room`)
- Actor específico
- Rango de fechas

**Impacto:**
- Difícil encontrar acciones específicas
- No se puede auditar un tipo de operación
- No se puede rastrear actividad de un usuario

---

### 5. Sin Búsqueda

❌ **No hay búsqueda de texto**

No se puede buscar por:
- Nombre de entidad
- Email de inquilino
- Nombre de alojamiento
- Actor que realizó la acción

---

### 6. Sin Exportación

❌ **No se pueden exportar logs**

No hay opción para:
- Descargar CSV
- Exportar a Excel
- Generar PDF de auditoría
- Enviar por email

---

### 7. Batch Fetch de Actores

⚠️ **Consulta adicional para nombres**

```javascript
// Consulta 1: Logs
const { data } = await supabase.from("audit_log").select(...)

// Consulta 2: Nombres de actores
const { data: actors } = await supabase
  .from("profiles")
  .select("id,full_name")
  .in("id", actorIds);
```

**Impacto:**
- 2 consultas en lugar de 1
- Posible inconsistencia si se borra un perfil
- Complejidad adicional en frontend

**Alternativa:** Desnormalizar `actor_name` en `audit_log`.

---

### 8. Sin Detalles de Cambios

❌ **No se muestran diferencias específicas**

Actualmente solo se muestra:
```
🔵 Actualizado · Inquilino: Juan Pérez
```

No se muestra:
```
🔵 Actualizado · Inquilino: Juan Pérez
   Email: old@example.com → new@example.com
   Teléfono: +34600111222 → +34600333444
```

---

### 9. Sin Notificaciones

❌ **No hay alertas de actividad sospechosa**

No se detecta ni notifica:
- Múltiples eliminaciones en corto tiempo
- Cambios masivos de estado
- Acciones fuera de horario
- Patrones anómalos

---

### 10. Sin Retención de Datos

❌ **Los logs se acumulan indefinidamente**

No hay:
- Política de retención (ej: 1 año)
- Archivado automático
- Compresión de logs antiguos
- Limpieza periódica

**Impacto:**
- Crecimiento ilimitado de la tabla
- Degradación de rendimiento a largo plazo
- Costos de almacenamiento

---

## Mejoras Propuestas

### 1. Crear Servicio Dedicado

**Archivo:** `src/services/activity.service.js`

```javascript
import { supabase } from "./supabaseClient";

/**
 * Obtener actividad reciente con enriquecimiento
 */
export async function getRecentActivity(clientAccountId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    entityType = null,
    action = null,
    actorUserId = null,
    startDate = null,
    endDate = null,
  } = options;

  let query = supabase
    .from("audit_log")
    .select("id,entity_type,entity_id,action,actor_role,actor_user_id,new_values,old_values,created_at")
    .eq("client_account_id", clientAccountId);

  // Filtros opcionales
  if (entityType) query = query.eq("entity_type", entityType);
  if (action) query = query.eq("action", action);
  if (actorUserId) query = query.eq("actor_user_id", actorUserId);
  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Enriquecer con nombres de actores
  const actorIds = [...new Set(data.map(d => d.actor_user_id).filter(Boolean))];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", actorIds)
    : { data: [] };
  
  const actorMap = Object.fromEntries((actors || []).map(a => [a.id, a.full_name]));

  return {
    data: data.map(item => ({
      ...item,
      actorName: actorMap[item.actor_user_id] || null,
    })),
    count,
  };
}

/**
 * Obtener historial de una entidad específica
 */
export async function getEntityHistory(entityType, entityId, limit = 50) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Obtener actividad de un usuario
 */
export async function getUserActivity(userId, limit = 50) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("actor_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Exportar logs a CSV
 */
export async function exportActivityToCSV(clientAccountId, options = {}) {
  const { data } = await getRecentActivity(clientAccountId, { limit: 1000, ...options });
  
  const csv = [
    ["Fecha", "Acción", "Entidad", "Actor", "Detalles"].join(","),
    ...data.map(item => [
      new Date(item.created_at).toLocaleString(),
      item.action,
      item.entity_type,
      item.actorName || item.actor_role,
      JSON.stringify(item.new_values || {}).replace(/,/g, ";"),
    ].join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `activity-log-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
}
```

---

### 2. Añadir Paginación

**Componente:** `ActivityLogTable.jsx`

```javascript
import { useState, useEffect } from "react";
import { Table, Pagination } from "antd";
import { getRecentActivity } from "../../services/activity.service";

export default function ActivityLogTable({ clientAccountId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadActivity();
  }, [page, pageSize]);

  const loadActivity = async () => {
    setLoading(true);
    try {
      const result = await getRecentActivity(clientAccountId, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setData(result.data);
      setTotal(result.count);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Table
        dataSource={data}
        loading={loading}
        pagination={false}
        rowKey="id"
      />
      <Pagination
        current={page}
        pageSize={pageSize}
        total={total}
        onChange={(newPage, newPageSize) => {
          setPage(newPage);
          setPageSize(newPageSize);
        }}
        showSizeChanger
        showTotal={(total) => `Total ${total} registros`}
      />
    </>
  );
}
```

---

### 3. Añadir Filtros

**Componente:** `ActivityFilters.jsx`

```javascript
import { Form, Select, DatePicker, Button, Space } from "antd";
import { ACTION_META, ENTITY_LABEL } from "../../constants/activity";

const { RangePicker } = DatePicker;

export default function ActivityFilters({ onFilter }) {
  const [form] = Form.useForm();

  const handleSubmit = (values) => {
    onFilter({
      entityType: values.entityType,
      action: values.action,
      dateRange: values.dateRange,
    });
  };

  const handleReset = () => {
    form.resetFields();
    onFilter({});
  };

  return (
    <Form form={form} layout="inline" onFinish={handleSubmit}>
      <Form.Item name="entityType" label="Entidad">
        <Select
          placeholder="Todas"
          allowClear
          style={{ width: 150 }}
          options={Object.entries(ENTITY_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </Form.Item>

      <Form.Item name="action" label="Acción">
        <Select
          placeholder="Todas"
          allowClear
          style={{ width: 150 }}
          options={Object.entries(ACTION_META).map(([value, { label }]) => ({
            value,
            label,
          }))}
        />
      </Form.Item>

      <Form.Item name="dateRange" label="Fecha">
        <RangePicker />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            Filtrar
          </Button>
          <Button onClick={handleReset}>
            Limpiar
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
```

---

### 4. Desnormalizar Actor Name

**Migración:** `20260414000000_denormalize_actor_name.sql`

```sql
-- Añadir columna actor_name
ALTER TABLE public.audit_log 
ADD COLUMN actor_name text;

-- Crear índice
CREATE INDEX idx_audit_log_actor_name 
ON public.audit_log(actor_name);

-- Poblar datos existentes
UPDATE public.audit_log al
SET actor_name = p.full_name
FROM public.profiles p
WHERE al.actor_user_id = p.id
  AND al.actor_name IS NULL;

-- Comentario
COMMENT ON COLUMN public.audit_log.actor_name IS 
  'Nombre del actor (desnormalizado para rendimiento)';
```

**Actualizar Edge Functions:**

```typescript
await supabase.from("audit_log").insert({
  client_account_id: clientAccountId,
  actor_user_id: user.id,
  actor_role: profile.role,
  actor_name: profile.full_name, // ← Añadir
  entity_type: "lodger",
  entity_id: newLodger.id,
  action: "create",
  new_values: newLodger,
});
```

---

### 5. Mostrar Diferencias de Cambios

**Componente:** `ActivityDiff.jsx`

```javascript
import { Tag } from "antd";

export default function ActivityDiff({ oldValues, newValues }) {
  if (!oldValues || !newValues) return null;

  const changes = Object.keys(newValues).filter(
    key => oldValues[key] !== newValues[key]
  );

  if (changes.length === 0) return null;

  return (
    <div style={{ marginTop: 8, fontSize: 12 }}>
      {changes.map(key => (
        <div key={key} style={{ marginBottom: 4 }}>
          <strong>{key}:</strong>{" "}
          <Tag color="red">{String(oldValues[key])}</Tag>
          →
          <Tag color="green">{String(newValues[key])}</Tag>
        </div>
      ))}
    </div>
  );
}
```

---

### 6. Política de Retención

**Migración:** `20260414000001_audit_log_retention.sql`

```sql
-- Función para archivar logs antiguos
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mover logs > 1 año a tabla de archivo
  INSERT INTO public.audit_log_archive
  SELECT * FROM public.audit_log
  WHERE created_at < NOW() - INTERVAL '1 year';

  -- Eliminar de tabla principal
  DELETE FROM public.audit_log
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;

-- Crear tabla de archivo
CREATE TABLE public.audit_log_archive (
  LIKE public.audit_log INCLUDING ALL
);

-- Programar ejecución mensual (requiere pg_cron extension)
SELECT cron.schedule(
  'archive-audit-logs',
  '0 2 1 * *', -- 2 AM del día 1 de cada mes
  'SELECT archive_old_audit_logs()'
);
```

---

### 7. Detección de Anomalías

**Edge Function:** `detect_anomalies`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Detectar múltiples eliminaciones en 1 hora
  const { data: deletions } = await supabase
    .from("audit_log")
    .select("*")
    .eq("action", "delete")
    .gte("created_at", new Date(Date.now() - 3600000).toISOString());

  if (deletions && deletions.length > 5) {
    // Enviar alerta
    await supabase.from("alerts").insert({
      type: "suspicious_activity",
      severity: "high",
      message: `${deletions.length} eliminaciones en la última hora`,
      metadata: { deletions },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

---

### 8. Vista de Historial de Entidad

**Componente:** `EntityHistory.jsx`

```javascript
import { useState, useEffect } from "react";
import { Timeline, Tag } from "antd";
import { getEntityHistory } from "../../services/activity.service";
import { ACTION_META } from "../../constants/activity";

export default function EntityHistory({ entityType, entityId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [entityType, entityId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getEntityHistory(entityType, entityId);
      setHistory(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Timeline
      loading={loading}
      items={history.map(item => {
        const meta = ACTION_META[item.action] || {};
        return {
          color: meta.color || "gray",
          children: (
            <div>
              <Tag color={meta.color}>{meta.label || item.action}</Tag>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                {item.actor_name || item.actor_role} · {new Date(item.created_at).toLocaleString()}
              </div>
              {item.new_values && (
                <pre style={{ fontSize: 11, marginTop: 8 }}>
                  {JSON.stringify(item.new_values, null, 2)}
                </pre>
              )}
            </div>
          ),
        };
      })}
    />
  );
}
```

---

### 9. Dashboard de Auditoría

**Página:** `AuditDashboard.jsx`

```javascript
import { Row, Col, Card, Statistic } from "antd";
import { FileTextOutlined, UserOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import ActivityLogTable from "../../components/activity/ActivityLogTable";
import ActivityFilters from "../../components/activity/ActivityFilters";

export default function AuditDashboard() {
  const [filters, setFilters] = useState({});

  return (
    <div>
      <h1>Auditoría de Actividad</h1>
      
      {/* KPIs */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total de Acciones"
              value={1234}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Usuarios Activos"
              value={12}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Actualizaciones"
              value={567}
              prefix={<EditOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Eliminaciones"
              value={8}
              prefix={<DeleteOutlined />}
              valueStyle={{ color: "#DC2626" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      <Card style={{ marginBottom: 16 }}>
        <ActivityFilters onFilter={setFilters} />
      </Card>

      {/* Tabla */}
      <Card>
        <ActivityLogTable filters={filters} />
      </Card>
    </div>
  );
}
```

---

## Conclusión

El sistema de logs de SmartRoom Rental proporciona una base sólida para auditoría y trazabilidad. La arquitectura actual es funcional y segura, pero tiene margen de mejora en términos de:

1. **Reutilización:** Crear servicio dedicado
2. **Usabilidad:** Añadir paginación, filtros y búsqueda
3. **Rendimiento:** Desnormalizar datos frecuentes
4. **Análisis:** Mostrar diferencias y detectar anomalías
5. **Mantenimiento:** Implementar retención y archivado

Las mejoras propuestas pueden implementarse de forma incremental sin afectar la funcionalidad existente.

---

**Última actualización:** 13 de Abril de 2026  
**Mantenido por:** Equipo de Desarrollo SmartRoom Rental
