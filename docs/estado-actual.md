# Estado Actual del Proyecto — SmartRent Systems

Ultima actualizacion: 2026-02-22

## Funcional / Implementado

### Auth y sesion
- Login funcional con Supabase Auth (email/password)
- AuthProvider completo: session, profile, role, tenantState, refreshProfile(), logout()
- 3 portales de login: Comercial, Gestor (`/v2/admin/auth/login`), Inquilino (`/v2/lodger/auth/login`)
- Registro de usuarios con confirmacion de email
- AuthCallback para manejar redirecciones de email (confirmacion, reset password)
- useLoginForm hook compartido entre los 3 portales
- Forgot password modal integrado en los 3 logins
- RequireAuth, RequireRole, RequireTenant, RequireOnboarding guards
- Portal inquilino: siempre navega al dashboard si `role = 'lodger'` (sin comprobar hasTenant)

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
- Tablas operativas: accommodations, rooms, lodgers, lodger_room_assignments
- Tablas servicios: services_catalog, accommodation_services, lodger_services
- Tablas energia: energy_bills, energy_readings, energy_settlements, bulletins
- Tabla auditoria: audit_log (entity_type, action, old_values, new_values jsonb)
- Migraciones aplicadas
- RLS con policies para todas las tablas — incluyendo politicas self-read para inquilinos
- Helper functions: get_my_role(), get_my_client_account_id()
- Seed data: 4 planes (Basic, Investor, Business, Agency)

### RLS — Politicas para inquilinos (role=lodger)
- `lodgers_select_self` — lectura del propio registro via `auth.email()`
- `assignments_select_self` — lectura de asignaciones propias
- `lodger_bulletins_own` — lectura de boletines propios
- `lodger_services_self` — lectura de servicios propios
- `rooms_select_lodger` — lectura de habitaciones asignadas
- `accommodations_select_lodger` — lectura de alojamientos asignados
- NOTA: todas usan `auth.email()` (NO `auth.users` que no es accesible por usuarios normales)

### Branding / Theming
- TenantProvider carga branding via whoami
- ThemeProvider aplica CSS variables (--sr-primary, --sr-secondary)
- ThemeProvider usa ConfigProvider de Ant Design con `components.Button` para tamaño de botones
- Branding configurable por tenant en wizard

### Admin — Gestion de Alojamientos (v2)
- CRUD completo de alojamientos (AccommodationsList, AccommodationCreate, AccommodationEdit)
- Vista detalle de alojamiento con habitaciones (AccommodationDetail)
- Fotos de habitacion clicables → navegan a TenantEdit
- CRUD de entidades (EntitiesList, EntityCreate, EntityEdit, EntityDetail)

### Admin — Gestion de Inquilinos (v2)
- TenantsList: listado con busqueda, filtros, paginacion
- TenantCreate: alta de inquilino con asignacion de habitacion
- TenantEdit: edicion completa + documentos adjuntos (Supabase Storage)
- LodgerDetail: vista detalle del inquilino con historial de asignaciones
- Documentos: upload, download (signed URLs), rename, delete en bucket privado
- Invitacion por email: Edge Function `manage_lodger` accion `invite`
  - Si el usuario NO existe en auth → `inviteUserByEmail` (crea cuenta + envia email)
  - Si el usuario YA existe → `generateLink(recovery)` (envia reset password)
  - redirectTo apunta a `https://smartroomrentalplatform.com/v2/lodger/dashboard`

### Edge Functions (v2)
| Funcion | Version | Proposito |
|---|---|---|
| `wizard_submit` | v1 | Onboarding completo |
| `wizard_init` | v1 | Inicializa sesion wizard |
| `whoami` | v1 | Perfil completo + branding + plan |
| `provision_client_account_superadmin` | v1 | Provision manual superadmin |
| `stripe_webhook` | v1 | Eventos Stripe |
| `manage_lodger` | **v5** | CRUD inquilinos + invite por email |

### Dashboard del Inquilino (v2) — IMPLEMENTADO
- Login en `/v2/lodger/auth/login` con credenciales propias
- Dashboard con datos reales de Supabase:
  - Header: nombre completo (nombre + apellidos), alojamiento y habitacion asignada
  - **Fila 1**: Mi Habitacion (grande) + Mis Datos (con nombre/apellidos separados, fecha de alta)
  - **Fila 2**: Mis Boletines + Servicios Activos
