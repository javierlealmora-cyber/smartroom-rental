#!/bin/bash
# ============================================================================
# Script: create-migration.sh
# Descripción: Crea una nueva migración SQL con el formato correcto
# Uso: ./create-migration.sh "descripcion_de_la_migracion"
# ============================================================================

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que se proporcionó una descripción
if [ -z "$1" ]; then
  echo -e "${RED}Error: Debes proporcionar una descripción para la migración${NC}"
  echo "Uso: ./create-migration.sh \"descripcion_de_la_migracion\""
  echo "Ejemplo: ./create-migration.sh \"add_payment_methods\""
  exit 1
fi

# Obtener descripción y limpiarla
DESCRIPTION=$(echo "$1" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')

# Generar timestamp (YYYYMMDDHHMMSS)
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# Nombre del archivo
FILENAME="${TIMESTAMP}_${DESCRIPTION}.sql"
FILEPATH="../migrations/${FILENAME}"

# Crear archivo con template
cat > "$FILEPATH" << 'EOF'
-- ============================================================================
-- MIGRATION: [Descripción breve]
-- Fecha: $(date +"%Y-%m-%d")
-- Descripción: [Descripción detallada de los cambios]
-- ============================================================================

-- ============================================================================
-- PASO 1: [Nombre del paso]
-- ============================================================================
-- Descripción de lo que hace este paso

-- SQL idempotente aquí
-- Ejemplo:
-- CREATE TABLE IF NOT EXISTS public.my_table (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   name text NOT NULL,
--   created_at timestamptz NOT NULL DEFAULT now(),
--   updated_at timestamptz NOT NULL DEFAULT now()
-- );

-- ============================================================================
-- PASO 2: Índices
-- ============================================================================
-- CREATE INDEX IF NOT EXISTS idx_my_table_name ON public.my_table (name);

-- ============================================================================
-- PASO 3: Triggers
-- ============================================================================
-- DROP TRIGGER IF EXISTS update_my_table_updated_at ON public.my_table;
-- CREATE TRIGGER update_my_table_updated_at
--   BEFORE UPDATE ON public.my_table
--   FOR EACH ROW
--   EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PASO 4: RLS Policies
-- ============================================================================
-- ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "policy_name" ON public.my_table;
-- CREATE POLICY "policy_name"
--   ON public.my_table
--   FOR ALL
--   USING (auth.uid() = user_id);

-- ============================================================================
-- PASO 5: Comentarios (Documentación)
-- ============================================================================
-- COMMENT ON TABLE public.my_table IS 'Descripción de la tabla';
-- COMMENT ON COLUMN public.my_table.name IS 'Descripción de la columna';
EOF

echo -e "${GREEN}✓ Migración creada exitosamente:${NC}"
echo -e "  ${YELLOW}${FILEPATH}${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo "  1. Edita el archivo y completa la migración"
echo "  2. Valida la sintaxis: ./validate-migrations.sh"
echo "  3. Aplica localmente: supabase db reset"
echo "  4. Commit y push: git add ${FILEPATH} && git commit -m \"feat(db): ${DESCRIPTION}\""
