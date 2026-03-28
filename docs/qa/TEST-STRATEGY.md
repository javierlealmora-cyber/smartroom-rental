# Estrategia de Testing

Estrategia general de testing para el sistema SmartRoom Rental.

---

## 🎯 Objetivos

1. **Cobertura funcional:** Validar que cada requisito está correctamente implementado
2. **Integridad multi-tenant:** Garantizar aislamiento de datos entre tenants
3. **Seguridad:** Verificar RLS, autenticación y autorización
4. **Performance:** Asegurar tiempos de respuesta aceptables
5. **Regresión:** Prevenir que nuevos cambios rompan funcionalidad existente

---

## 📊 Pirámide de Testing

```
        /\
       /  \      E2E (20%)
      /----\     - Flujos críticos
     /      \    - Happy paths
    /--------\   Integration (30%)
   /          \  - APIs, Edge Functions
  /------------\ Unit (50%)
 /              \ - Componentes, funciones
/________________\
```

### Distribución Objetivo
- **50% Tests Unitarios:** Componentes, hooks, utilidades
- **30% Tests de Integración:** APIs, Edge Functions, BD
- **20% Tests E2E:** Flujos críticos de usuario

### Distribución Actual
- **25% Tests Unitarios** (objetivo: 50%)
- **15% Tests de Integración** (objetivo: 30%)
- **40% Tests E2E** (objetivo: 20%)

**Análisis:** Demasiado enfoque en E2E, falta base de unitarios e integración.

---

## 🧪 Tipos de Tests

### 1. Tests Unitarios (50% objetivo)

**Herramienta:** Vitest + React Testing Library

**Alcance:**
- Componentes React individuales
- Hooks personalizados
- Funciones de utilidad
- Validaciones
- Cálculos

**Ejemplo:**
```javascript
describe('LodgerForm', () => {
  it('validates required fields', () => {
    const { getByText } = render(<LodgerForm />);
    fireEvent.click(getByText('Guardar'));
    expect(getByText('El nombre es requerido')).toBeInTheDocument();
  });
});
```

**Cobertura mínima:** 70% por módulo

---

### 2. Tests de Integración (30% objetivo)

**Herramienta:** Vitest + Supabase Test Client

**Alcance:**
- Llamadas a APIs de Supabase
- Edge Functions
- Flujos de datos
- Interacción entre módulos

**Ejemplo:**
```javascript
describe('Lodger API', () => {
  it('creates lodger with assignment', async () => {
    const lodger = await createLodger(testData);
    const assignment = await getAssignment(lodger.id);
    expect(assignment.room_id).toBe(testData.room_id);
  });
});
```

**Cobertura mínima:** 60% de APIs críticas

---

### 3. Tests E2E (20% objetivo)

**Herramienta:** Playwright

**Alcance:**
- Flujos completos de usuario
- Happy paths de funcionalidad crítica
- Casos de uso principales

**Ejemplo:**
```javascript
test('complete lodger onboarding flow', async ({ page }) => {
  await page.goto('/lodgers');
  await page.click('text=Nuevo Inquilino');
  await page.fill('[name="first_name"]', 'Juan');
  // ... completar formulario
  await page.click('text=Guardar');
  await expect(page.locator('text=Inquilino creado')).toBeVisible();
});
```

**Cobertura mínima:** 80% de flujos críticos

---

### 4. Tests de Seguridad (100% críticos)

**Herramienta:** Scripts SQL + Playwright

**Alcance:**
- Aislamiento multi-tenant (RLS)
- Validación de permisos
- Prevención de SQL injection
- Validación de tokens

**Ejemplo:**
```sql
-- Test: Usuario de Tenant A no puede ver datos de Tenant B
SET LOCAL jwt.claims.sub = 'user-tenant-a';
SELECT COUNT(*) FROM accommodations; -- Debe retornar solo de Tenant A
```

**Cobertura:** 100% de políticas RLS

---

### 5. Tests de Performance

**Herramienta:** Playwright + k6 (futuro)

**Alcance:**
- Tiempo de carga de páginas
- Tiempo de respuesta de APIs
- Queries lentas
- Carga concurrente

**Ejemplo:**
```javascript
test('dashboard loads in under 2 seconds', async ({ page }) => {
  const start = Date.now();
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(2000);
});
```

**Umbral:** < 2s para páginas principales

---

## 🎯 Priorización de Tests

### Prioridad CRÍTICA

**Seguridad:**
- ✅ Aislamiento multi-tenant (RLS)
- ✅ Constraint de no solapamiento de habitaciones
- ✅ Validación de permisos por rol

**Integridad de Datos:**
- ✅ Validaciones de fechas
- ✅ Constraints de BD
- ✅ Cálculos de facturación

### Prioridad ALTA

**Flujos Core:**
- Login y autenticación
- Alta de inquilino con asignación
- Proceso de check-out
- Registro de factura de energía
- Liquidación de energía

**Funciones SQL:**
- get_room_derived_status()
- generate_monthly_billing()
- refresh_occupancy_stats()

### Prioridad MEDIA

