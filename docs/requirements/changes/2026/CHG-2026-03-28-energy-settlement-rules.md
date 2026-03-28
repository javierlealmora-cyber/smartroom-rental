# CHG-2026-03-28: Reglas de Liquidación de Energía y Tabla Consumptions

**Estado:** 🟡 En Desarrollo  
**Fecha:** 2026-03-28  
**Tipo:** Schema + Business Logic  
**Prioridad:** ALTA

---

## Issue Origen

**Pendiente crear issue en GitHub**

---

## Contexto

El sistema actual gestiona facturas de energía y su liquidación entre inquilinos, pero presenta limitaciones:

1. **Consumos mockeados en frontend:** Los datos de consumo diario se generan en el cliente, no se persisten en BD
2. **Sin registro histórico:** No hay trazabilidad de consumos reales
3. **Liquidación manual:** El reparto de costes requiere cálculos manuales complejos
4. **Sin validación:** No hay validación automática de lecturas de contadores

---

## Problema

### Escenario Actual

```
Frontend:
- Genera datos de consumo ficticios
- Muestra gráficos con datos no persistidos
- Sin historial real de consumos

Backend:
- Solo almacena facturas totales
- Liquidación requiere cálculos manuales
- Sin trazabilidad de consumos individuales
```

### Limitaciones

**Datos:**
- Consumos no persistidos → pérdida de información
- Sin historial → no se puede auditar
- Datos ficticios → no reflejan realidad

**Negocio:**
- Liquidación manual propensa a errores
- Sin transparencia para inquilinos
- Difícil justificar repartos

**Técnico:**
- Lógica de negocio en frontend
- Cálculos duplicados
- Sin validaciones automáticas

---

## Cambio Requerido

### Solución Propuesta

**1. Crear Tabla `consumptions`**

Tabla para registrar consumos reales de agua, electricidad y gas por inquilino.

```sql
CREATE TABLE consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id),
  lodger_room_assignment_id UUID NOT NULL REFERENCES lodger_room_assignments(id),
  consumption_type TEXT NOT NULL CHECK (consumption_type IN ('water', 'electricity', 'gas', 'other')),
  reading_date DATE NOT NULL,
  previous_reading DECIMAL(10,2),
  current_reading DECIMAL(10,2) NOT NULL,
  consumption_amount DECIMAL(10,2) GENERATED ALWAYS AS (current_reading - COALESCE(previous_reading, 0)) STORED,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS ((current_reading - COALESCE(previous_reading, 0)) * unit_price) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_readings CHECK (current_reading >= COALESCE(previous_reading, 0))
);
```

**Características:**
- Columnas calculadas automáticamente (GENERATED)
- Validación de lecturas (current >= previous)
- Multi-tenant con RLS
- Soporte para múltiples tipos de consumo

**2. Implementar RLS**

```sql
ALTER TABLE consumptions ENABLE ROW LEVEL SECURITY;

-- Políticas por tenant
CREATE POLICY "consumptions_select_by_tenant" ON consumptions
FOR SELECT USING (client_account_id = get_my_client_account_id());

CREATE POLICY "consumptions_insert_by_tenant" ON consumptions
FOR INSERT WITH CHECK (client_account_id = get_my_client_account_id());

-- Similar para UPDATE y DELETE
```

**3. Crear Índices**

```sql
CREATE INDEX idx_consumptions_assignment 
ON consumptions(lodger_room_assignment_id, reading_date DESC);

CREATE INDEX idx_consumptions_tenant 
ON consumptions(client_account_id, reading_date DESC);

CREATE INDEX idx_consumptions_type 
ON consumptions(consumption_type, reading_date DESC);
```

**4. Mejorar Función de Billing**

Actualizar `generate_monthly_billing()` para incluir consumos reales:

