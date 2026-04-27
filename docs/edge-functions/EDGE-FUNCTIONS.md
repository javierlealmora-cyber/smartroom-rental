# Edge Functions - SmartRoom Rental

Documentación de las Edge Functions de Supabase utilizadas en el proyecto.

## Tabla de Contenidos
- [manage_lodger](#manage_lodger)
- [manage_entity](#manage_entity)
- [manage_accommodation](#manage_accommodation)

---

## manage_lodger

**Ubicación:** `supabase/functions/manage_lodger/index.ts`

**Descripción:** Gestiona todas las operaciones de escritura sobre inquilinos (profiles con role='lodger'). Todas las operaciones registran auditoría en `audit_log`.

**Seguridad:**
- Requiere JWT válido
- Requiere rol `admin` o `superadmin`
- Valida tenant (client_account_id)
- Valida límites de plan

### Acciones disponibles

#### 1. `create` - Crear inquilino
Crea un nuevo inquilino con contraseña segura generada en el servidor.

**Payload:**
```javascript
{
  action: "create",
  payload: {
    email: string,           // Requerido
    full_name: string,       // Requerido
    first_name?: string,
    last_name1?: string,
    last_name2?: string,
    phone?: string,
    document_id?: string,
    gender?: string,
    // ... otros campos del perfil
  }
}
```

**Response:**
```javascript
{
  ok: true,
  data: {
    lodger: { /* perfil creado */ }
  }
}
```

**Auditoría:**
- `entity_type`: "lodger"
- `action`: "create"
- `new_values`: perfil completo del inquilino

---

#### 2. `update` - Actualizar inquilino
Actualiza los datos personales de un inquilino existente.

**Payload:**
```javascript
{
  action: "update",
  payload: {
    id: string,              // Requerido - ID del inquilino
    full_name?: string,
    first_name?: string,
    last_name1?: string,
    last_name2?: string,
    phone?: string,
    document_id?: string,
    gender?: string,
    address_street?: string,
    address_number?: string,
    address_floor?: string,
    address_postal_code?: string,
    address_city?: string,
    address_province?: string,
    address_country?: string,
    // ... otros campos actualizables
  }
}
```

**Response:**
```javascript
{
  ok: true,
  data: {
    lodger: { /* perfil actualizado */ }
  }
}
```

**Auditoría:**
- `entity_type`: "lodger"
- `action`: "update"
- `old_values`: valores anteriores
- `new_values`: valores nuevos

**Uso desde frontend:**
```javascript
import { updateLodger } from '@/services/lodgers.service';

await updateLodger(lodgerId, {
  first_name: "Juan",
  last_name1: "García",
  phone: "+34 600 123 456"
});
```

---

#### 3. `set_status` - Cambiar estado
Cambia el estado de onboarding de un inquilino.

**Payload:**
```javascript
{
  action: "set_status",
  payload: {
    id: string,              // Requerido - ID del inquilino
    status: string           // Requerido - "active" | "invited" | "inactive" | "pending_checkout"
  }
}
```

**Response:**
```javascript
{
  ok: true,
  data: {
    lodger: { /* perfil con estado actualizado */ }
  }
}
```

**Auditoría:**
- `entity_type`: "lodger"
- `action`: "set_status"
- `old_values`: { onboarding_status: "anterior" }
- `new_values`: { onboarding_status: "nuevo" }

---

#### 4. `invite` - Enviar invitación
Envía un magic link de invitación al email del inquilino.

**Payload:**
```javascript
{
  action: "invite",
  payload: {
    id: string               // Requerido - ID del inquilino
  }
}
```

**Response:**
```javascript
{
  ok: true,
  data: {
    message: "Invitation sent",
    email: "inquilino@example.com",
    magic_link: "https://..."  // Solo en desarrollo
  }
}
```

**Auditoría:**
- `entity_type`: "lodger"
- `action`: "invite_sent"
- `new_values`: { email: "..." }

**Uso desde frontend:**
```javascript
import { inviteLodger } from '@/services/lodgers.service';

await inviteLodger(lodgerId);
```

---

#### 5. `assign_room` - Asignar habitación (primera vez)
Asigna una habitación a un inquilino que no tiene asignación activa.

**Payload:**
```javascript
{
  action: "assign_room",
  payload: {
    id: string,                        // Requerido - ID del inquilino
    room_id: string,                   // Requerido - ID de la habitación
    accommodation_id: string,          // Requerido - ID del alojamiento
    move_in_date: string,              // Requerido - Fecha entrada (YYYY-MM-DD)
    billing_start_date?: string,       // Fecha inicio facturación (YYYY-MM-DD)
    monthly_rent?: number,             // Renta mensual
    deposit_amount?: number,           // Fianza
    commission_amount?: number,        // Comisión
    first_month_amount?: number,       // Importe primer mes (prorrateado)
    services_provision_amount?: number // Provisión de servicios
  }
}
```

**Validaciones:**
- El inquilino existe y pertenece al tenant
- El inquilino NO tiene asignación activa
- La habitación existe y pertenece al tenant
- La habitación NO está en mantenimiento
- La habitación está libre (sin asignaciones activas)

**Efectos:**
- Crea registro en `lodger_room_assignments`
- Actualiza `onboarding_status` del inquilino a "active"

**Response:**
```javascript
{
  ok: true,
  data: { /* asignación creada */ }
}
```

**Auditoría:**
- `entity_type`: "lodger_assignment"
- `action`: "assign_room"
- `new_values`: asignación completa

**Uso desde frontend:**
```javascript
import { assignRoomToLodger } from '@/services/lodgers.service';

await assignRoomToLodger(lodgerId, {
  roomId: "uuid-room",
  accommodationId: "uuid-accommodation",
  moveInDate: "2026-05-01",
  billingStartDate: "2026-06-01",
  monthlyRent: 500,
  depositAmount: 1000,
  commissionAmount: 500,
  firstMonthAmount: 250,
  servicesProvisionAmount: 100
});
```

---

#### 6. `reassign_room` - Cambiar habitación
Cierra la asignación actual y crea una nueva asignación en otra habitación.

**Payload:**
```javascript
{
  action: "reassign_room",
  payload: {
    id: string,                        // Requerido - ID del inquilino
    new_room_id: string,               // Requerido - ID de la nueva habitación
    move_in_date: string,              // Requerido - Fecha entrada (YYYY-MM-DD)
    billing_start_date?: string,       // Fecha inicio facturación (YYYY-MM-DD)
    monthly_rent?: number,             // Renta mensual
    deposit_amount?: number,           // Fianza
    commission_amount?: number,        // Comisión
    first_month_amount?: number,       // Importe primer mes (prorrateado)
    services_provision_amount?: number // Provisión de servicios
  }
}
```

**Validaciones:**
- El inquilino existe y pertenece al tenant
- La nueva habitación existe y pertenece al tenant
- La nueva habitación NO está en mantenimiento
- La nueva habitación está libre

**Efectos:**
- Cierra asignación actual (pone `move_out_date = move_in_date`)
- Crea nueva asignación en la nueva habitación

**Response:**
```javascript
{
  ok: true,
  data: { /* nueva asignación */ }
}
```

**Auditoría:**
- `entity_type`: "lodger_assignment"
- `action`: "reassign_room"
- `old_values`: asignación anterior
- `new_values`: nueva asignación

**Uso desde frontend:**
```javascript
import { reassignRoom } from '@/services/lodgers.service';

await reassignRoom(lodgerId, {
  newRoomId: "uuid-new-room",
  moveInDate: "2026-06-01",
  billingStartDate: "2026-07-01",
  monthlyRent: 550,
  depositAmount: 1100
});
```

---

#### 7. `schedule_checkout` - Programar check-out
Programa la fecha de salida de un inquilino.

**Payload:**
```javascript
{
  action: "schedule_checkout",
  payload: {
    id: string,              // Requerido - ID del inquilino
    checkout_date: string    // Requerido - Fecha salida (YYYY-MM-DD)
  }
}
```

**Validaciones:**
- El inquilino existe y pertenece al tenant
- El inquilino tiene asignación activa

**Efectos:**
- Actualiza `move_out_date` en la asignación activa
- Actualiza `onboarding_status` a "pending_checkout"

**Response:**
```javascript
{
  ok: true,
  data: {
    assignment_id: "uuid"
  }
}
```

**Auditoría:**
- `entity_type`: "lodger"
- `action`: "schedule_checkout"
- `old_values`: { move_out_date: null }
- `new_values`: { move_out_date: "2026-06-30" }

**Uso desde frontend:**
```javascript
import { scheduleCheckout } from '@/services/lodgers.service';

await scheduleCheckout(lodgerId, "2026-06-30");
```

---

## Códigos de error

La Edge Function utiliza códigos de error estándar:

| Código | Descripción |
|--------|-------------|
| `UNAUTHORIZED` | JWT inválido o faltante |
| `FORBIDDEN` | Permisos insuficientes o cuenta inactiva |
| `NOT_FOUND` | Recurso no encontrado |
| `VALIDATION` | Error de validación de datos |
| `INVALID_ACTION` | Acción desconocida |
| `PLAN_LIMIT_EXCEEDED` | Límite del plan alcanzado |
| `ACCOUNT_INACTIVE` | Cuenta no activa |
| `INTERNAL` | Error interno del servidor |

---

## Registro de auditoría

Todas las operaciones crean un registro en la tabla `audit_log` con:

| Campo | Descripción |
|-------|-------------|
| `client_account_id` | ID de la cuenta del cliente |
| `actor_user_id` | ID del usuario que realizó la acción |
| `actor_role` | Rol del usuario (admin/superadmin) |
| `entity_type` | Tipo de entidad ("lodger" o "lodger_assignment") |
| `entity_id` | ID de la entidad afectada |
| `action` | Acción realizada |
| `old_values` | Valores anteriores (JSONB) |
| `new_values` | Valores nuevos (JSONB) |
| `created_at` | Timestamp de la acción |

Estos registros son visibles en el dashboard de "Actividad Reciente".

---

## Despliegue

Para desplegar cambios en la Edge Function:

```bash
# Desde la raíz del proyecto
supabase functions deploy manage_lodger --project-ref lqwyyyttjamirccdtlvl
```

**Nota:** Asegúrate de tener configuradas las variables de entorno en Supabase Dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
