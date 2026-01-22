# 🧪 Testing Manual - Login y Autenticación

**Fecha:** 2026-01-22
**Estado:** Listo para probar

---

## ✅ Implementación Completada

### Componentes implementados:

1. **[src/services/auth.service.js](../src/services/auth.service.js)** ✅
   - signIn(), signOut(), signUp()
   - getSession(), getUser(), getProfile()
   - updateProfile(), updatePassword()
   - resetPasswordRequest()
   - hasRole(), hasAnyRole(), belongsToCompany()

2. **[src/providers/AuthProvider.jsx](../src/providers/AuthProvider.jsx)** ✅
   - Session management
   - Profile loading automático
   - Sincronización entre tabs
   - Hook `useAuth()` para componentes

3. **[src/pages/auth/Login.jsx](../src/pages/auth/Login.jsx)** ✅
   - UI personalizada con imagen de fondo
   - Formulario de login funcional
   - Manejo de errores
   - Redirección automática por rol

4. **[src/router/RequireAuth.jsx](../src/router/RequireAuth.jsx)** ✅
   - Protección de rutas autenticadas

5. **[src/router/RequireRole.jsx](../src/router/RequireRole.jsx)** ✅
   - Protección de rutas por rol

6. **[src/App.jsx](../src/App.jsx)** ✅
   - AuthProvider integrado
   - Rutas configuradas correctamente

---

## 👥 Usuarios Disponibles para Testing

Ejecuta este comando para ver usuarios actuales:
```bash
node scripts/list-users.js
```

### Usuarios existentes:

**Superadmin:**
- Email: `javierlealmora@housingspacesolutions.com`
- Role: `superadmin`
- Password: (la que configuraste al crear este usuario)

**Admin:**
- Email: `evamariagozalodiaz@gmail.com`
- Role: `admin`
- Company ID: `54dcd6e1-7fc3-4ec5-a73b-ec366766b504`
- Password: (la que configuraste al crear este usuario)

---

## 🚀 Cómo Probar el Login

### 1. Iniciar el servidor de desarrollo

```bash
npm run dev
```

### 2. Abrir en el navegador

```
http://localhost:5173
```

### 3. Probar Login como Superadmin

1. Ve a: `http://localhost:5173/auth/login`
2. Ingresa:
   - Email: `javierlealmora@housingspacesolutions.com`
   - Password: (tu contraseña)
3. Click en "Log In"

**Resultado esperado:**
- ✅ Redirección a `/superadmin/companies`
- ✅ Ver listado de empresas
- ✅ Navbar con rol "superadmin"

### 4. Probar Login como Admin

1. Logout (si estás logueado)
2. Ve a: `http://localhost:5173/auth/login`
3. Ingresa:
   - Email: `evamariagozalodiaz@gmail.com`
   - Password: (tu contraseña)
4. Click en "Log In"

**Resultado esperado:**
- ✅ Redirección a `/admin`
- ✅ Ver pantalla de admin
- ✅ Navbar con rol "admin"

---

## 🧪 Escenarios de Testing

### ✅ Test 1: Login exitoso
- [ ] Login con credenciales correctas
- [ ] Redirección correcta según rol
- [ ] Session guardada (refresh no hace logout)
- [ ] Profile cargado correctamente

### ✅ Test 2: Login fallido
- [ ] Error con email incorrecto
- [ ] Error con password incorrecto
- [ ] Mensaje de error visible en pantalla

### ✅ Test 3: Protección de rutas
- [ ] Acceder a `/superadmin/companies` sin login → redirect a `/auth/login`
- [ ] Acceder a ruta de admin siendo superadmin → acceso permitido/denegado según configuración

### ✅ Test 4: Logout
- [ ] Click en botón de logout (si existe en navbar)
- [ ] Session eliminada
- [ ] Redirección a `/auth/login`

### ✅ Test 5: Refresh de página
- [ ] Login exitoso
- [ ] Refresh (F5)
- [ ] Session mantenida
- [ ] No hay logout automático

### ✅ Test 6: Roles y permisos
- [ ] Superadmin puede acceder a `/superadmin/companies`
- [ ] Admin NO puede acceder a `/superadmin/companies`
- [ ] Cada rol solo ve sus rutas permitidas

---

## 🐛 Problemas Comunes

### Error: "Invalid login credentials"
- ✅ Verifica que el email existe en auth.users
- ✅ Verifica que la contraseña es correcta
- ✅ Verifica que el email está confirmado

### Error: "User has no profile"
- ✅ Verifica que existe un registro en la tabla `profiles` con el mismo `id`
- ✅ Verifica que el profile tiene un `role` asignado

### Redirect infinito
- ✅ Verifica que AuthProvider está en App.jsx
- ✅ Verifica que no hay loops en RequireAuth/RequireRole

### Session no persiste
- ✅ Verifica que Supabase está configurado correctamente
- ✅ Limpia localStorage y cookies, intenta de nuevo

---

## 🔧 Comandos Útiles

```bash
# Ver usuarios en la base de datos
node scripts/list-users.js

# Ver estado de RLS
node scripts/verify-rls-status.js

# Ver esquema de base de datos
node scripts/detailed-schema.js

# Iniciar dev server
npm run dev

# Limpiar cache (si hay problemas)
rm -rf node_modules/.vite
npm run dev
```

---

## 📝 Notas para Desarrollo

### Estructura de Auth Flow:

```
Usuario visita app
    ↓
App.jsx → AuthProvider wrapper
    ↓
AuthProvider verifica session (Supabase)
    ↓
Si hay session → carga profile desde DB
    ↓
Routes con RequireAuth protegen rutas
    ↓
RequireRole filtra por rol
    ↓
Usuario accede a su dashboard
```

### Estados de Auth:

- `loading: true` → Cargando session inicial
- `loading: false, user: null` → No autenticado
- `loading: false, user: {...}, profile: null` → Autenticado pero sin profile
- `loading: false, user: {...}, profile: {...}` → Autenticado y con profile ✅

---

## ✨ Próximas Mejoras

- [ ] Recordar contraseña (forgot password flow)
- [ ] Confirmación de email
- [ ] 2FA (Two-Factor Authentication)
- [ ] Logout desde todas las sesiones
- [ ] Logs de actividad de usuario
- [ ] Tests unitarios con Vitest

---

**Generado automáticamente por:** Claude Sonnet 4.5
**Última actualización:** 2026-01-22
