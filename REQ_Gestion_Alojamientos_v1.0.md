# Requisitos: Gestión de Alojamientos v1.0

## Descripción General

Este documento define los requisitos funcionales para el módulo de **Gestión de Alojamientos**, que permite administrar los edificios/pisos/unidades de alojamiento que contienen habitaciones alquilables.

**Roles con acceso:** Superadmin, Admin

---

## Estructura de Requisitos

```
|__ Gestión de "Alojamientos" (listar + crear + ver + editar/detalle)
    |
    |__ Pantalla: Lista "Alojamientos"
    |   |
    |   |__ Acción Botón en Pantalla:
    |   |   |__ Crear "Alojamiento" (+ Añadir Alojamiento)
    |   |
    |   |__ Mostrar Columnas en Lista:
    |   |   |__ Columna 1: Nombre del alojamiento
    |   |   |__ Columna 2: Dirección (address_line1, city)
    |   |   |__ Columna 3: Nº Habitaciones (total)
    |   |   |__ Columna 4: Ocupación (ocupadas/libres/pendientes baja)
    |   |   |__ Columna 5: Estado (Activo/Desactivado)
    |   |   |__ Columna 6: Acciones
    |   |
    |   |__ Validaciones:
    |   |   |__ Validación 1: Solo mostrar alojamientos del client_account actual
    |   |   |__ Validación 2: Superadmin puede filtrar por empresa (client_account)
    |   |   |__ Validación 3: Por defecto ocultar alojamientos desactivados
    |   |
    |   |__ Acciones Lista:
    |       |__ Filtros de Búsqueda:
    |       |   |__ Buscar por: nombre, dirección, ciudad
    |       |   |__ Checkbox: Mostrar desactivados
    |       |   |__ Selector empresa (solo Superadmin)
    |       |   |__ Limpiar filtro
    |       |
    |       |__ Acciones en Columnas:
    |           |__ Ver detalle (👁️)
    |           |__ Editar (✏️)
    |           |__ Desactivar / Activar (toggle estado)
    |           |__ Eliminar (🗑️) - borrado lógico con confirmación
    |
    |__ Pantalla: Crear "Alojamiento"
    |   |
    |   |__ SECCIÓN: Información General
    |   |   |__ Campo 1: Empresa/Client Account - desplegable (solo Superadmin) / readonly (Admin)
    |   |   |__ Campo 2: Nombre del Alojamiento - texto (obligatorio)
    |   |   |__ Campo 3: Dirección Línea 1 - texto
    |   |   |__ Campo 4: Dirección Línea 2 - texto
    |   |   |__ Campo 5: Ciudad - texto
    |   |   |__ Campo 6: Código Postal - texto
    |   |   |__ Campo 7: País - texto/desplegable
    |   |   |__ Campo 8: Número de Habitaciones - número (obligatorio, min: 1, max: 50)
    |   |
    |   |__ SECCIÓN: Configuración de Habitaciones (por cada habitación)
    |   |   |__ Campo H1: Número de habitación - autogenerado/editable
    |   |   |__ Campo H2: Precio Alquiler (€) - número decimal (obligatorio)
    |   |   |__ Campo H3: Electricidad (€) - número decimal (obligatorio)
    |   |   |__ Campo H4: Metros Cuadrados (m²) - número decimal (obligatorio)
    |   |   |__ Campo H5: Tipo de Baño - desplegable: Suite/Privado/Compartido (obligatorio)
    |   |   |__ Campo H6: Tipo de Cocina - desplegable: Suite/Privada/Compartida (obligatorio)
    |   |   |__ Campo H7: ID Cerradura - texto (opcional)
    |   |   |__ Campo H8: Notas - textarea (opcional)
    |   |
    |   |__ Validaciones de Campos:
    |   |   |__ Validación 1: Nombre del alojamiento obligatorio
    |   |   |__ Validación 2: Nombre único dentro del mismo client_account
    |   |   |__ Validación 3: Número de habitaciones >= 1 y <= 50
    |   |   |__ Validación 4: Precio alquiler >= 0
    |   |   |__ Validación 5: Electricidad >= 0
    |   |   |__ Validación 6: Metros cuadrados > 0
    |   |   |__ Validación 7: Tipo de baño obligatorio (valor por defecto: Compartido)
    |   |   |__ Validación 8: Tipo de cocina obligatorio (valor por defecto: Compartida)
    |   |   |__ Validación 9: Superadmin debe seleccionar empresa
    |   |
    |   |__ Acciones:
    |       |__ Cancelar: Volver a la lista sin guardar
    |       |__ Guardar Alojamiento: Crear el alojamiento y sus habitaciones
    |
    |__ Pantalla: Ver Detalle "Alojamiento"
    |   |
    |   |__ Mostrar Información:
    |   |   |__ Nombre del alojamiento
    |   |   |__ Dirección completa
    |   |   |__ Estado (Activo/Desactivado)
    |   |   |__ Estadísticas: Total habitaciones, Ocupadas, Libres, Pendientes baja
    |   |   |__ Tasa de ocupación (%)
    |   |
    |   |__ Mostrar Lista de Habitaciones:
    |   |   |__ Número de habitación
    |   |   |__ Estado (Libre/Ocupada/Pendiente baja)
    |   |   |__ Precio alquiler
    |   |   |__ Inquilino asignado (si ocupada)
    |   |
    |   |__ Acciones:
    |       |__ Editar alojamiento
    |       |__ Volver a la lista
    |
    |__ Pantalla: Editar "Alojamiento"
        |
        |__ SECCIÓN: Información General
        |   |__ Campo 1: Empresa - editable: No (solo lectura)
        |   |__ Campo 2: Nombre del Alojamiento - editable: Sí
        |   |__ Campo 3: Dirección Línea 1 - editable: Sí
        |   |__ Campo 4: Dirección Línea 2 - editable: Sí
        |   |__ Campo 5: Ciudad - editable: Sí
        |   |__ Campo 6: Código Postal - editable: Sí
        |   |__ Campo 7: País - editable: Sí
        |   |__ Campo 8: Número de Habitaciones - editable: Sí (con restricciones*)
        |
        |__ SECCIÓN: Configuración de Habitaciones
        |   |__ (Mismos campos que en Crear)
        |   |__ Nota: No se pueden eliminar habitaciones ocupadas
        |
        |__ Validaciones de Campos:
        |   |__ Validación 1: Nombre obligatorio
        |   |__ Validación 2: Nombre único (excepto el actual)
        |   |__ Validación 3: No reducir habitaciones si hay ocupadas que se eliminarían
        |   |__ Validación 4: Precio alquiler >= 0
        |   |__ Validación 5: No modificar habitación si tiene inquilino activo (solo algunos campos)
        |
        |__ Acciones:
            |__ Cancelar: Volver sin guardar cambios
            |__ Guardar Cambios: Actualizar el alojamiento
```

