# Proceso de Deployment

## 🎯 Flujo General

```
Local → Staging → Production
```

Cada entorno requiere pasos específicos de validación antes de avanzar.

## 💻 Desarrollo Local

### 1. Crear Migración
```bash
./scripts/development/create-migration.sh schema "add_new_feature"
```

### 2. Desarrollar Migración
Editar archivo generado en `migrations/[tipo]/`

### 3. Probar Localmente
```bash
# Reset completo (baseline + migraciones + seeds)
supabase db reset

# Verificar que funciona
supabase db status
```

### 4. Commit
```bash
git add supabase/migrations/
git commit -m "feat: add new feature migration"
git push origin feature/new-feature
```

## 🧪 Deployment a Staging

### Pre-requisitos
- [ ] Migraciones probadas en local
- [ ] Tests pasando
- [ ] PR aprobado y mergeado a `main`

### Proceso

#### 1. Backup
```bash
./scripts/maintenance/backup-database.sh staging
```

#### 2. Aplicar Migraciones
```bash
# Conectar a staging
supabase link --project-ref [staging-project-id]

# Aplicar migraciones
supabase db push
```

#### 3. Aplicar Seeds (si necesario)
```bash
# Seeds estáticos
./scripts/deployment/deploy-seeds.sh staging static

# Seeds de staging
./scripts/deployment/deploy-seeds.sh staging staging
```

#### 4. Verificar
```bash
# Conectar a DB
supabase db connect

# Verificar migraciones aplicadas
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 10;

# Verificar datos
SELECT COUNT(*) FROM nueva_tabla;
```

#### 5. Testing QA
- Ejecutar suite de tests E2E
- Verificar funcionalidad manualmente
- Validar performance

## 🚀 Deployment a Producción

### Pre-requisitos
- [ ] Deployment exitoso en staging
- [ ] QA aprobado
- [ ] Tests E2E pasando
- [ ] Ventana de mantenimiento programada (si aplica)
- [ ] Equipo notificado

### Proceso

#### 1. Comunicación
```
📢 Notificar al equipo:
- Hora de deployment
- Cambios a aplicar
- Tiempo estimado de downtime (si aplica)
- Plan de rollback
```

#### 2. Backup Crítico
```bash
# Backup completo de producción
./scripts/maintenance/backup-database.sh production

# Verificar backup
ls -lh backups/production/$(date +%Y-%m-%d)/
```

#### 3. Aplicar Migraciones
```bash
# Conectar a producción
supabase link --project-ref lqwyyyttjamirccdtlvl

# Revisar migraciones pendientes
supabase db diff

# Aplicar migraciones
supabase db push
```

#### 4. Aplicar Seeds Estáticos (solo si hay nuevos)
```bash
# SOLO seeds estáticos
./scripts/deployment/deploy-seeds.sh production static
```

#### 5. Verificación Post-Deployment
```bash
# Conectar a DB
supabase db connect

# Verificar migraciones
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 10;

# Verificar integridad
SELECT COUNT(*) FROM nueva_tabla;

# Verificar RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'nueva_tabla';

# Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'nueva_tabla';
```

#### 6. Smoke Tests
- [ ] Login funciona
- [ ] Crear registro funciona
- [ ] Listar registros funciona
- [ ] Actualizar registro funciona
- [ ] Eliminar registro funciona
- [ ] Performance aceptable

#### 7. Monitoreo
```bash
# Monitorear logs (primeros 30 min)
supabase logs --project-ref lqwyyyttjamirccdtlvl

# Verificar métricas
# - Tiempo de respuesta
# - Tasa de errores
# - Uso de CPU/memoria
```

## 🔄 Rollback

Si algo falla en producción:

### Opción 1: Rollback de Migración (si es posible)
```bash
# Crear migración de rollback
./scripts/development/create-migration.sh data "rollback_feature_x"

# Aplicar rollback
supabase db push
```

### Opción 2: Restaurar desde Backup
```bash
# Restaurar backup
./scripts/maintenance/restore-database.sh production [backup-file]

# Verificar restauración
supabase db connect
```

### Opción 3: Hotfix
```bash
# Crear branch de hotfix
git checkout -b hotfix/fix-critical-issue

# Crear migración de fix
./scripts/development/create-migration.sh schema "fix_critical_issue"

# Fast-track a producción
# (seguir proceso acelerado)
```

## 📋 Checklist de Deployment

### Pre-Deployment
- [ ] Migraciones probadas en local
- [ ] Migraciones probadas en staging
- [ ] Tests E2E pasando
- [ ] QA aprobado
- [ ] Backup de producción realizado
- [ ] Equipo notificado
- [ ] Plan de rollback definido

### Durante Deployment
- [ ] Migraciones aplicadas sin errores
- [ ] Seeds aplicados (si aplica)
- [ ] Verificación de integridad OK
- [ ] Smoke tests pasando

### Post-Deployment
- [ ] Monitoreo activo (30 min)
- [ ] Métricas normales
- [ ] No errores en logs
- [ ] Equipo notificado de éxito
- [ ] Documentación actualizada

## ⚠️ Consideraciones Especiales

### Migraciones con Downtime
Si la migración requiere downtime:

1. Programar ventana de mantenimiento
2. Notificar usuarios con anticipación
3. Activar modo mantenimiento
4. Aplicar migración
5. Verificar exhaustivamente
6. Desactivar modo mantenimiento

### Migraciones Grandes
Para migraciones que afectan muchos datos:

1. Dividir en migraciones más pequeñas
2. Aplicar en horarios de bajo tráfico
3. Monitorear performance durante aplicación
4. Considerar aplicar por lotes

### Migraciones Críticas
Para cambios críticos de seguridad:

1. Revisión de código obligatoria
2. Testing exhaustivo en staging
3. Deployment en horario de oficina
4. Equipo completo disponible
5. Rollback plan detallado

## 📊 Métricas de Éxito

Un deployment exitoso debe cumplir:

- ✅ Tiempo de deployment < 15 minutos
- ✅ Downtime = 0 (o < 5 min si es planificado)
- ✅ Tasa de errores < 0.1%
- ✅ Performance degradation < 10%
- ✅ Rollback no necesario

## 🔗 Referencias

- Ver `MIGRATION_GUIDE.md` para crear migraciones
- Ver `SECURITY_RULES.md` para validaciones de seguridad
- Ver `SEED_STRATEGY.md` para manejo de seeds