```sql
CREATE OR REPLACE FUNCTION generate_monthly_billing()
RETURNS TABLE(created_count INT, total_amount DECIMAL) AS $$
DECLARE
  v_assignment RECORD;
  v_consumption_total DECIMAL;
BEGIN
  FOR v_assignment IN
    SELECT lra.*, SUM(c.total_cost) as consumption_cost
    FROM lodger_room_assignments lra
    LEFT JOIN consumptions c ON c.lodger_room_assignment_id = lra.id
      AND c.reading_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND c.reading_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    WHERE lra.move_out_date IS NULL OR lra.move_out_date > CURRENT_DATE
    GROUP BY lra.id
  LOOP
    -- Crear billing incluyendo renta + consumos
    INSERT INTO billing_records (
      client_account_id,
      lodger_room_assignment_id,
      billing_date,
      amount,
      status,
      description
    ) VALUES (
      v_assignment.client_account_id,
      v_assignment.id,
      CURRENT_DATE,
      v_assignment.monthly_rent + COALESCE(v_assignment.consumption_cost, 0),
      'pending',
      'Renta mensual + Consumos - ' || TO_CHAR(CURRENT_DATE, 'Month YYYY')
    );
  END LOOP;
  
  RETURN QUERY SELECT v_created_count, v_total_amount;
END;
$$ LANGUAGE plpgsql;
```

---

## Impacto Funcional

### Para Usuarios (Admin)

**Antes:**
- Consumos solo visibles en frontend (datos ficticios)
- Sin registro histórico
- Liquidación manual

**Después:**
- Registro de consumos reales en BD
- Historial completo y auditable
- Cálculos automáticos
- Billing incluye consumos

### Nuevas Funcionalidades

1. **Registro de Consumos:**
   - Admin registra lecturas de contadores
   - Sistema calcula consumo automáticamente
   - Sistema calcula coste según precio unitario

2. **Consulta de Historial:**
   - Ver consumos por inquilino
   - Ver consumos por tipo
   - Ver evolución temporal
   - Exportar datos

3. **Billing Automático:**
   - Incluye renta + consumos
   - Generación mensual automática
   - Desglose detallado

### Para Inquilinos

**Antes:**
- Sin acceso a consumos reales
- Sin transparencia

**Después:**
- Ver consumos propios
- Historial detallado
- Comparar con periodos anteriores
- Tips de ahorro

---

## Impacto Base de Datos

### Migración SQL

**Archivo:** `supabase/migrations/schema/20260327000000_add_consumptions_table.sql`

**Tipo:** Schema

**Contenido:**
1. Tabla `consumptions` con columnas calculadas
2. Constraint `valid_readings`
3. RLS habilitado con 4 políticas
4. 3 índices optimizados
5. Trigger `updated_at`
6. Comentarios de documentación

**Idempotencia:** ✅ Usa `IF NOT EXISTS`

**Rollback:** Posible mediante `DROP TABLE consumptions`

### Tablas Afectadas

- `consumptions` - Nueva tabla
- `billing_records` - Lógica actualizada (función)

### Funciones Afectadas

- `generate_monthly_billing()` - Actualizada para incluir consumos

---

## Impacto Frontend

### Nuevos Componentes

```
src/pages/Consumptions.jsx - Gestión de consumos
src/components/Consumption/ConsumptionForm.jsx - Formulario
src/components/Consumption/ConsumptionList.jsx - Listado
src/components/Consumption/ConsumptionChart.jsx - Gráficos
```

### Componentes Actualizados

```
src/pages/lodger/LodgerDashboard.jsx - Mostrar consumos reales
src/pages/EnergyBills.jsx - Vincular con consumos
src/components/Energy/SettlementPreview.jsx - Incluir consumos
```

### Flujo de Usuario

**Admin - Registro de Consumo:**
1. Accede a "Consumos"
2. Click en "Nuevo Consumo"
3. Selecciona inquilino
4. Selecciona tipo (water/electricity/gas)
5. Ingresa lectura actual
6. Sistema obtiene lectura anterior automáticamente
7. Sistema calcula consumo y coste
8. Admin guarda

**Inquilino - Consulta:**
1. Accede a "Mis Consumos"
2. Ve gráfico de evolución
3. Ve tabla detallada
4. Puede filtrar por tipo y fecha

---

## Tests Requeridos

### Tests E2E (FALTANTES)

#### Test 1: Registro de Consumo
```javascript
test('should register consumption with automatic calculations', async () => {
  // Arrange
  const assignment = await createAssignment();
  await createConsumption({
    assignment_id: assignment.id,
    type: 'electricity',
    previous_reading: 1000,
    current_reading: 1050,
    unit_price: 0.15
  });
  
  // Act
  const consumption = await createConsumption({
    assignment_id: assignment.id,
    type: 'electricity',
    previous_reading: 1050,
    current_reading: 1100,
    unit_price: 0.15
  });
  
  // Assert
  expect(consumption.consumption_amount).toBe(50);
  expect(consumption.total_cost).toBe(7.50);
});
```

