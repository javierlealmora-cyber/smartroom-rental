-- ============================================================================
-- MIGRACIÓN: Tabla de Consumos Reales
-- Fecha: 2026-03-27
-- Tipo: Schema
-- Descripción: Crear tabla consumptions para reemplazar datos mockeados
-- ============================================================================

-- Crear tabla de consumos para reemplazar datos mockeados
CREATE TABLE IF NOT EXISTS consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  lodger_room_assignment_id UUID NOT NULL REFERENCES lodger_room_assignments(id) ON DELETE CASCADE,
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

-- RLS para consumptions
ALTER TABLE consumptions ENABLE ROW LEVEL SECURITY;

-- Política de lectura
CREATE POLICY "consumptions_select_by_tenant"
ON consumptions
FOR SELECT
TO authenticated
USING (client_account_id = (SELECT client_account_id FROM profiles WHERE id = auth.uid()));

-- Política de inserción
CREATE POLICY "consumptions_insert_by_tenant"
ON consumptions
FOR INSERT
TO authenticated
WITH CHECK (client_account_id = (SELECT client_account_id FROM profiles WHERE id = auth.uid()));

-- Política de actualización
CREATE POLICY "consumptions_update_by_tenant"
ON consumptions
FOR UPDATE
TO authenticated
USING (client_account_id = (SELECT client_account_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (client_account_id = (SELECT client_account_id FROM profiles WHERE id = auth.uid()));

-- Política de eliminación
CREATE POLICY "consumptions_delete_by_tenant"
ON consumptions
FOR DELETE
TO authenticated
USING (client_account_id = (SELECT client_account_id FROM profiles WHERE id = auth.uid()));

-- Índices para consumptions
CREATE INDEX IF NOT EXISTS idx_consumptions_assignment 
ON consumptions(lodger_room_assignment_id, reading_date DESC);

CREATE INDEX IF NOT EXISTS idx_consumptions_tenant 
ON consumptions(client_account_id, reading_date DESC);

CREATE INDEX IF NOT EXISTS idx_consumptions_type 
ON consumptions(consumption_type, reading_date DESC);

-- Trigger para updated_at
CREATE TRIGGER set_consumptions_updated_at
BEFORE UPDATE ON consumptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE consumptions IS 
  'Registro de consumos reales de agua, electricidad y gas. Reemplaza datos mockeados del frontend.';
