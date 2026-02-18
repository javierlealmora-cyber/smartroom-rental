# SmartRent Systems — Cuenta de Cliente: Implementacion End-to-End
Version: v1.0
Fecha: 2026-02-11

## Contexto

Implementar el modulo completo "Cuenta de Cliente + Plan + Entidad (Pagadora/Propietaria) + Pago (Stripe)" para SmartRent Systems. El flujo es: **Auth primero** (registro/login en Supabase Auth) → **Wizard despues** (crear cuenta, entidades, admins) → **Stripe** (pago obligatorio en autoregistro, opcional en superadmin).

**No tocar** la gestion legacy de empresas (tablas `companies`, `profiles.company_id`, Edge Functions `provision_company`, `update_company`, `delete_company`).

---

## Decisiones Arquitectonicas (confirmadas)

| Decision | Enfoque |
|---|---|
| Tabla entidades | **Tabla unica `entities`** con `type=payer\|owner` + vistas SQL (`payer_entities_view`, `owner_entities_view`) |
| Stripe | Implementar con **placeholders** (sin claves reales). Claves PRO en Supabase Secrets |
| Ruta wizard | **Ambas**: nueva `/autoregistro-cuenta` (auth-first) + mantener `/registro` legacy |
| Schema plans | **Completo** del mock (incluir services jsonb, allows_receipt_upload, etc.) |

---

## Estado actual del codebase

**Backend existente:**
- Tablas: `companies`, `profiles` (legacy)
- Edge Functions: `provision_company`, `update_company` (legacy)
- RLS: helpers `get_my_role()`, `get_my_company_id()` (legacy)
- Auth: signIn/signUp/signOut en `auth.service.js`
- `invokeWithAuth` con retry/circuit breaker en `supabaseInvoke.services.js`

**Frontend existente:**
- Wizard 5 pasos (`ClientAccountWizard.jsx`) — self_signup + superadmin_create
- AuthProvider con session/profile/role/companyId
- ThemeProvider con branding dinamico por company_id (legacy)
- V2Layout con breadcrumbs
- Route guards: RequireAuth + RequireRole
- Mock data completo (1418 lineas en `clientAccountsData.js`)
- `@supabase/supabase-js` **NO esta en package.json** (requiere instalacion)

**Archivos clave existentes a reutilizar:**
- `src/services/supabaseClient.js` — cliente Supabase inicializado
- `src/services/supabaseInvoke.services.js` — `invokeWithAuth()` con retry
- `src/services/auth.service.js` — funciones de auth
- `src/providers/AuthProvider.jsx` — contexto de autenticacion
- `src/providers/ThemeProvider.jsx` — theming dinamico
- `src/components/wizards/ClientAccountWizard.jsx` — wizard existente
- `src/components/wizards/WizardStepper.jsx` — stepper visual
- `src/layouts/V2Layout.jsx` — layout v2
- `src/router/RequireAuth.jsx`, `RequireRole.jsx` — guards

---

## FASE 0: Prerequisitos y Setup

**Objetivo:** Preparar dependencias y configuracion.

### 0.1 Instalar dependencias
```bash
npm install @supabase/supabase-js @stripe/stripe-js
```

