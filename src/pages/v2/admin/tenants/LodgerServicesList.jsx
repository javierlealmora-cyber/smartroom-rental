// src/pages/v2/admin/tenants/LodgerServicesList.jsx
// Admin — Servicios asignados a Inquilinos
//
// Exporta dos variantes:
//   default  → página completa con V2Layout (ruta /v2/admin/inquilinos/servicios)
//   LodgerServicesTab → solo el contenido, para embeber en ServicesList como tab

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Alert, Button, Card, Col, Input, Row,
  Select, Space, Table, Tag, Typography,
} from "antd";
import { PlusOutlined, ReloadOutlined, TagOutlined } from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listAccommodations } from "../../../../services/accommodations.service";
import { supabase } from "../../../../services/supabaseClient";
import { LodgerServiceModal } from "./LodgerServiceCreate";

const { Title, Text } = Typography;
const { Search } = Input;

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

// ── Contenido reutilizable (sin layout) ──────────────────────────────────────
export function LodgerServicesTab() {
  const [all, setAll] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccommodation, setFilterAccommodation] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data, error: qErr }, accs] = await Promise.all([
        supabase
          .from("benefits_lodger")
          .select(`
            *,
            lodger:profiles(id, full_name, email),
            room:rooms(id, number, accommodation_id),
            accommodation_service:benefits_accommodation(
              id,
              accommodation_id,
              service:benefits_catalog(id, name, unit, unit_price)
            )
          `)
          .order("created_at", { ascending: false })
          .limit(300),
        listAccommodations({ status: "active" }),
      ]);
      if (qErr) throw new Error(qErr.message);
      setAll(data || []);
      setAccommodations(accs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    let r = all;
    if (filterStatus) r = r.filter((s) => s.status === filterStatus);
    if (filterAccommodation) {
      r = r.filter((s) =>
        s.accommodation_service?.accommodation_id === filterAccommodation ||
        s.room?.accommodation_id === filterAccommodation
      );
    }
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((s) =>
        s.lodger?.full_name?.toLowerCase().includes(q) ||
        s.lodger?.email?.toLowerCase().includes(q) ||
        s.accommodation_service?.service?.name?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [all, filterStatus, filterAccommodation, search]);

  const columns = [
    {
      title: "Inquilino",
      key: "lodger",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.lodger?.full_name || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.lodger?.email || ""}</Text>
        </Space>
      ),
    },
    {
      title: "Prestación",
      key: "service",
      render: (_, r) => {
        const svc = r.accommodation_service?.service;
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 13 }}>{svc?.name || "-"}</Text>
            {svc?.unit && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {fEur(r.price_applied ?? svc?.unit_price)}/{svc.unit}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: "Hab.",
      key: "room",
      responsive: ["sm"],
      render: (_, r) => r.room?.number ? <Tag>Hab. {r.room.number}</Tag> : "-",
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: "Cantidad",
      dataIndex: "quantity",
      key: "quantity",
      responsive: ["md"],
      render: (v) => v ?? 1,
    },
    {
      title: "Precio aplicado",
      dataIndex: "price_applied",
      key: "price_applied",
      render: (v, r) => fEur(v ?? r.accommodation_service?.service?.unit_price),
    },
    {
      title: "Inicio",
      dataIndex: "start_date",
      key: "start_date",
      responsive: ["lg"],
      render: (v) => fDate(v),
    },
    {
      title: "Fin",
      dataIndex: "end_date",
      key: "end_date",
      responsive: ["lg"],
      render: (v) => v ? fDate(v) : <Text type="secondary">Activo</Text>,
    },
  ];

  const cardTitleStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderLeft: "3px solid #0071E3",
    paddingLeft: 8,
  };

  return (
    <div>
      {/* Modal de asignación */}
      <LodgerServiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); load(); }}
      />

      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Text type="secondary">
              {loading ? "Cargando..." : `${rows.length} prestación${rows.length !== 1 ? "es" : ""} asignada${rows.length !== 1 ? "s" : ""}`}
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Actualizar</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                + Asignar Prestación
              </Button>
            </Space>
          </Col>
        </Row>

        {error && (
          <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
            action={<Button size="small" onClick={load}>Reintentar</Button>}
          />
        )}

        <Card
          title={<span style={cardTitleStyle}>Prestaciones asignadas</span>}
          style={{ borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <Row gutter={[12, 12]} style={{ marginBottom: 12 }} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder="Buscar por inquilino o prestación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                style={{ width: "100%" }}
                placeholder="Estado"
                value={filterStatus || undefined}
                onChange={(v) => setFilterStatus(v || "")}
                allowClear
                options={[
                  { value: "active", label: "Activo" },
                  { value: "inactive", label: "Inactivo" },
                  { value: "cancelled", label: "Cancelado" },
                ]}
              />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Select
                style={{ width: "100%" }}
                placeholder="Alojamiento"
                value={filterAccommodation || undefined}
                onChange={(v) => setFilterAccommodation(v || "")}
                allowClear
                options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
              />
            </Col>
            {(search || filterStatus || filterAccommodation) && (
              <Col>
                <Button onClick={() => { setSearch(""); setFilterStatus(""); setFilterAccommodation(""); }}>
                  Limpiar
                </Button>
              </Col>
            )}
          </Row>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={loading}
            scroll={{ x: true }}
            size="small"
            pagination={{ pageSize: 25, hideOnSinglePage: true, showSizeChanger: false }}
            locale={{ emptyText: search || filterStatus || filterAccommodation
              ? <EmptyState icon="🔍" title="Sin resultados" description="No hay prestaciones que coincidan con los filtros aplicados" />
              : <EmptyState icon="🔖" title="No hay prestaciones asignadas" description="Asigna la primera prestación a un inquilino" actionLabel="Asignar Prestación" onAction={() => setModalOpen(true)} />
            }}
          />
        </Card>
    </div>
  );
}

// ── Página completa con layout (ruta directa) ─────────────────────────────────
export default function LodgerServicesList() {
  const { userName, companyBranding } = useAdminLayout();
  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <TagOutlined style={{ marginRight: 10 }} />
              Prestaciones a Inquilinos
            </Title>
          </Col>
        </Row>
        <LodgerServicesTab />
      </div>
    </V2Layout>
  );
}
