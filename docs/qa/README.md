# Quality Assurance

Documentación de estrategia de testing y control de calidad del sistema SmartRoom Rental.

---

## 📁 Estructura

```
qa/
├── README.md                  # Este archivo
├── TEST-STRATEGY.md           # Estrategia general de testing
├── TEST-RULES.md              # Reglas y convenciones
└── TRACEABILITY-MATRIX.md     # Matriz de trazabilidad
```

---

## 🎯 Objetivos de QA

### 1. Cobertura Funcional
Validar que cada requisito funcional está correctamente implementado y probado.

### 2. Integridad Multi-Tenant
Garantizar aislamiento completo de datos entre tenants.

### 3. Seguridad
Verificar que RLS, autenticación y autorización funcionan correctamente.

### 4. Performance
Asegurar tiempos de respuesta aceptables bajo carga.

### 5. Regresión
Prevenir que nuevos cambios rompan funcionalidad existente.

---

## 🧪 Tipos de Tests

### Tests E2E (End-to-End)
**Ubicación:** `tests/e2e/`

**Propósito:** Validar flujos completos de usuario

**Herramienta:** Playwright

**Ejemplos:**
- Login y autenticación
- Creación de inquilino
- Asignación de habitación
- Proceso de check-out
- Facturación de energía

**Cobertura actual:** ~40%

---

### Tests Unitarios
**Ubicación:** `src/**/__tests__/`

**Propósito:** Validar componentes y funciones individuales

**Herramienta:** Vitest + React Testing Library

**Ejemplos:**
- Componentes React
- Hooks personalizados
- Utilidades y helpers
- Validaciones

**Cobertura actual:** ~25%

---

### Tests de Integración
**Ubicación:** `tests/integration/`

**Propósito:** Validar interacción entre módulos

**Herramienta:** Vitest

**Ejemplos:**
- API calls a Supabase
- Edge Functions
- Flujos de datos
- Sincronización

**Cobertura actual:** ~15%

---

### Tests de Seguridad
**Ubicación:** `tests/test-cases/security-*.md`

**Propósito:** Validar aislamiento multi-tenant y RLS

**Herramienta:** Manual + Scripts SQL

**Ejemplos:**
- Aislamiento de datos por tenant
- Validación de políticas RLS
- Pruebas de acceso no autorizado
- Validación de tokens

**Cobertura actual:** Documentado, pendiente automatizar

---

### Tests de Performance
**Ubicación:** `tests/performance/`

**Propósito:** Validar tiempos de respuesta

**Herramienta:** Playwright + k6 (futuro)

**Ejemplos:**
- Carga de dashboard
- Listados con paginación
- Queries complejas
- Carga concurrente

**Cobertura actual:** Mínima

---

## 📊 Matriz de Trazabilidad

La matriz conecta:
- **Requisito/Cambio** → Qué se necesita
- **Issue** → Tracking en GitHub
- **Código** → Dónde se implementa
- **Migración** → Cambios en BD
- **Tests** → Cómo se valida
- **Estado** → Progreso actual

Ver: `TRACEABILITY-MATRIX.md`

---

## 🔄 Flujo de Testing

### 1. Requisito Definido
```
Crear/actualizar REQ o CHG
Definir criterios de aceptación
```

### 2. Tests Diseñados
```
Identificar escenarios de test
Documentar casos válidos e inválidos
Actualizar TEST-STRATEGY.md
```

### 3. Implementación
```
Desarrollar código
Crear tests en paralelo
```

### 4. Validación
```
Ejecutar tests localmente
Verificar cobertura
```

### 5. CI/CD
```
Tests automáticos en PR
Bloqueo si tests fallan
```

### 6. Trazabilidad
```
Actualizar TRACEABILITY-MATRIX.md
Vincular REQ → Tests → Estado
```

---

## ✅ Criterios de Aceptación

### Para Merge a Main
- [ ] Tests E2E críticos pasan
- [ ] Tests unitarios del módulo pasan
- [ ] Cobertura no disminuye
- [ ] Tests de seguridad pasan (si aplica)
- [ ] Documentado en matriz de trazabilidad

### Para Deployment a Staging
- [ ] Todos los tests pasan
- [ ] Tests de integración validados
- [ ] Performance aceptable
- [ ] Documentación actualizada

