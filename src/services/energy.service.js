// src/services/energy.service.js
// Lecturas directas con RLS para energy_bills y energy_readings

import { supabase } from "./supabaseClient";

export async function listEnergyBills({ accommodationId, status } = {}) {
  let q = supabase
    .from("energy_bills")
    .select("*, accommodation:accommodations(id, name)")
    .order("issue_date", { ascending: false });
  if (accommodationId) q = q.eq("accommodation_id", accommodationId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getEnergyBill(id) {
  const { data, error } = await supabase
    .from("energy_bills")
    .select("*, accommodation:accommodations(id, name)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createEnergyBill(payload) {
  const { data, error } = await supabase
    .from("energy_bills")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateEnergyBill(id, patch) {
  const { data, error } = await supabase
    .from("energy_bills")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listEnergyReadings({ accommodationId, roomId } = {}) {
  let q = supabase
    .from("energy_readings")
    .select("*, room:rooms(id, number), accommodation:accommodations(id, name)")
    .order("reading_date", { ascending: false })
    .limit(100);
  if (accommodationId) q = q.eq("accommodation_id", accommodationId);
  if (roomId) q = q.eq("room_id", roomId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function settleEnergyBill(billId, clientAccountId) {
  const round2 = (n) => Math.round(n * 100) / 100;

  // ── 1. Cargar factura ────────────────────────────────────────────────────
  const { data: bill, error: billErr } = await supabase
    .from("energy_bills")
    .select("*")
    .eq("id", billId)
    .eq("client_account_id", clientAccountId)
    .single();

  if (billErr || !bill) throw new Error("Factura no encontrada");
  if (bill.status === "settled") throw new Error("La factura ya ha sido liquidada");

  const accId = bill.accommodation_id;

  // ── 1b. Leer modo de reparto configurado en el alojamiento ───────────────
  const utilityModeField = `split_mode_${bill.utility_type}`; // split_mode_electricity | _water | _gas
  const { data: accConfig } = await supabase
    .from("accommodations")
    .select(`split_mode_electricity, split_mode_water, split_mode_gas, split_electricity, split_water, split_gas`)
    .eq("id", accId)
    .single();

  // Si el suministro no está marcado como "No Incluido en el Alquiler", no debería repartirse.
  // Pero como settleEnergyBill ya fue invocado, continuamos y repartimos igualmente.
  const splitMode = accConfig?.[utilityModeField] || "equal";
  // 'equal' → reparto por fracción diaria (ignora kWh para la distribución de costes)
  // 'meter' → reparto proporcional a kWh reales si existen, o estimados si no

  // ── 2. Asignaciones solapadas con el período ─────────────────────────────
  const { data: assignments, error: asgErr } = await supabase
    .from("lodger_room_assignments")
    .select("lodger_id, room_id, move_in_date, move_out_date")
    .eq("accommodation_id", accId)
    .lte("move_in_date", bill.period_end)
    .or(`move_out_date.is.null,move_out_date.gte.${bill.period_start}`);

  if (asgErr) throw new Error(asgErr.message);
  if (!assignments?.length) throw new Error("No hay inquilinos en este período para liquidar");

  // ── 3. Construir mapa día→[asignaciones activas] ─────────────────────────
  const periodStart = new Date(bill.period_start);
  const periodEnd   = new Date(bill.period_end);
  const totalDays   = Math.max(1, Math.round((periodEnd - periodStart) / 86400000) + 1);

  // dayMap: 'YYYY-MM-DD' → [ { lodger_id, room_id } ]
  const dayMap = {};
  for (let d = new Date(periodStart); d <= periodEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    dayMap[d.toISOString().split("T")[0]] = [];
  }
  for (const a of assignments) {
    const aStart = new Date(Math.max(new Date(a.move_in_date), periodStart));
    const aEnd   = new Date(Math.min(a.move_out_date ? new Date(a.move_out_date) : periodEnd, periodEnd));
    for (let d = new Date(aStart); d <= aEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().split("T")[0];
      if (dayMap[key]) dayMap[key].push({ lodger_id: a.lodger_id, room_id: a.room_id });
    }
  }

  // ── 4. Calcular fracción acumulada por inquilino ─────────────────────────
  // fraction[lodger_id] = Σ(1/totalDays/n_activos_hoy) para cada día activo
  // La suma de todas las fracciones ≤ 1.0 (= 1 si no hay días sin inquilinos)
  const fraction = {};   // lodger_id → fracción
  const lodgerRoom = {}; // lodger_id → room_id (para kWh y boletines)
  for (const [, active] of Object.entries(dayMap)) {
    if (!active.length) continue;
    const share = 1 / totalDays / active.length;
    for (const { lodger_id, room_id } of active) {
      fraction[lodger_id]   = (fraction[lodger_id]   ?? 0) + share;
      lodgerRoom[lodger_id] = room_id;
    }
  }

  const activeLodgers = Object.keys(fraction);
  if (!activeLodgers.length) throw new Error("Ningún inquilino tiene días en el período");

  // ── 5. kWh por habitación (solo lecturas reales: api/manual/import) ─────
  // IMPORTANTE: excluir source='estimated' para que lecturas estimadas de
  // una factura anterior (que comparte la fecha límite) no contaminen esta.
  // Solo se consultan lecturas reales; la decisión de usarlas depende de splitMode.
  const roomKwh = {};
  const { data: readings } = await supabase
    .from("energy_readings")
    .select("room_id, kwh")
    .eq("accommodation_id", accId)
    .gte("reading_date", bill.period_start)
    .lte("reading_date", bill.period_end)
    .neq("source", "estimated");
  for (const r of (readings ?? [])) roomKwh[r.room_id] = (roomKwh[r.room_id] ?? 0) + Number(r.kwh);
  const kwhTotal = Object.values(roomKwh).reduce((s, v) => s + v, 0);

  // hasReadings: true SOLO en modo 'meter' con lecturas reales disponibles.
  // En modo 'equal' siempre se distribuye por fracción diaria (ignora kWh).
  const hasReadings = splitMode === "meter" && kwhTotal > 0;

  // ── 5b. Generar lecturas estimadas si no hay lecturas reales ─────────────
  // Condición: sin lecturas reales (kwhTotal === 0), independientemente del splitMode.
  // Las lecturas estimadas alimentan el Visor aunque el reparto de costes sea igualitario.
  // Una lectura por habitación activa por día: kwh = total_kwh / totalDays / n_habitaciones_activas_hoy
  // Esto permite visualizar consumo diario en el Visor aunque no haya contadores inteligentes.
  if (kwhTotal === 0 && Number(bill.total_kwh ?? 0) > 0) {
    const kwhBill = Number(bill.total_kwh);
    const estimatedRows = [];
    for (const [dateStr, active] of Object.entries(dayMap)) {
      if (!active.length) continue;
      const activeRooms = [...new Set(active.map((a) => a.room_id))];
      const kwhPerRoom  = round2(kwhBill / totalDays / activeRooms.length);
      for (const roomId of activeRooms) {
        estimatedRows.push({
          client_account_id: clientAccountId,
          accommodation_id:  accId,
          room_id:           roomId,
          reading_date:      dateStr,
          kwh:               kwhPerRoom,
          source:            "estimated",
        });
      }
    }
    if (estimatedRows.length > 0) {
      // Idempotente: borrar lecturas estimadas previas del mismo período
      await supabase.from("energy_readings")
        .delete()
        .eq("accommodation_id", accId)
        .eq("source", "estimated")
        .gte("reading_date", bill.period_start)
        .lte("reading_date", bill.period_end);
      const { error: rErr } = await supabase.from("energy_readings").insert(estimatedRows);
      if (rErr) throw new Error(`Error al insertar lecturas estimadas: ${rErr.message}`);
    }
  }

  // ── 6. Calcular importe por inquilino (resumen para bulletins) ────────────
  const amountFixed    = Number(bill.amount_power ?? 0) + Number(bill.amount_meter ?? 0);
  const amountVariable = Number(bill.amount_total) - amountFixed;

  const perLodger = activeLodgers.map((lodgerId) => {
    const f           = fraction[lodgerId];
    const roomId      = lodgerRoom[lodgerId];
    const kwhRoom     = roomKwh[roomId] ?? 0;
    const fixedShare  = round2(amountFixed    * f);
    const varShare    = hasReadings
      ? round2(amountVariable * (kwhRoom / kwhTotal))
      : round2(amountVariable * f);
    return {
      lodger_id:    lodgerId,
      room_id:      roomId,
      fraction:     f,
      kwh:          hasReadings ? kwhRoom : 0,
      amount_fixed: fixedShare,
      amount_variable: varShare,
      amount_total: round2(fixedShare + varShare),
    };
  });

  // ── 7. Reconciliación de céntimos ────────────────────────────────────────
  const computedTotal = perLodger.reduce((s, x) => s + x.amount_total, 0);
  const diff = round2(Number(bill.amount_total) - computedTotal);
  if (diff !== 0) {
    const maxIdx = perLodger.reduce(
      (best, x, i) => x.fraction > perLodger[best].fraction ? i : best, 0
    );
    perLodger[maxIdx].amount_total   = round2(perLodger[maxIdx].amount_total   + diff);
    perLodger[maxIdx].amount_variable = round2(perLodger[maxIdx].amount_variable + diff);
  }

  // ── 8. Construir filas diarias para energy_settlements ───────────────────
  const settlementRows = [];
  for (const [dateStr, active] of Object.entries(dayMap)) {
    if (!active.length) continue;
    for (const { lodger_id, room_id } of active) {
      const lData   = perLodger.find((x) => x.lodger_id === lodger_id);
      if (!lData) continue;
      const nToday  = active.length;
      const kwhDay  = hasReadings
        ? round2((roomKwh[room_id] ?? 0) / totalDays)
        : 0;
      // Cada día aporta (dayFrac / totalFrac) del total del inquilino
      const dayFrac       = 1 / totalDays / nToday;
      const totalFrac     = fraction[lodger_id];
      const fixDaySimple  = totalFrac > 0 ? round2(lData.amount_fixed    * (dayFrac / totalFrac)) : 0;
      const varDaySimple  = totalFrac > 0 ? round2(lData.amount_variable * (dayFrac / totalFrac)) : 0;
      settlementRows.push({
        client_account_id:   clientAccountId,
        energy_bill_id:      billId,
        accommodation_id:    accId,
        room_id,
        lodger_id,
        settlement_date:     dateStr,
        kwh_day:             kwhDay,
        amount_fixed_day:    fixDaySimple,
        amount_variable_day: varDaySimple,
        amount_total_day:    round2(fixDaySimple + varDaySimple),
      });
    }
  }

  // ── 9. Limpiar settlements/bulletins huérfanos (idempotente) ─────────────
  await supabase.from("bulletins").delete().eq("energy_bill_id", billId);
  await supabase.from("energy_settlements").delete().eq("energy_bill_id", billId);

  // ── 10. INSERT energy_settlements (granularidad diaria) ──────────────────
  const { error: settlErr } = await supabase.from("energy_settlements").insert(settlementRows);
  if (settlErr) throw new Error(`Error al insertar liquidaciones: ${settlErr.message}`);

  // ── 11. INSERT bulletins en draft (uno por inquilino) ────────────────────
  const daysPresent = (lodgerId) => Math.round(fraction[lodgerId] * totalDays);
  const bulletins = perLodger.map((s) => ({
    client_account_id: clientAccountId,
    accommodation_id:  accId,
    room_id:           s.room_id,
    lodger_id:         s.lodger_id,
    energy_bill_id:    billId,
    period_start:      bill.period_start,
    period_end:        bill.period_end,
    days_present:      daysPresent(s.lodger_id),
    kwh_consumed:      s.kwh,
    amount_fixed:      s.amount_fixed,
    amount_variable:   s.amount_variable,
    amount_services:   0,
    amount_total:      s.amount_total,
    status:            "draft",
  }));

  const { error: bullErr } = await supabase.from("bulletins").insert(bulletins);
  if (bullErr) {
    await supabase.from("energy_settlements").delete().eq("energy_bill_id", billId);
    throw new Error(`Error al crear boletines: ${bullErr.message}`);
  }

  // ── 12. Marcar factura como liquidada ────────────────────────────────────
  await supabase.from("energy_bills").update({ status: "settled" }).eq("id", billId);

  return { settlements_count: perLodger.length, amount_total: Number(bill.amount_total), has_readings: hasReadings };
}

export async function unsettleEnergyBill(billId, clientAccountId) {
  const { data: bill, error: billErr } = await supabase
    .from("energy_bills")
    .select("id, status, accommodation_id, period_start, period_end")
    .eq("id", billId)
    .eq("client_account_id", clientAccountId)
    .single();
  if (billErr || !bill) throw new Error("Factura no encontrada");
  if (bill.status !== "settled") throw new Error("La factura no está en estado Repartida");

  await supabase.from("bulletins").delete().eq("energy_bill_id", billId);
  await supabase.from("energy_settlements").delete().eq("energy_bill_id", billId);

  // Borrar lecturas estimadas generadas durante el reparto
  await supabase.from("energy_readings")
    .delete()
    .eq("accommodation_id", bill.accommodation_id)
    .eq("source", "estimated")
    .gte("reading_date", bill.period_start)
    .lte("reading_date", bill.period_end);

  const { error } = await supabase
    .from("energy_bills")
    .update({ status: "validated" })
    .eq("id", billId);
  if (error) throw new Error(`Error al revertir el reparto: ${error.message}`);
}
