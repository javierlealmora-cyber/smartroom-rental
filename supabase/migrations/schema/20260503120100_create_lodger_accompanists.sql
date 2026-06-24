-- ============================================================================
-- REQ-015 — Habitación compartida con acompañante
-- Migración 2/3 — Tabla lodger_accompanists (ficha de persona)
-- ============================================================================
-- Fecha: 2026-05-03
-- Autor: javierlealmora-cyber
--
-- Decisiones técnicas (ver REQ-015 §Reglas y .windsurf/rules/shared-rooms.md):
--  - SIN primary_lodger_id: el vínculo titular ↔ acompañante vive en
--    lodger_room_assignments.accompanist_id (única fuente de verdad).
--  - CON client_account_id NOT NULL: defense in depth multi-tenant
--    (cumple architecture.md §7).
--  - Columnas espejo de profiles para reutilizar LodgerFormFields y
--    AddressFormFields oficial sin mapeos.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lodger_accompanists (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id  uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,

  -- Identidad (espejo de profiles)
  first_name    text NOT NULL,
  last_name1    text NOT NULL,
  last_name2    text,
  nickname      text,
  document_type text CHECK (document_type IN ('dni','nie','passport','other')),
  document_id   text,
  gender        text CHECK (gender IN ('male','female','other')),
  birth_date    date,
  nationality   text,

  -- Contacto (opcional)
  email  text,
  phone  text,

  -- Dirección — modelo estándar de 7 campos
  -- (ver docs/database/ADDRESS-STANDARDIZATION.md)
  address_street      text,
  address_number      text,
  address_floor       text,
  address_postal_code text,
  address_city        text,
  address_province    text,
  address_country     text DEFAULT 'España',

  -- Metadatos
  notes   text,
  status  text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lodger_accompanists IS
  'Acompañante en habitación compartida (REQ-015). Ficha de persona pura sin acceso web ni perfil en profiles. Vinculado a la asignación via lodger_room_assignments.accompanist_id.';

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.lodger_accompanists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accompanists_tenant_access ON public.lodger_accompanists;
CREATE POLICY accompanists_tenant_access ON public.lodger_accompanists
  FOR ALL
  USING      (client_account_id = public.get_my_client_account_id())
  WITH CHECK (client_account_id = public.get_my_client_account_id());

-- ─── Trigger updated_at (sigue convención del baseline) ────────────────────
DROP TRIGGER IF EXISTS update_lodger_accompanists_updated_at ON public.lodger_accompanists;
CREATE TRIGGER update_lodger_accompanists_updated_at
  BEFORE UPDATE ON public.lodger_accompanists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_accompanist_account
  ON public.lodger_accompanists (client_account_id);

CREATE INDEX IF NOT EXISTS idx_accompanist_document
  ON public.lodger_accompanists (lower(document_id));

CREATE INDEX IF NOT EXISTS idx_accompanist_email
  ON public.lodger_accompanists (lower(email));