- Navegacion superior: Mi Panel, Mi Consumo, Servicios, Boletines
- Usuario de prueba dev: `user2dycsa@housingspacesolutions.com` / `Test1234!`

### Otros modulos admin (v2)
- Servicios: ServicesList, ServiceCreate, ServiceEdit
- Energia: EnergyBillsList, EnergyBillCreate, EnergyBillDetail, EnergySettlementsList
- Boletines: BulletinsList, BulletinCreate
- Servicios inquilinos: LodgerServicesList, LodgerServiceCreate
- Configuracion: AdminSettings

## Pendiente / No implementado

### Prioritario (corto plazo)
- [ ] **MANUAL**: Configurar Site URL en Supabase Dashboard Auth → `https://smartroomrentalplatform.com`
- [ ] **MANUAL**: Anadir Redirect URLs: `https://smartroomrentalplatform.com/**` y `http://localhost:5173/**`
- [ ] Stripe en produccion (claves reales, precios reales)
- [ ] Verificar entrega de emails de invitacion (posible limite rate plan gratuito Supabase: 3/hora)

### Modulos de negocio (medio plazo)
- [ ] Dashboard gestor con metricas reales (actualmente mock)
- [ ] Registros de consumo diario (pantallas existen, logica pendiente)
- [ ] Facturas electricas — lectura automatica/escaneo
- [ ] Liquidacion / reparto de costes entre inquilinos
- [ ] Boletines energeticos — generacion y publicacion
- [ ] Hucha energetica virtual
- [ ] Encuestas
- [ ] Tickets de incidencias
- [ ] Panel consumo inquilino con datos reales
- [ ] Panel boletines inquilino con datos reales
- [ ] Panel servicios inquilino con datos reales
- [ ] Perfil editable del inquilino (`/v2/lodger/perfil`)

### Infraestructura (largo plazo)
- [ ] Despliegue en produccion (Netlify/Vercel) — URL: `https://smartroomrentalplatform.com`
- [ ] Entornos PRE y PRO en Supabase (actualmente solo DEV)
- [ ] n8n para procesos batch (facturacion, liquidacion, cierres)
- [ ] Backups automaticos (actualmente manual, plan Free)
- [ ] Subir imagenes de login a Supabase Storage (login-welcome-manager.webp, login-welcome-lodger.webp)
- [ ] Code-splitting con dynamic imports (chunk build >500KB)

## Bugs conocidos / Notas

- Stripe usa claves placeholder → modo mock activado automaticamente en wizard_submit
- Usuarios creados antes del fix de `role: "admin"` pueden tener `role = null` → ejecutar SQL: `UPDATE profiles SET role = 'admin' WHERE client_account_id IS NOT NULL AND role IS NULL`
- Existe codigo legacy v1 (pages/admin/, pages/superadmin/, etc.) que coexiste con v2 — no tocar
- Ant Design v6 usa CSS-in-JS: las clases `.ant-btn` NO existen en el DOM → usar siempre `ConfigProvider` con `components.Button` para personalizar botones
- Perfiles de inquilinos creados manualmente necesitan `onboarding_status = 'active'` para que `hasTenant = true` (aunque el portal inquilino ya no lo requiere tras el fix de LodgerLogin)

## Supabase remoto

- Project ref: `lqwyyyttjamirccdtlvl`
- URL: `https://lqwyyyttjamirccdtlvl.supabase.co`
- Produccion: `https://smartroomrentalplatform.com`
- Deploy Edge Functions via MCP (Supabase MCP configurado en Windsurf)

## Credenciales de prueba (DEV)

| Usuario | Email | Password | Rol |
|---|---|---|---|
| Admin DYCSA | `basicdycsa@housingspacesolutions.com` | *(ver .env)* | admin |
| Admin AXPE | `adminaxpe@housingspacesolutions.com` | *(ver .env)* | admin |
| Inquilino prueba | `user2dycsa@housingspacesolutions.com` | `Test1234!` | lodger |
