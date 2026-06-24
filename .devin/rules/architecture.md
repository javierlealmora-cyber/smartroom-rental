---
trigger: always_on
description: Arquitectura canónica del proyecto SmartRoom Rental. Define stack, patrones multi-tenant, Edge-first, RLS, modelo de datos, storage, autenticación y reglas de obligado cumplimiento al diseñar o modificar cualquier componente, Edge Function, migración o política. Consultar SIEMPRE antes de implementar código nuevo.
---

# Arquitectura SmartRoom Rental — Regla de referencia

> Consolidado de `docs/architecture/overview.md`, `docs/arquitectura.md`,
> `docs/estructura-sistema.md`, `docs/reglas-proyecto.md`,
> `docs/architecture/storage.md` y `docs/edge-functions/EDGE-FUNCTIONS.md`.
>
> **Cualquier cambio que contradiga esta regla debe justificarse
> explícitamente y actualizar este documento + los docs fuente.**

---

## 0. Regla de oro

> **No llames a Supabase directo desde el frontend para operaciones con
> lógica de negocio (crear/editar/borrar entidades, límites de plan,
> onboarding, cobros). Todo eso va por Edge Functions con validación de
> JWT + rol + tenant + plan. El frontend solo hace UI, validaciones
> simples y consume Edge.**

Checklist antes de implementar CUALQUIER operación nueva:

- [ ] ¿Tiene lógica de negocio o valida límites? → **Edge Function**
- [ ] ¿Es solo lectura filtrada por tenant? → Directo con RLS (ANON key)
- [ ] ¿La tabla tiene RLS activa? → Verificar antes de exponer
- [ ] ¿La respuesta sigue `{ ok, data, error }`? → Obligatorio en Edge
- [ ] ¿Se registra en `audit_log` si es crítica? → Ver §6
- [ ] ¿Los campos `updated_at` tienen trigger? → Verificar en migración

---

## 1. Stack tecnológico

### Frontend
- **Framework**: React 18 + Vite
- **Lenguaje**: JavaScript/JSX (migración progresiva a TSX)
- **Routing**: `react-router-dom` v6
- **UI**: Ant Design 6.x + `@ant-design/icons`
  - Tailwind/inline styles están en deprecación; NO introducirlos en código nuevo.
- **Estado**: Context API (sin Redux)
  - `AuthProvider`: sesión, perfil, `refreshProfile()`, `logout()`
  - `TenantProvider`: branding + plan via `whoami`
  - `ThemeProvider`: CSS variables dinámicas
- **HTTP**: cliente Supabase + wrapper `invokeWithAuth`

### Backend
- **BaaS**: Supabase
  - Auth (email/password)
  - PostgreSQL 17 con RLS obligatoria
  - Storage con buckets
  - Edge Functions (Deno runtime)
- **Pagos**: Stripe (Checkout + Webhooks), modo mock en dev
- **Batch**: n8n (planificado)

### Deployment
- **Frontend**: Vercel
- **Backend**: Supabase Cloud
- **Git**: `main` = prod, `staging` = pre, `develop` = desarrollo

---

## 2. Multi-tenant

### Modelo
- Multi-tenant **por columna** `client_account_id` (NO subdominios).
- Una sola URL, múltiples tenants.
- **RLS obligatoria** en toda tabla tenant-owned.

### Helpers de RLS (SECURITY DEFINER)
- `get_my_role()` — rol del usuario autenticado
- `get_my_client_account_id()` — tenant del usuario
- Superadmin hace bypass RLS via funciones SECURITY DEFINER.

### Separación catálogos vs datos tenant

| Tipo | Ejemplos | Acceso |
|------|----------|--------|
| **Catálogo global** | `plans_catalog`, plantillas globales | Lectura pública o superadmin |
| **Datos tenant** | `client_accounts`, `entities`, `accommodations`, `rooms`, `lodgers`, `lodger_accompanists`, `lodger_room_assignments`, `services_catalog`, `accommodation_services`, `lodger_services`, `energy_bills`, `energy_readings`, `energy_settlements`, `bulletins`, `locks`, `lock_integrations` | RLS por `client_account_id` |

---

## 3. Jerarquía de datos