### 0.2 Configurar variables de entorno
Anadir a `.env.local`:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_PLACEHOLDER
VITE_FN_WHOAMI=whoami
VITE_FN_WIZARD_INIT=wizard_init
VITE_FN_WIZARD_SUBMIT=wizard_submit
VITE_FN_PROVISION_SUPERADMIN=provision_client_account_superadmin
VITE_STRIPE_SUCCESS_URL=http://localhost:5173/autoregistro-cuenta?stripe=success
VITE_STRIPE_CANCEL_URL=http://localhost:5173/autoregistro-cuenta?stripe=cancel
```

Anadir Supabase Edge Function secrets (placeholders):
```
STRIPE_SECRET_KEY=sk_test_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=whsec_PLACEHOLDER
```

---

## FASE 1: Backend — Schema SQL

**Objetivo:** Crear tablas nuevas sin tocar legacy.

### 1.1 Crear `plans_catalog`
**Archivo:** `supabase/migrations/20260211_001_create_plans_catalog.sql`

```sql
CREATE TABLE plans_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  -- Estado y vigencia
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','deprecated','expired','disabled')),
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  deactivated_at timestamptz,
  -- Pricing
  monthly_price numeric NOT NULL,
  annual_discount_months int NOT NULL DEFAULT 2,
  annual_price numeric GENERATED ALWAYS AS (monthly_price * (12 - annual_discount_months)) STORED,
  tax_percent numeric NOT NULL DEFAULT 21,
  -- Limites
  max_owners int NOT NULL DEFAULT 1,
  max_accommodations int NOT NULL DEFAULT 3,
  max_rooms int NOT NULL DEFAULT 20,
  max_admin_users int NOT NULL DEFAULT 3,
  max_associated_admins int NOT NULL DEFAULT 2,
  max_api_users int NOT NULL DEFAULT 1,
  max_viewer_users int NOT NULL DEFAULT 0,
  -- Branding
  branding_enabled boolean NOT NULL DEFAULT false,
  logo_allowed boolean NOT NULL DEFAULT false,
  theme_editable boolean NOT NULL DEFAULT false,
  -- Reglas funcionales
  allows_multi_owner boolean NOT NULL DEFAULT false,
  allows_owner_change boolean NOT NULL DEFAULT false,
  allows_receipt_upload boolean NOT NULL DEFAULT false,
  -- Servicios (dinamico)
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Visibilidad
  visible_for_new_accounts boolean NOT NULL DEFAULT true,
  -- Stripe
  stripe_price_monthly_id text,
  stripe_price_annual_id text,
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```
+ Trigger `updated_at` + Seed data (basic, investor, business, agency).

### 1.2 Crear `client_accounts`
**Archivo:** `supabase/migrations/20260211_002_create_client_accounts.sql`

```sql
CREATE TABLE client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan_code text NOT NULL
    CHECK (plan_code IN ('basic','investor','business','agency')),
  billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','annual')),
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('draft','pending_payment','active','suspended','canceled')),
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  -- Branding
  branding_name text,
  branding_primary_color text,
  branding_secondary_color text,
  branding_logo_url text,
  -- Stripe
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```
+ Trigger `updated_at` + Index en `slug`.

### 1.3 Crear `entities` + vistas
**Archivo:** `supabase/migrations/20260211_003_create_entities.sql`

```sql
CREATE TABLE entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('payer','owner')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  legal_type text NOT NULL CHECK (legal_type IN ('autonomo','persona_fisica','persona_juridica')),
  -- Datos
  legal_name text,
  first_name text,
  last_name1 text,
  last_name2 text,
  tax_id text,
  billing_email text,
  phone text,
  -- Direccion
  country text DEFAULT 'Espana',
  province text,
  city text,
  zip text,
  street text,
  street_number text,
  address_extra text,
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Exactamente 1 payer por client_account
CREATE UNIQUE INDEX idx_entities_one_payer_per_account
  ON entities (client_account_id) WHERE type = 'payer';

-- Vistas para compatibilidad con doc v1.4
CREATE VIEW payer_entities_view AS
  SELECT * FROM entities WHERE type = 'payer';

CREATE VIEW owner_entities_view AS
  SELECT * FROM entities WHERE type = 'owner';
```
+ Trigger `updated_at` + Indices.

### 1.4 ALTER profiles
**Archivo:** `supabase/migrations/20260211_004_alter_profiles.sql`

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS client_account_id uuid REFERENCES client_accounts(id),
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'none'
    CHECK (onboarding_status IN ('none','in_progress','payment_pending','active')),
  ADD COLUMN IF NOT EXISTS is_primary_admin boolean NOT NULL DEFAULT false;
```
**NO** rompe `company_id` legacy. Ambas columnas coexisten.

### 1.5 RLS
**Archivo:** `supabase/migrations/20260211_005_rls_new_tables.sql`

