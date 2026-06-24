# REQ-015 — Habitación compartida con acompañante (contrato único)

## Status
ACTIVE

## Owner
@javierlealmora-cyber

## Last updated
2026-05-03

---

## 🎯 Objetivo

Permitir registrar a **dos personas en la misma habitación bajo un único contrato**, con un titular responsable legal (con cuenta de acceso) y un acompañante identificado solo a efectos de contrato y cerradura, **sin violar la regla de 1 asignación activa por habitación** ni el modelo facturación / energético existente.

---

## 📌 Alcance

### Incluye
- Toggle "Habitación compartida" al asignar habitación.
- Nueva tabla `lodger_accompanists` (ficha de persona) y FK `lodger_room_assignments.accompanist_id`.
- Flag `rooms.is_shared` informativo para UX.
- Reutilización del mismo `accompanist_id` en `reassign_room` (el acompañante viaja con el titular).
- Buscador de inquilinos por datos del acompañante (nombre, DNI, email).
- Mostrar nombre del acompañante junto al del titular en el portal del lodger.
- Edición de datos personales del acompañante.
- Eliminación excepcional del acompañante por `superadmin` con motivo auditado.

### NO incluye
- Promoción del acompañante a titular (prohibido por diseño).
- Credencial TTLock propia para el acompañante (MVP — accede con la del titular).
- Cuenta de acceso web ni perfil en `profiles` para el acompañante.
- 3 o más ocupantes por habitación.
- Cambios en el modelo de capacidad de habitación o en `EXCLUDE no_overlapping_assignments`.

---

## 🧩 Descripción funcional

### Concepto

Una habitación compartida en SmartRoom Rental sigue siendo, técnicamente, una habitación con **una única asignación activa**. La diferencia es que la asignación referencia opcionalmente a un **acompañante**, una persona registrada con datos identificativos suficientes para constar en el contrato y poder identificarse en el alojamiento, pero sin acceso a la plataforma y sin entidad económica propia.

Todo el contrato (renta, fianza, comisión, factura energética, boletín, cerradura) sigue a nombre del **titular**. El acompañante es siempre **inseparable** del titular: si el titular cambia de habitación, el acompañante le acompaña automáticamente; si el titular hace check-out, la asignación se cierra y el acompañante queda congelado en el histórico.

### Reglas de inseparabilidad

1. **Contrato único**: una renta, una fianza, una comisión, una factura energética, una cuenta.
2. **Titular inmutable**: durante toda la vida de la asignación el titular no cambia.
3. **Acompañante inseparable**: viaja con el titular en cualquier reasignación.
4. **No promoción**: el acompañante NO puede pasar a titular. Para ello debe rescindirse el contrato compartido y crearse uno nuevo individual.
5. **Edición limitada**: solo se permiten correcciones de datos personales del acompañante; no se puede sustituir a la persona.
6. **Eliminación restringida**: solo `superadmin` puede eliminar al acompañante mid-contract, exclusivamente para corregir errores de captura, con motivo obligatorio en `audit_log`.
7. **Un único acompañante por titular activo**: garantizado implícitamente por la regla "1 asignación activa por habitación" + FK `accompanist_id`.

---

## 🔁 Flujo funcional

### Alta con acompañante (UC-15-01)
1. Admin entra a "Nuevo Inquilino" → completa datos del titular.
2. En el paso de asignación de habitación, activa el switch **"Habitación compartida — añadir acompañante"**.
3. Despliega un sub-formulario con los mismos campos que el titular (`LodgerFormFields` reutilizado, `email`/`phone` opcionales) + dirección (`AddressFormFields` oficial, opcional).
4. Pulsa "Asignar habitación".
5. Edge `manage_lodger.assign_room` crea atómicamente: `lodger_accompanists` + `lodger_room_assignments` con `accompanist_id` poblado.
6. `audit_log` registra la acción.

