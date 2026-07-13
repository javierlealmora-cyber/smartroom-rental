// =============================================================================
// src/pages/v2/superadmin/ClientAccountsList.jsx
// Lista de cuentas cliente — estilo Control Center estándar
// =============================================================================

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Select, message, Pagination, Tooltip } from "antd";
import { PlusOutlined, ReloadOutlined, EyeOutlined, TeamOutlined, CloseOutlined, CaretUpOutlined, CaretDownOutlined } from "@ant-design/icons";
import V2Layout from "../../../layouts/V2Layout";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../services/supabaseClient";

// ─── Paleta estándar Control Center ──────────────────────────────────────────
const C = {
  text:    "#1A2438",
  muted:   "#8A9BB8",
  light:   "#C0CCD8",
  divider: "rgba(0,0,0,0.07)",
  navy:    "#0B2E6D",
  blue:    "#3B82F6",
  green:   "#059669",
  red:     "#DC2626",
  orange:  "#D97706",
};

const PLAN_COLORS  = { basic:"#64748B", starter:"#64748B", investor:"#2563EB", pro:"#7C3AED", business:"#7C3AED", agency:"#D97706", enterprise:"#D97706" };
const PLAN_LABELS  = { basic:"Basic", starter:"Starter", investor:"Investor", pro:"Pro", business:"Business", agency:"Agency", enterprise:"Enterprise" };
const STATUS_COLOR = { active:"#059669", suspended:"#D97706", cancelled:"#DC2626", pending:"#2563EB", trial:"#2563EB" };
const STATUS_LABEL = { active:"Activa", suspended:"Suspendida", cancelled:"Cancelada", pending:"Pendiente", trial:"Prueba" };

const getPlanColor   = (p) => PLAN_COLORS[p]  || "#64748B";
const getPlanLabel   = (p) => PLAN_LABELS[p]  || p || "—";
const getStatusColor = (s) => STATUS_COLOR[s] || "#64748B";
const getStatusLabel = (s) => STATUS_LABEL[s] || s || "—";

const PAGE_SIZE = 15;

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

// ─── Cabecera de columna ordenable ───────────────────────────────────────────
function SortableHeader({ label, colKey, sortKey, sortDir, onSort, style = {} }) {
  const active = sortKey === colKey;
  return (
    <div
      onClick={() => onSort(colKey)}
      style={{ fontSize: 10, fontWeight: 700, color: active ? C.navy : C.light, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 3, ...style }}
    >
      {label}
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 0.6, fontSize: 8, color: active ? C.navy : C.light }}>
        <CaretUpOutlined  style={{ opacity: active && sortDir === "asc"  ? 1 : 0.35 }} />
        <CaretDownOutlined style={{ opacity: active && sortDir === "desc" ? 1 : 0.35 }} />
      </span>
    </div>
  );
}

// ─── Barra de ocupación ───────────────────────────────────────────────────────
function OccupancyBar({ pct }) {
  if (pct === null || pct === undefined) return <span style={{ color: C.light, fontSize: 12 }}>—</span>;
  const color = pct >= 90 ? C.red : pct >= 70 ? C.orange : C.green;
  return (
    <Tooltip title={`${pct}% ocupación`}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 44, height: 5, borderRadius: 3, background: "#E5E7EB", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color }}>{pct}%</span>
      </div>
    </Tooltip>
  );
}

