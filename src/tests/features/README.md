# Features Tests (BDD)

Este directorio contiene tests de funcionalidad basados en BDD (Behavior-Driven Development).

## 📁 Estructura

```
features/
├── auth/               # Tests de autenticación
├── accommodations/     # Tests de alojamientos
├── rooms/              # Tests de habitaciones
├── lodgers/            # Tests de inquilinos
└── services/           # Tests de servicios
```

## 🔄 Workflow BDD

1. **Claude AI** genera los tests basándose en los criterios de aceptación del Issue
2. Los tests se crean en la rama `feature/issue-xxx-*`
3. Los tests se ejecutan **antes** de implementar el código (TDD)
4. **Cascade AI** implementa el código para hacer pasar los tests

## ✍️ Formato de Tests

Cada feature test debe seguir el patrón Given-When-Then:

```javascript
import { describe, it, expect } from 'vitest';

describe('Feature: User Login', () => {
  it('should login with valid credentials', async () => {
    // Given: Usuario con credenciales válidas
    const credentials = { email: 'test@example.com', password: 'password123' };
    
    // When: Usuario intenta hacer login
    const result = await login(credentials);
    
    // Then: Login es exitoso
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });
});
```

## 🚀 Ejecución

```bash
# Todos los tests de features
npm run test:features

# Tests específicos
npm run test:auth
npm run test:accommodations
npm run test:rooms
```

## 📊 Coverage

Los tests de features deben mantener **>= 80% coverage** para pasar los quality gates del CI/CD.