#### Test 2: Validación de Lecturas
```javascript
test('should prevent invalid readings', async () => {
  // Arrange
  const assignment = await createAssignment();
  
  // Act & Assert
  await expect(
    createConsumption({
      assignment_id: assignment.id,
      type: 'water',
      previous_reading: 1000,
      current_reading: 950 // Menor que anterior
    })
  ).rejects.toThrow('valid_readings');
});
```

#### Test 3: Billing con Consumos
```javascript
test('should include consumptions in monthly billing', async () => {
  // Arrange
  const assignment = await createAssignment({ monthly_rent: 450 });
  await createConsumption({
    assignment_id: assignment.id,
    type: 'electricity',
    total_cost: 25.50
  });
  
  // Act
  const billing = await generateMonthlyBilling();
  
  // Assert
  expect(billing.amount).toBe(475.50); // 450 + 25.50
});
```

### Tests Unitarios (FALTANTES)

- Componente `ConsumptionForm`
- Componente `ConsumptionChart`
- Cálculos de consumo
- Validaciones de formulario

### Estado Actual
- ❌ Tests no implementados
- ❌ Sin validación automatizada
- ❌ Funcionalidad sin cobertura

---

## Migración Esperada

**Archivo:** `20260327000000_add_consumptions_table.sql`

**Ubicación:** `supabase/migrations/schema/`

**Estado:** ✅ Aplicado en producción

**Documentación:** `docs/database/MIGRATION-INDEX.md`

---

## Criterios de Aceptación

- [x] Tabla `consumptions` creada
- [x] Columnas calculadas funcionando (GENERATED)
- [x] Constraint `valid_readings` funcionando
- [x] RLS habilitado con políticas
- [x] Índices creados
- [x] Migración aplicada en local
- [x] Migración aplicada en staging
- [x] Migración aplicada en producción
- [x] Documentado en MIGRATION-INDEX.md
- [ ] **Frontend implementado** 🟡 PARCIAL
- [ ] **Función generate_monthly_billing() actualizada** ❌ PENDIENTE
- [ ] **Tests creados** ❌ PENDIENTE
- [ ] **Consolidado en REQ-004** 🟡 PENDIENTE

---

## Observaciones

### Decisiones Técnicas

**¿Por qué columnas GENERATED?**
- Evita inconsistencias en cálculos
- Garantiza precisión
- Reduce lógica en aplicación
- Performance óptima

**¿Por qué constraint en lecturas?**
- Previene datos inválidos
- Validación automática en BD
- No depende de frontend

**¿Por qué múltiples tipos de consumo?**
- Flexibilidad para agua, luz, gas
- Extensible a otros tipos
- Mismo modelo para todos

### Limitaciones

- Requiere registro manual de lecturas
- No hay integración con medidores inteligentes
- Precio unitario es fijo (no considera tarifas variables)

### Mejoras Futuras

- Integración con medidores IoT
- Importación automática de lecturas
- Tarifas variables por horario
- Alertas de consumo excesivo
- Predicción de consumo
- Comparativas entre inquilinos (anónimas)

### Riesgos Mitigados

- ✅ Pérdida de datos de consumo
- ✅ Cálculos incorrectos
- ✅ Falta de trazabilidad

### Riesgos Pendientes

- ❌ Sin tests (riesgo de bugs)
- ❌ Frontend parcialmente implementado
- ❌ Función de billing no actualizada

---

## Referencias

- **Requisito:** `docs/requirements/current/REQ-004-energy-billing.md`
- **Migración:** `supabase/migrations/schema/20260327000000_add_consumptions_table.sql`
- **Índice:** `docs/database/MIGRATION-INDEX.md`
- **Matriz:** `docs/qa/TRACEABILITY-MATRIX.md`
- **Código:** Pendiente implementar frontend completo

---

## Estado de Consolidación

**Fecha de inicio:** 2026-03-27

**Estado:** 🟡 En desarrollo

**Pendiente para consolidación:**
1. Completar implementación de frontend
2. Actualizar función `generate_monthly_billing()`
3. Crear tests E2E y unitarios
4. Validar en staging con datos reales
5. Documentar en REQ-004

**Integración esperada en:** REQ-004 (Energy Billing)

**Sección esperada:** Reglas Actuales → Consumos Reales

---

**Última actualización:** 2026-03-28  
**Estado:** En desarrollo - Migración aplicada, frontend pendiente
