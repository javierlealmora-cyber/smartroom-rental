# 📁 Estructura de Testing - FASE 1 SDLC

Estructura de carpetas para testing BDD y E2E del proyecto SmartRoom Rental.

---

## 🗂️ Estructura Completa

```
smartroom-rental/
│
├── supabase/
│   ├── migrations/                    # Migraciones SQL (existente)
│   └── static-data/                   # ⭐ NUEVO - Datos estáticos/parámetros de producto
│       ├── README.md                  # Documentación
│       ├── 01_plans_catalog.sql       # Scripts SQL idempotentes
│       ├── 02_service_types.sql
│       └── 03_system_config.sql
│
├── src/
│   └── tests/
│       ├── features/                  # ⭐ NUEVO - Tests BDD (generados por Claude AI)
│       │   ├── README.md              # Guía de BDD workflow
│       │   ├── auth/                  # Tests de autenticación
│       │   ├── accommodations/        # Tests de alojamientos
│       │   ├── rooms/                 # Tests de habitaciones
│       │   ├── lodgers/               # Tests de inquilinos
│       │   └── services/              # Tests de servicios
│       │
│       ├── auth/                      # Tests unitarios existentes
│       ├── alojamientos/
│       └── ...
│
├── tests/
│   └── e2e/                           # ⭐ NUEVO - Tests End-to-End (Playwright)
│       ├── README.md                  # Guía de E2E testing
│       ├── specs/                     # Test specs
│       │   ├── smoke.spec.js          # Tests críticos @smoke
│       │   ├── auth.spec.js           # Flujos de autenticación
│       │   ├── accommodations.spec.js # Flujos de alojamientos
│       │   └── ...
│       └── fixtures/                  # Helpers y fixtures
│           └── auth.fixture.js        # Autenticación pre-configurada
│
└── playwright.config.js               # ⭐ NUEVO - Configuración Playwright
```

---

## 📋 Responsabilidades por Carpeta

### 1️⃣ `supabase/static-data/` - JAVIER (Product Owner)

**Propósito**: Scripts SQL idempotentes para datos base del sistema.

**Contenido**:
- Catálogos de planes de suscripción
- Tipos de servicios
- Configuraciones del sistema
- Datos que son idénticos en todos los entornos

**Ejemplo**:
```sql
-- 01_plans_catalog.sql
INSERT INTO plans_catalog (code, name, monthly_price, ...)
VALUES ('basic', 'Plan Basic', 29.99, ...)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price;
```

**NO incluir**: Datos de usuarios, datos transaccionales, credenciales.

---

### 2️⃣ `src/tests/features/` - CLAUDE AI (Test Generator)

**Propósito**: Tests BDD basados en criterios de aceptación del Issue.

**Workflow**:
1. **JAVIER** crea Issue con criterios de aceptación
2. **CLAUDE** lee el Issue y genera tests en formato Given-When-Then
3. **CLAUDE** crea los tests en la rama `feature/issue-xxx-*`
4. **CASCADE** implementa código para hacer pasar los tests

**Estructura de subcarpetas**:
```
features/
├── auth/
│   ├── login.test.js              # Tests de login
│   ├── register.test.js           # Tests de registro
│   └── password-recovery.test.js  # Tests de recuperación
├── accommodations/
│   ├── create.test.js
│   ├── update.test.js
│   └── delete.test.js
├── rooms/
├── lodgers/
└── services/
```

**Formato de tests (Claude debe seguir esto)**:
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { login } from '@/services/authService';

