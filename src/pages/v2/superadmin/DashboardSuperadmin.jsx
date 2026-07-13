// =============================================================================
// src/pages/v2/superadmin/DashboardSuperadmin.jsx
// =============================================================================
// Control Center Superadmin — layout al estilo DashboardAdminV3
// GlobeMap: MapLibre GL con proyección globe — zoom sin distorsión hasta ciudad
// =============================================================================

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { useNavigate } from "react-router-dom";
import V2Layout from "../../../layouts/V2Layout";
import { supabase } from "../../../services/supabaseClient";

// GlobeMap cargado lazy (maplibre-gl es pesado)
const GlobeMap = lazy(() => import("../../../components/maps/GlobeMap"));

// ─── Paleta (mismo estilo que DashboardAdminV3) ───────────────────────────────
const C = {
  bg:      "#FFFFFF",
  text:    "#1A2438",
  muted:   "#8A9BB8",
  light:   "#C0CCD8",
  divider: "rgba(0,0,0,0.07)",
  navy:    "#0B2E6D",
  green:   "#10B981",   // alojamientos
  red:     "#EF4444",   // conexiones activas (< 7 días)
  orange:  "#F59E0B",   // conexiones recientes (7-30 días)
  blue:    "#3B82F6",
};

const PLAN_COLORS = { basic: "#64748B", investor: "#2563EB", business: "#7C3AED", agency: "#D97706" };
const PLAN_LABELS = { basic: "Basic", investor: "Investor", business: "Business", agency: "Agency" };
const STATUS_COLOR = { active: "#059669", suspended: "#D97706", cancelled: "#DC2626", trial: "#2563EB" };
const STATUS_LABEL = { active: "Activa", suspended: "Suspendida", cancelled: "Cancelada", trial: "Prueba" };
const getPlanColor  = (p) => PLAN_COLORS[p] || "#64748B";
const getPlanLabel  = (p) => PLAN_LABELS[p] || p || "—";
const getStatusColor = (s) => STATUS_COLOR[s] || "#64748B";
const getStatusLabel = (s) => STATUS_LABEL[s] || s;

const ACT_COLORS = { create:"#22C55E", update:"#22D3EE", delete:"#EF4444", set_status:"#D97706" };
const ACT_LABEL  = { create:"Creado",  update:"Actualizado", delete:"Eliminado", set_status:"Estado" };
const ENT_LABEL  = {
  accommodation:"Alojamiento", room:"Habitación", lodger:"Inquilino",
  entity:"Entidad", service:"Servicio", energy_bill:"Factura",
};

