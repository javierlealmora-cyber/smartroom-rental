# Deployment Guide — SmartRent

Guía de deployment para SmartRent en Vercel con entornos staging y producción.

---

## Estructura de Ramas

```
master (producción)  ← Deploy automático a producción
  ↑
staging              ← Deploy automático a staging (pre-producción)
  ↑
develop              ← Desarrollo local
```

---

## Entornos de Deployment

### 🔵 Staging (Pre-producción)
- **Rama:** `staging`
- **URL:** https://smartroom-rental-staging.vercel.app (o la que asigne Vercel)
- **Propósito:** Testing de features antes de producción
- **Variables de entorno:** `.env.staging`

### 🟢 Producción
- **Rama:** `master`
- **URL:** https://smartroomrentalplatform.com
- **Propósito:** Aplicación en vivo para usuarios finales
- **Variables de entorno:** `.env.production`

---

## Flujo de Trabajo

### 1. Desarrollo Local
```bash
# Trabajar en rama develop
git checkout develop

# Hacer cambios y commits
git add .
git commit -m "feat: nueva funcionalidad"

# Push a develop
git push origin develop
```

### 2. Deploy a Staging
```bash
# Merge develop a staging
git checkout staging
git merge develop

# Push a staging (deploy automático)
git push origin staging
```

**Vercel detectará el push y desplegará automáticamente a staging.**

### 3. Testing en Staging
- Verificar funcionalidad en staging
- Ejecutar tests: `npm run test:run`
- Verificar que no hay bugs críticos
- Revisar `tests/defects/OPEN-DEFECTS.md`

### 4. Deploy a Producción
```bash
# Si staging está OK, merge a master
git checkout master
git merge staging

# Push a master (deploy automático a producción)
git push origin master
```

**Vercel detectará el push y desplegará automáticamente a producción.**

---

## Configuración de Variables de Entorno en Vercel

### Staging
1. Ir a Vercel Dashboard → Proyecto → Settings → Environment Variables
2. Añadir variables para **Preview (staging)**:
   - `VITE_SUPABASE_URL`: URL de Supabase
   - `VITE_SUPABASE_ANON_KEY`: Anon key de Supabase
   - Otras variables de `.env.staging`

### Producción
1. Añadir variables para **Production**:
   - `VITE_SUPABASE_URL`: URL de Supabase
   - `VITE_SUPABASE_ANON_KEY`: Anon key de Supabase
   - Otras variables de `.env.production`

---

## Comandos Útiles

```bash
# Ver rama actual
git branch

# Cambiar de rama
git checkout staging
git checkout master

# Ver estado de Git
git status

# Ver diferencias entre ramas
git diff staging master

# Ver últimos commits
git log --oneline -10

# Revertir cambios (si es necesario)
git revert <commit-hash>
```

---

## Rollback en Caso de Error

### Opción 1: Rollback en Vercel Dashboard
1. Ir a Vercel Dashboard → Deployments
2. Seleccionar deployment anterior estable
3. Click en "Promote to Production"

### Opción 2: Revertir commit en Git
```bash
# Ver últimos commits
git log --oneline -5

# Revertir commit específico
git revert <commit-hash>

# Push del revert
git push origin master
```

---

## Checklist Pre-Deployment

### Antes de merge a staging:
- [ ] Tests pasan: `npm run test:run`
- [ ] Build funciona: `npm run build:pre`
- [ ] No hay errores de ESLint: `npm run lint`
- [ ] Variables de entorno actualizadas en `.env.staging`
- [ ] OPEN-DEFECTS.md revisado (no bugs críticos)

### Antes de merge a producción:
- [ ] Staging testeado completamente
- [ ] No hay bugs críticos en OPEN-DEFECTS.md
- [ ] Variables de entorno actualizadas en Vercel (producción)
- [ ] Backup de base de datos realizado (si hay migraciones)
- [ ] Documentación actualizada

---

## Monitoreo Post-Deployment

### Después de deploy a staging:
1. Verificar que la app carga correctamente
2. Probar login con diferentes roles
3. Verificar funcionalidades críticas
4. Revisar logs en Vercel Dashboard

### Después de deploy a producción:
1. Monitorear logs en Vercel (primeros 30 min)
2. Verificar métricas de Supabase
3. Revisar errores en Sentry (si está configurado)
4. Estar disponible para rollback rápido si es necesario

---

## Troubleshooting

### Build falla en Vercel
- Verificar que `package.json` tiene todas las dependencias
- Revisar logs de build en Vercel Dashboard
- Probar build local: `npm run build`

### Variables de entorno no funcionan
- Verificar que tienen prefijo `VITE_` (requerido por Vite)
- Verificar que están configuradas en Vercel para el entorno correcto
- Re-deploy después de cambiar variables

### App no carga después de deploy
- Verificar que `vercel.json` tiene rewrites correctos
- Revisar logs de runtime en Vercel
- Verificar que Supabase URL y keys son correctas

---

## Recursos

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Dashboard](https://app.supabase.com/project/lqwyyyttjamirccdtlvl)
- [Documentación Vercel](https://vercel.com/docs)
- [Documentación Vite](https://vitejs.dev/guide/env-and-mode.html)
