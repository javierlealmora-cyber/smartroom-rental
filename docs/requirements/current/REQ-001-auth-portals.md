# REQ-001: Autenticación y Portales de Usuario

**Estado:** ✅ Implementado y Consolidado  
**Última actualización:** 2026-03-28  
**Versión:** 1.0

---

## Objetivo

Proporcionar un sistema de autenticación seguro y portales diferenciados según el rol del usuario (SuperAdmin, Admin/Gestor, Inquilino) con acceso controlado a funcionalidades específicas.

---

## Alcance

### Incluye
- Sistema de login con email/password
- Registro de nuevos usuarios
- Recuperación de contraseña
- Gestión de sesiones
- Portales diferenciados por rol
- Protección de rutas según permisos
- Gestión de perfiles de usuario
- Storage para avatares

### No Incluye
- Autenticación OAuth (Google, Facebook, etc.)
- Autenticación de dos factores (2FA)
- Single Sign-On (SSO)
- Biometría

---

## Reglas Actuales

### Roles del Sistema

#### 1. SuperAdmin
- **Descripción:** Administrador de la plataforma SaaS
- **Acceso:** Total a todos los módulos y tenants
- **Funciones:**
  - Crear y gestionar cuentas de cliente (tenants)
  - Gestionar planes de suscripción
  - Acceder a cualquier tenant para soporte
  - Ver métricas globales de la plataforma

#### 2. Admin/Gestor
- **Descripción:** Operador del negocio dentro de un tenant
- **Acceso:** Módulos de gestión de su tenant
- **Funciones:**
  - Gestionar alojamientos y habitaciones
  - Gestionar inquilinos
  - Gestionar consumos y facturación
  - Ver reportes de su tenant

#### 3. Inquilino (Lodger)
- **Descripción:** Persona alojada en una habitación
- **Acceso:** Panel personal limitado
- **Funciones:**
  - Ver su consumo energético
  - Ver servicios disponibles
  - Responder encuestas
  - Ver boletines
  - Crear tickets de incidencias

### Flujo de Autenticación

#### Login
1. Usuario ingresa email y password
2. Sistema valida credenciales con Supabase Auth
3. Sistema obtiene perfil del usuario (role, client_account_id)
4. Sistema redirige según rol:
   - SuperAdmin → `/superadmin/dashboard`
   - Admin/Gestor → `/dashboard`
   - Inquilino → `/lodger/dashboard`

#### Registro
1. Usuario accede a página de registro
2. Completa formulario (email, password, nombre)
3. Sistema crea usuario en Supabase Auth
4. Sistema crea perfil en tabla `profiles`
5. Sistema envía email de confirmación
6. Usuario confirma email y puede hacer login

#### Recuperación de Contraseña
1. Usuario solicita recuperación
2. Sistema envía email con link de reset
3. Usuario accede a link y establece nueva contraseña
4. Sistema actualiza contraseña en Supabase Auth

### Protección de Rutas

#### Rutas Públicas
- `/` - Landing page
- `/login` - Login
- `/register` - Registro
- `/forgot-password` - Recuperación

#### Rutas Protegidas (Authenticated)
- `/dashboard` - Dashboard principal (Admin/Gestor)
- `/lodger/dashboard` - Dashboard inquilino
- `/superadmin/dashboard` - Dashboard SuperAdmin

#### Validación
- Middleware verifica sesión activa
- Middleware verifica rol apropiado para la ruta
- Redirección automática si no autorizado

---

## Casos Válidos

### CV-001: Login Exitoso
**Precondiciones:**
- Usuario registrado y confirmado
- Credenciales correctas

**Flujo:**
1. Usuario ingresa email y password
2. Click en "Iniciar Sesión"
3. Sistema valida credenciales
4. Sistema redirige a dashboard apropiado

**Resultado esperado:** Usuario autenticado y en su dashboard

---

### CV-002: Registro Exitoso
**Precondiciones:**
- Email no registrado previamente
- Password cumple requisitos mínimos

**Flujo:**
1. Usuario completa formulario de registro
2. Click en "Registrarse"
3. Sistema crea cuenta
4. Sistema envía email de confirmación

**Resultado esperado:** Usuario creado, email enviado

---

### CV-003: Recuperación de Contraseña
**Precondiciones:**
- Email registrado en el sistema

**Flujo:**
1. Usuario solicita recuperación
2. Sistema envía email con link
3. Usuario accede a link
4. Usuario establece nueva contraseña

**Resultado esperado:** Contraseña actualizada

---

### CV-004: Acceso Según Rol
**Precondiciones:**
- Usuario autenticado

**Flujo:**
1. Sistema verifica rol del usuario
2. Sistema muestra menú apropiado
3. Usuario solo ve opciones permitidas

**Resultado esperado:** UI adaptada al rol

---

## Casos Inválidos

### CI-001: Login con Credenciales Incorrectas
**Flujo:**
1. Usuario ingresa email/password incorrectos
2. Click en "Iniciar Sesión"

