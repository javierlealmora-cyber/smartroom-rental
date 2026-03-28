// Edge Function: settle_energy_bill
// Liquida una factura de energía: calcula el reparto entre inquilinos,
// crea energy_settlements y bulletins en status='draft'.
// Recibe: { bill_id }
// Requiere: JWT válido con role admin o superadmin

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  ok, err, optionsResponse, ERROR_CODES,
} from "../_shared/response.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  try {
    // ── 1. Verificar JWT ──────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) return err(ERROR_CODES.UNAUTHORIZED, "Missing authorization header", 401);

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return err(ERROR_CODES.UNAUTHORIZED, "Authentication failed", 401);

    // ── 2. Verificar perfil + rol ─────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, client_account_id")
      .eq("id", user.id)
      .single();

    if (!profile) return err(ERROR_CODES.NOT_FOUND, "Profile not found", 404);
    if (!["admin", "superadmin"].includes(profile.role)) {
      return err(ERROR_CODES.FORBIDDEN, "Insufficient permissions", 403);
    }

    const clientAccountId = profile.client_account_id;
    if (!clientAccountId) return err(ERROR_CODES.FORBIDDEN, "No tenant associated", 403);

    // ── 3. Parsear body ───────────────────────────────────────────────────────
    const body = await req.json();
    const { bill_id } = body as { bill_id: string };

    if (!bill_id) return err(ERROR_CODES.VALIDATION, "bill_id is required", 400);

    // ── 4. Cargar factura (validar tenant + estado) ───────────────────────────
    const { data: bill, error: billErr } = await supabase
      .from("energy_bills")
      .select("*, accommodation:accommodations(id, name, split_mode_electricity, split_mode_water, split_mode_gas)")
      .eq("id", bill_id)
      .eq("client_account_id", clientAccountId)
      .single();

    if (billErr || !bill) return err(ERROR_CODES.NOT_FOUND, "Factura no encontrada", 404);
    if (bill.status === "settled") {
      return err(ERROR_CODES.CONFLICT, "La factura ya ha sido liquidada", 409);
    }

    const accId = bill.accommodation_id;

    // Determinar modo de reparto según tipo de suministro
    const splitMode: string = (
      bill.utility_type === "electricity" ? bill.accommodation.split_mode_electricity :
      bill.utility_type === "water"       ? bill.accommodation.split_mode_water :
      bill.accommodation.split_mode_gas
    ) ?? "equal";

    // ── 5. Cargar asignaciones solapadas con el período ───────────────────────
    // Incluye inquilinos que ESTUVIERON presentes durante el período
    // (no solo los actualmente activos)
    const { data: assignments, error: assignErr } = await supabase
      .from("lodger_room_assignments")
      .select("lodger_id, room_id, move_in_date, move_out_date")
      .eq("accommodation_id", accId)
      .lte("move_in_date", bill.period_end)
      .or(`move_out_date.is.null,move_out_date.gte.${bill.period_start}`);

    if (assignErr) return err(ERROR_CODES.INTERNAL, assignErr.message, 500);
    if (!assignments || assignments.length === 0) {
      return err(ERROR_CODES.VALIDATION, "No hay inquilinos en este período para liquidar", 400);
    }

    // ── 6. Calcular days_present por asignación ───────────────────────────────
    const periodStart = new Date(bill.period_start);
    const periodEnd   = new Date(bill.period_end);
    const totalDays   = Math.max(1, Math.round(
      (periodEnd.getTime() - periodStart.getTime()) / 86400000
    ) + 1);

    type AssignmentWithDays = typeof assignments[0] & { daysPresent: number };
    const withDays: AssignmentWithDays[] = assignments.map((a) => {
      const start = new Date(Math.max(
        new Date(a.move_in_date).getTime(),
        periodStart.getTime()
      ));
      const end = new Date(Math.min(
        a.move_out_date ? new Date(a.move_out_date).getTime() : periodEnd.getTime(),
        periodEnd.getTime()
      ));
      const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      return { ...a, daysPresent: days };
    }).filter((a) => a.daysPresent > 0);

    if (withDays.length === 0) {
      return err(ERROR_CODES.VALIDATION, "Ningún inquilino tiene días en el período", 400);
    }

    // ── 7. Calcular kWh por habitación (modo meter) ───────────────────────────
    const roomKwh: Record<string, number> = {};
    if (splitMode === "meter") {
      const { data: readings } = await supabase
        .from("energy_readings")
        .select("room_id, kwh")
        .eq("accommodation_id", accId)
        .gte("reading_date", bill.period_start)
        .lte("reading_date", bill.period_end);

      for (const r of (readings ?? [])) {
        roomKwh[r.room_id] = (roomKwh[r.room_id] ?? 0) + Number(r.kwh);
      }
    }
    const kwhTotal = Object.values(roomKwh).reduce((s, v) => s + v, 0);

    // ── 8. Calcular importes por inquilino ────────────────────────────────────
    // amountFixed  → siempre prorrateado por días
    // amountVariable → según splitMode
    const amountFixed    = Number(bill.amount_power ?? 0) + Number(bill.amount_meter ?? 0);
    const amountVariable = Number(bill.amount_total) - amountFixed;
    const nActive        = withDays.length;

    type Settlement = {
      client_account_id: string;
      energy_bill_id: string;
      room_id: string;
      lodger_id: string;
      days_present: number;
      kwh_assigned: number;
      amount_fixed: number;
      amount_variable: number;
      amount_total: number;
    };

    const settlements: Settlement[] = withDays.map((a) => {
      const fixedShare = amountFixed > 0
        ? round2(amountFixed * (a.daysPresent / totalDays))
        : 0;

      const kwhAssigned = roomKwh[a.room_id] ?? 0;
      let variableShare: number;
      if (splitMode === "meter" && kwhTotal > 0) {
        variableShare = round2(amountVariable * (kwhAssigned / kwhTotal));
      } else if (splitMode === "prorated") {
        variableShare = round2(amountVariable * (a.daysPresent / totalDays));
      } else {
        // equal (default)
        variableShare = round2(amountVariable / nActive);
      }

      return {
        client_account_id: clientAccountId,
        energy_bill_id: bill_id,
        room_id: a.room_id,
        lodger_id: a.lodger_id,
        days_present: a.daysPresent,
        kwh_assigned: kwhAssigned,
        amount_fixed: fixedShare,
        amount_variable: variableShare,
        amount_total: round2(fixedShare + variableShare),
      };
    });

    // ── 9. Ajuste de céntimos (reconciliación) ────────────────────────────────
    const computedTotal = settlements.reduce((s, x) => s + x.amount_total, 0);
    const diff = round2(Number(bill.amount_total) - computedTotal);
    if (diff !== 0) {
      // Ajustar en el inquilino con más días presentes
      const maxIdx = settlements.reduce(
        (best, x, i) => x.days_present > settlements[best].days_present ? i : best, 0
      );
      settlements[maxIdx].amount_total = round2(settlements[maxIdx].amount_total + diff);
      // Distribuir el diff también en amount_variable para mantener coherencia
      settlements[maxIdx].amount_variable = round2(settlements[maxIdx].amount_variable + diff);
    }

    // ── 10. Insertar energy_settlements ──────────────────────────────────────
    const { error: settlErr } = await supabase
      .from("energy_settlements")
      .insert(settlements);

    if (settlErr) return err(ERROR_CODES.INTERNAL, `Error al insertar liquidaciones: ${settlErr.message}`, 500);

    // ── 11. Crear bulletins en draft ──────────────────────────────────────────
    const bulletins = settlements.map((s) => ({
      client_account_id: clientAccountId,
      accommodation_id: accId,
      room_id: s.room_id,
      lodger_id: s.lodger_id,
      energy_bill_id: bill_id,
      period_start: bill.period_start,
      period_end: bill.period_end,
      days_present: s.days_present,
      kwh_consumed: s.kwh_assigned,
      amount_fixed: s.amount_fixed,
      amount_variable: s.amount_variable,
      amount_services: 0,
      amount_total: s.amount_total,
      status: "draft",
    }));

    const { error: bullErr } = await supabase
      .from("bulletins")
      .insert(bulletins);

    if (bullErr) {
      // Revertir settlements si fallan los boletines
      await supabase.from("energy_settlements").delete().eq("energy_bill_id", bill_id);
      return err(ERROR_CODES.INTERNAL, `Error al crear boletines: ${bullErr.message}`, 500);
    }

    // ── 12. Marcar factura como liquidada ────────────────────────────────────
    await supabase.from("energy_bills")
      .update({ status: "settled" })
      .eq("id", bill_id);

    return ok({
      settlements_count: settlements.length,
      amount_total: Number(bill.amount_total),
      split_mode: splitMode,
    });

  } catch (e) {
    return err(ERROR_CODES.INTERNAL, (e as Error).message ?? "Unknown error", 500);
  }
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
