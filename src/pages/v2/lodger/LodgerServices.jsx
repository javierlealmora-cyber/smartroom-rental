// src/pages/v2/lodger/LodgerServices.jsx
// Portal Inquilino — Mis Servicios

import { useState, useEffect, useCallback } from "react";
import { Alert, Card, Col, Row, Skeleton, Space, Tag, Typography } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import V2Layout from "../../../layouts/V2Layout";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenant } from "../../../providers/TenantProvider";
import { supabase } from "../../../services/supabaseClient";

const { Title, Text } = Typography;

const STATUS_COLOR = { active: "success", inactive: "default", cancelled: "error" };
const STATUS_LABEL = { active: "Activo", inactive: "Inactivo", cancelled: "Cancelado" };

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fEur(n) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

export default function LodgerServices() {
  const { user } = useAuth();
  const { branding: tenantBranding } = useTenant();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const companyBranding = {
    name: tenantBranding?.name || "SmartRoom",
    logoText: (tenantBranding?.name || "S").charAt(0),
    logoUrl: tenantBranding?.logo_url || null,
    primaryColor: tenantBranding?.primary_color || "#111827",
    secondaryColor: tenantBranding?.secondary_color || "#3B82F6",
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: lodger, error: lErr } = await supabase
        .from("lodgers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (lErr || !lodger) { setServices([]); return; }

      const { data, error: sErr } = await supabase
        .from("lodger_services")
        .select(`
          *,
          accommodation_service:accommodation_services(
            id,
            service:services_catalog(id, name, description, unit, unit_price, is_recurring)
          )
        `)
        .eq("lodger_id", lodger.id)
        .order("start_date", { ascending: false });

      if (sErr) throw new Error(sErr.message);
      setServices(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <V2Layout role="lodger" companyBranding={companyBranding} userName={user?.email || "Inquilino"}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <AppstoreOutlined style={{ marginRight: 8 }} />Mis Servicios
          </Title>
          <Text type="secondary">Servicios contratados en tu habitación</Text>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : services.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "32px 0" }}>
          <Text type="secondary">No tienes servicios contratados actualmente</Text>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {services.map((s) => {
            const svc = s.accommodation_service?.service;
            return (
              <Col key={s.id} xs={24} sm={12} lg={8}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <Text strong>{svc?.name || "Servicio"}</Text>
                      <Tag color={STATUS_COLOR[s.status] || "default"}>
                        {STATUS_LABEL[s.status] || s.status}
                      </Tag>
                    </Space>
                  }
                >
                  {svc?.description && (
                    <Text type="secondary" style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
                      {svc.description}
                    </Text>
                  )}
                  <Row gutter={8}>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Precio</Text>
                      <div>
                        <Text strong style={{ color: "#059669" }}>
                          {fEur(s.price_applied ?? svc?.unit_price)}
                        </Text>
                        {svc?.unit && (
                          <Text type="secondary" style={{ fontSize: 11 }}>/{svc.unit}</Text>
                        )}
                      </div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Cantidad</Text>
                      <div><Text strong>{s.quantity ?? 1}</Text></div>
                    </Col>
                    <Col span={12} style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Inicio</Text>
                      <div><Text>{fDate(s.start_date)}</Text></div>
                    </Col>
                    {s.end_date && (
                      <Col span={12} style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Fin</Text>
                        <div><Text>{fDate(s.end_date)}</Text></div>
                      </Col>
                    )}
                  </Row>
                  {s.notes && (
                    <Text type="secondary" style={{ display: "block", marginTop: 8, fontSize: 11 }}>
                      {s.notes}
                    </Text>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </V2Layout>
  );
}
