# REQ-004: Gestión de Energía y Facturación

**Estado:** ✅ Implementado y Consolidado  
**Última actualización:** 2026-03-28  
**Versión:** 1.1

---

## Objetivo

Gestionar el ciclo completo de facturación energética: desde la captura de facturas de la compañía eléctrica, pasando por el registro de consumos, hasta la liquidación y reparto de costes entre inquilinos.

---

## Alcance

### Incluye
- Registro de facturas eléctricas
- Escaneo automático de facturas (OCR)
- Registro de lecturas de contadores
- Registro de consumos reales (agua, luz, gas)
- Liquidación de facturas con reparto de costes
- Generación de boletines energéticos para inquilinos
- Hucha energética virtual (ajustes y regularizaciones)
- Cálculo automático de consumos

### No Incluye
- Integración directa con compañías eléctricas
- Pagos automáticos de facturas
- Gestión de contratos con proveedores
- Comparador de tarifas

---

## Reglas Actuales

### Facturas Eléctricas (Energy Bills)

#### Campos Principales
```
- id (UUID)
- client_account_id (UUID)
- accommodation_id (UUID) - Alojamiento al que pertenece
- company_name (TEXT) - Compañía eléctrica
- bill_number (TEXT) - Número de factura
- reference (TEXT) - Referencia
- issue_date (DATE) - Fecha de emisión
- period_start (DATE) - Inicio del periodo
- period_end (DATE) - Fin del periodo
- total_consumption (DECIMAL) - kWh totales
- energy_cost (DECIMAL) - Coste de energía
- power_cost (DECIMAL) - Coste de potencia
- meter_cost (DECIMAL) - Coste de contador
- discounts (DECIMAL) - Descuentos
- other_costs (DECIMAL) - Otros costes
- taxes (DECIMAL) - Impuestos
- total_amount (DECIMAL) - Importe total
- file_url (TEXT) - URL del archivo en storage
- status (TEXT) - pending/validated/settled
- created_at, updated_at
```

#### Estados
- `pending` - Factura registrada, pendiente de validación
- `validated` - Validada por gestor, pendiente de liquidar
- `settled` - Liquidada y repartida entre inquilinos

#### Flujo
1. Admin sube factura PDF
2. Sistema escanea con OCR (Edge Function `scan_energy_bill`)
3. Sistema extrae datos automáticamente
4. Admin valida/corrige datos
5. Admin marca como validada
6. Admin ejecuta liquidación
7. Sistema reparte costes entre inquilinos
8. Sistema genera boletines

### Lecturas de Contadores (Energy Readings)

#### Campos Principales
```
- id (UUID)
- client_account_id (UUID)
- accommodation_id (UUID)
- reading_date (DATE)
- meter_reading (DECIMAL) - Lectura del contador en kWh
- notes (TEXT)
- created_at, updated_at
```

#### Propósito
- Registro histórico de lecturas
- Validación de consumos
- Detección de anomalías

### Consumos Reales (Consumptions)

#### Campos Principales
```
- id (UUID)
- client_account_id (UUID)
- lodger_room_assignment_id (UUID) - Asignación del inquilino
- consumption_type (TEXT) - water/electricity/gas/other
- reading_date (DATE)
- previous_reading (DECIMAL)
- current_reading (DECIMAL)
- consumption_amount (DECIMAL) - Calculado: current - previous
- unit_price (DECIMAL)
- total_cost (DECIMAL) - Calculado: consumption * unit_price
- notes (TEXT)
- created_at, updated_at
```

#### Reglas
- `consumption_amount` es columna calculada (GENERATED)
- `total_cost` es columna calculada (GENERATED)
- Validación: `current_reading >= previous_reading`
- RLS habilitado con políticas por tenant

### Liquidaciones (Energy Settlements)

