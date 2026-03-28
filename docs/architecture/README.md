# Arquitectura Técnica - SmartRoom Rental

Documentación técnica de la arquitectura del sistema SmartRoom Rental.

---

## 📁 Estructura de Documentación

```
architecture/
├── README.md              # Este archivo - Índice de arquitectura
├── overview.md            # Visión general del sistema
├── frontend.md            # Arquitectura frontend (React)
├── backend.md             # Arquitectura backend (Supabase)
├── data-model.md          # Modelo de datos y jerarquía
├── security.md            # Seguridad y multi-tenancy
├── storage.md             # Estructura de Storage
└── adr/                   # Architecture Decision Records
    ├── ADR-TEMPLATE.md
    ├── ADR-001-use-supabase.md
    ├── ADR-002-use-vercel.md
    └── ADR-003-multi-tenant-by-column.md
```

---

## 🎯 Stack Tecnológico

### Frontend
- **Framework:** React 18 + Vite
- **Routing:** react-router-dom v6
- **UI:** Ant Design 6.x + @ant-design/icons
- **Estado:** Context API (AuthProvider, TenantProvider, ThemeProvider)
- **HTTP:** Supabase Client + Edge Functions

### Backend
- **BaaS:** Supabase
  - **Auth:** Supabase Auth (email/password)
  - **Database:** PostgreSQL 17
  - **Storage:** Supabase Storage
  - **Functions:** Edge Functions (Deno)
- **Pagos:** Stripe (Checkout Sessions + Webhooks)
- **Batch:** n8n (planificado)

### Deployment
- **Frontend:** Vercel
- **Backend:** Supabase Cloud
- **Repo:** GitHub (main = producción)

---

## 🏗️ Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIOS FINALES                          │
│  - SuperAdmin  - Admin/Gestor  - Inquilino                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React + Vite)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   3 Portales │  │   Providers  │  │ Route Guards │      │
│  │   de Login   │  │ Auth/Tenant  │  │   + Roles    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  Deployed on: Vercel                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Supabase)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Supabase    │  │  PostgreSQL  │  │   Storage    │      │
│  │    Auth      │  │   + RLS      │  │   Buckets    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │     Edge     │  │    Stripe    │                         │
│  │  Functions   │  │   Webhooks   │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Conceptos Clave

### Multi-Tenancy
- **Modelo:** Por columna `client_account_id`
- **Aislamiento:** Row Level Security (RLS) en PostgreSQL
- **Ventaja:** Una sola URL, múltiples tenants
- **Ver:** `security.md` para detalles

### 3 Portales de Login
- **Comercial:** `/v2/auth/login` - Web pública + CTA
- **Gestor:** `/v2/manager/auth/login` - Acceso directo admin
- **Inquilino:** `/v2/lodger/auth/login` - Acceso directo lodger
- **Ver:** `frontend.md` para detalles

### Edge-First Backend
- **Escrituras:** Siempre por Edge Functions
- **Lecturas:** Directas con RLS (ANON key)
- **Lógica de negocio:** En Edge Functions
- **Ver:** `backend.md` para detalles

### Jerarquía de Datos
```
client_accounts (Tenant)
  └── entities (Propietarias)
        └── accommodations (Alojamientos)
              └── rooms (Habitaciones)
                    └── lodger_room_assignments
                          └── lodgers (Inquilinos)
```
- **Ver:** `data-model.md` para modelo completo

---

## 📚 Documentos de Arquitectura

### [overview.md](./overview.md)
Visión general del sistema, stack completo, flujos principales.

### [frontend.md](./frontend.md)
Estructura de carpetas, componentes, providers, hooks, servicios.

### [backend.md](./backend.md)
Edge Functions, tablas, RLS, funciones SQL, triggers.

### [data-model.md](./data-model.md)
Modelo de datos completo, jerarquía, límites por plan, reglas de negocio.

### [security.md](./security.md)
Multi-tenancy, RLS, roles, permisos, gestión de secretos, auditoría.

### [storage.md](./storage.md)
Estructura de paths, buckets, políticas de acceso.

### [adr/](./adr/)
Architecture Decision Records - Decisiones técnicas documentadas.

---

## 🔗 Referencias Cruzadas

### Con Requirements
- **REQ-001:** Auth Portals → `frontend.md` (3 portales)
- **REQ-002:** Tenants Lifecycle → `security.md` (multi-tenancy)
- **REQ-003:** Room Assignment → `data-model.md` (jerarquía)
- **REQ-004:** Energy Billing → `backend.md` (Edge Functions)

### Con Database
- **Tablas:** `data-model.md` ↔ `docs/database/MIGRATION-INDEX.md`
- **RLS:** `security.md` ↔ `docs/database/MIGRATION-RULES.md`

### Con DevOps
- **Deployment:** `overview.md` ↔ `docs/devops/deployment.md`
- **Secrets:** `security.md` ↔ `docs/devops/secrets.md`

---

## 🚀 Inicio Rápido

### Para Desarrolladores Nuevos
1. Leer `overview.md` - Visión general
2. Leer `frontend.md` - Estructura de código
3. Leer `data-model.md` - Entender el modelo
4. Revisar ADRs - Decisiones clave

### Para Arquitectos
1. Revisar todos los ADRs
2. Leer `security.md` - Modelo multi-tenant
3. Leer `backend.md` - Edge Functions
4. Consultar `data-model.md` - Límites y reglas

### Para DevOps
1. Leer `overview.md` - Stack
2. Ver `docs/devops/` - Deployment
3. Consultar `security.md` - Secretos

---

## 📝 Convenciones

### Diagramas
- Usar ASCII art para diagramas simples
- Mermaid para diagramas complejos (si se añade soporte)

### Código
- Ejemplos en TypeScript/JavaScript
- SQL para queries y migraciones

### Referencias
- Links relativos entre documentos
- Links absolutos para externos

---

## 🔄 Mantenimiento

### Actualizar Documentación
- Tras cambios arquitectónicos significativos
- Al añadir nuevas tecnologías
- Al tomar decisiones técnicas importantes

### Crear ADR
- Para decisiones que afectan múltiples componentes
- Para trade-offs significativos
- Para cambios de dirección técnica

---

**Última actualización:** 2026-03-28  
**Versión:** 1.0  
**Responsable:** Staff Engineer / Tech Lead