export default function ClientAccountsList() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [accounts,     setAccounts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlan,   setFilterPlan]   = useState("");
  const [sortKey,      setSortKey]      = useState("created_at");
  const [sortDir,      setSortDir]      = useState("desc");
  const [page,         setPage]         = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      // Carga base de cuentas
      const { data, error } = await supabase
        .from("client_accounts")
        .select(`
          id, name, last_name1, last_name2, status, plan_code, slug,
          start_date, created_at, contact_email,
          entities(id, type, legal_type, legal_name, first_name, last_name1, last_name2)
        `)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      const base = data ?? [];
      const accountIds = base.map((a) => a.id);

      // Alojamientos de todas las cuentas
      const { data: accomData } = await supabase
        .from("accommodations")
        .select("id, client_account_id")
        .in("client_account_id", accountIds);

      // Mapa account_id → [accommodation_id]
      const accToAccoms = {};
      (accomData ?? []).forEach((a) => {
        if (!accToAccoms[a.client_account_id]) accToAccoms[a.client_account_id] = [];
        accToAccoms[a.client_account_id].push(a.id);
      });

      const allAccomIds = (accomData ?? []).map((a) => a.id);

      // Habitaciones de todos los alojamientos
      let allRooms = [];
      if (allAccomIds.length) {
        const { data: rd } = await supabase
          .from("rooms")
          .select("id, accommodation_id")
          .in("accommodation_id", allAccomIds);
        allRooms = rd ?? [];
      }

      // Mapa room_id → accommodation_id y accommodation_id → account_id
      const roomToAccom = {};
      allRooms.forEach((r) => { roomToAccom[r.id] = r.accommodation_id; });
      const accomToAccount = {};
      (accomData ?? []).forEach((a) => { accomToAccount[a.id] = a.client_account_id; });

      // Conteo habitaciones por cuenta
      const roomsByAccount = {};
      allRooms.forEach((r) => {
        const accId = accomToAccount[r.accommodation_id];
        if (accId) roomsByAccount[accId] = (roomsByAccount[accId] || 0) + 1;
      });

      // Asignaciones activas
      let activeAssignments = [];
      const allRoomIds = allRooms.map((r) => r.id);
      if (allRoomIds.length) {
        const { data: ad } = await supabase
          .from("lodger_room_assignments")
          .select("room_id")
          .in("room_id", allRoomIds)
          .is("move_out_date", null);
        activeAssignments = ad ?? [];
      }

      // Conteo inquilinos (asignaciones activas) por cuenta
      const tenantsByAccount = {};
      activeAssignments.forEach((a) => {
        const accomId  = roomToAccom[a.room_id];
        const accId    = accomToAccount[accomId];
        if (accId) tenantsByAccount[accId] = (tenantsByAccount[accId] || 0) + 1;
      });

      const enriched = base.map((acc) => {
        const ownerFullName = [acc.name, acc.last_name1, acc.last_name2].filter(Boolean).join(" ") || acc.name;
        const payer = (acc.entities ?? []).find((e) => e.type === "payer");
        let payerName = null;
        if (payer) {
          const isPhysical = ["persona_fisica", "autonomo"].includes(payer.legal_type);
          if (isPhysical) {
            const full = [payer.first_name, payer.last_name1, payer.last_name2].filter(Boolean).join(" ");
            if (full && full !== ownerFullName) payerName = full;
          } else if (payer.legal_name && payer.legal_name !== ownerFullName) {
            payerName = payer.legal_name;
          }
        }
        const entityCount    = (acc.entities ?? []).filter(e => e.type === "owner").length;
        const accomCount     = (accToAccoms[acc.id] ?? []).length;
        const roomCount      = roomsByAccount[acc.id]   ?? 0;
        const tenantCount    = tenantsByAccount[acc.id] ?? 0;
        const occupancyPct   = roomCount > 0 ? Math.round((tenantCount / roomCount) * 100) : null;
        const startDate      = acc.start_date || acc.created_at;
        return { ...acc, ownerFullName, payerName, entityCount, accomCount, roomCount, tenantCount, occupancyPct, startDate };
      });

      setAccounts(enriched);
    } catch (e) {
      message.error("Error cargando cuentas: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtrado ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return accounts.filter((a) => {
      const matchSearch = !search ||
        a.ownerFullName?.toLowerCase().includes(q) ||
        a.slug?.toLowerCase().includes(q) ||
        a.contact_email?.toLowerCase().includes(q);
      const matchStatus = !filterStatus || a.status === filterStatus;
      const matchPlan   = !filterPlan   || a.plan_code === filterPlan;
      return matchSearch && matchStatus && matchPlan;
    });
  }, [accounts, search, filterStatus, filterPlan]);

  // ── Ordenación ───────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey] ?? (typeof a[sortKey] === "number" ? -1 : "");
      const vb = b[sortKey] ?? (typeof b[sortKey] === "number" ? -1 : "");
      if (typeof va === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  // ── Paginación ───────────────────────────────────────────────────────────────
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const handleSort = (col) => {
    if (sortKey === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir("asc"); }
    setPage(1);
  };

  const hasFilters = search || filterStatus || filterPlan;
  const clearFilters = () => { setSearch(""); setFilterStatus(""); setFilterPlan(""); setPage(1); };

  // KPIs
  const kpis = {
    total:     accounts.length,
    active:    accounts.filter(a => a.status === "active").length,
    suspended: accounts.filter(a => a.status === "suspended").length,
    cancelled: accounts.filter(a => a.status === "cancelled").length,
  };

  const userName = profile?.full_name || user?.email || "Superadmin";

  // Columnas
  const COLS = [
    { key: "ownerFullName", label: "Cuenta cliente", flex: "1 1 180px" },
    { key: "plan_code",     label: "Plan",            flex: "0 0 90px"  },
    { key: "status",        label: "Estado",          flex: "0 0 90px"  },
    { key: "accomCount",    label: "Aloj.",           flex: "0 0 56px"  },
    { key: "roomCount",     label: "Hab.",            flex: "0 0 52px"  },
    { key: "tenantCount",   label: "Inq.",            flex: "0 0 52px"  },
    { key: "occupancyPct",  label: "Ocup.",           flex: "0 0 90px"  },
    { key: "startDate",     label: "Alta",            flex: "0 0 76px"  },
    { key: "_action",       label: "Acción",          flex: "0 0 70px"  },
  ];

  return (
    <V2Layout role="superadmin" userName={userName}>
      <div style={{ background: "#fff", minHeight: "100%", paddingBottom: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 4px" }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: 0, letterSpacing: "-0.4px", display: "flex", alignItems: "center", gap: 10 }}>
              <TeamOutlined style={{ fontSize: 22, color: "#2563EB" }} />
              Cuentas Cliente
            </h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
              {loading ? "Cargando..." : `${filtered.length} de ${accounts.length} cuentas`}
            </p>
          </div>

          {/* ── KPIs ─────────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
            <KpiPill value={kpis.total}     label="TOTAL"       bg="#F3F4F6" color="#374151" />
            <KpiPill value={kpis.active}    label="ACTIVAS"     bg="#F0FDF4" color="#16A34A" />
            <KpiPill value={kpis.suspended} label="SUSPENDIDAS" bg="#FFFBEB" color="#D97706" />
            <KpiPill value={kpis.cancelled} label="CANCELADAS"  bg="#FEF2F2" color="#DC2626" />
          </div>

          {/* ── Filtros + Acciones ───────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Input.Search
              placeholder="Buscar por nombre, slug o email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ maxWidth: 340 }}
              allowClear
            />
            <Select
              placeholder="Estado"
              value={filterStatus || undefined}
              onChange={(v) => { setFilterStatus(v ?? ""); setPage(1); }}
              allowClear
              style={{ width: 160 }}
              options={[
                { value: "active",    label: "Activa" },
                { value: "suspended", label: "Suspendida" },
                { value: "cancelled", label: "Cancelada" },
                { value: "pending",   label: "Pendiente" },
                { value: "trial",     label: "Prueba" },
              ]}
            />
            <Select
              placeholder="Plan"
              value={filterPlan || undefined}
              onChange={(v) => { setFilterPlan(v ?? ""); setPage(1); }}
              allowClear
              style={{ width: 150 }}
              options={Object.entries(PLAN_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
            {hasFilters && (
              <Button icon={<CloseOutlined />} onClick={clearFilters} size="middle">
                Limpiar
              </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Actualizar
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/v2/superadmin/cuentas/nueva")}
              style={{ background: C.navy, borderColor: C.navy }}
            >
              Nueva cuenta
            </Button>
          </div>

          {/* ── Tabla ────────────────────────────────────────────────────── */}
          <div style={{
            background: "#fff",
            border: "1px solid rgba(11,46,109,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(11,46,109,0.04)",
          }}>
            {/* Cabecera */}
            <div style={{ display: "flex", padding: "10px 18px", borderBottom: `1px solid ${C.divider}`, background: "#F8FAFC", gap: 8 }}>
              {COLS.map((col) => (
                <div key={col.key} style={{ flex: col.flex, minWidth: 0 }}>
                  {col.key === "_action" ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: "0.1em" }}>Acción</span>
                  ) : (
                    <SortableHeader label={col.label} colKey={col.key} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  )}
                </div>
              ))}
            </div>

            {/* Filas */}
            {loading ? (
              <div style={{ padding: "32px 18px", color: C.muted, fontSize: 13, textAlign: "center" }}>Cargando cuentas...</div>
            ) : paginated.length === 0 ? (
              <div style={{ padding: "32px 18px", color: C.muted, fontSize: 13, textAlign: "center" }}>Sin resultados</div>
            ) : paginated.map((acc, i) => (
              <div
                key={acc.id}
                style={{
                  display: "flex", gap: 8,
                  padding: "12px 18px",
                  borderBottom: i < paginated.length - 1 ? `1px solid ${C.divider}` : "none",
                  alignItems: "center",
                  transition: "background 0.1s",
                  cursor: "pointer",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                onClick={() => navigate(`/v2/superadmin/cuentas/${acc.id}`)}
              >
                {/* Nombre */}
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {acc.ownerFullName}
                  </div>
                  {acc.payerName && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {acc.payerName}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: C.light }}>{acc.slug}</div>
                </div>
                {/* Plan */}
                <div style={{ flex: "0 0 90px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: getPlanColor(acc.plan_code), borderRadius: 5, padding: "2px 8px" }}>
                    {getPlanLabel(acc.plan_code)}
                  </span>
                </div>
                {/* Estado */}
                <div style={{ flex: "0 0 90px" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: getStatusColor(acc.status) }}>
                    {getStatusLabel(acc.status)}
                  </span>
                </div>
                {/* Alojamientos */}
                <div style={{ flex: "0 0 56px", fontSize: 13, color: C.text, fontWeight: 600 }}>
                  {acc.accomCount}
                </div>
                {/* Habitaciones */}
                <div style={{ flex: "0 0 52px", fontSize: 13, color: C.text, fontWeight: 600 }}>
                  {acc.roomCount}
                </div>
                {/* Inquilinos */}
                <div style={{ flex: "0 0 52px", fontSize: 13, color: C.text, fontWeight: 600 }}>
                  {acc.tenantCount}
                </div>
                {/* Ocupación */}
                <div style={{ flex: "0 0 90px" }}>
                  <OccupancyBar pct={acc.occupancyPct} />
                </div>
                {/* Alta */}
                <div style={{ flex: "0 0 76px", fontSize: 11, color: C.muted }}>
                  {acc.startDate
                    ? new Date(acc.startDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" })
                    : "—"}
                </div>
                {/* Acción */}
                <div style={{ flex: "0 0 70px" }} onClick={e => e.stopPropagation()}>
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/v2/superadmin/cuentas/${acc.id}`)}
                    style={{ fontSize: 11 }}
                  >
                    Ver
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Paginación ───────────────────────────────────────────────── */}
          {sorted.length > PAGE_SIZE && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <Pagination
                current={page}
                total={sorted.length}
                pageSize={PAGE_SIZE}
                onChange={(p) => setPage(p)}
                showSizeChanger={false}
                showTotal={(t, [s, e]) => `${s}–${e} de ${t}`}
              />
            </div>
          )}

        </div>
      </div>
    </V2Layout>
  );
}
