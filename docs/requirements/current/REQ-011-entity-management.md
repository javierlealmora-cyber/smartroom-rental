# REQ-011 — Gestión de Entidades: Propietaria (owner) y Pagadora (payer)

**Estado:** Implementado  
**Versión:** 1.0  
**Fecha:** 2026-04-02  
**Autor:** javierlealmora-cyber  
**Relacionado con:** BUG-046

---

## Objetivo

Permitir al administrador de cualquier plan crear y editar las dos entidades clave de su cuenta desde la pantalla Configuración (`/v2/admin/settings`):

- **Entidad Propietaria** (`type = 'owner'`): titular registral de los alojamientos. Es el valor que se guarda en `accommodations.owner_entity_id`. Sin esta entidad no se pueden crear alojamientos.
- **Entidad Pagadora** (`type = 'payer'`): titular de la facturación del servicio SmartRoom Rental. Máximo 1 por cuenta, creada durante el onboarding.

Estas dos entidades son conceptos completamente separados:
- Una entidad `payer` **no** puede actuar como `owner` de alojamientos.
- Una entidad `owner` **no** es necesariamente la misma persona que la `payer`.
- En plan Basic, el administrador es a la vez propietario y cliente, pero debe registrar ambas entidades por separado.

---

## Casos de uso

### UC-ENT-01 — Crear entidad propietaria (owner) desde Configuración
- **Actor:** Admin (cualquier plan)
- **Pre-condición:** No existe ninguna entidad `type='owner'` para este `client_account_id`
- **Flujo:** Admin navega a Configuración → tab "Entidad Propietaria" → ve formulario vacío con aviso informativo → rellena campos → pulsa "Crear entidad propietaria" → `createEntity({...payload, type:"owner", client_account_id})` llamado vía edge function `manage_entity`
- **Post-condición:** Registro en tabla `entities` con `type='owner'`; ya se puede crear alojamientos

### UC-ENT-02 — Editar entidad propietaria (owner) existente
- **Actor:** Admin (cualquier plan)
- **Pre-condición:** Existe exactamente 1 entidad `type='owner'` para este tenant
- **Flujo:** Admin navega a Configuración → tab "Entidad Propietaria" → ve formulario pre-relleno → modifica campos → pulsa "Guardar entidad propietaria" → `updateEntity(id, patch, clientAccountId)` llamado directamente a Supabase
- **Post-condición:** Registro actualizado en tabla `entities`

### UC-ENT-03 — Editar entidad pagadora (payer) existente
- **Actor:** Admin (cualquier plan)
- **Pre-condición:** Existe 1 entidad `type='payer'` para este tenant (creada en onboarding)
- **Flujo:** Admin navega a Configuración → tab "Entidad Pagadora" → ve formulario pre-relleno → modifica campos → pulsa "Guardar entidad pagadora"
- **Post-condición:** Registro actualizado, `type='payer'` preservado

### UC-ENT-04 — Crear entidad pagadora (payer) si no existe
- **Actor:** Admin (plan recién creado sin onboarding completo)
- **Pre-condición:** No existe ninguna entidad `type='payer'` para este tenant
- **Flujo:** Tab "Entidad Pagadora" muestra aviso + formulario vacío → Admin rellena → `createEntity({...payload, type:"payer"})`
- **Post-condición:** Registro creado con `type='payer'`

---

## Restricciones y límites por plan

| Plan        | max_owners | Comportamiento |
|-------------|------------|----------------|
| Basic       | 1          | Puede crear 1 entidad owner; botón deshabilitado en EntitiesList si ya existe |
| Starter     | 3          | Hasta 3 entidades owner |
| Professional | -1        | Sin límite |
| Enterprise  | -1         | Sin límite |

> Nota: La pantalla Configuración solo gestiona la entidad owner principal (la primera). Para gestionar múltiples entidades owner (planes Starter+) se usa la sección Entidades (`/v2/admin/entidades`).

---

## Modelo de datos

### Tabla `entities`

| Campo              | Tipo    | Notas                                                     |
|--------------------|---------|-----------------------------------------------------------|
| `id`               | UUID PK | Generado automáticamente                                  |
| `client_account_id`| UUID FK | Tenant al que pertenece                                   |
| `type`             | TEXT    | `'owner'` o `'payer'`                                     |
| `legal_type`       | TEXT    | `persona_fisica`, `autonomo`, `persona_juridica`          |
| `legal_name`       | TEXT    | Nombre legal (si persona_juridica)                        |
| `first_name`       | TEXT    | Nombre (si persona_fisica / autonomo)                     |
| `last_name1`       | TEXT    | Primer apellido                                           |
| `last_name2`       | TEXT    | Segundo apellido (nullable)                               |
| `tax_id`           | TEXT    | NIF / CIF                                                 |
| `billing_email`    | TEXT    | Email de facturación                                      |
| `status`           | TEXT    | `active`, `inactive`                                      |

> La columna `type` ya existía en el baseline (`00000000000001_baseline_schema.sql`). **No se requiere migración de schema**.

### Relación con alojamientos
```
accommodations.owner_entity_id → entities.id  (type='owner')
```

---

## Impacto en frontend

| Archivo | Cambio |
|---|---|
| `src/pages/v2/admin/settings/AdminSettings.jsx` | Nuevo tab "Entidad Propietaria"; filtro payer en tab "Entidad Pagadora" |
| `src/services/entities.service.js` | Usa `createEntity` y `updateEntity` (ya existían) |

---

## Tests de cobertura

Ver [qa/COVERAGE.md](../../../qa/COVERAGE.md) sección **ENT** (ENT-01 a ENT-07).

---

## Historial de cambios

| Versión | Fecha      | Descripción                    |
|---------|------------|--------------------------------|
| 1.0     | 2026-04-02 | Implementación inicial BUG-046 |
