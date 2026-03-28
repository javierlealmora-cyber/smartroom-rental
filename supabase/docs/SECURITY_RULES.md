# Reglas de Seguridad para Migraciones

## ✅ QUÉ SÍ PUEDE IR EN MIGRACIONES

### Estructura de Base de Datos
- ✅ CREATE/ALTER/DROP TABLE
- ✅ ADD/DROP/ALTER COLUMN
- ✅ PRIMARY KEY, FOREIGN KEY, UNIQUE
- ✅ CHECK CONSTRAINTS
- ✅ NOT NULL CONSTRAINTS
- ✅ EXCLUDE CONSTRAINTS
- ✅ DEFAULT VALUES

### Índices y Performance
- ✅ CREATE INDEX (normal, compuesto, único, parcial)
- ✅ CREATE INDEX USING GIN/GiST
- ✅ CLUSTER, ANALYZE

### Tipos y Esquemas
- ✅ CREATE TYPE (ENUM, COMPOSITE)
- ✅ CREATE SCHEMA
- ✅ CREATE EXTENSION

### Vistas y Funciones
- ✅ CREATE VIEW
- ✅ CREATE MATERIALIZED VIEW
- ✅ CREATE FUNCTION (SQL/plpgsql)
- ✅ CREATE TRIGGER
- ✅ CREATE PROCEDURE

### Seguridad
- ✅ ENABLE ROW LEVEL SECURITY
- ✅ CREATE POLICY / ALTER POLICY
- ✅ GRANT / REVOKE (roles del sistema)

### Datos Maestros Estables
- ✅ Catálogos del sistema (planes, estados, tipos)
- ✅ Configuración base de la aplicación
- ✅ Datos de referencia inmutables

### Migraciones de Datos
- ✅ UPDATE para backfill de columnas nuevas
- ✅ INSERT para normalización de datos
- ✅ DELETE para cleanup de datos obsoletos

## ❌ QUÉ NO PUEDE IR EN MIGRACIONES

### Secretos y Credenciales
- ❌ Passwords
- ❌ API Keys
- ❌ OAuth Client Secrets
- ❌ Tokens de autenticación
- ❌ Claves de cifrado
- ❌ Certificados privados

### Configuración de Entorno
- ❌ URLs específicas de entorno (dev/staging/prod)
- ❌ Variables de entorno
- ❌ Configuración de SMTP
- ❌ Configuración de servicios externos
- ❌ Feature flags específicos de entorno

### Datos de Clientes
- ❌ Datos reales de usuarios
- ❌ Datos de producción
- ❌ Información personal (PII)
- ❌ Datos de prueba con información sensible

### Scripts Temporales
- ❌ Queries de debugging
- ❌ Análisis ad-hoc
- ❌ Scripts de un solo uso sin valor futuro

## 🔐 Manejo de Secretos

### Variables de Entorno
Usar variables de entorno para secretos:

```bash
# .env.local (NO COMMITEAR)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG.xxx
```

### Configuración por Entorno
```toml
# config.toml
[auth.email.smtp]
enabled = true
host = "smtp.sendgrid.net"
port = 587
user = "apikey"
pass = "env(SENDGRID_API_KEY)"  # ✅ Variable de entorno
```

### Edge Functions
```typescript
// ✅ Correcto - usar Deno.env
const apiKey = Deno.env.get("EXTERNAL_API_KEY");

// ❌ Incorrecto - hardcodear
const apiKey = "sk_live_xxxxx";
```

## 🌱 Seeds vs Migraciones

### Seeds (seeds/)
- Datos de prueba para desarrollo/staging
- Datos maestros del sistema
- Pueden resetearse y regenerarse

### Migraciones (migrations/)
- Cambios de estructura versionados
- Datos maestros críticos del sistema
- Nunca se resetean, solo se agregan

## 📋 Checklist de Seguridad

Antes de commitear una migración:

- [ ] No contiene passwords ni API keys
- [ ] No contiene URLs específicas de entorno
- [ ] No contiene datos reales de clientes
- [ ] Usa variables de entorno para secretos
- [ ] RLS habilitado en tablas nuevas
- [ ] Políticas RLS creadas para multi-tenancy
- [ ] Constraints de seguridad añadidos
- [ ] Comentarios no revelan información sensible

## 🚨 Ejemplos de Violaciones

### ❌ MAL - Secreto en migración
```sql
-- NUNCA HACER ESTO
INSERT INTO config (key, value) 
VALUES ('stripe_secret_key', 'sk_live_xxxxx');
```

### ✅ BIEN - Usar variable de entorno
```sql
-- Documentar que se debe configurar en el entorno
COMMENT ON TABLE config IS 
  'Configurar stripe_secret_key vía variable de entorno STRIPE_SECRET_KEY';
```

### ❌ MAL - URL específica de entorno
```sql
-- NUNCA HACER ESTO
INSERT INTO settings (name, value) 
VALUES ('api_url', 'https://api.production.com');
```

### ✅ BIEN - Configuración genérica
```sql
-- Usar configuración por entorno
COMMENT ON TABLE settings IS 
  'Configurar api_url según entorno en config.toml o variables de entorno';
```

## 🔒 Políticas RLS Obligatorias

Toda tabla nueva DEBE tener RLS:

```sql
-- Habilitar RLS
ALTER TABLE nueva_tabla ENABLE ROW LEVEL SECURITY;

-- Política de lectura multi-tenant
CREATE POLICY "nueva_tabla_select_by_tenant"
ON nueva_tabla
FOR SELECT
TO authenticated
USING (client_account_id = (
  SELECT client_account_id FROM profiles WHERE id = auth.uid()
));

-- Políticas para INSERT, UPDATE, DELETE
-- ... (similar pattern)
```

## 📖 Referencias

- Ver `MIGRATION_GUIDE.md` para estructura de migraciones
- Ver `SEED_STRATEGY.md` para manejo de datos de prueba
- Ver `DEPLOYMENT_PROCESS.md` para proceso seguro de deployment
