# Reglas de Proyecto — SmartRent Systems

> Documento normativo de arquitectura, seguridad y calidad.
> Fuente: especificación del cliente (Feb 2026).
> **Estas reglas son de obligado cumplimiento en todo desarrollo nuevo.**

---

## Decisiones de arquitectura confirmadas (Feb 2026)

| # | Decisión | Detalle |
|---|---|---|
| P1 | **Escrituras por Edge, lecturas directas con RLS** | Módulos existentes se migran cuando se toque ese módulo. Módulos nuevos nacen ya con Edge. |
| P2 | **`audit_log` tabla genérica** | Una sola tabla con `entity_type`, `action`, `old_values`, `new_values` jsonb. |
| P3 | **Límites de plan en Edge** | Validar `max_owner_entities`, `max_accommodations`, `max_rooms`, `max_admin_users` en cada Edge de creación. |
| P4 | **Ramas Git: `main` + `develop`** | `develop` creada y publicada. Todo el trabajo nuevo va en `develop` → PR → `main`. |
| P5 | **Entornos Supabase separados** | `dev` = proyecto actual (`lqwyyyttjamirccdtlvl` — "Smart Rent Systems DataBase Dev"). `pre` y `prod` = proyectos nuevos cuando llegue el momento. |

---

## 1. Principios de arquitectura

### 1.1 Edge-first (backend primero)
- Toda operación con **reglas de negocio** (planes, límites, estados, onboarding, permisos) se implementa en **Edge Functions**.
- El frontend **no aplica lógica de negocio decisiva**: solo UI y validación básica de formulario (campos requeridos, formatos).
- Operaciones que **deben ir por Edge**: crear/editar/borrar entidades, límites de plan, onboarding, cobros, cambios de estado con reglas.
- Operaciones que **pueden ir directo** (vía ANON key + RLS): lecturas de listados, filtros, búsquedas sin lógica de negocio.

```
❌ INCORRECTO: supabase.from("accommodations").insert(payload)  ← desde frontend
✅ CORRECTO:   invokeWithAuth("manage_accommodation", { action: "create", payload })
```

### 1.2 RLS siempre activa
- Todas las tablas "tenant-owned" tienen `client_account_id` y **RLS obligatoria**.
- Aunque la Edge Function use Service Role, RLS es el último muro para accesos con ANON key.
- Nunca desactivar RLS en tablas operativas.

### 1.3 Multi-tenant por `client_account_id`
- Todo lo que pertenece al negocio de un tenant lleva `client_account_id` como FK no nula.
- Tablas afectadas: `entities`, `accommodations`, `rooms`, `lodgers`, `lodger_room_assignments`, `services_catalog`, `accommodation_services`, `lodger_services`, `energy_bills`, `energy_readings`, `energy_settlements`, `bulletins`.

### 1.4 Separación catálogos globales vs datos tenant
| Tipo | Ejemplos | Acceso |
|---|---|---|
| **Catálogo global** | `plans_catalog`, plantillas globales, config global | Lectura pública o superadmin |
| **Datos tenant** | `client_accounts`, `entities`, `accommodations`, `rooms`, `lodgers`... | RLS por `client_account_id` |

---

## 2. Seguridad y permisos

### 2.1 Roles y autorización centralizada
- Roles: `superadmin` / `admin` / `api` / `student` / `viewer`
- Resolución: `profiles.role` + `profiles.client_account_id`
- Cada Edge Function valida: **JWT válido → rol → tenant → reglas de plan**

### 2.2 Claves sensibles
- El frontend solo usa **ANON KEY** y el **JWT del usuario autenticado**.
- `SUPABASE_SERVICE_ROLE_KEY` solo vive en Edge Functions (variable de entorno Supabase).
- Nunca hardcodear claves en código fuente ni en `.vscode/settings.json`.
- El fichero `~/.windsurf/mcp_config.json` contiene tokens — **nunca commitear**.

### 2.3 Auditoría mínima obligatoria
Acciones que deben generar registro en `audit_log`:

| Acción | Entidad |
|---|---|
| Creación de cuenta | `client_accounts` |
| Cambio de plan | `client_accounts` |
| Alta/baja de entidad propietaria | `entities` |
| Alta/baja de alojamiento | `accommodations` |
| Alta/baja de inquilino | `lodgers` |
| Asignación/cambio de habitación | `lodger_room_assignments` |
| Reprogramación de cobros | `stripe_events` |
| Cambio de estado crítico | cualquier entidad |

---

## 3. Contratos de API (Edge Functions)

### 3.1 Formato de respuesta estándar
**Siempre** devolver:
```typescript
{
  ok: boolean,
  data?: any,
  error?: {
    code: string,       // e.g. "PLAN_LIMIT_EXCEEDED", "UNAUTHORIZED", "NOT_FOUND"
    message: string,    // mensaje legible
    detail?: any        // info adicional opcional
  }
}
```

### 3.2 Estados explícitos con fechas
Entidades con ciclo de vida usan:
- `status`: `active` / `inactive` / `suspended` / `cancelled`
- `created_at`, `updated_at` (automáticos via trigger)
- Si tiene vigencia: `start_date`, `end_date`, `deactivated_at`

---

## 4. Reglas por plan

### 4.1 Bloqueo en backend (obligatorio)
Los límites se validan en Edge antes de cualquier creación:
- `max_owner_entities` — al crear entidad propietaria
- `max_accommodations` — al crear alojamiento
- `max_rooms` — al crear habitación
- `max_admin_users` — al crear usuario admin

### 4.2 Warning en UI (recomendado)
La UI muestra avisos cuando el uso se acerca al límite (≥ 80%), pero el **bloqueo real es siempre backend**.

