import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Popconfirm, Row, Skeleton, Space, Tag, Tooltip, Typography } from "antd";
import { BankOutlined, EditOutlined, HomeOutlined, IdcardOutlined, MailOutlined, PhoneOutlined, PlusOutlined, PoweroffOutlined, UserOutlined } from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import { IllustrationEntity, IllustrationTenant } from "../../../../components/icons3d/Illustrations3D";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useTenant } from "../../../../providers/TenantProvider";
import { useAuth } from "../../../../providers/AuthProvider";
import { listEntities, setEntityStatus } from "../../../../services/entities.service";
import { supabase } from "../../../../services/supabaseClient";

const STORAGE_BASE = "https://lqwyyyttjamirccdtlvl.supabase.co/storage/v1/object/public/Assets-SmartRent";
const IMG_INVERSOR   = `${STORAGE_BASE}/inversor-card-model.png`;
const IMG_INVERSORA  = `${STORAGE_BASE}/inversora-card-model.png`;
const IMG_EMPRESA    = `${STORAGE_BASE}/entidad-card-model.jpg`;

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

  const [payer, setPayer] = useState(null);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxOwners, setMaxOwners] = useState(null);
  const [entityKpis, setEntityKpis] = useState({});

  const ownersCountForLimit = owners.length;
  const limitReached = useMemo(() =>
    maxOwners != null && maxOwners !== -1 && ownersCountForLimit >= maxOwners,
    [ownersCountForLimit, maxOwners]
  );
  const ownerLimitLabel = useMemo(() => {
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

  const onToggleStatus = async (entity) => {
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
      <Row justify="space-between" align="middle" style={{ marginBottom: 32 }}>
        <div>
          <Typography.Title level={1} style={{ margin: 0, fontWeight: 700, fontSize: 30, letterSpacing: "-0.5px", color: "#1D1D1F" }}>
            Entidades
          </Typography.Title>
          <Typography.Text style={{ fontSize: 15, color: "#6B7280" }}>
            Pagadora y propietarias de la cuenta cliente
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite || limitReached}
          onClick={() => navigate("/v2/admin/entidades/nueva")}
          style={{ borderRadius: 20, fontWeight: 600, height: 38 }}>
          Nueva entidad
        </Button>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 20 }} />}

      {/* ── Entidad Pagadora ── */}
      <Typography.Text style={{ color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", fontSize: 11, display: "block", marginBottom: 14 }}>
        Entidad Pagadora
      </Typography.Text>

      {loading ? (
        <Row gutter={[20, 20]} style={{ marginBottom: 40 }}>
          <Col xs={24} sm={16} md={12} lg={9}><Card style={{ borderRadius: 18 }}><Skeleton active paragraph={{ rows: 2 }} /></Card></Col>
        </Row>
      ) : !payer ? (
        <Card style={{ marginBottom: 40, textAlign: "center", padding: "32px 0", borderStyle: "dashed", borderRadius: 18 }}>
          <BankOutlined style={{ fontSize: 36, color: "#D1D5DB", marginBottom: 10 }} />
          <div><Typography.Text type="secondary">Sin entidad pagadora configurada</Typography.Text></div>
          {canWrite && <Button type="link" onClick={() => navigate("/v2/admin/entidades/nueva")} style={{ marginTop: 6 }}>+ Crear entidad pagadora</Button>}
        </Card>
      ) : (
        <Row gutter={[20, 20]} style={{ marginBottom: 40 }}>
          <Col xs={24} sm={16} md={12} lg={8}>
            <Card
              style={{ borderRadius: 16, border: "1px solid #E5E7EB", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden", background: "#fff" }}
              styles={{ body: { padding: "20px 20px 0 20px", background: "#fff" } }}>
              {/* ── 1: Nombre + Tipo + Badge ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                <Typography.Text strong style={{ fontSize: 20, color: "#1D1D1F", letterSpacing: "-0.3px", lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
                  {formatEntityName(payer)}
                </Typography.Text>
                <span style={{ color: "#16A34A", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {STATUS_LABEL[payer.status] || payer.status}
                </span>
              </div>
              <Typography.Text style={{ fontSize: 13, color: "#6B7280", display: "block", marginBottom: 16 }}>
                {LEGAL_TYPE_LABEL[payer.legal_type] || payer.legal_type}
              </Typography.Text>
              {/* ── 2: Divider ── */}
              <div style={{ height: 1, background: "#E5E7EB", margin: "0 -20px 16px -20px" }} />
              {/* ── 3: Imagen ── */}
              {(() => { const { src, fit } = getEntityImage(payer); return (
              <div onClick={() => navigate(`/v2/admin/entidades/${payer.id}`)} style={{ margin: "0 -20px 16px -20px", overflow: "hidden", background: "#fff", cursor: "pointer" }}>
                <img src={src} alt="Entidad"
                  style={{ width: "100%", display: "block", objectFit: fit, height: 200 }} />
              </div>
              ); })()}
              {/* ── 4: Contacto ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {payer.billing_email && <Space size={8}><MailOutlined style={{ color: "#9CA3AF", fontSize: 13 }} /><Typography.Text style={{ fontSize: 13, color: "#374151" }}>{payer.billing_email}</Typography.Text></Space>}
                {payer.phone && <Space size={8}><PhoneOutlined style={{ color: "#9CA3AF", fontSize: 13 }} /><Typography.Text style={{ fontSize: 13, color: "#374151" }}>{payer.phone}</Typography.Text></Space>}
                {payer.tax_id && <Space size={8}><IdcardOutlined style={{ color: "#9CA3AF", fontSize: 13 }} /><Typography.Text style={{ fontSize: 13, color: "#374151" }}>{payer.tax_id}</Typography.Text></Space>}
              </div>
              {/* ── 5: Divider + Botones ── */}
              <div style={{ height: 1, background: "#E5E7EB", margin: "0 -20px 14px -20px" }} />
              <div style={{ paddingBottom: 16, display: "flex", alignItems: "center" }}>
                <Button type="primary" size="middle"
                  style={{ borderRadius: 20, fontWeight: 600, fontSize: 13, marginRight: 16 }}
                  onClick={() => navigate(`/v2/admin/entidades/${payer.id}/editar`)}>
                  Editar
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* ── Entidades Propietarias ── */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <div>
          <Typography.Text style={{ color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", fontSize: 11 }}>
            Entidades Propietarias
          </Typography.Text>
          {ownerLimitLabel && (
            <Typography.Text style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 10 }}>({ownerLimitLabel})</Typography.Text>
          )}
        </div>
      </Row>

      {loading ? (
        <Row gutter={[20, 20]}>
          {[1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} md={8} xl={6}><Card style={{ borderRadius: 18 }}><Skeleton active paragraph={{ rows: 4 }} /></Card></Col>
          ))}
        </Row>
      ) : owners.length === 0 ? (
        <EmptyState icon="🏠" title="Sin entidades propietarias"
          description="Crea la primera entidad propietaria para asignar alojamientos"
          actionLabel="Nueva Entidad" onAction={() => navigate("/v2/admin/entidades/nueva")} />
      ) : (
        <Row gutter={[20, 20]}>
          {owners.map((entity) => {
            const kpi = entityKpis[entity.id] || { accs: 0, free: 0, occupied: 0, pending: 0 };
            const totalRooms = kpi.free + kpi.occupied + kpi.pending;
            const occRate = totalRooms > 0 ? Math.round((kpi.occupied / totalRooms) * 100) : 0;
            const progressColor = occRate > 80 ? "#059669" : occRate > 50 ? "#F59E0B" : "#DC2626";
            const isActive = entity.status === "active";
            const contactName = entity.legal_type === "persona_juridica"
              ? entity.legal_name
              : [entity.first_name, entity.last_name1, entity.last_name2].filter(Boolean).join(" ");
            return (
              <Col key={entity.id} xs={24} sm={12} md={8} xl={6}>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                    <Typography.Text strong style={{ fontSize: 18, color: "#1D1D1F", letterSpacing: "-0.3px", lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
                      {formatEntityName(entity)}
                    </Typography.Text>
                    <span style={{ color: isActive ? "#16A34A" : "#DC2626", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {STATUS_LABEL[entity.status] || entity.status}
                    </span>
                  </div>
                  <Typography.Text style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 14 }}>
                    {LEGAL_TYPE_LABEL[entity.legal_type] || entity.legal_type}
                  </Typography.Text>

                  {/* ── 2: 4 KPI boxes con borde ── */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                    {[
                      { v: kpi.accs,    l: "Aloj.",    c: "#374151" },
                      { v: totalRooms,  l: "Hab. Tot.", c: "#374151" },
                      { v: kpi.occupied,l: "Ocup.",    c: "#DC2626" },
                      { v: kpi.free,    l: "Libres",   c: "#16A34A" },
                    ].map(({ v, l, c }) => (
                      <div key={l} style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "7px 10px", minWidth: 50, textAlign: "left", flex: "1 1 auto" }}>
                        <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── 3: Divider ── */}
                  <div style={{ height: 1, background: "#E5E7EB", margin: "0 -20px 14px -20px" }} />

                  {/* ── 4: Imagen ── */}
                  {(() => { const { src, fit } = getEntityImage(entity); return (
                  <div onClick={() => navigate(`/v2/admin/entidades/${entity.id}`)} style={{ margin: "0 -20px 12px -20px", overflow: "hidden", background: "#fff", cursor: "pointer" }}>
                    <img src={src} alt="Entidad"
                      style={{ width: "100%", display: "block", objectFit: fit, height: 200 }} />
                  </div>
                  ); })()}

                  {/* ── 5: Barra de ocupación ── */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <Typography.Text style={{ fontSize: 12, color: "#6B7280" }}>Ocupación</Typography.Text>
                      <Typography.Text style={{ fontSize: 12, color: "#6B7280" }}>{occRate}%</Typography.Text>
                    </div>
                    <div style={{ height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${occRate}%`, background: progressColor, borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                  </div>

                  {/* ── 6: Nombre contacto + datos ── */}
                  <div style={{ marginBottom: 14 }}>
                    {contactName && (
                      <Typography.Text strong style={{ fontSize: 14, color: "#1D1D1F", display: "block", marginBottom: 6 }}>
                        {contactName}
                      </Typography.Text>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {entity.billing_email && <Space size={6}><MailOutlined style={{ color: "#9CA3AF", fontSize: 12 }} /><Typography.Text style={{ fontSize: 12, color: "#6B7280" }}>{entity.billing_email}</Typography.Text></Space>}
                      {entity.phone && <Space size={6}><PhoneOutlined style={{ color: "#9CA3AF", fontSize: 12 }} /><Typography.Text style={{ fontSize: 12, color: "#6B7280" }}>{entity.phone}</Typography.Text></Space>}
                      {entity.tax_id && <Space size={6}><IdcardOutlined style={{ color: "#9CA3AF", fontSize: 12 }} /><Typography.Text style={{ fontSize: 12, color: "#6B7280" }}>{entity.tax_id}</Typography.Text></Space>}
                    </div>
                  </div>

                  {/* ── 7: Divider + Botones ── */}
                  <div style={{ height: 1, background: "#E5E7EB", margin: "0 -20px 14px -20px" }} />
                  <div style={{ paddingBottom: 16, display: "flex", alignItems: "center" }}
                    onClick={(e) => e.stopPropagation()}>
                    <Button type="primary" size="middle"
                      style={{ borderRadius: 20, fontWeight: 600, fontSize: 13, marginRight: 14 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/entidades/${entity.id}/editar`); }}>
                      Editar
                    </Button>
                    <Button type="link" size="middle"
                      style={{ fontSize: 13, padding: 0, color: "#3B82F6", fontWeight: 500, marginRight: 14 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/entidades/${entity.id}`); }}>
                      Servicios &gt;
                    </Button>
                    <Button type="link" size="middle"
                      style={{ fontSize: 13, padding: 0, color: "#3B82F6", fontWeight: 500 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/entidades/${entity.id}`); }}>
                      Habitaciones &gt;
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