#### Campos Principales
```
- id (UUID)
- client_account_id (UUID)
- energy_bill_id (UUID) - Factura origen
- lodger_room_assignment_id (UUID) - Asignación del inquilino
- settlement_date (DATE)
- days_occupied (INTEGER) - Días de ocupación
- estimated_consumption (DECIMAL) - kWh estimados
- fixed_cost (DECIMAL) - Coste fijo (potencia, contador)
- variable_cost (DECIMAL) - Coste variable (energía)
- total_cost (DECIMAL) - fixed_cost + variable_cost
- notes (TEXT)
- created_at, updated_at
```

#### Reglas de Reparto

##### Coste Fijo (Potencia, Contador, Otros)
**Criterio:** Reparto por ocupación/presencia por día
- Se divide entre todos los inquilinos presentes cada día
- Proporcional a días de ocupación en el periodo

**Fórmula:**
```
coste_fijo_inquilino = (coste_fijo_total / total_dias_ocupados_todos) * dias_ocupados_inquilino
```

##### Coste Variable (Energía)
**Criterio:** Reparto según consumo estimado
- Proporcional al consumo de cada inquilino
- Basado en lecturas o estimaciones

**Fórmula:**
```
coste_variable_inquilino = (coste_variable_total / consumo_total_todos) * consumo_inquilino
```

##### Validación de Cuadre
**Regla crítica:** Total asignado = Total factura
```
SUM(fixed_cost + variable_cost) = energy_bill.total_amount
```

### Boletines Energéticos (Bulletins)

#### Campos Principales
```
- id (UUID)
- client_account_id (UUID)
- lodger_id (UUID)
- energy_bill_id (UUID)
- period_start (DATE)
- period_end (DATE)
- total_consumption (DECIMAL)
- fixed_cost (DECIMAL)
- variable_cost (DECIMAL)
- total_cost (DECIMAL)
- status (TEXT) - draft/published
- created_at, updated_at
```

#### Propósito
- Informar a inquilino de sus consumos
- Desglose detallado de costes
- Transparencia en reparto

### Hucha Energética Virtual

#### Concepto
Sistema de ajustes y regularizaciones para diferencias entre:
- Consumos estimados vs reales
- Pagos adelantados vs consumo real
- Ajustes por entrada/salida en medio del periodo

#### Campos (en lodger_services o tabla específica)
```
- balance (DECIMAL) - Saldo acumulado
- movements (JSONB) - Historial de movimientos
  - tipo: cargo/abono
  - concepto: descripción
  - importe: cantidad
  - fecha: timestamp
```

---

## Casos Válidos

### CV-001: Registrar Factura con OCR
**Precondiciones:**
- Factura PDF disponible
- Edge Function `scan_energy_bill` activa

**Flujo:**
1. Admin accede a "Facturas de Energía"
2. Click en "Nueva Factura"
3. Sube archivo PDF
4. Sistema escanea con OCR
5. Sistema extrae: compañía, número, fechas, importes
6. Admin revisa y corrige si necesario
7. Admin guarda factura con status 'pending'

**Resultado esperado:** 
- Factura creada con datos extraídos
- Archivo almacenado en storage bucket 'energy-bills'

---

### CV-002: Liquidar Factura
**Precondiciones:**
- Factura validada
- Inquilinos con asignaciones activas en el periodo

**Flujo:**
1. Admin accede a factura validada
2. Click en "Liquidar Factura"
3. Sistema calcula:
   - Días de ocupación por inquilino
   - Consumo estimado por inquilino
   - Reparto de coste fijo
   - Reparto de coste variable
4. Sistema muestra previsualización
5. Admin confirma
6. Sistema crea registros en `energy_settlements`
7. Sistema genera boletines para cada inquilino
8. Sistema marca factura como 'settled'

**Resultado esperado:**
- Liquidaciones creadas
- Boletines generados
- Total cuadrado con factura

---

### CV-003: Registrar Consumo Real
**Precondiciones:**
- Inquilino con asignación activa
- Lectura anterior disponible

