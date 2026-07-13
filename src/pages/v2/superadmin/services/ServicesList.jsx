// =============================================================================
// src/pages/v2/superadmin/services/ServicesList.jsx
// Catálogo de Servicios — estilo Control Center estándar
// =============================================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, AppstoreAddOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import {
  getServices, archiveService, reactivateService, serviceCategories,
} from "../../../../mocks/services.mock";

// ─── Paleta estándar ──────────────────────────────────────────────────────────
const C = {
  text:    "#1A2438",
  muted:   "#8A9BB8",
  light:   "#C0CCD8",
  divider: "rgba(0,0,0,0.07)",
  navy:    "#0B2E6D",
};

const CAT_COLORS = {
  "operación":     { bg: "#E0E7FF", color: "#3730A3" },
  "comunicación":  { bg: "#FEF3C7", color: "#92400E" },
  "analítica":     { bg: "#D1FAE5", color: "#065F46" },
};

// ─── KPI Pill ─────────────────────────────────────────────────────────────────
function KpiPill({ label, value, bg = "#F3F4F6", color = "#374151" }) {
  return (
    <div style={{
      background: bg, borderRadius: 8, padding: "7px 14px",
      border: "1px solid rgba(11,46,109,0.08)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 80,
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "center", width: "100%" }}>
        {label}
      </span>
      <span style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: "-0.5px", lineHeight: 1.1, textAlign: "center", width: "100%" }}>
        {value}
      </span>
    </div>
  );
}

export default function ServicesList() {
  const navigate = useNavigate();

  const [services,     setServices]     = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCat,    setFilterCat]    = useState("");
  const [search,       setSearch]       = useState("");
  const [confirmModal, setConfirmModal] = useState({ open: false, service: null, action: null });

  const loadServices = () => {
    const params = {};
    if (filterStatus) params.status   = filterStatus;
    if (filterCat)    params.category = filterCat;
    if (search)       params.search   = search;
    setServices(getServices(params));
  };

  useEffect(() => { loadServices(); }, [filterStatus, filterCat, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmAction = () => {
    if (confirmModal.action === "archive")    archiveService(confirmModal.service.id);
    if (confirmModal.action === "reactivate") reactivateService(confirmModal.service.id);
    setConfirmModal({ open: false, service: null, action: null });
    loadServices();
  };

  // KPIs
  const activeCount   = services.filter(s => s.status === "active").length;
  const archivedCount = services.filter(s => s.status === "archived").length;
  const allServices   = getServices({});

  return (
    <V2Layout role="superadmin" userName="Administrador">
      <div style={{ background: "#fff", minHeight: "100%", paddingBottom: 40 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: 0, letterSpacing: "-0.4px", display: "flex", alignItems: "center", gap: 10 }}>
              <AppstoreAddOutlined style={{ fontSize: 22, color: "#D97706" }} />
              Catálogo de Servicios
            </h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
              {services.length} servicios ({activeCount} activos, {archivedCount} archivados)
            </p>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadServices}>Actualizar</Button>
            <Button
              type="primary" icon={<PlusOutlined />}
              onClick={() => navigate("/v2/superadmin/servicios/nuevo")}
              style={{ background: C.navy, borderColor: C.navy }}
            >
              Nuevo Servicio
            </Button>
          </Space>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
          <KpiPill value={allServices.length}  label="TOTAL"       bg="#F3F4F6" color="#374151" />
          <KpiPill value={activeCount}         label="ACTIVOS"     bg="#F0FDF4" color="#16A34A" />
          <KpiPill value={archivedCount}       label="ARCHIVADOS"  bg="#FEF2F2" color="#DC2626" />
          <KpiPill value={serviceCategories.length} label="CATEGORÍAS" bg="#EFF6FF" color="#0071E3" />
        </div>

        {/* ── Filtros ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <Input.Search
            placeholder="Buscar por nombre o clave..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 300 }}
            allowClear
          />
          <Select
            placeholder="Estado"
            value={filterStatus || undefined}
            onChange={setFilterStatus}
            allowClear style={{ width: 150 }}
            options={[
              { value: "active",   label: "Activo" },
              { value: "archived", label: "Archivado" },
            ]}
          />
          <Select
            placeholder="Categoría"
            value={filterCat || undefined}
            onChange={setFilterCat}
            allowClear style={{ width: 160 }}
            options={serviceCategories.map(c => ({ value: c, label: c }))}
          />
        </div>

        {/* ── Tabla ────────────────────────────────────────────────────── */}
        <div style={{
          background: "#fff", border: "1px solid rgba(11,46,109,0.08)",
          borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(11,46,109,0.04)",
        }}>
          {/* Cabecera */}
          <div style={{
            display: "grid", gridTemplateColumns: "120px 1fr 2fr 120px 100px 120px",
            padding: "10px 18px", borderBottom: `1px solid ${C.divider}`, background: "#F8FAFC",
          }}>
            {["Clave", "Nombre", "Descripción", "Categoría", "Estado", "Acciones"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {h}
              </div>
            ))}
          </div>

          {/* Filas */}
          {services.length === 0 ? (
            <div style={{ padding: "32px 18px", color: C.muted, fontSize: 13, textAlign: "center" }}>Sin servicios</div>
          ) : services.map((svc, i) => {
            const cat   = CAT_COLORS[svc.category] || { bg: "#F3F4F6", color: "#374151" };
            const isAct = svc.status === "active";
            return (
              <div
                key={svc.id}
                style={{
                  display: "grid", gridTemplateColumns: "120px 1fr 2fr 120px 100px 120px",
                  padding: "12px 18px", alignItems: "center",
                  borderBottom: i < services.length - 1 ? `1px solid ${C.divider}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Clave */}
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#6366F1", fontWeight: 600 }}>{svc.key}</div>
                {/* Nombre */}
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{svc.name}</div>
                {/* Descripción */}
                <div style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.description}</div>
                {/* Categoría */}
                <div>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 10, background: cat.bg, color: cat.color }}>
                    {svc.category}
                  </span>
                </div>
                {/* Estado */}
                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                    background: isAct ? "#DCFCE7" : "#FEE2E2",
                    color:      isAct ? "#166534" : "#991B1B",
                  }}>
                    {isAct ? "Activo" : "Archivado"}
                  </span>
                </div>
                {/* Acciones */}
                <div style={{ display: "flex", gap: 6 }}>
                  <Button size="small" onClick={() => navigate(`/v2/superadmin/servicios/${svc.id}`)}>Ver</Button>
                  {isAct
                    ? <Button size="small" danger onClick={() => setConfirmModal({ open: true, service: svc, action: "archive" })}>Archivar</Button>
                    : <Button size="small" onClick={() => setConfirmModal({ open: true, service: svc, action: "reactivate" })}>Activar</Button>
                  }
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Modal confirmación ───────────────────────────────────────── */}
        {confirmModal.open && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: "0 0 12px" }}>
                {confirmModal.action === "archive" ? "Archivar servicio" : "Reactivar servicio"}
              </h3>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px" }}>
                ¿{confirmModal.action === "archive" ? "Archivar" : "Reactivar"} el servicio{" "}
                <strong style={{ color: C.text }}>{confirmModal.service?.name}</strong>?
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button onClick={() => setConfirmModal({ open: false, service: null, action: null })}>Cancelar</Button>
                <Button type="primary" danger={confirmModal.action === "archive"} onClick={confirmAction}>Confirmar</Button>
              </div>
            </div>
          </div>
        )}

      </div>
      </div>
    </V2Layout>
  );
}