### Cambio de habitación (UC-15-02)
1. Admin abre `ChangeRoomModal` desde el detalle del inquilino.
2. Si la asignación activa tiene acompañante → modal muestra banner: *"Esta asignación incluye un acompañante (Nombre). Al cambiar de habitación, el acompañante se mantiene en el contrato"*.
3. Admin selecciona nueva habitación y confirma.
4. Edge `manage_lodger.reassign_room` cierra la asignación anterior y crea la nueva **copiando el mismo `accompanist_id`**.
5. La fila de `lodger_accompanists` no se modifica.

### Edición de datos del acompañante (UC-15-03)
1. En `TenantDetail`, sección "Acompañante", admin pulsa **Editar**.
2. Modal con campos personales editables (nombre, DNI, contacto, dirección).
3. Edge `manage_lodger.update_accompanist` aplica el patch.
4. Auditado.

### Eliminación excepcional del acompañante (UC-15-04)
1. **Solo superadmin** ve el botón **Eliminar** en la sección Acompañante.
2. Modal pide motivo obligatorio (texto libre, mínimo 10 caracteres).
3. Edge `manage_lodger.remove_accompanist` marca `lodger_accompanists.status='inactive'` y limpia `lodger_room_assignments.accompanist_id` de la asignación activa.
4. Auditado con `reason` en `audit_log.new_values`.

### Check-out del titular en habitación compartida (UC-15-05)
1. Admin ejecuta check-out normal del titular.
2. La asignación se cierra (`move_out_date`) **manteniendo `accompanist_id` apuntando al registro del acompañante**.
3. El acompañante queda en histórico, no se modifica nada más.

### Pase a habitación individual (UC-15-06)
1. **No es un atajo automatizado**. Requiere proceso manual de 2 pasos:
   a. Check-out del titular en fecha X (cierra contrato compartido).
   b. Nueva alta independiente para quien se quede (sin acompañante). Si quien se queda era el acompañante, el admin debe darle de alta como nuevo titular en `profiles` desde "Nuevo Inquilino".

### Búsqueda de inquilinos por datos del acompañante (UC-15-07)
1. Admin escribe en el buscador de `TenantsList` un DNI o nombre que pertenece al acompañante.
2. El hook `useLodgers` hace LEFT JOIN sobre la asignación activa → `lodger_accompanists` y aplica el `OR` sobre los campos del acompañante.
3. La fila resultado del titular muestra un tag **"Match acompañante"**.

---

## ✅ Casos válidos

- Alta de inquilino sin acompañante (caso normal, sin cambios).
- Alta de inquilino con acompañante en habitación con `is_shared=false` (el flag es solo informativo, se permite).
- Alta de inquilino con acompañante en habitación con `is_shared=true` (sugerido por UI).
- Cambio de habitación arrastra acompañante automáticamente.
- Edición de DNI/nombre/contacto del acompañante por admin.
- Eliminación del acompañante por superadmin con motivo válido.
- Búsqueda por DNI del acompañante encuentra al titular.
- Check-out del titular cierra asignación con `accompanist_id` congelado.

---

## ❌ Casos inválidos

- Intentar promocionar al acompañante a titular (acción inexistente en la API).
- Intentar crear 2 acompañantes para el mismo titular activo (bloqueado por la regla "1 asignación activa por titular" + FK).
- Admin no-superadmin intenta eliminar al acompañante → Edge devuelve `FORBIDDEN`.
- Eliminar al acompañante sin proporcionar `reason` o con menos de 10 caracteres → Edge devuelve `VALIDATION`.
- Asignar acompañante de otro tenant a una asignación local (bloqueado por RLS multi-tenant).
- Borrar físicamente la fila de `lodger_accompanists` (prohibido por diseño; siempre soft delete).

---

## 📊 Reglas de negocio

- **R1** — Contrato único: la asignación referencia 1 titular y, opcionalmente, 1 acompañante. Toda la economía y el acceso son del titular.
- **R2** — Inmutabilidad del titular durante la asignación.
- **R3** — Inseparabilidad: `reassign_room` siempre arrastra el `accompanist_id` por código (no por la UI).
- **R4** — Prohibida promoción del acompañante.
- **R5** — Edición limitada: `update_accompanist` solo permite modificar datos personales y de contacto. Rechaza cambios en `client_account_id` o `status`.
- **R6** — Eliminación solo superadmin con `reason` obligatorio.
- **R7** — Un acompañante activo por titular (consecuencia de las reglas anteriores, no necesita constraint adicional).
- **R8** — Auditoría obligatoria en `audit_log` para `set_accompanist`, `update_accompanist`, `remove_accompanist`.
- **R9** — `rooms.is_shared` es solo informativo para la UI; no altera capacidad ni estados derivados.
- **R10** — Defense in depth multi-tenant: `lodger_accompanists.client_account_id NOT NULL` por la regla §7 de `architecture.md`.

