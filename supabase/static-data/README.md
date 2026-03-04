# Static Data / Parámetros de Producto

Scripts SQL idempotentes para poblar catálogos y configuraciones base del sistema.

## 📋 Propósito

Los "datos estáticos" o "parámetros de producto" son datos esenciales del sistema que:
- Son idénticos en todos los entornos (DEV, Staging, Production)
- No son datos de usuarios ni transaccionales
- Se ejecutan después de las migraciones
- Son idempotentes (se pueden ejecutar múltiples veces sin romper nada)

## 📁 Estructura

```
static-data/
├── 01_plans_catalog.sql        # Planes de suscripción
├── 02_service_types.sql        # Tipos de servicios
├── 03_system_config.sql        # Configuración del sistema
└── README.md
```

## ✍️ Formato

Cada script debe ser **idempotente** usando `ON CONFLICT`:

```sql
-- Ejemplo: Insertar planes de forma idempotente
INSERT INTO plans_catalog (code, name, monthly_price, ...)
VALUES ('basic', 'Plan Basic', 29.99, ...)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price,
  updated_at = now();
```

## 🚀 Ejecución

### Manual (Supabase Dashboard)
1. Ir al SQL Editor del proyecto
2. Copiar contenido del archivo
3. Ejecutar

### CLI
```bash
npx supabase db execute --file supabase/static-data/01_plans_catalog.sql --linked
```

### GitHub Actions
Los static data se aplican automáticamente después de las migraciones en el workflow de deploy.

## 📦 Orden de Ejecución

Los archivos se ejecutan en orden alfabético (por eso el prefijo numérico):
1. `01_plans_catalog.sql` - Primero los catálogos base
2. `02_service_types.sql` - Luego tipos/categorías
3. `03_system_config.sql` - Finalmente configuraciones

## ⚠️ Importante

- **NO incluir datos sensibles** (passwords, API keys, etc.)
- **NO incluir datos de usuarios** (profiles, companies, etc.)
- **Siempre idempotente**: usar `ON CONFLICT` o `WHERE NOT EXISTS`
- **Versionado**: Los cambios se commitean con las migraciones

## 🔄 Workflow SDLC

En el workflow de despliegue:
1. Aplicar migraciones (`supabase db push`)
2. Aplicar static data (estos scripts)
3. Verificar con tests de smoke
