#!/bin/bash
# ============================================================================
# Script: seed-database.sh
# Descripción: Aplica seeds de datos según el ambiente
# Uso: ./seed-database.sh [development|staging|production]
# ============================================================================

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar que se proporcionó un ambiente
if [ -z "$1" ]; then
  echo -e "${RED}Error: Debes especificar un ambiente${NC}"
  echo "Uso: ./seed-database.sh [development|staging|production]"
  echo ""
  echo "Ejemplos:"
  echo "  ./seed-database.sh development"
  echo "  ./seed-database.sh staging"
  echo "  ./seed-database.sh production"
  exit 1
fi

ENVIRONMENT=$1
SEEDS_DIR="../seeds/${ENVIRONMENT}"

# Verificar que el directorio de seeds existe
if [ ! -d "$SEEDS_DIR" ]; then
  echo -e "${RED}Error: No existe el directorio de seeds para '${ENVIRONMENT}'${NC}"
  echo "Directorio esperado: ${SEEDS_DIR}"
  exit 1
fi

# Verificar que DATABASE_URL está configurado
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL no está configurado${NC}"
  echo "Configura la variable de entorno DATABASE_URL con la conexión a tu base de datos"
  echo ""
  echo "Ejemplo:"
  echo "  export DATABASE_URL='postgresql://postgres:password@localhost:54322/postgres'"
  exit 1
fi

# Confirmación para production
if [ "$ENVIRONMENT" = "production" ]; then
  echo -e "${RED}⚠️  ADVERTENCIA: Estás a punto de aplicar seeds en PRODUCCIÓN${NC}"
  echo ""
  read -p "¿Estás seguro? (escribe 'yes' para continuar): " confirmation
  if [ "$confirmation" != "yes" ]; then
    echo -e "${YELLOW}Operación cancelada${NC}"
    exit 0
  fi
  
  echo ""
  echo -e "${YELLOW}¿Has hecho un backup de la base de datos?${NC}"
  read -p "Confirma que tienes un backup (escribe 'yes' para continuar): " backup_confirmation
  if [ "$backup_confirmation" != "yes" ]; then
    echo -e "${YELLOW}Operación cancelada. Haz un backup primero.${NC}"
    exit 0
  fi
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Aplicando seeds de ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Contar archivos SQL
SQL_FILES=$(find "$SEEDS_DIR" -name "*.sql" | sort)
TOTAL_FILES=$(echo "$SQL_FILES" | wc -l)

if [ $TOTAL_FILES -eq 0 ]; then
  echo -e "${YELLOW}No se encontraron archivos SQL en ${SEEDS_DIR}${NC}"
  exit 0
fi

echo -e "${GREEN}Encontrados ${TOTAL_FILES} archivos SQL${NC}"
echo ""

# Aplicar cada seed en orden
CURRENT=0
for sql_file in $SQL_FILES; do
  CURRENT=$((CURRENT + 1))
  FILENAME=$(basename "$sql_file")
  
  echo -e "${YELLOW}[${CURRENT}/${TOTAL_FILES}] Aplicando ${FILENAME}...${NC}"
  
  if psql "$DATABASE_URL" -f "$sql_file" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ ${FILENAME} aplicado exitosamente${NC}"
  else
    echo -e "${RED}  ✗ Error aplicando ${FILENAME}${NC}"
    echo -e "${RED}  Revisa el archivo y la conexión a la base de datos${NC}"
    exit 1
  fi
  
  echo ""
done

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Seeds aplicados exitosamente${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Mostrar resumen de datos
echo -e "${YELLOW}Resumen de datos:${NC}"
psql "$DATABASE_URL" -c "
  SELECT 'companies' as table_name, COUNT(*) as count FROM public.companies
  UNION ALL
  SELECT 'client_accounts', COUNT(*) FROM public.client_accounts
  UNION ALL
  SELECT 'entities', COUNT(*) FROM public.entities
  UNION ALL
  SELECT 'accommodations', COUNT(*) FROM public.accommodations
  UNION ALL
  SELECT 'rooms', COUNT(*) FROM public.rooms
  UNION ALL
  SELECT 'lodgers', COUNT(*) FROM public.lodgers
  ORDER BY table_name;
" 2>/dev/null || echo -e "${YELLOW}No se pudo obtener el resumen (algunas tablas pueden no existir)${NC}"

echo ""
echo -e "${GREEN}✓ Proceso completado${NC}"
