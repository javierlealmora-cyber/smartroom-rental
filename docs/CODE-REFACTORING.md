# Refactorización de Código - Eliminación de Duplicación

## 📊 Análisis de Duplicación de Código

### Fecha: 2026-03-18
### Objetivo: Eliminar código duplicado en formularios y crear componentes reutilizables

---

## 🔍 Duplicaciones Identificadas

### 1. **Constantes Duplicadas**

#### PROVINCIAS_ES (Lista de provincias españolas)
- **Duplicada en 5 archivos:**
  - `AccommodationCreate.jsx`
  - `AccommodationEdit.jsx`
  - `AccommodationDetail.jsx`
  - `EntityCreate.jsx`
  - `EntityEdit.jsx`
- **Líneas duplicadas:** ~52 líneas × 5 = **260 líneas**

#### GENDER_OPTIONS (Opciones de género)
- **Duplicada en 3 archivos:**
  - `EntityCreate.jsx`
  - `EntityEdit.jsx`
  - `LodgerFormFields.jsx` (ya refactorizado)
- **Líneas duplicadas:** ~4 líneas × 3 = **12 líneas**

#### LEGAL_TYPES (Tipos legales de entidad)
- **Duplicada en 2 archivos:**
  - `EntityCreate.jsx`
  - `EntityEdit.jsx`
- **Líneas duplicadas:** ~4 líneas × 2 = **8 líneas**

**Total constantes duplicadas:** ~280 líneas

---

### 2. **Formularios con Código Duplicado**

#### Par: TenantCreate.jsx + TenantEdit.jsx
- **Estado:** ✅ **REFACTORIZADO**
- **Duplicación eliminada:** ~70 líneas
- **Componente creado:** `LodgerFormFields.jsx`
- **Mejoras adicionales:**
  - Asignación de habitación ahora opcional en creación
  - Campos obligatorios unificados
  - Validaciones consistentes

#### Par: EntityCreate.jsx + EntityEdit.jsx
- **Estado:** ⏳ **PENDIENTE DE REFACTORIZAR**
- **Duplicación estimada:** ~200 líneas
- **Campos duplicados:**
  - Tipo legal (persona física/jurídica/autónomo)
  - Razón social / Nombre + Apellidos
  - CIF/NIF/DNI
  - Email de facturación
  - Teléfono
  - Dirección completa (calle, CP, ciudad, provincia, país)
- **Componente creado:** `EntityFormFields.jsx` (listo para usar)

#### Par: AccommodationCreate.jsx + AccommodationEdit.jsx
- **Estado:** ⏳ **PENDIENTE DE REFACTORIZAR**
- **Duplicación estimada:** ~80 líneas
- **Campos duplicados:**
  - Nombre del alojamiento
  - Entidad propietaria
  - Dirección completa (línea 1, línea 2, CP, ciudad, provincia)
  - Notas
- **Componente creado:** `AddressFormFields.jsx` (listo para usar)

---

## ✅ Soluciones Implementadas

### 1. **Archivo de Constantes Compartidas**
📁 `src/constants/formOptions.js`

```javascript
export const PROVINCIAS_ES = [...]; // 52 provincias españolas
export const GENDER_OPTIONS = [...]; // Masculino, Femenino, Otro
export const LEGAL_TYPES = [...]; // Autónomo, Persona física, Persona jurídica
export const BATHROOM_OPTIONS = [...]; // Privado, Compartido
export const KITCHEN_OPTIONS = [...]; // Privada, Compartida, Sin cocina
```

**Beneficios:**
- ✅ Una única fuente de verdad para opciones de formularios
- ✅ Fácil mantenimiento (cambios en un solo lugar)
- ✅ Consistencia en toda la aplicación

---

### 2. **Componente: LodgerFormFields**
📁 `src/pages/v2/admin/tenants/components/LodgerFormFields.jsx`