Crear helper function `get_my_client_account_id()` (SECURITY DEFINER).

Politicas:
- `plans_catalog`: SELECT publico (status=active, visible); INSERT/UPDATE/DELETE solo superadmin
- `client_accounts`: superadmin=all; admin=SELECT/UPDATE propia cuenta
- `entities`: superadmin=all; admin=CRUD dentro de su client_account_id
- `profiles`: anadir politica para client_account_id (sin romper legacy)

---

## FASE 2: Backend — Edge Functions

**Objetivo:** 5 Edge Functions nuevas (sin tocar legacy).

### 2.1 `whoami` (GET)
**Archivo:** `supabase/functions/whoami/index.ts`

- Valida JWT
- Lee profile (role, client_account_id, onboarding_status, is_primary_admin)
- Si tiene client_account_id: carga branding + plan_code + billing_cycle
- Devuelve: `{ user_id, role, client_account_id, onboarding_status, plan_code, billing_cycle, branding: { name, logo_url, primary_color, secondary_color } }`

### 2.2 `wizard_init` (POST)
**Archivo:** `supabase/functions/wizard_init/index.ts`

- Valida JWT
- Marca `profiles.onboarding_status = 'in_progress'`
- Devuelve: `{ ok: true, step: 'A' }`

### 2.3 `wizard_submit` (POST) — **critico**
**Archivo:** `supabase/functions/wizard_submit/index.ts`

Payload del wizard completo. Acciones (transaccion):
1. Validar JWT + usuario sin tenant activo
2. INSERT `client_accounts` (status='pending_payment' para autoregistro, 'draft' para superadmin)
3. INSERT `entities` type=payer (obligatorio)
4. INSERT `entities` type=owner (1 por defecto; validar max_owners del plan)
5. Crear/invitar admins (auth.admin.createUser + INSERT profiles)
6. UPDATE profile del usuario actual (client_account_id, onboarding_status)
7. Si autoregistro: crear Stripe Checkout Session → devolver checkout_url
8. Devuelve: `{ ok, client_account_id, checkout_url? }`

### 2.4 `stripe_webhook` (POST)
**Archivo:** `supabase/functions/stripe_webhook/index.ts`

- Valida firma Stripe (`stripe-signature`)
- `checkout.session.completed`: actualiza client_accounts.status='active', rellena stripe_ids, profiles.onboarding_status='active'
- `invoice.payment_failed`: client_accounts.status='suspended'
- `customer.subscription.deleted`: client_accounts.status='canceled'

### 2.5 `provision_client_account_superadmin` (POST)
**Archivo:** `supabase/functions/provision_client_account_superadmin/index.ts`

- Similar a wizard_submit pero:
  - Verifica role=superadmin
  - Permite status='draft' sin checkout
  - NO crea Stripe session

---

## FASE 3: Frontend — Providers y Auth

**Objetivo:** Actualizar el contexto de autenticacion y crear TenantProvider.

### 3.1 Actualizar AuthProvider
**Archivo:** `src/providers/AuthProvider.jsx` (MODIFICAR)

Cambios:
- Al cargar profile, incluir `client_account_id`, `onboarding_status`, `is_primary_admin`
- Exponer en contexto: `clientAccountId`, `onboardingStatus`
- Llamar a `whoami` tras login exitoso para obtener datos completos

### 3.2 Crear TenantProvider
**Archivo:** `src/providers/TenantProvider.jsx` (NUEVO)

- Consume AuthProvider
- Llama a `whoami` Edge Function al montar (si authenticated)
- Guarda: `client_account_id`, `plan_code`, `billing_cycle`, branding (name, logo, colors)
- Aplica CSS variables (`--sr-primary`, etc.)
- Expone: `useTenant()` hook
- Superadmin: usa branding fijo SmartRent

### 3.3 Actualizar main.jsx
**Archivo:** `src/main.jsx` (MODIFICAR)

- Envolver con TenantProvider (dentro de AuthProvider, fuera de Router)

---

## FASE 4: Frontend — Wizard Reestructurado (6 pasos)

