# 🌍 Supabase Environments

**IMPORTANTE**: Este documento define los ambientes oficiales del proyecto.

---

## 📊 Ambientes Configurados

### 1. Development
- **Project ID**: `lopdwrsmkmtboeczxotj`
- **URL**: https://lopdwrsmkmtboeczxotj.supabase.co
- **Propósito**: Desarrollo y testing de features
- **Riesgo**: ✅ BAJO - Datos de prueba
- **Comando**: `npm run migrate:dev`

### 2. Staging
- **Project ID**: `lqwyyyttjamirccdtlvl`
- **URL**: https://lqwyyyttjamirccdtlvl.supabase.co
- **Propósito**: Validación pre-producción
- **Riesgo**: ⚠️ MEDIO - Datos importantes
- **Comando**: `npm run migrate:staging`

### 3. Production
- **Project ID**: `[POR DEFINIR]`
- **URL**: https://smartroomrentalplatform.com
- **Propósito**: Producción con datos reales
- **Riesgo**: 🚨 CRÍTICO - Datos de clientes
- **Comando**: `npm run migrate:prod`

---

## 🔒 Proceso de Migración Seguro

### Flujo Obligatorio

```
Development (lopdwrsmkmtboeczxotj)
    ↓ Aplicar y Validar
    ↓ npm run migrate:dev
    ↓ npm run validate:dev
    ↓
Staging (lqwyyyttjamirccdtlvl)
    ↓ Aplicar y Validar
    ↓ npm run migrate:staging
    ↓ npm run validate:staging
    ↓ Monitorear 24-48h
    ↓
Production ([PRODUCTION_PROJECT_ID])
    ↓ Aplicar y Validar
    ↓ npm run migrate:prod
    ↓ npm run validate:prod
    ↓ Monitorear activamente
```

---

## 📝 Comandos Disponibles

### Aplicar Migraciones

```bash
# Development
npm run migrate:dev
# → Confirma: lopdwrsmkmtboeczxotj

# Staging
npm run migrate:staging
# → Confirma: lqwyyyttjamirccdtlvl

# Production
npm run migrate:prod
# → Confirma: [PRODUCTION_PROJECT_ID]
```

### Validar Deployment

```bash
# Development
npm run validate:dev

# Staging
npm run validate:staging

# Production
npm run validate:prod
```

### Rollback (si falla validación)

```bash
# Development
npm run rollback:dev

# Staging
npm run rollback:staging

# Production
npm run rollback:prod
```

---

## ✅ Checklist de Validación Post-Deploy

Después de aplicar migraciones, validar:

1. **Migraciones aplicadas sin errores**
   - Revisar logs de Supabase
   - Verificar tabla `supabase_migrations.schema_migrations`

2. **Estructura de tablas correcta**
   - Verificar columnas, tipos de datos
   - Verificar constraints y foreign keys

3. **Políticas RLS funcionando**
   - Testear acceso con diferentes roles
   - Verificar que no hay data leaks

4. **Seeds aplicados correctamente**
   - Verificar datos de prueba
   - Verificar integridad referencial

5. **Aplicación funciona sin errores**
   - Testear flujos principales
   - Verificar logs de errores

6. **Tests E2E pasan**
   - Ejecutar smoke tests
   - Verificar funcionalidad crítica

---

## ⚠️ Reglas de Seguridad

### ✅ SIEMPRE

- ✅ Validar el Project ID antes de aplicar
- ✅ Seguir el flujo: dev → staging → prod
- ✅ Ejecutar validación post-deploy
- ✅ Hacer backup antes de staging/production
- ✅ Monitorear después de aplicar

### ❌ NUNCA

- ❌ Aplicar migraciones sin confirmar ambiente
- ❌ Saltarse development
- ❌ Aplicar en production sin validar en staging
- ❌ Ignorar errores de validación
- ❌ Aplicar migraciones sin plan de rollback

---

## 🔄 Proceso de Rollback

Si la validación post-deploy falla:

### 1. Ejecutar Rollback Inmediatamente

```bash
npm run rollback:[ambiente]
```

### 2. Verificar que el Rollback fue Exitoso

```bash
npm run validate:[ambiente]
```

### 3. Investigar el Problema

- Revisar logs de error
- Identificar causa raíz
- Documentar el problema

### 4. Corregir y Re-testear

- Corregir migración en development
- Re-testear completamente
- Volver a aplicar siguiendo el flujo

---

## 📞 En Caso de Emergencia

Si algo sale mal en **Production**:

1. **NO ENTRAR EN PÁNICO**
2. **Ejecutar rollback inmediatamente**: `npm run rollback:prod`
3. **Notificar al equipo**
4. **Documentar el incidente**
5. **Investigar causa raíz**

---

## 📊 Monitoreo Post-Deploy

### Development
- Monitoreo: Manual
- Duración: Inmediato

### Staging
- Monitoreo: Manual + Logs
- Duración: 24-48 horas

### Production
- Monitoreo: Activo + Alertas
- Duración: Mínimo 1 hora, idealmente 24 horas

---

## 🎯 Última Actualización

- **Fecha**: 2026-03-05
- **Versión**: 1.0
- **Por**: Sistema de Migraciones FASE 6
