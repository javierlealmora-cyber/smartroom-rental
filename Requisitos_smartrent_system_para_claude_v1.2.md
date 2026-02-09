# Requisitos SmartRent System para Claude v1.2

> **ANALISIS FUNCIONAL - ESTRUCTURA DE PROYECTO**

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
├── DBSU - Pantalla Dashboard
│   │
│   ├── DBSU-BR: Branding
│   │   └── Nombre SmartRent Systems + Logo + Theme
│   │
│   ├── DBSU-NC: Acción Principal
│   │   └── Botón Dashboard: "+ Nueva Cuenta Cliente"
│   │
│   ├── DBSU-K1: KPIs Grupo 1
│   │   ├── Nº Cuentas Cliente activas/inactivas
│   │   ├── Nº Entidades totales
│   │   └── Nº Alojamientos totales
│   │
│   ├── DBSU-N2: KPIs Grupo 2
│   │   ├── Nº Habitaciones totales
│   │   └── Nº Alojamientos totales (si existe agregado %)
│   │
│   ├── DBSU-DP: Distribución por Plan (%)
│   │
│   ├── Accesos Rápidos
│   │   ├── DBSU-VC: Ver todas (las Cuentas Clientes)
│   │   ├── DBSU-CC: Crear Cuenta Cliente
│   │   ├── DBSU-AR: Edición Cuenta Cliente (ver + editar/detalle)
│   │   ├── DBSU-PC: Gestión de Planes de Clientes
│   │   ├── DBSU-CG: Configuración Global
│   │   ├── DBSU-GS: Gestión de Servicios
│   │   ├── DBSU-GC: Gestión de Cobros
│   │   └── DBSU-GP: Gestión de Plantillas de Comunicaciones
│   │
│   └── DBSU-UC: Listado con las últimas cuentas de clientes
│
├── Gestión Cuenta Cliente
│   │
│   ├── DBSU-VC-LI: Lista de Cuentas de Clientes
│   │   ├── Columnas: Nombre, Plan, Estado, Fecha alta, Fecha inicio, Fecha fin, Branding
│   │   ├── Acciones en lista: Ver / Editar / Suspender / Reactivar / Borrar lógico
│   │   ├── Filtros: Buscar por nombre, Filtrar por plan, Filtrar por estado
│   │   └── Acciones pantalla: Crear nueva, Detalle/Edición
│   │
│   ├── DBSU-CC-CR: Crear Cuenta Cliente
│   │   ├── Sección A: Datos del Contrato Cliente
│   │   ├── Sección B: Branding (visible según plan)
│   │   ├── Sección C: Entidad Pagadora
│   │   ├── Sección D: Usuario admin inicial (max 3)
│   │   └── Acciones: Crear / Cancelar
│   │
│   └── DBSU-AR-ED: Edición Cuenta Cliente
│       ├── Editar: Datos Contrato, Branding, Entidad Pagadora, Usuarios
│       ├── Acciones usuario: Cambiar titular, Editar datos, Añadir asociado
│       └── Acciones: Guardar / Suspender / Reactivar / Cancelar
│
└── DBSU-PC: Gestión de Planes de Cliente
    │
    ├── DBSU-PC-LI: Lista de Planes
    │   ├── Columnas: Nombre, Código, Estado, Visible, Fechas, Precios, Límites
    │   ├── Filtros: Nombre/código, Estado, Vigente hoy, Visible nuevas altas
    │   └── Acciones: Ver / Editar / Activar-Desactivar / Programar caducidad
    │
    ├── DBSU-PC-CR: Crear Plan de Cliente
    │   ├── Identidad: Nombre, Código, Descripción
    │   ├── Estado y vigencia: Estado, Visible, Fechas
    │   ├── Pricing: Mensual, Anual, IVA
    │   ├── Límites: Owners, Alojamientos, Habitaciones, Usuarios
    │   ├── Branding: Editable, Logo, Tema
    │   ├── Servicios incluidos: Multi-select dinámico
    │   ├── Reglas funcionales: Multi-owner, Cambio owner, Resguardo
    │   └── Acciones: Crear / Cancelar
    │
    └── DBSU-PC-ED: Editar Plan de Cliente
        ├── Editar: Identidad, Estado, Pricing, Límites, Branding, Servicios, Reglas
        └── Acciones: Guardar / Desactivar
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

## Tabla de Códigos - Gestión Cuenta Cliente

| Código | Elemento | Descripción |
|--------|----------|-------------|
| **DBSU-VC-LI** | Lista Cuentas | Pantalla: Ver todas las Cuentas de Clientes |
| **DBSU-CC-CR** | Crear Cuenta | Pantalla: Crear Cuenta Cliente |
| **DBSU-AR-ED** | Editar Cuenta | Pantalla: Edición Cuenta Cliente (ver + editar/detalle) |

---

## Detalle DBSU-VC-LI: Lista de Cuentas de Clientes

### Columnas a Mostrar

