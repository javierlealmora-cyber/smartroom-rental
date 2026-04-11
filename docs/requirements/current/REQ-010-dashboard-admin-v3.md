# REQ-010 - Dashboard Administrativo V3 con Visualizaciones 3D

## Status
ACTIVE

## Owner
@admin-team

## Last updated
2026-03-31

---

## 🎯 Objetivo
Proporcionar un dashboard administrativo moderno con visualizaciones 3D profesionales que permita a los administradores obtener una visión completa y visual del estado de sus alojamientos, ocupación, ingresos y gastos de forma rápida e intuitiva.

---

## 📌 Alcance

### ✅ Incluye:
- Visualización 3D del plano del alojamiento
- KPIs principales (alojamientos, habitaciones, ocupación, rendimiento)
- Gráfico circular 3D de distribución por género de inquilinos
- Gráfico de barras 3D de ingresos mensuales (últimos 12 meses)
- Gráficos horizontales de métricas clave (ocupación, inquilinos, gastos)
- Actividad reciente del sistema
- Diseño responsive (desktop, tablet, mobile)
- Efectos 3D mediante gradientes y sombras CSS

### ❌ NO incluye:
- Datos de agua y gas (tablas no disponibles aún)
- Configuración de objetivos/rendimiento esperado (funcionalidad futura)
- Filtros por alojamiento específico (solo muestra datos globales)
- Exportación de gráficos a PDF/imagen
- Dashboard personalizable (drag & drop)

---

## 🧩 Descripción funcional

El Dashboard Admin V3 muestra en una sola pantalla:

1. **Imagen 3D del alojamiento** (superior izquierda)
   - Plano isométrico 3D del alojamiento
   - Efectos de sombra y perspectiva

2. **Panel de KPIs** (superior derecha)
   - Rendimiento Real vs Esperado (%)
   - Total de alojamientos
   - Habitaciones (Total, Ocupadas, Libres, Pendientes)
   - Ocupación total (%)

3. **Gráfico de Género** (centro izquierda)
   - Distribución de inquilinos por género (Masculino, Femenino, Otros)
   - Formato circular 3D con gradientes radiales
   - Leyenda con conteo y porcentaje

4. **Gráfico de Ingresos** (centro derecha)
   - Barras 3D mostrando ingresos por mes (últimos 12 meses)
   - Gradientes lineales para efecto de profundidad
   - Tooltips con valores exactos

5. **Gráficos Horizontales** (fila inferior)
   - % Ocupación últimos 12 meses
   - Inquilinos medio del año
   - Ingresos últimos 12 meses
   - Gasto medio electricidad
   - Gasto medio calefacción (placeholder)
   - Gasto medio agua (placeholder)

6. **Actividad Reciente** (inferior)
   - Últimas 10 acciones del sistema
   - Timestamp relativo (hace 5m, 2h, 3d)
   - Iconos por tipo de acción

---

## 🔁 Flujo funcional

1. Usuario accede a `/v2/admin/dashboard-v3`
2. Sistema carga datos desde Supabase:
   - Alojamientos activos
   - Habitaciones y asignaciones
   - Inquilinos y género
   - Facturas de energía
   - Audit log
3. Sistema calcula métricas derivadas:
   - Ocupación %
   - Ingresos mensuales agrupados
   - Promedios
4. Sistema renderiza gráficos 3D con Recharts
5. Usuario visualiza dashboard completo
6. Datos se actualizan al recargar la página

---

## ✅ Casos válidos

- Admin con client_account_id válido accede al dashboard
- Datos disponibles en BD se muestran correctamente
- Gráficos se renderizan con efectos 3D
- Dashboard es responsive en mobile/tablet/desktop
- Placeholders se muestran para datos no disponibles (agua, gas)
- Estados de carga se muestran mientras se obtienen datos

---

## ❌ Casos inválidos

- Usuario sin client_account_id no puede acceder
- Error de conexión a Supabase muestra mensaje de error
- Datos corruptos se manejan con valores por defecto
- Navegadores sin soporte CSS moderno muestran versión degradada

---

## 📊 Reglas de negocio

- **Ocupación %** = (Habitaciones ocupadas / Total habitaciones no en mantenimiento) × 100
- **Habitaciones ocupadas** = Habitaciones con asignación activa (move_out_date IS NULL o > hoy)
- **Habitaciones libres** = Habitaciones sin asignación y no en mantenimiento
- **Pendientes checkout** = Habitaciones con move_out_date <= hoy
- **Ingresos mensuales** = Suma de monthly_rent de asignaciones activas en ese mes
- **Género** = Campo profiles.gender (male, female, other)
- **Actividad reciente** = Últimas 10 entradas de audit_log ordenadas por created_at DESC
- **Rendimiento** = Placeholder hasta implementar tabla de objetivos

---

## 🗄️ Impacto en base de datos

### Tablas consultadas:
- `accommodations` - Datos de alojamientos
- `rooms` - Habitaciones y estado de mantenimiento
- `lodger_room_assignments` - Asignaciones activas, ingresos
- `profiles` - Inquilinos y género
- `energy_bills` - Facturas de electricidad
- `audit_log` - Actividad reciente

