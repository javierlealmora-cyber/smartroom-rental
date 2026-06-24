---
trigger: glob
globs:
  - "supabase/migrations/**"
  - "supabase/functions/manage_lodger/**"
  - "src/pages/v2/admin/tenants/**"
  - "src/services/lodgers.service.js"
  - "src/hooks/useLodgers.js"
  - "src/components/AccommodationCard.jsx"
description: Reglas de obligado cumplimiento para la feature de habitación compartida con acompañante (REQ-015). Define qué es un acompañante, cómo se modela, qué está prohibido y qué auditar. Consultar SIEMPRE antes de tocar cualquier código relacionado con asignación de habitación, manage_lodger Edge Function o pantallas de inquilino.
---

# Habitación compartida con acompañante — Reglas

> Soporte normativo: `@docs/requirements/current/REQ-015-shared-room-accompanist.md`
> Plan original: `C:\Users\javie\.windsurf\plans\habitacion-compartida-acompanante-133d20.md`

---

## 0. Regla de oro

> En una habitación compartida hay **UN titular** (con cuenta) y **UN acompañante** (sin cuenta). El acompañante **NO se promociona** jamás, **viaja siempre con el titular** en cualquier reasignación, y la habitación sigue admitiendo **una única asignación activa**.

---

## 1. Modelo (resumen)

```
client_accounts
  └── profiles (titular, role='lodger')
        └── lodger_room_assignments
              ├── lodger_id        → profiles
              └── accompanist_id?  → lodger_accompanists  (FK nullable)

lodger_accompanists  ← ficha de persona pura, SIN cuenta, SIN role
  └── client_account_id NOT NULL  (defense in depth multi-tenant)

rooms.is_shared boolean DEFAULT false  ← solo flag UX
```

### Decisiones técnicas congeladas

- **Sin `primary_lodger_id`** en `lodger_accompanists`: el vínculo titular ↔ acompañante vive exclusivamente en `lodger_room_assignments.accompanist_id`. Única fuente de verdad: la asignación.
- **Con `client_account_id`** en `lodger_accompanists`: defense in depth + RLS simple + cumplimiento de la regla §7 de `architecture.md`.
- **Reutilización del mismo registro** en `reassign_room`: la nueva asignación copia el `accompanist_id`. NO se clona la fila de `lodger_accompanists`.
- **Modelo de dirección**: 7 campos estándar (`address_street`, `address_number`, `address_floor`, `address_postal_code`, `address_city`, `address_province`, `address_country`). Mismo set que `profiles`, `entities`, `accommodations`. Documentado en `@docs/database/ADDRESS-STANDARDIZATION.md`.

---

## 2. Prohibido

- ❌ Crear perfil en `profiles` para un acompañante.
- ❌ Darle a un acompañante acceso web, role, JWT o credencial TTLock propia (MVP).
- ❌ Promocionar al acompañante a titular por código (la acción no existe en `manage_lodger`).
- ❌ Mutar `client_account_id` de `lodger_accompanists` fuera del alta.
- ❌ Borrar físicamente filas de `lodger_accompanists` o de `lodger_room_assignments`. Siempre soft delete (`status='inactive'`) o cierre temporal (`move_out_date`).
- ❌ Usar el componente deprecado `@src/components/shared/AddressFormFields.jsx` (usa nombres antiguos `address_line1/2`). Usar siempre `@src/components/AddressFormFields.jsx`.
- ❌ Duplicar `Form.Item` de dirección en componentes de acompañante: hay que reutilizar `AddressFormFields`.
- ❌ Permitir que un admin no-superadmin elimine al acompañante.

---

## 3. Obligatorio

- ✅ **Auditar** en `audit_log` toda acción sobre el acompañante:
  - `set_accompanist` (alta junto con la asignación).
  - `update_accompanist` (corrección de datos).
  - `remove_accompanist` (solo superadmin, con `reason` ≥ 10 caracteres).
