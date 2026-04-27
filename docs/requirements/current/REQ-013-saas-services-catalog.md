# REQ-013: Catálogo de Servicios SaaS (Add-ons)

**Estado:** 🟡 En diseño  
**Última actualización:** 2026-04-12  
**Versión:** 1.0  
**Autor:** Solution Architecture

---

## Objetivo

Proporcionar al superadmin un sistema genérico y reutilizable para crear, gestionar y activar servicios adicionales (add-ons SaaS) sobre las cuentas de cliente existentes, sin modificar la lógica de planes principales.

El primer add-on que usará este catálogo es **SmartAccessLock** (REQ-014).

---

## Alcance

### Incluye
- Gestión del catálogo de add-ons SaaS (superadmin)
- Planes y pricing por servicio
- Feature flags por plan
- Control de visibilidad y activación
- Suscripciones de clientes a add-ons
- Integración con Stripe (subscription item en suscripción existente)
- Vista por client_account del estado de sus add-ons

### No Incluye
- Gestión de planes principales (ya existe en planes_catalog)
- Facturación de cuentas (ya existe)
- Lógica interna de cada add-on (se documenta en REQ específico)

---

## Actores

| Actor | Rol |
|-------|-----|
| Superadmin | CRUD completo del catálogo; activar/desactivar por client_account |
| Client Admin | Solo lectura de sus suscripciones; puede contratar si visible |

---

## Reglas del Catálogo

### Servicios SaaS (`saas_services`)
- Cada servicio tiene un `code` único estable (`smart_access_lock`, `smart_energy`, etc.)
- Un servicio puede estar en estado: `draft` | `active` | `deprecated` | `disabled`
- Un servicio `draft` no es visible ni contratble por clientes
- Un servicio puede requerir activación manual por superadmin (`requires_manual_activation = true`)
- Un servicio puede ser visible/no visible en el catálogo del cliente independientemente de su estado

### Planes por Servicio (`saas_service_plans`)
- Un servicio puede tener varios planes (ej. Basic, Pro, Enterprise)
- Cada plan tiene periodo de facturación: `monthly` | `annual`
- Cada plan tiene su Stripe Price ID para crear subscription items
- Un plan puede tener `setup_fee` además del precio recurrente

### Feature Flags (`saas_service_features`)
- Cada plan tiene una lista de features habilitadas/deshabilitadas
- Permite diferenciación funcional entre planes sin cambiar código
- Feature codes están definidos por cada módulo

### Suscripciones (`saas_service_subscriptions`)
- Un client_account puede tener máximo una suscripción activa por servicio
- Estado: `pending` | `active` | `suspended` | `cancelled`
- Se vincula al `stripe_subscription_item_id` de la suscripción Stripe del cliente
- No crea un nuevo Stripe Customer — usa el `stripe_customer_id` del `client_account`

---

## Árbol de Pantallas — Superadmin

```
/v2/superadmin/
  saas-servicios/                          → Lista de servicios SaaS
    nuevo/                                 → Crear servicio
    :serviceId/                            → Detalle del servicio
      editar/                              → Editar metadatos
      planes/                              → Gestionar planes y pricing
      features/                            → Configurar feature flags por plan
      visibilidad/                         → Control de visibilidad por segmento
  
  cuentas/:clientAccountId/
    saas-servicios/                        → Lista de add-ons del cliente
      :subscriptionId/                     → Detalle suscripción
        activar/                           → Activar/cambiar plan
        suspender/                         → Suspender
```

---

## Flujo UI — Superadmin

### Crear y publicar un servicio add-on

**Paso 1 — Crear servicio** (`/v2/superadmin/saas-servicios/nuevo`)
- code (texto inmutable tras crear)
- nombre, descripción, icono
- estado inicial: `draft`
- requiere activación manual: sí/no

**Paso 2 — Definir planes** (`/:serviceId/planes`)
- Para cada plan: nombre, código, periodo facturación, precio, setup fee, stripe_price_id
- Puede coexistir plan monthly y annual para el mismo servicio

**Paso 3 — Configurar features** (`/:serviceId/features`)
- Toggle por feature_code para cada plan
- Campos numéricos para límites (max_locks, max_actors, etc.)

**Paso 4 — Control visibilidad** (`/:serviceId/visibilidad`)
- visible_in_catalog: sí/no (global)
- Futuro: visibilidad por segmento/plan principal del cliente

**Paso 5 — Activar para cliente** (`/cuentas/:id/saas-servicios`)
- Ver todos los add-ons del cliente
- Para cada uno: estado, plan, fecha activación, Stripe item ID
- Botón "Activar SmartAccessLock" → seleccionar plan → confirmar
- Genera registro en `saas_service_subscriptions`
- Opcional: crear subscription item en Stripe

