---
name: ux-tabs-multilevel
description: Implementa o migra el patrón de tabs multinivel estándar de SmartRoom Rental. Sustituye cualquier <Tabs> de Ant Design por el sistema visual con línea azul inferior, soportando hasta 3 niveles (tab principal → sub-tab → sub-sub-tab). Usar cuando se cree una nueva página con tabs o se migre una existente.
triggers:
  - user
  - model
---

# Skill: ux-tabs-multilevel

Implementa el patrón de tabs multinivel oficial de SmartRoom Rental.
Este patrón ya está en producción en `AccommodationDetail.jsx` y `AdminSettings.jsx`.

---

## Cuándo usar este skill

- Al crear una página nueva que necesite tabs (detalle, configuración, reportes…)
- Al migrar una página existente que usa `<Tabs>` de Ant Design
- Al añadir un nivel de sub-tabs a una página que solo tenía tabs principales

---

## Estructura de niveles

```
Nivel 1 — Tabs principales    (línea azul inferior, texto bold)
  └── Nivel 2 — Sub-tabs      (pills con fondo gris, sombra en activo)
        └── Nivel 3 — Sub-sub-tabs  (links con subrayado, opcional)
```

---

## Implementación paso a paso

### 1. Eliminar `Tabs` del import de Ant Design

```jsx
// ❌ Antes
import { Button, Card, Tabs, Typography } from "antd";

// ✅ Después
import { Button, Card, Typography } from "antd";
```

### 2. Añadir estado(s) al componente

```jsx
// Nivel 1 siempre requerido
const [activeTab, setActiveTab] = useState("primer_key");

// Nivel 2 — solo si hay sub-tabs
const [activeSubTab, setActiveSubTab] = useState("primer_subkey");

// Nivel 3 — solo si hay sub-sub-tabs
const [activeSubSubTab, setActiveSubSubTab] = useState("primer_subsubkey");
```

### 3. Definir la configuración de tabs

```jsx
// Ejemplo con los 3 niveles
const TABS = [
  {
    key: "datos",
    label: "Datos",
    icon: <InfoCircleOutlined />,        // icono opcional
    subTabs: [
      {
        key: "info",
        label: "Información",
        subSubTabs: [                    // nivel 3, opcional
          { key: "general",  label: "General" },
          { key: "contacto", label: "Contacto" },
        ],
      },
      { key: "ocupacion", label: "Ocupación" },
    ],
  },
  {
    key: "habitaciones",
    label: "Habitaciones",
    icon: <HomeOutlined />,
    subTabs: null,                       // null = sin sub-tabs
  },
  {
    key: "consumos",
    label: "Consumos",
    subTabs: [
      { key: "registros", label: "Registros" },
      { key: "visor",     label: "Visor" },
    ],
  },
];
```

### 4. Handlers de navegación

```jsx
const handleTabClick = (tab) => {
  setActiveTab(tab.key);
  // Si el tab tiene sub-tabs, activar el primero automáticamente
  if (tab.subTabs?.length) {
    setActiveSubTab(tab.subTabs[0].key);
    // Si el sub-tab tiene sub-sub-tabs, activar el primero también
    if (tab.subTabs[0].subSubTabs?.length) {
      setActiveSubSubTab(tab.subTabs[0].subSubTabs[0].key);
    }
  } else {
    setActiveSubTab(null);
  }
};

const handleSubTabClick = (sub) => {
  setActiveSubTab(sub.key);
  if (sub.subSubTabs?.length) {
    setActiveSubSubTab(sub.subSubTabs[0].key);
  } else {
    setActiveSubSubTab(null);
  }
};
```

### 5. JSX — Render del sistema de tabs