// ─── Datos MOCK para el Globe ─────────────────────────────────────────────────
// 50 puntos distribuidos por ciudades reales de España y Europa con calles/barrios
// para demostrar el clustering y el detalle a nivel de calle al hacer zoom
const MADRID_POINTS = [
  // ── Madrid (12 puntos en barrios con coordenadas de calle) ──────────────────
  { id:"m01", lat:40.4168, lng:-3.7038, name:"C/ Arenal 8",           city:"Madrid",    client:"CA-001" },
  { id:"m02", lat:40.4154, lng:-3.6921, name:"C/ Ibiza 14",           city:"Madrid",    client:"CA-001" },
  { id:"m03", lat:40.4234, lng:-3.6893, name:"C/ Serrano 55",         city:"Madrid",    client:"CA-002" },
  { id:"m04", lat:40.4288, lng:-3.7020, name:"C/ Génova 12",          city:"Madrid",    client:"CA-002" },
  { id:"m05", lat:40.4095, lng:-3.7023, name:"C/ Lavapiés 22",        city:"Madrid",    client:"CA-003" },
  { id:"m06", lat:40.4180, lng:-3.7124, name:"C/ Fuencarral 80",      city:"Madrid",    client:"CA-004" },
  { id:"m07", lat:40.4220, lng:-3.7040, name:"C/ Hortaleza 45",       city:"Madrid",    client:"CA-004" },
  { id:"m08", lat:40.4065, lng:-3.6944, name:"Pso. Delicias 9",       city:"Madrid",    client:"CA-005" },
  { id:"m09", lat:40.4380, lng:-3.6890, name:"C/ Castellana 120",     city:"Madrid",    client:"CA-006" },
  { id:"m10", lat:40.3980, lng:-3.7120, name:"C/ Oporto 31",          city:"Madrid",    client:"CA-007" },
  { id:"m11", lat:40.4120, lng:-3.7250, name:"C/ Princesa 7",         city:"Madrid",    client:"CA-008" },
  { id:"m12", lat:40.4260, lng:-3.6750, name:"C/ Goya 77",            city:"Madrid",    client:"CA-005" },

  // ── Barcelona (10 puntos) ────────────────────────────────────────────────────
  { id:"b01", lat:41.3832, lng:2.1778,  name:"C/ Rosselló 180",       city:"Barcelona", client:"CA-002" },
  { id:"b02", lat:41.3901, lng:2.1650,  name:"C/ Mallorca 265",       city:"Barcelona", client:"CA-002" },
  { id:"b03", lat:41.3780, lng:2.1800,  name:"C/ Provença 144",       city:"Barcelona", client:"CA-003" },
  { id:"b04", lat:41.3756, lng:2.1744,  name:"C/ Consell de Cent 350",city:"Barcelona", client:"CA-003" },
  { id:"b05", lat:41.3940, lng:2.1580,  name:"C/ Travessera Gràcia 55",city:"Barcelona",client:"CA-004" },
  { id:"b06", lat:41.3830, lng:2.1622,  name:"Pge. Gracia 72",        city:"Barcelona", client:"CA-004" },
  { id:"b07", lat:41.3795, lng:2.1880,  name:"C/ Pau Claris 98",      city:"Barcelona", client:"CA-005" },
  { id:"b08", lat:41.3849, lng:2.1523,  name:"C/ Muntaner 210",       city:"Barcelona", client:"CA-005" },
  { id:"b09", lat:41.4050, lng:2.1490,  name:"C/ Gran de Gràcia 15",  city:"Barcelona", client:"CA-006" },
  { id:"b10", lat:41.3630, lng:2.1320,  name:"C/ Paral·lel 88",       city:"Barcelona", client:"CA-006" },

  // ── Sevilla (5 puntos) ───────────────────────────────────────────────────────
  { id:"s01", lat:37.3921, lng:-5.9916, name:"C/ Sierpes 44",         city:"Sevilla",   client:"CA-003" },
  { id:"s02", lat:37.3886, lng:-5.9872, name:"C/ Feria 30",           city:"Sevilla",   client:"CA-003" },
  { id:"s03", lat:37.3776, lng:-5.9997, name:"C/ Betis 22",           city:"Sevilla",   client:"CA-004" },
  { id:"s04", lat:37.3852, lng:-5.9930, name:"C/ Alfonso XII 8",      city:"Sevilla",   client:"CA-004" },
  { id:"s05", lat:37.3940, lng:-5.9800, name:"Av. Menéndez Pelayo 10",city:"Sevilla",   client:"CA-005" },

  // ── Valencia (4 puntos) ──────────────────────────────────────────────────────
  { id:"v01", lat:39.4703, lng:-0.3773, name:"C/ Colón 22",           city:"Valencia",  client:"CA-004" },
  { id:"v02", lat:39.4742, lng:-0.3699, name:"C/ Ruzafa 12",          city:"Valencia",  client:"CA-004" },
  { id:"v03", lat:39.4810, lng:-0.3580, name:"C/ Blasco Ibáñez 55",   city:"Valencia",  client:"CA-005" },
  { id:"v04", lat:39.4660, lng:-0.3840, name:"C/ Quart 8",            city:"Valencia",  client:"CA-005" },

  // ── París (5 puntos) ─────────────────────────────────────────────────────────
  { id:"p01", lat:48.8566, lng:2.3522,  name:"Rue de Rivoli 40",      city:"París",     client:"CA-011" },
  { id:"p02", lat:48.8738, lng:2.3010,  name:"Rue Lepic 72",          city:"París",     client:"CA-011" },
  { id:"p03", lat:48.8503, lng:2.3508,  name:"Bd. Saint-Germain 120", city:"París",     client:"CA-012" },
  { id:"p04", lat:48.8630, lng:2.3380,  name:"Rue du Temple 88",      city:"París",     client:"CA-012" },
  { id:"p05", lat:48.8820, lng:2.3490,  name:"Av. de la Chapelle 5",  city:"París",     client:"CA-013" },

  // ── Londres (4 puntos) ───────────────────────────────────────────────────────
  { id:"l01", lat:51.5074, lng:-0.1278, name:"Oxford Street 180",     city:"Londres",   client:"CA-012" },
  { id:"l02", lat:51.5136, lng:-0.0952, name:"Shoreditch High St 45", city:"Londres",   client:"CA-012" },
  { id:"l03", lat:51.5245, lng:-0.0800, name:"Hackney Road 22",       city:"Londres",   client:"CA-013" },
  { id:"l04", lat:51.4950, lng:-0.1447, name:"King's Road 310",       city:"Londres",   client:"CA-013" },

  // ── Berlín (4 puntos) ────────────────────────────────────────────────────────
  { id:"be01", lat:52.5200, lng:13.4050, name:"Unter den Linden 55",  city:"Berlín",   client:"CA-013" },
  { id:"be02", lat:52.5020, lng:13.4250, name:"Bergmannstr. 28",      city:"Berlín",   client:"CA-013" },
  { id:"be03", lat:52.5150, lng:13.4350, name:"Friedrichstr. 100",    city:"Berlín",   client:"CA-014" },
  { id:"be04", lat:52.5310, lng:13.3880, name:"Torstr. 66",           city:"Berlín",   client:"CA-014" },

  // ── Roma (3 puntos) ──────────────────────────────────────────────────────────
  { id:"r01", lat:41.9028, lng:12.4964, name:"Via del Corso 210",     city:"Roma",     client:"CA-014" },
  { id:"r02", lat:41.8960, lng:12.4820, name:"Via Trastevere 88",     city:"Roma",     client:"CA-015" },
  { id:"r03", lat:41.9108, lng:12.4931, name:"Via Veneto 12",         city:"Roma",     client:"CA-015" },

  // ── Ámsterdam (3 puntos) ─────────────────────────────────────────────────────
  { id:"am01", lat:52.3702, lng:4.8952, name:"Keizersgracht 80",      city:"Ámsterdam",client:"CA-019" },
  { id:"am02", lat:52.3650, lng:4.8810, name:"Jordaan - Bloemgracht", city:"Ámsterdam",client:"CA-019" },
  { id:"am03", lat:52.3780, lng:4.9120, name:"De Pijp - Ceintuurbaan",city:"Ámsterdam",client:"CA-020" },
];