### Queries principales:
```sql
-- Alojamientos activos
SELECT * FROM accommodations WHERE client_account_id = ? AND status = 'active'

-- Habitaciones con asignaciones
SELECT r.*, a.move_out_date, a.monthly_rent
FROM rooms r
LEFT JOIN lodger_room_assignments a ON r.id = a.room_id
WHERE r.client_account_id = ?

-- Inquilinos por género
SELECT gender, COUNT(*) 
FROM profiles 
WHERE role = 'lodger' AND client_account_id = ?
GROUP BY gender

-- Ingresos por mes
SELECT DATE_TRUNC('month', billing_start_date) as month, SUM(monthly_rent)
FROM lodger_room_assignments
WHERE client_account_id = ? AND billing_start_date >= NOW() - INTERVAL '12 months'
GROUP BY month

-- Facturas electricidad
SELECT DATE_TRUNC('month', issue_date) as month, SUM(amount_total)
FROM energy_bills
WHERE client_account_id = ? AND utility_type = 'electricity'
GROUP BY month

-- Actividad
SELECT * FROM audit_log
WHERE client_account_id = ?
ORDER BY created_at DESC
LIMIT 10
```

### Índices necesarios:
- ✅ Ya existen en baseline_indexes.sql
- `lodger_room_assignments(client_account_id, billing_start_date)`
- `energy_bills(client_account_id, utility_type, issue_date)`
- `audit_log(client_account_id, created_at)`

---

## 🧱 Impacto en frontend

### Componentes nuevos:
- `src/pages/v2/admin/DashboardAdminV3New.jsx` - Componente principal
- `src/components/charts/GraficoGenero3D.jsx` - Gráfico circular género
- `src/components/charts/GraficoIngresos3D.jsx` - Gráfico barras ingresos
- `src/components/charts/GraficoHorizontal3D.jsx` - Gráficos horizontales

### Componentes modificados:
- `src/App.jsx` - Añadir ruta `/v2/admin/dashboard-v3`

### Librerías utilizadas:
- **Recharts** (ya instalada) - Gráficos base
- **CSS Gradients** - Efectos 3D
- **CSS Shadows** - Profundidad visual

### Estados UI:
- `loading` - Cargando datos
- `error` - Error al cargar
- `loaded` - Datos cargados y renderizados
- `empty` - Sin datos disponibles

---

## 🧪 Validación (QA)

### Tests asociados:
- **unit**: 
  - Cálculo de ocupación %
  - Agrupación de ingresos por mes
  - Formateo de timestamps relativos
  
- **services**:
  - Queries a Supabase retornan datos correctos
  - Manejo de errores de conexión
  
- **e2e**:
  - Dashboard se carga correctamente
  - Gráficos se renderizan
  - Responsive funciona en mobile/tablet
  - Navegación desde menú funciona

---

## 🔗 Trazabilidad

### Cambios relacionados:
- **CHG-XXX**: Implementación Dashboard V3

### Migraciones SQL:
- Ninguna (usa esquema existente)

### Archivos creados:
- `src/pages/v2/admin/DashboardAdminV3New.jsx`
- `src/components/charts/GraficoGenero3D.jsx`
- `src/components/charts/GraficoIngresos3D.jsx`
- `src/components/charts/GraficoHorizontal3D.jsx`
- `src/pages/v2/admin/DashboardAdmin.jsx.backup-v3`

### Tests:
- `qa/unit/dashboard-v3.test.js` (pendiente)
- `qa/e2e/specs/dashboard-v3.spec.js` (pendiente)

---

## ⚠️ Consideraciones

### Edge cases:
- Cliente sin alojamientos: Mostrar mensaje "No hay alojamientos configurados"
- Sin inquilinos: Gráfico de género vacío con mensaje
- Sin facturas: Gráfico de gastos con placeholder
- Primer mes de operación: Gráficos con datos parciales

### Limitaciones:
- No hay datos históricos de agua/gas (se mostrarán placeholders)
- No hay configuración de objetivos (rendimiento será mock)
- No hay filtros por alojamiento (versión futura)
- Actualización manual (no real-time)

### Performance:
- Lazy loading de gráficos no visibles
- Memoización de componentes pesados
- Límite de 12 meses en queries históricas
- Cache de datos (considerar SWR/React Query en futuro)

---

## 📝 Observaciones

- La imagen del plano 3D ya existe en `/public/images/Alojamiento Dashboard.png`
- Recharts ya está instalado en package.json (v3.7.0)
- El dashboard actual se preserva como backup en `DashboardAdmin.jsx.backup-v3`
- La ruta `/v2/admin/dashboard` sigue apuntando al dashboard original
- La nueva ruta `/v2/admin/dashboard-v3` es independiente
- En el futuro se puede migrar completamente o mantener ambas versiones
- Los efectos 3D se logran con CSS (gradientes, sombras) no con WebGL/Three.js
- Compatible con React 19 y Vite 7

### Próximas mejoras sugeridas:
1. Añadir filtros por fecha/alojamiento
2. Exportar gráficos a PDF/imagen
3. Configuración de objetivos/rendimiento
4. Integrar water_bills y gas_bills cuando estén disponibles
5. Dashboard personalizable (widgets drag & drop)
6. Actualización en tiempo real con Supabase Realtime