- ✅ **Arrastrar** `accompanist_id` en `reassign_room` por código en la Edge Function. Nunca delegar este arrastre a la UI.
- ✅ **Toggle "Habitación compartida"** siempre en el mismo punto del `RoomAssignmentForm` (justo debajo del campo Habitación). Si la habitación tiene `is_shared=true`, el switch aparece sugerido ON.
- ✅ **Sección Acompañante en `TenantDetail`** con cabecera siempre visible (nombre del acompañante) y collapse `ghost` con los datos detallados.
- ✅ **Botón Eliminar** restringido a `superadmin`. Botón Editar disponible para admin normal.
- ✅ **Reutilizar componentes existentes**:
  - `LodgerFormFields` con prop `isAccompanist=true` (hace `email`/`phone` opcionales y oculta "Enviar email de onboarding").
  - `AddressFormFields` oficial con todos los campos opcionales y `dividerText="Dirección del acompañante"`.
- ✅ **RLS multi-tenant** en `lodger_accompanists`: `client_account_id = get_my_client_account_id()`.
- ✅ **Trigger `set_updated_at`** sobre `lodger_accompanists` con `moddatetime`.

---

## 4. Edge Function `manage_lodger` — acciones

| Acción | Quién | Auditar | Comportamiento |
|---|---|---|---|
| `assign_room` con `accompanist?` | admin | sí | Crea `lodger_accompanists` (si payload presente) + `lodger_room_assignments` con `accompanist_id`. Atómico. |
| `reassign_room` | admin | sí | Cierra asignación anterior, crea nueva, **copia `accompanist_id` por código**. |
| `update_accompanist` | admin | sí | Patch de datos personales. **Rechaza** cambios en `client_account_id`, `status`. |
| `remove_accompanist` | **superadmin** | sí | Marca `lodger_accompanists.status='inactive'` y limpia `accompanist_id` de la asignación activa. Requiere `reason` ≥ 10 caracteres. |

**Acciones inexistentes** (NO implementar nunca):
- `promote_accompanist_to_primary` ❌
- `swap_lodger_and_accompanist` ❌

Formato de respuesta estándar: `{ ok, data?, error? }` con códigos `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `PLAN_LIMIT_EXCEEDED`, `INTERNAL`.

---

## 5. Frontend — coherencia visual

- Card de inquilino (`TenantsList`): mostrar `Inquilinos_cuerpo_entero.webp` cuando la asignación activa tiene `accompanist_id`. Helper `getTenantImage(t)` ya implementado.
- Tag `<Tag>Compartida</Tag>` junto al nombre del titular si la asignación activa tiene acompañante.
- Tag `<Tag color="blue">Match acompañante</Tag>` cuando el resultado del buscador vino por datos del acompañante.
- Cards de habitación: badge "Compartida" para `is_shared=true`; contador "2 ocupantes" con `<TeamOutlined/>` para asignaciones con acompañante.
- Portal del lodger: línea secundaria gris "+ Nombre (acompañante)" en la cabecera. **Ningún tab, sección ni pantalla nueva** en el portal.

---

## 6. Checklist antes de tocar código relacionado

- [ ] ¿Se afecta la regla "1 asignación activa por habitación" / `EXCLUDE no_overlapping_assignments`? → No debe cambiar.
- [ ] ¿La operación afecta al acompañante? → Validar autorización en Edge (admin vs superadmin).
- [ ] ¿Se auditó la acción en `audit_log` con patrón `try/catch` non-fatal?
- [ ] ¿Se está reutilizando `LodgerFormFields` y `AddressFormFields` oficiales?
- [ ] ¿Se preservó la homogeneidad UX del `TenantDetail` (Section + DataRow 120 px label)?
- [ ] ¿La acción está en `manage_lodger` y se invoca con `invokeWithAuth`?
- [ ] ¿Las lecturas pasan por RLS directa o necesitan service role?

---

## 7. Anti-patrones detectables en review

- Cualquier `INSERT INTO lodger_accompanists` desde el frontend → ❌ debe ir por Edge.
- Cualquier `UPDATE lodger_accompanists SET client_account_id = ...` → ❌ inmutable.
- Cualquier código que en `reassign_room` requiera al frontend pasar el `accompanist_id` → ❌ la Edge debe leerlo de la asignación cerrada.
- Cualquier nuevo campo de dirección con nombre distinto a los 7 estándar → ❌ contradice `ADDRESS-STANDARDIZATION.md`.
- Cualquier intento de añadir `role='accompanist'` en `profiles` o tabla equivalente → ❌ el acompañante no es usuario.