describe('Feature: User Login', () => {
  
  it('should login with valid credentials', async () => {
    // Given: Usuario con credenciales válidas
    const credentials = { 
      email: 'test@example.com', 
      password: 'password123' 
    };
    
    // When: Usuario intenta hacer login
    const result = await login(credentials);
    
    // Then: Login es exitoso y retorna token
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    // Given: Credenciales inválidas
    const credentials = { 
      email: 'wrong@example.com', 
      password: 'wrongpass' 
    };
    
    // When: Usuario intenta hacer login
    const result = await login(credentials);
    
    // Then: Login falla con mensaje de error
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid credentials');
  });
});
```

**Ejecución**:
```bash
npm run test:features           # Todos los features
npm run test:auth               # Solo autenticación
npm run test:accommodations     # Solo alojamientos
```

---

### 3️⃣ `tests/e2e/specs/` - CLAUDE AI (E2E Test Generator)

**Propósito**: Tests end-to-end para flujos completos de usuario.

**Tags importantes**:
- `@smoke`: Tests críticos que se ejecutan en cada PR
- `@regression`: Suite completa para staging

**Estructura**:
```
specs/
├── smoke.spec.js          # Tests críticos (@smoke tag)
├── auth.spec.js           # Flujos de autenticación
├── accommodations.spec.js # Flujos CRUD de alojamientos
├── rooms.spec.js          # Flujos CRUD de habitaciones
└── lodgers.spec.js        # Flujos CRUD de inquilinos
```

**Formato de tests E2E (Claude debe seguir esto)**:
```javascript
import { test, expect } from '@playwright/test';