| Columna | Campo |
|---------|-------|
| Nombre Cuenta Cliente | `display_name` |
| Plan | Basic / Investor / Business / Agencia |
| Estado | active / suspended / canceled |
| Fecha alta | `created_at` |
| Fecha inicio | `start_date` |
| Fecha fin | `end_date` (si existe) |
| Branding | Logo sí/no |

### Acciones en Lista

- Ver detalle
- Editar
- Suspender
- Reactivar
- Borrar lógico

### Filtros

- Buscar por nombre
- Filtrar por plan
- Filtrar por estado

### Acciones de Pantalla

- Crear nueva Cuenta Cliente
- Acceder a Detalle/Edición

---

## Detalle DBSU-CC-CR: Crear Cuenta Cliente

### Sección A: Datos del Contrato Cliente (client_accounts)

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|-------|
| Nombre y Apellidos | texto | Sí | |
| Slug | texto | Sí | Único, auto-sugerido, NO mostrar en UI |
| Plan | select | Sí | Basic / Investor / Business / Agencia |
| Tipo de Pago | select | Sí | Anual / Mensual |
| Estado | select | No | Por defecto: active |
| Fecha inicio | date | No | Por defecto: hoy |
| Fecha vigencia | date | No | Opcional |

### Sección B: Branding (visible según plan)

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|-------|
| Nombre de la Entidad | texto | No | |
| Color primario | color (hex) | No | |
| Color secundario | color (hex) | No | |
| Logo URL | file/url | No | Upload o URL |

### Sección C: Entidad Pagadora

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|-------|
| Tipo de entidad | select | Sí | Persona física / Autónomo / Jurídica |
| Nombre fiscal | texto | Condicional | Solo si Jurídica |
| Nombre y Apellidos | texto | Condicional | Si física/autónomo: Apellido 1 y Apellido 2 |
| CIF/NIF | texto | Sí | |
| Provincia | texto | Sí | |
| Ciudad | texto | Sí | |
| CP | texto | Sí | |
| Calle | texto | Sí | |
| Número | texto | Sí | |
| País | select | Sí | |
| Email facturación | email | Sí | |
| Teléfono | tel | Sí | |

### Sección D: Usuario Admin Inicial (max 3)

| Usuario | Campos |
|---------|--------|
| Admin1 (Titular) | Email (obligatorio), Nombre completo, Teléfono |
| Asociado1 | Email (obligatorio), Nombre completo, Teléfono |
| Asociado2 | Email (obligatorio), Nombre completo, Teléfono |

### Acciones

- **Crear (submit)** - Posicionar en parte superior derecha
- **Cancelar** - Posicionar en parte superior derecha

### Validaciones

- Slug único
- Email admin no duplicado si se crea usuario nuevo
- Plan coherente con reglas (ver sección "reglas por plan")

---

## Detalle DBSU-AR-ED: Edición Cuenta Cliente

### Campos Editables

- Datos del Contrato Cliente
- Branding (según plan)
- Datos empresa pagadora (account)
- Entidad Pagadora
- Usuarios (titular + asociados)

### Acciones de Usuario

| Acción | Descripción |
|--------|-------------|
| Cambiar titular | Entre los 3 admin y asociados |
| Editar datos usuarios | Nombre / teléfono / email |
| Añadir asociado | Si hay hueco disponible |

### Validaciones

- Solo 1 titular permitido

### Acciones de Pantalla

- Guardar cambios
- Suspender cuenta
- Reactivar cuenta
- Cancelar cuenta

---

## Tabla de Códigos - Gestión de Planes

| Código | Elemento | Descripción |
|--------|----------|-------------|
| **DBSU-PC** | Gestión Planes | Módulo completo de gestión de planes |
| **DBSU-PC-LI** | Lista Planes | Pantalla: Lista de Planes de Cliente |
| **DBSU-PC-CR** | Crear Plan | Pantalla: Crear Plan de Cliente |
| **DBSU-PC-ED** | Editar Plan | Pantalla: Editar Plan de Cliente |

---

## Detalle DBSU-PC-LI: Lista de Planes de Cliente

### Acción Principal

- **"+ Nuevo Plan (plantilla)"** - Botón en pantalla

### Columnas a Mostrar

| Grupo | Campos |
|-------|--------|
| Columnas 1 | Nombre del plan, Código (basic/investor/business/agency) |
| Columnas 2 | Estado del plan, Visible para nuevas altas (sí/no) |
| Columnas 3 | Fecha creación, Fecha inicio vigencia, Fecha fin vigencia |
| Columnas 4 | Fecha baja, Motivo (opcional) |
| Columnas 5 | Precio mensual, Precio anual, IVA aplica (%) |
| Columnas 6 | Límites (resumen): Max Owners, Max Alojamientos, Max Habitaciones, Max Usuarios |

### Filtros de Búsqueda

- Buscar por nombre/código
- Filtrar por estado
- Filtrar por "vigente hoy" (sí/no)
- Filtrar por "visible para nuevas altas" (sí/no)

### Acciones en Columnas

- Ver
- Editar
- Activar/Desactivar para nuevas altas (toggle)
- Programar caducidad (set end_date)
- Desactivar (borrado lógico) → set estado + deactivated_at

### Validaciones

- Código único por plan

---

