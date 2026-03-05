#!/bin/bash
# ============================================================================
# Script: backup-database.sh
# Descripción: Crea backup completo de la base de datos Supabase
# Uso: ./backup-database.sh [development|staging|production]
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
  echo "Uso: ./backup-database.sh [development|staging|production]"
  echo ""
  echo "Ejemplos:"
  echo "  ./backup-database.sh development"
  echo "  ./backup-database.sh staging"
  echo "  ./backup-database.sh production"
  exit 1
fi

ENVIRONMENT=$1
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="../backups/${ENVIRONMENT}"
BACKUP_FILE="${BACKUP_DIR}/backup_${ENVIRONMENT}_${TIMESTAMP}.sql"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Backup de Base de Datos - ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configurar DATABASE_URL según el ambiente
case $ENVIRONMENT in
  development)
    if [ -z "$DATABASE_URL_DEV" ]; then
      echo -e "${YELLOW}DATABASE_URL_DEV no está configurado${NC}"
      echo -e "${YELLOW}Usando DATABASE_URL por defecto${NC}"
      DB_URL="${DATABASE_URL}"
    else
      DB_URL="${DATABASE_URL_DEV}"
    fi
    ;;
  staging)
    if [ -z "$DATABASE_URL_STAGING" ]; then
      echo -e "${RED}Error: DATABASE_URL_STAGING no está configurado${NC}"
      echo "Configura la variable de entorno con la conexión a staging"
      exit 1
    fi
    DB_URL="${DATABASE_URL_STAGING}"
    ;;
  production)
    if [ -z "$DATABASE_URL_PRODUCTION" ]; then
      echo -e "${RED}Error: DATABASE_URL_PRODUCTION no está configurado${NC}"
      echo "Configura la variable de entorno con la conexión a producción"
      exit 1
    fi
    DB_URL="${DATABASE_URL_PRODUCTION}"
    
    # Confirmación adicional para producción
    echo -e "${RED}⚠️  ADVERTENCIA: Vas a hacer backup de PRODUCCIÓN${NC}"
    echo ""
    read -p "¿Estás seguro? (escribe 'yes' para continuar): " confirmation
    if [ "$confirmation" != "yes" ]; then
      echo -e "${YELLOW}Operación cancelada${NC}"
      exit 0
    fi
    ;;
  *)
    echo -e "${RED}Error: Ambiente no válido '${ENVIRONMENT}'${NC}"
    echo "Ambientes válidos: development, staging, production"
    exit 1
    ;;
esac

# Verificar que DATABASE_URL está configurado
if [ -z "$DB_URL" ]; then
  echo -e "${RED}Error: No se pudo obtener la URL de la base de datos${NC}"
  exit 1
fi

echo -e "${YELLOW}Ambiente: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Archivo de backup: ${BACKUP_FILE}${NC}"
echo ""

# Crear backup
echo -e "${BLUE}Creando backup...${NC}"

if pg_dump "$DB_URL" > "$BACKUP_FILE" 2>/dev/null; then
  # Obtener tamaño del archivo
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  
  echo -e "${GREEN}✓ Backup creado exitosamente${NC}"
  echo -e "${GREEN}  Archivo: ${BACKUP_FILE}${NC}"
  echo -e "${GREEN}  Tamaño: ${BACKUP_SIZE}${NC}"
  echo ""
  
  # Comprimir backup
  echo -e "${BLUE}Comprimiendo backup...${NC}"
  gzip "$BACKUP_FILE"
  COMPRESSED_FILE="${BACKUP_FILE}.gz"
  COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
  
  echo -e "${GREEN}✓ Backup comprimido${NC}"
  echo -e "${GREEN}  Archivo: ${COMPRESSED_FILE}${NC}"
  echo -e "${GREEN}  Tamaño: ${COMPRESSED_SIZE}${NC}"
  echo ""
  
  # Listar backups existentes
  echo -e "${YELLOW}Backups existentes en ${ENVIRONMENT}:${NC}"
  ls -lh "$BACKUP_DIR" | grep -v "^total" | awk '{print "  " $9 " (" $5 ")"}'
  echo ""
  
  # Información de restauración
  echo -e "${BLUE}========================================${NC}"
  echo -e "${GREEN}✓ Backup completado exitosamente${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  echo -e "${YELLOW}Para restaurar este backup:${NC}"
  echo -e "  gunzip ${COMPRESSED_FILE}"
  echo -e "  psql \$DATABASE_URL < ${BACKUP_FILE}"
  echo ""
  
else
  echo -e "${RED}✗ Error al crear el backup${NC}"
  echo -e "${RED}  Verifica la conexión a la base de datos${NC}"
  exit 1
fi
