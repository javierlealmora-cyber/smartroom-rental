# Estado Actual del Proyecto — SmartRent Systems

Ultima actualizacion: 2026-02-15

## Funcional / Implementado

### Auth y sesion
- Login funcional con Supabase Auth (email/password)
- AuthProvider completo: session, profile, role, tenantState, refreshProfile(), logout()
- 3 portales de login: Comercial, Gestor, Inquilino
- Registro de usuarios con confirmacion de email
- AuthCallback para manejar redirecciones de email (confirmacion, reset password)
- useLoginForm hook compartido entre los 3 portales
- Forgot password modal integrado en los 3 logins
- RequireAuth, RequireRole, RequireTenant, RequireOnboarding guards

### Onboarding / Wizard
- Wizard de autoregistro (6 pasos): contrato, branding, entidad pagadora, admins, pago, verificacion
- wizard_submit Edge Function: crea client_account + entities + actualiza profile con role
- wizard_init Edge Function: inicializa sesion de wizard
- Stripe en modo mock: activa cuenta directamente sin cobro real
- refreshProfile() tras wizard_submit para actualizar estado en frontend

### Superadmin
- Dashboard con metricas mock
- CRUD de cuentas de cliente (listado, crear, detalle)
- CRUD de planes (listado, crear, detalle)
- Listado de servicios
- provision_client_account_superadmin Edge Function

### Web publica
- Landing page
- Pagina de planes (carga desde plans_catalog en DB)
- Pagina de registro
- Paginas legales (terminos, privacidad, cookies)
- Pagina de contacto
- PublicHeader + PublicFooter reutilizables

### Base de datos
- Tablas: profiles, client_accounts, entities, plans_catalog
- Migraciones aplicadas (6 archivos SQL)
- RLS con policies para todas las tablas nuevas
- Helper functions: get_my_role(), get_my_client_account_id()
- Seed data: 4 planes (Basic, Investor, Business, Agency)

### Branding / Theming
- TenantProvider carga branding via whoami
- ThemeProvider aplica CSS variables (--sr-primary, --sr-secondary)
- Branding configurable por tenant en wizard

## Pendiente / No implementado

### Prioritario (corto plazo)
- [ ] Configurar Site URL en Supabase Dashboard remoto (localhost:5173)
- [ ] Stripe en produccion (claves reales, precios reales)
- [ ] Dashboard del gestor con datos reales (actualmente mock)
- [ ] Dashboard del inquilino con datos reales (actualmente mock)

### Modulos de negocio (medio plazo)
- [ ] CRUD Alojamientos (pantallas existen, logica pendiente)
- [ ] CRUD Habitaciones dentro de alojamiento
- [ ] CRUD Inquilinos (alta con invitacion por email)
- [ ] Gestion de ocupacion (asignacion por disponibilidad)
- [ ] Registros de consumo diario
- [ ] Facturas electricas (con lectura automatica)
- [ ] Liquidacion / reparto de costes
- [ ] Boletines energeticos
- [ ] Hucha energetica
- [ ] Encuestas
- [ ] Tickets de incidencias
- [ ] Servicios informativos

### Infraestructura (largo plazo)
- [ ] Despliegue en Vercel
- [ ] Entornos PRE y PRO en Supabase
- [ ] n8n para procesos batch (facturacion, liquidacion, cierres)
- [ ] Backups automaticos (actualmente manual, plan Free)
- [ ] Subir imagenes de login a Supabase Storage (login-welcome-manager.webp, login-welcome-lodger.webp)

## Bugs conocidos / Notas

- Stripe usa claves placeholder → modo mock activado automaticamente en wizard_submit
- Usuarios creados antes del fix de `role: "admin"` pueden tener `role = null` → ejecutar SQL manualmente: `UPDATE profiles SET role = 'admin' WHERE client_account_id IS NOT NULL AND role IS NULL`
- El chunk de build es >500KB (warning de Vite) → considerar code-splitting con dynamic imports
- Existe codigo legacy v1 (pages/admin/, pages/superadmin/, etc.) que coexiste con v2

## Supabase remoto

- Project ref: `lqwyyyttjamirccdtlvl`
- URL: `https://lqwyyyttjamirccdtlvl.supabase.co`
- Deploy Edge Functions: `npx supabase functions deploy <nombre> --project-ref lqwyyyttjamirccdtlvl`
