# Defectos Cerrados — SmartRent
**Fuente autoritativa** | Última actualización: 2026-03-28

> Los bugs BUG-001 a BUG-030 están en `tests/defects/CLOSED-DEFECTS.md`
> (estructura anterior — mantenido como referencia histórica, no duplicar aquí).

---

## Formato

```
## BUG-XXX [PRIORIDAD] — Título
**Fecha detección:** YYYY-MM-DD  |  **Fecha resolución:** YYYY-MM-DD
**Módulo:** ruta/al/archivo.js
**Test de regresión:** qa/unit/... o qa/e2e/...

**Problema:** …
**Solución:** …
```

---

## BUG-034 [MEDIA] — TenantsList no mostraba fecha de Check-out en tarjetas "Pendiente baja"

**Fecha detección:** 2026-03-25  |  **Fecha resolución:** 2026-03-25
**Módulo:** `src/pages/v2/admin/tenants/TenantsList.jsx` + `src/services/lodgers.service.js`
**Test de regresión:** (visual — ningún test unitario cubre este renderizado específico)

**Problema:**
La tarjeta de inquilino con estado "Pendiente baja" no mostraba la fecha de check-out
porque `active_assignment` no seleccionaba `move_out_date` y el JSX no la renderizaba.

**Solución:**
Añadido `move_out_date` al SELECT de `active_assignment` en `lodgers.service.js`.
Añadido renderizado de la fecha de check-out en la tarjeta de `TenantsList.jsx`.

---

## Historial BUG-001 a BUG-030

Ver [qa/defects/archive/CLOSED-DEFECTS-LEGACY.md](archive/CLOSED-DEFECTS-LEGACY.md) — archivo histórico (BUG-001..030).

Resumen:
- **BUG-030** — Tests `plans.service.edge-cases.test.js` fallan en suite completa (2026-03-23)
- **BUG-029** — Campos `street_number`, `floor`, `door` no se persisten en AccommodationEdit (2026-03-22/23)
- **BUG-024** — Test `belongsToCompany()` usa `company_id` obsoleto (2026-03-18/19)
- _(BUG-001 a BUG-023 en historial completo)_