---

## Modelo SQL

### `saas_services`
```sql
CREATE TABLE public.saas_services (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                      text        NOT NULL UNIQUE,
  name                      text        NOT NULL,
  description               text,
  icon_url                  text,
  status                    text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','active','deprecated','disabled')),
  visible_in_catalog        boolean     NOT NULL DEFAULT false,
  requires_manual_activation boolean    NOT NULL DEFAULT true,
  sort_order                int         NOT NULL DEFAULT 0,
  metadata                  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
```

### `saas_service_plans`
```sql
CREATE TABLE public.saas_service_plans (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_service_id           uuid        NOT NULL REFERENCES public.saas_services(id),
  code                      text        NOT NULL,
  name                      text        NOT NULL,
  description               text,
  billing_period            text        NOT NULL DEFAULT 'monthly'
                            CHECK (billing_period IN ('monthly','annual','one_time')),
  price_amount              numeric(10,2) NOT NULL DEFAULT 0,
  price_currency            text        NOT NULL DEFAULT 'EUR',
  setup_fee                 numeric(10,2) NOT NULL DEFAULT 0,
  stripe_price_id           text,
  is_active                 boolean     NOT NULL DEFAULT true,
  sort_order                int         NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (saas_service_id, code)
);
```

### `saas_service_features`
```sql
CREATE TABLE public.saas_service_features (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_service_plan_id      uuid        NOT NULL REFERENCES public.saas_service_plans(id),
  feature_code              text        NOT NULL,
  is_enabled                boolean     NOT NULL DEFAULT false,
  config                    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (saas_service_plan_id, feature_code)
);
```

### `saas_service_subscriptions`
```sql
CREATE TABLE public.saas_service_subscriptions (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  saas_service_id             uuid        NOT NULL REFERENCES public.saas_services(id),
  saas_service_plan_id        uuid        REFERENCES public.saas_service_plans(id),
  status                      text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','active','suspended','cancelled')),
  -- Stripe (reutiliza stripe_customer del client_account)
  stripe_subscription_id      text,
  stripe_subscription_item_id text,
  -- Periodos
  trial_ends_at               timestamptz,
  billing_starts_at           timestamptz,
  current_period_start        timestamptz,
  current_period_end          timestamptz,
  -- Lifecycle
  activated_at                timestamptz,
  activated_by                text,
  suspended_at                timestamptz,
  cancelled_at                timestamptz,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_account_id, saas_service_id)
);
```

---

## Estrategia Billing

### Principio
SmartAccessLock no crea un nuevo Stripe Customer. Usa el `stripe_customer_id` ya existente en `client_accounts`.

### Implementación
1. El client_account ya tiene una suscripción Stripe activa (su plan principal)
2. Al activar SmartAccessLock, se añade un `subscription item` a esa suscripción via Stripe API
3. `saas_service_subscriptions.stripe_subscription_item_id` guarda la referencia al item
4. Si el cliente no tiene suscripción Stripe activa, se crea una nueva en el mismo customer
5. Las renovaciones, cambios de plan y cancelaciones se gestionan a través del item en Stripe

### Edge Function: `sal-activate-subscription`
- Input: `{client_account_id, saas_service_plan_id, create_stripe_item: bool}`
- Lee `stripe_customer_id` del `client_account`
- Llama Stripe API para añadir subscription item
- Crea registro en `saas_service_subscriptions`
- Devuelve suscripción activa

---

## RLS

- `saas_services`, `saas_service_plans`, `saas_service_features`: SELECT público para authenticated; INSERT/UPDATE/DELETE solo superadmin
- `saas_service_subscriptions`: SELECT por `client_account_id = get_my_client_account_id()` o superadmin; INSERT/UPDATE solo superadmin o Edge Function con service_role

---

## Tests Asociados

| ID | Descripción |
|----|-------------|
| SaaS-01 | Superadmin crea servicio → visible en lista |
| SaaS-02 | Servicio en draft no visible para client_account |
| SaaS-03 | Plan se vincula al servicio correctamente |
| SaaS-04 | Feature flag habilitado en plan → accesible desde la API |
| SaaS-05 | Superadmin activa suscripción para client → status = active |
| SaaS-06 | Client sin suscripción activa no puede acceder al módulo |
| SaaS-07 | UNIQUE (client_account_id, saas_service_id) se cumple |

---

## Dependencias

- REQ-002 (client_accounts, stripe_customer_id)
- REQ-014 (SmartAccessLock — primer consumidor de este catálogo)
- Stripe API para subscription items
- Edge Function `sal-activate-subscription`
