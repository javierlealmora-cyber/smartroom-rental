# Control de Modo Mantenimiento por Entorno

**Fecha:** 2026-02-28  
**Configuración:** Por variable de entorno

---

## 🎯 Objetivo

Permitir que **producción** esté en mantenimiento mientras **staging** sigue funcionando normalmente.

---

## 🔧 Cómo Funciona

El script `scripts/enable-maintenance.js` solo activa el modo mantenimiento si la variable de entorno **`MAINTENANCE_MODE=true`** está configurada.

### Flujo de Build

```bash
npm run build:maintenance
  ↓
1. vite build (genera dist/)
2. node scripts/enable-maintenance.js
   ↓
   Si MAINTENANCE_MODE=true → Copia maintenance.html a dist/index.html
   Si MAINTENANCE_MODE=false o no existe → No hace nada (app normal)
```

---

## ⚙️ Configuración en Vercel

### Production (rama `main`) - CON Mantenimiento

1. Ve a **Vercel** → `smartroom-rental` → **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Configurar:
   ```
   Key: MAINTENANCE_MODE
   Value: true
   Environments: ✅ Production
   Git Branch: main
   ```
4. Click **"Save"**

### Staging (rama `staging`) - SIN Mantenimiento

**No configurar la variable** o configurarla como `false`:

```
Key: MAINTENANCE_MODE
Value: false
Environments: ✅ Preview
Git Branch: staging
```

---

## 📊 Configuración Actual

| Entorno | Rama | MAINTENANCE_MODE | Resultado |
|---------|------|------------------|-----------|
| **Production** | `main` | `true` | 🔧 Mantenimiento |
| **Staging** | `staging` | `false` (o no configurada) | ✅ App funcionando |

---

## 🚀 Desplegar Cambios

### Para Activar Mantenimiento en Producción

1. **Vercel** → **Settings** → **Environment Variables**
2. Añadir o modificar:
   ```
   MAINTENANCE_MODE = true (Production, main)
   ```
3. **Redeploy** desde Vercel o hacer push a `main`

### Para Desactivar Mantenimiento en Producción

**Opción A: Eliminar Variable**
1. **Vercel** → **Settings** → **Environment Variables**
2. Buscar `MAINTENANCE_MODE`
3. Click en **"..."** → **"Remove"**
4. **Redeploy**

**Opción B: Cambiar a false**
1. Cambiar valor a `false`
2. **Redeploy**

---

## 🧪 Prueba Local

### Con Mantenimiento
```bash
export MAINTENANCE_MODE=true  # Linux/Mac
set MAINTENANCE_MODE=true     # Windows CMD
$env:MAINTENANCE_MODE="true"  # Windows PowerShell

npm run build:maintenance
```

### Sin Mantenimiento
```bash
unset MAINTENANCE_MODE        # Linux/Mac
set MAINTENANCE_MODE=         # Windows CMD
$env:MAINTENANCE_MODE=""      # Windows PowerShell

npm run build:maintenance
```

---

## 📝 Scripts Disponibles

```json
{
  "build": "vite build --mode production",
  "build:maintenance": "vite build --mode production && node scripts/enable-maintenance.js",
  "build:pre": "vite build --mode staging",
  "maintenance:enable": "node scripts/enable-maintenance.js"
}
```

---

## 🔍 Verificación

### Ver logs en Vercel

1. **Vercel** → **Deployments** → Click en un deploy
2. **Build Logs** → Buscar:

```
Con mantenimiento:
✅ Maintenance mode enabled: maintenance.html copied to dist/index.html

Sin mantenimiento:
ℹ️  MAINTENANCE_MODE not enabled. Skipping maintenance mode.
```

---

## 🎉 Ventajas de esta Solución

- ✅ Un solo código base
- ✅ Control por entorno (production vs staging)
- ✅ Fácil de activar/desactivar
- ✅ Sin necesidad de commits para cambiar modo
- ✅ Staging siempre funcional para testing

---

## 📞 Ejemplo de Uso

### Escenario: Mantenimiento Programado

1. **Antes del mantenimiento:**
   - Production: ✅ App funcionando
   - Staging: ✅ App funcionando

2. **Durante el mantenimiento:**
   - Configurar `MAINTENANCE_MODE=true` en production
   - Redeploy production
   - Production: 🔧 Mantenimiento
   - Staging: ✅ App funcionando (para testing)

3. **Después del mantenimiento:**
   - Eliminar `MAINTENANCE_MODE` de production
   - Redeploy production
   - Production: ✅ App funcionando
   - Staging: ✅ App funcionando

---

**Estado:** ⏳ Pendiente de configurar variable en Vercel  
**Última actualización:** 2026-02-28 18:30 UTC+1
