// src/pages/v2/admin/accommodations/AccommodationServices.jsx
// Admin — Servicios disponibles por Alojamiento (accommodation_services)

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Button, Card, Col, Form, InputNumber,
  Popconfirm, Row, Select, Space, Table, Tag, Typography,
} from "antd";
import { ArrowLeftOutlined, PlusOutlined, StopOutlined, CheckOutlined } from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { getAccommodation } from "../../../../services/accommodations.service";
import { listServicesCatalog } from "../../../../services/services.service";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;

function fEur(n) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

export default function AccommodationServices() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const [addForm] = Form.useForm();

  const [accommodation, setAccommodation] = useState(null);
  const [accServices, setAccServices] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [acc, { data: svcData, error: svcErr }, catalogData] = await Promise.all([
        getAccommodation(id),
        supabase
          .from("accommodation_services")
          .select(`
            id, service_id, custom_price, status, created_at,
            service:services_catalog(id, name, unit, unit_price, is_recurring)
          `)
          .eq("accommodation_id", id)
          .order("created_at", { ascending: true }),
        listServicesCatalog({ status: "active" }),
      ]);
      if (svcErr) throw new Error(svcErr.message);
      setAccommodation(acc);
      setAccServices(svcData || []);
      setCatalog(catalogData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onAdd = async (values) => {
    setAdding(true);
    setError(null);
    try {
      const { error: insErr } = await supabase.from("accommodation_services").insert({
        client_account_id: clientAccountId,
        accommodation_id: id,
        service_id: values.service_id,
        custom_price: values.custom_price ?? null,
        status: "active",
      });
      if (insErr) throw new Error(insErr.message);
      addForm.resetFields();
      setShowAddForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const onToggle = async (accSvc) => {
    const next = accSvc.status === "active" ? "inactive" : "active";
    setTogglingId(accSvc.id);
    try {
      const { error: upErr } = await supabase
        .from("accommodation_services")
        .update({ status: next })
        .eq("id", accSvc.id);
      if (upErr) throw new Error(upErr.message);
      setAccServices((prev) => prev.map((s) => s.id === accSvc.id ? { ...s, status: next } : s));
    } catch (e) {
      setError(e.message);
    } finally {
      setTogglingId(null);
    }
  };

  // Servicios del catálogo que aún no están en este alojamiento
  const availableCatalog = catalog.filter(
    (c) => !accServices.some((s) => s.service_id === c.id && s.status === "active")
  );

  const columns = [
    {
      title: "Servicio",
      key: "service",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.service?.name || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {r.service?.is_recurring ? "Recurrente" : "Puntual"} · {r.service?.unit}
          </Text>
        </Space>
      ),
    },
    {
      title: "Precio base",
      key: "base_price",
      render: (_, r) => <Text type="secondary">{fEur(r.service?.unit_price)}</Text>,
    },
    {
      title: "Precio personalizado",
      dataIndex: "custom_price",
      key: "custom_price",
      render: (v) => v != null ? <Text strong style={{ color: "#059669" }}>{fEur(v)}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Precio efectivo",
      key: "effective_price",
      render: (_, r) => <Text strong>{fEur(r.custom_price ?? r.service?.unit_price)}</Text>,
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (v) => <Tag color={v === "active" ? "success" : "default"}>{v === "active" ? "Activo" : "Inactivo"}</Tag>,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, r) => (
        <Popconfirm
          title={r.status === "active" ? "¿Desactivar este servicio en el alojamiento?" : "¿Reactivar este servicio?"}
          onConfirm={() => onToggle(r)}
          okText="Sí" cancelText="No"
        >
          <Button
            size="small"
            icon={r.status === "active" ? <StopOutlined /> : <CheckOutlined />}
            danger={r.status === "active"}
            loading={togglingId === r.id}
          >
            {r.status === "active" ? "Desactivar" : "Reactivar"}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Servicios del Alojamiento</Title>
          {accommodation && <Text type="secondary">{accommodation.name}</Text>}
        </Col>
        <Col>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddForm((v) => !v)}
              disabled={availableCatalog.length === 0}
            >
              Añadir Servicio
            </Button>
            <Button icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/v2/admin/alojamientos/${id}/editar`)}>
              Volver
            </Button>
          </Space>
        </Col>
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          closable onClose={() => setError(null)} />
      )}

      {/* Formulario añadir servicio */}
      {showAddForm && (
        <Card size="small" style={{ marginBottom: 16, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
          <Text strong style={{ display: "block", marginBottom: 12 }}>Añadir Servicio al Alojamiento</Text>
          <Form form={addForm} layout="inline" onFinish={onAdd}>
            <Form.Item name="service_id" rules={[{ required: true, message: "Selecciona un servicio" }]}>
              <Select
                style={{ width: 260 }}
                placeholder="Seleccionar servicio del catálogo..."
                options={availableCatalog.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${fEur(c.unit_price)}/${c.unit})`,
                }))}
              />
            </Form.Item>
            <Form.Item name="custom_price" label="Precio personalizado">
              <InputNumber min={0} precision={2} addonAfter="€" style={{ width: 140 }}
                placeholder="Opcional" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={adding}>Añadir</Button>
                <Button onClick={() => { setShowAddForm(false); addForm.resetFields(); }}>Cancelar</Button>
              </Space>
            </Form.Item>
          </Form>
          {availableCatalog.length === 0 && (
            <Text type="secondary">Todos los servicios del catálogo ya están añadidos a este alojamiento.</Text>
          )}
        </Card>
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={accServices}
        loading={loading}
        scroll={{ x: true }}
        size="small"
        pagination={false}
        locale={{ emptyText: <EmptyState icon="🔧" title="Sin servicios configurados" description="Añade servicios del catálogo a este alojamiento para asignarlos a inquilinos" /> }}
      />
    </V2Layout>
  );
}
