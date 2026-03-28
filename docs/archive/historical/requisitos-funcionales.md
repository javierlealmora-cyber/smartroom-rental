# Requisitos Funcionales — SmartRent Systems

## Documentos fuente incorporados

Este fichero sintetiza los requisitos de los siguientes documentos de especificacion:

1. **SmartRent_UI_web_comercial_de_SmartRent_End2End_v1.0** — Web publica, landing, planes, registro
2. **SmartRent_UI_Gestion_Planes_Suscripcion_UI-first_v1.1.1** — CRUD planes, catalogo, precios, Stripe
3. **SmartRent_UI_Entidad_Pagadora_y_Entidad_Propietaria_UI-first_v1.1.1** — Entidades payer/owner, wizard
4. **SmartRent_UI_Cuenta_de_Cliente_Implementacion_End2End_v1.0** — Onboarding, client_accounts, wizard completo

> Cuando se incorpore un nuevo documento de requisitos, anadirlo a esta lista.

---

## 1. Roles y permisos

| Rol | Descripcion | Acceso |
|---|---|---|
| SuperAdmin | Administrador de la plataforma SaaS, crea y gestiona cuentas de cliente | Acceso total a todos los modulos |
| Admin/Gestor | Opera el negocio: alojamientos, inquilinos, consumos, facturas | Modulos de gestion dentro de su tenant |
| Inquilino (Lodger) | Persona alojada en una habitacion | Panel personal: consumo, servicios, encuestas, boletines |

## 2. Modulos funcionales

### 2.1 Operacion

**Alojamientos** — Inventario de pisos/edificios con habitaciones
- Campos: nombre, num. habitaciones, estado (activo/desactivado), fecha desactivacion
- Acciones: crear, editar, activar/desactivar (sin borrar historico)

**Habitaciones** — Unidades alquilables dentro de un alojamiento
- Campos: num. habitacion, precio alquiler, importe electricidad, m2, tipo bano (suite/privado/compartido), tipo cocina (suite/privada/compartida), cerradura, notas
- Acciones: definir/actualizar campos, consultar listado por alojamiento

**Inquilinos** — Personas que ocupan habitaciones
- Campos: nombre, apellido1, apellido2, email, telefono, alojamiento, habitacion, fecha alta, estado (activo/pendiente baja/inactivo), fecha salida
- Acciones: alta, edicion, asignar habitacion por disponibilidad, baja con fecha, reactivacion
- Alta: datos personales → fecha entrada → elegir alojamiento → ver disponibles → elegir habitacion → confirmar
- IMPORTANTE: El admin da de alta al inquilino y le invita por email. El inquilino crea su acceso automaticamente

**Ocupacion** — Historico por habitacion y fechas
- Campos: alojamiento, habitacion, inquilino, fecha inicio, fecha fin
- Acciones: consultar disponibilidad, consultar historico, registrar salida

### 2.2 Energia

**Registros de consumo** — Dato diario estimado (kWh) por inquilino
- Acciones: crear/editar/eliminar registros diarios, visualizar por fechas

**Facturas electricas** — Factura de la compania electrica por alojamiento
- Campos: alojamiento, compania, num. factura, referencia, fecha emision, periodo (inicio/fin), consumo total, desglose (energia, potencia, contador, descuentos, otros, impuestos), importe total, archivo adjunto
- Funcionalidad adicional: lectura automatica/escaneo del documento (gestor valida)

**Liquidacion / reparto** — Repartir costes de una factura a inquilinos
- Coste variable: segun consumo estimado (proporcional)
- Coste fijo: segun ocupacion/presencia por dia
- Reglas: reparto diario, solo inquilinos presentes, cuadre exacto con total factura
- Resultado: por dia y por inquilino → coste fijo + coste variable + consumo asignado

**Boletines energeticos** — Resumen de costes para cada inquilino
- Contenido: periodo, consumo, total, desglose fijo/variable, detalle por dias
- Admin genera, inquilino consulta

**Hucha energetica virtual** — Ajustes y regularizaciones
- Saldo acumulado, movimientos (cargo/abono con concepto), liquidacion final

### 2.3 Inquilino (panel personal)

- Resumen: saludo, habitacion asignada, accesos rapidos
- Consumo: visualizacion mensual/historico, tips de ahorro
- Servicios: informacion sobre servicios disponibles (lavanderia, limpieza, etc.)
- Encuestas: listado, envio de respuestas
- Boletines: listado y detalle
- Tickets de incidencias: ver, crear, gestionar

### 2.4 Configuracion

- Parametros generales (clave/valor)
- Gestion de recursos/assets del sistema
- Solo accesible para superadmin y admin con permiso

## 3. Reglas de negocio transversales

- No asignar habitacion sin comprobar disponibilidad por fecha
- Mantener historico de ocupacion (quien, cuando)
- Cada factura pertenece a un alojamiento concreto
- Liquidacion por periodo y por dia
- Reparto mixto fijo/variable con criterios distintos
- Cuadre exacto: total asignado = total factura
- Estados del inquilino: activo / pendiente de baja / inactivo
- Permiso especial para configuracion (no todos los gestores)
