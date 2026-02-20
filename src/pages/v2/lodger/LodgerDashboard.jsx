// src/pages/v2/lodger/LodgerDashboard.jsx
// Dashboard principal del Inquilino — Ant Design + datos reales Supabase

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Avatar, Button, Card, Col, Descriptions,
  Empty, Row, Skeleton, Space, Tag, Typography,
} from "antd";
import {
  HomeOutlined, ThunderboltOutlined, FileTextOutlined,
  AppstoreOutlined, UserOutlined, CalendarOutlined,
  EuroOutlined, ReloadOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../layouts/V2Layout";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenant } from "../../../providers/TenantProvider";
import { supabase } from "../../../services/supabaseClient";

const { Title, Text } = Typography;

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fEur(n) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

export default function LodgerDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { branding } = useTenant();

  const [lodger, setLodger] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [bulletins, setBulletins] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const companyBranding = branding
    ? { name: branding.name, logoUrl: branding.logo_url, primaryColor: branding.primary_color, secondaryColor: branding.secondary_color }
    : null;

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data: lodgerData, error: lodgerErr } = await supabase
        .from("lodgers")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();
      if (lodgerErr) throw new Error(lodgerErr.message);
      setLodger(lodgerData || null);
      if (!lodgerData) { setLoading(false); return; }

      const [{ data: asgn }, { data: bulls }, { data: svcs }] = await Promise.all([
        supabase
          .from("lodger_room_assignments")
          .select("id, move_in_date, billing_start_date, monthly_rent, status, room:rooms(id,number,floor,type), accommodation:accommodations(id,name,address,city)")
          .eq("lodger_id", lodgerData.id)
          .is("move_out_date", null)
          .maybeSingle(),
        supabase
          .from("bulletins")
          .select("id, period_start, period_end, amount_total, status, published_at, acknowledged_at")
          .eq("lodger_id", lodgerData.id)
          .order("period_start", { ascending: false })
          .limit(5),
        supabase
          .from("lodger_services")
          .select("id, status, start_date, service:services_catalog(id,name,price,billing_type)")
          .eq("lodger_id", lodgerData.id)
          .eq("status", "active"),
      ]);
      setAssignment(asgn || null);
      setBulletins(bulls || []);
      setServices(svcs || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => { load(); }, [load]);

  const firstName = lodger?.full_name?.split(" ")[0] || profile?.full_name?.split(" ")[0] || "Inquilino";
  const unreadBulletins = bulletins.filter((b) => b.status === "published" && !b.acknowledged_at).length;

  if (loading) {
    return (
      <V2Layout role="lodger" companyBranding={companyBranding}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </V2Layout>
    );
  }

  return (
    <V2Layout role="lodger" companyBranding={companyBranding} userName={lodger?.full_name || profile?.full_name}>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Reintentar</Button>}
        />
      )}

      {/* ── Header bienvenida ─────────────────────────────────────────── */}
      <div style={{ background: "#111827", borderRadius: 12, padding: "18px 22px", marginBottom: 18 }}>
        <Row justify="space-between" align="middle" wrap={false}>
          <Col flex="auto" style={{ minWidth: 0 }}>
            <Space size={12} align="center">
              <Avatar size={44} style={{ background: "#fff", color: "#111827", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                {firstName.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Title level={4} style={{ color: "#fff", margin: 0, lineHeight: 1.3 }}>
                  Hola, {firstName} 👋
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                  {assignment
                    ? `${assignment.accommodation?.name} · Hab. ${assignment.room?.number}`
                    : "Sin habitación asignada"}
                </Text>
              </div>
            </Space>
          </Col>
          <Col flex="none">
            <Button ghost size="small" icon={<UserOutlined />}
              onClick={() => navigate("/v2/lodger/perfil")}
              style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>
              Perfil
            </Button>
          </Col>
        </Row>
      </div>

      {/* ── Navegación rápida ─────────────────────────────────────────── */}
      <Row gutter={[10, 10]} style={{ marginBottom: 18 }}>
        {[
          { icon: <HomeOutlined />, label: "Inicio", path: "/v2/lodger/dashboard", active: true },
          { icon: <ThunderboltOutlined />, label: "Consumo", path: "/v2/lodger/consumo" },
          { icon: <FileTextOutlined />, label: "Boletines", path: "/v2/lodger/boletines", badge: unreadBulletins },
          { icon: <AppstoreOutlined />, label: "Servicios", path: "/v2/lodger/servicios" },
        ].map((item) => (
          <Col key={item.path} xs={12} sm={6}>
            <Button block icon={item.icon} onClick={() => navigate(item.path)}
              type={item.active ? "primary" : "default"} style={{ height: 42, fontWeight: 500 }}>
              {item.label}
              {item.badge > 0 && (
                <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 5px", fontWeight: 700 }}>
                  {item.badge}
                </span>
              )}
            </Button>
          </Col>
        ))}
      </Row>

      {/* ── Fila 1: Habitación + Boletines ───────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>

        <Col xs={24} md={10} lg={8}>
          <Card size="small" title={<Space><HomeOutlined /><span>Mi Habitación</span></Space>} style={{ height: "100%" }}>
            {assignment ? (
              <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 100 }}>
                <Descriptions.Item label="Alojamiento">
                  <Text strong>{assignment.accommodation?.name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Habitación">
                  <Tag color="geekblue" style={{ fontSize: 13, padding: "1px 10px" }}>
                    Hab. {assignment.room?.number}
                  </Tag>
                </Descriptions.Item>
                {assignment.room?.floor != null && (
                  <Descriptions.Item label="Planta">{assignment.room.floor}</Descriptions.Item>
                )}
                <Descriptions.Item label={<Space size={4}><CalendarOutlined />Entrada</Space>}>
                  {fDate(assignment.move_in_date)}
                </Descriptions.Item>
                <Descriptions.Item label={<Space size={4}><EuroOutlined />Renta</Space>}>
                  <Text strong style={{ color: "#059669" }}>
                    {fEur(assignment.monthly_rent)}
                    <Text type="secondary" style={{ fontSize: 11 }}>/mes</Text>
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="Sin habitación asignada" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        <Col xs={24} md={14} lg={16}>
          <Card size="small"
            title={<Space><FileTextOutlined /><span>Mis Boletines</span></Space>}
            extra={<Button type="link" size="small" onClick={() => navigate("/v2/lodger/boletines")}>Ver todos →</Button>}
          >
            {bulletins.length === 0 ? (
              <Empty description="Sin boletines aún" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Row gutter={[8, 8]}>
                {bulletins.slice(0, 4).map((b) => (
                  <Col key={b.id} xs={24} sm={12}>
                    <div style={{
                      padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: b.status === "published" && !b.acknowledged_at ? "#eff6ff" : "#fafafa",
                    }}>
                      <div>
                        <Text strong style={{ fontSize: 12, display: "block" }}>
                          {fDate(b.period_start)} – {fDate(b.period_end)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{fEur(b.amount_total)}</Text>
                      </div>
                      <Tag color={b.status === "published" ? "blue" : "default"} style={{ fontSize: 11 }}>
                        {b.status === "published" ? "Publicado" : "Borrador"}
                      </Tag>
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Fila 2: Servicios + Datos personales ─────────────────────── */}
      <Row gutter={[16, 16]}>

        <Col xs={24} md={12}>
          <Card size="small"
            title={<Space><AppstoreOutlined /><span>Servicios Activos</span></Space>}
            extra={<Button type="link" size="small" onClick={() => navigate("/v2/lodger/servicios")}>Ver todos →</Button>}
          >
            {services.length === 0 ? (
              <Empty description="Sin servicios contratados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Space direction="vertical" style={{ width: "100%" }} size={6}>
                {services.map((s) => (
                  <Row key={s.id} justify="space-between" align="middle"
                    style={{ padding: "8px 10px", background: "#f9fafb", borderRadius: 6 }}>
                    <Col>
                      <Text strong style={{ fontSize: 13 }}>{s.service?.name}</Text>
                      {s.service?.billing_type && (
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                          ({s.service.billing_type})
                        </Text>
                      )}
                    </Col>
                    <Col>
                      <Text style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
                        {fEur(s.service?.price)}
                      </Text>
                    </Col>
                  </Row>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card size="small"
            title={<Space><UserOutlined /><span>Mis Datos</span></Space>}
            extra={<Button type="link" size="small" onClick={() => navigate("/v2/lodger/perfil")}>Editar →</Button>}
          >
            {lodger ? (
              <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 100 }}>
                <Descriptions.Item label="Nombre">{lodger.full_name}</Descriptions.Item>
                <Descriptions.Item label="Email">{lodger.email}</Descriptions.Item>
                {lodger.phone && <Descriptions.Item label="Teléfono">{lodger.phone}</Descriptions.Item>}
                {lodger.document_id && <Descriptions.Item label="Documento">{lodger.document_id}</Descriptions.Item>}
                <Descriptions.Item label="Estado">
                  <Tag color={lodger.status === "active" ? "success" : lodger.status === "invited" ? "processing" : "default"}>
                    {lodger.status === "active" ? "Activo" : lodger.status === "invited" ? "Invitado" : lodger.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="No se encontraron datos" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

    </V2Layout>
  );
}
