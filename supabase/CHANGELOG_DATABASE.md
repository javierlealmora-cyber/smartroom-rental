# Changelog de Base de Datos - SmartRoom Rental

## [2026-03-25] - Actualización de Check-Out y Estados Dinámicos

### Cambios en Esquema

#### Tabla: `lodger_room_assignments`

**Campos actualizados/añadidos:**

1. **`move_out_date`** (date, nullable)
   - Fecha de salida del inquilino
   - NULL = inquilino activo
   - Fecha futura = pendiente de baja
   - Fecha pasada/hoy = inactivo

2. **`checkout_notes`** (text, nullable)
   - Observaciones del proceso de check-out
   - Notas sobre estado de la habitación, incidencias, etc.
   - Máximo 500 caracteres en UI

3. **`deposit_amount`** (numeric, NOT NULL, default 0)
   - Importe de la fianza pagada
   - Usado para cálculo de devolución en check-out

4. **`commission_amount`** (numeric, nullable)
   - Comisión cobrada al inquilino (si aplica)

5. **`first_month_amount`** (numeric, nullable)
   - Importe del primer mes (puede ser prorrateado)

6. **`check_out_date`** (date, nullable)
   - Fecha adicional de check-out (legacy)
   - **Nota:** Se usa `move_out_date` para la funcionalidad principal

**Estructura completa:**
```sql
CREATE TABLE public.lodger_room_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id),
  lodger_id uuid NOT NULL REFERENCES public.profiles(id),
  room_id uuid NOT NULL REFERENCES public.rooms(id),
  accommodation_id uuid NOT NULL REFERENCES public.accommodations(id),
  
  -- Fechas
  move_in_date date NOT NULL,
  move_out_date date,
  billing_start_date date NOT NULL,
  check_out_date date,
  
  -- Importes
  monthly_rent numeric,
  deposit_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric,
  first_month_amount numeric,
  
  -- Estado y notas
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  checkout_notes text,
  
  -- Auditoría
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Migraciones Aplicadas

1. **`20260325_add_checkout_notes_to_lodger_assignments.sql`**
   - Añade campo `checkout_notes` a `lodger_room_assignments`

### Lógica de Estados Dinámicos

Los estados de los inquilinos ahora se calculan **dinámicamente** basándose en el histórico de asignaciones:

```javascript
function getLodgerStatus(lodger) {
  const assignments = lodger?.assignments || [];
  
  if (!assignments || assignments.length === 0) {
    return 'invited'; // Sin asignaciones
  }
  
  // Ordenar por move_in_date DESC y tomar la más reciente
  const sortedAssignments = [...assignments].sort((a, b) => {
    const dateA = a.move_in_date ? new Date(a.move_in_date) : new Date(0);
    const dateB = b.move_in_date ? new Date(b.move_in_date) : new Date(0);
    return dateB - dateA;
  });
  
  const latestAssignment = sortedAssignments[0];
  
  if (!latestAssignment.move_in_date) return 'invited';
  if (!latestAssignment.move_out_date) return 'active';
  
  const checkOutDate = dayjs(latestAssignment.move_out_date);
  const today = dayjs().startOf('day');
  
  return checkOutDate.isAfter(today) ? 'pending_checkout' : 'inactive';
}
```

**Estados posibles:**
- `invited`: Sin asignaciones o sin fecha de entrada
- `active`: Tiene check-in pero NO tiene check-out
- `pending_checkout`: Tiene check-out programado a futuro
- `inactive`: Tiene check-out en el pasado o hoy

### Seeds de Desarrollo Actualizados

El archivo `supabase/seeds/development/07_lodger_room_assignments.sql` ahora incluye:

1. **Inquilinos con diferentes estados:**
   - Inquilino #1: Activo (sin `move_out_date`)
   - Inquilino #2: Activo con histórico (múltiples asignaciones)
   - Inquilino #3: Pendiente de baja (`move_out_date` = 2026-06-30)
   - Inquilino #4: Inactivo (`move_out_date` = 2025-12-31)

2. **Datos de prueba completos:**
   - Fianzas calculadas (2 meses de renta)
   - Comisiones (10% del primer mes para algunos)
   - Importes de primer mes (algunos con descuento)
   - Notas de check-out para inquilinos con salida

3. **Asignaciones históricas:**
   - Inquilino #2 tiene una asignación anterior (2023-2024) con status 'ended'
   - Permite probar la lógica de múltiples asignaciones

### Impacto en la Aplicación

#### Componentes Modificados:

1. **`TenantsList.jsx`**
   - Badge de estado dinámico debajo del check-in
   - Botón de check-out (rojo) solo para inquilinos activos
   - Modal de check-out con consumos moqueados

2. **`AccommodationDetail.jsx`**
   - Badge de estado junto al nombre del inquilino en tarjetas de habitación
   - Carga de TODAS las asignaciones (no solo activas) para cálculo de estado

#### Funciones Auxiliares Añadidas:

```javascript
// Cálculo de estado dinámico
getLodgerStatus(lodger)
getLodgerStatusColor(status)
getLodgerStatusLabel(status)

