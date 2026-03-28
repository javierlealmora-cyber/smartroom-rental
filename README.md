# SmartRoom Rental Platform

Plataforma SaaS multi-tenant para gestión de alojamientos, habitaciones e inquilinos con facturación energética integrada.

---

## 🎯 Descripción

SmartRoom Rental es una plataforma completa para gestores de alojamientos que permite:

- **Gestión de Alojamientos:** Administrar múltiples propiedades y habitaciones
- **Gestión de Inquilinos:** Alta, asignación, check-out y historial completo
- **Facturación Energética:** Registro de consumos, liquidación y boletines
- **Multi-Tenancy:** Aislamiento total de datos entre clientes
- **3 Portales:** Comercial, Gestor e Inquilino
- **Branding Personalizado:** Logo y colores por cliente

---

## 🏗️ Stack Tecnológico

### Frontend
- **React 18** + **Vite**
- **Ant Design 6.x** - UI Components
- **React Router v6** - Routing
- **Context API** - State Management

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL 17 con RLS
  - Supabase Auth
  - Edge Functions (Deno)
  - Storage
- **Stripe** - Pagos y suscripciones

### Deployment
- **Vercel** - Frontend hosting
- **Supabase Cloud** - Backend
- **GitHub** - Version control

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase
- Cuenta de Vercel (opcional, para deployment)

### Instalación

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd smartroom-rental

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local

# Editar .env.local con tus credenciales:
# VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
# VITE_SUPABASE_ANON_KEY=tu-anon-key
# VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# 4. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

---

## 📁 Estructura del Proyecto

```
smartroom-rental/
├── src/                          # Código fuente
│   ├── components/               # Componentes React
│   ├── pages/                    # Páginas/Vistas
│   ├── providers/                # Context Providers
│   ├── services/                 # Servicios y APIs
│   ├── hooks/                    # Custom Hooks
│   └── router/                   # Route Guards
├── supabase/                     # Backend Supabase
│   ├── migrations/               # Migraciones SQL
│   ├── functions/                # Edge Functions
│   └── seeds/                    # Datos de prueba
├── docs/                         # Documentación
│   ├── requirements/             # Requisitos funcionales
│   ├── architecture/             # Arquitectura técnica
│   ├── database/                 # Base de datos
│   ├── devops/                   # DevOps y deployment
│   └── qa/                       # QA y testing
└── tests/                        # Tests E2E y unitarios
```

---

## 📚 Documentación

### Documentación Principal

- **[Índice General](./docs/README.md)** - Punto de entrada a toda la documentación
- **[Arquitectura](./docs/architecture/README.md)** - Arquitectura técnica del sistema
- **[Requisitos](./docs/requirements/README.md)** - Requisitos funcionales
- **[Base de Datos](./docs/database/README.md)** - Esquema y migraciones
- **[DevOps](./docs/devops/README.md)** - Deployment y operaciones
- **[QA](./docs/qa/README.md)** - Testing y calidad

### Guías Rápidas

