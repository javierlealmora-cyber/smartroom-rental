# 🔧 Modo Mantenimiento - Guía Completa

## 🎯 3 Opciones para Activar Modo Mantenimiento

---

## ✅ OPCIÓN 1: Pausar Proyecto en Vercel (MÁS RÁPIDO)

### Activar Mantenimiento
1. Ve a **Vercel Dashboard** → Tu proyecto
2. **Settings** → **General**
3. Scroll hasta **"Pause Deployments"**
4. Click en **"Pause Project"**

✅ **Ventajas:**
- Instantáneo (1 click)
- Vercel muestra página de mantenimiento automática
- Fácil de revertir

❌ **Desventajas:**
- Página genérica de Vercel (no personalizada)

### Desactivar Mantenimiento
1. Vercel Dashboard → Settings → General
2. Click en **"Resume Project"**

---

## ✅ OPCIÓN 2: Variable de Entorno (RECOMENDADO)

### Paso 1: Crear Componente de Mantenimiento

Ya creé el archivo `public/maintenance.html` con diseño profesional.

### Paso 2: Añadir Variable en Vercel

1. **Vercel Dashboard** → Settings → **Environment Variables**
2. Añadir nueva variable:
   - **Name:** `VITE_MAINTENANCE_MODE`
   - **Value:** `true`
   - **Environment:** Production
3. Click **Save**

### Paso 3: Redeploy

```bash
# Trigger redeploy
git commit --allow-empty -m "chore: trigger redeploy for maintenance mode"
git push origin master
```

O en Vercel Dashboard → Deployments → **Redeploy**

### Paso 4: Modificar App.jsx (NECESARIO)

Necesitas añadir esto al inicio de tu `App.jsx`:

```jsx
// Al inicio del componente App
function App() {
  // Modo mantenimiento
  if (import.meta.env.VITE_MAINTENANCE_MODE === 'true') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '60px 40px',
          borderRadius: '20px',
          maxWidth: '600px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>🔧</div>
          <h1 style={{ color: '#333', fontSize: '32px', marginBottom: '20px' }}>
            Estamos en Mantenimiento
          </h1>
          <p style={{ color: '#666', fontSize: '18px', lineHeight: '1.6' }}>
            Estamos trabajando para mejorar tu experiencia. 
            La plataforma estará disponible nuevamente en breve.
          </p>
        </div>
      </div>
    );
  }

  // ... resto del código normal
}
```

### Desactivar Mantenimiento

1. Vercel Dashboard → Environment Variables
2. Cambiar `VITE_MAINTENANCE_MODE` a `false` o eliminar la variable
3. Redeploy

---

## ✅ OPCIÓN 3: Redirect en vercel.json (SIMPLE)

### Activar Mantenimiento

Edita `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "destination": "/maintenance.html",
      "permanent": false
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Commit y push:

```bash
git add vercel.json
git commit -m "chore: enable maintenance mode"
git push origin master
```

### Desactivar Mantenimiento

Elimina el `redirects` de `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Commit y push:

```bash
git add vercel.json
git commit -m "chore: disable maintenance mode"
git push origin master
```

---

## 📊 Comparación de Opciones

| Opción | Velocidad | Personalización | Reversión | Recomendado |
|--------|-----------|-----------------|-----------|-------------|
| **1. Pausar en Vercel** | ⚡ Instantáneo | ❌ No | ⚡ Instantáneo | Para emergencias |
| **2. Variable de Entorno** | 🔄 ~2 min | ✅ Sí | 🔄 ~2 min | **Para mantenimiento planificado** |
| **3. Redirect vercel.json** | 🔄 ~2 min | ✅ Sí | 🔄 ~2 min | Alternativa simple |

---

## 🎯 Recomendación para Tu Caso

**Usa OPCIÓN 1 (Pausar en Vercel) AHORA:**

1. Ve a Vercel Dashboard
2. Settings → General → Pause Project
3. Listo en 10 segundos

**Cuando quieras reactivar:**
1. Settings → General → Resume Project

---

## ⚠️ IMPORTANTE

- **Staging NO se pausa** - Solo afecta a producción
- **Los datos NO se pierden** - Solo se oculta la interfaz
- **Supabase sigue activo** - Solo el frontend está en mantenimiento

---

## 🔍 Verificación

Después de activar mantenimiento:
1. Abre `https://smartroomrentalplatform.com`
2. Deberías ver la página de mantenimiento
3. Staging sigue funcionando en su URL de Vercel

---

## 📝 Checklist

- [ ] Decidir qué opción usar
- [ ] Activar modo mantenimiento
- [ ] Verificar que funciona
- [ ] Avisar a usuarios (email, redes sociales)
- [ ] Completar mejoras/configuración
- [ ] Desactivar modo mantenimiento
- [ ] Verificar que todo funciona
- [ ] Avisar que está disponible

---

**¿Cuál opción prefieres? Te recomiendo la OPCIÓN 1 para hacerlo YA.**
