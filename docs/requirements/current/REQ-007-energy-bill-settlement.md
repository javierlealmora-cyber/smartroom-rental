# REQ-007 - Reparto de factura de suministros entre inquilinos

## Status
ACTIVE

## Owner
@admin

## Last updated
2026-03-29

---

## 🎯 Objetivo

Distribuir automáticamente el importe de una factura de suministros (luz, agua, gas) entre los
inquilinos que habitaron el alojamiento durante el período facturado, generando un boletín
borrador por inquilino listo para revisión y envío.

Elimina el cálculo manual, garantiza que el total repartido cuadra exactamente con la factura
original y aplica el único algoritmo correcto: **reparto por fracción diaria**.

---

## 📌 Alcance

### Incluye
- Cálculo de la fracción de coste por inquilino, día a día, según quién estaba activo cada día
- Reparto del coste fijo (potencia + contador) y variable con el mismo algoritmo de fracción
- **Lecturas kWh opcionales:** si existen en `energy_readings` (fuente `api`/`manual`), el coste variable es proporcional a kWh; si no, proporcional a días
- **Generación de lecturas estimadas:** si no hay lecturas reales y `total_kwh > 0` en la factura, el reparto genera automáticamente en `energy_readings` una lectura estimada por habitación activa por día (`kwh = total_kwh / totalDays / n_habitaciones_activas_hoy`, `source = "estimated"`)
- Reconciliación de céntimos para cuadre exacto con la factura
- Generación automática de boletines en estado `draft`
- Marca de la factura como `settled` al completar el reparto
- **Borrar reparto:** reversión completa (elimina settlements + bulletins + lecturas estimadas del período + vuelve a `validated`)

### No incluye
- Envío de boletines a inquilinos (proceso separado)
- Reparto de gastos de comunidad / servicios extra (`amount_services` — pendiente GAP-001)
- Paginación o reparto por tramos
- Notificaciones automáticas al inquilino

---

## 🧩 Descripción funcional

### Precondiciones

Para ejecutar el reparto, la factura debe cumplir:
1. `energy_bills.status` = `'validated'` — no se puede reliquidar una factura ya `'settled'`
2. Existir al menos una `lodger_room_assignment` solapada con el período facturado
3. `bill_id` pertenece al mismo `client_account_id` que el admin que invoca

### Modelo de datos relevante

```
energy_bills
  id, accommodation_id, client_account_id
  utility_type         TEXT  ('electricity' | 'water' | 'gas')
  period_start         DATE
  period_end           DATE
  amount_total         NUMERIC  ← importe a repartir exactamente
  amount_power         NUMERIC  ← coste de potencia (parte fija)
  amount_meter         NUMERIC  ← coste de contador (parte fija)
  total_kwh            NUMERIC  ← kWh totales de la factura (opcional, informativo)
  status               TEXT  ('pending' | 'validated' | 'settled')

accommodations
  has_individual_meters  BOOLEAN  ← si tiene contadores individuales (kWh por habitación)

energy_settlements  (granularidad diaria — una fila por habitación+inquilino+día)
  id, client_account_id, energy_bill_id, accommodation_id, room_id, lodger_id
  settlement_date       DATE     ← día al que corresponde esta fila
  kwh_day               NUMERIC  ← kWh consumidos ese día (0 si sin lector)
  amount_fixed_day      NUMERIC  ← fracción del coste fijo para este día
  amount_variable_day   NUMERIC  ← fracción del coste variable para este día
  amount_total_day      NUMERIC  ← amount_fixed_day + amount_variable_day
  UNIQUE (energy_bill_id, room_id, lodger_id, settlement_date)

energy_readings  (lecturas de contadores — reales o estimadas)
  accommodation_id, room_id, reading_date, kwh
  source  TEXT  ('api' | 'manual' | 'import' | 'estimated')
  ← 'estimated': generadas automáticamente por el reparto cuando total_kwh > 0
  ← Una fila por habitación activa por día del período facturado
  ← kwh = total_kwh_factura / totalDays / n_habitaciones_activas_hoy

bulletins
  lodger_id, accommodation_id, energy_bill_id, client_account_id
  period_start, period_end
  days_present, kwh_consumed
  amount_fixed, amount_variable, amount_services (= 0 hoy), amount_total
  status  TEXT  ('draft' | 'sent' | 'paid')
```

---

## 🔁 Flujo funcional

### Reparto (Repartir)

