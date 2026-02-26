# Testing Infrastructure — SmartRent

Infraestructura de testing con Vitest para el proyecto SmartRent.

---

## Stack de Testing

- **Framework:** Vitest 2.x
- **Entorno:** jsdom (simula DOM)
- **React Testing:** @testing-library/react
- **Matchers:** @testing-library/jest-dom
- **Interacciones:** @testing-library/user-event
- **Mocks de API:** MSW (Mock Service Worker)

---

## Comandos

```bash
# Modo watch (desarrollo)
npm test

# Ejecutar una vez (CI/CD)
npm run test:run

# Con reporte de cobertura
npm run test:coverage
```

---

## Estructura de Carpetas

```
smartroom-rental/
├── src/
│   └── tests/
│       ├── helpers/
│       │   └── setup.js          ← Configuración global
│       └── [módulo]/
│           └── [archivo].test.js ← Tests unitarios
└── tests/
    ├── reports/                   ← Reportes de ejecución (histórico)
    │   └── REPORT-TEMPLATE.md
    └── defects/                   ← Bugs detectados
        ├── OPEN-DEFECTS.md        ← Bugs pendientes (Cascade lee este)
        └── CLOSED-DEFECTS.md      ← Bugs resueltos
```

---

## Flujo de Trabajo

### 1. Claude ejecuta tests (VS Code)
```bash
npm run test:run
```

### 2. Claude escribe bugs detectados
- Actualiza `tests/defects/OPEN-DEFECTS.md` con bugs encontrados
- Formato estándar para cada bug (módulo, test, error, pasos)

### 3. Cascade arregla bugs (Windsurf)
- Lee `tests/defects/OPEN-DEFECTS.md`
- Arregla cada bug
- Mueve bug a `CLOSED-DEFECTS.md`
- Actualiza fecha de resolución

### 4. Claude re-ejecuta y actualiza
```bash
npm run test:run
```
- Actualiza `OPEN-DEFECTS.md` (elimina bugs resueltos, añade nuevos si hay)

---

## Convenciones de Naming

### Archivos de Test
- `[nombre].test.js` - Tests unitarios
- `[nombre].spec.js` - Tests de integración

### Estructura de Test
```javascript
import { describe, it, expect } from 'vitest';

describe('NombreDelMódulo', () => {
  describe('nombreDeLaFunción', () => {
    it('debe hacer algo específico', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = myFunction(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

---

## Mocks de Supabase

```javascript
import { vi } from 'vitest';

// Mock de supabase client
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  },
}));
```

---

## Coverage Thresholds

Objetivos de cobertura:
- **Statements:** 80%
- **Branches:** 75%
- **Functions:** 80%
- **Lines:** 80%

(Configurar en `vitest.config.js` cuando sea necesario)

---

## Ejemplo de Test

```javascript
// src/tests/services/auth.service.test.js
import { describe, it, expect, vi } from 'vitest';
import { signIn } from '../../services/auth.service';

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

describe('auth.service', () => {
  describe('signIn', () => {
    it('debe autenticar usuario correctamente', async () => {
      // Test implementation
    });
  });
});
```
