# CHG-2026-04-02 — Migración de Edge Functions a llamadas directas Supabase

**Fecha:** 2026-04-02  
**Tipo:** Refactoring de arquitectura  
**Impacto:** Bajo riesgo (sin cambio de schema ni comportamiento visible para el usuario)  
**Defectos cerrados:** BUG-047, BUG-048, BUG-049

---

## Motivación

Las edge functions `manage_accommodation`, `manage_entity` y `wizard_init` provocaban errores 401 cuando el JWT del usuario expiraba durante el uso. El circuit breaker de `invokeWithAuth` abría y forzaba logout, perdiendo los datos del formulario activo.

La causa raíz es que las edge functions hacen su propia validación `supabase.auth.getUser(token)` con el service role key, lo que requiere un JWT vigente en cada llamada. En cambio, las llamadas directas a Supabase desde el cliente gestionan el token automáticamente con `autoRefreshToken: true`.

---

## Cambios aplicados

### 1. `manage_accommodation` → INSERT directo
**Archivo:** `src/services/accommodations.service.js`  
`createAccommodation()` ahora inserta directamente en `accommodations` y `rooms`. El RLS valida tenant y rol.

### 2. `manage_entity` → INSERT directo
**Archivo:** `src/services/entities.service.js`  
`createEntity()` ahora inserta directamente en `entities`. Eliminados `invokeWithAuth` y `extractEdgeError`. El RLS valida tenant y rol.

### 3. `wizard_init` → UPDATE directo
**Archivo:** `src/services/clientAccounts.service.js`  
`callWizardInit()` ahora llama a `supabase.auth.getUser()` + UPDATE directo en `profiles.onboarding_status`. Eliminada variable `FN_WIZARD_INIT`.

---

## Edge functions que permanecen sin cambios

| Edge Function | Motivo |
|---|---|
| `manage_lodger` | Requiere `auth.admin.createUser()` con service role |
| `wizard_submit` | Requiere service role + Stripe API |
| `provision_client_account_superadmin` | Requiere service role, solo superadmin |
| `scan_energy_bill` | Requiere OpenAI API key (secreta, server-side) |
| `stripe_webhook` | Webhook externo de Stripe |

---

## Sin cambios de schema

No se requieren migraciones SQL. El RLS en las tablas afectadas (`accommodations`, `rooms`, `entities`, `profiles`) ya estaba correctamente configurado en el baseline.

---

## Impacto en tests

- `SEC-04` en COVERAGE.md actualizado: "Edge Functions validan JWT" → "RLS valida tenant en escrituras directas"
- ADR-004 actualizado con tabla de estado de cada edge function
