# 🌱 Database Seeds

Seeds de datos para diferentes ambientes del proyecto SmartRoom Rental.

---

## 📁 Estructura

```
seeds/
├── development/          # Datos completos para desarrollo local
│   ├── 01_companies.sql
│   ├── 02_profiles.sql
│   ├── 03_entities.sql
│   ├── 04_accommodations.sql
│   ├── 05_rooms.sql
│   └── 06_lodgers.sql
├── staging/             # Datos de prueba para staging
│   ├── 01_companies.sql
│   └── 02_profiles.sql
└── production/          # Seeds mínimos para producción
    └── 01_system_config.sql
```

---

## 🎯 Propósito por Ambiente

### Development
- **Objetivo**: Datos completos para desarrollo y testing
- **Contenido**:
  - Empresas de ejemplo (3-5)
  - Usuarios de todos los roles
  - Alojamientos con habitaciones
  - Inquilinos de prueba
  - Datos de consumos
- **Uso**: `npm run seed:dev`

### Staging
- **Objetivo**: Datos similares a producción pero anonimizados
- **Contenido**:
  - Empresas de prueba
  - Usuarios de prueba
  - Datos representativos
- **Uso**: `npm run seed:staging`

### Production
- **Objetivo**: Solo datos esenciales del sistema
- **Contenido**:
  - Configuraciones del sistema
  - Catálogos de referencia
  - Datos maestros
- **Uso**: Manual con aprobación

---

## 🚀 Cómo Usar

### Aplicar Seeds Localmente

```bash
# Desarrollo (todos los seeds)
npm run seed:dev

# O manualmente
psql $DATABASE_URL -f supabase/seeds/development/01_companies.sql
psql $DATABASE_URL -f supabase/seeds/development/02_profiles.sql
# ... etc
```

### Aplicar Seeds en Staging

```bash
npm run seed:staging
```

### Aplicar Seeds en Production

```bash
# SOLO con aprobación y backup previo
npm run seed:production
```

---

## ✅ Principios de Seeds

1. **Idempotentes**: Deben poder ejecutarse múltiples veces
2. **Orden**: Respetar dependencias (01, 02, 03...)
3. **Datos Realistas**: Usar datos que simulen casos reales
4. **No Secrets**: Nunca incluir passwords reales o API keys
5. **Documentados**: Comentar qué datos se están insertando

---

## 📝 Template de Seed

```sql
-- ============================================================================
-- SEED: [Nombre de la tabla]
-- Ambiente: [development/staging/production]
-- Descripción: [Qué datos se insertan y por qué]
-- ============================================================================

-- Limpiar datos existentes (solo en development)
-- TRUNCATE TABLE public.my_table CASCADE;

-- Insertar datos
INSERT INTO public.my_table (id, name, created_at)
VALUES
  ('uuid-1', 'Ejemplo 1', now()),
  ('uuid-2', 'Ejemplo 2', now())
ON CONFLICT (id) DO NOTHING;  -- Idempotencia

-- Verificación
-- SELECT COUNT(*) FROM public.my_table;
```

---

## 🔐 Seguridad

- ❌ **NO** incluir passwords reales
- ❌ **NO** incluir API keys reales
- ❌ **NO** incluir datos personales reales
- ✅ **SÍ** usar datos de ejemplo
- ✅ **SÍ** usar UUIDs fijos para referencias
- ✅ **SÍ** documentar usuarios de prueba

---

## 👥 Usuarios de Prueba (Development)

Los seeds de development incluyen usuarios de prueba:

| Email | Password | Rol | Descripción |
|-------|----------|-----|-------------|
| superadmin@test.com | Test123! | superadmin | Acceso total |
| admin@test.com | Test123! | admin | Administrador |
| agent@test.com | Test123! | agent | Agente |
| viewer@test.com | Test123! | viewer | Solo lectura |
| lodger@test.com | Test123! | lodger | Inquilino |

**IMPORTANTE**: Estos usuarios solo existen en desarrollo local.

---

## 📊 Datos de Ejemplo

### Companies
- **SmartRoom Demo** - Empresa de demostración
- **Alojamientos García** - Empresa de ejemplo
- **Residencias López** - Empresa de ejemplo

### Accommodations
- **Piso Centro Madrid** - 4 habitaciones
- **Residencia Universitaria** - 10 habitaciones
- **Apartamento Malasaña** - 2 habitaciones

### Lodgers
- **Juan Pérez** - Inquilino activo
- **María García** - Inquilino activo
- **Pedro López** - Inquilino inactivo

---

## 🔄 Actualizar Seeds

Cuando cambies el schema de la base de datos:

1. Actualizar seeds afectados
2. Validar que siguen siendo idempotentes
3. Testear localmente con `supabase db reset`
4. Commit y push

---

## 🎯 Checklist de Seed

Antes de crear un seed:

- [ ] Orden correcto (respeta dependencias)
- [ ] Idempotente (usa `ON CONFLICT DO NOTHING`)
- [ ] Datos realistas pero ficticios
- [ ] No incluye secrets reales
- [ ] Documentado con comentarios
- [ ] UUIDs fijos para referencias
- [ ] Testado localmente

---

## 📚 Recursos

- [PostgreSQL INSERT](https://www.postgresql.org/docs/current/sql-insert.html)
- [ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)
- [Supabase Seed Data](https://supabase.com/docs/guides/cli/seeding-your-database)