**Usado en:**
- `TenantCreate.jsx`
- `TenantEdit.jsx`

**Campos incluidos:**
- Nombre, Primer apellido, Segundo apellido
- ¿Cómo quieres que te llamen? (nickname)
- Email, Teléfono, Documento
- Género

**Props:**
- `disableEmail` - Para deshabilitar email en modo edición

---

### 3. **Componente: AddressFormFields**
📁 `src/components/shared/AddressFormFields.jsx`

**Para usar en:**
- `AccommodationCreate.jsx`
- `AccommodationEdit.jsx`
- `EntityCreate.jsx`
- `EntityEdit.jsx`

**Campos incluidos:**
- Dirección (línea 1 y 2)
- Código postal, Ciudad, Provincia
- País (opcional)

**Props:**
- `showCountry` - Mostrar/ocultar campo país
- `requiredFields` - Array de campos obligatorios

---

### 4. **Componente: EntityFormFields**
📁 `src/components/shared/EntityFormFields.jsx`

**Para usar en:**
- `EntityCreate.jsx`
- `EntityEdit.jsx`

**Campos incluidos:**
- Tipo legal (selector)
- **Si es empresa:** Razón social
- **Si es persona física:** Nombre, Apellidos, Nickname, Género
- CIF/NIF/DNI
- Email de facturación
- Teléfono

**Props:**
- `legalType` - Tipo legal actual
- `showLegalTypeSelector` - Mostrar/ocultar selector de tipo

---

## 📈 Impacto de la Refactorización

### Antes:
- ❌ ~280 líneas de constantes duplicadas
- ❌ ~350 líneas de código de formularios duplicado
- ❌ Cambios requieren editar múltiples archivos
- ❌ Inconsistencias entre formularios Create/Edit
- **Total duplicación:** ~630 líneas

### Después (cuando se complete):
- ✅ 1 archivo de constantes compartidas (~40 líneas)
- ✅ 3 componentes reutilizables (~200 líneas total)
- ✅ Cambios en un solo lugar
- ✅ Consistencia garantizada
- **Reducción de código:** ~390 líneas (~62% menos duplicación)

---

## 🔄 Tareas Pendientes

### Alta Prioridad:
1. ⏳ Refactorizar `EntityCreate.jsx` para usar `EntityFormFields` + `AddressFormFields`
2. ⏳ Refactorizar `EntityEdit.jsx` para usar `EntityFormFields` + `AddressFormFields`
3. ⏳ Refactorizar `AccommodationCreate.jsx` para usar `AddressFormFields`
4. ⏳ Refactorizar `AccommodationEdit.jsx` para usar `AddressFormFields`

### Media Prioridad:
5. ⏳ Actualizar imports en todos los archivos que usan constantes duplicadas
6. ⏳ Eliminar constantes duplicadas de archivos individuales
7. ⏳ Crear tests unitarios para componentes compartidos

### Baja Prioridad:
8. ⏳ Documentar componentes compartidos con JSDoc
9. ⏳ Crear Storybook stories para componentes compartidos
10. ⏳ Buscar otras oportunidades de refactorización

---

## 🎯 Principios de Diseño Aplicados

1. **DRY (Don't Repeat Yourself)**
   - Eliminar duplicación de código
   - Crear componentes reutilizables

2. **Single Source of Truth**
   - Constantes en un solo lugar
   - Componentes compartidos para lógica común

3. **Separation of Concerns**
   - Componentes de presentación separados
   - Lógica de negocio en servicios

4. **Composición sobre Herencia**
   - Componentes pequeños y componibles
   - Props para personalización

---

## 📝 Notas Adicionales

- Todos los componentes compartidos incluyen validaciones consistentes
- Los componentes son flexibles mediante props
- Se mantiene compatibilidad con código existente
- No se requieren cambios en servicios o Edge Functions

---

**Última actualización:** 2026-03-18
**Responsable:** Cascade AI
