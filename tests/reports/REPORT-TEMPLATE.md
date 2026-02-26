# Reporte de Tests — SmartRent
Fecha: YYYY-MM-DD HH:MM
Ejecutado por: Claude / Manual

---

## Resumen

- **Total de tests:** XX
- **Pasados:** XX (XX%)
- **Fallidos:** XX (XX%)
- **Skipped:** XX
- **Duración:** XX segundos

---

## Tests Fallidos

### auth.service.test.js
- ❌ `signIn > debe rechazar lodger en portal manager`
  - Error: Expected "Acceso no permitido", received undefined
  - Archivo: src/services/auth.service.js:45

### AccommodationsList.test.jsx
- ❌ `filtros > debe mostrar desactivados cuando checkbox activo`
  - Error: Checkbox no actualiza estado
  - Archivo: src/pages/v2/admin/accommodations/AccommodationsList.jsx:120

---

## Cobertura de Código

- **Statements:** XX%
- **Branches:** XX%
- **Functions:** XX%
- **Lines:** XX%

---

## Defectos Generados

- BUG-001: auth.service: signIn no maneja error de portal incorrecto
- BUG-002: AccommodationsPage: filtro "Mostrar desactivados" no funciona

Ver `tests/defects/OPEN-DEFECTS.md` para detalles.