```
client_accounts (tenant SaaS)
  ├── plan_code / billing_cycle / status / branding
  ├── entities (type = payer)               ← entidad pagadora
  └── entities (type = owner)               ← entidades propietarias
        └── accommodations  (owner_entity_id NOT NULL)
              ├── energy_bills
              │     ├── energy_readings (por room)
              │     ├── energy_settlements (por room + lodger)
              │     └── bulletins (por room + lodger)
              ├── accommodation_services
              ├── locks + lock_integrations (SmartAccessLock)
              └── rooms (is_shared boolean)
                    └── lodger_room_assignments
                          ├── lodger_id        → lodgers (client_account_id)
                          │     └── lodger_services
                          └── accompanist_id?  → lodger_accompanists (REQ-015)
```

### Habitación compartida (REQ-015)
`lodger_accompanists` modela al **acompañante** — ficha de persona en contrato compartido sin acceso web ni perfil en `profiles`. Vinculado a la asignación via `lodger_room_assignments.accompanist_id` (FK nullable). Ver regla `@.windsurf/rules/shared-rooms.md` y `@docs/requirements/current/REQ-015-shared-room-accompanist.md`.

### Regla crítica de FK
**Ningún alojamiento sin entidad propietaria.** `accommodations.owner_entity_id` es `NOT NULL` y FK a `entities(id)` con `type='owner'`.

### Historial inmutable
`lodger_room_assignments` **nunca se borra**. Se cierra con `move_out_date`. Un `lodger` puede tener múltiples asignaciones (distintas entidades, alojamientos, habitaciones) a lo largo del tiempo.

### Unicidad de ocupación activa
```sql
CREATE UNIQUE INDEX idx_room_active_assignment
  ON lodger_room_assignments(room_id)
  WHERE move_out_date IS NULL;
```

---

## 4. Portales y autenticación

### Tres portales de login

| Portal | Ruta | Usuarios |
|--------|------|----------|
| Comercial | `/v2/auth/login` | Nuevos clientes / CTA pública |
| Admin/Gestor | `/v2/admin/auth/login` | Admin, gestor |
| Inquilino | `/v2/lodger/auth/login` | Lodgers |

- Hook compartido: `hooks/useLoginForm.js`.
- Redirección post-login según rol (ver `constants/roles.js` → `getPortalHomeForRole`).

### Flujo post-login

```
Supabase Auth (JWT)
  → AuthProvider (session + profile)
  → TenantProvider (whoami → branding, plan)   [si role != superadmin]
  → ThemeProvider (CSS variables + AntD token)
  → Route Guards (RequireAuth / RequireRole / RequireTenant / RequireOnboarding)
  → Render o redirect
```

### Roles

`superadmin` / `admin` / `api` / `student` / `viewer` (+ `lodger` en portal de inquilino).

Autorización centralizada: cada Edge valida **JWT → rol → tenant → plan**.

---

## 5. Edge-first (backend-first)

### Regla P1

**Escrituras por Edge, lecturas directas con RLS.**

```js
// ❌ INCORRECTO
await supabase.from("accommodations").insert(payload);

// ✅ CORRECTO
await invokeWithAuth("manage_accommodation", { action: "create", payload });
```

### Formato de respuesta estándar (OBLIGATORIO en toda Edge)

```ts
{
  ok: boolean,
  data?: any,
  error?: {
    code: string,      // "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND",
                        // "VALIDATION", "INVALID_ACTION",
                        // "PLAN_LIMIT_EXCEEDED", "ACCOUNT_INACTIVE", "INTERNAL"
    message: string,
    detail?: any
  }
}
```

### Patrón de Edge Function

Cada Edge debe:

1. Envolver el handler en `try/catch` global que devuelva `{ ok:false, error:… }` con **status 200** (para evitar problemas de CORS cuando el cliente lee el body).
2. Validar JWT con el cliente Supabase creado con el `Authorization` header del request.
3. Resolver `profile` → validar `role`, `client_account_id`, `account.status`.
4. Validar límites de plan cuando aplique (`max_owner_entities`, `max_accommodations`, `max_rooms`, `max_admin_users`).
5. Ejecutar la acción con cliente Service Role.
6. Insertar en `audit_log` (ver §6) dentro de `try/catch` (non-fatal).
7. Responder `{ ok: true, data }`.

### Edge Functions existentes (referencia)