const MOCK_ACCOMMODATIONS = [
  // España
  { id:"a1",  lat:40.416, lng:-3.703,  name:"Residencia Central",   city:"Madrid",        client:"CA-001" },
  { id:"a2",  lat:41.385, lng:2.173,   name:"Piso Eixample",        city:"Barcelona",     client:"CA-002" },
  { id:"a3",  lat:37.389, lng:-5.984,  name:"Apartamento Triana",   city:"Sevilla",       client:"CA-003" },
  { id:"a4",  lat:39.470, lng:-0.376,  name:"Estudio Ruzafa",       city:"Valencia",      client:"CA-004" },
  { id:"a5",  lat:43.263, lng:-2.935,  name:"Piso Casco Viejo",     city:"Bilbao",        client:"CA-005" },
  { id:"a6",  lat:36.721, lng:-4.421,  name:"Apartamento Centro",   city:"Málaga",        client:"CA-006" },
  { id:"a7",  lat:43.372, lng:-8.416,  name:"Piso Zona Alta",       city:"A Coruña",      client:"CA-007" },
  { id:"a8",  lat:41.652, lng:-4.728,  name:"Residencia Norte",     city:"Valladolid",    client:"CA-008" },
  { id:"a9",  lat:37.984, lng:-1.128,  name:"Piso Universitario",   city:"Murcia",        client:"CA-009" },
  { id:"a10", lat:28.136, lng:-15.435, name:"Residencia Las Palmas", city:"Las Palmas",   client:"CA-010" },
  // Europa
  { id:"a11", lat:48.856, lng:2.352,   name:"Studio Marais",        city:"París",         client:"CA-011" },
  { id:"a12", lat:51.507, lng:-0.127,  name:"Flat Shoreditch",      city:"Londres",       client:"CA-012" },
  { id:"a13", lat:52.520, lng:13.405,  name:"WG Mitte",             city:"Berlín",        client:"CA-013" },
  { id:"a14", lat:41.902, lng:12.496,  name:"Appartamento Trastevere", city:"Roma",       client:"CA-014" },
  { id:"a15", lat:48.208, lng:16.373,  name:"Wohnung Innere Stadt", city:"Viena",         client:"CA-015" },
  { id:"a16", lat:50.075, lng:14.437,  name:"Byt Staré Město",      city:"Praga",         client:"CA-016" },
  { id:"a17", lat:45.464, lng:9.189,   name:"Appartamento Navigli", city:"Milán",         client:"CA-017" },
  { id:"a18", lat:53.349, lng:-6.260,  name:"Flat Temple Bar",      city:"Dublín",        client:"CA-018" },
  { id:"a19", lat:52.370, lng:4.895,   name:"Flat Jordaan",         city:"Ámsterdam",     client:"CA-019" },
  { id:"a20", lat:59.913, lng:10.752,  name:"Leilighet Grünerløkka",city:"Oslo",          client:"CA-020" },
  // América
  { id:"a21", lat:40.712, lng:-74.006, name:"Apt Lower East Side",  city:"Nueva York",    client:"CA-021" },
  { id:"a22", lat:34.052, lng:-118.243,name:"Studio Silver Lake",   city:"Los Ángeles",   client:"CA-022" },
  { id:"a23", lat:-23.550, lng:-46.633,name:"Apt Vila Madalena",    city:"São Paulo",     client:"CA-023" },
  { id:"a24", lat:19.432, lng:-99.133, name:"Depa Condesa",         city:"Ciudad de México", client:"CA-024" },
  { id:"a25", lat:-34.603, lng:-58.381,name:"Depto Palermo",        city:"Buenos Aires",  client:"CA-025" },
  { id:"a26", lat:43.653, lng:-79.383, name:"Condo Kensington",     city:"Toronto",       client:"CA-026" },
  // Asia & Oceanía
  { id:"a27", lat:35.689, lng:139.692, name:"Share House Shinjuku", city:"Tokio",         client:"CA-027" },
  { id:"a28", lat:22.319, lng:114.169, name:"Flat Kowloon",         city:"Hong Kong",     client:"CA-028" },
  { id:"a29", lat:1.352,  lng:103.820, name:"Condo Orchard",        city:"Singapur",      client:"CA-029" },
  { id:"a30", lat:-33.868, lng:151.207,name:"Flat Surry Hills",     city:"Sídney",        client:"CA-030" },
  // África & Oriente Medio
  { id:"a31", lat:30.044, lng:31.235,  name:"Apt Zamalek",          city:"El Cairo",      client:"CA-031" },
  { id:"a32", lat:25.204, lng:55.270,  name:"Studio Downtown",      city:"Dubái",         client:"CA-032" },
  { id:"a33", lat:-26.204, lng:28.047, name:"Flat Sandton",         city:"Johannesburgo", client:"CA-033" },
];

