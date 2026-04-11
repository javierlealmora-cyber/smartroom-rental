# REQ-008 - Visor de Consumos con Filtro de Período

## Status
ACTIVE

## Owner
@admin

## Last updated
2026-03-29

---

## 🎯 Objetivo

Permitir al administrador visualizar el gráfico de consumo energético (kWh) de un alojamiento filtrado
por habitación **y** por período, con tres modos disponibles:

- **Últimos 12 meses** — vista rodante de los últimos 12 meses (predeterminada)
- **Año completo** — todos los meses de un año concreto
- **Mes específico** — día a día dentro de un mes concreto

---

## 📌 Alcance

### Incluye
- Selector de modo de período: "Últimos 12 meses", "Año completo", "Mes específico"
- Selector de año (visible en modos "Año completo" y "Mes específico")
- Selector de mes (visible solo en modo "Mes específico")
- Selector de habitación (disponible en todos los modos)
- Título dinámico del gráfico según el período seleccionado
- Mensaje de estado vacío específico al período cuando no hay datos
- Recarga automática al cambiar cualquier filtro (via `useCallback` + `useEffect`)
- Fallback a coste de facturas (€) cuando no hay lecturas en `energy_readings` para el período
- Etiquetas del eje X en español (Ene, Feb, Mar…)
- Líneas con patrón de trazo diferente por habitación para distinguirlas visualmente cuando se solapan

### No incluye
- Exportar datos del gráfico a CSV/PDF
- Comparativa entre períodos
- Consumos de agua, gas u otros suministros (solo kWh de `energy_readings`)
- Modificar o crear lecturas desde el Visor (eso corresponde a "Detalle de Registros")

---

## 📐 Comportamiento detallado

### Modos y rangos de fecha

| Modo | Rango calculado | Agrupación del eje X |
|------|----------------|----------------------|
| `last12` | Mes actual − 11 meses → fin de mes actual | `MMM YY` en español (ej. "Mar 26") |
| `year` | 1 ene `{año}` → 31 dic `{año}` | `MMM` en español (ej. "Ene", "Feb") |
| `month` | Inicio → fin del mes `{año}-{mes}` | `DD` (ej. "01", "02"...) |

### Filtro de habitación

Disponible en todos los modos. Cuando se selecciona una habitación concreta, la query incluye
`eq("room_id", roomId)`. En modo "Todas", se omite el filtro y aparece una línea por habitación.

### Pivot de datos y `lineKeys`

Los datos de `energy_readings` se agrupan por clave de período (día/mes/mes-año) y habitación.
Cada habitación genera una línea diferente en el gráfico (color + patrón de trazo distinto).

Las claves de línea (`lineKeys`) se extraen de **todos** los puntos de datos (no solo del primero),
para que habitaciones que aparecen a mitad de período sean visibles desde el inicio:

```js
const lineKeys = data.length > 0
  ? [...new Set(data.flatMap((d) => Object.keys(d).filter((k) => k !== "month")))]
  : [];
```

### Distinción visual de líneas solapadas

Cuando múltiples habitaciones tienen el mismo valor estimado (distribución igual por día),
las líneas se superponen en el gráfico. Para que todas sean visibles, cada línea usa un
patrón de trazo (`strokeDasharray`) diferente:

| Línea | Patrón |
|-------|--------|
| 1ª | Continua `——————` |
| 2ª | Discontinua `— — —` |
| 3ª | Punteada `· · · ·` |
| … | Patrones adicionales rotativos |

### Comportamiento de lecturas estimadas iguales por habitación

Cuando no hay contadores reales, `settleEnergyBill` genera lecturas estimadas con la fórmula:

```
kwh_estimado = total_kwh_factura / totalDías / n_habitaciones_activas_ese_día
```

Esto produce **el mismo kWh por día** para todas las habitaciones activas simultáneamente.
Sin embargo, los **totales mensuales pueden diferir** entre habitaciones si:

- Una habitación se incorpora a mitad de mes (menos días activos ese mes → menor total mensual)
- Una habitación sale del período antes de fin de mes (ídem)

**Desde el mes en que todas las habitaciones están activas el mes completo, los valores son iguales.** Esto es correcto y esperado — el gráfico refleja fielmente los días de ocupación por habitación.

### Fuente de datos — primaria y fallback

| Fuente | Condición | Indicador UI |
|--------|-----------|--------------|
| `energy_readings` (kWh) | Hay lecturas para el período | — (modo normal) |
| `energy_bills` (€) | Sin lecturas en el período | Subtítulo "Sin lecturas de contador — mostrando coste de facturas (€)" |

**El fallback solo incluye facturas con `status = 'settled'`** — facturas en estado `pending` o
`validated` no se muestran en el gráfico para evitar datos de períodos futuros o no liquidados.

