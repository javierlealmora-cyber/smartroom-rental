# SmartRent Systems

Plataforma SaaS multi-tenant para gestion inteligente de alquiler de habitaciones.
Orientada a empresas/inversores que gestionan apartamentos con habitaciones para inquilinos.

## Stack

- **Frontend**: React 18 + Vite + react-router-dom
- **Backend**: Supabase (Auth + Postgres + Edge Functions + Storage)
- **Pagos**: Stripe (modo mock en desarrollo)
- **Batch**: n8n (planificado)
- **Despliegue**: Vercel (pendiente)

## Documentacion detallada

- [docs/requisitos-funcionales.md](docs/requisitos-funcionales.md) — Modulos, entidades, reglas de negocio
- [docs/arquitectura.md](docs/arquitectura.md) — Estructura, flujos, decisiones tecnicas
- [docs/estado-actual.md](docs/estado-actual.md) — Que funciona, que falta, bugs conocidos

## Convenciones clave

- **Rutas v2**: /v2/manager/*, /v2/lodger/*, /v2/superadmin/*, /v2/auth/*
- **3 portales de login**: Comercial (/v2/auth/login), Gestor (/v2/manager/auth/login), Inquilino (/v2/lodger/auth/login)
- **Roles**: definidos en src/constants/roles.js (superadmin, admin, lodger, etc.)
- **Multi-tenant**: por columna client_account_id + RLS en Postgres
- **Auth**: AuthProvider con refreshProfile() tras cambios de perfil en DB
- **Edge Functions**: wizard_submit, wizard_init, whoami, provision_client_account_superadmin, stripe_webhook
- **Invocar Edge Functions**: usar invokeWithAuth() de supabaseInvoke.services.js (retries + circuit breaker)
- **Email redirect**: siempre usar emailRedirectTo: `${window.location.origin}/v2/auth/callback`
- **Estilos**: inline styles en componentes nuevos, CSS variables para theming (--sr-primary, --sr-secondary)
- **Color corporativo**: #0B2E6D (azul oscuro, usado en header comercial y textos de marca)

## Login portales

- **Manager login** (`/v2/manager/auth/login`): Split-screen — foto izquierda (75%) + formulario derecho (25%) sobre fondo blanco
- **Lodger login** (`/v2/lodger/auth/login`): Mismo layout split-screen con foto diferente
- **Comercial login** (`/v2/auth/login`): Tarjeta centrada con PublicHeader/PublicFooter
- **Imagenes login**: Desde Supabase Storage bucket `Assets-SmartRent` — `login-welcome-manager.jpg` y `login-welcome-lodger.jpg`
- **Logo**: `logo-30.jpg` en bucket `Assets-SmartRent`, usado en PublicHeader (pagina comercial)
- **Validacion de portal**: Si un lodger intenta logar en el portal manager (o viceversa), se muestra mensaje de "Acceso no permitido" indicando que use el enlace del portal correcto
- **Redirect post-login**: Manager con tenant → `/v2/manager/dashboard`, Lodger con tenant → `/v2/lodger/dashboard`, Superadmin → `/v2/superadmin`, Sin tenant → `/v2/planes`
- **Redirect post-logout**: Segun portal actual — manager → `/v2/manager/auth/login`, lodger → `/v2/lodger/auth/login` (gestionado por `safeRedirectToLogin` en AuthProvider y param `?portal=` en Logout.jsx)
- **Responsive**: En pantallas < 768px la foto se oculta y el formulario ocupa 100%

## Supabase remoto

- Project ref: `lqwyyyttjamirccdtlvl`
- Deploy: `npx supabase functions deploy <nombre> --project-ref lqwyyyttjamirccdtlvl`

## Principios de trabajo

- Proponer soluciones simples antes que complejas
- Mantener el proyecto lean: no sobreingenieria
- Priorizar seguridad (RLS, JWT, validacion en Edge Functions)
- Hacer preguntas solo cuando sean necesarias para avanzar
- Estructura organizada, clara y minima — cada archivo con responsabilidad clara
- **Documentacion**: NO actualizar docs/ automaticamente. Solo actualizar cuando el usuario lo pida explicitamente
