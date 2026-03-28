# ADR-005: Ant Design como UI Framework

**Estado:** Aceptado  
**Fecha:** 2026-02-20 (estimado)  
**Decisores:** Frontend Lead, Staff Engineer  

---

## Contexto

SmartRoom Rental necesita un framework de UI para el frontend React que proporcione:
- Componentes profesionales y consistentes
- Sistema de diseño completo
- Soporte para temas personalizados
- Accesibilidad (a11y)
- Documentación completa
- Comunidad activa

**Requisitos específicos:**
- Branding personalizado por tenant (colores, logo)
- Componentes complejos (tablas, formularios, modals)
- Responsive design
- Internacionalización (futuro)

**Estado inicial del proyecto:**
- Tailwind CSS + componentes custom
- Estilos inline en algunos lugares
- Inconsistencia visual

---

## Decisión

**Migrar a Ant Design 6.x como framework de UI principal.**

**Implementación:**
- Ant Design para todos los componentes de UI
- ConfigProvider para theming dinámico
- CSS variables para personalización por tenant
- Migración gradual desde Tailwind

```typescript
// ThemeProvider.jsx
import { ConfigProvider } from 'antd';

<ConfigProvider
  theme={{
    token: {
      colorPrimary: branding.primary_color || '#1890ff',
      borderRadius: 6,
    },
    components: {
      Button: {
        controlHeight: 40,
      },
    },
  }}
>
  {children}
</ConfigProvider>
```

---

## Consecuencias

### Positivas ✅

- **Componentes profesionales:** 50+ componentes out-of-the-box
- **Consistencia:** Sistema de diseño unificado
- **Theming dinámico:** ConfigProvider permite personalización por tenant
- **Accesibilidad:** Componentes accesibles por defecto
- **Documentación:** Excelente documentación y ejemplos
- **Comunidad:** Grande y activa
- **TypeScript:** Soporte completo
- **Responsive:** Mobile-first por defecto
- **Internacionalización:** Soporte built-in

### Negativas ❌

- **Bundle size:** ~600KB (gzipped ~200KB)
- **Curva de aprendizaje:** Sintaxis específica de Ant Design
- **CSS-in-JS:** Ant Design 6 usa CSS-in-JS (no clases CSS tradicionales)
- **Personalización limitada:** Algunos componentes difíciles de customizar
- **Migración:** Esfuerzo para migrar desde Tailwind
- **Vendor lock-in:** Dependencia fuerte de Ant Design

### Neutras ℹ️

- **Versión 6.x:** Usa CSS-in-JS (cambio desde v5)
- **Compatibilidad:** React 18+ requerido
- **Build time:** Ligeramente mayor por CSS-in-JS

---

## Alternativas Consideradas

### Alternativa A: Material-UI (MUI)

**Descripción:** Framework de UI basado en Material Design de Google.

**Pros:**
- Muy popular y maduro
- Componentes completos
- Theming robusto
- TypeScript first

**Contras:**
- Bundle size mayor (~700KB)
- Estética Material Design (menos neutral)
- Más complejo que Ant Design
- Pricing para componentes avanzados

**Por qué se descartó:** Bundle size mayor, estética muy específica de Material Design. Ant Design es más neutral y profesional para SaaS B2B.

---

### Alternativa B: Chakra UI

**Descripción:** Framework moderno con enfoque en accesibilidad y developer experience.

**Pros:**
- Bundle size pequeño
- Excelente DX
- Accesibilidad first
- Fácil de customizar

**Contras:**
- Menos componentes que Ant Design
- Comunidad más pequeña
- Menos maduro
- Componentes complejos (tablas) limitados

**Por qué se descartó:** Menos componentes out-of-the-box. Ant Design tiene componentes más complejos (Table, Form) que necesitamos.

---

### Alternativa C: Tailwind CSS + Headless UI

**Descripción:** Utility-first CSS + componentes headless.

**Pros:**
- Bundle size mínimo
- Máxima flexibilidad
- Control total sobre estilos
- Ya estábamos usando Tailwind

**Contras:**
- **Mucho trabajo manual:** Cada componente desde cero
- **Inconsistencia:** Fácil tener estilos inconsistentes
- **Tiempo de desarrollo:** Muy lento para MVP
- **Mantenimiento:** Más código que mantener

**Por qué se descartó:** Demasiado trabajo manual para equipo pequeño. Necesitamos velocidad de desarrollo. Ant Design ofrece componentes complejos que tomarían semanas implementar.

---

### Alternativa D: shadcn/ui

**Descripción:** Componentes copiables basados en Radix UI + Tailwind.

**Pros:**
- No es dependencia (copias código)
- Basado en Tailwind
- Muy customizable
- Moderno

**Contras:**
- Menos componentes que Ant Design
- Requiere setup manual
- Menos maduro
- Componentes complejos limitados

**Por qué se descartó:** Menos componentes, más setup manual. Ant Design es más completo y maduro.

---

## Impacto

### Equipos Afectados
- **Frontend:** Migración de componentes a Ant Design
- **UX/UI:** Adoptar sistema de diseño de Ant Design
- **QA:** Actualizar tests para componentes Ant Design

### Sistemas Afectados
- Todos los componentes de UI
- Theming system
- Formularios
- Tablas
- Modals

### Esfuerzo Estimado
- **Implementación:** 3 semanas (migración gradual)
- **Migración:** Componente por componente
- **Testing:** 1 semana

---

## Plan de Implementación

### Fase 1: Setup (✅ Completado)