### Título dinámico

| Modo | Título |
|------|--------|
| `last12` | "Visor de Consumo — Últimos 12 meses" |
| `year` | "Visor de Consumo — 2026" |
| `month` | "Visor de Consumo — Marzo 2026" |

---

## ✅ Criterios de Aceptación

| ID | Criterio | Estado |
|----|----------|--------|
| CA-001 | Modo "Últimos 12 meses" muestra el gráfico correctamente | ✅ |
| CA-002 | Seleccionar "Año completo" + año → gráfico con hasta 12 puntos (Ene–Dic) en español | ✅ |
| CA-003 | Seleccionar "Mes específico" + año + mes → gráfico con puntos por día | ✅ |
| CA-004 | Filtro por habitación funciona correctamente en los tres modos | ✅ |
| CA-005 | Sin datos en el período → mensaje contextual "No hay datos de consumo en …" | ✅ |
| CA-006 | Título del gráfico refleja el período activo | ✅ |
| CA-007 | Build sin errores (`npm run build`) | ✅ |
| CA-008 | Etiquetas del eje X en español (Ene, Feb… no Jan, Feb…) | ✅ |
| CA-009 | Fallback muestra solo facturas `settled`, no `pending`/`validated` | ✅ |
| CA-010 | Con "Todas las habitaciones", se muestran todas las habitaciones que aparecen en cualquier punto del período (no solo en el primer punto) | ✅ |
| CA-011 | Líneas solapadas (igual valor estimado) son visualmente distinguibles por patrón de trazo | ✅ |

---

## 🔗 Implementación

### Archivo modificado

- **`src/pages/v2/admin/accommodations/tabs/ConsumoTab.jsx`** — función `VisorConsumo`

### Cambios aplicados

1. Estado de filtros: `filterMode`, `filterYear`, `filterMonth`, `dataSource`
2. Cálculo dinámico de `start` / `end` / `groupBy` según modo
3. `pivotKey()` helper usando `MONTHS_SHORT_ES` (array español) en lugar de `dayjs.format("MMM")` (inglés)
4. `lineKeys` derivadas de todos los puntos del dataset, no solo `data[0]`
5. Líneas con `strokeDasharray` rotativo para distinguir habitaciones con igual valor
6. Fallback a `energy_bills` filtrando `status = 'settled'` cuando `energy_readings` está vacía
7. Y-axis y tooltip dinámicos: `kWh` (primario) / `€` (fallback)
8. Subtítulo de aviso cuando el gráfico muestra coste en € en lugar de kWh
9. Título y mensaje vacío dinámicos según modo y período
10. Dependencias de `useCallback`: `[accId, filterRoom, filterMode, filterYear, filterMonth]`

### Migración BD requerida

- **`supabase/migrations/schema/20260329100000_add_estimated_source_to_energy_readings.sql`**
  — Amplía el CHECK constraint de `energy_readings.source` para incluir `'estimated'`.
  Necesaria porque `settleEnergyBill` genera lecturas con `source = 'estimated'` que son
  la fuente primaria del Visor cuando no hay contadores reales.

### Sin cambios en

- Otros componentes
- Servicios (los cambios de `energy.service.js` corresponden a REQ-007)

---

## 📊 Tests

| Tipo | Cobertura |
|------|-----------|
| Unit (lógica) | — (lógica de pivot es trivial; cubierto via E2E) |
| E2E | CON-01..CON-05 — pendientes (`qa/e2e/specs/consumos.spec.js`) |

### Casos E2E pendientes

| ID | Escenario |
|----|-----------|
| CON-01 | Modo "Últimos 12 meses" → gráfico visible con etiquetas en español |
| CON-02 | Modo "Año completo" → selector de año aparece, eje X muestra Ene–Dic |
| CON-03 | Modo "Mes específico" → selector de mes aparece, eje X muestra días |
| CON-04 | Fallback visible solo con facturas liquidadas (sin mostrar datos futuros) |
| CON-05 | "Todas las habitaciones" → todas las habitaciones activas en el período aparecen como líneas |

Ver cobertura operativa en [qa/COVERAGE.md](../../../qa/COVERAGE.md).

---

## 🔗 Referencias

- Componente: `src/pages/v2/admin/accommodations/tabs/ConsumoTab.jsx`
- Tabla BD: `energy_readings`, `energy_bills`
- Migración relacionada: `20260329100000_add_estimated_source_to_energy_readings.sql`
- Requisito relacionado: REQ-004 (Energy Billing), REQ-007 (Energy Bill Settlement)
- Matriz de trazabilidad: `docs/qa/TRACEABILITY-MATRIX.md`
