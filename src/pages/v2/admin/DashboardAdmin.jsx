// src/pages/v2/admin/DashboardAdmin.jsx
// Dashboard principal para Admin — diseño Apple style

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Skeleton } from "antd";
import V2Layout from "../../../layouts/V2Layout";
import { useAdminLayout } from "../../../hooks/useAdminLayout";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../services/supabaseClient";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function fDate() {
  return new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { userName, companyBranding } = useAdminLayout();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: entities },
        { data: accommodations },
        { data: rooms },
        { data: lodgers },
      ] = await Promise.all([
        supabase.from("entities").select("id, type, status"),
        supabase.from("accommodations").select("id, status"),
        supabase.from("rooms").select("id, status"),
        supabase.from("lodgers").select("id, status"),
      ]);

      const totalEntities = (entities || []).filter((e) => e.type === "owner").length;
      const totalAccommodations = (accommodations || []).filter((a) => a.status === "active").length;
      const allRooms = rooms || [];
      const totalRooms = allRooms.length;
      const freeRooms = allRooms.filter((r) => r.status === "free").length;
      const occupiedRooms = allRooms.filter((r) => r.status === "occupied").length;
      const pendingCheckout = allRooms.filter((r) => r.status === "pending_checkout").length;
      const allLodgers = lodgers || [];
      const activeTenants = allLodgers.filter((l) => l.status === "active").length;
      const pendingTenants = allLodgers.filter((l) => l.status === "pending_checkout").length;

      setStats({ totalEntities, totalAccommodations, totalRooms, freeRooms, occupiedRooms, pendingCheckout, activeTenants, pendingTenants });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const occupancyRate = stats && stats.totalRooms > 0
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0;

  const kpis = stats ? [
    { label: "Alojamientos", value: stats.totalAccommodations, icon: "🏠", color: "#0071E3", sub: "activos" },
    { label: "Habitaciones", value: stats.totalRooms, icon: "🚪", color: "#34C759", sub: `${stats.freeRooms} libres · ${stats.occupiedRooms} ocupadas` },
    { label: "Inquilinos", value: stats.activeTenants, icon: "👥", color: "#FF9500", sub: stats.pendingTenants > 0 ? `${stats.pendingTenants} pendiente${stats.pendingTenants > 1 ? "s" : ""} de baja` : "activos" },
    { label: "Ocupación", value: `${occupancyRate}%`, icon: "📊", color: occupancyRate > 80 ? "#34C759" : occupancyRate > 50 ? "#FF9500" : "#FF3B30", sub: "tasa actual", isOccupancy: true, rate: occupancyRate },
    { label: "Entidades", value: stats.totalEntities, icon: "🏛️", color: "#AF52DE", sub: "propietarias" },
  ] : [];

  const quickLinks = [
    { label: "Nueva Factura", desc: "Registrar consumo energético", icon: "⚡", path: "/v2/admin/energia/facturas/nueva", color: "#FF9500" },
    { label: "Nuevo Inquilino", desc: "Registrar y asignar habitación", icon: "👤", path: "/v2/admin/inquilinos/nuevo", color: "#34C759" },
    { label: "Nuevo Alojamiento", desc: "Añadir propiedad al portfolio", icon: "🏠", path: "/v2/admin/alojamientos/nuevo", color: "#0071E3" },
    { label: "Nuevo Boletín", desc: "Crear liquidación para inquilino", icon: "🔔", path: "/v2/admin/boletines/nuevo", color: "#AF52DE" },
    { label: "Ver Liquidaciones", desc: "Consultar liquidaciones de energía", icon: "📑", path: "/v2/admin/energia/liquidaciones", color: "#FF3B30" },
    { label: "Catálogo Servicios", desc: "Gestionar servicios disponibles", icon: "🔧", path: "/v2/admin/servicios", color: "#5856D6" },
  ];

  const firstName = userName?.split(" ")[0] || "Admin";

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <style>{`
        .dash-hero {
          background: linear-gradient(135deg, #0071E3 0%, #0051a8 100%);
          border-radius: 20px;
          padding: 32px 36px;
          margin-bottom: 28px;
          color: #fff;
          position: relative;
          overflow: hidden;
        }
        .dash-hero::after {
          content: '';
          position: absolute;
          right: -40px; top: -40px;
          width: 220px; height: 220px;
          background: rgba(255,255,255,0.07);
          border-radius: 50%;
        }
        .dash-hero-greeting { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
        .dash-hero-date { font-size: 14px; color: rgba(255,255,255,0.72); }
        .dash-hero-reload {
          position: absolute; top: 20px; right: 20px;
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
          border-radius: 50%; width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #fff; font-size: 16px;
          transition: background 0.18s;
        }
        .dash-hero-reload:hover { background: rgba(255,255,255,0.25); }
        .dash-kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }
        .dash-kpi-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px 18px 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          cursor: default;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .dash-kpi-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.10);
        }
        .dash-kpi-icon { font-size: 28px; margin-bottom: 10px; display: block; }
        .dash-kpi-value { font-size: 34px; font-weight: 700; letter-spacing: -1px; line-height: 1; margin-bottom: 4px; }
        .dash-kpi-label { font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
        .dash-kpi-sub { font-size: 11.5px; color: #9CA3AF; }
        .dash-kpi-bar { height: 4px; border-radius: 2px; background: #F3F4F6; margin-top: 10px; overflow: hidden; }
        .dash-kpi-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
        .dash-section-title { font-size: 18px; font-weight: 700; color: #1D1D1F; letter-spacing: -0.3px; margin-bottom: 14px; }
        .dash-quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .dash-quick-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex; align-items: flex-start; gap: 14px;
          border: none; text-align: left; width: 100%; font-family: inherit;
        }
        .dash-quick-card:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 10px 28px rgba(0,0,0,0.11);
        }
        .dash-quick-icon {
          width: 46px; height: 46px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0;
        }
        .dash-quick-label { font-size: 14px; font-weight: 600; color: #1D1D1F; margin-bottom: 3px; }
        .dash-quick-desc { font-size: 12px; color: #6B7280; line-height: 1.4; }
        .dash-alert-banner {
          background: #FFF7ED; border: 1px solid #FED7AA;
          border-radius: 12px; padding: 12px 18px;
          margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
          font-size: 13.5px; color: #92400E;
        }
        @media (max-width: 1100px) {
          .dash-kpi-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .dash-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .dash-quick-grid { grid-template-columns: repeat(2, 1fr); }
          .dash-hero { padding: 24px 20px; }
          .dash-hero-greeting { font-size: 22px; }
        }
        @media (max-width: 480px) {
          .dash-kpi-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .dash-quick-grid { grid-template-columns: 1fr; }
          .dash-kpi-value { font-size: 28px; }
        }
      `}</style>

      {/* Hero */}
      <div className="dash-hero">
        <div className="dash-hero-greeting">{getGreeting()}, {firstName} 👋</div>
        <div className="dash-hero-date" style={{ textTransform: "capitalize" }}>{fDate()}</div>
        <button className="dash-hero-reload" onClick={load} title="Actualizar datos">↻</button>
      </div>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16, borderRadius: 12 }} />
      )}

      {/* Alerta pendientes */}
      {stats?.pendingTenants > 0 && (
        <div className="dash-alert-banner">
          <span>⚠️</span>
          <span><strong>{stats.pendingTenants} inquilino{stats.pendingTenants > 1 ? "s" : ""}</strong> pendiente{stats.pendingTenants > 1 ? "s" : ""} de baja — revisa la sección de Inquilinos</span>
        </div>
      )}

      {/* KPIs */}
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} style={{ marginBottom: 28 }} />
      ) : (
        <div className="dash-kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className="dash-kpi-card">
              <span className="dash-kpi-icon">{k.icon}</span>
              <div className="dash-kpi-label">{k.label}</div>
              <div className="dash-kpi-value" style={{ color: k.color }}>{k.value}</div>
              <div className="dash-kpi-sub">{k.sub}</div>
              {k.isOccupancy && (
                <div className="dash-kpi-bar">
                  <div className="dash-kpi-bar-fill" style={{ width: `${k.rate}%`, background: k.color }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="dash-section-title">Accesos rápidos</div>
      <div className="dash-quick-grid">
        {quickLinks.map((item) => (
          <button key={item.path} className="dash-quick-card" onClick={() => navigate(item.path)}>
            <div className="dash-quick-icon" style={{ background: `${item.color}18` }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
            </div>
            <div>
              <div className="dash-quick-label">{item.label}</div>
              <div className="dash-quick-desc">{item.desc}</div>
            </div>
          </button>
        ))}
      </div>

    </V2Layout>
  );
}