**Objetivo:** Reestructurar el wizard existente de 5 a 6 pasos y conectar con Edge Functions.

### 4.1 Wizard — Nuevo orden de pasos

| Step | Nombre | Componente | Origen |
|---|---|---|---|
| A (0) | Datos Contrato | `StepContrato.jsx` | Fusiona StepDatosCuenta + StepDatosPlan |
| B (1) | Branding | `StepBranding.jsx` | Extraido de StepMetodoPago |
| C (2) | Entidad Pagadora | `StepEntidadPagadora.jsx` | Extraido de StepMetodoPago |
| D (3) | Admins Iniciales | `StepUsuariosAdmin.jsx` | Existente (sin cambios) |
| E (4) | Verificar | `StepVerificacion.jsx` | Existente (actualizar resumen) |
| F (5) | Pago | `StepPago.jsx` | **NUEVO** (Stripe Checkout) |

### 4.2 Archivos wizard

| Archivo | Accion |
|---|---|
| `src/components/wizards/ClientAccountWizard.jsx` | **REESCRIBIR**: 6 steps, conectar a Edge Functions |
| `src/components/wizards/WizardStepper.jsx` | **MANTENER** (solo actualizar labels) |
| `src/components/wizards/steps/StepContrato.jsx` | **NUEVO**: name, email, phone, plan_code, billing_cycle, start_date, slug |
| `src/components/wizards/steps/StepBranding.jsx` | **NUEVO**: brand_name, primary_color, secondary_color, logo_url |
| `src/components/wizards/steps/StepEntidadPagadora.jsx` | **NUEVO**: entity_type, datos fiscales, direccion, contacto |
| `src/components/wizards/steps/StepUsuariosAdmin.jsx` | **MANTENER** (sin cambios significativos) |
| `src/components/wizards/steps/StepVerificacion.jsx` | **MODIFICAR**: actualizar resumen para 6 secciones |
| `src/components/wizards/steps/StepPago.jsx` | **NUEVO**: info Stripe + redirect a Checkout |
| `src/components/wizards/steps/StepDatosCuenta.jsx` | **ELIMINAR** (reemplazado por StepContrato) |
| `src/components/wizards/steps/StepDatosPlan.jsx` | **ELIMINAR** (fusionado en StepContrato) |
| `src/components/wizards/steps/StepMetodoPago.jsx` | **ELIMINAR** (dividido en StepBranding + StepEntidadPagadora + StepPago) |

### 4.3 Diferencias por modo

| Aspecto | self_signup | superadmin_create |
|---|---|---|
| Step B (Branding) | Obligatorio si plan!=basic | Igual |
| Step F (Pago) | **Obligatorio** (Stripe Checkout) | **No obligatorio** (cuenta queda draft) |
| Boton final | "Finalizar y Pagar" | "Crear Cuenta" con selector estado |
| Tras finalizar | Redirect a Stripe Checkout URL | Navega a lista cuentas |

### 4.4 Conexion a Edge Functions

Al pulsar "Finalizar" en Step E (Verificacion):
1. Llama `wizard_submit` via `invokeWithAuth`
2. Recibe `{ ok, client_account_id, checkout_url }`
3. Si self_signup: `window.location.href = checkout_url` (Stripe Checkout)
4. Si superadmin: navega a `/v2/superadmin/cuentas`

---

## FASE 5: Frontend — Pagina AutoRegistroCuenta (auth-first)

**Objetivo:** Nueva pagina con flujo auth → wizard.

### 5.1 Crear AutoRegistroCuenta
**Archivo:** `src/pages/v2/autoregistro/AutoRegistroCuenta.jsx` (NUEVO)

