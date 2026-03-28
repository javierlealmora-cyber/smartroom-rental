# Reglas de Testing

Reglas y convenciones para crear y mantener tests en SmartRoom Rental.

---

## 🎯 Principios Fundamentales

### 1. Test-Driven Development (TDD)
Para funcionalidad crítica, escribir tests antes del código:
```
Red → Green → Refactor
```

### 2. Tests como Documentación
Los tests deben ser legibles y explicar el comportamiento esperado.

### 3. Tests Independientes
Cada test debe poder ejecutarse de forma aislada.

### 4. Tests Rápidos
Los tests unitarios deben ejecutarse en < 1s cada uno.

### 5. Tests Determinísticos
Mismo input → mismo output, siempre.

---

## 📝 Convenciones de Nomenclatura

### Archivos de Test

#### Tests Unitarios
```
src/components/Lodger/__tests__/LodgerForm.test.jsx
src/hooks/__tests__/useAuth.test.js
src/utils/__tests__/dateHelpers.test.js
```

#### Tests E2E
```
tests/e2e/lodger-crud.spec.js
tests/e2e/room-assignment.spec.js
tests/e2e/energy-billing.spec.js
```

#### Tests de Integración
```
tests/integration/supabase-auth.test.js
tests/integration/edge-functions.test.js
```

### Nombres de Tests

#### Patrón: should + acción + resultado
```javascript
// ✅ BIEN
test('should create lodger with valid data', async () => {});
test('should reject invalid email format', async () => {});
test('should calculate total cost correctly', () => {});

// ❌ MAL
test('lodger creation', async () => {});
test('test email', async () => {});
test('cost', () => {});
```

#### Patrón alternativo: describe + it
```javascript
describe('LodgerForm', () => {
  it('renders correctly', () => {});
  it('validates required fields', () => {});
  it('submits form with valid data', () => {});
});
```

---

## 🏗️ Estructura de Tests

### Patrón AAA (Arrange-Act-Assert)

```javascript
test('should calculate consumption amount', () => {
  // Arrange - Preparar datos
  const previousReading = 1000;
  const currentReading = 1050;
  
  // Act - Ejecutar acción
  const consumption = calculateConsumption(previousReading, currentReading);
  
  // Assert - Verificar resultado
  expect(consumption).toBe(50);
});
```

### Tests con Setup y Cleanup

```javascript
describe('Lodger CRUD', () => {
  let testLodger;
  
  // Setup antes de cada test
  beforeEach(async () => {
    testLodger = await createTestLodger();
  });
  
  // Cleanup después de cada test
  afterEach(async () => {
    await deleteTestLodger(testLodger.id);
  });
  
  test('should update lodger', async () => {
    // Test usa testLodger
  });
});
```

---

## 🧪 Tipos de Tests

### Tests Unitarios

#### Componentes React
```javascript
import { render, fireEvent, screen } from '@testing-library/react';
import LodgerForm from '../LodgerForm';

describe('LodgerForm', () => {
  it('validates required fields', () => {
    render(<LodgerForm />);
    
    const submitButton = screen.getByText('Guardar');
    fireEvent.click(submitButton);
    
    expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
  });
});
```

#### Hooks
```javascript
import { renderHook, act } from '@testing-library/react';
import useAuth from '../useAuth';

describe('useAuth', () => {
  it('updates user on login', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });
    
    expect(result.current.user).toBeDefined();
  });
});
```

#### Funciones
```javascript
import { calculateMonthlyRent } from '../billing';

describe('calculateMonthlyRent', () => {
  it('calculates rent for full month', () => {
    const result = calculateMonthlyRent({
      dailyRate: 15,
      daysInMonth: 30
    });
    
    expect(result).toBe(450);
  });
});
```

### Tests E2E

```javascript
import { test, expect } from '@playwright/test';

test('complete lodger onboarding', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to lodgers
  await page.click('text=Inquilinos');
  await expect(page).toHaveURL('/lodgers');
  
  // Create lodger
  await page.click('text=Nuevo Inquilino');
  await page.fill('[name="first_name"]', 'Juan');
  await page.fill('[name="email"]', 'juan@test.com');
  // ... más campos
  
  await page.click('text=Guardar');
  
  // Verify
  await expect(page.locator('text=Inquilino creado')).toBeVisible();
});
```

### Tests de Integración

```javascript
import { createClient } from '@supabase/supabase-js';

describe('Supabase Auth', () => {
  let supabase;
  
  beforeAll(() => {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  });
  
  it('creates user and profile', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123'
    });
    
    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    
    // Verify profile created
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    expect(profile).toBeDefined();
  });
});
```

---

## 🎭 Mocking

### Cuándo Mockear

**✅ Mockear:**
- APIs externas
- Servicios de terceros
- Funciones costosas
- Dependencias complejas

**❌ No Mockear:**
- Lógica de negocio propia
- Funciones simples
- Utilidades básicas

### Cómo Mockear