---

## Modelo de Datos

### Entidad: Alojamiento (accommodations)

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| id | UUID | Sí (auto) | Identificador único |
| client_account_id | UUID | Sí | FK a client_accounts |
| name | VARCHAR(255) | Sí | Nombre del alojamiento |
| address_line1 | VARCHAR(255) | No | Dirección línea 1 |
| address_line2 | VARCHAR(255) | No | Dirección línea 2 |
| city | VARCHAR(100) | No | Ciudad |
| postal_code | VARCHAR(20) | No | Código postal |
| country | VARCHAR(100) | No | País |
| status | ENUM | Sí | active / inactive |
| created_at | TIMESTAMP | Sí (auto) | Fecha de creación |
| updated_at | TIMESTAMP | Sí (auto) | Fecha de actualización |

### Entidad: Habitación (rooms)

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| id | UUID | Sí (auto) | Identificador único |
| accommodation_id | UUID | Sí | FK a accommodations |
| number | VARCHAR(20) | Sí | Número de habitación |
| monthly_rent | DECIMAL(10,2) | Sí | Precio alquiler mensual |
| electricity_fee | DECIMAL(10,2) | Sí | Cuota electricidad |
| area_sqm | DECIMAL(8,2) | Sí | Metros cuadrados |
| bathroom_type | ENUM | Sí | suite / private / shared |
| kitchen_type | ENUM | Sí | suite / private / shared |
| lock_id | VARCHAR(50) | No | ID de cerradura |
| notes | TEXT | No | Notas adicionales |
| status | ENUM | Sí | free / occupied / pending_checkout |
| created_at | TIMESTAMP | Sí (auto) | Fecha de creación |
| updated_at | TIMESTAMP | Sí (auto) | Fecha de actualización |

---

## Reglas de Negocio

1. **Multi-tenant**: Cada alojamiento pertenece a un client_account específico
2. **Borrado lógico**: Los alojamientos no se eliminan, se marcan como inactivos
3. **Protección de ocupación**: No se puede eliminar/desactivar un alojamiento con habitaciones ocupadas
4. **Habitaciones vinculadas**: Al crear un alojamiento, se crean automáticamente las habitaciones
5. **Nombre único**: No pueden existir dos alojamientos con el mismo nombre en el mismo client_account
6. **Reducción de habitaciones**: Solo se pueden reducir habitaciones si las últimas están libres

---

## Permisos por Rol

| Acción | Superadmin | Admin |
|--------|------------|-------|
| Ver lista | ✅ (todas las empresas) | ✅ (solo su empresa) |
| Crear | ✅ | ✅ |
| Editar | ✅ | ✅ |
| Desactivar/Activar | ✅ | ✅ |
| Eliminar | ✅ | ❌ |
| Filtrar por empresa | ✅ | ❌ |

---

## Versión

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2025-02-05 | SmartRent | Versión inicial basada en v1 |
