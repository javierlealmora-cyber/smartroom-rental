import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Checkbox, Col, Input, Row, Select, Skeleton, Tooltip, Typography } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import { IllustrationEntity, IllustrationTenant } from "../../../../components/icons3d/Illustrations3D";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useTenant } from "../../../../providers/TenantProvider";
import { useAuth } from "../../../../providers/AuthProvider";
import { listEntities, setEntityStatus } from "../../../../services/entities.service";
import { supabase } from "../../../../services/supabaseClient";

const { Search } = Input;

const IMG_INVERSOR   = "/images/inversor-card-model.webp";
const IMG_INVERSORA  = "/images/inversora-card-model.webp";
const IMG_EMPRESA    = "/images/entidad-card-model.webp";

function getEntityImage(entity) {
  if (!entity) return { src: IMG_EMPRESA, fit: "contain" };
  if (entity.legal_type === "persona_juridica" || entity.legal_type === "autonomo") return { src: IMG_EMPRESA, fit: "contain" };
  return { src: entity.gender === "female" ? IMG_INVERSORA : IMG_INVERSOR, fit: "contain" };
}

function formatEntityName(e) {
  if (!e) return "";
  if (e.legal_type === "persona_juridica") return e.legal_name || "(sin nombre)";
  const parts = [e.first_name, e.last_name1, e.last_name2].filter(Boolean);
  return parts.join(" ") || e.legal_name || "(sin nombre)";
}

const LEGAL_TYPE_LABEL = { autonomo: "Autónomo", persona_fisica: "Persona física", persona_juridica: "Persona jurídica" };
const STATUS_COLOR = { active: "success", disabled: "error", inactive: "warning", suspended: "warning" };
const STATUS_LABEL = { active: "Activo", disabled: "Deshabilitado", inactive: "Inactivo", suspended: "Suspendido" };

