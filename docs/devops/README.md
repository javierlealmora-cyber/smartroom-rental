# DevOps - SmartRoom Rental

Documentación de operaciones, deployment y configuración de entornos.

---

## 📁 Estructura de Documentación

```
devops/
├── README.md              # Este archivo - Índice de DevOps
├── overview.md            # Visión general de infraestructura
├── environments.md        # Entornos (dev, staging, prod)
├── deployment.md          # Proceso de deployment
├── vercel-config.md       # Configuración de Vercel
├── edge-functions.md      # Deploy de Edge Functions
├── secrets.md             # Gestión de secretos
├── ci-cd.md               # Pipeline de CI/CD
└── operations.md          # Operaciones y troubleshooting
```

---

## 🌍 Entornos

### Development (Local)
- **Frontend:** http://localhost:5173
- **Supabase:** Project `lqwyyyttjamirccdtlvl`
- **Propósito:** Desarrollo local

### Staging (Pre-producción)
- **Frontend:** https://smartroom-rental-staging.vercel.app
- **Supabase:** Project `lopdwrsmkmtboeczxotj`
- **Propósito:** Testing antes de producción

### Production
- **Frontend:** https://smartroomrentalplatform.com
- **Supabase:** Project `oeofdvkilcuidxainuow` (pendiente migrar)
- **Propósito:** Aplicación en vivo

**Ver:** `environments.md` para detalles completos.

---

## 🚀 Deployment

### Flujo de Ramas

```
develop (local)
    ↓ PR
staging (auto-deploy a Vercel staging)
    ↓ PR
main (auto-deploy a Vercel production)
```

### Proceso
1. Desarrollo en `develop`
2. PR a `staging` → Deploy automático a staging
3. Testing en staging
4. PR a `main` → Deploy automático a producción

**Ver:** `deployment.md` para proceso completo.

---

## 🔐 Secretos y Variables

### Variables de Entorno

**Frontend (Vercel):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

**Backend (Supabase):**
- `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions)
- `STRIPE_SECRET_KEY` (Webhooks)

**GitHub Secrets:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `DEV_VERCEL_PROJECT_ID`
- `STAGING_VERCEL_PROJECT_ID`

**Ver:** `secrets.md` para gestión completa.

---

## 🛠️ Herramientas

### Vercel
- **Propósito:** Hosting frontend
- **Features:** Preview deployments, auto-deploy
- **Config:** `vercel-config.md`

### Supabase CLI
- **Propósito:** Migraciones, Edge Functions
- **Comandos:** `supabase db push`, `supabase functions deploy`
- **Config:** `edge-functions.md`

### GitHub Actions
- **Propósito:** CI/CD (futuro)
- **Config:** `ci-cd.md`

---

## 📚 Documentos de DevOps

### [overview.md](./overview.md)
Visión general de infraestructura, stack de deployment, arquitectura de red.

### [environments.md](./environments.md)
Detalles de cada entorno (URLs, project IDs, configuración).

### [deployment.md](./deployment.md)
Proceso completo de deployment, flujo de ramas, checklist.

### [vercel-config.md](./vercel-config.md)
Configuración de Vercel, secrets, password protection, dominios.

### [edge-functions.md](./edge-functions.md)
Deploy de Edge Functions, testing local, deployment a staging/prod.

### [secrets.md](./secrets.md)
Gestión de secretos, service role keys, .env.local, seguridad.

### [ci-cd.md](./ci-cd.md)
Pipeline de CI/CD, tests automáticos, deploy automático.

### [operations.md](./operations.md)
Monitoreo, logs, backups, troubleshooting, runbooks.

---

## 🔗 Referencias Cruzadas

### Con Architecture
- **Stack:** `overview.md` ↔ `docs/architecture/overview.md`
- **Secrets:** `secrets.md` ↔ `docs/architecture/security.md`

### Con Database
- **Migraciones:** `deployment.md` ↔ `docs/database/MIGRATION-RULES.md`
- **Backups:** `operations.md` ↔ `docs/database/README.md`

### Con Requirements
- **Deployment:** `deployment.md` ↔ Proceso en `docs/README.md`

---

## 🚀 Inicio Rápido

### Setup Local
```bash
# 1. Clonar repo
git clone <repo-url>
cd smartroom-rental

# 2. Instalar dependencias
npm install

# 3. Configurar .env.local
cp .env.example .env.local
# Editar .env.local con tus keys

# 4. Iniciar dev server
npm run dev
```

### Deploy a Staging
```bash
# 1. Merge a staging
git checkout staging
git merge develop
git push origin staging

# 2. Vercel auto-deploya
# 3. Verificar en staging URL
```

### Deploy a Production
```bash
# 1. Merge a main
git checkout main
git merge staging
git push origin main

# 2. Vercel auto-deploya
# 3. Verificar en producción
```

---

## 📝 Comandos Útiles

### Vercel
```bash
# Login
vercel login

# Deploy manual
vercel --prod

# Ver logs
vercel logs <deployment-url>
```

### Supabase
```bash
# Link a proyecto
supabase link --project-ref <project-id>

# Aplicar migraciones
supabase db push

# Deploy Edge Function
supabase functions deploy <function-name>

# Ver logs
supabase functions logs <function-name>
```

### Git
```bash
# Crear rama de feature
git checkout -b feature/nueva-funcionalidad

# Merge a staging
git checkout staging
git merge develop

# Merge a main
git checkout main
git merge staging
```

---

## ⚠️ Consideraciones Importantes

### Password Protection en Vercel
- **CRÍTICO:** Desactivar password protection en staging
- **Motivo:** Tests E2E no pueden autenticarse
- **Ver:** `vercel-config.md`

### Service Role Keys
- **CRÍTICO:** Nunca commitear en código
- **Ubicación:** Solo en .env.local y Supabase dashboard
- **Ver:** `secrets.md`

### Migraciones en Producción
- **CRÍTICO:** Siempre probar en staging primero
- **Backup:** Hacer backup antes de migrar
- **Ver:** `deployment.md`

---

## 🔄 Mantenimiento

### Actualizar Documentación
- Tras cambios en infraestructura
- Al añadir nuevos entornos
- Al cambiar proceso de deployment

### Revisar Secrets
- Rotar keys periódicamente
- Auditar accesos
- Documentar cambios

---

## 📞 Soporte

### Vercel
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs

### Supabase
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs

### GitHub
- Repo: (privado)
- Actions: https://github.com/<org>/<repo>/actions

---

**Última actualización:** 2026-03-28  
**Versión:** 1.0  
**Responsable:** DevOps Lead / Staff Engineer
