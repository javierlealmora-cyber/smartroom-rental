// src/pages/v2/admin/services/smart-access/SalGestion.jsx
// Contenedor del módulo SmartAccessLock dentro de Gestión de Servicios.
//
// Sub-pestañas:
//   suscripcion   → SalSuscripcionTab (estado suscripción + solicitud)
//   configuracion → (F2) SmartAccessTab — credenciales TTLock
//   cerraduras    → (F4) LocksList
//   zonas-comunes → (F3) CommonAreasList
//   estructura    → (F3) AccessStructure
//   actores       → (F5) ActorsList
//   grupos        → (F5) GroupsList
//   accesos       → (F6) AccessGrantsList
//   credenciales  → (F7) CredentialsList
//   registros     → (F4) LockRecordsList
//
// El CustomEvent "sal:navigate" permite navegar entre sub-pestañas desde
// cualquier componente hijo (p. ej. SalSuscripcionTab → "Ir a Configuración").

import { useState, useEffect } from "react";
import { Tabs } from "antd";
import {
  SafetyCertificateOutlined,
  SettingOutlined,
  LockOutlined,
  ApiOutlined,
  ApartmentOutlined,
  TeamOutlined,
  IdcardOutlined,
  KeyOutlined,
  FileProtectOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import SalSuscripcionTab from "./tabs/SalSuscripcionTab";
import SmartAccessTab from "./tabs/SmartAccessTab";
import SalZonasTab from "./tabs/SalZonasTab";
import SalEstructuraTab from "./tabs/SalEstructuraTab";
import SalLocksTab from "./tabs/SalLocksTab";
import SalGatewaysTab from "./tabs/SalGatewaysTab";
import SalRegistrosTab from "./tabs/SalRegistrosTab";
import SalActoresTab from "./tabs/SalActoresTab";
import SalGruposTab from "./tabs/SalGruposTab";
import SalAccesosTab from "./tabs/SalAccesosTab";
import SalCredencialesTab from "./tabs/SalCredencialesTab";

// ── Definición de sub-pestañas ────────────────────────────────────────────────
const SAL_TABS = [
  {
    key: "suscripcion",
    label: "Gestión de Suscripciones",
    icon: <SafetyCertificateOutlined />,
    children: <SalSuscripcionTab />,
  },
  {
    key: "configuracion",
    label: "Configuración",
    icon: <SettingOutlined />,
    children: <SmartAccessTab />,
  },
  {
    key: "cerraduras",
    label: "Cerraduras",
    icon: <LockOutlined />,
    children: <SalLocksTab />,
  },
  {
    key: "gateways",
    label: "Gateways",
    icon: <ApiOutlined />,
    children: <SalGatewaysTab />,
  },
  {
    key: "zonas-comunes",
    label: "Zonas Comunes",
    icon: <ApartmentOutlined />,
    children: <SalZonasTab />,
  },
  {
    key: "estructura",
    label: "Estructura de Accesos",
    icon: <ApartmentOutlined />,
    children: <SalEstructuraTab />,
  },
  {
    key: "actores",
    label: "Actores",
    icon: <TeamOutlined />,
    children: <SalActoresTab />,
  },
  {
    key: "grupos",
    label: "Grupos",
    icon: <IdcardOutlined />,
    children: <SalGruposTab />,
  },
  {
    key: "accesos",
    label: "Accesos",
    icon: <KeyOutlined />,
    children: <SalAccesosTab />,
  },
  {
    key: "credenciales",
    label: "Credenciales",
    icon: <FileProtectOutlined />,
    children: <SalCredencialesTab />,
  },
  {
    key: "registros",
    label: "Registros de Acceso",
    icon: <HistoryOutlined />,
    children: <SalRegistrosTab />,
  },
];

// ── Componente principal ──────────────────────────────────────────────────────
export default function SalGestion() {
  const [activeTab, setActiveTab] = useState("suscripcion");

  // Escuchar el evento de navegación entre sub-pestañas
  useEffect(() => {
    function onSalNavigate(e) {
      const tab = e.detail;
      if (SAL_TABS.some((t) => t.key === tab)) {
        setActiveTab(tab);
      }
    }
    window.addEventListener("sal:navigate", onSalNavigate);
    return () => window.removeEventListener("sal:navigate", onSalNavigate);
  }, []);

  return (
    <>
      <style>{`
        .sal-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #0071E3 !important;
          font-weight: 700 !important;
        }
        .sal-tabs .ant-tabs-ink-bar {
          background: #0071E3 !important;
        }
        .sal-tabs .ant-tabs-tab-btn {
          color: #374151 !important;
        }
        .sal-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn {
          color: #0071E3 !important;
        }
      `}</style>
      <Tabs
        className="sal-tabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        type="line"
        size="small"
        style={{ paddingTop: 4 }}
        tabBarStyle={{ marginBottom: 20 }}
        items={SAL_TABS.map(({ key, label, icon, children }) => ({
          key,
          label: (
            <span>
              {icon}
              <span style={{ marginLeft: 6 }}>{label}</span>
            </span>
          ),
          children,
        }))}
      />
    </>
  );
}
