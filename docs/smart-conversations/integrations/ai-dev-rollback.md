# AI Integration — DEV Rollback Plan

**Fase:** 11C3  
**Fecha:** 2026-07-24

## Cuándo hacer rollback

1. El proveedor AI devuelve datos PII o campos prohibidos
2. El costo por sesión supera el umbral ($0.06)
3. La latencia AI supera 8000ms de forma sostenida
4. Se detecta prompt injection exitoso en producción
5. Los tests `test:sc:ai-integration-dev` empiezan a fallar tras activar proveedor real

## Procedimiento de rollback (sin downtime)

### Paso 1: Activar modo disabled

```bash
# En Supabase secrets DEV
AI_INTEGRATION_MODE=disabled
```

Efecto inmediato: todas las llamadas AI devuelven `INTEGRATION_DISABLED` y activan fallback.

### Paso 2: Activar rollback en canary

Código en `integration-canary.ts`:
```typescript
activateRollback('dev-tenant-a-00000000-0000-0000-0000-000000000001', 'ai');
```

Efecto: todos los tenants caen a modo `mock`.

### Paso 3: Verificar fallbacks activos

```bash
npm run test:sc:ai-integration-dev
npm run validate:sc:ai-dev-integration
```

Todos los tests deben pasar con modo `mock` o `disabled`.

### Paso 4: Documentar incidente

Registrar en `tests/defects/OPEN-DEFECTS.md` con:
- Descripción del problema
- Timestamp
- Modo de rollback activado

## Garantías del fallback

- El fallback **nunca** realiza otra llamada AI
- El fallback **no** modifica estado de sesión ni caso
- El fallback devuelve valores neutros (`intent: 'unknown'`, `confidence: 0`)
- La conversación puede continuar sin AI

## Para reactivar tras rollback

1. Identificar y corregir la causa raíz
2. Ejecutar `test:sc:ai-integration-dev` en modo mock
3. Ejecutar `validate:sc:ai-dev-integration`
4. Ejecutar `smoke:dev:ai`
5. Activar modo canary solo para `dev-tenant-a` (no tenant real)
6. Monitorizar 24h antes de activar modo real
