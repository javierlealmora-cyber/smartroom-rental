// src/pages/v2/admin/accommodations/AccommodationsList.jsx
// Lista de Alojamientos para Admin — cards agrupadas por empresa

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Checkbox, Col, Input, Popconfirm,
  Row, Select, Skeleton, Space, Typography,
} from "antd";
import {
  AppstoreOutlined, BankOutlined, EditOutlined, HomeOutlined,
  PlusOutlined, PoweroffOutlined, ReloadOutlined, ToolOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listAccommodations, setAccommodationStatus } from "../../../../services/accommodations.service";
import { listEntities } from "../../../../services/entities.service";
import { IllustrationAccommodation } from "../../../../components/icons3d/Illustrations3D";
import AccommodationCard from "../../../../components/AccommodationCard";

const { Title, Text } = Typography;
const { Search } = Input;


function formatEntityName(e) {
  if (!e) return "Sin empresa";
  if (e.legal_type === "persona_juridica") return e.legal_name || "(sin nombre)";
  const parts = [e.first_name, e.last_name1, e.last_name2].filter(Boolean);
  return parts.join(" ") || e.legal_name || "(sin nombre)";
}

export default function AccommodationsList() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEntityId, setFilterEntityId] = useState(null);
  const [allAccommodations, setAllAccommodations] = useState([]);
  const [_ownerEntities, setOwnerEntities] = useState([]);
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
    if (filterStatus) result = result.filter((a) => a.status === filterStatus);
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
  }, [allAccommodations, searchTerm, showInactive, filterStatus, filterEntityId]);

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

  const _onToggleStatus = async (acc, e) => {
    e?.stopPropagation();
    const next = acc.status === "active" ? "inactive" : "active";
    try {
      await setAccommodationStatus(acc.id, next, clientAccountId);
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
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Alojamientos</Title>
          <Text type="secondary">
            {loading ? "Cargando..." : `${filtered.length} alojamiento${filtered.length !== 1 ? "s" : ""}`}
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => navigate("/v2/admin/alojamientos/nuevo")}
          style={{ borderRadius: 20, fontWeight: 600, height: 38 }}>
          Nuevo Alojamiento
        </Button>
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

      {/* Filtros */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="Buscar por nombre, dirección o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={(v) => setSearchTerm(v)}
            allowClear
          />
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Select
            style={{ width: "100%" }}
            placeholder="Estado"
            value={filterStatus || undefined}
            onChange={(v) => setFilterStatus(v || "")}
            allowClear
            options={[
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
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
            onClick={() => { setSearchTerm(""); setShowInactive(false); setFilterStatus(""); setFilterEntityId(null); }}
          >
            Limpiar
          </Button>
        </Col>
      </Row>

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
        <div key={gi} style={{ marginBottom: 24 }}>
          {/* Cards de alojamientos */}
          <Row gutter={[20, 20]}>
            {group.items.map((acc) => (
              <Col key={acc.id} xs={24} sm={12} lg={8} xl={6}>
                <AccommodationCard
                  accommodation={acc}
                  onCardClick={() => navigate(`/v2/admin/alojamientos/${acc.id}/habitaciones`)}
                  onEdit={() => navigate(`/v2/admin/alojamientos/${acc.id}/habitaciones?tab=datos`)}
                  onServices={() => navigate(`/v2/admin/alojamientos/${acc.id}/servicios`)}
                  onRooms={() => navigate(`/v2/admin/alojamientos/${acc.id}/habitaciones`)}
                />
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </V2Layout>
  );
}