#### Vitest
```javascript
import { vi } from 'vitest';
import { sendEmail } from '../emailService';

vi.mock('../emailService', () => ({
  sendEmail: vi.fn()
}));

test('sends invitation email', async () => {
  await inviteLodger(lodgerData);
  
  expect(sendEmail).toHaveBeenCalledWith({
    to: lodgerData.email,
    subject: 'Invitación a SmartRoom'
  });
});
```

#### Playwright
```javascript
test('handles API error', async ({ page }) => {
  // Mock API response
  await page.route('**/api/lodgers', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Server error' })
    });
  });
  
  await page.goto('/lodgers');
  await expect(page.locator('text=Error al cargar')).toBeVisible();
});
```

---

## 📊 Cobertura de Código

### Objetivos Mínimos

- **Statements:** > 70%
- **Branches:** > 65%
- **Functions:** > 70%
- **Lines:** > 70%

### Verificar Cobertura

```bash
# Generar reporte
npm run test:coverage

# Ver reporte HTML
open coverage/index.html
```

### Excluir de Cobertura

```javascript
/* istanbul ignore next */
function debugOnly() {
  // Código solo para debug
}
```

---

## ✅ Checklist de Test

### Antes de Crear Test

- [ ] Test está vinculado a REQ/CHG
- [ ] Caso de uso está documentado
- [ ] Criterios de aceptación definidos

### Durante Creación

- [ ] Nombre descriptivo (should + acción + resultado)
- [ ] Sigue patrón AAA
- [ ] Es independiente de otros tests
- [ ] Limpia datos después de ejecutar
- [ ] No usa datos hardcodeados
- [ ] Maneja casos edge

### Después de Crear

- [ ] Test pasa localmente
- [ ] Test pasa en CI
- [ ] Cobertura no disminuye
- [ ] Documentado en matriz de trazabilidad
- [ ] Código revisado en PR

---

## 🚫 Anti-Patrones

### ❌ Tests Frágiles
```javascript
// MAL - Depende de orden de elementos
const items = screen.getAllByRole('listitem');
expect(items[0]).toHaveTextContent('Item 1');

// BIEN - Busca elemento específico
expect(screen.getByText('Item 1')).toBeInTheDocument();
```

### ❌ Tests Lentos
```javascript
// MAL - Espera fija
await page.waitForTimeout(5000);

// BIEN - Espera condicional
await page.waitForSelector('text=Cargado');
```

### ❌ Tests Dependientes
```javascript
// MAL - Test 2 depende de Test 1
test('creates lodger', () => {
  lodger = createLodger();
});

test('updates lodger', () => {
  updateLodger(lodger); // Falla si test 1 no corrió
});

// BIEN - Cada test es independiente
test('updates lodger', () => {
  const lodger = createLodger();
  updateLodger(lodger);
});
```

### ❌ Tests con Lógica Compleja
```javascript
// MAL - Demasiada lógica en test
test('calculates billing', () => {
  const lodgers = getLodgers();
  let total = 0;
  for (let lodger of lodgers) {
    if (lodger.status === 'active') {
      total += lodger.rent;
    }
  }
  expect(total).toBe(expectedTotal);
});

// BIEN - Test simple, lógica en código
test('calculates billing', () => {
  const total = calculateTotalBilling(lodgers);
  expect(total).toBe(expectedTotal);
});
```

---

## 🔧 Debugging Tests

### Tests Unitarios

```javascript
// Añadir debug
import { debug } from '@testing-library/react';

test('renders component', () => {
  const { container } = render(<Component />);
  debug(container); // Imprime HTML
});
```

### Tests E2E

```javascript
// Modo debug
npx playwright test --debug

// Screenshots en fallo
test('lodger creation', async ({ page }) => {
  await page.screenshot({ path: 'before-click.png' });
  await page.click('button');
  await page.screenshot({ path: 'after-click.png' });
});

// Modo headed
npx playwright test --headed
```

---

## 📚 Datos de Test

### Factories

```javascript
// factories/lodger.js
export function createTestLodger(overrides = {}) {
  return {
    first_name: 'Juan',
    last_name1: 'Pérez',
    email: `test-${Date.now()}@example.com`,
    phone: '+34600000000',
    ...overrides
  };
}

// Uso
const lodger = createTestLodger({ first_name: 'María' });
```

### Fixtures

```javascript
// fixtures/lodgers.json
{
  "activeLodger": {
    "first_name": "Juan",
    "status": "active"
  },
  "invitedLodger": {
    "first_name": "María",
    "status": "invited"
  }
}

// Uso
import fixtures from './fixtures/lodgers.json';
const lodger = fixtures.activeLodger;
```

---

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Tests

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Pre-commit Hook

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:changed && npm run lint"
    }
  }
}
```

---

## 📖 Referencias

- **Estrategia:** `TEST-STRATEGY.md`
- **Matriz:** `TRACEABILITY-MATRIX.md`
- **Vitest:** https://vitest.dev/
- **Playwright:** https://playwright.dev/
- **Testing Library:** https://testing-library.com/

---

**Última actualización:** 2026-03-28