- **[Setup Local](./docs/devops/environments.md#development-local)** - Configurar entorno local
- **[Deployment](./docs/devops/deployment.md)** - Proceso de deployment
- **[Migraciones](./docs/database/MIGRATION-RULES.md)** - Crear migraciones SQL
- **[Testing](./docs/qa/TEST-STRATEGY.md)** - Estrategia de testing

---

## 🔐 Autenticación

SmartRoom Rental tiene **3 portales de login** diferentes:

| Portal | URL | Usuarios |
|--------|-----|----------|
| **Comercial** | `/v2/auth/login` | Nuevos clientes (registro) |
| **Gestor** | `/v2/manager/auth/login` | Admin/Gestor |
| **Inquilino** | `/v2/lodger/auth/login` | Inquilinos |

### Credenciales de Prueba (Development)

```
Admin DYCSA:
  Email: basicdycsa@housingspacesolutions.com
  Password: (ver .env.local)

Inquilino:
  Email: user2dycsa@housingspacesolutions.com
  Password: Test1234!
```

---

## 🛠️ Comandos Disponibles

### Development

```bash
npm run dev              # Iniciar servidor de desarrollo
npm run build            # Build para producción
npm run preview          # Preview del build
npm run lint             # Ejecutar ESLint
```

### Testing

```bash
npm run test             # Ejecutar tests unitarios
npm run test:e2e         # Ejecutar tests E2E
npm run test:coverage    # Generar reporte de cobertura
```

### Supabase

```bash
supabase db push         # Aplicar migraciones
supabase functions deploy <name>  # Deploy Edge Function
supabase db reset        # Reset BD local
```

---

## 🌍 Entornos

### Development (Local)
- **Frontend:** http://localhost:5173
- **Supabase:** Project `lqwyyyttjamirccdtlvl`

### Staging
- **Frontend:** https://smartroom-rental-staging.vercel.app
- **Supabase:** Project `lopdwrsmkmtboeczxotj`

### Production
- **Frontend:** https://smartroomrentalplatform.com
- **Supabase:** Project `oeofdvkilcuidxainuow`

---

## 🏛️ Arquitectura

### Multi-Tenancy
- **Modelo:** Por columna `client_account_id`
- **Aislamiento:** Row Level Security (RLS) en PostgreSQL
- **Ventaja:** Una sola URL, múltiples clientes

### Jerarquía de Datos
```
client_accounts (Tenant)
  └── entities (Propietarias)
        └── accommodations (Alojamientos)
              └── rooms (Habitaciones)
                    └── lodger_room_assignments
                          └── lodgers (Inquilinos)
```

**Ver:** [Arquitectura Completa](./docs/architecture/overview.md)

---

## 🧪 Testing

### Estrategia
- **50% Tests Unitarios** - Componentes, hooks, utilidades
- **30% Tests de Integración** - APIs, Edge Functions
- **20% Tests E2E** - Flujos críticos de usuario

### Ejecutar Tests

```bash
# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e

# Cobertura
npm run test:coverage
```

**Ver:** [Estrategia de Testing](./docs/qa/TEST-STRATEGY.md)

---

## 🚀 Deployment

### Flujo de Ramas

```
develop (local)
    ↓ PR
staging (auto-deploy)
    ↓ PR
main (auto-deploy a producción)
```

### Deploy a Staging

```bash
git checkout staging
git merge develop
git push origin staging
# Vercel auto-deploya
```

### Deploy a Production

```bash
git checkout main
git merge staging
git push origin main
# Vercel auto-deploya
```

**Ver:** [Proceso de Deployment](./docs/devops/deployment.md)

---

## 📊 Estado del Proyecto

### Implementado ✅
- Autenticación multi-portal
- Gestión de alojamientos y habitaciones
- Gestión de inquilinos
- Asignación de habitaciones
- Facturación energética (parcial)
- Multi-tenancy con RLS
- Branding personalizado

### En Desarrollo 🚧
- Consumos energéticos (frontend)
- Liquidación automática
- Boletines energéticos
- Sistema de servicios completo

### Pendiente 📋
- Tests E2E completos
- CI/CD automatizado
- Monitoreo y alertas
- Backups automáticos

**Ver:** [Matriz de Trazabilidad](./docs/qa/TRACEABILITY-MATRIX.md)

---

## 🤝 Contribuir

### Flujo de Trabajo

1. Crear rama de feature desde `develop`
2. Desarrollar y commitear cambios
3. Crear PR a `develop`
4. Code review
5. Merge a `develop`
6. Testing en staging
7. Merge a `main` para producción

### Convenciones

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`)
- **Ramas:** `feature/nombre`, `fix/nombre`, `chore/nombre`
- **PRs:** Incluir descripción, tests y screenshots

---

## 📞 Soporte

### Documentación
- **Docs:** `./docs/README.md`
- **Architecture:** `./docs/architecture/`
- **DevOps:** `./docs/devops/`

### Enlaces Útiles
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Ant Design Docs](https://ant.design/components/overview/)

---

## 📄 Licencia

Privado - Todos los derechos reservados

---

## 👥 Equipo

- **Staff Engineer** - Arquitectura y desarrollo
- **Product Owner** - Requisitos y priorización
- **QA Lead** - Testing y calidad

---

**Última actualización:** 2026-03-28  
**Versión:** 1.0.0
