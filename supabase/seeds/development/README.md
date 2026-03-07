# 🌱 Development Seeds

Seeds de datos para el ambiente de **desarrollo local**.

---

## 📋 Orden de Ejecución

Los seeds deben ejecutarse en este orden (respetando dependencias):

1. ~~`01_companies.sql` - Empresas~~ **DEPRECATED** (tabla eliminada)
2. `02_client_accounts.sql` - Cuentas de cliente
3. `03_entities.sql` - Entidades propietarias
4. `04_accommodations.sql` - Alojamientos
5. `05_rooms.sql` - Habitaciones
6. `06_lodgers.sql` - Inquilinos

**Nota**: La tabla `companies` fue eliminada en la migración `20260305200001_remove_companies_table.sql`

---

## 🚀 Cómo Aplicar

### Opción 1: Script Automático (Recomendado)

```bash
npm run seed:dev
```

### Opción 2: Manual con psql

```bash
# Desde la raíz del proyecto
cd supabase/seeds/development

# Aplicar en orden
psql $DATABASE_URL -f 01_companies.sql
psql $DATABASE_URL -f 02_client_accounts.sql
psql $DATABASE_URL -f 03_entities.sql
psql $DATABASE_URL -f 04_accommodations.sql
psql $DATABASE_URL -f 05_rooms.sql
psql $DATABASE_URL -f 06_lodgers.sql
```

### Opción 3: Con Supabase CLI

```bash
# Reset completo (borra todo y aplica migraciones + seeds)
supabase db reset
```

---

## 📊 Datos Incluidos

### 🏢 Companies (3)
- **SmartRoom Demo** - Madrid
- **Alojamientos García** - Barcelona
- **Residencias López** - Valencia

### 👥 Client Accounts (3)
- Cuenta Demo Principal
- Cuenta García Madrid
- Cuenta López Valencia

### 🏛️ Entities (3)
- Propiedades Demo S.L. (company)
- García Inmobiliaria (company)
- Juan López Pérez (individual)

### 🏠 Accommodations (4)
- **Piso Centro Madrid** - 4 habitaciones
- **Residencia Universitaria Barcelona** - 10 habitaciones (5 en seed)
- **Apartamento Malasaña** - 2 habitaciones
- **Piso Estudiantes Valencia** - 3 habitaciones

### 🚪 Rooms (14)
- Diferentes tipos: shared, private, suite
- Estados: free, occupied, reserved, maintenance
- Rentas: 350€ - 500€/mes

### 👤 Lodgers (9)
- 7 activos
- 1 invitado (pendiente)
- 1 inactivo (ex-inquilino)

---

## 🔑 UUIDs de Referencia

Para usar en tests o desarrollo:

### Companies
```
11111111-1111-1111-1111-111111111111  # SmartRoom Demo
22222222-2222-2222-2222-222222222222  # Alojamientos García
33333333-3333-3333-3333-333333333333  # Residencias López
```

### Client Accounts
```
aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa  # Cuenta Demo Principal
bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb  # Cuenta García Madrid
cccccccc-cccc-cccc-cccc-cccccccccccc  # Cuenta López Valencia
```

### Entities
```
e1111111-1111-1111-1111-111111111111  # Propiedades Demo S.L.
e2222222-2222-2222-2222-222222222222  # García Inmobiliaria
e3333333-3333-3333-3333-333333333333  # Juan López Pérez
```

### Accommodations
```
a1111111-1111-1111-1111-111111111111  # Piso Centro Madrid
a2222222-2222-2222-2222-222222222222  # Residencia Universitaria Barcelona
a3333333-3333-3333-3333-333333333333  # Apartamento Malasaña
a4444444-4444-4444-4444-444444444444  # Piso Estudiantes Valencia
```

---

## ✅ Verificación

Después de aplicar los seeds, verifica:

```sql
-- Contar registros
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
SELECT 'lodgers', COUNT(*) FROM public.lodgers;

-- Resultado esperado:
-- companies:        3
-- client_accounts:  3
-- entities:         3
-- accommodations:   4
-- rooms:           14
-- lodgers:          9
```

---

## 🔄 Idempotencia

Todos los seeds son **idempotentes**:
- Usan `ON CONFLICT DO UPDATE` o `ON CONFLICT DO NOTHING`
- Pueden ejecutarse múltiples veces sin errores
- Actualizan datos existentes si ya existen

---

## 🧪 Uso en Tests

Estos datos son ideales para:
- Tests unitarios
- Tests de integración
- Tests E2E
- Desarrollo local
- Demos

Ejemplo en test:
```javascript
const DEMO_COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_ACCOMMODATION_ID = 'a1111111-1111-1111-1111-111111111111';
```

---

## 📝 Notas

- **No incluye usuarios de auth**: Los usuarios deben crearse en Supabase Auth
- **Datos ficticios**: Todos los datos son de ejemplo
- **No usar en producción**: Solo para desarrollo
- **Actualizar si cambia schema**: Mantener sincronizado con migraciones
