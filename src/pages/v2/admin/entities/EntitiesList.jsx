import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Card, Col, Popconfirm, Row, Skeleton, Space, Tag, Tooltip, Typography } from "antd";
import { BankOutlined, EditOutlined, IdcardOutlined, MailOutlined, PhoneOutlined, PlusOutlined, PoweroffOutlined, UserOutlined } from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useTenant } from "../../../../providers/TenantProvider";
import { useAuth } from "../../../../providers/AuthProvider";
import { listEntities, setEntityStatus } from "../../../../services/entities.service";
import { supabase } from "../../../../services/supabaseClient";

function formatEntityName(e) {
  if (!e) return "";
  if (e.legal_type === "persona_juridica") return e.legal_name || "(sin nombre)";
  const parts = [e.first_name, e.last_name1, e.last_name2].filter(Boolean);
  return parts.join(" ") || e.legal_name || "(sin nombre)";
}

export default function EntitiesList() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const { planCode } = useTenant();

  const canWrite = role !== "viewer";

  const [payer, setPayer] = useState(null);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxOwners, setMaxOwners] = useState(null);

  const ownersCountForLimit = owners.length;

  const limitReached = useMemo(() => {
    if (maxOwners == null) return false;
    if (maxOwners === -1) return false;
    return ownersCountForLimit >= maxOwners;
  }, [ownersCountForLimit, maxOwners]);

  const ownerLimitLabel = useMemo(() => {
    if (!planCode) return "";
    if (maxOwners === -1) return `Ilimitadas (plan ${planCode})`;
    if (maxOwners == null) return `Plan ${planCode}`;
    return `${ownersCountForLimit} / ${maxOwners} usadas (incluye deshabilitadas)`;
  }, [planCode, maxOwners, ownersCountForLimit]);

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
        setOwners(ownerEntities || []);

        if (planCode) {
          const { data, error: planErr } = await supabase
            .from("plans_catalog")
            .select("max_owners")
            .eq("code", planCode)
            .maybeSingle();

          if (!planErr) setMaxOwners(data?.max_owners ?? null);
        }
      } catch (e) {
        setError(e?.message || "Error cargando entidades");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [planCode]);

  const onToggleStatus = async (entity) => {
    if (!canWrite) return;
    const next = entity.status === "active" ? "disabled" : "active";
    const msg = next === "disabled" ? "¿Deshabilitar esta entidad?" : "¿Reactivar esta entidad?";
    if (!confirm(msg)) return;

    setError(null);
    try {
      const updated = await setEntityStatus(entity.id, next);
      setOwners((prev) => prev.map((x) => (x.id === entity.id ? updated : x)));
    } catch (e) {
      setError(e?.message || "Error actualizando entidad");
    }
  };

  const payerItems = payer
    ? [
        { label: "Nombre", value: formatEntityName(payer) },
        { label: "Tipo", value: payer.legal_type },
        { label: "NIF/CIF", value: payer.tax_id || "-" },
        { label: "Email", value: payer.billing_email || "-" },
      ]
    : [];

  const LEGAL_TYPE_LABEL = {
    autonomo: "Autónomo",
    persona_fisica: "Persona física",
    persona_juridica: "Persona jurídica",
  };

  const STATUS_COLOR = { active: "success", disabled: "error", inactive: "warning", suspended: "warning" };
  const STATUS_LABEL = { active: "Activo", disabled: "Deshabilitado", inactive: "Inactivo", suspended: "Suspendido" };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Typography.Title level={2} style={{ margin: 0 }}>Entidades</Typography.Title>
          <Typography.Text type="secondary">Pagadora y propietarias de la Cuenta Cliente</Typography.Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canWrite || limitReached}
            onClick={() => navigate("/v2/admin/entidades/nueva")}
          >
            Nueva entidad
          </Button>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {/* ── Entidad Pagadora ── */}
      <Typography.Title level={5} style={{ marginBottom: 12, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>
        Entidad Pagadora
      </Typography.Title>

      {loading ? (
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          <Col xs={24} sm={12} md={8}>
            <Card><Skeleton active paragraph={{ rows: 3 }} /></Card>
          </Col>
        </Row>
      ) : !payer ? (
        <Card style={{ marginBottom: 32, textAlign: "center", padding: "24px 0", borderStyle: "dashed" }}>
          <BankOutlined style={{ fontSize: 32, color: "#D1D5DB", marginBottom: 8 }} />
          <div><Typography.Text type="secondary">Sin entidad pagadora configurada</Typography.Text></div>
          {canWrite && (
            <Button type="link" onClick={() => navigate("/v2/admin/entidades/nueva")} style={{ marginTop: 4 }}>
              + Crear entidad pagadora
            </Button>
          )}
        </Card>
      ) : (
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          <Col xs={24} sm={12} md={8}>
            <Card
              hoverable
              onClick={() => navigate(`/v2/admin/entidades/${payer.id}/editar`)}
              style={{ cursor: "pointer", borderRadius: 12, border: "1.5px solid #E5E7EB", transition: "box-shadow 0.2s" }}
              bodyStyle={{ padding: "20px 24px" }}
            >
              <Row justify="space-between" align="top" style={{ marginBottom: 12 }}>
                <Col>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BankOutlined style={{ fontSize: 20, color: "#3B82F6" }} />
                  </div>
                </Col>
                <Col>
                  <Tag color={STATUS_COLOR[payer.status] || "default"}>
                    {STATUS_LABEL[payer.status] || payer.status}
                  </Tag>
                </Col>
              </Row>
              <Typography.Text strong style={{ fontSize: 15, display: "block", marginBottom: 2 }}>
                {formatEntityName(payer)}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                {LEGAL_TYPE_LABEL[payer.legal_type] || payer.legal_type} · Pagadora
              </Typography.Text>
              {payer.tax_id && (
                <Space size={4} style={{ display: "flex", marginBottom: 4 }}>
                  <IdcardOutlined style={{ color: "#9CA3AF", fontSize: 12 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{payer.tax_id}</Typography.Text>
                </Space>
              )}
              {payer.billing_email && (
                <Space size={4} style={{ display: "flex", marginBottom: 4 }}>
                  <MailOutlined style={{ color: "#9CA3AF", fontSize: 12 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{payer.billing_email}</Typography.Text>
                </Space>
              )}
              {payer.phone && (
                <Space size={4} style={{ display: "flex" }}>
                  <PhoneOutlined style={{ color: "#9CA3AF", fontSize: 12 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{payer.phone}</Typography.Text>
                </Space>
              )}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "flex-end" }}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  <EditOutlined style={{ marginRight: 4 }} />Editar
                </Typography.Text>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* ── Entidades Propietarias ── */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Typography.Title level={5} style={{ margin: 0, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>
            Entidades Propietarias
          </Typography.Title>
        </Col>
        {ownerLimitLabel && (
          <Col>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{ownerLimitLabel}</Typography.Text>
          </Col>
        )}
      </Row>

      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} md={8} xl={6}>
              <Card><Skeleton active paragraph={{ rows: 3 }} /></Card>
            </Col>
          ))}
        </Row>
      ) : owners.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="Sin entidades propietarias"
          description="Crea la primera entidad propietaria para asignar alojamientos"
          actionLabel="Nueva Entidad"
          onAction={() => navigate("/v2/admin/entidades/nueva")}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {owners.map((entity) => (
            <Col key={entity.id} xs={24} sm={12} md={8} xl={6}>
              <Card
                hoverable
                onClick={() => navigate(`/v2/admin/entidades/${entity.id}`)}
                style={{
                  cursor: "pointer",
                  borderRadius: 12,
                  border: entity.status === "active" ? "1.5px solid #E5E7EB" : "1.5px solid #FCA5A5",
                  opacity: entity.status === "active" ? 1 : 0.75,
                  transition: "box-shadow 0.2s, transform 0.15s",
                }}
                bodyStyle={{ padding: "20px 24px" }}
                actions={canWrite ? [
                  <Tooltip key="edit" title="Editar">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/entidades/${entity.id}/editar`); }}
                    >
                      Editar
                    </Button>
                  </Tooltip>,
                  <Popconfirm
                    key="toggle"
                    title={entity.status === "active" ? "¿Deshabilitar esta entidad?" : "¿Reactivar esta entidad?"}
                    onConfirm={(e) => { e?.stopPropagation(); onToggleStatus(entity); }}
                    onCancel={(e) => e?.stopPropagation()}
                    okText="Sí"
                    cancelText="No"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger={entity.status === "active"}
                      icon={<PoweroffOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {entity.status === "active" ? "Deshabilitar" : "Reactivar"}
                    </Button>
                  </Popconfirm>,
                ] : undefined}
              >
                <Row justify="space-between" align="top" style={{ marginBottom: 12 }}>
                  <Col>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <UserOutlined style={{ fontSize: 20, color: "#16A34A" }} />
                    </div>
                  </Col>
                  <Col>
                    <Tag color={STATUS_COLOR[entity.status] || "default"}>
                      {STATUS_LABEL[entity.status] || entity.status}
                    </Tag>
                  </Col>
                </Row>
                <Typography.Text strong style={{ fontSize: 15, display: "block", marginBottom: 2 }}>
                  {formatEntityName(entity)}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                  {LEGAL_TYPE_LABEL[entity.legal_type] || entity.legal_type} · Propietaria
                </Typography.Text>
                {entity.tax_id && (
                  <Space size={4} style={{ display: "flex", marginBottom: 4 }}>
                    <IdcardOutlined style={{ color: "#9CA3AF", fontSize: 12 }} />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{entity.tax_id}</Typography.Text>
                  </Space>
                )}
                {entity.billing_email && (
                  <Space size={4} style={{ display: "flex", marginBottom: 4 }}>
                    <MailOutlined style={{ color: "#9CA3AF", fontSize: 12 }} />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{entity.billing_email}</Typography.Text>
                  </Space>
                )}
                {entity.phone && (
                  <Space size={4} style={{ display: "flex" }}>
                    <PhoneOutlined style={{ color: "#9CA3AF", fontSize: 12 }} />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{entity.phone}</Typography.Text>
                  </Space>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </V2Layout>
  );
}
