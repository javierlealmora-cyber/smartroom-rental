# Documentación SmartRoom Rental

Sistema de gestión integral para alojamientos compartidos con multi-tenancy.

---

## 📁 Estructura de Documentación

```
docs/
├── README.md                          # Este archivo - índice general
├── requirements/                      # Requisitos y cambios del sistema
│   ├── README.md
│   ├── current/                       # Requisitos actuales consolidados
│   │   ├── REQ-001-auth-portals.md
│   │   ├── REQ-002-tenants-lifecycle.md
│   │   ├── REQ-003-room-assignment.md
│   │   └── REQ-004-energy-billing.md
│   └── changes/                       # Cambios propuestos/en curso
│       └── 2026/
│           ├── CHG-2026-03-28-add-no-overlap-assignment.md
│           └── CHG-2026-03-28-energy-settlement-rules.md
├── qa/                                # Quality Assurance
│   ├── README.md
│   ├── TEST-STRATEGY.md
│   ├── TEST-RULES.md
│   └── TRACEABILITY-MATRIX.md        # Matriz de trazabilidad
├── database/                          # Documentación de base de datos
│   ├── README.md
│   ├── MIGRATION-RULES.md
│   └── MIGRATION-INDEX.md
└── [archivos legacy]                  # Documentación existente
    ├── arquitectura.md
    ├── estructura-sistema.md
    ├── requisitos-funcionales.md
    └── ...
```

---

## 🔄 Flujo End-to-End: De Requisito a Producción

### 1️⃣ Nace una Necesidad
- Cliente solicita funcionalidad
- Bug detectado en producción
- Mejora técnica identificada

### 2️⃣ Crear Issue en GitHub
```
Título: [FEAT/BUG/TECH] Descripción corta
Labels: feature/bug/technical-debt, priority
Milestone: Sprint actual
```

### 3️⃣ Documentar Requisito o Cambio

#### Para Funcionalidad Nueva
Crear `docs/requirements/changes/YYYY/CHG-YYYY-MM-DD-descripcion.md`

#### Para Cambio en Requisito Existente
Actualizar `docs/requirements/current/REQ-XXX-nombre.md`

**Contenido mínimo:**
- Contexto y problema
- Solución propuesta
- Impacto funcional
- Impacto en base de datos
- Impacto en frontend
- Tests requeridos
- Criterios de aceptación

### 4️⃣ Implementar Código
```bash
# Crear rama
git checkout -b feature/issue-123-descripcion

# Implementar cambios
# - Frontend: src/
# - Backend: supabase/functions/
# - Tipos: src/types/
```

### 5️⃣ Crear Migración SQL (si aplica)
```bash
# Crear migración
cd supabase
./scripts/development/create-migration.sh [tipo] "descripcion"

# Tipos: schema, data, security, performance
```

**Ubicación:** `supabase/migrations/[tipo]/YYYYMMDDHHMMSS_descripcion.sql`

**Documentar en:** `docs/database/MIGRATION-INDEX.md`

### 6️⃣ Crear/Actualizar Tests
```bash
# Tests E2E
tests/e2e/[feature].spec.js

# Tests unitarios
src/[module]/__tests__/[component].test.js
```

**Documentar en:** `docs/qa/TEST-STRATEGY.md`

### 7️⃣ Actualizar Trazabilidad
Actualizar `docs/qa/TRACEABILITY-MATRIX.md`:
```markdown
| REQ/CHG | Issue | Código | Migración | Tests | Estado |
|---------|-------|--------|-----------|-------|--------|
| CHG-2026-03-28-xxx | #123 | src/... | 20260328... | test-xxx | ✅ Done |
```

### 8️⃣ Code Review y Merge
```bash
# PR en GitHub
# - Vincular issue
# - Referenciar REQ/CHG
# - Incluir screenshots si aplica
# - Verificar tests pasan

# Merge a main
git merge feature/issue-123-descripcion
```

### 9️⃣ Deployment
```bash
# Staging
supabase link --project-ref [staging-id]
supabase db push

# Producción (tras validación)
supabase link --project-ref lqwyyyttjamirccdtlvl
supabase db push
```

### 🔟 Consolidar Documentación
Si el cambio se consolida como parte del sistema:
- Integrar CHG en REQ correspondiente
- Actualizar `requirements/current/REQ-XXX.md`
- Marcar CHG como consolidado
- Actualizar matriz de trazabilidad

---

## 🎯 Tipos de Documentos

### REQ (Requisito Actual)
**Propósito:** Documentar funcionalidad consolidada del sistema

**Ubicación:** `docs/requirements/current/`

**Cuándo crear:**
- Nueva funcionalidad core del sistema
- Consolidación de múltiples CHG relacionados

**Estructura:**
```markdown
# REQ-XXX: Título

## Objetivo
## Alcance
## Reglas Actuales
## Casos Válidos
## Casos Inválidos
## Impacto Frontend
## Impacto Base de Datos
## Tests Asociados
## Issues Relacionados
## Observaciones
```

### CHG (Cambio Propuesto/En Curso)
**Propósito:** Documentar cambios específicos en desarrollo

**Ubicación:** `docs/requirements/changes/YYYY/`

**Cuándo crear:**
- Bug fix
- Mejora técnica
- Nueva feature en desarrollo
- Cambio en requisito existente

