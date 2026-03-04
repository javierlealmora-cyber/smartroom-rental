# E2E Tests (Playwright)

Tests end-to-end usando Playwright para validar flujos completos de usuario.

## 📁 Estructura

```
e2e/
├── specs/              # Test specs
│   ├── smoke.spec.js   # Tests críticos (@smoke)
│   ├── auth.spec.js    # Flujos de autenticación
│   └── ...
├── fixtures/           # Fixtures y helpers
│   └── auth.fixture.js # Autenticación pre-configurada
└── README.md
```

## 🏷️ Tags

- **@smoke**: Tests críticos que se ejecutan en cada PR
- **@regression**: Suite completa que se ejecuta en staging

## 🚀 Ejecución

```bash
# Todos los E2E tests
npm run test:e2e

# Solo smoke tests
npx playwright test --grep @smoke

# Con UI
npx playwright test --ui

# En modo debug
npx playwright test --debug
```

## 🔄 CI/CD

- **PR to develop**: Solo `@smoke` tests
- **PR to staging**: Full regression suite
- **PR to main (production)**: Smoke tests post-deploy

## 📝 Escribir Tests

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name @smoke', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/path');
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

## 🔐 Tests Autenticados

Usa el fixture `authenticatedPage`:

```javascript
import { test, expect } from '../fixtures/auth.fixture.js';

test('should access protected route', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.locator('h1')).toHaveText('Dashboard');
});
```

## 📊 Reports

Los reportes HTML se generan en `playwright-report/`:

```bash
npx playwright show-report
```
