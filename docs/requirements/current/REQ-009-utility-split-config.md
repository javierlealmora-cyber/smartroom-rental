# REQ-009 - Configuración de Reparto de Suministros por Alojamiento

## Status
ACTIVE

## Owner
@admin

## Last updated
2026-03-29 (rev2)

---

## 🎯 Objetivo

Permitir al administrador configurar, por cada suministro (Electricidad, Agua, Gas), cómo se
reparte su coste entre los inquilinos cuando la factura **no está incluida en el alquiler**.

Cada suministro es independiente y puede tener su propia configuración.

---

## 📌 Alcance

### Incluye
- Toggle principal por suministro: **verde (ON) = "Incluido en el Alquiler"** (estado por defecto), **gris (OFF) = "No Incluido"** → activa opciones de reparto
- Campo "Previsión Fondo" (€) por suministro — visible solo cuando "No Incluido"
- Toggle "Reparto de Consumo Igualitario" — distribuye por habitación + inquilino + día a partes iguales
- Toggle "Tiene Medidor individual por habitación" — distribuye proporcional a kWh reales del medidor
- Exclusión mutua: Igualitario y Medidor no pueden estar activos simultáneamente
- Campo "Periodo Pago" en gastos adicionales: Mensual / Anual

### No incluye
- Modo "prorrateado" (eliminado en favor de equal/meter)
- Configuración de reparto a nivel de habitación individual
- Impacto en boletines (solo afecta al algoritmo de `settleEnergyBill`)

---

## 📐 Comportamiento detallado

### Toggle principal — semántica y estado por defecto

El toggle principal de cada suministro representa **si el suministro está incluido en el alquiler**:

| Estado toggle | Etiqueta dinámica | Opciones de reparto | DB (`split_X`) |
|---------------|-------------------|---------------------|----------------|
| **ON** (verde) — **por defecto** | "Incluido en el Alquiler" | Ocultas | `false` |
| **OFF** (gris) | "No Incluido en el Alquiler" | Visibles | `true` |

Esta semántica hace que el estado inicial sea intuitivo: por defecto todos los suministros
aparecen como "Incluidos", y el administrador apaga el toggle para indicar que ese suministro
se reparte aparte.

**Mapeo UI → BD:**
- Form field `included_X = true` → `split_X = false` (incluido, no se reparte)
- Form field `included_X = false` → `split_X = true` (no incluido, se reparte)

### Diseño visual por columna

```
┌───────────────────────────────────────────────────────────┐
│  [🟢] ⚡ Electricidad   [🟢] 💧 Agua   [🟢] 🔥 Gas       │
│  Incluido en el Alquiler                                  │
│                                                           │
│  (al apagar el toggle aparece:)                           │
│  No Incluido en el Alquiler                               │
│  Previsión Fondo: [___120.00___] €                        │
│  [🔘] Reparto de Consumo Igualitario                      │
│  [🔘] Tiene Medidor individual por habitación             │
│       (deshabilitado si Igualitario está ON)              │
└───────────────────────────────────────────────────────────┘
```

### Exclusión mutua Igualitario / Medidor

| Igualitario | Medidor | Resultado |
|-------------|---------|-----------|
| ON  | OFF (forzado + disabled) | Reparto fracción diaria — `split_mode = 'equal'` |
| OFF | ON                       | Reparto proporcional a kWh — `split_mode = 'meter'` |
| OFF | OFF                      | Sin modo activo → se guarda `'equal'` por defecto |

- Activar "Igualitario" → "Medidor" se desactiva automáticamente y se deshabilita con tooltip
- Activar "Medidor" → "Igualitario" se desactiva automáticamente

### Modos de reparto en `settleEnergyBill`

| `split_mode` | `hasReadings` | Distribución de costes variables |
|--------------|---------------|----------------------------------|
| `'equal'`    | `false` (forzado) | Fracción diaria: igual por habitación activa por día |
| `'meter'`    | `true` si hay lecturas reales | Proporcional a kWh por habitación |
| `'meter'`    | `false` si no hay lecturas    | Fracción diaria (fallback = equal) |

`hasReadings = splitMode === "meter" && kwhTotal > 0`

Las **lecturas estimadas** (`energy_readings.source = 'estimated'`) se generan cuando
`kwhTotal === 0 && total_kwh > 0`, **independientemente del modo de reparto**, para que
el Visor de Consumos siempre tenga datos que mostrar.

### Gastos adicionales

Campo `period: 'monthly' | 'annual'` por gasto (JSONB, sin migración):
- Sustituye al antiguo `split_mode` en cada elemento de `extra_costs`
- Se muestra como columna "Periodo Pago" con selector Mensual / Anual

---

## 🗄️ Modelo de datos

### Campos en `accommodations` (BD)

