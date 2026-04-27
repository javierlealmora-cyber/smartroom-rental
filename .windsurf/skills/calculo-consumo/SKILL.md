---
name: calculo-consumo
description: >
  Calcula el reparto de una factura de suministro (energía, agua, gas) entre
  inquilinos de un alojamiento compartido, soportando dos modos: CON lector
  individual (lecturas reales por inquilino y día) o SIN lector (reparto
  estimado por días activos). Devuelve la liquidación total por inquilino y el
  desglose diario de kWh, gasto variable (€) y gasto fijo (€).
  Usa esta skill cuando el usuario pida calcular, repartir o liquidar una
  factura entre inquilinos, generar el detalle diario de consumo, o implementar
  el algoritmo descrito en el documento
  "Calculo de Consumo con y sin lector de consumo de factura v1.0".
version: 1.0.0
source: docs/requirements/current/Calculo de Consumo con y sin lector de consumo de factura v1.0.xlsx
---

# Skill: cálculo y reparto de consumo de factura

Esta skill implementa el algoritmo oficial de SmartRoom para repartir el
importe de una factura de suministros entre los inquilinos de un alojamiento
durante el periodo facturado. Está basada en el Excel de referencia (dos
hojas: "Calculo Lector Estimado Días" y "Calculo Sin Lector Estimado").

## 1. Cuándo usar esta skill

- El usuario menciona: *liquidación*, *reparto de factura*, *reparto de
  consumo*, *consumo por inquilino*, *cálculo kWh por día*, *con lector* / *sin
  lector*.
- Se necesita producir el JSON de salida con el desglose diario por inquilino.
- Se va a implementar una Edge Function, un job o un componente UI que ejecute
  esta lógica.

Si la petición es solo consulta ("¿cómo funciona?") explica el algoritmo en
texto y cita esta skill. Si es implementación, usa el pseudocódigo de la
sección 5 y el contrato JSON de la sección 4.

## 2. Conceptos y glosario

- **Periodo**: número total de días que cubre la factura (ej. 15).
- **Gasto fijo (€)**: conceptos no dependientes del consumo (potencia,
  descuentos fijos, otros, impuestos proporcionales a la parte fija). Se suma
  para obtener `total_gasto_fijo`.
- **Gasto variable (€)**: conceptos dependientes del consumo (energía). Se
  suma para obtener `total_gasto_variable`.
- **Total factura (€)** = `total_gasto_fijo + total_gasto_variable`.
- **Consumo total real (kWh)**: lectura del contador general del alojamiento
  en el periodo.
- **Consumo estimado individual (kWh)**: kWh asignados a un inquilino en el
  modelo de reparto (ver modos). La suma entre inquilinos = consumo total
  real cuando hay lectores individuales; en modo sin lector también converge
  por construcción.
- **Inquilino activo en día D**: el inquilino ocupa la habitación ese día
  (está entre check-in y check-out).
- **Modo**:
  - `con_lector`: existen lecturas reales `kwh[tenant][day]`.
  - `sin_lector`: no hay lecturas; se estima proporcionalmente a días activos.

## 3. Entrada (JSON)

```jsonc
{
  "modo": "con_lector" | "sin_lector",
  "periodo": {
    "dias": 15,
    "fecha_inicio": "2026-04-01",
    "fecha_fin":    "2026-04-15"
  },
  "factura": {
    "gasto_fijo": {
      "potencia": 20.05,
      "descuentos": -4.75,
      "otros": 1.27,
      "impuestos": 9.61
    },
    "gasto_variable": {
      "energia": 18.99
    },
    "consumo_total_kwh": 109.828
  },
  "inquilinos": [
    {
      "id": "juan",
      "nombre": "Juan",
      "dias_activos": [9,10,11,12,13,14,15],        // 1-indexed sobre el periodo
      "lecturas_kwh": [null,null,null,null,null,null,null,null,0.40,0.46,0.49,0.40,0.48,0.45,0.40]
    },
    { "id": "pedro","nombre":"Pedro","dias_activos":[5,6,7,8,9,10,11,12,13,14,15], "lecturas_kwh":[...] },
    { "id": "ana", "nombre":"Ana",  "dias_activos":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], "lecturas_kwh":[...] }
  ]
}
```