```
1. Admin pulsa "Repartir" en una factura validada
         ↓
2. [energy.service.js → settleEnergyBill(billId, clientAccountId)]
         ↓
3. Validar que la factura existe, pertenece al tenant y está en estado 'validated'
         ↓
4. Cargar asignaciones solapadas con el período:
     move_in_date <= period_end
     AND (move_out_date IS NULL OR move_out_date >= period_start)
         ↓
5. Construir mapa día→[inquilinos activos] para cada día del período
         ↓
6. Calcular fracción acumulada por inquilino:
     fraction[lodger_id] += (1 / total_days / n_activos_hoy)  para cada día activo
     → La suma de todas las fracciones = 1.0 (si no hay días vacíos)
         ↓
7. Consultar energy_readings para el período (siempre, independientemente)
     hasReadings = (kwhTotal > 0)   ← true si hay lecturas de contadores reales (api/manual)
         ↓
7b. Si !hasReadings Y total_kwh > 0 en la factura → generar lecturas estimadas:
     Para cada día del período con habitaciones activas:
       activeRooms = habitaciones únicas activas ese día
       kwhPerRoom  = total_kwh / totalDays / activeRooms.length
       INSERT en energy_readings: una fila por habitación activa
         { room_id, reading_date, kwh: kwhPerRoom, source: 'estimated' }
     (DELETE previas source='estimated' para idempotencia antes del INSERT)
         ↓
8. Calcular importes por inquilino:
     fixedShare    = amountFixed    × fraction
     variableShare = hasReadings ? proporcional a kWh : amountVariable × fraction
     amount_total  = round2(fixedShare + variableShare)
         ↓
9. Ajuste de céntimos → al inquilino con fracción mayor hasta cuadre exacto
         ↓
10. Limpiar settlements y bulletins previos del mismo bill_id (idempotencia)
          ↓
11. INSERT energy_settlements (una fila por día × inquilino activo ese día)
          ↓
12. INSERT bulletins en status='draft' (uno por inquilino)
          ↓
13. UPDATE energy_bills SET status='settled'
          ↓
14. Devolver { settlements_count, amount_total, has_readings }
```

### Borrar reparto (unsettleEnergyBill)

```
1. Admin pulsa "Borrar reparto" en una factura liquidada
         ↓
2. [energy.service.js → unsettleEnergyBill(billId, clientAccountId)]
         ↓
3. Validar que la factura existe y está en estado 'settled'
         ↓
4. DELETE bulletins WHERE energy_bill_id = billId
         ↓
5. DELETE energy_settlements WHERE energy_bill_id = billId
         ↓
6. DELETE energy_readings WHERE accommodation_id = accId
          AND source = 'estimated'
          AND reading_date BETWEEN period_start AND period_end
         ↓
7. UPDATE energy_bills SET status='validated'
         ↓
8. La factura queda disponible para un nuevo reparto
```

---

## 📐 Algoritmo de reparto (fracción diaria)

### Fórmula

Para cada día `d` del período:
```
inquilinos_activos_hoy = asignaciones cuyo [move_in_date ≤ d ≤ (move_out_date ?? period_end)]
fraccion_dia = 1 / total_dias / len(inquilinos_activos_hoy)
fraction[lodger_id] += fraccion_dia  (para cada inquilino activo ese día)
```

### Propiedad matemática

`SUM(fraction.values()) ≤ 1.0`

Si hay días sin ningún inquilino activo, la suma será < 1 (el coste de esos días queda sin distribuir).
Si todos los días tienen al menos un inquilino, la suma es exactamente 1.0.

### Ejemplos

**3 inquilinos durante 31 días:**
- `fraction[A] = fraction[B] = fraction[C] = 1/31 × 31 × (1/3) = 1/3 ≈ 0.3333`
- Cada uno paga 1/3 del total → igual que el modo `equal` anterior

**Inquilino A los primeros 15 días, inquilino B los últimos 16:**
- `fraction[A] = 15/31`, `fraction[B] = 16/31`
- A paga 48.4%, B paga 51.6% → proporcional a días

**Inquilino A los 31 días, inquilino B solo el día 1:**
- Día 1: A y B comparten → A += 1/31/2, B += 1/31/2
- Días 2–31: solo A → A += 30/31
- `fraction[A] ≈ 0.984`, `fraction[B] ≈ 0.016`

### Coste fijo vs variable

| Parte | Cálculo |
|-------|---------|
| `amount_fixed` (potencia + contador) | `amountFixed × fraction[lodger]` |
| `amount_variable` (consumo) sin lector | `amountVariable × fraction[lodger]` |
| `amount_variable` con lector kWh | `amountVariable × (kwh_room / kwh_total)` |

