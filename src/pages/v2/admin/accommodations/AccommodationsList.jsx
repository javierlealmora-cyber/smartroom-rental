// src/pages/v2/admin/accommodations/AccommodationsList.jsx
// Lista de Alojamientos para Admin — cards agrupadas por empresa

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Checkbox, Col, Input, Popconfirm,
  Progress, Row, Select, Skeleton, Space, Statistic, Tag, Tooltip, Typography,
} from "antd";
import {
  AppstoreOutlined, BankOutlined, EditOutlined, HomeOutlined,
  PlusOutlined, PoweroffOutlined, ReloadOutlined, ToolOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listAccommodations, setAccommodationStatus } from "../../../../services/accommodations.service";
import { listEntities } from "../../../../services/entities.service";

const { Title, Text } = Typography;
const { Search } = Input;

const STATUS_TAG = { active: "success", inactive: "warning", archived: "default" };
const STATUS_LABEL = { active: "Activo", inactive: "Inactivo", archived: "Archivado" };

function getStats(acc) {
  const rooms = acc.rooms || [];
  const total = rooms.length;
  const occupied = rooms.filter((r) => r.status === "occupied").length;
  const free = rooms.filter((r) => r.status === "free").length;
  const pending = rooms.filter((r) => r.status === "pending_checkout").length;
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  return { total, occupied, free, pending, rate };
}

function formatEntityName(e) {
  if (!e) return "Sin empresa";
  if (e.legal_type === "persona_juridica") return e.legal_name || "(sin nombre)";
  const parts = [e.first_name, e.last_name1, e.last_name2].filter(Boolean);
  return parts.join(" ") || e.legal_name || "(sin nombre)";
}

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

  const filtered = useMemo(() => {
    let result = allAccommodations;
    if (!showInactive) result = result.filter((a) => a.status === "active");
    if (filterEntityId) result = result.filter((a) => a.owner_entity_id === filterEntityId);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.name?.toLowerCase().includes(s) ||
          a.address_line1?.toLowerCase().includes(s) ||
          a.city?.toLowerCase().includes(s) ||
          a.owner_entity?.legal_name?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [allAccommodations, searchTerm, showInactive, filterEntityId]);

  // Agrupar por owner_entity_id, ordenado por nombre de empresa
  const grouped = useMemo(() => {
    const map = new Map();
    for (const acc of filtered) {
      const key = acc.owner_entity_id || "__sin_empresa__";
      if (!map.has(key)) {
        map.set(key, { entity: acc.owner_entity || null, items: [] });
      }
      map.get(key).items.push(acc);
    }
    // Ordenar grupos: primero los que tienen empresa (por nombre), luego sin empresa
    return Array.from(map.entries())
      .sort(([ka, a], [kb, b]) => {
        if (ka === "__sin_empresa__") return 1;
        if (kb === "__sin_empresa__") return -1;
        const nameA = formatEntityName(a.entity).toLowerCase();
        const nameB = formatEntityName(b.entity).toLowerCase();
        return nameA.localeCompare(nameB);
      })
      .map(([, group]) => group);
  }, [filtered]);

  const onToggleStatus = async (acc, e) => {
    e?.stopPropagation();
    const next = acc.status === "active" ? "inactive" : "active";
    try {
      await setAccommodationStatus(acc.id, next);
      setAllAccommodations((prev) =>
        prev.map((a) => (a.id === acc.id ? { ...a, status: next } : a))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Alojamientos</Title>
          <Text type="secondary">
            {loading ? "Cargando..." : `${filtered.length} alojamiento${filtered.length !== 1 ? "s" : ""}`}
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
            placeholder="Buscar por nombre, dirección o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={(v) => setSearchTerm(v)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={7}>
          <Select
            placeholder="Filtrar por empresa propietaria"
            value={filterEntityId}
            onChange={setFilterEntityId}
            allowClear
            style={{ width: "100%" }}
            options={ownerEntities.map((e) => ({ value: e.id, label: formatEntityName(e) }))}
          />
        </Col>
        <Col>
          <Checkbox checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}>
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
            <Col key={i} xs={24} sm={12} md={8}>
              <Card><Skeleton active paragraph={{ rows: 4 }} /></Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <Card style={{ textAlign: "center", padding: "40px 0" }}>
          <HomeOutlined style={{ fontSize: 48, color: "#D1D5DB", marginBottom: 16 }} />
          <Title level={4} style={{ color: "#6B7280" }}>No hay alojamientos</Title>
          <Text type="secondary">
            {searchTerm || filterEntityId
              ? "No se encontraron alojamientos con los filtros aplicados"
              : "Crea tu primer alojamiento para empezar"}
          </Text>
          {!searchTerm && !filterEntityId && (
            <div style={{ marginTop: 24 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/v2/admin/alojamientos/nuevo")}>
                Añadir Alojamiento
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Grupos por empresa */}
      {!loading && grouped.length > 0 && grouped.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 36 }}>
          {/* Cabecera de empresa */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: 16, paddingBottom: 10,
            borderBottom: "2px solid #E5E7EB",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: group.entity ? "#EFF6FF" : "#F3F4F6",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <BankOutlined style={{ fontSize: 18, color: group.entity ? "#3B82F6" : "#9CA3AF" }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 15, display: "block", lineHeight: 1.3 }}>
                {group.entity ? formatEntityName(group.entity) : "Sin empresa asignada"}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {group.items.length} alojamiento{group.items.length !== 1 ? "s" : ""}
              </Text>
            </div>
            {group.entity && (
              <Tooltip title="Ver empresa">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  style={{ marginLeft: "auto", color: "#6B7280" }}
                  onClick={() => navigate(`/v2/admin/entidades/${group.entity.id}/editar`)}
                />
              </Tooltip>
            )}
          </div>

          {/* Cards de alojamientos */}
          <Row gutter={[20, 20]}>
            {group.items.map((acc) => {
              const { total, occupied, free, pending, rate } = getStats(acc);
              const progressColor = rate > 80 ? "#059669" : rate > 50 ? "#F59E0B" : "#DC2626";

              return (
                <Col key={acc.id} xs={24} sm={12} xl={8}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/v2/admin/alojamientos/${acc.id}/editar`)}
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
                      <Popconfirm
                        key="toggle"
                        title={acc.status === "active" ? "¿Desactivar este alojamiento?" : "¿Reactivar este alojamiento?"}
                        onConfirm={(e) => onToggleStatus(acc, e)}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="Sí" cancelText="No"
                      >
                        <Button
                          type="text" size="small"
                          danger={acc.status === "active"}
                          icon={<PoweroffOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {acc.status === "active" ? "Desactivar" : "Reactivar"}
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    {/* Nombre + estado */}
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

                    {/* Dirección */}
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 14 }}>
                      <HomeOutlined style={{ marginRight: 4 }} />
                      {[acc.address_line1 || acc.street, acc.postal_code, acc.city].filter(Boolean).join(", ") || "Sin dirección"}
                    </Text>

                    {/* Stats habitaciones */}
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

                    {/* Barra ocupación */}
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
        </div>
      ))}
    </V2Layout>
  );
}
