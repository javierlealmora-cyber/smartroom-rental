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

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

const ACTION_LABELS = {
  create: { label: "Creado", color: "#34C759", icon: "✚" },
  update: { label: "Actualizado", color: "#0071E3", icon: "✎" },
  delete: { label: "Eliminado", color: "#FF3B30", icon: "✕" },
  set_status: { label: "Estado cambiado", color: "#FF9500", icon: "◉" },
  set_room_status: { label: "Habitación actualizada", color: "#FF9500", icon: "🚪" },
};

const ENTITY_LABELS = {
  accommodation: "Alojamiento",
  room: "Habitación",
  lodger: "Inquilino",
  entity: "Entidad",
  service: "Servicio",
  energy_bill: "Factura",
  bulletin: "Boletín",
  lodger_service: "Servicio inquilino",
};

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

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

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const { data } = await supabase
        .from("audit_log")
        .select("id, entity_type, action, actor_role, metadata, new_values, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setActivity(data || []);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadActivity(); }, [load, loadActivity]);

  const occupancyRate = stats && stats.totalRooms > 0
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0;

  // KPIs en orden lógico: Entidades > Alojamientos > Habitaciones > Inquilinos > Ocupación
  const kpis = stats ? [
    { label: "Entidades",    value: stats.totalEntities,       imgUrl: "/icons/entidad-icono-model.png",      color: "#AF52DE", sub: "propietarias" },
    { label: "Alojamientos", value: stats.totalAccommodations, imgUrl: "/icons/alojamiento-icono-model.png",  color: "#0071E3", sub: "activos" },
    { label: "Habitaciones", value: stats.totalRooms,          imgUrl: "/icons/habitacion-icono-model.png",   color: "#34C759", sub: `${stats.freeRooms} libres · ${stats.occupiedRooms} ocupadas` },
    { label: "Inquilinos",   value: stats.activeTenants,       imgUrl: "/icons/inquilinos-icono-model.png",   color: "#FF9500", sub: stats.pendingTenants > 0 ? `${stats.pendingTenants} pendiente${stats.pendingTenants > 1 ? "s" : ""} de baja` : "activos" },
    { label: "Ocupación",    value: `${occupancyRate}%`,       imgUrl: null, icon: "📊",                      color: occupancyRate > 80 ? "#34C759" : occupancyRate > 50 ? "#FF9500" : "#FF3B30", sub: "tasa actual", isOccupancy: true, rate: occupancyRate },
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
          border-radius: 16px;
          padding: 22px 28px;
          margin-bottom: 22px;
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
        .dash-hero-greeting { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 3px; }
        .dash-hero-date { font-size: 12px; color: rgba(255,255,255,0.72); }
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
          gap: 10px;
          margin-bottom: 22px;
        }
        .dash-kpi-card {
          background: #fff;
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          cursor: default;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
        }
        .dash-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.10);
        }
        .dash-kpi-img {
          width: 72px; height: 72px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .dash-kpi-icon-wrap {
          width: 72px; height: 72px;
          display: flex; align-items: center; justify-content: center;
          font-size: 36px; flex-shrink: 0;
        }
        .dash-kpi-text { display: flex; flex-direction: column; min-width: 0; }
        .dash-kpi-label { font-size: 9px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 2px; }
        .dash-kpi-value { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.1; margin-bottom: 2px; }
        .dash-kpi-sub { font-size: 9px; color: #9CA3AF; }
        .dash-kpi-bar { height: 4px; border-radius: 2px; background: #F3F4F6; margin-top: 6px; overflow: hidden; width: 100%; }
        .dash-kpi-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
        .dash-section-title { font-size: 14px; font-weight: 700; color: #1D1D1F; letter-spacing: -0.3px; margin-bottom: 10px; }
        .dash-quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .dash-quick-card {
          background: #fff;
          border-radius: 12px;
          padding: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex; align-items: flex-start; gap: 10px;
          border: none; text-align: left; width: 100%; font-family: inherit;
        }
        .dash-quick-card:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 10px 28px rgba(0,0,0,0.11);
        }
        .dash-quick-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; flex-shrink: 0;
        }
        .dash-quick-label { font-size: 12px; font-weight: 600; color: #1D1D1F; margin-bottom: 2px; }
        .dash-quick-desc { font-size: 11px; color: #6B7280; line-height: 1.4; }
        .dash-alert-banner {
          background: #FFF7ED; border: 1px solid #FED7AA;
          border-radius: 12px; padding: 12px 18px;
          margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
          font-size: 13.5px; color: #92400E;
        }
        .dash-bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 22px;
        }
        .dash-activity-card {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          display: flex; flex-direction: column;
        }
        .dash-activity-scroll {
          max-height: 280px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #E5E7EB transparent;
        }
        .dash-activity-scroll::-webkit-scrollbar { width: 4px; }
        .dash-activity-scroll::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
        .dash-activity-title {
          font-size: 13px; font-weight: 700; color: #1D1D1F;
          letter-spacing: -0.2px; margin-bottom: 12px;
        }
        .dash-activity-item {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 7px 0; border-bottom: 1px solid #F3F4F6;
        }
        .dash-activity-item:last-child { border-bottom: none; }
        .dash-activity-dot {
          width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; color: #fff; flex-shrink: 0; margin-top: 1px;
        }
        .dash-activity-text { font-size: 11px; color: #374151; line-height: 1.4; }
        .dash-activity-meta { font-size: 10px; color: #9CA3AF; margin-top: 1px; }
        .dash-activity-empty { text-align: center; padding: 32px 0; color: #9CA3AF; font-size: 13px; }
        @media (max-width: 1100px) {
          .dash-kpi-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 900px) {
          .dash-bottom-grid { grid-template-columns: 1fr; }
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
              {k.imgUrl
                ? <img src={k.imgUrl} alt={k.label} className="dash-kpi-img" />
                : <div className="dash-kpi-icon-wrap">{k.icon}</div>
              }
              <div className="dash-kpi-text">
                <div className="dash-kpi-label">{k.label}</div>
                <div className="dash-kpi-value" style={{ color: k.color }}>{k.value}</div>
                <div className="dash-kpi-sub">{k.sub}</div>
                {k.isOccupancy && (
                  <div className="dash-kpi-bar">
                    <div className="dash-kpi-bar-fill" style={{ width: `${k.rate}%`, background: k.color }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom grid: Accesos rápidos + Actividad reciente */}
      <div className="dash-bottom-grid">

        {/* Accesos rápidos */}
        <div>
          <div className="dash-section-title">Accesos rápidos</div>
          <div className="dash-quick-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
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
        </div>

        {/* Actividad reciente */}
        <div className="dash-activity-card">
          <div className="dash-activity-title">⏱ Actividad reciente</div>
          {activityLoading ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : activity.length === 0 ? (
            <div className="dash-activity-empty">
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div>Sin actividad registrada aún</div>
            </div>
          ) : (
            <div className="dash-activity-scroll">
            {activity.map((item) => {
              const act = ACTION_LABELS[item.action] || { label: item.action, color: "#6B7280", icon: "·" };
              const entityLabel = ENTITY_LABELS[item.entity_type] || item.entity_type;
              const name = item.new_values?.name || item.new_values?.legal_name || item.new_values?.number || "";
              return (
                <div key={item.id} className="dash-activity-item">
                  <div className="dash-activity-dot" style={{ background: act.color }}>
                    {act.icon}
                  </div>
                  <div>
                    <div className="dash-activity-text">
                      <strong>{act.label}</strong> · {entityLabel}{name ? `: ${name}` : ""}
                    </div>
                    <div className="dash-activity-meta">
                      {item.actor_role} · {timeAgo(item.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

      </div>

    </V2Layout>
  );
}
