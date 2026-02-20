# Arquitectura Tecnica — SmartRent Systems

> Ver `docs/reglas-proyecto.md` para normas de arquitectura, seguridad y calidad de obligado cumplimiento.

## Stack

- **Frontend**: React 18 + Vite + react-router-dom
- **UI**: Ant Design 6.x + @ant-design/icons (migración desde Tailwind/inline styles en curso)
- **Backend**: Supabase (Auth + Postgres + Edge Functions + Storage)
- **Pagos**: Stripe (Checkout Sessions + Webhooks) — actualmente en modo mock
- **Batch/Workflows**: n8n (planificado)
- **Despliegue**: Vercel (pendiente configurar)
- **Repo**: GitHub (`main` = producción, `develop` = integración planificado)

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

### Core / Tenancy
| Tabla | Descripcion |
|---|---|
| `auth.users` | Gestionada por Supabase Auth |
| `profiles` | Perfil extendido: role, client_account_id, onboarding_status, is_primary_admin |
| `client_accounts` | Tenant SaaS: name, slug, plan_code, billing_cycle, status, branding |
| `entities` | Entidades payer/owner por cuenta (type: payer / owner) |
| `plans_catalog` | Catalogo de planes con precios, limites y features |

### Operacion
| Tabla | Descripcion |
|---|---|
| `accommodations` | Alojamientos — FK: client_account_id, owner_entity_id (NOT NULL) |
| `rooms` | Habitaciones — FK: accommodation_id; status: free/occupied/pending_checkout/maintenance |
| `lodgers` | Inquilinos — FK: client_account_id; status: invited/active/pending_checkout/inactive |
| `lodger_room_assignments` | Historial completo de ocupacion — nunca se borra, se cierra con move_out_date |

### Servicios
| Tabla | Descripcion |
|---|---|
| `services_catalog` | Catalogo de servicios definidos por entidad propietaria |
| `accommodation_services` | Servicios activos en cada alojamiento (precio personalizable) |
| `lodger_services` | Contratacion/consumo de servicios por inquilino |

### Energia y Boletines
| Tabla | Descripcion |
|---|---|
| `energy_bills` | Facturas de consumo por alojamiento (luz, agua, gas) + path a Storage |
| `energy_readings` | Lecturas diarias de consumo por habitacion (medidas online) |
| `energy_settlements` | Liquidacion de una factura entre habitaciones (fijo + variable) |
| `bulletins` | Boletin energetico por habitacion/inquilino — status: draft/published/acknowledged |

### Jerarquia de datos completa

```
client_accounts
  ├── entities (type=payer)          ← Entidad pagadora de la cuenta
  └── entities (type=owner)          ← Entidades propietarias
        └── accommodations            ← owner_entity_id NOT NULL
              ├── energy_bills        ← Facturas del alojamiento
              │     ├── energy_readings (por room)
              │     ├── energy_settlements (por room + lodger)
              │     └── bulletins (por room + lodger)
              ├── accommodation_services ← Servicios activos
              └── rooms
                    └── lodger_room_assignments
                          └── lodgers (client_account_id)
                                └── lodger_services
```

> Ver `docs/estructura-sistema.md` para campos completos, limites por plan y reglas de negocio.

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