**Flujo:**
1. Admin accede a "Consumos"
2. Click en "Nuevo Consumo"
3. Selecciona inquilino
4. Selecciona tipo: electricity
5. Ingresa lectura actual: 1250 kWh
6. Sistema obtiene lectura anterior: 1200 kWh
7. Sistema calcula consumo: 50 kWh
8. Admin ingresa precio unitario: 0.15€/kWh
9. Sistema calcula coste: 7.50€
10. Admin guarda

**Resultado esperado:**
- Consumo registrado con cálculos automáticos
- Disponible para próxima liquidación

---

### CV-004: Consultar Boletín (Inquilino)
**Precondiciones:**
- Inquilino autenticado
- Boletín publicado

**Flujo:**
1. Inquilino accede a su portal
2. Click en "Boletines"
3. Sistema muestra listado de boletines
4. Inquilino selecciona boletín
5. Sistema muestra detalle:
   - Periodo
   - Consumo total
   - Desglose fijo/variable
   - Total a pagar

**Resultado esperado:** Inquilino ve su consumo y costes

---

## Casos Inválidos

### CI-001: Liquidar Factura Sin Validar
**Flujo:**
1. Admin intenta liquidar factura con status 'pending'

**Resultado esperado:** Error "Factura debe estar validada"

---

### CI-002: Consumo con Lectura Inválida
**Flujo:**
1. Admin ingresa lectura actual: 1150 kWh
2. Lectura anterior: 1200 kWh
3. Sistema detecta current < previous

**Resultado esperado:** 
- Error "Lectura actual no puede ser menor que anterior"
- Constraint `valid_readings` previene insert

---

### CI-003: Liquidación con Cuadre Incorrecto
**Flujo:**
1. Sistema calcula liquidaciones
2. SUM(liquidaciones) ≠ total_factura
3. Diferencia > 0.01€

**Resultado esperado:**
- Error "El reparto no cuadra con el total de la factura"
- No permite guardar liquidación

---

## Impacto Frontend

### Componentes Principales
- `src/pages/EnergyBills.jsx` - Gestión de facturas
- `src/pages/EnergyBillDetail.jsx` - Detalle y liquidación
- `src/pages/Consumptions.jsx` - Registro de consumos
- `src/pages/lodger/Bulletins.jsx` - Portal inquilino
- `src/components/Energy/BillForm.jsx`
- `src/components/Energy/SettlementPreview.jsx`
- `src/components/Energy/ConsumptionForm.jsx`

### Flujos de Usuario

#### Admin
1. **Gestión de Facturas:**
   - Upload PDF con OCR
   - Validación de datos
   - Liquidación con previsualización
   - Generación de boletines

2. **Registro de Consumos:**
   - Registro manual
   - Cálculo automático
   - Historial por inquilino

#### Inquilino
1. **Consulta de Consumos:**
   - Ver boletines
   - Desglose detallado
   - Historial de consumos
   - Tips de ahorro

---

## Impacto Base de Datos

### Tablas Involucradas

#### energy_bills
```sql
- Factura de compañía eléctrica
- Desglose completo de costes
- Estado: pending/validated/settled
```

#### energy_readings
```sql
- Lecturas históricas de contadores
- Por alojamiento y fecha
```

#### consumptions (NUEVA - CHG-2026-03-28)
```sql
- Consumos reales por inquilino
- Tipos: water/electricity/gas/other
- Cálculos automáticos (GENERATED columns)
- RLS habilitado
```

#### energy_settlements
```sql
- Liquidaciones por inquilino
- Reparto fijo + variable
- Vinculada a factura origen
```

#### bulletins
```sql
- Boletines para inquilinos
- Resumen de consumos y costes
```

### Funciones SQL

#### generate_monthly_billing()
```sql
-- Genera billing mensual automático
-- Incluye rentas + consumos
-- Ejecutada por cron mensualmente
```

### Edge Functions

#### scan_energy_bill
```sql
-- Escanea PDF de factura con OCR
-- Extrae datos estructurados
-- Retorna JSON con campos
```

