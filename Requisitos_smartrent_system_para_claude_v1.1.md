# Requisitos SmartRent System para Claude v1.1

> **ANÁLISIS FUNCIONAL - ESTRUCTURA DE PROYECTO**

---

## Estructura Lógica y Funcional del Sistema

```
ESTRUCTURA DEL SISTEMA
│
└── Cuenta Cliente
    │
    ├── Registro de Datos de Cuenta + Plan
    │   ├── Datos de la Cuenta = Nombre y apellidos, email, teléfono, fecha inicio
    │   ├── Selector Plan + Límites ** Ver Plan restricciones
    │   ├── Branding por Cuenta (logo + color)
    │   │   └── Storage: smartrent/{client_account_id}/entities/{entity_id}/docs/{doc_id}
    │   ├── Datos Entidad Pagadora (Type: Autónomo / Persona Física / Persona Jurídica)
    │   ├── User Admin (Nombre completo, email, teléfono) ** Ver Plan restricciones
    │   └── Métodos de Pago (Alta)
    │
    ├── Configuración de Cliente
    │   ├── Gestión Entidades Propietaria ** Ver Plan restricciones
    │   │   └── Datos Completos (Type: Autónomo / Persona Física / Persona Jurídica)
    │   ├── Creación Storage ** Ver Plan restricciones
    │   │   └── smartrent-systems/nombre-entidad
    │   ├── Contratación Servicios ** Ver Plan restricciones
    │   │   └── Visor y Selector de Servicios
    │   └── Cambio de Plan + Cancelación
    │       └── Visor y Selector de Planes
    │
    └── Entidad Propietaria registrada ** Ver Plan restricciones
        └── Alojamientos ** Ver Plan restricciones
            └── Habitaciones ** Ver Plan restricciones
                └── Ocupación
                    ├── Inquilinos
                    └── Consumo, Servicios, Boletines
```

---

## Reglas por Plan - Resumen Operativo

> **NOTA:** Estas reglas se definirán en la Gestión de Planes. Esto es un ejemplo de lo que se va a configurar.

### Plan Basic

| Característica | Restricción |
|----------------|-------------|
| Entidades Propietarias | Limitado a 1 |
| Cambio de owner | No permitido (no tiene sentido normalmente) |
| Límite por cuenta | Alojamientos/habitaciones con límite |

### Plan Investor / Business

| Característica | Restricción |
|----------------|-------------|
| Entidades Propietarias | 1..N permitido |
| Owner inmutable por alojamiento | No se puede reasignar alojamiento a otra entidad |
| Límite por cuenta | Suma total |

### Plan Agency

| Característica | Restricción |
|----------------|-------------|
| Entidades Propietarias | 1..N permitido |
| Cambio de owner en alojamientos | Permitido con condiciones |
| Requisitos para cambio de owner | Fecha efectiva + Registro de traspaso |
| Histórico | El histórico anterior se conserva |

---

## Estructura del Storage

```
smartrent/{client_account_id}/entities/{entity_id}/docs/{doc_id}
smartrent/{client_account_id}/entities/{entity_id}/logo/current.png
```

---

## Requisitos Estructurales

### 1. Log/Histórico en BBDD

Registra histórico de acciones críticas (mínimo):

| Entidad | Acciones |
|---------|----------|
| Cuenta Cliente | `create` \| `update` \| `change_plan` \| `suspend` \| `reactivate` \| `cancel` |
| Usuarios cuenta | `add_associated` \| `remove_associated` \| `change_holder` \| `update_user_data` |
| Branding | `change_theme` \| `change_logo` |
| Cobros | `create_schedule` \| `reschedule` \| `mark_processing` \| `mark_paid` \| `mark_failed` \| `mark_canceled` \| `evidence_uploaded` \| `approve_manual_payment` |
| Entidades/owners | `create` \| `update` \| `deactivate` |
| Seguridad | `login events` (opcional), cambios de rol (si existen) |

#### Campos típicos del log:

| Campo | Descripción |
|-------|-------------|
| `timestamp` | Fecha y hora del evento |
| `actor_user_id` | ID del usuario que ejecuta la acción |
| `target_type` | Tipo de entidad afectada (client_account, payment_schedule, etc.) |
| `target_id` | ID de la entidad afectada |
| `action` | Acción ejecutada |
| `before/after` | JSON resumido con el estado anterior y posterior |
| `notes` | Notas adicionales |

---

### 2. Impersonación - Definición Clara

#### Requisito de la impersonación

La impersonación permite:

- Probar RLS y menús como `admin`/`api`/`student`/`viewer`
- Reproducir errores reales del usuario
- Validar branding/tenant resolution como lo vive el usuario
- Soporte sin tocar datos manualmente

#### Implementación recomendada (solo visible para superusuario)

**En "Editar Cuenta Cliente" añadir botón:**
- "Entrar como Titular"
- "Entrar como Asociado1"
- "Entrar como Admin del tenant"

**Mostrar banner fijo durante impersonación:**
```
"Modo impersonación: {email}" + botón "Salir"
```

---

### 3. Plantillas de Comunicación (en Storage)

Se gestionan como archivos en Storage (no "hardcoded") para cada cuenta de cliente:

| Plantilla | Ruta |
|-----------|------|
| Onboarding Set Password | `templates/onboarding_set_password.md` |
| Payment Pending External | `templates/payment_pending_external.md` |
| Payment Failed Retry | `templates/payment_failed_retry.md` |
| Welcome Student | `templates/welcome_student.md` |

**Placeholders disponibles:**
- `{{client_account_name}}`
- `{{action_link}}`
- `{{user_name}}`
- `{{due_date}}`
- etc.