function KpiPill({ value, label, bg, color }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: "7px 11px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 52 }}>
      <span style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: 9, color, opacity: 0.7, marginTop: 1, whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

export default function EntitiesList() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const { planCode } = useTenant();

  const canWrite = role !== "viewer";

  const [_payer, setPayer] = useState(null);
  const [owners, setOwners] = useState([]);
  const [allOwnersCount, setAllOwnersCount] = useState(0); // Contador de TODAS las entidades (activas e inactivas)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxOwners, setMaxOwners] = useState(null);
  const [entityKpis, setEntityKpis] = useState({});
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  const limitReached = useMemo(() =>
    maxOwners != null && maxOwners !== -1 && allOwnersCount >= maxOwners,
    [allOwnersCount, maxOwners]
  );
  const filteredOwners = useMemo(() => {
    let r = owners;
    if (!showInactive) r = r.filter((e) => e.status === "active");
    if (filterStatus) r = r.filter((e) => e.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((e) => formatEntityName(e).toLowerCase().includes(q) || e.billing_email?.toLowerCase().includes(q) || e.tax_id?.toLowerCase().includes(q));
    }
    return r;
  }, [owners, search, showInactive, filterStatus]);

  const _ownerLimitLabel = useMemo(() => {
    if (!planCode || maxOwners == null) return "";
    return maxOwners === -1 ? "Ilimitadas" : `${allOwnersCount} / ${maxOwners}`;
  }, [planCode, maxOwners, allOwnersCount]);

  useEffect(() => {
    const load = async () => {
      setLoading(true); 
      setError(null);
      try {
        const [payerEntities, ownerEntities] = await Promise.all([
          listEntities({ type: "payer" }),
          listEntities({ type: "owner" }),
        ]);
        
        setPayer(payerEntities[0] || null);

        // Contar solo owners reales — el payer nunca es propietario
        setAllOwnersCount(ownerEntities?.length || 0);

        // Mostrar solo owners reales (payer no aparece en esta lista)
        setOwners(ownerEntities || []);

        // Cargar KPIs para todas las entidades
        const entitiesToLoadKpis = ownerEntities && ownerEntities.length > 0 ? ownerEntities : [];
        if (entitiesToLoadKpis.length > 0) {
          const { data: accs } = await supabase
            .from("accommodations").select("id, owner_entity_id")
            .eq("client_account_id", clientAccountId)
            .in("owner_entity_id", entitiesToLoadKpis.map((e) => e.id));
          const accIds = (accs || []).map((a) => a.id);
          let roomsByAcc = {};
          let assignByRoom = {};
          if (accIds.length > 0) {
            const today = new Date().toISOString().split("T")[0];
            const [{ data: rooms }, { data: assignments }] = await Promise.all([
              supabase.from("rooms").select("id, accommodation_id, is_maintenance")
                .eq("client_account_id", clientAccountId)
                .in("accommodation_id", accIds),
              supabase.from("lodger_room_assignments").select("room_id, move_out_date")
                .eq("client_account_id", clientAccountId)
                .in("accommodation_id", accIds)
                .or(`move_out_date.is.null,move_out_date.gt.${today}`),
            ]);
            (assignments || []).forEach((a) => { assignByRoom[a.room_id] = a; });
            (rooms || []).forEach((r) => {
              if (!roomsByAcc[r.accommodation_id]) roomsByAcc[r.accommodation_id] = [];
              roomsByAcc[r.accommodation_id].push(r);
            });
          }
          const kpis = {};
          entitiesToLoadKpis.forEach((e) => {
            const myAccs = (accs || []).filter((a) => a.owner_entity_id === e.id);
            const myRooms = myAccs.flatMap((a) => roomsByAcc[a.id] || []);
            let free = 0, occupied = 0, pending = 0;
            myRooms.forEach((r) => {
              if (r.is_maintenance) return;
              const asgn = assignByRoom[r.id];
              if (!asgn) free++;
              else if (!asgn.move_out_date) occupied++;
              else pending++;
            });
            kpis[e.id] = { accs: myAccs.length, free, occupied, pending };
          });
          setEntityKpis(kpis);
        }

        // Límites por defecto por plan (fallback si la BD no devuelve dato)
        const PLAN_DEFAULTS = { basic: 1, starter: 3, professional: -1, enterprise: -1 };
        if (planCode) {
          const { data, error: planErr } = await supabase
            .from("plans_catalog").select("max_owners").eq("code", planCode).maybeSingle();
          const fromDb = (!planErr && data?.max_owners != null) ? data.max_owners : null;
          setMaxOwners(fromDb ?? PLAN_DEFAULTS[planCode] ?? null);
        }
      } catch (e) {
        setError(e?.message || "Error cargando entidades");
      } finally { setLoading(false); }
    };
    load();
  }, [planCode]);

  const _onToggleStatus = async (entity) => {
    if (!canWrite) return;
    const next = entity.status === "active" ? "disabled" : "active";
    if (!confirm(next === "disabled" ? "¿Deshabilitar esta entidad?" : "¿Reactivar esta entidad?")) return;
    setError(null);
    try {
      const updated = await setEntityStatus(entity.id, next);
      setOwners((prev) => prev.map((x) => (x.id === entity.id ? updated : x)));
    } catch (e) { setError(e?.message || "Error actualizando entidad"); }
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* ── Header ── */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Entidades
          </Typography.Title>
          <Typography.Text type="secondary">
            {loading ? "Cargando..." : `${filteredOwners.length} entidad${filteredOwners.length !== 1 ? "es" : ""}`}
          </Typography.Text>
        </div>
        <Tooltip 
          title={limitReached ? `Has alcanzado el límite de tu plan (máx. ${maxOwners} entidad${maxOwners !== 1 ? 'es' : ''}). Actualiza tu plan para añadir más.` : undefined}
        >
          <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite || limitReached}
            onClick={() => navigate("/v2/admin/entidades/nueva")}
            style={{ borderRadius: 20, fontWeight: 600, height: 38 }}>
            Nueva entidad
          </Button>
        </Tooltip>
      </Row>

      {/* ── Filtros ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="Buscar por nombre, email o NIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Select
            style={{ width: "100%" }}
            placeholder="Estado"
            value={filterStatus || undefined}
            onChange={(v) => setFilterStatus(v || "")}
            allowClear
            options={[
              { value: "active", label: "Activo" },
              { value: "disabled", label: "Deshabilitado" },
              { value: "inactive", label: "Inactivo" },
              { value: "suspended", label: "Suspendido" },
            ]}
          />
        </Col>
        <Col>
          <Checkbox checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}>
            Mostrar desactivados
          </Checkbox>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => { setSearch(""); setShowInactive(false); setFilterStatus(""); }}>Limpiar</Button>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 8 }} />}

      {loading ? (
        <Row gutter={[20, 20]}>
          {[1, 2, 3, 4].map((i) => (
            <Col key={i} xs={24} sm={12} lg={6}><Card style={{ borderRadius: 16 }}><Skeleton active paragraph={{ rows: 4 }} /></Card></Col>
          ))}
        </Row>
      ) : filteredOwners.length === 0 ? (
        owners.length === 0
          ? <EmptyState icon="🏠" title="Sin entidades propietarias"
              description="Crea la primera entidad propietaria para asignar alojamientos"
              actionLabel="Nueva Entidad" onAction={() => navigate("/v2/admin/entidades/nueva")} />
          : <EmptyState icon="🔍" title="Sin resultados" description="No hay entidades que coincidan con los filtros aplicados" />
      ) : (
        <Row gutter={[20, 20]}>
          {filteredOwners.map((entity) => {
            const kpi = entityKpis[entity.id] || { accs: 0, free: 0, occupied: 0, pending: 0 };
            const totalRooms = kpi.free + kpi.occupied + kpi.pending;
            const occRate = totalRooms > 0 ? Math.round((kpi.occupied / totalRooms) * 100) : 0;
            const progressColor = occRate > 80 ? "#059669" : occRate > 50 ? "#F59E0B" : "#DC2626";
            const isActive = entity.status === "active";
            const _contactName = entity.legal_type === "persona_juridica"
              ? entity.legal_name
              : [entity.first_name, entity.last_name1, entity.last_name2].filter(Boolean).join(" ");
            const { src: imgSrc } = getEntityImage(entity);
            return (
              <Col key={entity.id} xs={24} sm={12} lg={6}>
                <div
                  onMouseEnter={() => setHoveredId(entity.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    borderRadius: 14,
                    border: "1px solid #E5E7EB",
                    background: "#FFFFFF",
                    boxShadow: hoveredId === entity.id ? "0 12px 32px rgba(0,0,0,0.13)" : "0 2px 12px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    opacity: isActive ? 1 : 0.78,
                    transform: hoveredId === entity.id ? "translateY(-4px)" : "translateY(0)",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onClick={() => navigate(`/v2/admin/entidades/${entity.id}`)}
                >
                  {/* ── 1: Cabecera — nombre + tipo ── */}
                  <div style={{ padding: "12px 14px 8px" }}>
                    <Typography.Text strong style={{
                      fontSize: 13,
                      color: "#1D1D1F",
                      letterSpacing: "-0.2px",
                      lineHeight: 1.2,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      minHeight: "2.4em",
                    }}>
                      {formatEntityName(entity)}
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 11, color: "#9CA3AF", display: "block", lineHeight: 1.4 }}>
                      {LEGAL_TYPE_LABEL[entity.legal_type] || entity.legal_type}
                    </Typography.Text>
                  </div>

                  {/* ── 2: Imagen full-width con badge estado superpuesto ── */}
                  <div style={{ position: "relative", background: "#FFFFFF", overflow: "hidden", height: 258, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img
                      src={imgSrc}
                      alt="Entidad"
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                        objectFit: "contain",
                        filter: "none",
                      }}
                    />
                    <span style={{
                      position: "absolute",
                      top: 10,
                      right: 12,
                      fontSize: 10,
                      fontWeight: 700,
                      color: isActive ? "#16A34A" : "#DC2626",
                      background: isActive ? "#DCFCE7" : "#FEE2E2",
                      borderRadius: 20,
                      padding: "1px 9px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                      zIndex: 2,
                    }}>
                      {STATUS_LABEL[entity.status] || entity.status}
                    </span>
                  </div>

                  {/* ── 3: KPIs en fila horizontal ── */}
                  <div style={{ padding: "12px 14px 0", display: "flex", gap: 0 }}>
                    {[
                      { v: kpi.accs,     l: "Aloj.",    c: "#374151" },
                      { v: totalRooms,   l: "Hab. Tot.", c: "#374151" },
                      { v: kpi.occupied, l: "Ocup.",     c: "#DC2626" },
                      { v: kpi.free,     l: "Libres",    c: "#16A34A" },
                    ].map(({ v, l, c }, i) => (
                      <div key={l} style={{ flex: 1, textAlign: i === 0 ? "left" : "center" }}>
                        <Typography.Text style={{ fontSize: 10, color: "#9CA3AF", display: "block", lineHeight: 1.3 }}>{l}</Typography.Text>
                        <Typography.Text style={{ fontSize: 20, fontWeight: 800, color: c, lineHeight: 1.1 }}>{v}</Typography.Text>
                      </div>
                    ))}
                  </div>

                  {/* ── 4: Barra de ocupación ── */}
                  <div style={{ padding: "8px 14px 6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <Typography.Text style={{ fontSize: 10, color: "#9CA3AF" }}>Ocupación</Typography.Text>
                      <Typography.Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600 }}>{occRate}%</Typography.Text>
                    </div>
                    <div style={{ height: 4, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${occRate}%`, background: progressColor, borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                  </div>

                  {/* ── 5: Botones ── */}
                  <div style={{ borderTop: "1px solid #F3F4F6", margin: "6px 0 0" }} />
                  <div
                    style={{ padding: "8px 10px 16px", display: "flex", gap: 6, alignItems: "center" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button type="primary" size="small"
                      style={{ borderRadius: 20, fontWeight: 600, fontSize: 11, flex: 1, background: "#0096D6", borderColor: "#0096D6" }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/entidades/${entity.id}/editar`); }}>
                      Editar
                    </Button>
                    <Button type="primary" size="small"
                      style={{ borderRadius: 20, fontWeight: 600, fontSize: 11, flex: 1, background: "#0096D6", borderColor: "#0096D6" }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/entidades/${entity.id}`); }}>
                      Ver detalle
                    </Button>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
    </V2Layout>
  );
}