Flujo:
1. Si NO logueado → mostrar landing con CTA "Registrate" / "Inicia sesion" (links a `/auth/login`)
2. Si logueado + client_account_id != null + onboarding='active' → redirect a Dashboard
3. Si logueado + onboarding='none' → llamar `wizard_init`, mostrar wizard
4. Si logueado + onboarding='in_progress' → mostrar wizard (retomar)
5. Si logueado + onboarding='payment_pending' → mostrar pantalla "Pago pendiente" con boton reintentar Stripe
6. Si query param `?stripe=success` → mostrar confirmacion, llamar whoami, redirect a dashboard
7. Si query param `?stripe=cancel` → mostrar "Pago cancelado" con boton reintentar

### 5.2 Crear servicio clientAccounts
**Archivo:** `src/services/clientAccounts.service.js` (NUEVO)

Funciones:
- `callWhoami()` → invokeWithAuth('whoami')
- `callWizardInit()` → invokeWithAuth('wizard_init')
- `callWizardSubmit(payload)` → invokeWithAuth('wizard_submit', { body: payload })
- `callProvisionSuperadmin(payload)` → invokeWithAuth('provision_client_account_superadmin', { body: payload })

### 5.3 Actualizar App.jsx
**Archivo:** `src/App.jsx` (MODIFICAR)

Nuevas rutas:
- `/autoregistro-cuenta` → AutoRegistroCuenta (publica pero con logica auth interna)
- Mantener `/registro` → SelfSignup legacy

---

## FASE 6: Frontend — Superadmin + Theming + Guards

### 6.1 Actualizar ClientAccountCreate
**Archivo:** `src/pages/v2/superadmin/ClientAccountCreate.jsx` (MODIFICAR)

- Usar wizard reestructurado con mode='superadmin_create'
- onFinalize: llama `callProvisionSuperadmin(payload)` → navega a lista

### 6.2 Guards de onboarding
**Archivo:** `src/router/RequireOnboarding.jsx` (NUEVO)

- Si `onboardingStatus != 'active'` y `role != 'superadmin'` → redirect a `/autoregistro-cuenta`
- Envolver rutas protegidas de admin/student

### 6.3 Actualizar ThemeProvider
**Archivo:** `src/providers/ThemeProvider.jsx` (MODIFICAR)

- Ademas de `company_id` (legacy), soportar `client_account_id` (nuevo)
- Si existe TenantProvider con branding → usar ese
- CSS variables: `--sr-primary`, `--sr-secondary`

---

## Orden de ejecucion (fases secuenciales)

```
FASE 0 → Setup y dependencias
  |
FASE 1 → SQL: tablas + triggers + seed + RLS
  |
FASE 2 → Edge Functions: whoami, wizard_init, wizard_submit, stripe_webhook, provision_superadmin
  |
FASE 3 → Frontend: AuthProvider + TenantProvider + main.jsx
  |
FASE 4 → Frontend: Wizard 6 pasos + conexion Edge Functions
  |
FASE 5 → Frontend: AutoRegistroCuenta + servicio clientAccounts + rutas
  |
FASE 6 → Frontend: Superadmin update + guards + theming
```

---

## Archivos a crear (18 archivos)

| # | Archivo | Tipo |
|---|---|---|
| 1 | `supabase/migrations/20260211_001_create_plans_catalog.sql` | SQL |
| 2 | `supabase/migrations/20260211_002_create_client_accounts.sql` | SQL |
| 3 | `supabase/migrations/20260211_003_create_entities.sql` | SQL |
| 4 | `supabase/migrations/20260211_004_alter_profiles.sql` | SQL |
| 5 | `supabase/migrations/20260211_005_rls_new_tables.sql` | SQL |
| 6 | `supabase/functions/whoami/index.ts` | Edge Function |
| 7 | `supabase/functions/wizard_init/index.ts` | Edge Function |
| 8 | `supabase/functions/wizard_submit/index.ts` | Edge Function |
| 9 | `supabase/functions/stripe_webhook/index.ts` | Edge Function |
| 10 | `supabase/functions/provision_client_account_superadmin/index.ts` | Edge Function |
| 11 | `src/providers/TenantProvider.jsx` | React Provider |
| 12 | `src/services/clientAccounts.service.js` | Service |
| 13 | `src/pages/v2/autoregistro/AutoRegistroCuenta.jsx` | Page |
| 14 | `src/components/wizards/steps/StepContrato.jsx` | Wizard Step |
| 15 | `src/components/wizards/steps/StepBranding.jsx` | Wizard Step |
| 16 | `src/components/wizards/steps/StepEntidadPagadora.jsx` | Wizard Step |
| 17 | `src/components/wizards/steps/StepPago.jsx` | Wizard Step |
| 18 | `src/router/RequireOnboarding.jsx` | Guard |