// Conexiones activas (< 7 días)
const MOCK_ACTIVE_CONNECTIONS = [
  { id:"c1", lat:40.416, lng:-3.703,   city:"Madrid",       client:"CA-001", daysAgo:0 },
  { id:"c2", lat:41.385, lng:2.173,    city:"Barcelona",    client:"CA-002", daysAgo:1 },
  { id:"c3", lat:48.856, lng:2.352,    city:"París",        client:"CA-011", daysAgo:1 },
  { id:"c4", lat:51.507, lng:-0.127,   city:"Londres",      client:"CA-012", daysAgo:2 },
  { id:"c5", lat:40.712, lng:-74.006,  city:"Nueva York",   client:"CA-021", daysAgo:2 },
  { id:"c6", lat:35.689, lng:139.692,  city:"Tokio",        client:"CA-027", daysAgo:3 },
  { id:"c7", lat:25.204, lng:55.270,   city:"Dubái",        client:"CA-032", daysAgo:4 },
  { id:"c8", lat:1.352,  lng:103.820,  city:"Singapur",     client:"CA-029", daysAgo:5 },
];

// Conexiones recientes (7-30 días)
const MOCK_RECENT_CONNECTIONS = [
  { id:"r1", lat:52.520,  lng:13.405,  city:"Berlín",       client:"CA-013", daysAgo:8  },
  { id:"r2", lat:48.208,  lng:16.373,  city:"Viena",        client:"CA-015", daysAgo:10 },
  { id:"r3", lat:34.052,  lng:-118.243,city:"Los Ángeles",  client:"CA-022", daysAgo:12 },
  { id:"r4", lat:-23.550, lng:-46.633, city:"São Paulo",    client:"CA-023", daysAgo:15 },
  { id:"r5", lat:43.653,  lng:-79.383, city:"Toronto",      client:"CA-026", daysAgo:18 },
  { id:"r6", lat:22.319,  lng:114.169, city:"Hong Kong",    client:"CA-028", daysAgo:20 },
  { id:"r7", lat:-33.868, lng:151.207, city:"Sídney",       client:"CA-030", daysAgo:22 },
  { id:"r8", lat:30.044,  lng:31.235,  city:"El Cairo",     client:"CA-031", daysAgo:25 },
  { id:"r9", lat:-26.204, lng:28.047,  city:"Johannesburgo",client:"CA-033", daysAgo:28 },
  { id:"r10",lat:19.432,  lng:-99.133, city:"Ciudad de México", client:"CA-024", daysAgo:30 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Ayer" : `${days}d`;
}


// ─── Divider ──────────────────────────────────────────────────────────────────
function HR() {
  return <div style={{ height: 1, background: C.divider, margin: "28px 0" }} />;
}

// ─── Etiqueta de sección ──────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, color: C.light,
      letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

// ─── KPI Card enmarcada (igual estilo que DashboardAdmin) ────────────────────
function KpiCard({ label, value, sub, color = C.text, loading }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff",
        border: `1px solid ${hov ? "rgba(11,46,109,0.18)" : "rgba(11,46,109,0.08)"}`,
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex", flexDirection: "column", gap: 4,
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hov ? "0 6px 18px rgba(11,46,109,0.09)" : "0 1px 4px rgba(11,46,109,0.04)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
        cursor: "default", overflow: "hidden", minWidth: 0,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {label}
      </span>
      <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1.1, color: loading ? C.light : color, fontVariantNumeric: "tabular-nums" }}>
        {loading ? "—" : value}
      </span>
      {sub && (
        <span style={{ fontSize: 11, color: C.muted }}>
          {loading ? "…" : sub}
        </span>
      )}
    </div>
  );
}

// ─── Item de actividad (igual que admin) ──────────────────────────────────────
function ActivityItem({ item, isLast }) {
  const color  = ACT_COLORS[item.action]  || C.muted;
  const label  = ACT_LABEL[item.action]   || item.action;
  const entity = ENT_LABEL[item.entity_type] || item.entity_type;
  const v      = item.new_values || item.old_values || {};
  const name   = v.full_name || v.name || v.legal_name || "";
  return (
    <div style={{ display:"flex", gap:12, paddingBottom: isLast ? 0 : 14 }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:color, marginTop:3 }} />
        {!isLast && <div style={{ width:1, flex:1, background:C.divider, marginTop:4 }} />}
      </div>
      <div style={{ flex:1, minWidth:0, paddingBottom: isLast ? 0 : 4, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ fontSize:12, color:C.text, lineHeight:1.4, flex:1, minWidth:0 }}>
          <span style={{ fontWeight:700, color }}>{label}</span>
          {" "}{entity}{name ? `: ${name}` : ""}
        </div>
        <div style={{ fontSize:10, color:C.muted, whiteSpace:"nowrap", flexShrink:0 }}>
          {item.actor_role || "Sistema"} · {timeAgo(item.created_at)}
        </div>
      </div>
    </div>
  );
}

