# n8n DEV Rollback — Fase 11C4

## Disparadores de rollback

Activar rollback inmediato si se detecta cualquiera de estos en n8n DEV:

1. **Error rate > 5%** en modo `canary` sostenido > 5 minutos
2. **Timeout sistemático** en WF-10 o WF-40 en shadow
3. **Cross-tenant leak** detectado en logs de callback
4. **Campo PII** aparece en logs de n8n
5. **Credencial expuesta** en export de workflow o log de ejecución

## Procedimiento de rollback (4 pasos)

```bash
# 1. Activar rollback flag en canary
# En supabase/functions/_shared/smart-conversations/integration-canary.ts
# activateRollback({ integration: 'n8n', tenant_id: 'dev-tenant-a-...' })

# 2. Cambiar modo del adapter a 'disabled' (fail-closed → mock)
# En variables de entorno DEV:
N8N_INTEGRATION_MODE=disabled

# 3. Verificar que todos los requests usan fallback mock
npm run test:smoke:dev:n8n

# 4. Abrir issue con análisis del incidente
# Documentar en docs/smart-conversations/n8n/incidents/
```

## Garantías del fallback

Cuando el modo es `disabled`:
- El adapter retorna respuesta mock inmediatamente
- No se realizan llamadas HTTP a n8n
- El estado de sesión se preserva intacto
- Las conversaciones continúan (degradadas, sin n8n)
- No hay pérdida de mensajes — canal WA/WebChat sigue activo

## Callbacks tardíos post-rollback

Si n8n envía callbacks después del rollback:
- El `idempotency_key` ya fue procesado → callback ignorado (idempotente)
- No se aplican efectos secundarios duplicados
- El adapter en modo `disabled` rechaza nuevas invocaciones

## Reactivación tras rollback

1. Identificar y corregir la causa raíz
2. Limpiar `rollback_flag` en canary
3. Resetear circuit breaker si aplica
4. Ejecutar `npm run validate:sc:n8n-dev-integration`
5. Ejecutar smoke completo: `npm run test:smoke:dev:n8n`
6. Reactivar modo progresivamente: `disabled` → `mock` → `canary`

## Rollback en Fase 11C4

En la Fase 11C4 (sin instancia DEV real), el rollback consiste simplemente en
verificar que el modo `disabled` está activo y que los tests offline siguen pasando.

`rollback_flag: false` en la configuración canary — no hay nada que revertir aún.