Con lector, el coste variable es proporcional al consumo real de cada habitación.
Sin lector, es proporcional a los días de ocupación (mismo fraction que el fijo).

### Reconciliación de céntimos

```
diff = round2(bill.amount_total - SUM(settlement.amount_total_por_inquilino))
Si diff ≠ 0 → se añade al inquilino con mayor fracción
```

---

## ✅ Criterios de aceptación

### CA-001 — Reparto básico: 3 inquilinos durante todo el período
**Dado** una factura de 150 € (`amount_power = 30`, `amount_meter = 20`, `amount_variable = 100`)
y 3 inquilinos activos durante todo el período (31 días cada uno)
**Cuando** se ejecuta el reparto
**Entonces:**
- Se crean 3 × 31 = 93 filas en `energy_settlements` (una por inquilino×día)
- Se crean 3 `bulletins` con `status = 'draft'`
- Cada bulletin: `amount_fixed ≈ 16.67 €`, `amount_variable ≈ 33.33 €`
- `SUM(bulletin.amount_total)` == 150.00 € exacto (ajuste de céntimos aplicado)
- `energy_bills.status` pasa a `'settled'`

### CA-002 — Inquilino a mitad de período
**Dado** una factura del 1 al 31 de enero (31 días), `amount_total = 100 €`
y 2 inquilinos: A presente los 31 días, B entra el día 16 (16 días)
**Cuando** se ejecuta el reparto
**Entonces:**
- Días 1–15: solo A activo → A acumula `15 × (1/31/1) = 15/31`
- Días 16–31: A y B activos → cada uno acumula `16 × (1/31/2) = 8/31`
- `fraction[A] = 15/31 + 8/31 = 23/31 ≈ 0.742`, `fraction[B] = 8/31 ≈ 0.258`
- A paga ≈ 74.2 €, B paga ≈ 25.8 €
- `SUM = 100 €` exacto

### CA-003 — Con lecturas de kWh: variable proporcional a kWh
**Dado** 2 habitaciones con lecturas: HAB-1 = 80 kWh, HAB-2 = 20 kWh (total = 100 kWh)
y `amount_variable = 200 €`, `amount_fixed = 50 €`
**Cuando** se ejecuta el reparto (con lecturas disponibles)
**Entonces:**
- `amount_variable` de HAB-1: `200 × (80/100) = 160 €`
- `amount_variable` de HAB-2: `200 × (20/100) = 40 €`
- `amount_fixed` proporcional a días (fraction) para ambas
- `SUM = 250 €` exacto

### CA-004 — Sin lecturas de kWh: variable proporcional a días
**Dado** una factura sin ninguna fila en `energy_readings` para el período
**Cuando** se ejecuta el reparto
**Entonces:**
- `hasReadings = false`
- `amount_variable` de cada inquilino = `amountVariable × fraction[lodger]`
- El reparto es idéntico al antiguo modo `prorated` pero matematicamente correcto

### CA-005 — Factura ya liquidada → error
**Dado** una factura con `status = 'settled'`
**Cuando** se intenta ejecutar el reparto
**Entonces:** Error "La factura ya ha sido liquidada" — sin cambios en BD

### CA-006 — Sin inquilinos en el período → error
**Dado** una factura sin ninguna asignación solapada con el período
**Cuando** se ejecuta el reparto
**Entonces:** Error "No hay inquilinos en este período para liquidar" — sin cambios en BD

### CA-007 — Multi-tenant: solo facturas del propio tenant
**Dado** un admin del tenant A
**Cuando** intenta liquidar una factura del tenant B (aunque conozca el `bill_id`)
**Entonces:** Error "Factura no encontrada" — sin cambios en BD

### CA-008 — Inquilino que se marchó antes del período → no incluido
**Dado** un inquilino con `move_out_date = 2025-12-31` y una factura del 1 al 31 de enero 2026
**Cuando** se ejecuta el reparto
**Entonces:** ese inquilino NO aparece en los settlements ni en los bulletins

### CA-009 — Reconciliación exacta de céntimos
**Dado** cualquier factura con importe no divisible exactamente entre los inquilinos
**Cuando** se completa el reparto
**Entonces:** `SUM(bulletin.amount_total) == energy_bills.amount_total` con tolerancia 0 €