---

### 4. Estrategia de Acceso SaaS (Una Sola URL + Branding por Tenant)

#### URL única para todos
```
https://www.smartrentsystems.com
```

#### Login único
- Email + password para todos los roles

#### Flujo Post-Login

1. Se obtiene el perfil global del usuario (rol global) y la lista de tenants a los que pertenece (membresías)

2. **Si el usuario tiene 0 tenants:**
   - Mostrar error: "Usuario sin acceso asignado"

3. **Si el usuario tiene 1 tenant:**
   - Se selecciona automáticamente ese tenant

4. **Si el usuario tiene >1 tenants** (caso futuro permitido SOLO para admin):
   - Mostrar selector de Cuenta Cliente (tenant selector)
   - Listado de `client_accounts.display_name`
   - El usuario elige uno → tenant activo

#### Branding/Theming

| Aplicación | Descripción |
|------------|-------------|
| Header superior | Logo + color del tenant |
| Sidebar | Color/estilo del tenant |
| Botones principales | Color primary del tenant |
| Badges/estados | Si se parametriza |

**Comportamiento:**
- El sistema aplica logo + color primario según el tenant activo
- El cambio de tenant re-renderiza la UI con el branding del nuevo tenant

---

## Pantallas y Navegación - ROL SUPERADMIN

> **NOTA:** La codificación de pantallas está diseñada para identificar los ítems del proyecto en los comentarios del código.

### Estructura de Navegación Superadmin

```
ROL SUPERADMIN (ACCESO A TODO)
│
└── DBSU - Pantalla Dashboard
    │
    ├── DBSU-BR: Branding
    │   └── Nombre SmartRent Systems + Logo + Theme
    │
    ├── DBSU-NC: Acción Principal
    │   └── Botón Dashboard: "+ Nueva Cuenta Cliente"
    │
    ├── DBSU-K1: KPIs Grupo 1
    │   ├── Nº Cuentas Cliente activas/inactivas
    │   ├── Nº Entidades totales
    │   └── Nº Alojamientos totales
    │
    ├── DBSU-N2: KPIs Grupo 2
    │   ├── Nº Habitaciones totales
    │   └── Nº Alojamientos totales (si existe agregado %)
    │
    ├── DBSU-DP: Distribución por Plan (%)
    │
    ├── Accesos Rápidos
    │   ├── DBSU-VC: Ver todas (las Cuentas Clientes)
    │   ├── DBSU-CC: Crear Cuenta Cliente
    │   ├── DBSU-AR: Edición Cuenta Cliente (ver + editar/detalle)
    │   ├── DBSU-PC: Gestión de Planes de Clientes
    │   ├── DBSU-CG: Configuración Global
    │   ├── DBSU-GS: Gestión de Servicios
    │   ├── DBSU-GC: Gestión de Cobros
    │   └── DBSU-GP: Gestión de Plantillas de Comunicaciones
    │
    └── DBSU-UC: Listado con las últimas cuentas de clientes
```

---

## Tabla de Códigos de Pantallas - Dashboard Superadmin

| Código | Elemento | Descripción |
|--------|----------|-------------|
| **DBSU** | Dashboard Superadmin | Pantalla principal del Dashboard |
| **DBSU-BR** | Branding | Mostrar: Nombre SmartRent Systems + Logo + Theme |
| **DBSU-NC** | Nueva Cuenta | Botón Dashboard: "+ Nueva Cuenta Cliente" |
| **DBSU-K1** | KPIs Grupo 1 | Nº Cuentas Cliente, Nº Entidades, Nº Alojamientos |
| **DBSU-N2** | KPIs Grupo 2 | Nº Habitaciones, Ocupación agregada (%) |
| **DBSU-DP** | Distribución Plan | Gráfico de distribución por Plan (%) |
| **DBSU-VC** | Ver Cuentas | Acceso rápido: Ver todas las Cuentas Clientes |
| **DBSU-CC** | Crear Cuenta | Acceso rápido: Crear Cuenta Cliente |
| **DBSU-AR** | Editar Cuenta | Acceso rápido: Edición Cuenta Cliente (ver + detalle) |
| **DBSU-PC** | Planes | Acceso rápido: Gestión de Planes de Clientes |
| **DBSU-CG** | Config Global | Acceso rápido: Configuración Global |
| **DBSU-GS** | Servicios | Acceso rápido: Gestión de Servicios |
| **DBSU-GC** | Cobros | Acceso rápido: Gestión de Cobros |
| **DBSU-GP** | Plantillas | Acceso rápido: Gestión de Plantillas de Comunicaciones |
| **DBSU-UC** | Últimas Cuentas | Listado con las últimas cuentas de clientes |

---

## Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v1.1 | 2026-02-03 | Creación inicial del documento con estructura completa |

---

## Notas de Implementación

> **IMPORTANTE:** Todas las páginas que ya existan deberán ser modificadas para que se ajusten a estas especificaciones.

### Prioridades de Desarrollo

1. **Dashboard Superadmin (DBSU)** - Pantalla principal con KPIs y accesos rápidos
2. **Gestión de Cuentas Cliente** - CRUD completo con todas las secciones
3. **Sistema de Impersonación** - Para soporte y testing
4. **Log/Histórico** - Registro de todas las acciones críticas
5. **Plantillas de Comunicación** - Sistema de templates en Storage

### Consideraciones Técnicas

- Todos los códigos de pantalla (DBSU-XX) deben aparecer como comentarios en el código fuente
- El branding debe ser dinámico y cargarse desde la configuración del tenant
- El log debe ser auditable y no modificable
- Las plantillas deben soportar placeholders para personalización