**Estructura:**
```markdown
# CHG-YYYY-MM-DD: Título

## Issue Origen
## Contexto
## Problema
## Cambio Requerido
## Impacto Funcional
## Impacto Base de Datos
## Impacto Frontend
## Tests Requeridos
## Migración Esperada
## Criterios de Aceptación
```

---

## 🔗 Integración con Supabase

La estructura de `supabase/` se mantiene intacta:

```
supabase/
├── migrations/              # Migraciones SQL versionadas
│   ├── baseline/           # Punto cero (inmutable)
│   ├── schema/             # Cambios de estructura
│   ├── data/               # Migraciones de datos
│   ├── security/           # RLS y constraints
│   └── performance/        # Índices y optimizaciones
├── seeds/                  # Datos de prueba
├── functions/              # Edge Functions
├── scripts/                # Scripts de utilidad
└── docs/                   # Documentación técnica de Supabase
```

**Relación:**
- `docs/database/MIGRATION-INDEX.md` → índice de `supabase/migrations/`
- `docs/requirements/` → contexto funcional de migraciones
- `docs/qa/TRACEABILITY-MATRIX.md` → conecta todo

---

## 📊 Matriz de Trazabilidad

La matriz conecta:
- **Requisito/Cambio** → qué se necesita
- **Issue** → tracking en GitHub
- **Código** → dónde se implementa
- **Migración** → cambios en BD
- **Tests** → cómo se valida
- **Estado** → progreso actual

Ver: `docs/qa/TRACEABILITY-MATRIX.md`

---

## 🧪 Quality Assurance

### Estrategia de Testing
Ver: `docs/qa/TEST-STRATEGY.md`

### Reglas de Testing
Ver: `docs/qa/TEST-RULES.md`

### Tests Existentes
- **E2E:** `tests/e2e/`
- **Unitarios:** `src/**/__tests__/`
- **Integración:** `tests/integration/`

---

## 📚 Documentación Legacy

Documentación existente que se mantiene:

### Arquitectura y Sistema
- `arquitectura.md` - Arquitectura general del sistema
- `estructura-sistema.md` - Estructura de componentes
- `estado-actual.md` - Estado actual del proyecto
- `reglas-proyecto.md` - Reglas de desarrollo

### Base de Datos
- `database-analysis.md` - Análisis de base de datos
- `storage-structure.md` - Estructura de storage

### Deployment
- `DEPLOYMENT.md` - Proceso de deployment
- `deploy-edge-function.md` - Deploy de Edge Functions
- `VERCEL_SETUP.md` - Configuración de Vercel

### Testing
- `testing-login.md` - Tests de autenticación

### Otros
- `CODE-REFACTORING.md` - Guía de refactoring
- `MAINTENANCE-MODE-CONTROL.md` - Control de modo mantenimiento
- `GIT-FINAL-CONFIGURATION.md` - Configuración de Git

---

## 🚀 Inicio Rápido

### Para Implementar Nueva Funcionalidad
1. Crear issue en GitHub
2. Crear `CHG-YYYY-MM-DD-descripcion.md`
3. Implementar código
4. Crear migración si aplica
5. Crear tests
6. Actualizar matriz de trazabilidad
7. PR y merge

### Para Consultar Requisito Actual
1. Ver `docs/requirements/current/`
2. Buscar REQ-XXX relacionado
3. Revisar tests asociados en matriz

### Para Crear Migración
1. Ver `docs/database/MIGRATION-RULES.md`
2. Usar script: `supabase/scripts/development/create-migration.sh`
3. Documentar en `docs/database/MIGRATION-INDEX.md`
4. Vincular con REQ/CHG en matriz

---

## 🔍 Búsqueda Rápida

**Buscar por funcionalidad:**
```bash
grep -r "palabra clave" docs/requirements/current/
```

**Buscar migración:**
```bash
grep -r "tabla_nombre" docs/database/MIGRATION-INDEX.md
```

**Buscar test:**
```bash
grep -r "describe.*funcionalidad" tests/
```

---

## 📝 Convenciones

### Nomenclatura
- **REQ:** `REQ-XXX-nombre-descriptivo.md` (XXX = número secuencial)
- **CHG:** `CHG-YYYY-MM-DD-descripcion-corta.md`
- **Issues:** `[FEAT/BUG/TECH] Descripción`
- **Migraciones:** `YYYYMMDDHHMMSS_descripcion.sql`

### Formato Markdown
- Usar headers `#` para estructura
- Usar listas `-` para items
- Usar code blocks ` ``` ` para código
- Usar tablas para matrices

### Commits
```
tipo(scope): descripción corta

Refs: #issue-number
Docs: REQ-XXX o CHG-YYYY-MM-DD
Migration: YYYYMMDDHHMMSS_nombre.sql (si aplica)
```

---

## 🤝 Contribuir

1. Leer este README completo
2. Revisar `docs/qa/TEST-RULES.md`
3. Revisar `docs/database/MIGRATION-RULES.md`
4. Seguir flujo end-to-end
5. Mantener trazabilidad actualizada

---

## 📞 Contacto y Soporte

- **Repositorio:** GitHub (privado)
- **Producción:** https://smartroomrentalplatform.com
- **Supabase Project:** lqwyyyttjamirccdtlvl

---

**Última actualización:** 2026-03-28  
**Versión:** 1.0.0