| Campo DB | Tipo | Descripción |
|----------|------|-------------|
| `split_electricity` | boolean DEFAULT false | `true` = No Incluido (se reparte) |
| `split_water` | boolean DEFAULT false | `true` = No Incluido (se reparte) |
| `split_gas` | boolean DEFAULT false | `true` = No Incluido (se reparte) |
| `split_mode_electricity` | text `'equal'\|'meter'` DEFAULT 'equal' | Modo reparto Electricidad |
| `split_mode_water` | text `'equal'\|'meter'` DEFAULT 'equal' | Modo reparto Agua |
| `split_mode_gas` | text `'equal'\|'meter'` DEFAULT 'equal' | Modo reparto Gas |
| `prevision_fund_electricity` | numeric(10,2) DEFAULT 0 | Previsión Fondo Electricidad (€) — **NUEVO** |
| `prevision_fund_water` | numeric(10,2) DEFAULT 0 | Previsión Fondo Agua (€) — **NUEVO** |
| `prevision_fund_gas` | numeric(10,2) DEFAULT 0 | Previsión Fondo Gas (€) — **NUEVO** |
| `extra_costs` | jsonb DEFAULT '[]' | Array `{ name, amount, period: 'monthly'\|'annual' }` |

### Campos de formulario (UI) — NO son campos de BD

| Field name Form | Tipo | Mapeo a BD |
|-----------------|------|------------|
| `included_X` | boolean | `split_X = !included_X` |
| `equal_X` | boolean | `split_mode_X = meter_X ? 'meter' : 'equal'` |
| `meter_X` | boolean | ídem |
| `prevision_X` | number | `prevision_fund_X` |

### Campos retirados del flujo activo (mantenidos en BD por compatibilidad)
- `utilities_included` — reemplazado por los tres toggles individuales `split_X`
- `has_individual_meters` — reemplazado por `split_mode_X = 'meter'` por suministro

---

## 🔧 Implementación

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `AccommodationDetail.jsx` — form load | `included_X = !acc.split_X` (inversión semántica) |
| `AccommodationDetail.jsx` — form save | `split_X = !values.included_X` |
| `AccommodationDetail.jsx` — UI | 3 columnas por suministro; toggle + etiqueta dinámica; exclusión mutua; Previsión Fondo; Periodo Pago en extras |
| `energy.service.js` — `settleEnergyBill` | Lee `split_mode_X`; `hasReadings = splitMode === "meter" && kwhTotal > 0`; estimadas por `kwhTotal === 0` |

### Fragmento clave — form load

```js
included_electricity:  !(accommodation.split_electricity || false), // ON por defecto
equal_electricity:     (accommodation.split_mode_electricity || "equal") !== "meter",
meter_electricity:     accommodation.split_mode_electricity === "meter",
prevision_electricity: accommodation.prevision_fund_electricity || 0,
```

### Fragmento clave — form save

```js
split_electricity:          !values.included_electricity,  // inversión
split_mode_electricity:     values.meter_electricity ? "meter" : "equal",
prevision_fund_electricity: values.prevision_electricity || 0,
```

### Migración BD

- **`20260329120000_add_prevision_fund_to_accommodations.sql`** — añade `prevision_fund_{electricity,water,gas}`

---

## ✅ Criterios de Aceptación

| ID | Criterio | Estado |
|----|----------|--------|
| CA-001 | Estado por defecto: todos los toggles verdes, texto "Incluido en el Alquiler", sin opciones de reparto | ✅ |
| CA-002 | Apagar toggle → texto cambia a "No Incluido en el Alquiler" y aparecen Previsión Fondo + toggles de modo | ✅ |
| CA-003 | Activar "Igualitario" → "Medidor" se desactiva + deshabilita; aparece aviso | ✅ |
| CA-004 | Activar "Medidor" → "Igualitario" se desactiva automáticamente | ✅ |
| CA-005 | Guardar: `split_X = !included_X`; `split_mode_X = 'meter'` si Medidor, `'equal'` si no | ✅ |
| CA-006 | Cargar: toggle refleja correctamente el estado guardado en BD (inversión aplicada) | ✅ |
| CA-007 | `settleEnergyBill` modo `'equal'` → `hasReadings = false` → fracción diaria aunque existan lecturas | ✅ |
| CA-008 | `settleEnergyBill` modo `'meter'` + lecturas reales → `hasReadings = true` → proporcional a kWh | ✅ |
| CA-009 | Lecturas estimadas se generan cuando `kwhTotal === 0 && total_kwh > 0`, independiente del modo | ✅ |
| CA-010 | Gastos adicionales: selector "Periodo Pago" (Mensual/Anual) visible y guardado en JSONB | ✅ |
| CA-011 | Previsión Fondo se guarda y carga correctamente por suministro | ✅ |

---

## 📊 Tests pendientes

| ID | Tipo | Escenario |
|----|------|-----------|
| ENE-11 | Unit | `settleEnergyBill` modo `'equal'`: `hasReadings = false` aunque `kwhTotal > 0` |
| ENE-12 | Unit | `settleEnergyBill` modo `'meter'` con lecturas reales: `hasReadings = true` |
| ACC-07 | E2E | Toggle "Incluido/No Incluido" muestra/oculta opciones; etiqueta dinámica correcta |
| ACC-08 | E2E | Guardar y recargar configuración: inversión `included_X ↔ split_X` correcta en BD |

---

## 🔗 Referencias

- Componente: `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`
- Servicio: `src/services/energy.service.js`
- Migración: `20260329120000_add_prevision_fund_to_accommodations.sql`
- Requisitos relacionados: REQ-007 (Energy Bill Settlement), REQ-008 (Visor de Consumos)
- Matriz de trazabilidad: `docs/qa/TRACEABILITY-MATRIX.md`
