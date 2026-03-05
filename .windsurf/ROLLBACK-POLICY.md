# 🔄 Política de Rollback Obligatorio

**REGLA CRÍTICA**: TODO deployment DEBE tener un plan de rollback definido y probado ANTES de aplicar.

---

## 🎯 Principio Fundamental

> **"Si no puedes hacer rollback, no puedes hacer deploy"**

Ningún deployment puede ir a staging o production sin un plan de rollback documentado y validado.

---

## 📋 Tipos de Rollback

### 1. **Rollback Solo de Código**
- Cambios solo en frontend/backend
- Sin cambios en BBDD
- **Comando**: Revertir deployment en Vercel

### 2. **Rollback Solo de BBDD**
- Cambios solo en migraciones SQL
- Sin cambios en código
- **Comando**: `npm run rollback:[ambiente]`

### 3. **Rollback Completo (Código + BBDD)** ⭐
- Cambios en código Y base de datos
- **REQUIERE coordinación de ambos rollbacks**
- **Comando**: `npm run rollback:full:[ambiente]`

---

## ⚠️ Reglas Obligatorias

### Antes del Deployment

- [ ] **Plan de rollback documentado**
- [ ] **Migración de rollback creada** (si aplica)
- [ ] **Rollback testeado en development**
- [ ] **Backup de BBDD creado** (staging/production)
- [ ] **Deployment ID anterior identificado** (para rollback de código)
- [ ] **Ventana de tiempo definida** para validación post-deploy
- [ ] **Criterios de KO/OK documentados**

### Durante el Deployment

- [ ] **Monitoreo activo** durante y después del deploy
- [ ] **Logs revisados** en tiempo real
- [ ] **Métricas monitoreadas** (errores, latencia, etc.)
- [ ] **Tests smoke ejecutados** inmediatamente después

### Después del Deployment

- [ ] **Validación post-deploy ejecutada**: `npm run validate:[ambiente]`
- [ ] **Decisión OK/KO tomada** dentro de la ventana de tiempo
- [ ] **Si KO**: Rollback ejecutado INMEDIATAMENTE
- [ ] **Si OK**: Deployment confirmado y documentado

---

## 🚨 Proceso de Rollback Completo

### PASO 1: Detectar Problema

Indicadores de que se necesita rollback:
- ❌ Errores críticos en logs
- ❌ Tests E2E fallando
- ❌ Métricas de error elevadas
- ❌ Funcionalidad crítica no funciona
- ❌ Performance degradada significativamente

### PASO 2: Decidir Rollback

```bash
npm run validate:[ambiente]
# Responder: NO (para iniciar rollback)
```

### PASO 3: Ejecutar Rollback Completo

```bash
# Rollback de Código + BBDD
npm run rollback:full:[ambiente]
# Confirmar escribiendo: ROLLBACK
```

Esto ejecutará:
1. ✅ Rollback de código (Vercel deployment anterior)
2. ✅ Rollback de BBDD (migración de rollback)
3. ✅ Verificación post-rollback

### PASO 4: Verificar Rollback

```bash
npm run validate:[ambiente]
# Verificar que todo volvió a funcionar
```

### PASO 5: Investigar y Corregir

- Revisar logs del deployment fallido
- Identificar causa raíz
- Corregir en development
- Re-testear completamente
- Volver a intentar deployment

---

## 📊 Matriz de Decisión de Rollback

| Severidad | Impacto | Acción | Tiempo Máximo |
|-----------|---------|--------|---------------|
| 🔴 Crítico | Producción caída | **Rollback INMEDIATO** | 5 minutos |
| 🟠 Alto | Funcionalidad crítica afectada | **Rollback urgente** | 15 minutos |
| 🟡 Medio | Funcionalidad secundaria afectada | **Evaluar y decidir** | 30 minutos |
| 🟢 Bajo | Problemas menores | **Monitorear y fix forward** | N/A |

---

## 🔄 Tipos de Deployment y sus Rollbacks

### Deployment Tipo 1: Solo Código

**Cambios**: Frontend/Backend sin BBDD

**Rollback**:
```bash
# Desde Vercel Dashboard
https://vercel.com/smartroom-rental/[project]/deployments
→ Click en deployment anterior
→ "Promote to Production"

# O desde CLI
vercel rollback [deployment-id] --scope smartroom-rental
```

**Tiempo estimado**: 2-5 minutos

---

### Deployment Tipo 2: Solo BBDD

**Cambios**: Migraciones SQL sin código

**Rollback**:
```bash
npm run rollback:[ambiente]
# Confirmar Project ID
```

**Tiempo estimado**: 5-10 minutos

**IMPORTANTE**: 
- ✅ Migración de rollback debe existir ANTES del deploy
- ✅ Backup de BBDD debe estar disponible
- ✅ Rollback debe ser testeado en development primero

---

### Deployment Tipo 3: Código + BBDD ⭐

**Cambios**: Frontend/Backend + Migraciones SQL