### CA-010 — Boletín generado en estado draft
**Dado** un reparto exitoso con N inquilinos
**Cuando** se consultan los bulletins creados
**Entonces:**
- Existen exactamente N bulletins nuevos
- Todos tienen `status = 'draft'`
- Cada bulletin referencia `energy_bill_id` correcto

### CA-011 — Fallo en creación de bulletins: rollback de settlements
**Dado** un error en el INSERT de bulletins (ej. constraint violation)
**Cuando** se produce el fallo
**Entonces:** Los `energy_settlements` creados en ese reparto son eliminados — sin estado parcial en BD

### CA-012 — Borrar reparto: factura vuelve a estado anterior
**Dado** una factura con `status = 'settled'` y N bulletins y M settlements creados
**Cuando** el admin ejecuta "Borrar reparto"
**Entonces:**
- N bulletins eliminados (incluidos los ya enviados)
- M filas de `energy_settlements` eliminadas
- `energy_bills.status` vuelve a `'validated'`
- La factura puede repartirse de nuevo

### CA-013 — Idempotencia: repartir sobre un reparto anterior incompleto
**Dado** una factura con settlements huérfanos (reparto anterior fallido)
**Cuando** se ejecuta el reparto de nuevo
**Entonces:**
- Los settlements y bulletins anteriores son eliminados antes de insertar
- El nuevo reparto se completa limpiamente

---

## ❌ Casos inválidos

| Caso | Comportamiento esperado |
|------|------------------------|
| `bill_id` inválido / inexistente | Error "Factura no encontrada" |
| `bill_id` de otro tenant | Error "Factura no encontrada" (sin revelar existencia) |
| Factura ya `settled` | Error "La factura ya ha sido liquidada" |
| Sin asignaciones en el período | Error "No hay inquilinos en este período" |
| Todos los inquilinos con `daysPresent = 0` | Error "Ningún inquilino tiene días en el período" |

---

## 📊 Reglas de negocio

1. **Algoritmo único:** el reparto es siempre por fracción diaria (`fraction = Σ(1/totalDays/n_activos)`). No existen modos `equal`, `prorated` ni `meter` separados — son casos derivados del mismo algoritmo.
2. **Coste fijo = potencia + contador**, siempre repartido por fracción diaria.
3. **Coste variable:** si hay lecturas de kWh (`hasReadings = true`), proporcional a kWh reales; si no, proporcional a fracción diaria.
4. **Incluye inquilinos históricos:** un inquilino que estuvo en enero pero se marchó en febrero participa en la liquidación de la factura de enero.
5. **Cuadre exacto:** la diferencia de céntimos se asigna al inquilino con mayor fracción.
6. **Idempotencia:** el servicio limpia settlements y bulletins anteriores antes de insertar, permitiendo reintentos seguros.
7. **Bulletins en draft:** el admin debe revisar y enviar manualmente.
8. **`amount_services = 0`** en todos los bulletins actuales (pendiente GAP-001).
9. **Borrar reparto:** permite revertir una liquidación eliminando todos sus settlements y bulletins, devolviendo la factura a `validated`.

---

## 🗄️ Impacto en base de datos

**Tablas escritas:**
- `energy_settlements` — INSERT (una fila por día × inquilino activo); DELETE en borrar reparto / idempotencia
- `bulletins` — INSERT (uno por inquilino, `status = 'draft'`); DELETE en borrar reparto / idempotencia
- `energy_bills` — UPDATE `status = 'settled'` / `'validated'`

**Tablas leídas:**
- `energy_bills` + `accommodations` — factura y si tiene contadores individuales
- `lodger_room_assignments` — inquilinos solapados con el período
- `energy_readings` — kWh por habitación (siempre consultado; `hasReadings = kwhTotal > 0`)
- `profiles` — rol y tenant del admin (verificación RLS)

**Transaccionalidad:** Los settlements y bulletins se insertan en operaciones separadas. Si falla el INSERT de bulletins, se revierten los settlements (`DELETE WHERE energy_bill_id = bill_id`). No hay transacción atómica a nivel DB.

---

## 🧱 Impacto en frontend

**Componentes afectados:**
- `src/pages/v2/admin/accommodations/tabs/FacturasTab.jsx` — botón "Repartir" + "Borrar reparto" + badge de estado

**Flujo UI:**
1. Factura en estado `validated` → botón "Repartir" visible con `Popconfirm`
2. Click + confirmar → llama `settleEnergyBill(bill.id, clientAccountId)` → spinner
3. Éxito → badge "Repartida" (verde), botón "Borrar reparto" visible
4. Click "Borrar reparto" → `Popconfirm` con advertencia sobre bulletins publicados → llama `unsettleEnergyBill`
5. Éxito → badge vuelve a "Validada", botón "Repartir" reaparece