| Función | Propósito |
|---------|-----------|
| `wizard_submit` | Onboarding: client_account + entities + admins + Stripe |
| `wizard_init` | Inicializa sesión de wizard |
| `whoami` | Perfil + branding + plan |
| `provision_client_account_superadmin` | Provisión manual (sin Stripe) |
| `stripe_webhook` | Eventos de Stripe (idempotente por `stripe_event_id`) |
| `manage_lodger` | CRUD inquilinos + invite + assign_room + reassign_room + schedule_checkout |
| `manage_accommodation` | CRUD alojamientos |
| `manage_entity` | CRUD entidades |
| `sal-connect-integration` | Alta de integración SmartAccessLock (TTLock) |
| `sal-regenerate-password` | Regenera credenciales TTLock gestionadas |

---

## 6. Auditoría

### Tabla genérica `audit_log` (regla P2)

Columnas clave: `client_account_id`, `actor_user_id`, `actor_role`, `entity_type`, `entity_id`, `action`, `old_values jsonb`, `new_values jsonb`, `created_at`.

### Acciones OBLIGATORIAMENTE auditadas

| Acción | Entidad |
|--------|---------|
| Creación de cuenta | `client_accounts` |
| Cambio de plan | `client_accounts` |
| Alta/baja entidad propietaria | `entities` |
| Alta/baja alojamiento | `accommodations` |
| Alta/baja inquilino | `lodgers` |
| Asignación/cambio de habitación | `lodger_room_assignments` |
| Reprogramación de cobros | `stripe_events` |
| Cambio de estado crítico | cualquier entidad |

### Patrón de inserción (NON-FATAL)

```ts
try {
  await supabase.from("audit_log").insert({ ... });
} catch { /* non-fatal */ }
```

No usar `.catch()` sobre el PostgrestBuilder de Supabase — no existe y rompe la ejecución.

---

## 7. Modelado de BBDD — campos obligatorios

### Toda tabla tenant-owned

```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
client_account_id uuid NOT NULL REFERENCES client_accounts(id),
status            text NOT NULL DEFAULT 'active',
created_at        timestamptz NOT NULL DEFAULT now(),
updated_at        timestamptz NOT NULL DEFAULT now()
```

Si tiene vigencia temporal: añadir `start_date date`, `end_date date`, `deactivated_at timestamptz`.

### Trigger `updated_at` (obligatorio)

```sql
CREATE EXTENSION IF NOT EXISTS moddatetime;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON <tabla>
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### Constraints y FK
- `UNIQUE` dentro del tenant donde aplique (slug, nombres clave).
- `ON DELETE CASCADE` solo donde sea seguro (ej. `rooms → accommodations`).
- `ON DELETE RESTRICT` donde no (ej. `lodgers → client_accounts`).

### Soft delete vs suspend
- `inactive` = baja lógica (fuera de listados activos).
- `suspended` = bloqueo temporal reversible (impago, moderación).
- **Prohibido borrar físicamente** `lodgers`, `lodger_accompanists`, `lodger_room_assignments`, `energy_bills`, facturas y liquidaciones.

---

## 8. Límites por plan

### Fuente de verdad

`plans_catalog.features` (jsonb). Planes: `starter` / `pro` / `enterprise`.

| Límite | Starter | Pro | Enterprise |
|--------|---------|-----|------------|
| Entidades propietarias | 1 | 3 | ∞ |
| Alojamientos por entidad | 1 | 5 | ∞ |
| Habitaciones por alojamiento | 10 | 30 | ∞ |
| Usuarios admin (por cuenta) | 1 | 3 | ∞ |

### Reglas P3
- **Bloqueo real en Edge** antes de cualquier creación.
- Warning en UI a partir del 80 % de uso.
- Cambio de plan: si `uso_actual > límite_nuevo` → bloquear con detalle de qué limpiar.

---

## 9. Frontend — estructura y patrones

### Árbol de carpetas (src/)

```
src/
├── App.jsx                 # Router principal
├── main.jsx                # Root + providers
├── components/
│   ├── auth/               # SessionResolver, StorageImage
│   ├── public/             # PublicHeader, PublicFooter
│   └── wizards/            # ClientAccountWizard + steps/
├── constants/roles.js      # MANAGER_ROLES, LODGER_ROLES, getPortalHomeForRole
├── hooks/useLoginForm.js
├── layouts/                # AppLayout, SuperadminLayout, V2Layout
├── pages/
│   ├── public/             # Landing, Planes, Registro, Legal
│   ├── v2/auth/            # CommercialLogin, ManagerLogin, LodgerLogin, AuthCallback
│   ├── v2/superadmin/
│   ├── v2/manager/ + v2/admin/
│   ├── v2/lodger/
│   └── v2/autoregistro/    # AutoRegistroCuenta (wizard self-signup)
├── providers/
│   ├── AuthProvider.jsx
│   ├── TenantProvider.jsx
│   └── ThemeProvider.jsx
├── router/
│   ├── RequireAuth.jsx
│   ├── RequireRole.jsx
│   ├── RequireTenant.jsx
│   └── RequireOnboarding.jsx
└── services/
    ├── supabaseClient.js            # createClient con env vars
    ├── supabaseInvoke.services.js   # invokeWithAuth (retries + circuit breaker)
    ├── auth.service.js
    └── clientAccounts.service.js
