/**
 * Reference implementation of the `calculo-consumo` skill.
 * Pure function, no I/O. Mirrors 1:1 the formulas in
 * "Calculo de Consumo con y sin lector de consumo de factura v1.0.xlsx".
 *
 * Do NOT import this directly in production code; copy it into
 * `supabase/functions/_shared/billing-split.ts` and add tests.
 */

export type Mode = "con_lector" | "sin_lector";

export interface TenantInput {
  id: string;
  nombre: string;
  /** 1-indexed days over the billing period. */
  dias_activos: number[];
  /** Length === periodo.dias. null on inactive days. Optional in `sin_lector`. */
  lecturas_kwh?: Array<number | null>;
}

export interface BillInput {
  modo: Mode;
  periodo: { dias: number; fecha_inicio?: string; fecha_fin?: string };
  factura: {
    gasto_fijo: Record<string, number>;
    gasto_variable: Record<string, number>;
    consumo_total_kwh: number;
  };
  inquilinos: TenantInput[];
}

export interface TenantLiquidation {
  id: string;
  consumo_estimado_kwh: number;
  porcentaje_total: number;
  reparto_kwh: number;
  reparto_gasto_variable: number;
  reparto_gasto_fijo: number;
  total_a_pagar: number;
}

export interface BillSplitResult {
  totales_factura: {
    total_gasto_fijo: number;
    total_gasto_variable: number;
    total_factura: number;
    consumo_total_kwh: number;
  };
  liquidacion_por_inquilino: TenantLiquidation[];
  desglose_diario: {
    kwh: Record<string, Array<number | null>>;
    gasto_variable: Record<string, Array<number | null>>;
    gasto_fijo: Record<string, Array<number | null>>;
  };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const sumIgnoreNull = (xs: Array<number | null>) =>
  xs.reduce<number>((a, b) => a + (b ?? 0), 0);

export function calcularReparto(input: BillInput): BillSplitResult {
  const N = input.periodo.dias;
  const tenants = input.inquilinos;

  // 5.1 Totals
  const totalFijo = sum(Object.values(input.factura.gasto_fijo));
  const totalVar = sum(Object.values(input.factura.gasto_variable));
  const totalKwh = input.factura.consumo_total_kwh;

  // 5.2 kWh matrix
  const kwh: Record<string, Array<number | null>> = {};
  for (const t of tenants) {
    kwh[t.id] = new Array<number | null>(N).fill(null);
  }

  if (input.modo === "con_lector") {
    for (const t of tenants) {
      if (!t.lecturas_kwh || t.lecturas_kwh.length !== N) {
        throw new Error(`INVALID_READINGS_LENGTH:${t.id}`);
      }
      for (let d = 0; d < N; d++) {
        const active = t.dias_activos.includes(d + 1);
        const v = t.lecturas_kwh[d];
        if (active) {
          if (v == null || v < 0) throw new Error(`INVALID_READING:${t.id}:${d + 1}`);
          kwh[t.id][d] = v;
        } else {
          if (v != null) throw new Error(`UNEXPECTED_READING_ON_INACTIVE_DAY:${t.id}:${d + 1}`);
        }
      }
    }
  } else {
    // sin_lector
    const dailyTotal = totalKwh / N;
    for (let d = 0; d < N; d++) {
      const activeTenants = tenants.filter((t) => t.dias_activos.includes(d + 1));
      if (activeTenants.length === 0) {
        throw new Error(`NO_TENANTS_ACTIVE_ON_DAY_${d + 1}`);
      }
      const perTenant = dailyTotal / activeTenants.length;
      for (const t of activeTenants) kwh[t.id][d] = perTenant;
    }
  }

  // 5.3 per-tenant estimated consumption and %
  const consumoIndiv = tenants.map((t) => sumIgnoreNull(kwh[t.id]));
  const consumoTotalEst = sum(consumoIndiv);

  let pct: number[];
  if (consumoTotalEst > 0) {
    pct = consumoIndiv.map((c) => c / consumoTotalEst);
  } else {
    // fallback: pro-rata active days
    const activeDays = tenants.map((t) => t.dias_activos.length);
    const totalActive = sum(activeDays) || 1;
    pct = activeDays.map((d) => d / totalActive);
  }

  // 5.4 liquidación
  const liquidacion: TenantLiquidation[] = tenants.map((t, i) => ({
    id: t.id,
    consumo_estimado_kwh: consumoIndiv[i],
    porcentaje_total: pct[i],
    reparto_kwh: totalKwh * pct[i],
    reparto_gasto_variable: totalVar * pct[i],
    reparto_gasto_fijo: totalFijo * pct[i],
    total_a_pagar: (totalVar + totalFijo) * pct[i],
  }));

  // 5.5 desglose diario
  const desglose = {
    kwh: {} as Record<string, Array<number | null>>,
    gasto_variable: {} as Record<string, Array<number | null>>,
    gasto_fijo: {} as Record<string, Array<number | null>>,
  };
  tenants.forEach((t, i) => {
    const liq = liquidacion[i];
    const tot = consumoIndiv[i];
    const row = kwh[t.id];
    const kwhDia: Array<number | null> = row.map((v) =>
      v == null ? null : tot > 0 ? (v / tot) * liq.reparto_kwh : 0
    );
    const varDia: Array<number | null> = row.map((v) =>
      v == null ? null : tot > 0 ? (v / tot) * liq.reparto_gasto_variable : 0
    );
    const fijoDia: Array<number | null> = row.map((v) =>
      v == null ? null : tot > 0 ? (v / tot) * liq.reparto_gasto_fijo : 0
    );
    desglose.kwh[t.id] = kwhDia;
    desglose.gasto_variable[t.id] = varDia;
    desglose.gasto_fijo[t.id] = fijoDia;
  });

  return {
    totales_factura: {
      total_gasto_fijo: totalFijo,
      total_gasto_variable: totalVar,
      total_factura: totalFijo + totalVar,
      consumo_total_kwh: totalKwh,
    },
    liquidacion_por_inquilino: liquidacion,
    desglose_diario: desglose,
  };
}

/**
 * Round the liquidation amounts to 2 decimals and reassign the residual cent
 * to the tenant with the largest `total_a_pagar` so the sum matches the bill.
 */
export function aplicarRedondeo(result: BillSplitResult): BillSplitResult {
  const round2 = (x: number) => Math.round(x * 100) / 100;
  const liq = result.liquidacion_por_inquilino.map((l) => ({
    ...l,
    reparto_gasto_variable: round2(l.reparto_gasto_variable),
    reparto_gasto_fijo: round2(l.reparto_gasto_fijo),
    total_a_pagar: round2(l.total_a_pagar),
  }));
  const target = round2(result.totales_factura.total_factura);
  const diff = round2(target - sum(liq.map((l) => l.total_a_pagar)));
  if (Math.abs(diff) >= 0.01 && liq.length > 0) {
    const idx = liq.reduce((best, cur, i, arr) =>
      cur.total_a_pagar > arr[best].total_a_pagar ? i : best, 0);
    liq[idx].total_a_pagar = round2(liq[idx].total_a_pagar + diff);
  }
  return { ...result, liquidacion_por_inquilino: liq };
}