---

## 🗄️ Impacto en base de datos

### Tablas afectadas
- **Nueva**: `lodger_accompanists`.
- **Modificada**: `lodger_room_assignments` → nueva columna `accompanist_id uuid NULL`.
- **Modificada**: `rooms` → nueva columna `is_shared boolean NOT NULL DEFAULT false`.

### `lodger_accompanists` — campos relevantes

```sql
id                 uuid PK
client_account_id  uuid NOT NULL → client_accounts(id) ON DELETE CASCADE

-- Identidad (espejo de profiles)
first_name, last_name1, last_name2, nickname
document_type ('dni'|'nie'|'passport'|'other'), document_id
gender ('male'|'female'|'other'), birth_date, nationality

-- Contacto (opcional)
email, phone

-- Dirección (modelo estándar de 7 campos, opcional)
address_street, address_number, address_floor,
address_postal_code, address_city, address_province,
address_country (DEFAULT 'España')

-- Metadatos
notes
status ('active'|'inactive') NOT NULL DEFAULT 'active'
created_at, updated_at  (trigger moddatetime)
```

### Constraints
- FK `accompanist_id ON DELETE SET NULL` para evitar borrados en cascada inesperados.
- CHECK `document_type IN (...)`, `gender IN (...)`, `status IN (...)`.

### RLS
```sql
USING / WITH CHECK: client_account_id = get_my_client_account_id()
```

### Índices
- `idx_accompanist_account` on `client_account_id`.
- `idx_accompanist_document` on `lower(document_id)` para búsqueda.
- `idx_accompanist_email` on `lower(email)`.
- `idx_assignments_accompanist` on `accompanist_id WHERE accompanist_id IS NOT NULL`.

### Componente reutilizable
La sección de dirección debe utilizar exclusivamente `@src/components/AddressFormFields.jsx` (el oficial) — los 7 nombres de campo coinciden 1:1 con los de la tabla, garantizando `form.getFieldsValue() → payload` directo. Ver `@docs/database/ADDRESS-STANDARDIZATION.md`.

---

## 🧱 Impacto en frontend

### Componentes afectados

| Componente | Cambio |
|---|---|
| `services/lodgers.service.js` | Extender `assignRoomToLodger`/`reassignRoom` con `accompanist?` opcional. Añadir `updateAccompanist`, `removeAccompanist`. |
| `pages/v2/admin/tenants/components/RoomAssignmentForm.jsx` | Toggle "Habitación compartida — añadir acompañante" bajo el campo Habitación. Sub-form con `LodgerFormFields` (prop `isAccompanist=true`) + `AddressFormFields`. |
| `pages/v2/admin/tenants/components/ChangeRoomModal.jsx` | Banner informativo cuando hay acompañante. |
| `pages/v2/admin/tenants/TenantDetail.jsx` | Nueva `Section` "ACOMPAÑANTE" justo debajo de "Asignación actual". |
| `pages/v2/admin/tenants/components/AccompanistSection.jsx` *(nuevo)* | Cabecera siempre visible con el nombre + collapse `ghost` con datos. Botones Editar y, solo superadmin, Eliminar. |
| `pages/v2/admin/tenants/components/AccompanistEditModal.jsx` *(nuevo)* | Modal con `LodgerFormFields` + `AddressFormFields` para edición. |
| `pages/v2/admin/tenants/components/LodgerFormFields.jsx` | Prop `isAccompanist`: hace `email`/`phone` opcionales y oculta "Enviar email de onboarding". |
| `pages/v2/admin/tenants/TenantsList.jsx` | Imagen `Inquilinos_cuerpo_entero.webp` cuando `accompanist_id` (ya implementado). Tag "Compartida" / "Match acompañante". |
| `hooks/useLodgers.js` | LEFT JOIN con `lodger_accompanists` para buscador. |
| Cards de habitación (`AccommodationDetail`, `RoomsSearch`) | Badge "Compartida" + contador "2 ocupantes". |
| Portal lodger (cabecera) | Línea secundaria "+ Nombre (acompañante)" si existe. |

