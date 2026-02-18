# SmartRent — Web Comercial + Planes + Auth + Stripe + Wizard (End-to-End)
**Documento**: `SmartRent_UI_web_comercial_de_SmartRent_End2End_v1.0.md`
**Estado**: IMPLEMENTADO

## Contexto

SmartRent necesita una **web comercial publica** (landing, planes, registro, contacto, legal) conectada end-to-end con el flujo de alta de usuario, seleccion de plan, pago Stripe y el Wizard AutoRegistroCuenta ya existente. Actualmente solo existe la zona de app (/v2/*) y login (/auth/login) — no hay paginas publicas comerciales.

El objetivo es que un visitante pueda: **Landing → Planes → Registro → Login → Wizard → Pago Stripe → Dashboard activo**.

### Decisiones confirmadas
- **Multi-tenant** (`client_account_users`): Fase futura. Seguir con `profiles.client_account_id` (1 user = 1 tenant)
- **Rutas**: Nuevas publicas (/, /planes, /registro, /contacto, /legal/*) + mantener /v2/* para zona privada
- **Drafts** (`onboarding_drafts`): Fase futura. El wizard no guarda progreso parcial por ahora
- **Stripe**: Modo placeholder (sin claves reales aun)
- **Legacy**: No tocar companies/profiles.company_id ni flujos v1

---

## FASE 0 — Migracion SQL: adaptar tablas existentes + stripe_events

**Archivo**: `supabase/migrations/20260213120000_adapt_plans_add_stripe_events.sql`

### Cambios aplicados:
- `plans_catalog`: ADD `is_featured` boolean + `features` jsonb
- `client_accounts`: ADD `contact_email` text + `contact_phone` text
- UPDATE seed data: investor marcado como featured, features pobladas para 4 planes
- RLS: policy `plans_catalog_select_anon` permite SELECT anonimo (web publica)
- CREATE TABLE `stripe_events` (auditoria webhooks, solo service_role)
- Indice en `stripe_event_id` para idempotencia

---

## FASE 1 — Paginas publicas (Landing + Planes + Registro + Contacto + Legal)

### Archivos creados:
```
src/components/public/PublicHeader.jsx  → Header sticky (logo, nav, CTA, hamburger mobile)
src/components/public/PublicFooter.jsx  → Footer (3 columnas, legal, copyright)
src/pages/public/Landing.jsx           → / (hero, features, como funciona, mini-planes, FAQ, CTA)
src/pages/public/PlanesPage.jsx        → /planes (catalogo dinamico desde BD, toggle mes/ano)
src/pages/public/Registro.jsx          → /registro (signup Supabase Auth, checkbox legal)
src/pages/public/ContactoPage.jsx      → /contacto (info + form placeholder)
src/pages/public/LegalTerminos.jsx     → /legal/terminos
src/pages/public/LegalPrivacidad.jsx   → /legal/privacidad
src/pages/public/LegalCookies.jsx      → /legal/cookies
```

### App.jsx actualizado:
- 8 nuevas rutas publicas
- Catch-all `*` → `/` (landing, no login)
- Ruta `/login` → redirect a `/auth/login`
- Eliminada ruta legacy `/registro` → SelfSignupV2

---

## FASE 2 — Adaptar Login + AutoRegistroCuenta + Wizard (query params plan/billing)

### Login.jsx:
- Lee `searchParams`: plan, billing, redirect
- Post-login: si hay plan → `/autoregistro-cuenta?plan=...&billing=...`
- Si hay redirect → usa ese redirect
- Fallback → dashboard por rol
- Link "No tienes cuenta? Registrate" con query params preservados

### AutoRegistroCuenta.jsx:
- Si usuario NO autenticado → redirect a `/registro?plan=...&billing=...`
- Pasa `initialPlanCode` e `initialBillingCycle` al ClientAccountWizard

### ClientAccountWizard.jsx:
- Acepta props `initialPlanCode` e `initialBillingCycle`
- Pre-rellena `plan_code` y `billing_cycle` en formData inicial

### AuthProvider.jsx:
- `safeRedirectToLogin()` redirige a `/` (landing) en vez de `/auth/login`

### Logout.jsx:
- Post-logout redirige a `/` (landing)

---

## FASE 3 — Adaptar Edge Function stripe_webhook (idempotencia)

### stripe_webhook/index.ts:
- Idempotency check: consulta `stripe_events` por `stripe_event_id` + `processed=true`
- Si ya procesado → return 200 "Already processed"
- Despues de procesar → upsert en `stripe_events` con `processed=true`
- Nuevos event types: `invoice.paid` (re-activa cuentas suspendidas), `customer.subscription.updated` (log)
- Desplegado: `supabase functions deploy stripe_webhook --no-verify-jwt`

---

## Resumen de archivos

### Creados (10 ficheros)

| # | Archivo | Descripcion |
|---|---|---|
| 1 | `supabase/migrations/20260213120000_adapt_plans_add_stripe_events.sql` | ALTER plans_catalog + client_accounts + CREATE stripe_events + RLS anon |
| 2 | `src/pages/public/Landing.jsx` | Landing comercial (hero, features, como funciona, mini-planes, FAQ) |
| 3 | `src/pages/public/PlanesPage.jsx` | Catalogo planes dinamico desde BD con toggle mes/ano |
| 4 | `src/pages/public/Registro.jsx` | Formulario signup con Supabase Auth |
| 5 | `src/pages/public/ContactoPage.jsx` | Pagina contacto (info + form placeholder) |
| 6 | `src/pages/public/LegalTerminos.jsx` | Terminos y condiciones (placeholder) |
| 7 | `src/pages/public/LegalPrivacidad.jsx` | Politica de privacidad (placeholder) |
| 8 | `src/pages/public/LegalCookies.jsx` | Politica de cookies (placeholder) |
| 9 | `src/components/public/PublicHeader.jsx` | Header sticky compartido (logo, nav, CTA, hamburger) |
| 10 | `src/components/public/PublicFooter.jsx` | Footer compartido (links, legal, copyright) |

### Modificados (7 ficheros)

| # | Archivo | Cambio |
|---|---|---|
| 1 | `src/App.jsx` | 8 rutas publicas, catch-all a /, eliminar ruta /registro legacy |
| 2 | `src/pages/auth/Login.jsx` | Query params plan/billing/redirect, link a /registro |
| 3 | `src/pages/v2/autoregistro/AutoRegistroCuenta.jsx` | ?plan= y ?billing=, redirect a /registro si no auth, initialPlan al wizard |
| 4 | `src/components/wizards/ClientAccountWizard.jsx` | Props initialPlanCode + initialBillingCycle |
| 5 | `src/providers/AuthProvider.jsx` | safeRedirectToLogin → / (landing) |
| 6 | `src/pages/auth/Logout.jsx` | Redirect a / post-logout |
| 7 | `supabase/functions/stripe_webhook/index.ts` | Idempotencia con stripe_events + nuevos event types |

---

## Criterios de aceptacion

| ID | Criterio | Estado |
|---|---|---|
| PL-01 | /planes carga planes desde BD (no hardcode) | Implementado |
| PL-02 | Solo planes active + visible_for_new_accounts=true (RLS anon) | Implementado |
| PL-03 | Toggle mensual/anual recalcula precios | Implementado |
| PL-04 | Badge "MEJOR CALIDAD-PRECIO" si is_featured=true | Implementado |
| PL-05 | "Contratar" sin login → /registro?plan=...&billing=... | Implementado |
| PL-06 | "Contratar" con login → /autoregistro-cuenta?plan=...&billing=... | Implementado |
| PL-07 | Loading skeleton mientras carga | Implementado |
| PL-08 | Empty state si no hay planes | Implementado |
| RG-01 | Registro crea auth user con email+password | Implementado |
| RG-02 | Checkbox terminos obligatorio | Implementado |
| RG-03 | Si plan en query → redirect a wizard con plan | Implementado |
| RG-04 | Si no plan → redirect a /planes | Implementado |
| RG-05 | Errores auth visibles (email duplicado, password debil) | Implementado |
| LG-01 | Login con ?plan= → wizard con ese plan | Implementado |
| LG-02 | Login sin params → dashboard por rol | Implementado |
| WZ-01 | Wizard pre-rellena plan/billing de query params | Implementado |
| MT-04 | Logout redirige a / (landing) | Implementado |
| ST-02 | stripe_webhook idempotente por stripe_event_id | Implementado |
| WEB-01 | Landing tiene hero, features, como funciona, mini-planes, FAQ | Implementado |
| WEB-02 | Header sticky con navegacion + hamburger mobile | Implementado |
| WEB-03 | Footer con links legales + contacto | Implementado |
| WEB-04 | 3 paginas legales accesibles | Implementado |
| WEB-05 | Pagina contacto con info + formulario | Implementado |
