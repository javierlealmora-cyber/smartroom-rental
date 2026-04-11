# REQ-012 — Búsqueda global de habitaciones

**Estado:** Implementado  
**Prioridad:** P1  
**Fecha:** 2026-04-06  
**Implementado en:** `src/pages/v2/admin/rooms/RoomsSearch.jsx`

---

## Descripción

Los administradores necesitan ver y buscar habitaciones de forma global, sin tener que navegar primero a un alojamiento concreto. Esta funcionalidad proporciona una vista unificada de todas las habitaciones del portfolio con filtros en cascada y dos modos de visualización.

---

## Actores

- **Admin** — rol `admin`, `superadmin`

---

## Requisitos funcionales

### RF-012-01 — Acceso desde navegación principal

El sistema debe mostrar un icono de "Habitaciones" en la barra de navegación superior del portal admin (junto a Alojamientos). Al hacer clic navega a `/v2/admin/habitaciones`.

**Icono:** `buscar-habitacion-icon.webp`

### RF-012-02 — Carga de todas las habitaciones

Al cargar la página, el sistema debe obtener todas las habitaciones de todos los alojamientos del tenant activo, incluyendo:
- Datos de la habitación: número, estado derivado, tipo de baño, tipo de cocina, precio mensual
- Alojamiento al que pertenece: nombre
- Entidad propietaria del alojamiento: nombre legal/comercial
- Asignación activa (si existe): inquilino, fecha entrada, fecha baja prevista, precio mensual

### RF-012-03 — Filtros en cascada

El panel de filtros debe ofrecer los siguientes selectores, aplicados en cascada:

| Filtro | Tipo | Valores | Comportamiento |
|---|---|---|---|
| Entidad propietaria | Select (búsqueda) | Lista de entidades type=owner | Al cambiar, limpia el filtro de Alojamiento si el seleccionado ya no pertenece a la entidad |
| Alojamiento | Select (búsqueda) | Alojamientos del tenant (filtrados por entidad si está seleccionada) | — |
| Estado | Select | Libre / Ocupada / Pend. baja / Mantenimiento | — |
| Baño | Select | Compartido / Privado / En suite | — |
| Cocina | Select | Compartida / Privada / Sin cocina | — |
| Limpiar campos | Botón (link, danger) | — | Siempre visible; deshabilitado si no hay búsqueda activa. Resetea filtros, resultados y estado persistido |

### RF-012-04 — Toggle de vista

El usuario puede alternar entre dos modos de visualización sin perder los filtros activos:

- **Vista cards** (defecto): grid responsive (xs=24, sm=12, md=8, xl=6). Cada card usa el mismo diseño que AccommodationDetail con imagen dinámica por género y badges superpuestos.
- **Vista lista**: tabla Ant Design con columnas: N.º, Alojamiento, Entidad, Estado, Precio, Baño, Cocina, Acciones.

### RF-012-05 — Imagen dinámica según género e inquilino

La imagen de la card de habitación debe ser:
- `Habitación sin Inquilino en la cama.png` → habitación libre o en mantenimiento
- `Habitación con Inquilino en la cama.png` → habitación ocupada por inquilino masculino
- `Habitación con Inqulina en la cama.png` → habitación ocupada por inquilina femenina (profiles.gender = "female")

### RF-012-06 — Acciones por habitación

| Acción | Disponible cuando | Destino |
|---|---|---|
| Ver detalle inquilino | Habitación ocupada | `/v2/admin/inquilinos/:id/detalle` |
| Editar inquilino | Habitación ocupada | `/v2/admin/inquilinos/:id/editar` |
| Cambiar habitación | Habitación ocupada | `/v2/admin/alojamientos/:accId/habitaciones` |
| Check-out | Habitación ocupada (estado=occupied) | `/v2/admin/alojamientos/:accId/habitaciones` |
| Asignar inquilino | Habitación libre | `/v2/admin/alojamientos/:accId/habitaciones?assignRoom=:roomId` |

> Los modales de checkout y reasignación dependen del estado de AccommodationDetail. Las acciones de esta página navegan al alojamiento correspondiente para ejecutarlas.

### RF-012-07 — Contador de resultados

La cabecera debe mostrar:
- Sin búsqueda activa: "Usa los filtros para buscar habitaciones"
- Con búsqueda activa y resultados: "N de M habitaciones" (o "M habitaciones" si no hay filtro activo)
- Cargando: "Cargando…"

### RF-012-08 — Estado vacío y búsqueda diferida

La lista de resultados **no se muestra** hasta que el usuario active al menos un filtro. Comportamiento:
- **Sin búsqueda activa (entrada inicial o tras limpiar):** Mensaje "Selecciona uno o más filtros para ver habitaciones." Sin resultados.
- **Con filtros activos, 0 coincidencias:** "No hay habitaciones que coincidan con los filtros."
- **Con filtros activos, resultados:** se muestran las habitaciones.

### RF-012-09 — Persistencia de filtros entre navegaciones

Los filtros y el estado de búsqueda persisten en `localStorage` (clave: `smartrent_rooms_filters`). Al volver a la página tras navegar a otro apartado:
- Se restauran los valores de todos los filtros.
- Si había una búsqueda activa, se muestran los resultados correspondientes.
- "Limpiar campos" elimina la entrada de `localStorage` además de resetear la UI.

---

## Requisitos no funcionales

- **RNF-012-01** — La carga inicial debe ejecutar las queries en paralelo (Promise.all)
- **RNF-012-02** — El filtrado es client-side (sin nuevas queries al cambiar filtros)
- **RNF-012-03** — La vista tabla incluye paginación (50 por página)
- **RNF-012-04** — Aislamiento multi-tenant: las queries pasan por RLS de Supabase; no se filtran datos de otros tenants
- **RNF-012-05** — Los filtros se persisten en `localStorage` para sobrevivir a la navegación intra-app; se limpian explícitamente al pulsar "Limpiar campos"

---

## Dependencias

| Dependencia | Tipo |
|---|---|
| REQ-003 (room-assignment) | Requiere `lodger_room_assignments` con move_out_date |
| REQ-005 (room-states) | Lógica `getRoomStatus` derivada de asignaciones |
| REQ-011 (entity-management) | Entidades propietarias para el filtro |
| `listAccommodations()` | Servicio en `src/services/accommodations.service.js` |
| `listEntities({ type: "owner" })` | Servicio en `src/services/entities.service.js` |
| `profiles.gender` | Campo existente en la tabla `profiles` |

---

## Tests relacionados

Ver `qa/COVERAGE.md` → sección **RSE — Búsqueda Global de Habitaciones**

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-04-06 | Implementación inicial (CHG-2026-04-06-room-search) |
| 2026-04-07 | RF-012-08 revisado: búsqueda diferida (sin resultados hasta activar filtro). RF-012-09 añadido: persistencia de filtros en localStorage. RF-012-07 actualizado con mensaje de estado sin búsqueda. |
