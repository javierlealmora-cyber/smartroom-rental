# Arquitectura Tecnica — SmartRent Systems

## Stack

- **Frontend**: React 18 + Vite + react-router-dom
- **Backend**: Supabase (Auth + Postgres + Edge Functions + Storage)
- **Pagos**: Stripe (Checkout Sessions + Webhooks) — actualmente en modo mock
- **Batch/Workflows**: n8n (planificado)
- **Estilos**: Inline styles (componentes nuevos) + Tailwind (legacy) + CSS variables para theming
- **Despliegue**: Vercel (pendiente configurar)
- **Repo**: GitHub

## Arquitectura multi-tenant

- Modelo por columna `client_account_id` en `profiles` (no subdominios)
- RLS obligatoria en Postgres para aislamiento de datos
- Superadmin tiene acceso sin restricciones (bypass RLS via helper functions SECURITY DEFINER)

## Estructura de carpetas (src/)

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
│   ├── AuthProvider.jsx             # Sesion, perfil, refreshProfile(), logout()
│   ├── TenantProvider.jsx           # Datos tenant via whoami, branding
│   └── ThemeProvider.jsx            # CSS variables dinamicas
├── router/
│   ├── RequireAuth.jsx              # Guard: requiere sesion
│   ├── RequireRole.jsx              # Guard: requiere rol especifico
│   ├── RequireTenant.jsx            # Guard: requiere tenant activo
│   └── RequireOnboarding.jsx        # Guard: onboarding completado
└── services/
    ├── supabaseClient.js            # createClient con env vars
    ├── supabaseInvoke.services.js   # invokeWithAuth con retries + circuit breaker
    ├── auth.service.js              # signIn, signUp, signOut, resetPassword
    └── clientAccounts.service.js    # callWizardSubmit, callWhoami, callWizardInit
```

## 3 Portales de login

| Portal | Ruta | Proposito |
|---|---|---|
| Comercial | /v2/auth/login | Web publica, CTA post-login, registro |
| Gestor | /v2/manager/auth/login | Acceso directo a dashboard gestor |
| Inquilino | /v2/lodger/auth/login | Acceso directo a panel inquilino |

## Edge Functions (Supabase)

| Funcion | Proposito |
|---|---|
| `wizard_submit` | Onboarding completo: crea client_account + entities + admins + Stripe |
| `wizard_init` | Inicializa sesion de wizard |
| `whoami` | Devuelve perfil completo + branding + plan |
| `provision_client_account_superadmin` | Provision manual por superadmin (sin Stripe) |
| `stripe_webhook` | Procesa eventos de pago de Stripe |

## Tablas principales (Postgres)

| Tabla | Descripcion |
|---|---|
| `auth.users` | Gestionada por Supabase Auth |
| `profiles` | Perfil extendido: role, client_account_id, onboarding_status, is_primary_admin |
| `client_accounts` | Tenant SaaS: name, slug, plan_code, billing_cycle, status, branding |
| `entities` | Entidades payer/owner por cuenta |
| `plans_catalog` | Catalogo de planes con precios, limites y features |

## Flujo de autenticacion

```
Login → Supabase Auth → JWT → Session
  ↓
AuthProvider (bootstrap session, cargar profile)
  ↓
TenantProvider (whoami → branding, plan)
  ↓
ThemeProvider (CSS variables)
  ↓
Route Guards → Render pagina o redirect
```

## Flujo de onboarding (self-signup)

```
Registro → Confirmar email → AuthCallback → /v2/planes
  ↓
Seleccionar plan → /v2/wizard/contratar
  ↓
Wizard (6 pasos) → wizard_submit Edge Function
  ↓
Mock mode: activa cuenta directamente
Prod mode: Stripe Checkout → webhook → activa
  ↓
refreshProfile() → Dashboard gestor
```

## Patrones importantes

- **refreshProfile()**: Llamar tras cualquier operacion que modifique el perfil en DB (wizard_submit, etc.)
- **invokeWithAuth()**: Wrapper con retries, refresh de JWT, circuit breaker para Edge Functions
- **SessionResolver**: Componente post-login que espera profile y resuelve destino
- **emailRedirectTo**: Siempre usar `${window.location.origin}/v2/auth/callback` en signUp/resetPassword

## Decisiones de arquitectura

1. Una sola URL + roles (no subdominios)
2. Multi-tenant por client_account_id con RLS
3. Edge Functions para logica sensible (provision, pagos)
4. n8n para procesos batch (facturacion, liquidacion)
5. Theming dinamico por tenant via CSS variables
6. Stripe en modo mock durante desarrollo
