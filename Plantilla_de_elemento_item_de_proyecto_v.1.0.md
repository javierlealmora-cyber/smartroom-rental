# Plantilla de Elemento/Item de Proyecto v1.0

## Descripción

Esta plantilla se utiliza para recoger toda la información de requisitos de un **Item de Proyecto** donde se describe:

1. **Pantalla de Lista**: Campos de la lista y acciones aplicables a cada registro
2. **Formulario de Creación**: Campos necesarios para crear un item y sus validaciones
3. **Formulario de Edición**: Campos modificables y sus validaciones

---

## Estructura de Requisitos

```
## Estructura de Requisitos de listar itms:

|__ Gestión de "[NOMBRE_ENTIDAD]" (listar + crear + ver + editar/detalle)
    |
    |__ Pantalla: Lista "[NOMBRE_ENTIDAD]"
    |   |
    |   |__ Acción Botón en Pantalla:
    |   |   |__ Crear "[NOMBRE_ENTIDAD]"
    |   |
    |   |__ Mostrar Columnas en Lista:
    |   |   |__ Columna 1: [indicar campo]
    |   |   |__ Columna 2: [indicar campo]
    |   |   |__ Columna 3: [indicar campo]
    |   |   |__ Columna n: [indicar campo]
    |   |
    |   |__ Validaciones:
    |   |   |__ Validación 1: [indicar validaciones]
    |   |   |__ Validación n: [indicar validaciones]
    |   |
    |   |__ Acciones Lista:
    |       |__ Filtros de Búsqueda:
    |       |   |__ Buscar por: [indicar campos de búsqueda]
    |       |   |__ Limpiar filtro
    |       |
    |       |__ Acciones en Columnas:
    |           |__ Ver
    |           |__ Editar
    |           |__ Suspender / Activar
    |           |__ Borrar (lógico)

## Estructura de Requisitos para Crear itms:

    |__ Pantalla: Crear "[NOMBRE_ENTIDAD]"
    |   |
    |   |__ Mostrar Campos:
    |   |   |__ Campo 1: [indicar campo] - [tipo: texto/número/fecha/etc.]
    |   |   |__ Campo 2: [indicar campo] - [tipo: texto/número/fecha/etc.]
    |   |   |__ Campo n: [indicar campo] - [tipo: texto/número/fecha/etc.]
    |   |
    |   |__ Mostrar Asignaciones (Desplegables):
    |   |   |__ Asignación 1: [indicar desplegable y origen de datos]
    |   |   |__ Asignación 2: [indicar desplegable y origen de datos]
    |   |   |__ Asignación n: [indicar desplegable y origen de datos]
    |   |
    |   |__ Validaciones de Campos:
    |   |   |__ Validación 1: [indicar validación - ej: campo obligatorio]
    |   |   |__ Validación 2: [indicar validación - ej: formato email]
    |   |   |__ Validación n: [indicar validación]
    |   |
    |   |__ Acciones:
    |       |__ Cancelar: Volver a la lista sin guardar
    |       |__ Grabar: Guardar el nuevo registro

## Estructura de Requisitos para Editar itms:

    |__ Pantalla: Editar "[NOMBRE_ENTIDAD]"
        |
        |__ Mostrar Campos:
        |   |__ Campo 1: [indicar campo] - [editable: Sí/No]
        |   |__ Campo 2: [indicar campo] - [editable: Sí/No]
        |   |__ Campo n: [indicar campo] - [editable: Sí/No]
        |
        |__ Mostrar Asignaciones (Desplegables):
        |   |__ Asignación 1: [indicar desplegable] - [editable: Sí/No]
        |   |__ Asignación 2: [indicar desplegable] - [editable: Sí/No]
        |   |__ Asignación n: [indicar desplegable] - [editable: Sí/No]
        |
        |__ Validaciones de Campos:
        |   |__ Validación 1: [indicar validación]
        |   |__ Validación 2: [indicar validación]
        |   |__ Validación n: [indicar validación]
        |
        |__ Acciones:
            |__ Cancelar: Volver sin guardar cambios
            |__ Grabar: Guardar los cambios realizados
```