**Rollback** (ORDEN CRÍTICO):
```bash
# 1. Rollback de CÓDIGO primero (más rápido)
vercel rollback [deployment-id] --scope smartroom-rental

# 2. Rollback de BBDD después
npm run rollback:[ambiente]

# 3. Verificar
npm run validate:[ambiente]
```

**Tiempo estimado**: 10-20 minutos

**ORDEN IMPORTANTE**:
1. ✅ **Primero código** (revertir a versión compatible con BBDD actual)
2. ✅ **Luego BBDD** (revertir esquema)
3. ✅ **Verificar** que todo funciona

**¿Por qué este orden?**
- Si revertimos BBDD primero, el código nuevo puede fallar con esquema viejo
- Si revertimos código primero, el código viejo es compatible con BBDD nueva (por diseño)

---

## 📝 Template de Plan de Rollback

Para cada deployment, documentar:

```markdown
## Plan de Rollback - [Nombre del Deployment]

### Información del Deployment
- **Fecha**: YYYY-MM-DD
- **Ambiente**: [dev/staging/prod]
- **Tipo**: [Código / BBDD / Código+BBDD]
- **Issue/PR**: #XXX

### Cambios Incluidos
- [ ] Código: [Descripción]
- [ ] BBDD: [Descripción de migraciones]

### Plan de Rollback

#### Si falla CÓDIGO:
```bash
vercel rollback [deployment-id]
```

#### Si falla BBDD:
```bash
npm run rollback:[ambiente]
```

#### Si falla AMBOS:
```bash
npm run rollback:full:[ambiente]
```

### Criterios de KO
- [ ] [Criterio 1]
- [ ] [Criterio 2]

### Criterios de OK
- [ ] [Criterio 1]
- [ ] [Criterio 2]

### Backup Creado
- [ ] BBDD: `backup_[ambiente]_YYYYMMDD_HHMMSS.sql`
- [ ] Deployment ID anterior: `dpl_XXXXXX`

### Tiempo de Validación
- **Ventana**: [15 min / 30 min / 1 hora]
- **Responsable**: [Nombre]
```

---

## 🎯 Checklist Pre-Deployment

Antes de hacer ANY deployment a staging/production:

### Código
- [ ] Tests unitarios pasando
- [ ] Tests E2E pasando
- [ ] Lint sin errores
- [ ] Build exitoso

### BBDD (si aplica)
- [ ] Migración creada y testeada en dev
- [ ] **Migración de ROLLBACK creada** ⭐
- [ ] Migración es idempotente
- [ ] Backup de BBDD creado

### Rollback
- [ ] **Plan de rollback documentado** ⭐
- [ ] Rollback testeado en development
- [ ] Deployment ID anterior identificado
- [ ] Criterios de KO/OK definidos
- [ ] Ventana de validación definida

### Equipo
- [ ] Equipo notificado del deployment
- [ ] Responsable de validación asignado
- [ ] Responsable de rollback asignado (si es necesario)

---

## 🚨 Escenarios de Emergencia

### Escenario 1: Production Caída

**Acción**: Rollback INMEDIATO sin validación adicional

```bash
npm run rollback:full:prod
```

**Tiempo máximo**: 5 minutos

---

### Escenario 2: Datos Corruptos

**Acción**: 
1. Rollback de código inmediato
2. Evaluar si rollback de BBDD es seguro
3. Si hay datos nuevos importantes, considerar fix forward

---

### Escenario 3: Rollback Falla

**Acción**:
1. Restaurar desde backup manual
2. Escalar a equipo senior
3. Documentar incidente

```bash
# Restaurar desde backup
psql [DATABASE_URL] < backup_prod_YYYYMMDD_HHMMSS.sql
```

---

## 📊 Métricas de Rollback

Trackear:
- Número de rollbacks por mes
- Tiempo promedio de rollback
- Causa raíz de rollbacks
- Efectividad del rollback (¿resolvió el problema?)

**Meta**: < 5% de deployments requieren rollback

---

## 🎓 Lecciones Aprendidas

### ✅ Buenas Prácticas

1. **Siempre testear rollback en dev** antes del deployment
2. **Crear migración de rollback** junto con la migración principal
3. **Documentar criterios de KO** antes del deploy
4. **Monitorear activamente** durante ventana de validación
5. **No dudar en hacer rollback** si algo no se ve bien

### ❌ Errores Comunes

1. ❌ Hacer deployment sin plan de rollback
2. ❌ No testear rollback antes de ir a production
3. ❌ Esperar demasiado para hacer rollback
4. ❌ Hacer rollback de BBDD antes que código
5. ❌ No tener backup antes de cambios en BBDD

---

## 🔗 Referencias

- Validación Post-Deploy: `.windsurf/ENVIRONMENTS.md`
- SDLC Migraciones: `.windsurf/DATABASE-MIGRATIONS-FASE6.md`
- Scripts de Rollback: `scripts/rollback-*.js`

---

## 📅 Última Actualización

- **Fecha**: 2026-03-05
- **Versión**: 1.0
- **Por**: Sistema de Rollback Obligatorio