### Validaciones UI
- Switch "Habitación compartida" sugerido ON cuando `room.is_shared=true`.
- Campos de acompañante: `first_name`, `last_name1` requeridos; resto opcional.
- Eliminación: motivo obligatorio mínimo 10 caracteres.

### Estados visibles
- Card del inquilino con tag "Compartida" si la asignación activa tiene acompañante.
- Sección "Acompañante" solo se renderiza si `active_assignment.accompanist_id !== null`.
- En histórico, sección read-only con badge "Histórico".

---

## 🧪 Validación (QA)

### Tests asociados

**Unit (Edge):**
- Validación de payload `accompanist` en `assign_room`.
- `update_accompanist` rechaza cambios en `client_account_id` y `status`.
- `remove_accompanist` rechaza request sin rol `superadmin` o sin `reason` válido.

**Unit (Frontend):**
- Toggle del formulario despliega/oculta correctamente.
- Sección Acompañante en `TenantDetail` renderiza solo si hay acompañante.
- Botón Eliminar visible solo para superadmin.

**E2E:**
- `qa/e2e/tenant-create-shared.spec.js` — alta con acompañante.
- `qa/e2e/change-room-keeps-accompanist.spec.js` — cambio de habitación arrastra acompañante.
- `qa/e2e/search-by-accompanist.spec.js` — buscador encuentra titular por datos del acompañante.
- `qa/e2e/energy-shared-room.spec.js` — liquidación energética emite un único boletín al titular.
- `qa/e2e/checkout-shared.spec.js` — check-out del titular cierra asignación con `accompanist_id` congelado.
- `qa/e2e/remove-accompanist-forbidden.spec.js` — admin normal no puede eliminar.

---

## 🔗 Trazabilidad

- **Migraciones SQL:**
  - `add_rooms_is_shared.sql`
  - `create_lodger_accompanists.sql`
  - `add_accompanist_id_to_assignments.sql`
- **Edge Function:** `manage_lodger` extendida con `assign_room`+`accompanist`, `reassign_room` (arrastre), `update_accompanist`, `remove_accompanist`.
- **Reglas:** `.windsurf/rules/shared-rooms.md`.
- **Plan de implementación:** `C:\Users\javie\.windsurf\plans\habitacion-compartida-acompanante-133d20.md`.
- **Relacionado con:** REQ-002 (lifecycle), REQ-003 (asignación), REQ-005 (estados), REQ-007 (liquidación), REQ-014 (cerradura).

---

## ⚠️ Consideraciones

- El componente `@src/components/shared/AddressFormFields.jsx` está deprecado (usa `address_line1/2`). **No usar** — emplear el oficial `@src/components/AddressFormFields.jsx`.
- La regla "1 acompañante activo por titular" no necesita índice único explícito: queda garantizada por la regla preexistente "1 asignación activa por habitación" + FK.
- El acompañante NO consume slot de plan (`max_admin_users`). Solo cuenta como persona en contrato, no como usuario.
- Si en el futuro se requiere credencial TTLock para el acompañante, será una extensión de REQ-014, no de este requerimiento.

---

## 📝 Observaciones

- Decisión clave: la dirección del acompañante puede ser distinta de la del titular (caso real: pareja con domicilios fiscales separados). Si coincide, el frontend muestra "Misma del titular" y el admin no necesita rellenarla.
- La feature avanza con defaults seguros: `is_shared=false` en todas las habitaciones existentes, `accompanist_id=NULL` en todas las asignaciones existentes. **Cero regresión sobre datos actuales**.
- Auditar al menos `created_at` + `actor_user_id` + `entity_id` permite reconstruir cualquier historial.
