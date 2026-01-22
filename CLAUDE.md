OBJETIVO DEL PROYECTO
SmartRent Systems es una plataforma SaaS multi-tenant para la gestión inteligente del alquiler de habitaciones, orientada a empresas/inversores que gestionan apartamentos con habitaciones para estudiantes o inquilinos.

El sistema contempla tres tipos de usuarios: superadmin (SmartRent Systems), admin de empresa cliente y estudiante/inquilino, todos accediendo desde una única URL, con roles, permisos y theming por empresa.

La arquitectura se basa en React + Vite en frontend, Supabase (Auth + Postgres + Edge Functions + Storage) como backend principal, y n8n para procesos batch y de negocio (facturación, reparto de consumos, cierres mensuales). Se ha decidido un modelo multi-tenant por columna company_id, con RLS obligatoria en base de datos.

Actualmente está implementada una POC funcional del área Superadmin, con routing correcto y pantallas dummy para listar y crear empresas. El proyecto ha pasado por múltiples ajustes de estructura de carpetas y rutas, ya estabilizados.
El login y AuthProvider están definidos conceptualmente, pero no finalizados. La Edge Function provision_company está definida a nivel funcional/técnico, pero no implementada aún.
Supabase está configurado en entorno DEV (pendiente PRE y PRO), con tablas básicas (companies, profiles) creadas y usuario superadmin existente. Se ha validado el acceso a Supabase, el connection string y la necesidad de backups manuales (plan Free).
El siguiente paso es consolidar Auth + Edge Function + creación real de empresas desde el front, y dejar cerrada la POC end-to-end.
________________________________________
ALCANCE DEL PROYECTO. FUNCIONALIDAD ESPERADA
El alcance del proyecto es muy ambicioso y lo describo a continuación. Puede aumentar, disminuir o cambiar alguno de esto requisitos, pero es la base funcional del proyecto:
1.	Roles, permisos y alcance
1.1.	Roles existentes
Rol	                 Descripción (negocio)	                  Acceso
SuperAdmin -	Persona administrador del todo producto y creador de empresas para dar el servicio SaaS	 - Acceso a todos lo módulos con todos los permisos.
Administrador / Gestor -	Persona que opera el negocio y gestiona el alojamiento y la energía.	 - Acceso a módulos de gestión (alojamientos, inquilinos, consumos, facturas, liquidación, boletines, hucha, configuración, encuestas).
Inquilino -	Persona alojada en una habitación.	 - Acceso a su panel personal (resumen, consumo, servicios, encuestas, boletines).
________________________________________
2.	Estructura funcional del producto (mapa completo)
Área	Módulo	Objetivo	Resultado para negocio
Operación -	Alojamientos - Crear y mantener pisos/edificios - Inventario de alojamientos controlado
Operación -	Habitaciones -	Definir características y precios por habitación -	Oferta parametrizada y homogénea
Operación -	Inquilinos -	Alta/edición/baja/reactivación de inquilinos -	Cartera de inquilinos y su estado
Operación -	Ocupación -	Control por fechas qué habitación está ocupada/libre	 - Disponibilidad real y trazable
Energía -	Registros de consumo -	Registrar consumo diario estimado -	Base para repartir costes variables
Energía -	Facturas eléctricas - Guardar facturas con importes, periodo y archivo -	Facturas trazables por alojamiento
Energía -	Liquidación / reparto  - Repartir coste fijo y variable por día e inquilino	 - Cargos asignados de forma justa
Energía -	Boletines -	Generar resúmenes por inquilino - Transparencia y comunicación de costes
Energía -	Hucha energética - Movimientos/ajustes y liquidación final - Regularizaciones controladas
Inquilino -	Panel personal  - Vista general de su situación	 - Autogestión e información clara
Inquilino -	Servicios -	Informar sobre servicios del alojamiento - Menos dudas y más claridad
Calidad -	Encuestas -	Recoger respuestas de satisfacción - Mejora continua
Gestión -	Ajustes/Configuración - Cambiar parámetros generales del sistema  -	Operación adaptable
________________________________________
3.	Datos de negocio (entidades y campos) — máximo detalle
Nota: aquí hablo solo de "qué datos maneja el negocio", sin aludir a almacenamiento ni tecnología.
3.1.	Alojamiento
Qué es: un piso/edificio/unidad de alojamiento que contiene habitaciones.
Campos funcionales:
•	Identificador del alojamiento
•	Nombre o denominación
•	Número total de habitaciones (o al menos se gestiona la cantidad)
•	Estado: Activo / Desactivado
•	Metadatos de "baja" (cuando se desactiva): fecha de desactivación
Acciones:
•	Crear alojamiento
•	Editar alojamiento
•	Activar/desactivar alojamiento (sin borrar historial)
________________________________________
3.2.	Habitación (detalle de habitación dentro de un alojamiento)
Qué es: unidad alquilable, con parámetros para el negocio y para energía.
Campos funcionales por habitación:
•	Número de habitación (identificador visible)
•	Precio de alquiler (€)
•	Importe asociado a "electricidad" (aparece como un valor configurado por habitación)
•	Metros cuadrados
•	Tipo de baño: Suite / Privado / Compartido
•	Tipo de cocina: Suite / Privada / Compartida
•	Identificador de cerradura (si aplica en el negocio, como referencia)
•	Notas
Acciones:
•	Definir / actualizar estos campos
•	Consultar listado y detalle por alojamiento
________________________________________
3.3.	Inquilino
Qué es: persona que ocupa una habitación.
Campos funcionales:
•	Nombre
•	Primer apellido
•	Segundo apellido
•	Email
•	Teléfono
•	Alojamiento asignado
•	Habitación asignada
•	Fecha de alta (entrada prevista/efectiva)
•	Estado del inquilino:
o	Activo
o	Pendiente de baja
o	Inactivo
•	Fecha de salida (cuando procede)
Acciones:
•	Alta de inquilino
•	Edición de datos
•	Asignación a alojamiento y habitación
•	Proceso de baja (con fecha)
•	Reactivación
•	Acceso a "gestión del inquilino" desde listado
________________________________________
3.4.	Ocupación (histórico por habitación y fechas)
Qué es: registro de ocupación por periodos (para saber si una habitación está ocupada o libre en cada fecha).
Campos funcionales:
•	Alojamiento
•	Habitación
•	Inquilino
•	Fecha de inicio de ocupación
•	Fecha fin de ocupación (puede estar vacía si sigue ocupado)
Acciones:
•	Consultar disponibilidad para una fecha (asignación)
•	Consultar historial de ocupación por habitación
•	Registrar salida y liberar habitación desde una fecha
________________________________________
3.5.	Registro de consumo diario (estimado)
Qué es: dato diario de consumo energético estimado, usado para repartir costes.
Campos funcionales:
•	Fecha
•	Consumo estimado (kWh)
•	Persona asociada (inquilino/usuario al que se le imputará ese consumo)
Acciones:
•	Crear/editar/eliminar registros diarios
•	Visualizar listados por fechas
•	Usarlos como base para liquidaciones
________________________________________
3.6.	Factura eléctrica
Qué es: factura de electricidad del alojamiento, con periodo y desglose.
Campos funcionales (lo que se gestiona explícitamente):
•	Alojamiento al que pertenece
•	Nombre de la compañía eléctrica
•	Número de factura
•	Referencia
•	Fecha de emisión
•	Periodo de consumo: inicio y fin
•	Consumo total del periodo (kWh)
•	Desglose de importes:
o	Coste de energía
o	Coste de potencia
o	Alquiler de contador
o	Descuentos
o	Otros costes
o	Impuestos
•	Importe total de la factura
•	Archivo adjunto de la factura
Funcionalidad adicional de negocio:
•	Lectura automática/escaneo de datos: el sistema puede mostrar un "resultado de escaneo" para ayudar a rellenar campos (y el gestor lo valida antes de guardar).
Acciones:
•	Crear factura
•	Editar factura
•	Adjuntar archivo
•	Consultar listado y detalle
•	Usar factura para liquidación
________________________________________
3.7.	Datos diarios facturables (resultado de una liquidación)
Qué es: después de liquidar, el sistema trabaja con datos diarios ya "convertidos" en costes por persona.
Campos funcionales por día y persona:
•	Fecha
•	Consumo real imputado (kWh "real" repartido)
•	Coste variable asignado
•	Coste fijo asignado
•	Persona/inquilino
•	Factura "madre" a la que pertenece (referencia interna de negocio)
Acciones:
•	Generarlos desde una factura + consumos + ocupación
•	Consultarlos en la liquidación
•	Usarlos para boletines
________________________________________
3.8.	Boletín energético del inquilino
Qué es: documento/resumen de lo que le corresponde pagar/entender de electricidad en un periodo.
Contenido funcional típico:
•	Inquilino
•	Periodo (fechas)
•	Resumen de consumo (kWh)
•	Resumen de costes:
o	total
o	desglose fijo/variable (si aplica)
•	Detalle por días (cuando se presenta)
•	Referencia a la factura o liquidación de origen
Acciones:
•	Generar boletines (administrador)
•	Consultar boletines (inquilino)
•	Consultar/filtrar (administrador)
________________________________________
3.9.	Hucha energética virtual
Qué es: un "monedero" de ajustes/regularizaciones energéticas.
Conceptos funcionales:
•	Saldo o acumulado
•	Movimientos (entradas/salidas) con concepto
•	Posible "liquidación final" (cierre/regularización)
Acciones:
•	Ver estado general
•	Consultar movimientos
•	Añadir movimiento (cargo/abono)
•	Ejecutar una liquidación final/regularización
________________________________________
3.10.	Encuestas
Qué es: cuestionarios de satisfacción/calidad.
Campos funcionales:
•	Encuesta (definición)
•	Respuestas del inquilino
•	Fecha
•	(Posible) relación a alojamiento/habitación/inquilino
Acciones:
•	Inquilino: responder
•	Administrador: consultar resultados/listados
________________________________________
3.11.	Servicios
Qué es: Información sobre servicios disponibles/incluidos (lavandería, limpieza, etc..).
Acciones:
•	Inquilino: ver contenido de servicios
________________________________________
3.12.	Servicios de Tikets de Incidencias
Qué es: Información posible incidencias en la habitación se debe recoger en la app para su posterior gestión.
Acciones:
•	Inquilino: Ver, crear y contenido de tickes de incidencias.