**CRUD Básico:**
- Alojamientos
- Habitaciones
- Servicios

**Consultas:**
- Disponibilidad de habitaciones
- Historial de asignaciones
- Reportes

### Prioridad BAJA

**UI/UX:**
- Validaciones de formulario
- Mensajes de error
- Tooltips

---

## 📋 Plan de Acción

### Fase 1: Tests Críticos (Sprint Actual)

**Semana 1-2:**
1. ✅ Crear matriz de trazabilidad
2. ❌ Automatizar test de aislamiento multi-tenant
3. ❌ Test de constraint no solapamiento
4. ❌ Tests de validaciones de trigger

**Entregables:**
- Suite de tests de seguridad
- Tests de constraints críticos
- Documentación de casos de test

### Fase 2: Tests de Funcionalidad Core (Próximo Sprint)

**Semana 3-4:**
1. Tests E2E de flujos críticos
2. Tests de Edge Functions
3. Tests de funciones SQL
4. Aumentar cobertura unitaria a 50%

**Entregables:**
- Tests E2E de módulos core
- Tests de integración de APIs
- Cobertura de código > 50%

### Fase 3: Completar Cobertura (Próximo Mes)

**Semana 5-8:**
1. Tests de módulos secundarios
2. Tests de performance
3. Tests de regresión
4. Alcanzar objetivos de cobertura

**Entregables:**
- Cobertura completa según pirámide
- Suite de tests de performance
- Documentación completa

---

## 🔄 Proceso de Testing

### Durante Desarrollo

```
1. Requisito definido (REQ/CHG)
   ↓
2. Diseñar tests (TDD)
   ↓
3. Implementar tests (Red)
   ↓
4. Implementar código (Green)
   ↓
5. Refactorizar (Refactor)
   ↓
6. Actualizar matriz de trazabilidad
```

### Pre-Commit

```bash
# Ejecutar tests afectados
npm run test:changed

# Verificar cobertura
npm run test:coverage

# Lint y format
npm run lint
npm run format
```

### Pre-PR

```bash
# Ejecutar todos los tests
npm run test
npm run test:e2e

# Verificar cobertura no disminuye
npm run test:coverage -- --check

# Build exitoso
npm run build
```

### CI/CD Pipeline

```yaml
on: [pull_request]

jobs:
  test:
    - Lint y format
    - Tests unitarios
    - Tests de integración
    - Tests E2E (smoke)
    - Verificar cobertura
    - Build
    
  security:
    - Tests de seguridad
    - Validación de RLS
    - Scan de vulnerabilidades
```

---

## 📊 Métricas de Calidad

### Cobertura de Código

**Objetivo:**
- Statements: > 70%
- Branches: > 65%
- Functions: > 70%
- Lines: > 70%

**Actual:**
- Statements: ~40%
- Branches: ~35%
- Functions: ~45%
- Lines: ~40%

### Tasa de Éxito de Tests

**Objetivo:** > 95%

**Actual:** ~85%

### Tiempo de Ejecución

**Objetivo:**
- Tests unitarios: < 30s
- Tests integración: < 2min
- Tests E2E: < 10min

**Actual:**
- Tests unitarios: ~20s ✅
- Tests integración: ~1min ✅
- Tests E2E: ~15min ❌

---

## 🛠️ Herramientas

### Testing
- **Vitest** - Tests unitarios y de integración
- **Playwright** - Tests E2E
- **React Testing Library** - Tests de componentes
- **MSW** - Mock Service Worker (futuro)

### Cobertura
- **Vitest Coverage** - Cobertura de código
- **Playwright Report** - Reportes E2E

### CI/CD
- **GitHub Actions** - Automatización
- **Vercel** - Preview deployments

### Análisis
- **SonarQube** - Análisis de calidad (futuro)
- **Lighthouse** - Performance (futuro)

---

## 📝 Convenciones

### Nombres de Archivos
```
src/components/Lodger/__tests__/LodgerForm.test.jsx
tests/e2e/lodger-crud.spec.js
tests/integration/supabase-auth.test.js
```

### Estructura de Test
```javascript
describe('Feature/Component', () => {
  // Setup
  beforeEach(() => {
    // Arrange
  });
  
  // Tests
  it('should do something', () => {
    // Arrange
    const data = createTestData();
    
    // Act
    const result = doSomething(data);
    
    // Assert
    expect(result).toBe(expected);
  });
  
  // Cleanup
  afterEach(() => {
    // Cleanup
  });
});
```

### Datos de Test
- Usar factories para crear datos
- No hardcodear valores
- Limpiar después de cada test
- Usar datos realistas pero ficticios

---

## 🔗 Referencias

- **Reglas de testing:** `TEST-RULES.md`
- **Matriz de trazabilidad:** `TRACEABILITY-MATRIX.md`
- **Tests existentes:** `tests/e2e/ALL-FUNCTIONAL-TESTS.md`
- **Tests pendientes:** `tests/test-cases/MISSING-TESTS-FOR-CLAUDE.md`

---

**Última actualización:** 2026-03-28  
**Próxima revisión:** Mensual
