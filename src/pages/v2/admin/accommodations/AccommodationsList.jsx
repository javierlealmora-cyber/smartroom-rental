// src/pages/v2/admin/accommodations/AccommodationsList.jsx
// Lista de Alojamientos para Admin — Ant Design + Supabase real

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Checkbox, Col, Input, Popconfirm,
  Progress, Row, Select, Skeleton, Space, Statistic, Tag, Typography,
} from "antd";
import { BankOutlined, EditOutlined, PlusOutlined, PoweroffOutlined, ReloadOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listAccommodations, setAccommodationStatus } from "../../../../services/accommodations.service";
import { listEntities } from "../../../../services/entities.service";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function AccommodationsList() {
  const navigate = useNavigate();
  const { userName, companyBranding } = useAdminLayout();
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [filterEntityId, setFilterEntityId] = useState(null);
  const [allAccommodations, setAllAccommodations] = useState([]);
  const [ownerEntities, setOwnerEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, entities] = await Promise.all([
        listAccommodations(),
        listEntities({ type: "owner" }),
      ]);
      setAllAccommodations(data);
      setOwnerEntities(entities);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const accommodations = useMemo(() => {
    let result = allAccommodations;
    if (!showInactive) result = result.filter((a) => a.status === "active");
    if (filterEntityId) result = result.filter((a) => a.owner_entity_id === filterEntityId);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(s) ||
          a.address_line1?.toLowerCase().includes(s) ||
          a.city?.toLowerCase().includes(s) ||
          a.owner_entity?.legal_name?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [allAccommodations, searchTerm, showInactive, filterEntityId]);

  const getStats = (acc) => {
    const rooms = acc.rooms || [];
    const total = rooms.length;
    const occupied = rooms.filter((r) => r.status === "occupied").length;
    const free = rooms.filter((r) => r.status === "free").length;
    const pending = rooms.filter((r) => r.status === "pending_checkout").length;
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, free, pending, rate };
  };

  const onToggleStatus = async (acc) => {
    const next = acc.status === "active" ? "inactive" : "active";
    try {
      await setAccommodationStatus(acc.id, next);
      setAllAccommodations((prev) =>
        prev.map((a) => (a.id === acc.id ? { ...a, status: next } : a))
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const STATUS_TAG = { active: "success", inactive: "warning", archived: "default" };
  const STATUS_LABEL = { active: "Activo", inactive: "Inactivo", archived: "Archivado" };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Gestión de Alojamientos</Title>
          <Text type="secondary">
            {loading ? "Cargando..." : `${accommodations.length} alojamiento${accommodations.length !== 1 ? "s" : ""}`}
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/v2/admin/alojamientos/nuevo")}
          >
            Nuevo Alojamiento
          </Button>
        </Col>
      </Row>

      {/* Filtros */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="Buscar por nombre, dirección o entidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={(v) => setSearchTerm(v)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={7}>
          <Select
            placeholder="Filtrar por entidad propietaria"
            value={filterEntityId}
            onChange={setFilterEntityId}
            allowClear
            style={{ width: "100%" }}
            options={ownerEntities.map((e) => ({ value: e.id, label: e.legal_name }))}
          />
        </Col>
        <Col>
          <Checkbox
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          >
            Mostrar desactivados
          </Checkbox>
        </Col>
        <Col>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { setSearchTerm(""); setShowInactive(false); setFilterEntityId(null); }}
          >
            Limpiar
          </Button>
        </Col>
      </Row>

      {/* Error */}
      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          action={<Button size="small" onClick={load}>Reintentar</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Loading skeleton */}
      {loading && (
        <Row gutter={[20, 20]}>
          {[1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={24} md={12} xl={8}>
              <Card>
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Empty state */}
      {!loading && accommodations.length === 0 && (
        <Card style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <Title level={4}>No hay alojamientos</Title>
          <Text type="secondary">
            {searchTerm
              ? "No se encontraron alojamientos con los filtros aplicados"
              : "Crea tu primer alojamiento para empezar"}
          </Text>
          {!searchTerm && (
            <div style={{ marginTop: 24 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/v2/admin/alojamientos/nuevo")}
              >
                Añadir Alojamiento
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Grid de cards */}
      {!loading && accommodations.length > 0 && (
        <Row gutter={[20, 20]}>
          {accommodations.map((acc) => {
            const { total, occupied, free, pending, rate } = getStats(acc);
            const progressColor = rate > 80 ? "#059669" : rate > 50 ? "#F59E0B" : "#DC2626";

            return (
              <Col key={acc.id} xs={24} sm={24} md={12} xl={8}>
                <Card
                  title={
                    <Space direction="vertical" size={2} style={{ width: "100%" }}>
                      <Space>
                        <Text strong style={{ fontSize: 16 }}>{acc.name}</Text>
                        <Tag color={STATUS_TAG[acc.status] || "default"}>
                          {STATUS_LABEL[acc.status] || acc.status}
                        </Tag>
                      </Space>
                      {acc.owner_entity && (
                        <Text type="secondary" style={{ fontSize: 12, fontWeight: "normal" }}>
                          <BankOutlined style={{ marginRight: 4 }} />
                          {acc.owner_entity.legal_name}
                        </Text>
                      )}
                    </Space>
                  }
                  actions={[
                    <Button
                      key="edit"
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => navigate(`/v2/admin/alojamientos/${acc.id}/editar`)}
                    >
                      Editar
                    </Button>,
                    <Popconfirm
                      key="toggle"
                      title={acc.status === "active" ? "¿Desactivar este alojamiento?" : "¿Reactivar este alojamiento?"}
                      onConfirm={() => onToggleStatus(acc)}
                      okText="Sí"
                      cancelText="No"
                    >
                      <Button type="link" icon={<PoweroffOutlined />} danger={acc.status === "active"}>
                        {acc.status === "active" ? "Desactivar" : "Reactivar"}
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                    {[acc.address_line1, acc.postal_code, acc.city].filter(Boolean).join(", ") || "Sin dirección"}
                  </Text>

                  {/* Estadísticas */}
                  <Row gutter={8} style={{ marginBottom: 16 }}>
                    <Col span={6}><Statistic title="Total" value={total} valueStyle={{ fontSize: 20 }} /></Col>
                    <Col span={6}><Statistic title="Ocupadas" value={occupied} valueStyle={{ fontSize: 20, color: "#DC2626" }} /></Col>
                    <Col span={6}><Statistic title="Libres" value={free} valueStyle={{ fontSize: 20, color: "#059669" }} /></Col>
                    <Col span={6}><Statistic title="Pendientes" value={pending} valueStyle={{ fontSize: 20, color: "#F59E0B" }} /></Col>
                  </Row>

                  {/* Barra de ocupación */}
                  <div>
                    <Row justify="space-between" style={{ marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Ocupación</Text>
                      <Text strong style={{ fontSize: 12 }}>{rate}%</Text>
                    </Row>
                    <Progress
                      percent={rate}
                      showInfo={false}
                      strokeColor={progressColor}
                      size="small"
                    />
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