**Servicio:**
- `src/services/energy.service.js` → `settleEnergyBill(billId, clientAccountId)` + `unsettleEnergyBill(billId, clientAccountId)`

---

## 🧪 Validación (QA)

Tests asociados:
- unit: `qa/unit/logic/energy-settlement.test.js` — lógica pura de cálculo del algoritmo de fracción
- services: `qa/unit/services/energy.service.test.js` — invocación del servicio con Supabase mockeado
- e2e: `qa/e2e/specs/energy.spec.js` — flujo completo en browser

**Cobertura:**
- ✅ CA-001 (3 inquilinos, período completo)
- ✅ CA-002 (inquilino a mitad de período)
- ✅ CA-003 (con lecturas kWh)
- ✅ CA-004 (sin lecturas kWh → fracción diaria)
- ✅ CA-005 (factura ya liquidada → error)
- ✅ CA-006 (sin inquilinos → error)
- ✅ CA-009 (reconciliación de céntimos)
- ✅ CA-013 (idempotencia)
- ⚠️ CA-007 (multi-tenant) — solo en RLS, sin test unitario dedicado
- ⚠️ CA-011 (rollback bulletins) — sin test E2E

---

## 🔗 Trazabilidad

- Requisito padre: REQ-004 (gestión de energía)
- Migración BD: `supabase/migrations/schema/20260329000000_energy_settlements_daily.sql`
- Servicio frontend: `src/services/energy.service.js` — `settleEnergyBill`, `unsettleEnergyBill`
- UI: `src/pages/v2/admin/accommodations/tabs/FacturasTab.jsx`

---

## ⚠️ Consideraciones

- **`amount_services = 0`:** los gastos de comunidad/extras (`accommodations.extra_costs`) no se reparten todavía. Todos los boletines muestran `amount_services = 0` (pendiente GAP-001).
- **Sin transacción atómica:** el rollback de settlements si fallan los bulletins es manual. En caso de fallo del rollback, pueden quedar settlements huérfanos — el siguiente intento de "Repartir" los elimina (idempotencia).
- **kWh opcionales:** si el alojamiento no tiene contadores individuales, no es necesario registrar lecturas. El algoritmo de fracción diaria aplica igualmente al coste variable.
- **Días vacíos:** si hay días del período sin ningún inquilino activo, el coste de esos días no se distribuye (`fraction < 1`). Es el comportamiento correcto.

---

## 📝 Estado de implementación

| Componente | Estado |
|------------|--------|
| `settleEnergyBill` en `energy.service.js` | ✅ Implementado (algoritmo fracción diaria) |
| `unsettleEnergyBill` en `energy.service.js` | ✅ Implementado |
| Botón "Repartir" en FacturasTab | ✅ Implementado |
| Botón "Borrar reparto" en FacturasTab | ✅ Implementado |
| Badge "Repartida" en FacturasTab | ✅ Implementado |
| Tabla `energy_settlements` diaria | ✅ Migración creada (pendiente ejecutar en live) |
| RLS políticas corregidas | ✅ Migración creada (BUG-040, pendiente ejecutar en live) |
| Reparto de `amount_services` | ❌ No implementado (GAP-001) |

### Números del campo real

Factura típica de electricidad (enero, 3 habitaciones, 3 inquilinos):
- `amount_total = 150 €`
- `amount_power = 35 €`, `amount_meter = 15 €` → `amountFixed = 50 €`
- `amount_variable = 100 €`
- Con 3 inquilinos activos 31/31 días: cada uno paga 50 € (33.33 variable + 16.67 fijo)
- Con lector: HAB-1 = 60 kWh, HAB-2 = 30 kWh, HAB-3 = 10 kWh → variable 60/30/10 €

---

## Notas relacionadas

- **REQ-015 — Habitaciones compartidas con acompañante**: cuando una asignación tiene `accompanist_id`, la habitación se considera ocupada por dos personas bajo un único contrato. La facturación, la energía y los estados siguen siendo por habitación (no se duplican): el acompañante NO genera renta, fianza, liquidación ni acceso web independiente. El acompañante se arrastra automáticamente en cualquier reasignación de habitación y se cierra en el check-out junto a la asignación. Ver `docs/requirements/current/REQ-015-shared-room-accompanist.md` y `.windsurf/rules/shared-rooms.md`.