Reglas:

- `lecturas_kwh.length === periodo.dias`. Para días en los que el inquilino
  no está activo usar `null`. En modo `sin_lector` el campo es opcional y se
  ignora (se calcula internamente).
- `dias_activos` debe ser consistente con las lecturas (día activo ⇒ lectura
  numérica; día inactivo ⇒ `null`).
- Los importes vienen en euros y los consumos en kWh; la skill es agnóstica
  de la unidad (sirve igual para m³ de agua o gas).

## 4. Salida (JSON)

```jsonc
{
  "totales_factura": {
    "total_gasto_fijo": 26.18,
    "total_gasto_variable": 18.99,
    "total_factura": 45.17,
    "consumo_total_kwh": 109.828
  },
  "liquidacion_por_inquilino": [
    {
      "id": "juan",
      "consumo_estimado_kwh": 3.08,
      "porcentaje_total": 0.3115,
      "reparto_kwh":          34.21,   // = consumo_total_kwh * %
      "reparto_gasto_variable": 5.92,  // = total_gasto_variable * %
      "reparto_gasto_fijo":     8.16,  // = total_gasto_fijo * %
      "total_a_pagar":         14.08
    }
    // …pedro, ana
  ],
  "desglose_diario": {
    "kwh":            { "juan": [null,null,...,12.57,...], "pedro": [...], "ana": [...] },
    "gasto_variable": { "juan": [...], "pedro": [...], "ana": [...] },
    "gasto_fijo":     { "juan": [...], "pedro": [...], "ana": [...] }
  }
}
```

El `desglose_diario` tiene un array de longitud `periodo.dias` por inquilino;
posiciones con `null` corresponden a días sin actividad.

## 5. Algoritmo (pseudocódigo canónico)

Este pseudocódigo reproduce 1:1 las fórmulas del Excel.

```ts
function calcularReparto(input) {
  const N = input.periodo.dias;
  const tenants = input.inquilinos;

  // 5.1 Totales factura
  const totalFijo = sum(Object.values(input.factura.gasto_fijo));
  const totalVar  = sum(Object.values(input.factura.gasto_variable));
  const totalKwh  = input.factura.consumo_total_kwh;

  // 5.2 Matriz kWh[t][d]
  //     - con_lector:  usar lecturas_kwh tal cual
  //     - sin_lector:  kWh[t][d] = (totalKwh / N) / activosEnDia(d)  si t activo, si no null
  const kwh = buildKwhMatrix(tenants, N, input.modo, totalKwh);

  // 5.3 Consumo estimado total por inquilino y % sobre el total estimado
  //     (referencia Excel: S20:S22 y D27:D29 / D30)
  const consumoIndiv = tenants.map(t => sumIgnoreNull(kwh[t.id]));
  const consumoTotalEst = sum(consumoIndiv);
  const pct = consumoIndiv.map(c => c / consumoTotalEst);

  // 5.4 Reparto por inquilino (Excel F27:I29)
  //     Reparto kWh   = consumo_total_real  * pct
  //     Reparto € var = total_gasto_variable * pct
  //     Reparto € fijo= total_gasto_fijo    * pct
  //     Total a pagar = var + fijo
  const liquidacion = tenants.map((t, i) => ({
    id: t.id,
    consumo_estimado_kwh: consumoIndiv[i],
    porcentaje_total: pct[i],
    reparto_kwh:            totalKwh  * pct[i],
    reparto_gasto_variable: totalVar  * pct[i],
    reparto_gasto_fijo:     totalFijo * pct[i],
    total_a_pagar:         (totalVar + totalFijo) * pct[i],
  }));

  // 5.5 Desglose diario (Excel filas 37-60)
  //     pctDia[t][d]  = kwh[t][d] / consumoIndiv[t]      (null si día inactivo)
  //     kWhDia[t][d]  = pctDia[t][d] * liquidacion[t].reparto_kwh
  //     €VarDia[t][d] = pctDia[t][d] * liquidacion[t].reparto_gasto_variable
  //     €FijoDia[t][d]= pctDia[t][d] * liquidacion[t].reparto_gasto_fijo
  const desgloseDiario = buildDesgloseDiario(kwh, consumoIndiv, liquidacion, N);

  return {
    totales_factura: {
      total_gasto_fijo: totalFijo,
      total_gasto_variable: totalVar,
      total_factura: totalFijo + totalVar,
      consumo_total_kwh: totalKwh,
    },
    liquidacion_por_inquilino: liquidacion,
    desglose_diario: desgloseDiario,
  };
}
```

