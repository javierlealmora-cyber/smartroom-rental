// src/pages/v2/admin/accommodations/AccommodationCreate.jsx
// Crear nuevo Alojamiento con habitaciones dinámicas — Ant Design + Supabase real

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Col, Form, Input, InputNumber,
  Row, Select, Space, Steps, Table, Typography,
} from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, SaveOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listEntities } from "../../../../services/entities.service";
import { createAccommodation } from "../../../../services/accommodations.service";

const { Title, Text } = Typography;

export default function AccommodationCreate() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [ownerEntities, setOwnerEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [step1Values, setStep1Values] = useState(null);

  const loadOwners = useCallback(async () => {
    setLoadingEntities(true);
    try {
      const owners = await listEntities({ type: "owner" });
      setOwnerEntities(owners.filter((e) => e.status === "active"));
    } catch {
      setOwnerEntities([]);
    } finally {
      setLoadingEntities(false);
    }
  }, []);

  useEffect(() => { loadOwners(); }, [loadOwners]);

  const onStep1Finish = (values) => {
    setStep1Values(values);
    const generated = Array.from({ length: values.numRooms }, (_, i) => ({
      key: `r-${i + 1}`,
      number: String(i + 1).padStart(2, "0"),
      monthly_rent: 450,
      square_meters: null,
      bathroom_type: "shared",
      kitchen_type: "shared",
      notes: "",
    }));
    setRooms(generated);
    setCurrentStep(1);
  };

  const updateRoom = (key, field, value) => {
    setRooms((prev) => prev.map((r) => r.key === key ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async () => {
    const invalid = rooms.filter((r) => !String(r.number).trim());
    if (invalid.length > 0) { setSaveError("Todas las habitaciones deben tener número"); return; }
    setSaving(true);
    setSaveError(null);
    try {
      await createAccommodation(
        {
          client_account_id: clientAccountId,
          name: step1Values.name,
          address_line1: step1Values.address_line1 || null,
          postal_code: step1Values.postal_code || null,
          city: step1Values.city || null,
          province: step1Values.province || null,
          country: "España",
          owner_entity_id: step1Values.owner_entity_id,
          status: "active",
        },
        rooms.map(({ key: _k, ...r }) => ({
          number: String(r.number),
          monthly_rent: r.monthly_rent || 0,
          square_meters: r.square_meters || null,
          bathroom_type: r.bathroom_type,
          kitchen_type: r.kitchen_type,
          notes: r.notes || null,
          status: "free",
        }))
      );
      navigate("/v2/admin/alojamientos");
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const roomColumns = [
    {
      title: "Nº", dataIndex: "number", width: 80,
      render: (v, rec) => <Input size="small" value={v} onChange={(e) => updateRoom(rec.key, "number", e.target.value)} />,
    },
    {
      title: "Precio/mes", dataIndex: "monthly_rent", width: 130,
      render: (v, rec) => <InputNumber size="small" style={{ width: "100%" }} value={v} min={0} step={10} addonAfter="€" onChange={(val) => updateRoom(rec.key, "monthly_rent", val)} />,
    },
    {
      title: "m²", dataIndex: "square_meters", width: 100,
      render: (v, rec) => <InputNumber size="small" style={{ width: "100%" }} value={v} min={1} addonAfter="m²" onChange={(val) => updateRoom(rec.key, "square_meters", val)} />,
    },
    {
      title: "Baño", dataIndex: "bathroom_type", width: 130,
      render: (v, rec) => (
        <Select size="small" style={{ width: "100%" }} value={v} onChange={(val) => updateRoom(rec.key, "bathroom_type", val)}
          options={[{ value: "shared", label: "Compartido" }, { value: "private", label: "Privado" }, { value: "suite", label: "Suite" }]} />
      ),
    },
    {
      title: "Cocina", dataIndex: "kitchen_type", width: 130,
      render: (v, rec) => (
        <Select size="small" style={{ width: "100%" }} value={v} onChange={(val) => updateRoom(rec.key, "kitchen_type", val)}
          options={[{ value: "shared", label: "Compartida" }, { value: "private", label: "Privada" }, { value: "suite", label: "Suite" }]} />
      ),
    },
    {
      title: "Notas", dataIndex: "notes",
      render: (v, rec) => <Input size="small" value={v} placeholder="Opcional..." onChange={(e) => updateRoom(rec.key, "notes", e.target.value)} />,
    },
  ];

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Nuevo Alojamiento</Title>
          <Text type="secondary">
            {currentStep === 0 ? "Paso 1 de 2: Datos del alojamiento" : "Paso 2 de 2: Configurar habitaciones"}
          </Text>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/alojamientos")}>Volver</Button>
        </Col>
      </Row>

      <Steps
        current={currentStep}
        style={{ marginBottom: 32, maxWidth: 400 }}
        items={[{ title: "Datos básicos" }, { title: "Habitaciones" }]}
      />

      {/* Paso 1: Datos básicos */}
      {currentStep === 0 && (
        <Card>
          {!loadingEntities && ownerEntities.length === 0 && (
            <Alert
              type="warning"
              showIcon
              message="No hay entidades propietarias activas"
              description={
                <span>
                  Debes crear al menos una <strong>Entidad Propietaria</strong> antes de añadir un alojamiento.{" "}
                  <a href="/v2/admin/entidades/nueva">Crear entidad →</a>
                </span>
              }
              style={{ marginBottom: 24 }}
            />
          )}
          <Form form={form} layout="vertical" onFinish={onStep1Finish}>
            <Row gutter={[16, 0]}>
              {/* Entidad Propietaria — PRIMER CAMPO OBLIGATORIO según jerarquía del sistema */}
              <Col xs={24}>
                <Form.Item
                  label="Entidad Propietaria"
                  name="owner_entity_id"
                  rules={[{ required: true, message: "La entidad propietaria es obligatoria" }]}
                  extra="El alojamiento queda vinculado a esta entidad propietaria"
                >
                  <Select
                    placeholder="Seleccionar entidad propietaria..."
                    loading={loadingEntities}
                    disabled={ownerEntities.length === 0}
                    options={ownerEntities.map((e) => ({ value: e.id, label: `${e.legal_name} (${e.tax_id || e.type})` }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Nombre del alojamiento" name="name" rules={[{ required: true, message: "El nombre es obligatorio" }]}>
                  <Input placeholder="Ej: Residencia Central, Piso Chamberí..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Número de habitaciones" name="numRooms"
                  rules={[{ required: true, message: "Indica al menos 1 habitación" }, { type: "number", min: 1, max: 100, message: "Entre 1 y 100 habitaciones" }]}
                  extra="Se generarán automáticamente en el siguiente paso"
                >
                  <InputNumber style={{ width: "100%" }} min={1} max={100} placeholder="8" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Dirección" name="address_line1">
                  <Input placeholder="Calle, número..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="Código Postal" name="postal_code">
                  <Input placeholder="28001" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="Ciudad" name="city">
                  <Input placeholder="Madrid" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="Provincia" name="province">
                  <Input placeholder="Madrid" />
                </Form.Item>
              </Col>
            </Row>
            <Row justify="end" style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
              <Space>
                <Button onClick={() => navigate("/v2/admin/alojamientos")}>Cancelar</Button>
                <Button type="primary" htmlType="submit" icon={<ArrowRightOutlined />}>Continuar</Button>
              </Space>
            </Row>
          </Form>
        </Card>
      )}

      {/* Paso 2: Habitaciones */}
      {currentStep === 1 && (
        <Card
          title={
            <Space>
              <Text strong>{step1Values?.name}</Text>
              <Text type="secondary">· {rooms.length} habitaciones</Text>
            </Space>
          }
          extra={<Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(0)}>Volver</Button>}
        >
          {saveError && <Alert type="error" message={saveError} showIcon style={{ marginBottom: 16 }} />}
          <Table
            dataSource={rooms}
            columns={roomColumns}
            pagination={false}
            scroll={{ x: true, y: 400 }}
            size="small"
            style={{ marginBottom: 24 }}
          />
          <Row justify="end">
            <Space>
              <Button onClick={() => navigate("/v2/admin/alojamientos")}>Cancelar</Button>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSubmit}>
                Crear Alojamiento
              </Button>
            </Space>
          </Row>
        </Card>
      )}
    </V2Layout>
  );
}
