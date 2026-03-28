# Arquitectura General - SmartRoom Rental

**Consolidado desde:** `docs/arquitectura.md`  
**Última actualización:** 2026-03-28  
**Versión:** 1.0

---

## 🎯 Stack Tecnológico

### Frontend
- **Framework:** React 18 + Vite
- **Routing:** react-router-dom v6
- **UI:** Ant Design 6.x + @ant-design/icons (migración desde Tailwind en curso)
- **Estado:** Context API
  - AuthProvider (sesión, perfil, role)
  - TenantProvider (branding, plan)
  - ThemeProvider (CSS variables dinámicas)
- **HTTP:** Supabase Client + invokeWithAuth wrapper

### Backend
- **BaaS:** Supabase
  - **Auth:** Supabase Auth (email/password)
  - **Database:** PostgreSQL 17 con RLS
  - **Storage:** Supabase Storage con buckets
  - **Functions:** Edge Functions (Deno runtime)
- **Pagos:** Stripe (Checkout Sessions + Webhooks) - modo mock en desarrollo
- **Batch/Workflows:** n8n (planificado)

### Deployment
- **Frontend:** Vercel
- **Backend:** Supabase Cloud
- **Repo:** GitHub
  - `main` = producción
  - `staging` = pre-producción
  - `develop` = desarrollo

---

## 🏗️ Arquitectura Multi-Tenant

### Modelo
- **Tipo:** Multi-tenant por columna `client_account_id`
- **Aislamiento:** Row Level Security (RLS) en PostgreSQL
- **Ventaja:** Una sola URL, múltiples tenants
- **Desventaja:** RLS obligatoria en todas las tablas

### Jerarquía de Tenants

```
client_accounts (Tenant SaaS)
  ├── plan_code (starter / pro / enterprise)
  ├── branding (logo, color primario)
  └── entities (Entidades propietarias)
        └── accommodations (Alojamientos)
              └── rooms (Habitaciones)
                    └── lodger_room_assignments
                          └── lodgers (Inquilinos)
```

### RLS (Row Level Security)
- **Obligatoria** en todas las tablas tenant-owned
- **Helper functions:**
  - `get_my_role()` - Retorna rol del usuario autenticado
  - `get_my_client_account_id()` - Retorna tenant del usuario
- **Superadmin:** Bypass RLS via funciones SECURITY DEFINER

---

## 🚪 3 Portales de Login

SmartRoom Rental tiene 3 puntos de entrada diferentes según el tipo de usuario:

| Portal | Ruta | Propósito | Usuarios |
|--------|------|-----------|----------|
| **Comercial** | `/v2/auth/login` | Web pública, CTA, registro | Nuevos clientes |
| **Gestor** | `/v2/manager/auth/login` | Acceso directo a dashboard gestor | Admin/Gestor |
| **Inquilino** | `/v2/lodger/auth/login` | Acceso directo a panel inquilino | Lodgers |

### Flujo de Login Compartido
- **Hook:** `useLoginForm.js` - Lógica compartida entre los 3 portales
- **Componente:** Cada portal tiene su propio componente de login
- **Redirección:** Según rol del usuario tras autenticación

### Post-Login
```
Login → Supabase Auth → JWT → Session
  ↓
AuthProvider (bootstrap session, cargar profile)
  ↓
TenantProvider (whoami → branding, plan)
  ↓
ThemeProvider (CSS variables)
  ↓
Route Guards → Render página o redirect
```

---

## 🔐 Edge Functions (Supabase)

Toda lógica de negocio crítica se ejecuta en Edge Functions (backend-first):

| Función | Propósito | Versión |
|---------|-----------|---------|
| `wizard_submit` | Onboarding completo: crea client_account + entities + admins + Stripe | v1 |
| `wizard_init` | Inicializa sesión de wizard | v1 |
| `whoami` | Devuelve perfil completo + branding + plan | v1 |
| `provision_client_account_superadmin` | Provisión manual por superadmin (sin Stripe) | v1 |
| `stripe_webhook` | Procesa eventos de pago de Stripe | v1 |
| `manage_lodger` | CRUD inquilinos + invitación por email | v5 |

### Patrón Edge-First
```javascript
// ❌ INCORRECTO: Escritura directa desde frontend
await supabase.from("accommodations").insert(payload);

// ✅ CORRECTO: Escritura por Edge Function
await invokeWithAuth("manage_accommodation", { 
  action: "create", 
  payload 
});
```