test.describe('Login Flow @smoke', () => {
  
  test('should login successfully with valid credentials', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill credentials
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Assert redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
```

**Para tests autenticados** (usar fixture):
```javascript
import { test, expect } from '../fixtures/auth.fixture.js';

test('should create new accommodation', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/accommodations/new');
  await authenticatedPage.fill('input[name="name"]', 'New Building');
  await authenticatedPage.click('button[type="submit"]');
  
  await expect(authenticatedPage.locator('.success-message'))
    .toBeVisible();
});
```

**Ejecución**:
```bash
npm run test:e2e              # Todos los E2E
npm run test:e2e:smoke        # Solo smoke tests
npm run test:e2e:ui           # Con interfaz visual
npx playwright test --debug   # Modo debug
```

---

### 4️⃣ `tests/e2e/fixtures/` - CASCADE AI (cuando sea necesario)

**Propósito**: Helpers y fixtures reutilizables para tests E2E.

**Contenido actual**:
- `auth.fixture.js` - Autenticación pre-configurada con Supabase

**Crear nuevos fixtures cuando**:
- Necesites datos de prueba reutilizables
- Necesites mocks de APIs externas
- Necesites setup/teardown común para varios tests

---

## 🔄 Workflow BDD Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. JAVIER crea Issue con User Story + Criterios Aceptación │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CLAUDE lee Issue y genera tests BDD en src/tests/features│
│    - Tests en formato Given-When-Then                       │
│    - Tests fallan inicialmente (TDD)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CLAUDE genera tests E2E en tests/e2e/specs/             │
│    - Tag @smoke para tests críticos                        │
│    - Tests de flujos completos                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CLAUDE crea PR con tests (sin implementación)           │
│    - feature/issue-XXX-descripcion                         │
│    - Tests incluidos en el PR                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. CASCADE implementa código para hacer pasar los tests    │
│    - Servicios, componentes, lógica                        │
│    - Ejecuta tests hasta que todos pasen                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. CI/CD ejecuta quality gates                             │
│    - Lint, build, unit tests, coverage >= 80%             │
│    - E2E smoke tests (@smoke tag)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. JAVIER code review + merge                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Quality Gates

### PR to `develop`:
- ✅ Lint pass
- ✅ Build success
- ✅ Unit tests pass
- ✅ Coverage >= 80%
- ✅ E2E smoke tests pass (`@smoke`)

### PR to `staging`:
- ✅ Todos los quality gates de develop
- ✅ Full E2E regression suite

### PR to `main` (production):
- ✅ Todos los quality gates de staging
- ✅ Manual approval required
- ✅ Post-deploy smoke tests

---

## 🚀 Scripts Disponibles

```bash
# Tests unitarios/features (Vitest)
npm test                        # Modo watch
npm run test:coverage           # Con coverage
npm run test:features           # Solo features BDD
npm run test:auth               # Solo auth

# Tests E2E (Playwright)
npm run test:e2e                # Todos
npm run test:e2e:smoke          # Solo smoke
npm run test:e2e:ui             # UI mode
npx playwright test --debug     # Debug mode
```

---

## 📝 Notas Importantes para Claude

1. **Tests primero, código después** (TDD)
2. **Formato Given-When-Then** para tests BDD
3. **Tag @smoke** para tests críticos E2E
4. **Coverage >= 80%** obligatorio
5. **Tests idempotentes** (se pueden ejecutar múltiples veces)
6. **No hardcodear datos** (usar fixtures/mocks)
7. **Tests descriptivos** (nombres claros en español/inglés)

---

## ✅ FASE 1 Completada

- ✅ Estructura de carpetas creada
- ✅ Playwright configurado
- ✅ READMEs documentados
- ✅ Tests de ejemplo creados
- ✅ Scripts npm configurados

---

## 📋 FASE 2 - GitHub Issue Templates ✅ COMPLETADA

**Ubicación:** `.github/ISSUE_TEMPLATE/`

### Templates Implementados:

#### 🚀 Feature Request (`feature.md`)
- User Story en formato **Como/Quiero/Para**
- Criterios de Aceptación en formato **Given-When-Then** (BDD)
- Consideraciones técnicas (migrations, frontend, backend)
- Definition of Done completo
- Mockups y referencias
- Labels automáticos: `feature`, `needs-review`

#### 🐛 Bug Report (`bug.md`)
- Descripción clara del bug
- Pasos para reproducir
- Comportamiento esperado vs actual
- Información de entorno (Browser, OS, Dispositivo)
- Severidad (Crítico/Alto/Medio/Bajo)
- Logs y mensajes de error
- Definition of Done para bug fixes
- Labels automáticos: `bug`, `needs-triage`

#### ⚙️ Configuración (`config.yml`)
- Issues en blanco deshabilitados
- Enlaces a documentación y discusiones
- Contactos de soporte

### Validación:
- ✅ Templates funcionando en GitHub
- ✅ User Stories con formato BDD
- ✅ Labels automáticos configurados

---

## 📋 FASE 3 - Pull Request Template ✅ COMPLETADA

**Ubicación:** `.github/PULL_REQUEST_TEMPLATE.md`

### Secciones del Template:

#### 📝 Descripción
- Breve descripción del PR
- Issue relacionado (Closes #XXX)

#### 🎯 Tipo de Cambio
- Bug fix, Nueva feature, Breaking change
- Documentación, Estilo/Refactor
- Performance, Tests

#### 🧪 Tests Realizados
- **Tests Automáticos**: Unitarios, BDD, E2E smoke, Coverage >= 80%
- **Tests Manuales**: Navegadores, Preview deploy, Criterios de aceptación
- Evidencia de tests (screenshots, logs)

#### ✅ Checklist Pre-Merge
- **Code Quality**: Convenciones, self-review, ESLint
- **Testing**: Tests añadidos, coverage mantenido
- **Database/Backend**: Migraciones, datos estáticos, Edge Functions
- **Documentation**: README, comentarios, docs técnicas
- **Deploy**: Preview deploy, no conflicts, variables de entorno

#### 🚀 Deploy Notes
- Migraciones a ejecutar
- Datos estáticos a aplicar
- Variables de entorno nuevas
- Pasos post-deploy

#### 📊 Impact Analysis
- Performance impact
- Security considerations
- Accessibility compliance

### Validación:
- ✅ Template funcionando en GitHub
- ✅ Checklists completos y detallados
- ✅ Secciones de deploy y testing claras

---

## 📊 Resumen General del SDLC

### Fases Completadas:
- ✅ **FASE 1**: Testing Infrastructure (BDD + E2E)
- ✅ **FASE 2**: GitHub Issue Templates
- ✅ **FASE 3**: Pull Request Template

### Próximas Fases:
- 🔄 **FASE 4**: GitHub Workflows (CI/CD)
- 🔄 **FASE 5**: Quality Gates
- 🔄 **FASE 6**: Documentation Structure
- 🔄 **FASE 7**: Release Process

### Documentación Principal:
- 📄 `sdlc-enterprise-saas-9f1066.md` - Plan completo SDLC
- 📄 `ESTRUCTURA-TESTING-FASE1.md` - Guía para Claude AI
- 📄 `.github/` - Templates validados en GitHub

**Estado actual**: Infraestructura de testing y templates completamente implementados y validados. Listo para continuar con FASE 4 (CI/CD Workflows).