---

## Ejemplo de Uso

```
|__ Gestión de "Inquilinos" (listar + crear + ver + editar/detalle)
    |
    |__ Pantalla: Lista "Inquilinos"
    |   |
    |   |__ Acción Botón en Pantalla:
    |   |   |__ Crear "Inquilino"
    |   |
    |   |__ Mostrar Columnas en Lista:
    |   |   |__ Columna 1: Nombre completo
    |   |   |__ Columna 2: Email
    |   |   |__ Columna 3: Teléfono
    |   |   |__ Columna 4: Alojamiento asignado
    |   |   |__ Columna 5: Habitación
    |   |   |__ Columna 6: Estado
    |   |   |__ Columna 7: Fecha de entrada
    |   |
    |   |__ Validaciones:
    |   |   |__ Solo mostrar inquilinos del cliente actual
    |   |
    |   |__ Acciones Lista:
    |       |__ Filtros de Búsqueda:
    |       |   |__ Buscar por: nombre, email, teléfono
    |       |   |__ Filtrar por: estado (activo/inactivo/pendiente)
    |       |   |__ Limpiar filtro
    |       |
    |       |__ Acciones en Columnas:
    |           |__ Ver detalle
    |           |__ Editar
    |           |__ Programar baja
    |           |__ Reenviar onboarding
    |


    |__ Pantalla: Crear "Inquilino"
    |   |
    |   |__ Mostrar Campos:
    |   |   |__ Campo 1: Nombre completo - texto
    |   |   |__ Campo 2: Email - email
    |   |   |__ Campo 3: Teléfono - texto
    |   |   |__ Campo 4: Documento (DNI/NIE) - texto
    |   |   |__ Campo 5: Fecha de entrada - fecha
    |   |
    |   |__ Mostrar Asignaciones (Desplegables):
    |   |   |__ Asignación 1: Alojamiento (lista de alojamientos activos)
    |   |   |__ Asignación 2: Habitación (lista de habitaciones libres del alojamiento)
    |   |
    |   |__ Validaciones de Campos:
    |   |   |__ Validación 1: Nombre completo obligatorio
    |   |   |__ Validación 2: Email obligatorio y formato válido
    |   |   |__ Validación 3: Email único en el sistema
    |   |   |__ Validación 4: Alojamiento obligatorio
    |   |   |__ Validación 5: Habitación obligatoria
    |   |   |__ Validación 6: Fecha de entrada obligatoria
    |   |
    |   |__ Acciones:
    |       |__ Cancelar: Volver a la lista sin guardar
    |       |__ Grabar: Crear inquilino y enviar email de onboarding



    |__ Pantalla: Editar "Inquilino"
        |
        |__ Mostrar Campos:
        |   |__ Campo 1: Nombre completo - editable: Sí
        |   |__ Campo 2: Email - editable: Sí
        |   |__ Campo 3: Teléfono - editable: Sí
        |   |__ Campo 4: Documento - editable: Sí
        |   |__ Campo 5: Fecha de entrada - editable: No (solo lectura)
        |
        |__ Mostrar Asignaciones (Desplegables):
        |   |__ Asignación 1: Alojamiento - editable: No (requiere proceso de cambio)
        |   |__ Asignación 2: Habitación - editable: No (requiere proceso de cambio)
        |
        |__ Validaciones de Campos:
        |   |__ Validación 1: Nombre completo obligatorio
        |   |__ Validación 2: Email obligatorio y formato válido
        |   |__ Validación 3: Email único (excepto el actual)
        |
        |__ Acciones:
            |__ Cancelar: Volver sin guardar cambios
            |__ Grabar: Guardar los cambios realizados
```

---

## Notas Adicionales

- **Borrado lógico**: Los registros no se eliminan físicamente, se marcan como inactivos/archivados
- **Validaciones de negocio**: Incluir reglas específicas del dominio
- **Permisos**: Indicar qué roles pueden ejecutar cada acción
- **Auditoría**: Campos automáticos (created_at, updated_at, created_by, updated_by)

---

## Versión

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | [FECHA] | [AUTOR] | Versión inicial |
