# Procedimiento de rollback — Add-ons DEV (Fase 11C5)

---

## 1. Triggers de rollback

| Trigger | Descripción |
|---------|-------------|
| `CONTRACT_MISMATCH` | El add-on devolvió estructura fuera del contrato v1.0 |
| `CIRCUIT_OPEN` | Circuit breaker abierto (≥3 fallos consecutivos) |
| `TENANT_DATA_LEAK` | Resultado contiene datos de otro tenant |
| `FORBIDDEN_FIELD_IN_RESULT` | Campo prohibido detectado en respuesta del add-on |
| `SMOKE_DEV_FAILED` | El smoke real DEV no pasa tras activar canary |

---

## 2. Procedimiento (4 pasos)

```
1. Cambiar variable de entorno:
   INCIDENTS_ADDON_INTEGRATION_MODE=mock
   LISTINGS_ADDON_INTEGRATION_MODE=mock

2. Verificar que no hay llamadas pendientes al add-on
   → Revisar logs de Supabase EF

3. Ejecutar smokes offline para confirmar modo mock activo:
   npm run test:smoke:offline:incidents-addon
   npm run test:smoke:offline:listings-addon

4. Documentar incidente en addons-dev-readiness.md
   → Estado: ROLLED_BACK_TO_MOCK
```

---

## 3. Garantías de fallback

- En modo `disabled` o `mock`, ninguna llamada real se realiza.
- El circuit breaker abierto equivale a `disabled` hasta que se reinicie manualmente.
- Las referencias opacas guardadas (`incident_id`, `lead_id`) en tablas SC no se borran al hacer rollback — solo se deja de crear nuevas.

---

## 4. Reactivación tras rollback

1. El equipo del add-on confirma corrección del problema.
2. Ejecutar `npm run validate:sc:addons-dev-integration` → verificar OK.
3. Reactivar con `INCIDENTS_ADDON_INTEGRATION_MODE=canary` (solo tenant DEV-A).
4. Ejecutar `npm run test:smoke:dev:incidents-addon`.
5. Si pasa → `INCIDENTS_ADDON_INTEGRATION_MODE=real` (bajo supervisión).

---

## 5. Estado de GATE_1

GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING.  
Un rollback no cierra GATE_1 — solo la auditoría externa puede cerrar GATE_1.
