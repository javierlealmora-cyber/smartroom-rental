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
const STATUS_COLOR = { active: "#16A34A", inactive: "#DC2626", archived: "#6B7280" };

const ACC_CARD_IMAGE = "/icons/alojamiento-card-model.jpg";

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
            const isActive = acc.status === "active";
            return (
              <Col key={acc.id} xs={24} sm={12} lg={8} xl={6}>
                <Card
                  style={{
                    borderRadius: 16,
                    border: "1px solid #E5E7EB",
                    background: "#FFFFFF",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    opacity: isActive ? 1 : 0.78,
                  }}
                  styles={{ body: { padding: "20px 20px 0 20px", background: "#fff" } }}
                >
                  {/* ── 1: Nombre + Estado ── */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 20, color: "#1D1D1F", letterSpacing: "-0.3px", lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
                      {acc.name}
                    </Text>
                    <span style={{ color: STATUS_COLOR[acc.status] || "#6B7280", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {STATUS_LABEL[acc.status] || acc.status}
                    </span>
                  </div>

                  {/* ── 2: Dirección ── */}
                  <Text style={{ fontSize: 13, color: "#6B7280", display: "block", marginBottom: 16 }}>
                    {[acc.address_line1 || acc.street, acc.postal_code, acc.city].filter(Boolean).join(", ") || "Sin dirección"}
                  </Text>

                  {/* ── 3: KPI boxes con borde ── */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                    {[
                      { v: total,    l: "Total",   c: "#374151" },
                      { v: occupied, l: "Ocupado", c: "#DC2626" },
                      { v: free,     l: "Libres",  c: "#16A34A" },
                      { v: pending,  l: "Pend.",   c: "#D97706" },
                    ].map(({ v, l, c }) => (
                      <div key={l} style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "8px 14px", minWidth: 60, textAlign: "left" }}>
                        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── 4: Divider ── */}
                  <div style={{ height: 1, background: "#E5E7EB", margin: "0 -20px 16px -20px" }} />

                  {/* ── 5: Imagen ── */}
                  <div onClick={() => navigate(`/v2/admin/alojamientos/${acc.id}/habitaciones`)} style={{ margin: "0 -20px 14px -20px", overflow: "hidden", background: "#fff", cursor: "pointer" }}>
                    <img src={ACC_CARD_IMAGE} alt="Alojamiento"
                      style={{ width: "100%", display: "block", objectFit: "contain", height: 180 }} />
                  </div>

                  {/* ── 6: Barra ocupación ── */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>Ocupación</Text>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>{rate}%</Text>
                    </div>
                    <Progress percent={rate} showInfo={false} strokeColor={progressColor} size="small" trailColor="#E5E7EB" />
                  </div>

                  {/* ── 7: Divider + Botones ── */}
                  <div style={{ height: 1, background: "#E5E7EB", margin: "0 -20px 14px -20px" }} />
                  <div style={{ paddingBottom: 16, display: "flex", alignItems: "center", gap: 0 }}
                    onClick={(e) => e.stopPropagation()}>
                    <Button type="primary" size="middle"
                      style={{ borderRadius: 20, fontWeight: 600, fontSize: 13, marginRight: 16 }}
                      onClick={() => navigate(`/v2/admin/alojamientos/${acc.id}/editar`)}>
                      Editar
                    </Button>
                    <Button type="link" size="middle"
                      style={{ fontSize: 13, padding: 0, color: "#3B82F6", fontWeight: 500, marginRight: 16 }}
                      onClick={() => navigate(`/v2/admin/alojamientos/${acc.id}/servicios`)}>
                      Servicios &gt;
                    </Button>
                    <Button type="link" size="middle"
                      style={{ fontSize: 13, padding: 0, color: "#3B82F6", fontWeight: 500 }}
                      onClick={() => navigate(`/v2/admin/alojamientos/${acc.id}/habitaciones`)}>
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