________________________________________
3.13.	Parámetros/ajustes generales
Qué es: configuración de comportamiento y recursos del sistema para el negocio. Sol lo puede estionar el super admin y el admin de la empresa (ejemplo el correo de notificación)
Acciones:
•	Ver parámetros
•	Modificar valores
•	Gestionar recursos visuales (assets) del sistema
________________________________________
4.	Pantallas y acciones (detalle completo, sin tecnología)
4.1.	Flujo de acceso (usuarios)
Pantallas
•	Inicio (pública)
•	Iniciar sesión
•	Registro
•	Recuperación / cambio de contraseña
•	Actualización de contraseña
Acciones de negocio
•	Crear cuenta / registrarse
•	Entrar al sistema
•	Cambiar contraseña
•	Recuperar acceso si se olvida contraseña
________________________________________
4.2.	Panel del inquilino (área personal)
Secciones que ve el inquilino
1.	Resumen
•	Saludo con nombre/apellidos
•	Referencia a su habitación asignada (número)
•	Accesos a secciones
2.	Consumo
•	Visualización de consumo (mensual y/o histórico)
•	Consejos/tips de consumo (contenido informativo)
•	Lectura del comportamiento energético personal
3.	Servicios
•	Página informativa con servicios ofrecidos
4.	Encuestas
•	Listado de encuestas disponibles
•	Envío de respuestas
5.	Boletines
•	Listado de boletines energéticos
•	Acceso al detalle del boletín
________________________________________
4.3.	Área de gestión del administrador
4.3.1.	Visión general (resumen)
•	Panel con visión general del estado de la operación (indicadores generales, accesos a módulos)
________________________________________
4.3.2.	Alojamientos (inventario)
Pantallas/funciones:
•	Listado de alojamientos
•	Crear alojamiento
•	Editar alojamiento
•	Activar/desactivar alojamiento (sin eliminar historial)
Detalle del alojamiento:
•	Gestión de habitaciones del alojamiento (ver/editar parámetros habitación a habitación)
________________________________________
4.3.3.	Habitaciones (dentro del alojamiento)
Pantallas/funciones:
•	Listado de habitaciones por alojamiento
•	Formulario de edición masiva o por habitación
Campos gestionables por habitación (todos):
•	Nº habitación
•	Precio de alquiler
•	Importe asociado a electricidad
•	m²
•	Tipo baño (suite/privado/compartido)
•	Tipo cocina (suite/privada/compartida)
•	Identificador de cerradura
•	Notas
________________________________________
4.3.4.	Inquilinos
Pantallas/funciones:
•	Listado de inquilinos
•	Registrar nuevo inquilino
•	Editar inquilino
•	Gestión de salida (baja) con fecha
•	Reactivar inquilino
•	(Asociado) ver/gestionar habitación y alojamiento del inquilino
Alta de inquilino (pasos de negocio):
1.	Introducir datos personales
2.	Introducir fecha de entrada
3.	Elegir alojamiento
4.	Ver habitaciones disponibles para esa fecha
5.	Elegir habitación
6.	Confirmar
Salida / baja (pasos de negocio):
1.	Elegir fecha de salida
2.	Cambiar estado a pendiente de baja / inactivo
3.	La habitación pasa a poder quedar libre desde la fecha establecida
Estados de inquilino (con significado):
•	Activo: ocupa habitación
•	Pendiente de baja: salida marcada pero puede estar en transición
•	Inactivo: ya no ocupa (histórico)
________________________________________
4.3.5.	Historial de ocupación
•	Vista para consultar ocupación pasada por alojamiento/habitación:
o	quién ocupó
o	desde cuándo
o	hasta cuándo
________________________________________
5.	Energía: módulo completo (detalle máximo)
5.1.	Registros de consumo (diario estimado)
Objetivo de negocio: disponer de un patrón diario para repartir la parte variable de una factura.
Acciones:
•	Cargar consumos estimados por día y persona
•	Corregir consumos si hay errores
•	Consultar listados por rango de fechas
Dato clave: consumo estimado en kWh.
________________________________________
5.2.	Facturas eléctricas
Objetivo de negocio: registrar facturas con periodo y costes, asociadas a un alojamiento.
Acciones:
•	Crear nueva factura
•	Adjuntar documento
•	Editar campos manualmente
•	Ver listado de facturas
Lectura automática (negocio):
•	El sistema puede proponer campos detectados mediante lectura automática del documento (y el gestor valida).
________________________________________
5.3.	Liquidación / reparto de costes
Objetivo de negocio: convertir una factura del periodo en costes asignados a inquilinos, respetando quién estuvo ocupando cada día.
Reparto por conceptos
•	Coste variable: se reparte en función del consumo estimado (quien "consume más" paga más).
•	Coste fijo: se reparte por presencia/ocupación (quien estuvo ese día, participa).
Reglas esenciales del reparto
1.	Por días: el reparto se realiza a nivel diario dentro del periodo.
2.	Por ocupación real: solo pagan los inquilinos que estaban ocupando en cada fecha.
3.	Proporcionalidad en variable: si un día tiene más consumo estimado, "pesa" más.
4.	Cuadre de totales: el reparto final se ajusta para que el total asignado coincida exactamente con el total de la factura (incluyendo redondeos).
Resultado de negocio de la liquidación
•	Para cada día y cada inquilino:
o	coste fijo asignado
o	coste variable asignado
o	consumo asignado
•	Estos resultados alimentan los boletines.
________________________________________
5.4.	Boletines energéticos
Objetivo de negocio: entregar al inquilino una explicación clara de su coste energético.
Acciones:
•	Administrador genera boletines de un periodo
•	Inquilino consulta sus boletines
•	Se pueden revisar detalles de consumo/costes imputados
Contenido esperado:
•	Periodo
•	Resumen consumo
•	Total a imputar
•	Detalles (según diseño)
________________________________________
5.5.	Hucha energética virtual
Objetivo de negocio: gestionar ajustes y regularizaciones asociadas a energía.
Acciones:
•	Ver saldo/estado
•	Registrar movimientos (cargo/abono) con concepto
•	Liquidación final (cierre)
________________________________________
6.	Calidad: encuestas (detalle)
Para el inquilino
•	Acceder a encuestas disponibles
•	Completar y enviar respuestas
Para el administrador
•	Consultar encuestas y respuestas
•	Revisar resultados para mejora del servicio
________________________________________
7.	Configuración (negocio)
Objetivo: adaptar parámetros generales del sistema sin tocar el "core".
Acciones:
•	Ver parámetros (clave/valor)
•	Modificar valores
•	Gestionar recursos del sistema (assets)
•	Solo accesible para quien tenga permiso de configuración
________________________________________
8.	Reglas de negocio transversales (importantes)
Regla	                                Impacto
Asignación por disponibilidad -> No se asigna una habitación sin comprobar si está libre para la fecha de entrada.
Trazabilidad de ocupación -> Se mantiene histórico de quién ocupó y cuándo.
Facturas vinculadas a alojamiento -> Cada factura pertenece a un alojamiento concreto.
Liquidación por periodo y por día -> La factura se distribuye dentro del periodo día a día.
Reparto mixto fijo/variable ->	La factura se descompone y se reparte con criterios distintos.
Cuadre de totales -> El total asignado a inquilinos debe coincidir con el total de la factura.
Estados del inquilino -> El sistema diferencia activo/pending/inactivo para reflejar operación real.
Permiso especial de configuración -> No todos los gestores necesariamente pueden tocar ajustes.