**Resultado esperado:** Error "Credenciales inválidas"

---

### CI-002: Registro con Email Duplicado
**Flujo:**
1. Usuario intenta registrarse con email ya existente
2. Click en "Registrarse"

**Resultado esperado:** Error "Email ya registrado"

---

### CI-003: Acceso a Ruta No Autorizada
**Flujo:**
1. Inquilino intenta acceder a `/dashboard` (admin)
2. Sistema detecta rol inadecuado

**Resultado esperado:** Redirección a `/lodger/dashboard`

---

### CI-004: Sesión Expirada
**Flujo:**
1. Usuario autenticado, sesión expira
2. Usuario intenta acción

**Resultado esperado:** Redirección a `/login`

---

## Impacto Frontend

### Componentes Principales
- `src/pages/Login.jsx` - Página de login
- `src/pages/Register.jsx` - Página de registro
- `src/pages/ForgotPassword.jsx` - Recuperación de contraseña
- `src/contexts/AuthContext.jsx` - Context de autenticación
- `src/components/ProtectedRoute.jsx` - Protección de rutas
- `src/hooks/useAuth.js` - Hook de autenticación

### Páginas por Rol
- **Admin/Gestor:** `src/pages/Dashboard.jsx`
- **Inquilino:** `src/pages/lodger/LodgerDashboard.jsx`
- **SuperAdmin:** `src/pages/superadmin/SuperAdminDashboard.jsx`

### Estado Global
```javascript
AuthContext:
  - user: { id, email, role, client_account_id }
  - session: { access_token, refresh_token }
  - loading: boolean
  - signIn(email, password)
  - signUp(email, password, userData)
  - signOut()
  - resetPassword(email)
```

---

## Impacto Base de Datos

### Tablas Involucradas

#### profiles
```sql
- id (UUID, FK a auth.users)
- email (TEXT)
- full_name (TEXT)
- role (TEXT: 'superadmin', 'admin', 'agent', 'lodger')
- client_account_id (UUID, FK a client_accounts)
- avatar_url (TEXT)
- onboarding_status (TEXT)
- created_at, updated_at
```

#### auth.users (Supabase Auth)
- Gestionada por Supabase
- Almacena credenciales
- Gestiona tokens y sesiones

### Políticas RLS

#### profiles
```sql
-- Lectura: usuarios pueden ver su propio perfil
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Lectura: admin puede ver perfiles de su tenant
CREATE POLICY "profiles_select_by_tenant"
ON profiles FOR SELECT
USING (client_account_id = get_my_client_account_id());
```

### Storage Buckets

#### avatars
- **Propósito:** Almacenar fotos de perfil
- **Acceso:** Público para lectura, autenticado para escritura
- **Tamaño máximo:** 2MB
- **Formatos:** jpg, png, webp

---

## Tests Asociados

### Tests E2E
- ✅ `tests/e2e/login.spec.js` - Login flow completo
- ✅ `tests/e2e/register.spec.js` - Registro de usuario
- 🟡 `tests/e2e/password-reset.spec.js` - Recuperación (parcial)
- 🟡 `tests/e2e/role-based-access.spec.js` - Acceso por rol (parcial)

### Tests Unitarios
- 🟡 `src/pages/__tests__/Login.test.jsx` - Componente Login
- ❌ `src/contexts/__tests__/AuthContext.test.jsx` - Context (falta)
- ❌ `src/hooks/__tests__/useAuth.test.js` - Hook (falta)

### Cobertura
- **E2E:** 80% (bueno)
- **Unitarios:** 40% (mejorable)

---

## Issues Relacionados

- Pendiente crear issues en GitHub para:
  - Implementar OAuth (futuro)
  - Implementar 2FA (futuro)
  - Mejorar tests unitarios

---

## Observaciones

### Fortalezas
- Sistema de autenticación robusto con Supabase
- Separación clara de roles
- RLS implementado correctamente
- Flujos de usuario bien definidos

### Limitaciones Conocidas
- No soporta OAuth actualmente
- No tiene 2FA
- Recuperación de contraseña requiere email funcional
- Sesiones no tienen timeout configurable

### Mejoras Futuras
- Implementar OAuth (Google, Microsoft)
- Añadir 2FA opcional
- Mejorar UX de recuperación de contraseña
- Añadir logs de auditoría de login
- Implementar rate limiting en login

### Dependencias
- Supabase Auth
- Supabase Storage (avatars)
- Email service (para confirmación y reset)

---

## Referencias

- **Código:** `src/contexts/AuthContext.jsx`, `src/pages/Login.jsx`
- **Migraciones:** `00000000000001_baseline_schema.sql` (profiles)
- **Tests:** `tests/e2e/login.spec.js`
- **Documentación técnica:** `docs/testing-login.md`

---

**Consolidado desde:**
- Baseline inicial del sistema
- Requisitos funcionales originales
- Implementación actual en producción
