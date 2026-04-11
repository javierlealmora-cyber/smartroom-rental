-- ============================================================================
-- MIGRACIÓN: Rediseño de energy_settlements a granularidad diaria
-- Fecha: 2026-03-29
-- Motivo: El esquema anterior (una fila por inquilino+factura) tenía un bug
--   matemático en el modo 'prorated': no normalizaba al 100% cuando había
--   varios inquilinos solapados. El nuevo esquema almacena una fila por
--   (inquilino, habitación, día) permitiendo el algoritmo correcto de
--   reparto: coste_diario / n_inquilinos_activos_ese_día.
-- ============================================================================

-- ── 1. Borrar datos y tabla anterior ────────────────────────────────────────
-- Primero limpiar bulletins que referencian energy_settlements
TRUNCATE public.bulletins CASCADE;
DROP TABLE IF EXISTS public.energy_settlements CASCADE;

-- ── 2. Crear nueva tabla de granularidad diaria ──────────────────────────────
CREATE TABLE public.energy_settlements (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id   uuid        NOT NULL REFERENCES public.client_accounts(id)  ON DELETE CASCADE,
  energy_bill_id      uuid        NOT NULL REFERENCES public.energy_bills(id)     ON DELETE CASCADE,
  accommodation_id    uuid        NOT NULL REFERENCES public.accommodations(id)   ON DELETE CASCADE,
  room_id             uuid        NOT NULL REFERENCES public.rooms(id)            ON DELETE CASCADE,
  lodger_id           uuid                 REFERENCES public.profiles(id)         ON DELETE SET NULL,

  -- Granularidad diaria
  settlement_date       date        NOT NULL,
  kwh_day               numeric     NOT NULL DEFAULT 0,
  amount_fixed_day      numeric     NOT NULL DEFAULT 0,
  amount_variable_day   numeric     NOT NULL DEFAULT 0,
  amount_total_day      numeric     NOT NULL DEFAULT 0,

  -- Auditoría
  created_at          timestamptz NOT NULL DEFAULT now(),

  -- Una sola fila por (factura, habitación, inquilino, día)
  UNIQUE (energy_bill_id, room_id, lodger_id, settlement_date)
);

COMMENT ON TABLE  public.energy_settlements IS 'Liquidaciones diarias de energía por habitación/inquilino. Una fila por (factura, habitación, inquilino, día).';
COMMENT ON COLUMN public.energy_settlements.settlement_date     IS 'Fecha del día al que corresponde este coste';
COMMENT ON COLUMN public.energy_settlements.kwh_day             IS 'kWh consumidos ese día (0 si no hay lector individual)';
COMMENT ON COLUMN public.energy_settlements.amount_fixed_day    IS 'Parte del coste fijo (potencia/contador) correspondiente a este día';
COMMENT ON COLUMN public.energy_settlements.amount_variable_day IS 'Parte del coste variable (consumo) correspondiente a este día';
COMMENT ON COLUMN public.energy_settlements.amount_total_day    IS 'amount_fixed_day + amount_variable_day';

-- ── 3. Índices ───────────────────────────────────────────────────────────────
-- Consultas por factura (FacturasTab, unsettleEnergyBill)
CREATE INDEX idx_energy_settlements_bill
  ON public.energy_settlements (energy_bill_id);

-- Consultas por alojamiento + fecha (Gantt de ocupación, dashboard)
CREATE INDEX idx_energy_settlements_acc_date
  ON public.energy_settlements (accommodation_id, settlement_date);

-- Consultas por inquilino + fecha (perfil de inquilino, boletines)
CREATE INDEX idx_energy_settlements_lodger_date
  ON public.energy_settlements (lodger_id, settlement_date)
  WHERE lodger_id IS NOT NULL;

-- ── 4. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.energy_settlements ENABLE ROW LEVEL SECURITY;

-- SELECT: admin/agent ven solo su tenant; superadmin ve todo
DROP POLICY IF EXISTS "energy_settlements_select_policy" ON public.energy_settlements;
CREATE POLICY "energy_settlements_select_policy"
ON public.energy_settlements FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- INSERT: admin/agent solo en su tenant
DROP POLICY IF EXISTS "energy_settlements_insert_policy" ON public.energy_settlements;
CREATE POLICY "energy_settlements_insert_policy"
ON public.energy_settlements FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- DELETE: admin/agent solo en su tenant (necesario para borrar reparto idempotente)
DROP POLICY IF EXISTS "energy_settlements_delete_policy" ON public.energy_settlements;
CREATE POLICY "energy_settlements_delete_policy"
ON public.energy_settlements FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);