### Para Deployment a Producción
- [ ] QA manual completado
- [ ] Tests de regresión pasan
- [ ] Performance validada en staging
- [ ] Rollback plan definido

---

## 🚀 Ejecutar Tests

### Tests E2E
```bash
# Todos los tests E2E
npm run test:e2e

# Test específico
npm run test:e2e -- tests/e2e/login.spec.js

# Con UI
npm run test:e2e:ui

# Generar reporte
npm run test:e2e:report
```

### Tests Unitarios
```bash
# Todos los tests unitarios
npm run test

# Watch mode
npm run test:watch

# Con cobertura
npm run test:coverage

# Test específico
npm run test -- src/components/Lodger/__tests__/LodgerForm.test.js
```

### Tests de Integración
```bash
# Todos los tests de integración
npm run test:integration

# Test específico
npm run test:integration -- tests/integration/supabase-auth.test.js
```

---

## 📈 Cobertura de Tests

### Objetivo
- **E2E:** 80% de flujos críticos
- **Unitarios:** 70% de componentes
- **Integración:** 60% de APIs
- **Seguridad:** 100% de políticas RLS

### Actual
- **E2E:** ~40%
- **Unitarios:** ~25%
- **Integración:** ~15%
- **Seguridad:** Documentado, no automatizado

### Prioridades
1. Tests de seguridad multi-tenant
2. Tests E2E de flujos críticos
3. Tests unitarios de componentes core
4. Tests de integración con Supabase

---

## 🔍 Tests Pendientes

Ver: `tests/test-cases/MISSING-TESTS-FOR-CLAUDE.md`

### Críticos
- [ ] Aislamiento multi-tenant automatizado
- [ ] Constraint de no solapamiento de habitaciones
- [ ] Validación de RLS en todas las tablas
- [ ] Proceso completo de check-out

### Importantes
- [ ] Cálculo de consumos de energía
- [ ] Generación automática de billing
- [ ] Asignación y reasignación de habitaciones
- [ ] Invitación de inquilinos

### Deseables
- [ ] Performance de dashboard
- [ ] Carga de listados grandes
- [ ] Búsqueda y filtros
- [ ] Exportación de datos

---

## 🛠️ Herramientas

### Testing
- **Playwright** - Tests E2E
- **Vitest** - Tests unitarios
- **React Testing Library** - Tests de componentes
- **MSW** - Mock Service Worker (futuro)

### CI/CD
- **GitHub Actions** - Automatización
- **Vercel** - Preview deployments

### Análisis
- **Playwright Report** - Reportes E2E
- **Vitest Coverage** - Cobertura de código

---

## 📝 Convenciones

### Nombres de Tests
```javascript
// E2E
describe('Login Flow', () => {
  test('should login successfully with valid credentials', async () => {
    // ...
  });
});

// Unitarios
describe('LodgerForm', () => {
  it('renders correctly', () => {
    // ...
  });
  
  it('validates required fields', () => {
    // ...
  });
});
```

### Estructura de Test
```javascript
// Arrange
const user = createTestUser();

// Act
await loginUser(user);

// Assert
expect(dashboard).toBeVisible();
```

### Datos de Test
- Usar factories para crear datos
- No usar datos hardcodeados
- Limpiar datos después de cada test

---

## 🔗 Referencias

- **Estrategia de testing:** `TEST-STRATEGY.md`
- **Reglas de testing:** `TEST-RULES.md`
- **Matriz de trazabilidad:** `TRACEABILITY-MATRIX.md`
- **Tests E2E:** `tests/e2e/ALL-FUNCTIONAL-TESTS.md`
- **Tests pendientes:** `tests/test-cases/MISSING-TESTS-FOR-CLAUDE.md`

---

## 📞 Responsables

### QA Lead
- Definir estrategia de testing
- Revisar cobertura
- Aprobar deployment a producción

### Developers
- Crear tests unitarios
- Crear tests E2E para nuevas features
- Mantener tests actualizados

### Claude/Cascade
- Diseñar tests complejos
- Ampliar cobertura
- Automatizar tests manuales

---

**Última actualización:** 2026-03-28  
**Próxima revisión:** Mensual