#### settle_energy_bill
```sql
-- Ejecuta liquidación de factura
-- Calcula repartos
-- Genera liquidaciones y boletines
```

### Storage Buckets

#### energy-bills
- **Propósito:** Almacenar PDFs de facturas
- **Acceso:** Autenticado por tenant
- **Tamaño máximo:** 10MB
- **Formatos:** PDF

### Migraciones Relacionadas
- `00000000000001_baseline_schema.sql` - Tablas iniciales
- `00000000000006_baseline_storage.sql` - Bucket energy-bills
- `20260327000000_add_consumptions_table.sql` - Tabla consumptions
- `20260326000003_add_helper_functions.sql` - generate_monthly_billing

---

## Tests Asociados

### Tests E2E
- ❌ `tests/e2e/energy-bill-upload.spec.js` - Upload y OCR (falta)
- ❌ `tests/e2e/energy-settlement.spec.js` - Liquidación (falta)
- ❌ `tests/e2e/consumption-crud.spec.js` - Consumos (falta)
- ❌ `tests/e2e/lodger-bulletins.spec.js` - Portal inquilino (falta)

### Tests de Integración
- ❌ Edge Function `scan_energy_bill` (falta)
- ❌ Edge Function `settle_energy_bill` (falta)
- ❌ Función `generate_monthly_billing()` (falta)

### Tests Unitarios
- ❌ Componentes de Energy (falta)
- ❌ Cálculos de reparto (falta)

### Cobertura
- **E2E:** 0% (**CRÍTICO**)
- **Integración:** 0% (**CRÍTICO**)
- **Unitarios:** 0% (**CRÍTICO**)

---

## Issues Relacionados

- **CRÍTICO:** Crear suite completa de tests para módulo Energy
- **CRÍTICO:** Validar cálculos de reparto con casos reales
- **ALTO:** Mejorar precisión de OCR
- **MEDIO:** Implementar validación de cuadre automática

---

## Observaciones

### Fortalezas
- OCR automático reduce trabajo manual
- Cálculos automáticos en BD (GENERATED columns)
- Validaciones de integridad (constraints)
- Transparencia para inquilinos (boletines)
- Edge Functions para lógica compleja

### Limitaciones Conocidas
- OCR no es 100% preciso, requiere validación manual
- No hay integración con compañías eléctricas
- Reparto de costes es estimado, no medido
- No hay validación automática de cuadre en BD

### Mejoras Futuras
- Integración con APIs de compañías eléctricas
- Medidores inteligentes (IoT) para consumo real
- Validación automática de cuadre en trigger
- Comparador de tarifas
- Alertas de consumo excesivo
- Gráficos de evolución de consumo

### Dependencias Críticas
- **Edge Function scan_energy_bill:** OCR de facturas
- **Edge Function settle_energy_bill:** Liquidación
- **Storage bucket energy-bills:** Almacenamiento de PDFs
- **Función generate_monthly_billing():** Billing automático

### Riesgos
- **CRÍTICO:** Sin tests, riesgo alto de errores en cálculos
- **ALTO:** OCR puede fallar, requiere validación manual
- **MEDIO:** Reparto estimado puede generar disputas
- **MEDIO:** Cuadre manual propenso a errores

---

## Referencias

- **Código:** `src/pages/EnergyBills.jsx`, `src/components/Energy/`
- **Edge Functions:** `supabase/functions/scan_energy_bill/`, `supabase/functions/settle_energy_bill/`
- **Migraciones:** `20260327000000_add_consumptions_table.sql`
- **CHG relacionado:** `CHG-2026-03-28-energy-settlement-rules.md`
- **Documentación:** `docs/requisitos-funcionales.md` (sección 2.2)

---

**Consolidado desde:**
- Baseline inicial del sistema
- Requisitos funcionales originales (sección 2.2 Energía)
- CHG-2026-03-28-energy-settlement-rules
- Implementación actual en producción
- Análisis de Edge Functions