### Detalle del modo `sin_lector`

Para el día `d` (1-indexed) sea `n_d` el número de inquilinos activos ese
día. Entonces, para todo inquilino `t` activo en `d`:

```
kwh[t][d] = (consumo_total_kwh / N) / n_d
```

Y `null` si `t` no está activo en `d`. Esto hace que:

- el total del día sea `consumo_total_kwh / N` (se reparte uniformemente
  entre los días del periodo), y
- se reparta equitativamente entre los inquilinos presentes ese día.

La suma sobre todo el periodo y todos los inquilinos da `consumo_total_kwh`
por construcción (invariante que la implementación DEBE comprobar con una
aserción numérica con tolerancia ±1e-6).

## 6. Invariantes y validaciones

Toda implementación DEBE comprobar, y emitir error claro si falla:

1. `lecturas_kwh.length === periodo.dias` para cada inquilino.
2. `lecturas_kwh[d] == null` si y solo si el inquilino no está activo en `d+1`.
3. `lecturas_kwh[d] >= 0` cuando no es `null`.
4. `sum(liquidacion.total_a_pagar) ≈ total_factura` (tolerancia 0.01 € por
   redondeo).
5. `sum(liquidacion.reparto_kwh) ≈ consumo_total_kwh` (tolerancia 1e-6).
6. En `sin_lector`: `sum(kwh[t][d] over t,d) ≈ consumo_total_kwh`.
7. `0 <= pct[i] <= 1` y `sum(pct) ≈ 1`.

## 7. Redondeo y presentación

- Internamente calcular con doble precisión; NO redondear hasta el último
  paso.
- Para presentación al usuario: kWh con 3 decimales, € con 2 decimales.
- Al redondear los importes a 2 decimales puede aparecer un desfase de
  ±1 céntimo respecto al total factura. Aplicar el céntimo residual al
  inquilino con mayor `total_a_pagar` (regla largest remainder) para que la
  suma cuadre exactamente con el total facturado.

## 8. Casos límite

- **Un único inquilino activo todo el periodo**: recibe el 100 %.
- **Día sin inquilinos activos (periodo vacío)**: inválido en `sin_lector`
  (división por 0). La skill debe rechazar la entrada con error
  `NO_TENANTS_ACTIVE_ON_DAY_<d>`.
- **`consumo_total_kwh = 0`**: `reparto_kwh` = 0 para todos; el gasto fijo
  y variable seguirán repartiéndose por % (en `con_lector` requiere que al
  menos un inquilino tenga alguna lectura > 0 para evitar división por 0;
  si todas son 0, repartir por días activos pro-rata).
- **`consumoTotalEst = 0` en `con_lector`**: fallback a reparto por días
  activos pro-rata sobre los inquilinos, con warning `NO_READINGS_FALLBACK`.
- **Lecturas negativas**: rechazar con `INVALID_NEGATIVE_READING`.

## 9. Mapa de celdas Excel ↔ campos JSON

Para trazabilidad al documento original:

| Excel (hoja 1 "Con Lector")            | Campo JSON / variable                     |
|----------------------------------------|-------------------------------------------|
| `G8, G10, G11, G12`                    | `factura.gasto_fijo.*`                    |
| `H9`                                   | `factura.gasto_variable.energia`          |
| `G13`                                  | `totales_factura.total_gasto_fijo`        |
| `H13`                                  | `totales_factura.total_gasto_variable`    |
| `J13`                                  | `totales_factura.total_factura`           |
| `G15`                                  | `factura.consumo_total_kwh`               |
| `C20:Q22`                              | `inquilinos[*].lecturas_kwh`              |
| `S20:S22`                              | `liquidacion[*].consumo_estimado_kwh`     |
| `E27:E29`                              | `liquidacion[*].porcentaje_total`         |
| `F27:F29`                              | `liquidacion[*].reparto_kwh`              |
| `G27:G29`                              | `liquidacion[*].reparto_gasto_variable`   |
| `H27:H29`                              | `liquidacion[*].reparto_gasto_fijo`       |
| `I27:I29`                              | `liquidacion[*].total_a_pagar`            |
| `C45:Q47`                              | `pctDia[t][d]` (intermedio)               |
| `C51:Q53`                              | `desglose_diario.kwh`                     |
| `C58:Q60`                              | `desglose_diario.gasto_variable`          |
| `C65:Q67` (hoja 2: `C58:Q60`)          | `desglose_diario.gasto_fijo`              |

En la hoja 2 ("Sin Lector") las celdas `C20:Q22` son fórmulas
`=($G$15/N)/$<row>$<col>` (reparto equitativo) en vez de constantes.

## 10. Datos de ejemplo (del Excel)

Factura:
- Gasto fijo: 20.05 − 4.75 + 1.27 + 9.61 = **26.18 €**
- Gasto variable: **18.99 €**
- Total factura: **45.17 €**
- Consumo total: **109.828 kWh**
- Periodo: 15 días

Inquilinos (días activos):
- **Ana**: 1–15 (15 días)
- **Pedro**: 5–15 (11 días)
- **Juan**: 9–15 (7 días)

En modo `sin_lector` el resultado canónico (redondeado a 2 decimales) es:

| Inquilino | kWh est.  | %       | kWh repartido | € variable | € fijo | Total € |
|-----------|-----------|---------|---------------|------------|--------|---------|
| Juan      | 17.084    | 15.56 % | 17.084        | 2.95       | 4.07   | 7.03    |
| Pedro     | 31.728    | 28.89 % | 31.728        | 5.49       | 7.56   | 13.05   |
| Ana       | 61.016    | 55.56 % | 61.016        | 10.55      | 14.54  | 25.09   |
| **Total** | 109.828   | 100 %   | 109.828       | 18.99      | 26.17¹ | 45.17   |

¹ 26.17 por redondeo a 2 decimales; 26.18 sin redondear. Aplicar la regla
del céntimo residual de la sección 7 reasigna el céntimo a Ana.

En modo `con_lector` con las lecturas del Excel (`fixture-con-lector.json`):

| Inquilino | kWh est. | %       | kWh repartido | € variable | € fijo | Total € |
|-----------|----------|---------|---------------|------------|--------|---------|
| Juan      |  3.08    | 17.24 % | 18.93         | 3.27       |  4.51  |  7.79   |
| Pedro     |  6.30    | 35.25 % | 38.72         | 6.69       |  9.23  | 15.92   |
| Ana       |  8.49    | 47.51 % | 52.18         | 9.02       | 12.44  | 21.46   |
| **Total** | 17.87    | 100 %   | 109.83        | 18.99      | 26.18  | 45.17   |

Usar estos valores como smoke-test de cualquier implementación (tolerancia
0.01 € por redondeo).

## 11. Recomendaciones de implementación en SmartRoom

- Ubicación sugerida: `supabase/functions/_shared/billing-split.ts` como
  función pura reutilizable + Edge Function `utility-bill-split` para exponer.
- Añadir tests en `src/__tests__/billing-split.test.ts` con el caso de la
  sección 10 como fixture dorado.
- Persistir el resultado en una tabla `utility_bill_splits` (bill_id,
  tenant_id, total_paid, kwh_assigned, breakdown_json).
- El UI debe mostrar la tabla de liquidación (sección 4 `liquidacion_por_inquilino`)
  y, opcionalmente, un expandible con el desglose diario.
- No mezclar lógica de cálculo con lógica de persistencia ni de UI.