```

### Patrones imprescindibles

- **`invokeWithAuth(fn, body)`** — único entrypoint a Edge Functions (retries, JWT refresh, circuit breaker). Nunca usar `supabase.functions.invoke` directamente fuera de este wrapper.
- **`refreshProfile()`** — llamar tras cualquier mutación que altere `profile` (wizard, cambio de plan, etc.).
- **`SessionResolver`** — componente post-login que espera `profile` antes de resolver destino.
- **`emailRedirectTo`** — siempre `${window.location.origin}/v2/auth/callback` en `signUp` y `resetPassword`.
- **Escrituras** — siempre por servicios que wrapean `invokeWithAuth`, nunca `.from().insert()` desde componentes.

### Theming dinámico por tenant

1. `TenantProvider` carga branding vía `whoami`.
2. `ThemeProvider` aplica CSS vars (`--sr-primary`, `--sr-secondary`, `--sr-text`).
3. Ant Design `ConfigProvider.token.colorPrimary` usa esas vars.
4. **No renderizar el layout final hasta que `tenantContext` esté resuelto.**

### UI
- Formularios: `Form` de Ant Design con `rules` de validación.
- Feedback: `message.success/error` para operaciones, `Alert` para avisos persistentes.
- Iconos: `@ant-design/icons`.
- Tailwind / inline styles: prohibidos en código nuevo.

---

## 10. Storage

### Buckets

| Bucket | Visibilidad | Propósito |
|--------|-------------|-----------|
| `company-assets` | **Público** | Logos/favicons de cuentas (superadmin gestiona) |
| `smartrent-systems` | **Privado** | Documentos privados por tenant |

### Estructura de `smartrent-systems` (OBLIGATORIA)

```
{client_account_id}/
├── entities/
│   └── {entity_id}/
│       └── docs/                     # escrituras, poderes, contratos
└── accommodations/
    └── {accommodation_id}/
        ├── bills/
        │   ├── electricity/{bill_id}.pdf
        │   ├── water/{bill_id}.pdf
        │   └── gas/{bill_id}.pdf
        ├── docs/                     # licencias, seguros, certificados
        └── rooms/
            └── {room_id}/
                └── contracts/
                    └── {lodger_id}_{YYYY-MM-DD}.pdf
