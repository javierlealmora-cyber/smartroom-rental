import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Checkbox, Col, Input, Row, Skeleton, Space, Tag, Tooltip, Typography } from "antd";
import { BankOutlined, EditOutlined, HomeOutlined, IdcardOutlined, MailOutlined, PhoneOutlined, PlusOutlined, PoweroffOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import { IllustrationEntity, IllustrationTenant } from "../../../../components/icons3d/Illustrations3D";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useTenant } from "../../../../providers/TenantProvider";
import { useAuth } from "../../../../providers/AuthProvider";
import { listEntities, setEntityStatus } from "../../../../services/entities.service";
import { supabase } from "../../../../services/supabaseClient";

const { Search } = Input;

const IMG_INVERSOR   = "/icons/inversor-card-model.png";
const IMG_INVERSORA  = "/icons/inversora-card-model.png";
const IMG_EMPRESA    = "/icons/entidad-card-model.jpg";

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
  const { userName, companyBranding } = useAdminLayout();
  const { planCode } = useTenant();

  const canWrite = role !== "viewer";

  const [_payer, setPayer] = useState(null);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxOwners, setMaxOwners] = useState(null);
  const [entityKpis, setEntityKpis] = useState({});
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const ownersCountForLimit = owners.length;
  const limitReached = useMemo(() =>
    maxOwners != null && maxOwners !== -1 && ownersCountForLimit >= maxOwners,
    [ownersCountForLimit, maxOwners]
  );
  const filteredOwners = useMemo(() => {
    let r = owners;
    if (!showInactive) r = r.filter((e) => e.status === "active");
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((e) => formatEntityName(e).toLowerCase().includes(q) || e.billing_email?.toLowerCase().includes(q) || e.tax_id?.toLowerCase().includes(q));
    }
    return r;
  }, [owners, search, showInactive]);

  const _ownerLimitLabel = useMemo(() => {
    if (!planCode || maxOwners == null) return "";
    return maxOwners === -1 ? "Ilimitadas" : `${ownersCountForLimit} / ${maxOwners}`;
  }, [planCode, maxOwners, ownersCountForLimit]);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const [payerEntities, ownerEntities] = await Promise.all([
          listEntities({ type: "payer" }),
          listEntities({ type: "owner" }),
        ]);
        setPayer(payerEntities[0] || null);
        setOwners(ownerEntities || []);

        if (ownerEntities.length > 0) {
          const { data: accs } = await supabase
            .from("accommodations").select("id, owner_entity_id")
            .in("owner_entity_id", ownerEntities.map((e) => e.id));
          const accIds = (accs || []).map((a) => a.id);
          let roomsByAcc = {};
          if (accIds.length > 0) {
            const { data: rooms } = await supabase
              .from("rooms").select("id, accommodation_id, status")
              .in("accommodation_id", accIds);
            (rooms || []).forEach((r) => {
              if (!roomsByAcc[r.accommodation_id]) roomsByAcc[r.accommodation_id] = [];
              roomsByAcc[r.accommodation_id].push(r);
            });
          }
          const kpis = {};
          ownerEntities.forEach((e) => {
            const myAccs = (accs || []).filter((a) => a.owner_entity_id === e.id);
            const myRooms = myAccs.flatMap((a) => roomsByAcc[a.id] || []);
            kpis[e.id] = {
              accs: myAccs.length,
              free: myRooms.filter((r) => r.status === "free").length,
              occupied: myRooms.filter((r) => r.status === "occupied").length,
              pending: myRooms.filter((r) => r.status === "pending_checkout").length,
            };
          });
          setEntityKpis(kpis);
        }

        if (planCode) {
          const { data, error: planErr } = await supabase
            .from("plans_catalog").select("max_owners").eq("code", planCode).maybeSingle();
          if (!planErr) setMaxOwners(data?.max_owners ?? null);
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
      <Row justify="space-between" align="middle" style={{ marginBottom: 6 }}>
        <div>
          <Typography.Title level={1} style={{ margin: 0, fontWeight: 700, fontSize: 30, letterSpacing: "-0.5px", color: "#1D1D1F" }}>
            Entidades
          </Typography.Title>

        </div>
        <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite || limitReached}
          onClick={() => navigate("/v2/admin/entidades/nueva")}
          style={{ borderRadius: 20, fontWeight: 600, height: 38 }}>
          Nueva entidad
        </Button>
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
        <Col>
          <Checkbox checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}>
            Mostrar desactivados
          </Checkbox>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => { setSearch(""); setShowInactive(false); }}>Limpiar</Button>
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
            return (
              <Col key={entity.id} xs={24} sm={12} lg={6}>
                <Card
                  style={{
                    borderRadius: 16, overflow: "hidden",
                    border: "1px solid #E5E7EB",
                    opacity: isActive ? 1 : 0.78,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    background: "#fff",
                  }}
                  styles={{ body: { padding: "20px 20px 0 20px", background: "#fff" } }}>

                  {/* ── 1: Nombre + Badge ── */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <Typography.Text strong style={{ fontSize: 18, color: "#1D1D1F", letterSpacing: "-0.3px", lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
                      {formatEntityName(entity)}
                    </Typography.Text>
                    <span style={{ color: isActive ? "#16A34A" : "#DC2626", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {STATUS_LABEL[entity.status] || entity.status}
                    </span>
                  </div>
                  <Typography.Text style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 14 }}>
                    {LEGAL_TYPE_LABEL[entity.legal_type] || entity.legal_type}
                  </Typography.Text>

                  {/* ── 2: 4 KPI boxes con borde ── */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                    {[
                      { v: kpi.accs,    l: "Aloj.",    c: "#374151" },
                      { v: totalRooms,  l: "Hab. Tot.", c: "#374151" },
                      { v: kpi.occupied,l: "Ocup.",    c: "#DC2626" },
                      { v: kpi.free,    l: "Libres",   c: "#16A34A" },
                    ].map(({ v, l, c }) => (
                      <div key={l} style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "8px 14px", minWidth: 60, textAlign: "left" }}>
                        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── 3: Divider ── */}
                  <div style={{ height: 1, background: "#E5E7EB", margin: "0 -20px 16px -20px" }} />

                  {/* ── 4: Imagen ── */}
                  {(() => { const { src, fit } = getEntityImage(entity); return (
                  <div onClick={() => navigate(`/v2/admin/entidades/${entity.id}`)} style={{ margin: "0 -20px 14px -20px", overflow: "hidden", background: "#fff", cursor: "pointer" }}>
                    <img src={src} alt="Entidad"
                      style={{ width: "100%", display: "block", objectFit: fit, height: 180 }} />
                  </div>
                  ); })()}

                  {/* ── 5: Barra de ocupación ── */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <Typography.Text style={{ fontSize: 12, color: "#6B7280" }}>Ocupación</Typography.Text>
                      <Typography.Text style={{ fontSize: 12, color: "#6B7280" }}>{occRate}%</Typography.Text>
                    </div>
                    <div style={{ height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${occRate}%`, background: progressColor, borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                  </div>

                  {/* ── 6: Divider + Botones ── */}
                  <div style={{ height: 1, background: "#E5E7EB", margin: "0 -20px 14px -20px" }} />
                  <div style={{ paddingBottom: 16, display: "flex", alignItems: "center", gap: 0 }}
                    onClick={(e) => e.stopPropagation()}>
                    <Button type="primary" size="middle"
                      style={{ borderRadius: 20, fontWeight: 600, fontSize: 13, marginRight: 16 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/entidades/${entity.id}/editar`); }}>
                      Editar
                    </Button>
                    <Button type="link" size="middle"
                      style={{ fontSize: 13, padding: 0, color: "#3B82F6", fontWeight: 500, marginRight: 16 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/entidades/${entity.id}`); }}>
                      Ver detalle &gt;
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </V2Layout>
  );
}