### 4.3 No permitir bajar límites por debajo del uso real
En cambio de plan: si `uso_actual > límite_nuevo` → bloquear y mostrar qué debe limpiar primero.

---

## 5. Modelado BBDD

### 5.1 Campos estándar obligatorios
Todas las tablas tenant-owned:
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
client_account_id uuid NOT NULL REFERENCES client_accounts(id),
status            text NOT NULL DEFAULT 'active',
created_at        timestamptz NOT NULL DEFAULT now(),
updated_at        timestamptz NOT NULL DEFAULT now()
```
Si tiene vigencia temporal: `start_date date`, `end_date date`, `deactivated_at timestamptz`.

### 5.2 Trigger `updated_at` automático
Todas las tablas con `updated_at` deben tener el trigger:
```sql
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON <tabla>
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
-- Requiere extensión: CREATE EXTENSION IF NOT EXISTS moddatetime;
```

### 5.3 Constraints y FK
- `UNIQUE` donde aplique: slug dentro del tenant, nombres clave únicos por tenant.
- FK con `ON DELETE` pensado: `CASCADE` solo donde sea seguro (ej: rooms → accommodations), `RESTRICT` donde no (ej: lodgers → client_accounts).
- Constraint parcial para unicidad de ocupación activa:
```sql
CREATE UNIQUE INDEX idx_room_active_assignment
  ON lodger_room_assignments(room_id)
  WHERE move_out_date IS NULL;
```

### 5.4 Soft delete vs suspend
- **`inactive`** (baja lógica): registro existe, no usable, no aparece en listados activos.
- **`suspended`**: estado temporal por impago o bloqueo; reversible automáticamente.
- **Nunca borrar físicamente** registros operativos (lodgers, assignments, bills).

---

## 6. Frontend

### 6.1 Rutas por portal
| Portal | Ruta login | Propósito |
|---|---|---|
| Comercial | `/v2/auth/login` | Web pública, CTA, registro |
| Admin/Gestor | `/v2/admin/auth/login` | Dashboard de gestión |
| Inquilino | `/v2/lodger/auth/login` | Panel del inquilino |

### 6.2 Theming por tenant
- Tras login, cargar branding del tenant (logo + colores) via `TenantProvider` → `whoami`.
- No renderizar el layout final hasta tener `tenantContext` resuelto.
- Aplicar tema a Ant Design via `ConfigProvider` con `token.colorPrimary` del tenant.

### 6.3 Componentes UI
- **Framework UI**: Ant Design 6.x (migración en curso desde Tailwind/inline styles).
- **Iconos**: `@ant-design/icons`.
- **Formularios**: `Form` de Ant Design con `rules` para validación.
- **Feedback**: `message.success/error` para operaciones, `Alert` para avisos persistentes.

### 6.4 Wizard
- Wizard reutilizable para auto-registro y provisión por superadmin.
- Distintas validaciones/steps según el origen (self-signup vs superadmin).

---

## 7. Pagos (Stripe) — Planificado

### 7.1 Stripe obligatorio en autoregistro
- No se permite tener plan activo sin pago confirmado (excepto provisión manual por superadmin).

### 7.2 Webhooks verificados
- Verificación de firma Stripe (`stripe-signature` header).
- Idempotencia: registrar `stripe_event_id` y rechazar duplicados.
- Actualizar estado en BBDD solo tras confirmación del webhook.

### 7.3 Cambio de plan con prorrateo
- Registrar eventos de facturación y cambios de estado.
- No parchear manualmente suscripciones; usar la API de Stripe para upgrades/downgrades.

---

## 8. DevOps y control de calidad

### 8.1 Entornos separados

| Entorno | Nombre Supabase | Project ID | Fichero .env | Script npm |
|---|---|---|---|---|
| **dev** | `SmartRoom Rental BD Dev` | `lqwyyyttjamirccdtlvl` | `.env.development` | `npm run dev` |
| **pre** | `SmartRoom Rental BD Pre` | *(pendiente crear)* | `.env.staging` | `npm run build:pre` |
| **prod** | `SmartRoom Rental BD Prod` | *(pendiente crear)* | `.env.production` | `npm run build` |

- Variables de entorno **nunca hardcodeadas** en código fuente.
- Todos los `.env.*` están en `.gitignore` — nunca se suben al repositorio.
- Renombrar el proyecto en el Dashboard de Supabase es cosmético — no afecta URLs, keys ni conexiones.

### 8.2 Testing mínimo
- Edge Functions: tests unit/integration con casos de rol, plan y tenant.
- Frontend: tests de componentes críticos (wizard, guards de ruta).

### 8.3 Convención de ramas Git
```
main        ← producción (solo merge desde develop o hotfix/*)
develop     ← integración (rama de trabajo habitual)
feature/*   ← nuevas funcionalidades (desde develop)
hotfix/*    ← correcciones urgentes en producción (desde main)
```

---

## 9. Regla de oro para Cascade

> **"No llames a Supabase directo desde el frontend para operaciones con lógica de negocio
> (crear/editar/borrar entidades, límites de plan, onboarding, cobros).
> Todo eso va por Edge Functions con validación de JWT + rol + tenant + plan.
> El frontend solo hace UI, validaciones simples y consume Edge."**

### Checklist antes de implementar cualquier operación nueva:
- [ ] ¿Tiene lógica de negocio o valida límites? → **Edge Function**
- [ ] ¿Es solo una lectura filtrada por tenant? → Puede ir directo con RLS
- [ ] ¿La tabla tiene RLS activa? → Verificar antes de exponer
- [ ] ¿La respuesta sigue el formato `{ ok, data, error }`? → Obligatorio en Edge
- [ ] ¿Se registra en `audit_log` si es acción crítica? → Verificar lista §2.3
- [ ] ¿Los campos `updated_at` tienen trigger? → Verificar en migración