________________________________________
9.	Lista completa de funcionalidades (checklist exhaustivo)

Operación
•	Crear/editar alojamiento
•	Activar/desactivar alojamiento
•	Configurar habitaciones con todos sus campos (precio, electricidad, m², baño/cocina, cerradura, notas)
•	Registrar inquilino con datos personales
•	Asignar habitación según disponibilidad por fecha
•	Editar inquilino
•	Tramitar baja con fecha de salida
•	Reactivar inquilino
•	Consultar historial de ocupación
Energía
•	Registrar consumos diarios estimados por persona
•	Crear/editar facturas con desglose + archivo
•	Apoyo de lectura automática para rellenar factura
•	Liquidar factura repartiendo coste fijo/variable por día e inquilino
•	Garantizar cuadre exacto con total factura
•	Generar boletines por inquilino
•	Inquilino consulta boletines
•	Hucha energética: ver estado, movimientos, liquidación final
Inquilino
•	Ver resumen personal
•	Ver consumo (y visualizaciones)
•	Ver servicios
•	Responder encuestas
•	Consultar boletines
Configuración
•	Gestionar parámetros generales
•	Gestionar recursos del sistema
•	Restringir acceso por permiso


________________________________________
10.	Aclaracíon
1.	Alta de inquilino: el Admin de la empresa debe dar de alta al iquilinio y luego le invita con un correo electrónico a que se registre y ya aparecerá con su habitación asignada. El inquilino se crear su acceso automáticamente
________________________________________
RESUMEN TÉCNICO COMPLETO
1) OBJETIVO DEL PROYECTO
Construir una plataforma SaaS multi-tenant para gestionar empresas que alquilan habitaciones, con control de usuarios, consumos, facturación y servicios, preparada para escalar comercialmente.
________________________________________
2) ESTADO ACTUAL
Funciona:
•	Proyecto React + Vite arranca correctamente
•	Routing con react-router-dom funcionando
•	Pantallas Superadmin visibles:
o	/superadmin/companies
o	/superadmin/companies/new
•	Conexión a Supabase DEV
•	Tablas companies y profiles creadas
•	Usuario superadmin existente en auth.users
No funciona / pendiente:
•	Login real con Supabase Auth
•	AuthProvider operativo
•	Edge Function provision_company
•	Alta real de empresas desde el front
•	RLS todavía no aplicada
•	Theming por empresa aún no conectado a datos reales
________________________________________
3) SÍNTOMAS Y ERRORES DETECTADOS
•	Vite import error:
•	Failed to resolve import "@supabase/supabase-js"
•	➜ Solucionado instalando @supabase/supabase-js

