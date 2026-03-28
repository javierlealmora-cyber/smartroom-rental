# Informe de Estado QA — SmartRent
**Fecha:** YYYY-MM-DD  |  **Versión:** X.Y.Z  |  **Rama:** develop
**Ejecutado por:** [nombre/sistema]

---

## Resumen ejecutivo

| Resultado | Tests |
|-----------|-------|
| ✅ Pasando | XX    |
| ❌ Fallando | XX   |
| ⏭️ Skipped | XX   |
| **Total**  | XX   |

**Cobertura funcional:** XX% completa (XX/XX funcionalidades)

---

## Resultados por suite

### Unit — Lógica pura (`qa/unit/logic/`)
```
lodgerStatus.test.js         XX passed
roomStatus.test.js           XX passed
energy-settlement.test.js    XX passed
```

### Unit — Servicios (`qa/unit/services/`)
```
lodgers.service.test.js      XX passed
energy.service.test.js       XX passed
```

### Unit — Guards (`qa/unit/components/guards/`)
```
RequireAuth.test.jsx         XX passed
RequireRole.test.jsx         XX passed
```

### Unit — Seguridad (`qa/unit/security/`)
```
multi-tenant-isolation.test.js  XX passed  (X skipped — requieren BD)
```

### Unit — Legacy (`src/tests/`)
```
auth.service.test.js               XX passed
accommodations.service.test.js     XX passed
entities.service.test.js           XX passed
lodger-creation.test.js            XX passed
rendimiento/*.test.js              XX passed
```

### E2E — Playwright (`tests/e2e/specs/`)
```
smoke.spec.js                      XX passed
admin-basic.spec.js                XX passed / XX skip
entities.spec.js                   XX passed / XX skip
accommodations.spec.js             XX passed / XX skip
tenants.spec.js                    XX passed / XX skip / XX fixme
room-status-and-checkout.spec.js   XX passed / XX skip
tenant-address-fields.spec.js      XX passed
```

### E2E — QA (`qa/e2e/specs/`)
```
auth.spec.js     XX passed  (X skipped — requieren credenciales)
energy.spec.js   X fixme
```

---

## Defectos abiertos relevantes

| ID         | Prioridad | Bloqueante para      | Estado  |
|------------|-----------|----------------------|---------|
| BUG-033    | CRÍTICO   | TEN-05, TEN-06 E2E   | Abierto |
| BUG-036    | ALTA      | ACC-02, ACC-03       | Abierto |
| BUG-032    | ALTA      | Edición de entidades | Abierto |
| BUG-031    | ALTA      | Creación entidades   | Abierto |
| GAP-ENE-10 | MEDIA     | ENE-10 fixme         | Abierto |
| BUG-035    | BAJA      | Warning consola      | Abierto |

Ver detalle completo: [qa/defects/OPEN-DEFECTS.md](../../../qa/defects/OPEN-DEFECTS.md)

---

## Cobertura funcional

| Módulo  | Total | Cubiertas | Parciales | Pendientes |
|---------|-------|-----------|-----------|------------|
| AUTH    | 6     | XX        | XX        | XX         |
| TEN     | 8     | XX        | XX        | XX         |
| ACC     | 6     | XX        | XX        | XX         |
| ENE     | 10    | XX        | XX        | XX         |
| SEC     | 4     | XX        | XX        | XX         |
| PERF    | 3     | XX        | XX        | XX         |
| **TOTAL** | **37** | **XX** | **XX**  | **XX**     |

---

## Gaps de cobertura activos

- **AUTH-03** — Portal cruzado E2E (requiere credenciales de prueba)
- **ENE-08/09** — Flujo completo factura+reparto (requiere acc + bill en `.env.e2e`)
- **TEN-05/06** — Bloqueados por BUG-033
- **ACC-06** — `split_mode` por tipo de suministro: sin tests

---

## Acciones para próxima iteración

1. [ ] _Acción 1_
2. [ ] _Acción 2_
3. [ ] _Acción 3_