1. ✅ Instalar Ant Design 6.x
2. ✅ Configurar ConfigProvider
3. ✅ Configurar ThemeProvider con CSS variables
4. ✅ Configurar locale (es-ES)

### Fase 2: Migración Gradual (🚧 En Progreso)

**Componentes migrados:**
- ✅ Button
- ✅ Form (Input, Select, DatePicker)
- ✅ Table
- ✅ Modal
- ✅ Card
- ✅ Layout (Header, Sider, Content)
- ✅ Menu
- ✅ Dropdown
- ✅ Tabs
- ✅ Badge
- ✅ Tag
- ✅ Avatar
- ✅ Spin (Loading)
- ✅ Message (Notifications)

**Componentes pendientes:**
- 📝 Upload
- 📝 Steps
- 📝 Progress
- 📝 Drawer

### Fase 3: Cleanup (📝 Pendiente)

1. 📝 Eliminar Tailwind CSS
2. 📝 Eliminar estilos inline
3. 📝 Consolidar estilos custom
4. 📝 Documentar componentes custom

**Criterios de Aceptación:**
- [x] ConfigProvider configurado
- [x] Theming dinámico funcional
- [x] 80% de componentes migrados
- [ ] 100% de componentes migrados
- [ ] Tailwind CSS eliminado
- [ ] Documentación actualizada

---

## Theming Dinámico

### Implementación

```typescript
// providers/ThemeProvider.jsx

const ThemeProvider = ({ children }) => {
  const { branding } = useTenant();

  const theme = {
    token: {
      colorPrimary: branding?.primary_color || '#1890ff',
      colorLink: branding?.primary_color || '#1890ff',
      borderRadius: 6,
      fontSize: 14,
    },
    components: {
      Button: {
        controlHeight: 40,
        borderRadius: 6,
      },
      Input: {
        controlHeight: 40,
      },
      Select: {
        controlHeight: 40,
      },
    },
  };

  // Aplicar CSS variables para estilos custom
  useEffect(() => {
    if (branding?.primary_color) {
      document.documentElement.style.setProperty(
        '--sr-primary',
        branding.primary_color
      );
    }
  }, [branding]);

  return (
    <ConfigProvider theme={theme} locale={esES}>
      {children}
    </ConfigProvider>
  );
};
```

### CSS Variables

```css
:root {
  --sr-primary: #1890ff;      /* Color primario del tenant */
  --sr-secondary: #52c41a;    /* Color secundario */
  --sr-text: #000000;         /* Color de texto */
}

/* Uso en componentes custom */
.custom-component {
  color: var(--sr-primary);
}
```

---

## Componentes Custom

### Wrapper Components

Para componentes que necesitan lógica adicional:

```typescript
// components/common/CustomTable.jsx

import { Table } from 'antd';

export const CustomTable = ({ 
  data, 
  columns, 
  loading,
  onRowClick,
  ...props 
}) => {
  return (
    <Table
      dataSource={data}
      columns={columns}
      loading={loading}
      onRow={(record) => ({
        onClick: () => onRowClick?.(record),
        style: { cursor: onRowClick ? 'pointer' : 'default' },
      })}
      pagination={{
        showSizeChanger: true,
        showTotal: (total) => `Total: ${total}`,
      }}
      {...props}
    />
  );
};
```

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Bundle size grande | Alta | Medio | Tree shaking, code splitting, lazy loading |
| Migración incompleta | Media | Medio | Migración gradual, priorizar componentes críticos |
| Personalización limitada | Baja | Bajo | Usar CSS variables para casos edge |
| Breaking changes en v7 | Baja | Medio | Seguir changelog, actualizar gradualmente |

---

## Métricas de Éxito

### Performance
- **Bundle size:** < 250KB gzipped
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s

### Desarrollo
- **Velocidad de desarrollo:** 2x más rápido vs Tailwind custom
- **Consistencia:** 100% de componentes usando Ant Design
- **Bugs de UI:** < 5 por sprint

### UX
- **Accesibilidad:** WCAG 2.1 AA
- **Responsive:** 100% de pantallas responsive
- **Theming:** Branding personalizado funcional

---

## Referencias

- [Ant Design Docs](https://ant.design/components/overview/)
- [Ant Design Theming](https://ant.design/docs/react/customize-theme)
- [ConfigProvider](https://ant.design/components/config-provider/)
- `docs/architecture/frontend.md` - Componentes implementados

---

## Notas Adicionales

**Decisión tomada en:** Fase de desarrollo del MVP (Feb 2026)

**Resultado:** Ant Design ha acelerado significativamente el desarrollo. Componentes profesionales out-of-the-box. Theming dinámico funciona perfectamente.

**Lecciones aprendidas:**
- ConfigProvider es esencial para theming
- CSS-in-JS de v6 requiere ajustes vs v5
- Componentes complejos (Table, Form) ahorran semanas de desarrollo
- Documentación excelente facilita adopción
- Bundle size manejable con tree shaking

**Componentes más usados:**
1. Table - Listados de datos
2. Form - Formularios complejos
3. Modal - Diálogos
4. Button - Acciones
5. Card - Contenedores

**Optimizaciones aplicadas:**
- Tree shaking para reducir bundle
- Lazy loading de componentes pesados
- Code splitting por ruta
- CSS variables para theming custom

**Migración desde Tailwind:**
- Gradual, componente por componente
- Priorizar componentes críticos primero
- Mantener Tailwind temporalmente para transición
- Eliminar Tailwind al 100% de migración

---

**Creado por:** Frontend Lead  
**Última actualización:** 2026-03-28  
**Revisores:** Staff Engineer, UX Lead
