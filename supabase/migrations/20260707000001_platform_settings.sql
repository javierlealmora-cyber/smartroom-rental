-- =============================================================================
-- Migración: platform_settings
-- Configuración global de la plataforma, editable solo por superadmin.
-- Tabla singleton (una sola fila, key=1).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id                    integer PRIMARY KEY DEFAULT 1,  -- singleton
  platform_name         text    NOT NULL DEFAULT 'SmartRoom Rental Platform',
  platform_tagline      text             DEFAULT 'Panel de Gestión',
  logo_url              text,            -- URL pública en bucket company-assets
  favicon_url           text,
  primary_color         text    NOT NULL DEFAULT '#111827',
  secondary_color       text             DEFAULT '#3B82F6',
  support_email         text,
  support_url           text,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES auth.users(id),

  -- Garantizar singleton
  CONSTRAINT singleton CHECK (id = 1)
);

-- Trigger updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime;

CREATE TRIGGER set_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Fila inicial con defaults
INSERT INTO public.platform_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer (para cargar branding en login, etc.)
CREATE POLICY "platform_settings_read"
  ON public.platform_settings
  FOR SELECT
  USING (true);

-- Solo superadmin puede modificar
CREATE POLICY "platform_settings_superadmin_write"
  ON public.platform_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Comentario
COMMENT ON TABLE public.platform_settings IS
  'Configuración global de la plataforma SaaS. Singleton (id=1). Solo editable por superadmin.';