**Regla:** 
- **Escrituras:** Siempre por Edge Functions
- **Lecturas:** Directas con RLS (ANON key)

---

## 📊 Tablas Principales (PostgreSQL)

### Core / Tenancy

| Tabla | Descripción |
|-------|-------------|
| `auth.users` | Gestionada por Supabase Auth |
| `profiles` | Perfil extendido: role, client_account_id, onboarding_status, is_primary_admin |
| `client_accounts` | Tenant SaaS: name, slug, plan_code, billing_cycle, status, branding |
| `entities` | Entidades payer/owner por cuenta (type: payer / owner) |
| `plans_catalog` | Catálogo de planes con precios, límites y features |

### Operación

| Tabla | Descripción |
|-------|-------------|
| `accommodations` | Alojamientos — FK: client_account_id, owner_entity_id (NOT NULL) |
| `rooms` | Habitaciones — FK: accommodation_id; status: free/occupied/pending_checkout/maintenance |
| `lodgers` | Inquilinos — FK: client_account_id; status: invited/active/pending_checkout/inactive |
| `lodger_room_assignments` | Historial completo de ocupación — nunca se borra, se cierra con move_out_date |

### Servicios

| Tabla | Descripción |
|-------|-------------|
| `services_catalog` | Catálogo de servicios definidos por entidad propietaria |
| `accommodation_services` | Servicios activos en cada alojamiento (precio personalizable) |
| `lodger_services` | Contratación/consumo de servicios por inquilino |

### Energía y Boletines

| Tabla | Descripción |
|-------|-------------|
| `energy_bills` | Facturas de consumo por alojamiento (luz, agua, gas) + path a Storage |
| `energy_readings` | Lecturas diarias de consumo por habitación (medidas online) |
| `energy_settlements` | Liquidación de una factura entre habitaciones (fijo + variable) |
| `bulletins` | Boletín energético por habitación/inquilino — status: draft/published/acknowledged |
| `consumptions` | Consumos reales por inquilino (agua, electricidad, gas) - NUEVA |

---

## 🔄 Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario ingresa email/password en uno de los 3 portales │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Supabase Auth valida credenciales → JWT                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AuthProvider bootstrap:                                  │
│    - Carga session                                           │
│    - Carga profile desde BD                                 │
│    - Detecta role (superadmin/admin/lodger)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. TenantProvider (solo si role != superadmin):             │
│    - Llama Edge Function whoami                             │
│    - Obtiene branding (logo, color)                         │
│    - Obtiene plan y límites                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ThemeProvider:                                            │
│    - Aplica CSS variables dinámicas                         │
│    - Configura Ant Design theme                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Route Guards validan:                                    │
│    - RequireAuth: sesión válida                             │
│    - RequireRole: rol adecuado                              │
│    - RequireTenant: tenant activo                           │
│    - RequireOnboarding: onboarding completado               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Render página correspondiente o redirect                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Flujo de Onboarding (Self-Signup)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Registro → Confirmar email → AuthCallback                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Redirige a /v2/planes → Seleccionar plan                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. /v2/wizard/contratar → Wizard (6 pasos):                 │
│    - Contrato                                                │
│    - Branding (logo, color)                                 │
│    - Entidad Pagadora                                       │
│    - Admins adicionales                                     │
│    - Pago (Stripe Checkout)                                 │
│    - Verificación                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. wizard_submit Edge Function:                             │
│    - Crea client_account                                    │
│    - Crea entities (payer)                                  │
│    - Actualiza profile con role=admin                       │
│    - Mock mode: activa cuenta directamente                  │
│    - Prod mode: Stripe Checkout → webhook → activa          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. refreshProfile() → Dashboard gestor                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Theming Dinámico por Tenant

### CSS Variables
```css
:root {
  --sr-primary: #1890ff;      /* Color primario del tenant */
  --sr-secondary: #52c41a;    /* Color secundario */
  --sr-text: #000000;         /* Color de texto */
}
```

### Flujo
1. TenantProvider carga branding via `whoami`
2. ThemeProvider aplica CSS variables
3. Ant Design ConfigProvider usa variables para componentes

### Personalización
- Logo del tenant en header
- Color primario en botones, links
- Favicon personalizado (futuro)

---

