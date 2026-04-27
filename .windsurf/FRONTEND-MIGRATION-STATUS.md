# Estado de Migración Frontend - Estandarización de Direcciones

## ✅ COMPLETADOS:

### 1. EntityCreate.jsx ✅
- Usa `AddressFormFields` componente
- Payload con nuevos nombres: `address_*`
- InitialValues: `address_country: "España"`

### 2. AccommodationDetail.jsx ✅
- **setFieldsValue** actualizado con 7 campos
- **onSaveAccommodation** payload actualizado
- **Formulario visual** actualizado con 7 campos
- ✅ **Campo País añadido** (era el del pantallazo)

## ⚠️ PENDIENTES:

### 3. EntityEdit.jsx (19 matches)
- setForm: `country`, `province`, `city`, `zip`, `street`, `street_number`, `address_extra`
- formAntd.setFieldsValue: mismos campos
- updateEntity payload: mismos campos
- Formulario visual: campos antiguos

### 4. EntityDetail.jsx (2 matches)
- Búsqueda de alojamientos: `a.address_line1`
- Posible visualización de dirección

### 5. AccommodationEdit.jsx (13 matches)
- Similar a AccommodationDetail pero en modo edición standalone

### 6. AccommodationCreate.jsx (8 matches)
- Formulario de creación con campos antiguos
- Payload con `postal_code`, `city`, `province`, `country: "España"`

### 7. AccommodationsList.jsx (2 matches)
- Búsqueda/visualización con `address_line1`

## 📋 PRÓXIMOS PASOS:

1. Actualizar EntityEdit.jsx
2. Actualizar EntityDetail.jsx  
3. Actualizar AccommodationEdit.jsx
4. Actualizar AccommodationCreate.jsx
5. Actualizar AccommodationsList.jsx
6. Verificar AdminSettings.jsx (usa nombres antiguos en visualización)