## Archivos a modificar (11 archivos)

| # | Archivo | Cambios |
|---|---|---|
| 1 | `src/providers/AuthProvider.jsx` | Anadir clientAccountId, onboardingStatus al contexto |
| 2 | `src/providers/ThemeProvider.jsx` | Soportar client_account_id ademas de company_id |
| 3 | `src/main.jsx` | Envolver con TenantProvider |
| 4 | `src/components/wizards/ClientAccountWizard.jsx` | Reestructurar a 6 pasos, conectar Edge Functions |
| 5 | `src/components/wizards/WizardStepper.jsx` | Actualizar labels (6 pasos) |
| 6 | `src/components/wizards/steps/StepUsuariosAdmin.jsx` | Ajuste menor (ahora es paso D/3) |
| 7 | `src/components/wizards/steps/StepVerificacion.jsx` | Actualizar resumen para 6 secciones |
| 8 | `src/pages/v2/superadmin/ClientAccountCreate.jsx` | Usar wizard reestructurado + Edge Function |
| 9 | `src/App.jsx` | Anadir ruta /autoregistro-cuenta + RequireOnboarding |
| 10 | `.env.local` | Anadir variables Stripe y Edge Functions |
| 11 | `package.json` | Anadir @supabase/supabase-js, @stripe/stripe-js |

## Archivos a eliminar (3 archivos)

| # | Archivo | Razon |
|---|---|---|
| 1 | `src/components/wizards/steps/StepDatosCuenta.jsx` | Reemplazado por StepContrato |
| 2 | `src/components/wizards/steps/StepDatosPlan.jsx` | Fusionado en StepContrato |
| 3 | `src/components/wizards/steps/StepMetodoPago.jsx` | Dividido en StepBranding + StepEntidadPagadora + StepPago |

---

## Verificacion end-to-end

### Happy path — Autoregistro
1. `npm run dev` → navegar a `/autoregistro-cuenta`
2. Si no logueado → ver CTA login/registro
3. Registrarse en `/auth/login` (o signup)
4. Volver a `/autoregistro-cuenta` → wizard aparece (paso A)
5. Completar pasos A→E, verificar validaciones
6. "Finalizar y Pagar" → llama wizard_submit → redirect a Stripe Checkout (placeholder)
7. Stripe success callback → whoami devuelve active → redirect a dashboard

### Happy path — Superadmin
1. Login como superadmin
2. Navegar a `/v2/superadmin/cuentas/nueva`
3. Wizard modo superadmin (sin paso F obligatorio)
4. "Crear Cuenta" → llama provision_superadmin → navega a lista cuentas
5. Cuenta aparece con status=draft

### Stripe webhook
1. `supabase functions serve stripe_webhook --no-verify-jwt`
2. Stripe CLI: `stripe listen --forward-to localhost:54321/functions/v1/stripe_webhook`
3. Completar checkout → webhook recibido → status=active

### Validaciones a probar
- Wizard no avanza sin campos obligatorios
- Branding opcional si plan=basic
- No crear mas owners que max_owners del plan
- Emails admins no duplicados
- Pago obligatorio en autoregistro, opcional en superadmin
- Guard: admin sin onboarding=active → redirect a /autoregistro-cuenta
- Legacy: `/registro` sigue funcionando sin cambios
- Legacy: tablas companies/profiles.company_id intactas

### Comandos de test
```bash
npm run dev                    # Frontend
supabase db reset              # Aplicar migraciones
supabase functions serve       # Edge Functions locales
stripe listen --forward-to ... # Webhook local (cuando haya claves)
```