```jsx
{/* ── NIVEL 1: Tabs principales ───────────────────────────── */}
<div style={{ marginBottom: 0 }}>
  <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E5E7EB" }}>
    {TABS.map((tab) => (
      <button
        key={tab.key}
        onClick={() => handleTabClick(tab)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "10px 20px",
          fontSize: 14,
          fontWeight: activeTab === tab.key ? 700 : 500,
          color: activeTab === tab.key ? "#0071E3" : "#374151",
          borderBottom: activeTab === tab.key ? "2px solid #0071E3" : "2px solid transparent",
          marginBottom: "-2px",
          transition: "all 0.15s",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {tab.icon && tab.icon}
        {tab.label}
      </button>
    ))}
  </div>

  {/* ── NIVEL 2: Sub-tabs ──────────────────────────────────── */}
  {TABS.find((t) => t.key === activeTab)?.subTabs && (
    <div style={{
      display: "flex",
      gap: 0,
      background: "#F9FAFB",
      borderBottom: "1px solid #E5E7EB",
      paddingLeft: 8,
    }}>
      {TABS.find((t) => t.key === activeTab).subTabs.map((sub) => (
        <button
          key={sub.key}
          onClick={() => handleSubTabClick(sub)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "7px 16px",
            fontSize: 13,
            fontWeight: activeSubTab === sub.key ? 600 : 400,
            color: activeSubTab === sub.key ? "#0071E3" : "#6B7280",
            borderBottom: activeSubTab === sub.key ? "2px solid #0071E3" : "2px solid transparent",
            marginBottom: "-1px",
            transition: "all 0.15s",
            fontFamily: "inherit",
          }}
        >
          {sub.label}
        </button>
      ))}
    </div>
  )}

  {/* ── NIVEL 3: Sub-sub-tabs ──────────────────────────────── */}
  {(() => {
    const currentTab = TABS.find((t) => t.key === activeTab);
    const currentSub = currentTab?.subTabs?.find((s) => s.key === activeSubTab);
    if (!currentSub?.subSubTabs?.length) return null;
    return (
      <div style={{
        display: "flex",
        gap: 16,
        padding: "8px 16px",
        background: "#FFFFFF",
        borderBottom: "1px solid #F3F4F6",
      }}>
        {currentSub.subSubTabs.map((ss) => (
          <button
            key={ss.key}
            onClick={() => setActiveSubSubTab(ss.key)}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: activeSubSubTab === ss.key ? 600 : 400,
              color: activeSubSubTab === ss.key ? "#0071E3" : "#9CA3AF",
              textDecoration: activeSubSubTab === ss.key ? "underline" : "none",
              textUnderlineOffset: 3,
              padding: 0,
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {ss.label}
          </button>
        ))}
      </div>
    );
  })()}
</div>

{/* ── Contenido del tab activo ───────────────────────────── */}
<div style={{ marginTop: 24 }}>
  {/* Renderizar el contenido según activeTab / activeSubTab / activeSubSubTab */}
  {activeTab === "datos" && activeSubTab === "info" && <InfoContent />}
  {activeTab === "datos" && activeSubTab === "ocupacion" && <OcupacionContent />}
  {activeTab === "habitaciones" && <HabitacionesContent />}
  {/* etc... */}
</div>
```

---

## Tokens de color (NO cambiar sin actualizar la regla)

| Token | Valor | Uso |
|-------|-------|-----|
| `--tab-active-color` | `#0071E3` | Color texto + línea tab activo |
| `--tab-inactive-color` | `#374151` | Texto tab inactivo (nivel 1) |
| `--tab-inactive-sub` | `#6B7280` | Texto sub-tab inactivo (nivel 2) |
| `--tab-inactive-subsub` | `#9CA3AF` | Texto sub-sub-tab inactivo (nivel 3) |
| `--tab-border-main` | `#E5E7EB` | Borde inferior barra nivel 1 |
| `--tab-border-sub` | `#E5E7EB` | Borde inferior barra nivel 2 |
| `--tab-bg-sub` | `#F9FAFB` | Fondo barra nivel 2 |
| `--tab-bg-subsub` | `#FFFFFF` | Fondo barra nivel 3 |

---

## Páginas ya migradas (referencia)

| Página | Niveles | Estado |
|--------|---------|--------|
| `AccommodationDetail.jsx` | 2 niveles (tab + sub-tab) | ✅ Migrada |
| `AdminSettings.jsx` | 1 nivel (solo tabs) | ✅ Migrada |

---

## Checklist de migración

Al aplicar este patrón en una página existente, verificar:

- [ ] Eliminar `Tabs` del import de Ant Design
- [ ] Añadir `useState` para cada nivel necesario
- [ ] Definir `TABS` con estructura `{ key, label, icon?, subTabs? }`
- [ ] Añadir handlers `handleTabClick` y `handleSubTabClick` si hay sub-tabs
- [ ] El primer tab activo coincide con el `defaultActiveKey` anterior
- [ ] El contenido de cada tab se renderiza condicionalmente con `activeTab === "key"`
- [ ] El layout exterior (maxWidth, padding, título) NO se toca
- [ ] No se introduce CSS de Tailwind ni inline styles ajenos a los del patrón