## 📁 Estructura de Carpetas (src/)

```
src/
├── App.jsx                          # Router principal (todas las rutas)
├── main.jsx                         # Root con providers
├── components/
│   ├── auth/                        # SessionResolver, StorageImage
│   ├── public/                      # PublicHeader, PublicFooter
│   └── wizards/                     # ClientAccountWizard + steps/
├── constants/roles.js               # MANAGER_ROLES, LODGER_ROLES, getPortalHomeForRole
├── hooks/useLoginForm.js            # Login compartido para 3 portales
├── layouts/                         # AppLayout, SuperadminLayout, V2Layout
├── pages/
│   ├── public/                      # Landing, PlanesPage, Registro, Legal
│   ├── v2/auth/                     # CommercialLogin, ManagerLogin, LodgerLogin, AuthCallback
│   ├── v2/superadmin/               # Dashboard, ClientAccounts, Plans, Services
│   ├── v2/manager/ + v2/admin/      # Dashboard, Alojamientos, Inquilinos
│   ├── v2/lodger/                   # LodgerDashboard
│   └── v2/autoregistro/             # AutoRegistroCuenta (wizard self-signup)
├── providers/
│   ├── AuthProvider.jsx             # Sesión, perfil, refreshProfile(), logout()
│   ├── TenantProvider.jsx           # Datos tenant via whoami, branding
│   └── ThemeProvider.jsx            # CSS variables dinámicas
├── router/
│   ├── RequireAuth.jsx              # Guard: requiere sesión
│   ├── RequireRole.jsx              # Guard: requiere rol específico
│   ├── RequireTenant.jsx            # Guard: requiere tenant activo
│   └── RequireOnboarding.jsx        # Guard: onboarding completado
└── services/
    ├── supabaseClient.js            # createClient con env vars
    ├── supabaseInvoke.services.js   # invokeWithAuth con retries + circuit breaker
    ├── auth.service.js              # signIn, signUp, signOut, resetPassword
    └── clientAccounts.service.js    # callWizardSubmit, callWhoami, callWizardInit
```

**Ver:** `frontend.md` para detalles de componentes.

---

## 🔑 Patrones Importantes

### refreshProfile()
Llamar tras cualquier operación que modifique el perfil en BD:
```javascript
await invokeWithAuth("wizard_submit", payload);
await refreshProfile(); // Actualiza estado en frontend
```

### invokeWithAuth()
Wrapper con retries, refresh de JWT, circuit breaker para Edge Functions:
```javascript
const { data, error } = await invokeWithAuth("manage_lodger", {
  action: "create",
  payload: lodgerData
});
```

### SessionResolver
Componente post-login que espera profile y resuelve destino según rol.

### emailRedirectTo
Siempre usar `${window.location.origin}/v2/auth/callback` en signUp/resetPassword.

---

## 🎯 Decisiones de Arquitectura

### 1. Una sola URL + roles (no subdominios)
**Decisión:** Multi-tenant por columna `client_account_id`  
**Razón:** Simplicidad, escalabilidad, una sola aplicación  
**Trade-off:** RLS obligatoria en todas las tablas

### 2. Edge Functions para lógica sensible
**Decisión:** Escrituras siempre por Edge Functions  
**Razón:** Seguridad, validación centralizada, límites de plan  
**Trade-off:** Latencia adicional vs seguridad

### 3. Theming dinámico por tenant
**Decisión:** CSS variables + Ant Design ConfigProvider  
**Razón:** Personalización sin recompilación  
**Trade-off:** Limitaciones vs CSS estático

### 4. Stripe en modo mock durante desarrollo
**Decisión:** Mock payments hasta tener claves reales  
**Razón:** Desarrollo sin costos  
**Trade-off:** Diferencias con producción

### 5. n8n para procesos batch
**Decisión:** Usar n8n para facturación, liquidación, cierres  
**Razón:** Separar batch de tiempo real  
**Trade-off:** Dependencia adicional (planificado)

**Ver:** `adr/` para ADRs completos.

---

## 🔗 Referencias

- **Frontend:** `frontend.md`
- **Backend:** `backend.md`
- **Modelo de Datos:** `data-model.md`
- **Seguridad:** `security.md`
- **Storage:** `storage.md`
- **ADRs:** `adr/`

---

**Consolidado desde:** `docs/arquitectura.md`  
**Última actualización:** 2026-03-28
