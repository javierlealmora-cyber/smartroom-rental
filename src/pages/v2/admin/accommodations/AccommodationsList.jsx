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
import { IllustrationAccommodation } from "../../../../components/icons3d/Illustrations3D";

const { Title, Text } = Typography;
const { Search } = Input;

const STATUS_TAG = { active: "success", inactive: "warning", archived: "default" };
const STATUS_LABEL = { active: "Activo", inactive: "Inactivo", archived: "Archivado" };
const STATUS_COLOR = { active: "#16A34A", inactive: "#DC2626", archived: "#6B7280" };

const ACC_CARD_IMAGE = "/icons/alojamiento-card-model.jpg";

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
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <div>
          <Title level={1} style={{ margin: 0, fontWeight: 700, fontSize: 30, letterSpacing: "-0.5px", color: "#1D1D1F" }}>Alojamientos</Title>
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
            {group.items.map((acc) => {
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
                    {/* ── 1: Nombre + Badge estado ── */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 20, color: "#1D1D1F", letterSpacing: "-0.3px", lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
                        {acc.name}
                      </Text>
                      <span style={{
                        color: STATUS_COLOR[acc.status] || "#6B7280",
                        fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
                      }}>
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
                        { v: total,    l: "Total",    c: "#374151" },
                        { v: occupied, l: "Ocupado",  c: "#DC2626" },
                        { v: free,     l: "Libres",   c: "#16A34A" },
                        { v: pending,  l: "Pend.",    c: "#D97706" },
                      ].map(({ v, l, c }) => (
                        <div key={l} style={{
                          border: "1.5px solid #E5E7EB", borderRadius: 10,
                          padding: "8px 14px", minWidth: 60, textAlign: "left",
                        }}>
                          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 2 }}>{l}</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* ── 4: Divider ── */}
                    <div style={{ height: 1, background: "#E5E7EB", margin: "0 -20px 16px -20px" }} />

                    {/* ── 5: Imagen con margen lateral ── */}
                    <div onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/alojamientos/${acc.id}/habitaciones`); }} style={{ margin: "0 -20px 14px -20px", overflow: "hidden", background: "#fff", cursor: "pointer" }}>
                      <img
                        src={ACC_CARD_IMAGE}
                        alt="Alojamiento"
                        style={{ width: "100%", display: "block", objectFit: "contain", height: 180 }}
                      />
                    </div>

                    {/* ── 6: Barra de ocupación ── */}
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
                        onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/alojamientos/${acc.id}/editar`); }}>
                        Editar
                      </Button>
                      <Button type="link" size="middle"
                        style={{ fontSize: 13, padding: 0, color: "#3B82F6", fontWeight: 500, marginRight: 16 }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/alojamientos/${acc.id}/servicios`); }}>
                        Servicios &gt;
                      </Button>
                      <Button type="link" size="middle"
                        style={{ fontSize: 13, padding: 0, color: "#3B82F6", fontWeight: 500 }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/alojamientos/${acc.id}/habitaciones`); }}>
                        Habitaciones &gt;
                      </Button>
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
