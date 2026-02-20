// src/pages/v2/admin/DashboardAdmin.jsx
// Dashboard principal para Admin — Ant Design + datos reales Supabase

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Col, Progress, Row,
  Skeleton, Space, Statistic, Tag, Typography,
} from "antd";
import {
  BankOutlined, HomeOutlined, TeamOutlined,
  AppstoreOutlined, ReloadOutlined, WarningOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../layouts/V2Layout";
import { useAdminLayout } from "../../../hooks/useAdminLayout";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../services/supabaseClient";

const { Title, Text } = Typography;

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { userName, companyBranding } = useAdminLayout();
  const canWrite = role !== "viewer";

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: entities },
        { data: accommodations },
        { data: rooms },
        { data: lodgers },
      ] = await Promise.all([
        supabase.from("entities").select("id, type, status"),
        supabase.from("accommodations").select("id, status"),
        supabase.from("rooms").select("id, status"),
        supabase.from("lodgers").select("id, status"),
      ]);

      const totalEntities = (entities || []).filter((e) => e.type === "owner").length;
      const totalAccommodations = (accommodations || []).filter((a) => a.status === "active").length;
      const allRooms = rooms || [];
      const totalRooms = allRooms.length;
      const freeRooms = allRooms.filter((r) => r.status === "free").length;
      const occupiedRooms = allRooms.filter((r) => r.status === "occupied").length;
      const pendingCheckout = allRooms.filter((r) => r.status === "pending_checkout").length;
      const allLodgers = lodgers || [];
      const activeTenants = allLodgers.filter((l) => l.status === "active").length;
      const pendingTenants = allLodgers.filter((l) => l.status === "pending_checkout").length;

      setStats({
        totalEntities,
        totalAccommodations,
        totalRooms,
        freeRooms,
        occupiedRooms,
        pendingCheckout,
        activeTenants,
        pendingTenants,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const occupancyRate = stats && stats.totalRooms > 0
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100)
    : 0;

  const occupancyColor = occupancyRate > 80 ? "#059669" : occupancyRate > 50 ? "#F59E0B" : "#DC2626";

  const quickLinks = [
    { label: "Entidades", icon: <BankOutlined />, path: "/v2/admin/entidades", color: "#8B5CF6" },
    { label: "Alojamientos", icon: <HomeOutlined />, path: "/v2/admin/alojamientos", color: "#3B82F6" },
    { label: "Inquilinos", icon: <TeamOutlined />, path: "/v2/admin/inquilinos", color: "#059669" },
    { label: "Servicios", icon: <AppstoreOutlined />, path: "/v2/admin/servicios", color: "#F59E0B" },
  ];

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>

      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
          <Text type="secondary">Resumen de tu operación</Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Actualizar
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={load}>Reintentar</Button>}
        />
      )}

      {/* KPIs */}
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Card size="small" style={{ borderLeft: "4px solid #8B5CF6" }}>
                <Statistic
                  title={<Text style={{ fontSize: 12 }}>Entidades</Text>}
                  value={stats.totalEntities}
                  prefix={<BankOutlined style={{ color: "#8B5CF6" }} />}
                  valueStyle={{ color: "#8B5CF6", fontSize: 28 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Card size="small" style={{ borderLeft: "4px solid #3B82F6" }}>
                <Statistic
                  title={<Text style={{ fontSize: 12 }}>Alojamientos</Text>}
                  value={stats.totalAccommodations}
                  prefix={<HomeOutlined style={{ color: "#3B82F6" }} />}
                  valueStyle={{ color: "#3B82F6", fontSize: 28 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Card size="small" style={{ borderLeft: "4px solid #111827" }}>
                <Statistic
                  title={<Text style={{ fontSize: 12 }}>Habitaciones</Text>}
                  value={stats.totalRooms}
                  valueStyle={{ fontSize: 28 }}
                />
                <Space size={4} style={{ marginTop: 4 }}>
                  <Tag color="success" style={{ fontSize: 10, margin: 0 }}>{stats.freeRooms} libres</Tag>
                  <Tag color="error" style={{ fontSize: 10, margin: 0 }}>{stats.occupiedRooms} ocup.</Tag>
                </Space>
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Card size="small" style={{ borderLeft: `4px solid ${occupancyColor}` }}>
                <Statistic
                  title={<Text style={{ fontSize: 12 }}>Ocupación</Text>}
                  value={occupancyRate}
                  suffix="%"
                  valueStyle={{ color: occupancyColor, fontSize: 28 }}
                />
                <Progress
                  percent={occupancyRate}
                  showInfo={false}
                  strokeColor={occupancyColor}
                  size="small"
                  style={{ marginTop: 4 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Card size="small" style={{ borderLeft: "4px solid #059669" }}>
                <Statistic
                  title={<Text style={{ fontSize: 12 }}>Inquilinos activos</Text>}
                  value={stats.activeTenants}
                  prefix={<TeamOutlined style={{ color: "#059669" }} />}
                  valueStyle={{ color: "#059669", fontSize: 28 }}
                />
                {stats.pendingTenants > 0 && (
                  <Tag color="warning" icon={<WarningOutlined />} style={{ fontSize: 10, marginTop: 4 }}>
                    {stats.pendingTenants} pendiente{stats.pendingTenants > 1 ? "s" : ""} de baja
                  </Tag>
                )}
              </Card>
            </Col>
          </Row>

          {/* Accesos rápidos */}
          <Row gutter={[16, 16]}>
            {quickLinks.map((item) => (
              <Col key={item.path} xs={12} sm={6}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => navigate(item.path)}
                  style={{ textAlign: "center", cursor: "pointer", borderTop: `3px solid ${item.color}` }}
                >
                  <div style={{ fontSize: 28, color: item.color, marginBottom: 6 }}>{item.icon}</div>
                  <Text strong style={{ fontSize: 13 }}>{item.label}</Text>
                  {!canWrite && (
                    <div><Text type="secondary" style={{ fontSize: 11 }}>Solo lectura</Text></div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

    </V2Layout>
  );
}