```

### Reglas RLS de Storage
- `(storage.foldername(name))[1] == profile.client_account_id` para todo INSERT/SELECT/UPDATE/DELETE en `smartrent-systems` (excepto superadmin).
- `company-assets`: lectura pública, escritura solo superadmin.

### Descargas privadas
Siempre por **signed URL** (TTL corto, típicamente 60 s). Nunca exponer paths privados como URL pública.

### Validación de uploads (obligatorio)
- MIME whitelist (`image/png|jpeg|svg+xml|webp`, `application/pdf`).
- Tamaño máximo 5 MB (ajustable por tipo).
- Sanitizar nombres de archivo.

---

## 11. Secretos y seguridad

- Frontend: solo `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` + JWT del usuario.
- `SUPABASE_SERVICE_ROLE_KEY`: **solo en Edge Functions** (env var de Supabase).
- Credenciales de terceros (TTLock, Stripe secret, etc.): en Supabase Vault vía helpers `_shared/sal-vault.ts` + env vars; nunca hardcodear.
- `~/.windsurf/mcp_config.json` contiene tokens → **nunca commitear**.
- `.env.*` en `.gitignore`; **nunca** hardcodear URLs/keys en código fuente.

---

## 12. Entornos

| Entorno | Supabase name | Project ID | `.env` | Script |
|---------|---------------|------------|--------|--------|
| **dev** | Smart Rent Systems DataBase Dev | `lqwyyyttjamirccdtlvl` | `.env.development` | `npm run dev` |
| **staging** | (pendiente) | *pendiente* | `.env.staging` | `npm run build:pre` |
| **prod** | (pendiente) | *pendiente* | `.env.production` | `npm run build` |

### Reglas
- Por defecto todas las migraciones y cambios van a **dev**.
- Solo aplicar en staging/prod cuando el usuario lo indique **explícitamente**.
- Tras cualquier DDL en Supabase: `NOTIFY pgrst, 'reload schema';` y verificar con `information_schema.columns`.
- Renombrar proyecto en el dashboard es cosmético; no cambia URLs ni keys.

---

## 13. Git / ramas

```
main        ← producción (solo merge desde develop o hotfix/*)
staging     ← pre-producción
develop     ← integración (trabajo habitual)
feature/*   ← nuevas funcionalidades (desde develop)
hotfix/*    ← correcciones urgentes (desde main)
```

---

## 14. Pagos (Stripe)

- Plan activo **requiere** pago confirmado por webhook (excepto provisión manual de superadmin).
- Verificar firma con `stripe-signature`.
- Idempotencia por `stripe_event_id` (rechazar duplicados).
- Upgrades/downgrades **solo** vía API Stripe (prorrateo); nunca parchear suscripciones a mano.
- En desarrollo el flujo funciona en modo mock.

---

## 15. Anti-patrones (prohibidos)

- ❌ `supabase.from(<tabla_tenant>).insert/update/delete()` desde componentes React.
- ❌ Usar `.catch()` encadenado sobre un PostgrestBuilder (no existe; usar `try/catch` async).
- ❌ Edge Function que devuelva status 4xx/5xx con `throw` sin try/catch global: provoca CORS errors en el frontend.
- ❌ Borrar físicamente `lodger_room_assignments`, `lodger_accompanists` u otros registros históricos.
- ❌ Desactivar RLS "temporalmente" en tablas operativas.
- ❌ Hardcodear Project ID, URLs, keys o tokens en código fuente.
- ❌ Subir archivos privados al bucket `company-assets`.
- ❌ Introducir Tailwind/inline styles en código nuevo.
- ❌ Guardar secretos de terceros (TTLock passwords, Stripe secret, etc.) en columnas sin Vault.
- ❌ Llamar a `supabase.functions.invoke` en lugar de `invokeWithAuth`.
- ❌ Alojamientos sin `owner_entity_id`.
- ❌ Migraciones en staging/prod sin autorización explícita del usuario.

---

## 16. Checklist de módulo nuevo

Antes de dar por cerrado un módulo/feature:

- [ ] Tablas nuevas con `client_account_id NOT NULL`, `status`, `created_at`, `updated_at` y trigger `moddatetime`.
- [ ] RLS activa + políticas para `admin`, `superadmin` bypass, y `lodger`/`api` cuando proceda.
- [ ] Edge Function para cada escritura con formato `{ ok, data, error }` y validación JWT+rol+tenant+plan.
- [ ] `audit_log` para acciones críticas.
- [ ] Servicio frontend que wrapea `invokeWithAuth`.
- [ ] Componentes usan AntD, guardas de ruta correctas y `refreshProfile()` tras mutaciones que cambien perfil.
- [ ] Documentación actualizada en `docs/` (arquitectura, EDGE-FUNCTIONS, data-model).
- [ ] Migración aplicada en dev + `NOTIFY pgrst, 'reload schema'` + verificación.
- [ ] Tests unit/integration para la Edge (rol, plan, tenant).
- [ ] Sin secretos en repo; sin llamadas directas a `supabase.from()` en componentes.

---

## 17. Referencias fuente

- `docs/architecture/overview.md`
- `docs/arquitectura.md`
- `docs/estructura-sistema.md`
- `docs/reglas-proyecto.md`
- `docs/architecture/data-model.md`
- `docs/architecture/storage.md`
- `docs/architecture/audit-log-system.md`
- `docs/edge-functions/EDGE-FUNCTIONS.md`
- `docs/devops/environments.md`
- `.windsurf/ENVIRONMENTS.md`

Actualizar esta regla **y** el doc fuente correspondiente cuando se tome
cualquier decisión de arquitectura nueva.