// Generación de consumos moqueados
generateMockedConsumptions(moveInDate, checkOutDate)

// Formato de moneda
formatCurrency(amount)
```

### Queries Importantes

#### Cargar todas las asignaciones de inquilinos:

```javascript
const { data: allAssignments } = await supabase
  .from("lodger_room_assignments")
  .select("id, lodger_id, move_in_date, move_out_date, room_id, accommodation_id, deposit_amount")
  .in("lodger_id", lodgerIds);
```

**IMPORTANTE:** NO filtrar por `status='active'` para permitir el cálculo de estado dinámico basado en histórico completo.

#### Actualizar check-out:

```javascript
const { error } = await supabase
  .from('lodger_room_assignments')
  .update({
    move_out_date: checkoutDate,
    checkout_notes: observations || null,
  })
  .eq('id', assignmentId);
```

**IMPORTANTE:** NO actualizar el campo `status` del inquilino. El estado se calcula dinámicamente.

### Verificación de Datos

Para verificar los estados dinámicos en desarrollo:

```sql
SELECT 
  p.full_name,
  lra.move_in_date,
  lra.move_out_date,
  lra.checkout_notes,
  CASE 
    WHEN lra.move_out_date IS NULL THEN 'Activo'
    WHEN lra.move_out_date > CURRENT_DATE THEN 'Pendiente de baja'
    ELSE 'Inactivo'
  END as estado_dinamico
FROM lodger_room_assignments lra
JOIN profiles p ON p.id = lra.lodger_id
WHERE lra.status = 'active'
ORDER BY p.full_name;
```

### Consumos Moqueados

Los consumos se generan automáticamente basándose en el período de estancia:

```javascript
const days = dayjs(checkOutDate).diff(dayjs(moveInDate), 'day');
const months = Math.max(1, Math.ceil(days / 30));

// Consumos base por mes con variación aleatoria
const waterPerMonth = 15 + Math.random() * 10;      // 15-25€/mes
const electricityPerMonth = 25 + Math.random() * 20; // 25-45€/mes
const gasPerMonth = 10 + Math.random() * 15;        // 10-25€/mes
```

### Archivos Actualizados

1. **Baseline:**
   - `supabase/baseline/01_schema.sql` - Esquema actualizado

2. **Migraciones:**
   - `supabase/migrations/20260325_add_checkout_notes_to_lodger_assignments.sql`

3. **Seeds:**
   - `supabase/seeds/development/07_lodger_room_assignments.sql` - Datos de prueba

4. **Tests:**
   - `tests/test-cases/LODGER-CHECKOUT-AND-DYNAMIC-STATUS.md` - 27 casos de prueba

### Próximos Pasos

1. ✅ Aplicar migración en producción
2. ✅ Verificar que los seeds de desarrollo funcionan correctamente
3. ✅ Ejecutar tests de validación
4. ⏳ Implementar cálculo real de consumos (actualmente moqueados)
5. ⏳ Añadir reportes de check-out

---

## Notas Importantes

- **NO modificar el campo `status` del inquilino** durante el check-out
- **Cargar TODAS las asignaciones** para cálculo de estado dinámico
- **El estado se calcula en tiempo real** basándose en fechas
- **Los consumos son moqueados** hasta implementar integración real