// ─── Leyenda del globe ────────────────────────────────────────────────────────
function GlobeLegend({ accCount, activeCount, recentCount }) {
  const items = [
    { color: "#E8C547",  label: "Alojamientos",         count: accCount  },
    { color: "#6BCB8B",  label: "Conexiones activas",    count: activeCount },
    { color: "#E87C7C",  label: "Conexiones recientes",  count: recentCount },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:16 }}>
      {items.map(({ color, label, count }) => (
        <div key={label} style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
          }} />
          <span style={{ fontSize:12, color:C.muted, flex:1 }}>{label}</span>
          <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut SVG ────────────────────────────────────────────────────────────────
function DonutChart({ value, size=110, stroke=10, color=C.navy }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(Math.max(value / 100, 0), 1);
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)", display:"block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(11,46,109,0.08)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${pct*circ} ${(1-pct)*circ}`}
        style={{ transition:"stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}

function MultiDonut({ segments, size=110, stroke=10 }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let cum = 0;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)", display:"block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(11,46,109,0.08)" strokeWidth={stroke} />
      {total > 0 && segments.filter(s => s.value > 0).map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const off  = cum;
        cum += dash;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={seg.color} strokeWidth={stroke} strokeLinecap="butt"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-off}
            style={{ transition:"stroke-dasharray 0.5s ease" }} />
        );
      })}
    </svg>
  );
}

// =============================================================================
// MAIN
// =============================================================================
// ─── Panel de Actividad Reciente con toggle colapso ──────────────────────────
function ActividadRecientePanel({ activity, loading }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{
      background:"#fff",
      border:"1px solid rgba(11,46,109,0.08)",
      borderRadius:12,
      padding:"16px 18px",
      boxShadow:"0 1px 4px rgba(11,46,109,0.04)",
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: collapsed ? 0 : 14 }}>
        <span style={{ fontSize:10, fontWeight:800, color:C.light, letterSpacing:"0.14em", textTransform:"uppercase" }}>
          Actividad reciente
        </span>
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Desplegar" : "Plegar"}
          style={{
            background:"none", border:"none", cursor:"pointer",
            color:C.muted, fontSize:20, lineHeight:1,
            padding:"2px 4px", borderRadius:4,
            transition:"transform 0.2s",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </button>
      </div>
      {!collapsed && (
        loading ? (
          <div style={{ color:C.muted, fontSize:13 }}>Cargando...</div>
        ) : activity.length === 0 ? (
          <div style={{ color:C.muted, fontSize:13 }}>Sin actividad reciente</div>
        ) : (
          activity.map((item, i) => (
            <ActivityItem key={item.id} item={item} isLast={i === activity.length - 1} />
          ))
        )
      )}
    </div>
  );
}

export default function DashboardSuperadmin() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    totalAccounts:0, activeAccounts:0, suspendedAccounts:0, cancelledAccounts:0,
    totalEntities:0, totalAccommodations:0, totalRooms:0, occupiedRooms:0, freeRooms:0,
    totalLodgers:0, activeLodgers:0,
  });
  const [planDistribution, setPlanDistribution] = useState([]);
  const [recentAccounts,   setRecentAccounts]   = useState([]);
  const [activity,         setActivity]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [lastUpdated,      setLastUpdated]       = useState(null);

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [
        { data: accounts },
        { data: entities },
        { data: accommodations },
        { data: rooms },
        { data: activeAssignments },
        { data: lodgers },
        { data: auditLog },
      ] = await Promise.all([
        supabase.from("client_accounts").select("id,name,last_name1,last_name2,slug,plan_code,billing_cycle,status,start_date,created_at,contact_email").order("created_at", { ascending:false }),
        supabase.from("entities").select("id,client_account_id,type,status"),
        supabase.from("accommodations").select("id,status"),
        supabase.from("rooms").select("id,is_maintenance"),
        supabase.from("lodger_room_assignments").select("room_id,move_out_date").or(`move_out_date.is.null,move_out_date.gt.${today}`),
        supabase.from("profiles").select("id,onboarding_status").eq("role","lodger"),
        supabase.from("audit_log").select("id,entity_type,action,actor_role,new_values,created_at").order("created_at",{ascending:false}).limit(10),
      ]);

      const allAccounts = (accounts || []).map(a => ({
        ...a,
        ownerFullName: [a.name, a.last_name1, a.last_name2].filter(Boolean).join(" ") || a.name,
      }));
      const allRooms   = rooms   || [];
      const allLodgers = lodgers || [];

      const assignByRoom = {};
      (activeAssignments || []).forEach(a => { assignByRoom[a.room_id] = a; });
      let freeRooms = 0, occupiedRooms = 0;
      allRooms.forEach(r => {
        if (r.is_maintenance) return;
        const asgn = assignByRoom[r.id];
        if (!asgn) freeRooms++;
        else if (!asgn.move_out_date) occupiedRooms++;
      });

      const activeAccounts    = allAccounts.filter(a => a.status === "active").length;
      const suspendedAccounts = allAccounts.filter(a => a.status === "suspended").length;
      const cancelledAccounts = allAccounts.filter(a => a.status === "cancelled").length;

      setStats({
        totalAccounts: allAccounts.length, activeAccounts, suspendedAccounts, cancelledAccounts,
        totalEntities: (entities || []).length,
        totalAccommodations: (accommodations || []).length,
        totalRooms: allRooms.length, occupiedRooms, freeRooms,
        totalLodgers: allLodgers.length,
        activeLodgers: allLodgers.filter(l => l.onboarding_status === "active").length,
      });

      const byAccountId = (entities || []).reduce((acc, e) => {
        if (e.client_account_id) acc[e.client_account_id] = (acc[e.client_account_id] || 0) + 1;
        return acc;
      }, {});

      const planCodes = ["basic","investor","business","agency"];
      setPlanDistribution(planCodes.map(plan => {
        const count = allAccounts.filter(a => a.plan_code === plan).length;
        return { plan, count, percentage: allAccounts.length > 0 ? Math.round((count / allAccounts.length) * 100) : 0 };
      }));

      setRecentAccounts(allAccounts.slice(0, 5).map(a => ({ ...a, __entities: byAccountId[a.id] || 0 })));
      setActivity(auditLog || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[DashboardSuperadmin]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Métricas derivadas ───────────────────────────────────────────────────────
  const occupancyRate  = stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0;
  const occupancyColor = occupancyRate > 80 ? "#059669" : occupancyRate > 50 ? "#D97706" : "#DC2626";
  const activeRate     = stats.totalAccounts > 0 ? Math.round((stats.activeAccounts / stats.totalAccounts) * 100) : 0;

  // ── Puntos para el GlobeMap (3 capas + 50 puntos Madrid) ────────────────────
  const globePoints = [
    ...MADRID_POINTS.map(p => ({ ...p, _type:"accommodation" })),
    ...MOCK_ACCOMMODATIONS.map(p => ({ ...p, _type:"accommodation" })),
    ...MOCK_ACTIVE_CONNECTIONS.map(p => ({ ...p, _type:"active" })),
    ...MOCK_RECENT_CONNECTIONS.map(p => ({ ...p, _type:"recent" })),
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  // V2Layout usa padding: 14px 20px → no necesitamos margin negativo
  return (
    <V2Layout role="superadmin" userName="Javier">
      <div style={{ background:C.bg, minHeight:"100%", paddingBottom:40, boxSizing:"border-box" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>

          {/* ══════════════════════════════════════════════
              HEADER
          ══════════════════════════════════════════════ */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, marginBottom:22, flexWrap:"wrap" }}>
            <div>
              <h1 style={{ fontSize:28, fontWeight:900, color:C.text, margin:0, letterSpacing:"-0.5px" }}>
                Control Center
              </h1>
              <p style={{ fontSize:13, color:C.muted, margin:"4px 0 0" }}>
                {lastUpdated ? `Actualizado hace ${timeAgo(lastUpdated.toISOString())}` : "Cargando datos..."}
              </p>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {/* Quick nav pills */}
              {[
                { label:"Cuentas",    path:"/v2/superadmin/cuentas" },
                { label:"Planes",     path:"/v2/superadmin/planes" },
                { label:"Servicios",  path:"/v2/superadmin/servicios" },
              ].map(({ label, path }) => (
                <button key={label} onClick={() => navigate(path)} style={{
                  padding:"6px 14px", border:`1px solid rgba(11,46,109,0.2)`, borderRadius:20,
                  background:"#fff", color:C.navy, fontSize:12, fontWeight:500,
                  cursor:"pointer", whiteSpace:"nowrap",
                }}>
                  {label}
                </button>
              ))}
              <button onClick={load} style={{
                width:36, height:36, border:`1px solid rgba(11,46,109,0.15)`,
                borderRadius:8, background:"#fff", color:C.navy, fontSize:18, cursor:"pointer",
              }} title="Actualizar">↻</button>
              <button onClick={() => navigate("/v2/superadmin/cuentas/nueva")} style={{
                height:36, padding:"0 18px", background:C.navy, color:"#fff",
                border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer",
              }}>
                + Nueva cuenta
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════
              HERO: GLOBE (izq) + KPIs (der)
          ══════════════════════════════════════════════ */}
          <div style={{
            display:"grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "55% 45%",
            gap: 28,
            alignItems:"start",
            marginBottom: 28,
          }}>

            {/* ── Globe ─────────────────────────────────────────────────── */}
            <div style={{ position:"relative", minWidth:0 }}>

              {/* Contenedor del mapa — fondo blanco */}
              <div style={{
                borderRadius:14, overflow:"hidden",
                height: isMobile ? 220 : 280,
                position:"relative",
                background:"#fff",
                border:"1px solid rgba(0,0,0,0.08)",
                boxShadow:"0 1px 8px rgba(0,0,0,0.06)",
              }}>
                {/* Título flotante */}
                <div style={{
                  position:"absolute", top:10, left:12, zIndex:10,
                  background:"rgba(255,255,255,0.9)", backdropFilter:"blur(8px)",
                  borderRadius:7, padding:"5px 11px",
                  border:"1px solid rgba(0,0,0,0.06)",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
                  pointerEvents:"none",
                }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"#8A9BB8", letterSpacing:"0.12em", textTransform:"uppercase" }}>
                    Mapa global
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#1A2438", marginTop:1 }}>
                    Alojamientos &amp; Conexiones
                  </div>
                </div>

                <Suspense fallback={
                  <div style={{ background:"#f8f9fb", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#8A9BB8", fontSize:13 }}>
                    Cargando mapa...
                  </div>
                }>
                  <GlobeMap
                    height={isMobile ? 220 : 280}
                    points={globePoints}
                    onPointClick={(point) => {
                      if (point._type === "accommodation") navigate("/v2/superadmin/cuentas");
                    }}
                  />
                </Suspense>
              </div>

              {/* Leyenda compacta */}
              <div style={{
                background:"#fff", borderRadius:10, padding:"12px 16px", marginTop:8,
                border:"1px solid rgba(0,0,0,0.08)",
                display:"flex", gap:20, flexWrap:"wrap", alignItems:"center",
              }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#8A9BB8", letterSpacing:"0.12em", textTransform:"uppercase", flexShrink:0 }}>
                  Leyenda
                </div>
                {[
                  { color:"#E8C547", label:"Alojamientos",        count:MOCK_ACCOMMODATIONS.length },
                  { color:"#6BCB8B", label:"Conexiones activas",   count:MOCK_ACTIVE_CONNECTIONS.length },
                  { color:"#E87C7C", label:"Conexiones recientes", count:MOCK_RECENT_CONNECTIONS.length },
                ].map(({ color, label, count }) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
                    <div style={{ width:9, height:9, borderRadius:"50%", background:color, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:"#6B7280" }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#1A2438" }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── KPIs (derecha) — tarjetas enmarcadas ──────────────────── */}
            <div style={{ display:"flex", flexDirection:"column", gap:12, paddingTop:4 }}>

              {/* Fila 1: Cuentas + Tasa activas */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <KpiCard
                  label="Cuentas"
                  value={stats.totalAccounts}
                  sub={`${stats.activeAccounts} activas`}
                  color={C.navy}
                  loading={loading}
                />
                <KpiCard
                  label="Tasa activas"
                  value={`${activeRate}%`}
                  sub={`${stats.suspendedAccounts} suspendidas`}
                  color="#059669"
                  loading={loading}
                />
              </div>

              {/* Fila 2: Alojamientos + Ocupación */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <KpiCard
                  label="Alojamientos"
                  value={stats.totalAccommodations}
                  sub={`${stats.totalEntities} entidades`}
                  color={C.blue}
                  loading={loading}
                />
                <KpiCard
                  label="Ocupación"
                  value={`${occupancyRate}%`}
                  sub={`${stats.occupiedRooms} de ${stats.totalRooms} hab.`}
                  color={occupancyColor}
                  loading={loading}
                />
              </div>

              {/* Fila 3: Habitaciones + Inquilinos */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <KpiCard
                  label="Hab. libres"
                  value={stats.freeRooms}
                  sub={`${stats.totalRooms} totales`}
                  color={C.green}
                  loading={loading}
                />
                <KpiCard
                  label="Inquilinos"
                  value={stats.activeLodgers}
                  sub="activos"
                  color={C.blue}
                  loading={loading}
                />
              </div>

            </div>
          </div>

          {/* ══════════════════════════════════════════════
              SECCIÓN INFERIOR: 3 columnas enmarcadas
              Últimas cuentas | Por plan | Actividad reciente
          ══════════════════════════════════════════════ */}
          <div style={{
            height:1, background:C.divider, margin:"24px 0 28px",
          }} />

          <div style={{
            display:"grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "55% 45%",
            gap: 28,
            alignItems:"start",
          }}>

            {/* ── Col 1: Últimas cuentas cliente ───────────────────────── */}
            <div style={{
              background:"#fff",
              border:"1px solid rgba(11,46,109,0.08)",
              borderRadius:12,
              padding:"16px 18px",
              boxShadow:"0 1px 4px rgba(11,46,109,0.04)",
              minWidth:0,
            }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <span style={{ fontSize:10, fontWeight:800, color:C.light, letterSpacing:"0.14em", textTransform:"uppercase" }}>
                  Últimas cuentas cliente
                </span>
                <button onClick={() => navigate("/v2/superadmin/cuentas")} style={{
                  fontSize:11, color:C.blue, background:"none", border:"none",
                  cursor:"pointer", fontWeight:600, whiteSpace:"nowrap",
                }}>
                  Ver todas →
                </button>
              </div>

              {/* Cabecera tabla */}
              <div style={{
                display:"grid", gridTemplateColumns:"1fr 72px 68px 52px 52px",
                padding:"0 0 8px", borderBottom:`1px solid ${C.divider}`,
              }}>
                {["Cuenta","Plan","Estado","Entid.","Alta"].map(h => (
                  <div key={h} style={{ fontSize:10, fontWeight:700, color:C.light, letterSpacing:"0.1em", textTransform:"uppercase" }}>{h}</div>
                ))}
              </div>

              {/* Filas */}
              {loading ? (
                <div style={{ color:C.muted, fontSize:13, padding:"16px 0" }}>Cargando...</div>
              ) : recentAccounts.map(acc => (
                <div key={acc.id}
                  onClick={() => navigate(`/v2/superadmin/cuentas/${acc.id}`)}
                  style={{
                    display:"grid", gridTemplateColumns:"1fr 72px 68px 52px 52px",
                    padding:"10px 4px", borderBottom:`1px solid ${C.divider}`,
                    cursor:"pointer", borderRadius:6, marginLeft:-4, marginRight:-4,
                    transition:"background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background="#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}
                >
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{acc.ownerFullName || acc.name}</div>
                    <div style={{ fontSize:10, color:C.muted }}>{acc.slug}</div>
                  </div>
                  <div>
                    <span style={{ fontSize:10, fontWeight:600, color:"#fff", background:getPlanColor(acc.plan_code), borderRadius:4, padding:"2px 6px" }}>
                      {getPlanLabel(acc.plan_code)}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize:11, fontWeight:600, color:getStatusColor(acc.status) }}>
                      {getStatusLabel(acc.status)}
                    </span>
                  </div>
                  <div style={{ fontSize:12, color:C.text }}>{acc.__entities}</div>
                  <div style={{ fontSize:11, color:C.muted }}>
                    {acc.start_date ? new Date(acc.start_date).toLocaleDateString("es-ES",{day:"2-digit",month:"short"}) : "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Col 2: Por plan + Actividad (45%) ───────────────────── */}
            <div style={{ display:"flex", flexDirection:"column", gap:16, minWidth:0 }}>

            {/* Por plan */}
            <div style={{
              background:"#fff",
              border:"1px solid rgba(11,46,109,0.08)",
              borderRadius:12,
              padding:"16px 18px",
              boxShadow:"0 1px 4px rgba(11,46,109,0.04)",
            }}>
              <span style={{ fontSize:10, fontWeight:800, color:C.light, letterSpacing:"0.14em", textTransform:"uppercase", display:"block", marginBottom:14 }}>
                Por plan
              </span>

              {/* Barra apilada */}
              <div style={{
                height:8, borderRadius:4, overflow:"hidden",
                display:"flex", background:"#F1F5F9", marginBottom:16,
              }}>
                {planDistribution.filter(d => d.count > 0).map(({ plan, percentage }) => (
                  <div key={plan} title={`${getPlanLabel(plan)}: ${percentage}%`} style={{
                    width:`${percentage}%`, height:"100%",
                    background:getPlanColor(plan), transition:"width 0.5s ease",
                    minWidth: percentage > 0 ? 4 : 0,
                  }} />
                ))}
              </div>

              {/* Lista planes */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {planDistribution.map(({ plan, count, percentage }) => (
                  <div key={plan} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:getPlanColor(plan), flexShrink:0 }} />
                    <span style={{ fontSize:12, color:"#334155", flex:1 }}>{getPlanLabel(plan)}</span>
                    <span style={{ fontSize:11, color:C.muted }}>{count}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#334155", minWidth:34, textAlign:"right" }}>{percentage}%</span>
                  </div>
                ))}
              </div>

              {/* Recap entidades / alojamientos */}
              <div style={{
                display:"flex", gap:0, marginTop:20,
                borderTop:`1px solid ${C.divider}`, paddingTop:16,
              }}>
                <div style={{ flex:1, textAlign:"center" }}>
                  <div style={{ fontSize:20, fontWeight:900, color:C.text }}>{stats.totalEntities}</div>
                  <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Entidades</div>
                </div>
                <div style={{ width:1, background:C.divider }} />
                <div style={{ flex:1, textAlign:"center" }}>
                  <div style={{ fontSize:20, fontWeight:900, color:C.text }}>{stats.totalAccommodations}</div>
                  <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Alojamientos</div>
                </div>
              </div>
            </div>

            {/* Actividad reciente */}
            <ActividadRecientePanel activity={activity} loading={loading} />

            </div>{/* ── fin col 2 wrapper ── */}

          </div>

        </div>
      </div>
    </V2Layout>
  );
}