•	Pantalla en blanco:
➜ Causa: src/main.jsx mal configurado
➜ Solución: corregido, la app renderiza correctamente

•	Error SQL:
•	 column "status" of relation "companies" already exists
•	➜ Causa: intentar añadir columna ya existente

•	Confusión de rutas /new:
➜ Resuelto unificando estructura y paths
________________________________________
4) ARQUITECTURA Y ESTRUCTURA DEL PROYECTO
Stack
•	Frontend: React + Vite
•	Router: react-router-dom
•	Backend: Supabase
o	Auth (validando JWT contra el proyecto)
o	Postgres (vía Supabase APIs (PostgREST / RPC) usando supabase-js)
o	Edge Functions (planificadas)
o	Storage
•	Batch / workflows: n8n (planificado)
•	Estilos: Tailwind (configurado)
•	Despliegue con Vercel (pendiente de configurar)
________________________________________
Estructura relevante
src/
 ├─ pages/
 │   ├─ auth/
 │   │   └─ Login.jsx
 │   ├─ superadmin/
 │   │   └─ companies/
 │   │       ├─ CompaniesList.jsx
 │   │       └─ CompanyCreate.jsx
 │   ├─ admin/
 │   ├─ student/
 │
 ├─ router/
 │   ├─ superadmin.routes.jsx
 │   ├─ auth.routes.jsx
 │
 ├─ providers/
 │   ├─ AuthProvider.jsx
 │   ├─ ThemeProvider.jsx
 │
 ├─ services/
 │   ├─ supabaseClient.js
 │   └─ auth.service.js
 │
 ├─ layouts/
 │   └─ MainLayout.jsx
 │
 ├─ App.jsx
 └─ main.jsx
