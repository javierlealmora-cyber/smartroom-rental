# Estrategia de Seeds

## 🌱 Tipos de Seeds

### 1. Seeds Estáticos (seeds/static/)
**Propósito:** Datos maestros necesarios en TODOS los entornos

**Características:**
- ✅ Idempotentes (pueden ejecutarse múltiples veces)
- ✅ Versionados en Git
- ✅ Se aplican en dev, staging y producción
- ✅ Datos de catálogos del sistema

**Ejemplos:**
```sql
-- seeds/static/01_plans_catalog.sql
INSERT INTO plans_catalog (code, name, monthly_price, ...)
VALUES ('basic', 'Plan Básico', 29.99, ...)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price;
```

**Cuándo usar:**
- Catálogos de planes de suscripción
- Tipos de servicios
- Estados del sistema
- Configuración base de la aplicación

### 2. Seeds de Desarrollo (seeds/development/)
**Propósito:** Datos de prueba para desarrollo local

**Características:**
- ✅ Solo en entorno local
- ✅ Datos ficticios pero realistas
- ✅ Cubren casos de uso comunes
- ❌ NUNCA en staging o producción

**Ejemplos:**
```sql
-- seeds/development/01_dev_client_accounts.sql
-- SOLO DESARROLLO - NO APLICAR EN PRODUCCIÓN
INSERT INTO client_accounts (id, name, ...)
VALUES 
  ('dev-tenant-1', 'Empresa Demo 1', ...),
  ('dev-tenant-2', 'Empresa Demo 2', ...);
```

**Cuándo usar:**
- Cuentas de cliente de prueba
- Usuarios de desarrollo
- Datos de ejemplo para testing manual
- Casos edge para debugging

### 3. Seeds de Staging (seeds/staging/)
**Propósito:** Datos de prueba para staging

**Características:**
- ✅ Solo en staging
- ✅ Datos similares a producción pero anónimos
- ✅ Para testing de QA
- ❌ NUNCA en producción

**Ejemplos:**
```sql
-- seeds/staging/01_staging_client_accounts.sql
-- SOLO STAGING - NO APLICAR EN PRODUCCIÓN
INSERT INTO client_accounts (id, name, ...)
VALUES 
  ('staging-tenant-1', 'QA Test Company 1', ...);
```

## 📝 Escribir Seeds Idempotentes

### Patrón: INSERT ... ON CONFLICT

```sql
-- ✅ Idempotente - puede ejecutarse múltiples veces
INSERT INTO plans_catalog (code, name, monthly_price)
VALUES ('basic', 'Plan Básico', 29.99)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price;
```

### Patrón: DELETE + INSERT

```sql
-- ✅ Idempotente - limpia y recrea
DELETE FROM plans_catalog WHERE code = 'basic';

INSERT INTO plans_catalog (code, name, monthly_price)
VALUES ('basic', 'Plan Básico', 29.99);
```

### Patrón: IF NOT EXISTS

```sql
-- ✅ Idempotente - solo inserta si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM plans_catalog WHERE code = 'basic') THEN
    INSERT INTO plans_catalog (code, name, monthly_price)
    VALUES ('basic', 'Plan Básico', 29.99);
  END IF;
END $$;
```

## 🚀 Aplicar Seeds

### Desarrollo Local
```bash
# Aplicar todos los seeds (static + development)
supabase db reset

# O manualmente
psql < seeds/static/01_plans_catalog.sql
psql < seeds/development/01_dev_client_accounts.sql
```

### Staging
```bash
# Aplicar seeds estáticos + staging
./scripts/deployment/deploy-seeds.sh staging static
./scripts/deployment/deploy-seeds.sh staging staging
```

### Producción
```bash
# SOLO seeds estáticos
./scripts/deployment/deploy-seeds.sh production static
```

## 📋 Orden de Ejecución

Seeds deben ejecutarse en orden debido a foreign keys:

```
static/
  01_plans_catalog.sql          # Primero - sin dependencias
  02_service_catalog.sql         # Segundo - sin dependencias

development/
  00_cleanup_client_data.sql    # Limpieza primero
  01_dev_client_accounts.sql    # Cuentas
  02_dev_profiles.sql            # Usuarios (depende de accounts)
  03_dev_accommodations.sql     # Alojamientos (depende de accounts)
  04_dev_rooms.sql               # Habitaciones (depende de accommodations)
  05_dev_assignments.sql         # Asignaciones (depende de rooms + profiles)
```

**Regla:** Usar prefijos numéricos (01_, 02_, etc.) para controlar orden.

## ⚠️ Advertencias de Seguridad

### ❌ NUNCA en Seeds
- Datos reales de clientes
- Información personal (PII)
- Passwords reales
- API keys de producción
- Datos financieros reales

### ✅ Usar en Seeds
- Datos ficticios pero realistas
- Emails de prueba (@example.com)
- Passwords genéricos para desarrollo
- Datos anónimos

## 🔄 Seeds vs Migraciones

| Aspecto | Seeds | Migraciones |
|---------|-------|-------------|
| Propósito | Datos de prueba/maestros | Cambios de estructura |
| Versionado | Sí | Sí |
| Idempotente | Sí | Sí |
| En producción | Solo static/ | Todas |
| Puede resetearse | Sí | No |
| Contiene estructura | No | Sí |

## 📖 Ejemplos Completos

### Seed Estático
```sql
-- seeds/static/01_plans_catalog.sql
-- Catálogo de planes - TODOS LOS ENTORNOS

INSERT INTO plans_catalog (
  code, name, monthly_price, max_accommodations, max_rooms
) VALUES 
  ('basic', 'Plan Básico', 29.99, 3, 20),
  ('pro', 'Plan Profesional', 79.99, 10, 100),
  ('enterprise', 'Plan Empresarial', 199.99, 999, 9999)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price,
  max_accommodations = EXCLUDED.max_accommodations,
  max_rooms = EXCLUDED.max_rooms;
```

### Seed de Desarrollo
```sql
-- seeds/development/01_dev_client_accounts.sql
-- SOLO DESARROLLO

-- Limpiar datos previos
DELETE FROM client_accounts WHERE id LIKE 'dev-%';

-- Crear cuentas de prueba
INSERT INTO client_accounts (id, name, plan_code, status)
VALUES 
  ('dev-tenant-1', 'Empresa Demo 1', 'basic', 'active'),
  ('dev-tenant-2', 'Empresa Demo 2', 'pro', 'active');
```

## ✅ Checklist

Antes de commitear un seed:

- [ ] Es idempotente
- [ ] Usa prefijo numérico para orden
- [ ] No contiene datos sensibles
- [ ] Está en la carpeta correcta (static/development/staging)
- [ ] Incluye comentario indicando entorno
- [ ] Probado localmente
- [ ] Documentado si es complejo