## Detalle DBSU-PC-CR: Crear Plan de Cliente

### Campos del Formulario

#### 1. Identidad del Plan

| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| Nombre | texto | Sí |
| Código | texto | Sí (único) |
| Descripción | textarea | No |

#### 2. Estado y Vigencia

| Campo | Tipo | Notas |
|-------|------|-------|
| Estado inicial | select | Por defecto: draft o active |
| Visible para nuevas altas | toggle | Por defecto: sí si active |
| Fecha creación | auto | Automático |
| Fecha inicio vigencia | date | Por defecto: hoy |
| Fecha fin vigencia | date | Opcional |

#### 3. Pricing

| Campo | Tipo | Notas |
|-------|------|-------|
| Precio mensual | number | Obligatorio |
| Descuento anual | number | Meses gratis, por defecto 2 |
| Precio anual | number | Auto-calculado o editable |
| IVA aplica | toggle | Sí/no |
| % IVA | number | Por defecto desde Config Global |

#### 4. Límites del Plan

| Campo | Descripción |
|-------|-------------|
| Max Entidades Propietarias | Número de owners permitidos |
| Max Alojamientos | Número de alojamientos permitidos |
| Max Habitaciones | Número de habitaciones permitidas |
| Max Usuarios Admin | Hasta 3 según decisión de cuenta |
| Max Usuarios Asociados | 0..2 típicamente |
| Max Usuarios API | Usuarios de integración |
| Max Usuarios Viewer | Usuarios de solo lectura |

#### 5. Branding Habilitado

| Campo | Tipo |
|-------|------|
| Branding editable | toggle (sí/no) |
| Logo permitido | toggle (sí/no) |
| Tema editable | toggle (sí/no) |

#### 6. Servicios Incluidos (dinámicos)

Multi-select con opciones:
- lavanderia
- encuestas
- limpieza
- tickets_incidencias
- whatsapp_soporte
- informes_avanzados

#### 7. Reglas Funcionales

| Campo | Tipo | Notas |
|-------|------|-------|
| Permite multi-owner | toggle | Sí/no |
| Permite cambio de owner | toggle | Solo Agencia: sí |
| Permite subir resguardo | toggle | Si cobro externo |

### Validaciones

- No permitir valores negativos
- Si estado = active → start_date obligatorio
- Si "Permite multi-owner" = no → Max Owners debe ser 1

### Acciones

- **Crear Plan**
- **Cancelar**

---

## Detalle DBSU-PC-ED: Editar Plan de Cliente

### Campos Editables

#### 1. Identidad

- Nombre
- Descripción
- Estado

#### 2. Estado y Vigencia

| Campo | Notas |
|-------|-------|
| Estado | Ver catálogo de estados |
| Visible para nuevas altas | toggle sí/no |
| start_date / end_date | Fechas de vigencia |
| Fecha baja (deactivated_at) | Solo lectura si desactivado |
| Motivo baja | Opcional |

#### 3. Pricing

- Precio mensual
- Precio anual
- IVA

#### 4. Límites del Plan

- Todos los campos de límites

#### 5. Branding Permitido

- Todos los toggles de branding

#### 6. Servicios Incluidos

- Multi-select de servicios

#### 7. Reglas Funcionales

- Multi-owner
- Cambio owner
- etc.

### Validaciones

- No permitir bajar límites por debajo del uso real (warning + bloqueo)

### Acciones

- **Guardar cambios**
- **Desactivar plan** (si no está en uso; si está, solo "inactivar para nuevas cuentas")

---

## Catálogo de Estados de Plan

| Estado | Descripción |
|--------|-------------|
| `draft` | Borrador, no visible |
| `active` | Activo y disponible |
| `inactive` | Inactivo para nuevas altas |
| `deprecated` | Obsoleto, solo para cuentas existentes |
| `deactivated` | Desactivado completamente |

---

## Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v1.2 | 2026-02-03 | Añadido detalle completo de Gestión de Planes (DBSU-PC-LI, DBSU-PC-CR, DBSU-PC-ED) |
| v1.1 | 2026-02-03 | Creación inicial del documento con estructura completa |

---

## Notas de Implementación

> **IMPORTANTE:** Todas las páginas que ya existan deberán ser modificadas para que se ajusten a estas especificaciones.

### Prioridades de Desarrollo

1. **Dashboard Superadmin (DBSU)** - Pantalla principal con KPIs y accesos rápidos
2. **Gestión de Cuentas Cliente** - CRUD completo con todas las secciones
3. **Gestión de Planes de Cliente** - CRUD completo con plantilla unificada
4. **Sistema de Impersonación** - Para soporte y testing
5. **Log/Histórico** - Registro de todas las acciones críticas
6. **Plantillas de Comunicación** - Sistema de templates en Storage

### Consideraciones Técnicas

- Todos los códigos de pantalla (DBSU-XX) deben aparecer como comentarios en el código fuente
- El branding debe ser dinámico y cargarse desde la configuración del tenant
- El log debe ser auditable y no modificable
- Las plantillas deben soportar placeholders para personalización
- Los límites de plan deben validarse en tiempo real contra el uso actual