________________________________________
Rutas principales
•	/superadmin/companies
•	/superadmin/companies/new
•	/login (pendiente integración real)
________________________________________
5) COMPONENTES / ARCHIVOS CLAVE
Archivo: src/services/supabaseClient.js
Responsabilidad: Inicializar cliente Supabase
Estado: Correcto
Archivo: src/router/superadmin.routes.jsx
Responsabilidad: Definir rutas Superadmin
Estado: Correcto tras ajustes
Archivo: CompaniesList.jsx
Responsabilidad: Listado de empresas (POC)
Estado: Funciona (dummy)
Archivo: CompanyCreate.jsx
Responsabilidad: Alta de empresa (POC)
Estado: Visible, sin lógica real aún
Archivo: AuthProvider.jsx
Responsabilidad: Contexto de autenticación
Estado: Definido conceptualmente, no finalizado
________________________________________
6) DECISIONES TOMADAS
1.	Una sola URL + roles (no subdominios)
→ Simplicidad, escalabilidad y theming dinámico
2.	Multi-tenant por company_id
→ Más simple para POC, compatible con RLS
3.	Edge Functions para lógica sensible
→ Seguridad, control y auditabilidad
4.	n8n para procesos batch
→ Separar negocio pesado del front
5.	Theming por empresa desde la POC
→ Diferenciación comercial clara
________________________________________
7) CAMBIOS YA HECHOS
6.	Creación del proyecto React + Vite
7.	Definición de estructura de carpetas definitiva
8.	Configuración de routing por módulos
9.	Corrección de main.jsx
10.	Instalación y configuración de Supabase client
11.	Creación de tablas base en Supabase
12.	Verificación de rutas Superadmin funcionando
________________________________________
8) PENDIENTES PRIORITARIOS
1.	Implementar Login real con Supabase Auth
2.	Completar AuthProvider
3.	Crear Edge Function provision_company
4.	Conectar CompanyCreate.jsx con Edge Function
5.	Aplicar RLS básica
6.	Activar theming dinámico por empresa
________________________________________
9) PRÓXIMOS 5 PASOS
1.	Implementar Login.jsx usando Supabase Auth
2.	Finalizar AuthProvider.jsx (session, role, company)
3.	Crear Edge Function provision_company en Supabase
4.	Conectar formulario CompanyCreate.jsx a Edge Function
5.	Añadir policies RLS iniciales en companies y profiles
________________________________________
10) "PEGAR EN CHAT NUEVO"
Proyecto: SmartRent Systems
Objetivo: SaaS multi-tenant para alquiler de habitaciones
Stack: React + Vite + Supabase (Auth, Postgres, Edge Functions + Storage) + n8n
Estado: POC Superadmin funcional, login y backend lógico pendientes
Rutas activas:
- /superadmin/companies
- /superadmin/companies/new
Estructura estabilizada en src/pages, src/router, src/providers
Pendientes clave:
- Login Supabase
- AuthProvider
- Edge Function provision_company
- Alta real de empresas
- RLS y theming dinámico
________________________________________
C) INVENTARIO
➡️ Cubierto por el árbol del proyecto ya compartido
(components, pages, router, services, providers correctamente identificados)
________________________________________
3. Control de versiones y despliegue
El flujo de trabajo será el siguiente:
1.	Los cambios en el front-end se suben a GitHub.
2.	El repositorio se conecta a Vercel.
3.	Vercel despliega automáticamente los cambios.
4.	Cualquier modificación futura (front-end o workflows) se reflejará simplemente con un nuevo push a GitHub.
Esto permite un ciclo de desarrollo rápido y predecible.
________________________________________
🔌 Herramientas y accesos disponibles para Claude
Claude tendrá acceso a las siguientes capacidades:

Supabase MCP
n8n MCP
•	Comprender configuraciones de nodos.
•	Analizar y proponer mejoras en workflows.
•	Trabajar con plantillas de n8n.
•	Revisar y modificar workflows existentes en la instancia de n8n.
Skills disponibles
•	n8n skills → automatización, flujos, lógica.
•	Front-end designer skill → estructura, UX y componentes.
GitHub MCP
•	Crear commits.
•	Subir cambios al repositorio.
•	Mantener una estructura limpia y coherente del proyecto.
________________________________________
📁 Estructura del proyecto (principios)
•	Mantener la estructura organizada, clara y mínima.
•	Evitar complejidad innecesaria.
•	Cada carpeta y archivo debe tener una responsabilidad clara.
•	Priorizar legibilidad y mantenibilidad sobre optimización prematura.
•	El sistema debe ser seguro, escalable y asegurar la concurrencia de ciento de usuario.
________________________________________
🤝 Forma de trabajo con Claude
Claude debe:
•	Hacer preguntas solo cuando sean necesarias para avanzar.
•	Proponer soluciones simples antes que complejas.
•	Mantener el proyecto neat & lean.
•	Alinear siempre las decisiones técnicas con el objetivo principal: crear un software para la gestión de alquiler de habitaciones en una app funcional.
________________________________________
✅ Resultado esperado
Al final del proyecto deberíamos tener:
•	Web totalmente funcional, multi-tenant.
•	Un front-end en React bien estructurado.
•	Un backend en SupaBase con el modelo de datos completo y optimizado para soportar volumetría y escalable. Edge Funcions bien construidad y agrupadas por funcionalidad y un sistema seguro con auth para la autenticacón y autorización de usuarios por funcionalidad
•	Un sistema versionado en GitHub.
•	Un despliegue automático y estable en Vercel.
Este archivo (claude.md) actúa como guía base del proyecto y debe mantenerse simple, conciso y actualizado.
