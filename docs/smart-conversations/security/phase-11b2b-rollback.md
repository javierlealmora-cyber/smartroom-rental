# Fase 11B2B — Procedimiento de Rollback

**Contexto:** Esta migración solo está diseñada para aplicarse en Supabase local.  
NO se ha aplicado en sandbox, staging ni producción.  
El rollback es relevante únicamente si se aplica en entorno local.

---

## Rollback de la migración 20260721000001

### Paso 1: Revertir columnas en conv_wc_configs

```sql
ALTER TABLE conv_wc_configs
  DROP COLUMN IF EXISTS widget_public_key,
  DROP COLUMN IF EXISTS auth_mode,
  DROP COLUMN IF EXISTS rate_limit_mode;
```

### Paso 2: Revertir columna en conv_sessions

```sql
ALTER TABLE conv_sessions
  DROP COLUMN IF EXISTS expires_at;
```

### Paso 3: Eliminar tabla conv_rate_limit_buckets

```sql
DROP TABLE IF EXISTS conv_rate_limit_buckets CASCADE;
```

### Paso 4: Eliminar funciones

```sql
DROP FUNCTION IF EXISTS increment_rate_limit_bucket(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS cleanup_rate_limit_buckets();
```

### Paso 5: Eliminar índices (si DROP TABLE no los eliminó)

```sql
DROP INDEX IF EXISTS idx_conv_wc_configs_widget_key;
DROP INDEX IF EXISTS idx_conv_sessions_expires_at;
```

### Paso 6: Restaurar GRANT para anon/authenticated (si era el estado previo)

> ⚠️ Solo si el entorno tenía grants para anon/authenticated antes de la migración.
> En la mayoría de entornos Supabase, anon/authenticated tienen grants por defecto
> en tablas creadas con `CREATE TABLE` — el REVOKE elimina esos grants heredados.

```sql
-- Solo ejecutar si el entorno anterior requería acceso anon/authenticated
-- (caso poco probable dado que las tablas son internal_only)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON conv_service_activations, conv_wa_sessions, conv_wc_configs,
     conv_sessions, conv_cases, conv_messages, conv_send_queue,
     conv_admin_notifications
  TO anon, authenticated;
```

---

## Rollback de archivos TypeScript

Los archivos TS son locales y no afectan la DB. Para revertir:

```bash
git checkout HEAD -- supabase/functions/conv-web-session/index.ts
git checkout HEAD -- supabase/functions/conv-web-poll/index.ts
git rm supabase/functions/_shared/smart-conversations/runtime/env-config.ts
git rm supabase/functions/_shared/smart-conversations/runtime/ef-tenant-guards.ts
# Para webchat-rate-limiter.ts: revertir manualmente checkSessionCreationRateLimit y checkPollRateLimit
```

---

## Verificación post-rollback

```sql
-- 1. Verificar que widget_public_key NO existe
SELECT column_name FROM information_schema.columns
WHERE table_name = 'conv_wc_configs' AND column_name = 'widget_public_key';
-- Resultado esperado: 0 filas

-- 2. Verificar que conv_rate_limit_buckets NO existe
SELECT table_name FROM information_schema.tables
WHERE table_name = 'conv_rate_limit_buckets';
-- Resultado esperado: 0 filas

-- 3. Verificar que la función NO existe
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'increment_rate_limit_bucket';
-- Resultado esperado: 0 filas
```
