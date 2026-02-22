// src/pages/v2/admin/entities/EntityDetail.jsx
// Detalle de entidad: muestra sus alojamientos como cards clicables

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Button, Card, Col, Progress, Row, Skeleton, Statistic, Tag, Tooltip, Typography,
} from "antd";
import {
  ArrowLeftOutlined, BankOutlined, EditOutlined, HomeOutlined,
  PlusOutlined, ToolOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;

const STATUS_TAG = { active: "success", inactive: "warning", archived: "default" };
const STATUS_LABEL = { active: "Activo", inactive: "Inactivo", archived: "Archivado" };

const LEGAL_TYPE_LABEL = {
  autonomo: "Autónomo",
  persona_fisica: "Persona física",
  persona_juridica: "Persona jurídica",
};

function formatEntityName(e) {
  if (!e) return "";
  if (e.legal_type === "persona_juridica") return e.legal_name || "(sin nombre)";
  const parts = [e.first_name, e.last_name1, e.last_name2].filter(Boolean);
  return parts.join(" ") || e.legal_name || "(sin nombre)";
}

function getStats(acc) {
  const rooms = acc.rooms || [];
  const total = rooms.length;
  const occupied = rooms.filter((r) => r.status === "occupied").length;
  const free = rooms.filter((r) => r.status === "free").length;
  const pending = rooms.filter((r) => r.status === "pending_checkout").length;
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  return { total, occupied, free, pending, rate };
}

export default function EntityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userName, companyBranding } = useAdminLayout();

  const [entity, setEntity] = useState(null);
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: ent, error: entErr }, { data: accs, error: accsErr }] = await Promise.all([
        supabase.from("entities").select("*").eq("id", id).single(),
        supabase
          .from("accommodations")
          .select("*, rooms(id, status)")
          .eq("owner_entity_id", id)
          .order("name"),
      ]);
      if (entErr) throw new Error(entErr.message);
      if (accsErr) throw new Error(accsErr.message);
      setEntity(ent);
      setAccommodations(accs || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/v2/admin/entidades")}
            style={{ marginBottom: 8, paddingLeft: 0, color: "#6B7280" }}
          >
            Entidades
          </Button>
          {loading ? (
            <Skeleton active title={{ width: 200 }} paragraph={false} />
          ) : (
            <>
              <Title level={2} style={{ margin: 0 }}>{formatEntityName(entity)}</Title>
              <Text type="secondary">
                {LEGAL_TYPE_LABEL[entity?.legal_type] || entity?.legal_type}
                {entity?.tax_id ? ` · ${entity.tax_id}` : ""}
                {" · "}
                <Tag color={entity?.status === "active" ? "success" : "error"} style={{ marginLeft: 4 }}>
                  {entity?.status === "active" ? "Activo" : entity?.status}
                </Tag>
              </Text>
            </>
          )}
        </Col>
        <Col>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/v2/admin/entidades/${id}/editar`)}
          >
            Editar entidad
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/v2/admin/alojamientos/nuevo")}
          >
            Nuevo alojamiento
          </Button>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {/* Sección alojamientos */}
      <div style={{ marginBottom: 12 }}>
        <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>
          Alojamientos ({loading ? "…" : accommodations.length})
        </Text>
      </div>

      {loading ? (
        <Row gutter={[20, 20]}>
          {[1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} xl={8}>
              <Card><Skeleton active paragraph={{ rows: 4 }} /></Card>
            </Col>
          ))}
        </Row>
      ) : accommodations.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "40px 0", borderStyle: "dashed" }}>
          <HomeOutlined style={{ fontSize: 40, color: "#D1D5DB", marginBottom: 12 }} />
          <div>
            <Text type="secondary">Esta entidad no tiene alojamientos asignados</Text>
          </div>
          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={() => navigate("/v2/admin/alojamientos/nuevo")}
            style={{ marginTop: 8 }}
          >
            Crear alojamiento
          </Button>
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {accommodations.map((acc) => {
            const { total, occupied, free, pending, rate } = getStats(acc);
            const progressColor = rate > 80 ? "#059669" : rate > 50 ? "#F59E0B" : "#DC2626";

            return (
              <Col key={acc.id} xs={24} sm={12} xl={8}>
                <Card
                  hoverable
                  onClick={() => navigate(`/v2/admin/entidades/${id}/alojamientos/${acc.id}`)}
                  style={{
                    cursor: "pointer",
                    borderRadius: 12,
                    border: acc.status === "active" ? "1.5px solid #E5E7EB" : "1.5px solid #FCA5A5",
                    opacity: acc.status === "active" ? 1 : 0.78,
                    transition: "box-shadow 0.2s",
                  }}
                  bodyStyle={{ padding: "20px 22px 14px" }}
                  actions={[
                    <Tooltip key="edit" title="Editar alojamiento">
                      <Button
                        type="text" size="small" icon={<EditOutlined />}
                        onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/alojamientos/${acc.id}/editar`); }}
                      >
                        Editar
                      </Button>
                    </Tooltip>,
                    <Tooltip key="services" title="Servicios">
                      <Button
                        type="text" size="small" icon={<ToolOutlined />}
                        onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/alojamientos/${acc.id}/servicios`); }}
                      >
                        Servicios
                      </Button>
                    </Tooltip>,
                    <Tooltip key="rooms" title="Ver habitaciones e inquilinos">
                      <Button
                        type="text" size="small" icon={<HomeOutlined />}
                        onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/entidades/${id}/alojamientos/${acc.id}`); }}
                      >
                        Habitaciones
                      </Button>
                    </Tooltip>,
                  ]}
                >
                  <Row justify="space-between" align="top" style={{ marginBottom: 6 }}>
                    <Col flex="auto" style={{ paddingRight: 8 }}>
                      <Text strong style={{ fontSize: 15, lineHeight: 1.3, display: "block" }}>{acc.name}</Text>
                    </Col>
                    <Col>
                      <Tag color={STATUS_TAG[acc.status] || "default"} style={{ margin: 0 }}>
                        {STATUS_LABEL[acc.status] || acc.status}
                      </Tag>
                    </Col>
                  </Row>

                  <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 14 }}>
                    <HomeOutlined style={{ marginRight: 4 }} />
                    {[acc.address_line1 || acc.street, acc.postal_code, acc.city].filter(Boolean).join(", ") || "Sin dirección"}
                  </Text>

                  <Row gutter={8} style={{ marginBottom: 12 }}>
                    <Col span={6}>
                      <Statistic title="Total" value={total} valueStyle={{ fontSize: 18, fontWeight: 700 }} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="Ocupadas" value={occupied} valueStyle={{ fontSize: 18, color: "#DC2626" }} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="Libres" value={free} valueStyle={{ fontSize: 18, color: "#059669" }} />
                    </Col>
                    <Col span={6}>
                      <Statistic title="Pend." value={pending} valueStyle={{ fontSize: 18, color: "#F59E0B" }} />
                    </Col>
                  </Row>

                  <div>
                    <Row justify="space-between" style={{ marginBottom: 3 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Ocupación</Text>
                      <Text strong style={{ fontSize: 11 }}>{rate}%</Text>
                    </Row>
                    <Progress percent={rate} showInfo={false} strokeColor={progressColor} size="small" />
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
