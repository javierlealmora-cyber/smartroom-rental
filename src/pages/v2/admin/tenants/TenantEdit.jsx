// src/pages/v2/admin/tenants/TenantEdit.jsx
// Editar Inquilino — Ant Design + manage_lodger Edge Function

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert, Button, Card, Col, DatePicker, Descriptions, Form,
  Input, InputNumber, Modal, Row, Select, Space, Tag, Typography,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined, SwapOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { getLodger, updateLodger, setLodgerStatus, reassignRoom } from "../../../../services/lodgers.service";
import { listAccommodations } from "../../../../services/accommodations.service";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;

const STATUS_OPTIONS = [
  { value: "invited", label: "Invitado" },
  { value: "active", label: "Activo" },
  { value: "pending_checkout", label: "Pendiente de baja" },
  { value: "inactive", label: "Inactivo" },
];

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TenantEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { userName, companyBranding } = useAdminLayout();
  const [form] = Form.useForm();
  const [reassignForm] = Form.useForm();

  const [lodger, setLodger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Reassign modal state
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignBusy, setReassignBusy] = useState(false);
  const [reassignError, setReassignError] = useState(null);
  const [allAccommodations, setAllAccommodations] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, accs] = await Promise.all([
        getLodger(id),
        listAccommodations({ status: "active" }),
      ]);
      setLodger(data);
      setAllAccommodations(accs);
      form.setFieldsValue({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || "",
        document_id: data.document_id || "",
        status: data.status,
      });
      // Auto-open reassign modal if ?action=reassign
      if (searchParams.get("action") === "reassign") {
        setReassignOpen(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, searchParams]);

  useEffect(() => { load(); }, [load]);

  const onAccommodationChange = async (accId) => {
    reassignForm.setFieldValue("new_room_id", undefined);
    setAvailableRooms([]);
    if (!accId) return;
    setLoadingRooms(true);
    try {
      const { data, error: roomsErr } = await supabase
        .from("rooms")
        .select("id, number, type, status")
        .eq("accommodation_id", accId)
        .eq("status", "free")
        .order("number");
      if (roomsErr) throw new Error(roomsErr.message);
      setAvailableRooms(data || []);
    } catch (e) {
      setReassignError(e.message);
    } finally {
      setLoadingRooms(false);
    }
  };

  const onReassignFinish = async (values) => {
    setReassignBusy(true);
    setReassignError(null);
    try {
      await reassignRoom(id, {
        newRoomId: values.new_room_id,
        newAccommodationId: values.new_accommodation_id,
        moveInDate: values.move_in_date.format("YYYY-MM-DD"),
        billingStartDate: values.billing_start_date?.format("YYYY-MM-DD") || values.move_in_date.format("YYYY-MM-DD"),
        monthlyRent: values.monthly_rent || null,
      });
      setReassignOpen(false);
      reassignForm.resetFields();
      setAvailableRooms([]);
      await load();
    } catch (e) {
      setReassignError(e.message);
    } finally {
      setReassignBusy(false);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    setError(null);
    try {
      if (values.status !== lodger.status) {
        await setLodgerStatus(id, values.status);
      }
      await updateLodger(id, {
        full_name: values.full_name,
        phone: values.phone || null,
        document_id: values.document_id || null,
      });
      navigate("/v2/admin/inquilinos");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const activeAssignment = lodger?.assignments?.find((a) => !a.move_out_date);

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Editar Inquilino</Title>
          {lodger && (
            <Text type="secondary">{lodger.full_name} · {lodger.email}</Text>
          )}
        </Col>
        <Col>
          <Space>
            {lodger?.status === "active" && (
              <Button
                icon={<SwapOutlined />}
                onClick={() => { setReassignError(null); setReassignOpen(true); }}
              >
                Cambiar habitación
              </Button>
            )}
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/inquilinos")}>
              Volver
            </Button>
          </Space>
        </Col>
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      )}

      <Row gutter={[20, 20]}>
        {/* Formulario de edición */}
        <Col xs={24} lg={14}>
          <Card title="Datos del Inquilino" size="small" loading={loading}>
            {!loading && (
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Nombre completo" name="full_name"
                      rules={[{ required: true, message: "El nombre es obligatorio" }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Email" name="email">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Teléfono" name="phone">
                      <Input placeholder="+34 600 000 000" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Documento (DNI/NIE/Pasaporte)" name="document_id">
                      <Input placeholder="12345678A" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Estado" name="status"
                      rules={[{ required: true, message: "Selecciona un estado" }]}>
                      <Select options={STATUS_OPTIONS} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row justify="end" style={{ marginTop: 8 }}>
                  <Space>
                    <Button onClick={() => navigate("/v2/admin/inquilinos")}>Cancelar</Button>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                      Guardar Cambios
                    </Button>
                  </Space>
                </Row>
              </Form>
            )}
          </Card>
        </Col>

        {/* Info de asignación actual */}
        <Col xs={24} lg={10}>
          <Card
            title="Habitación Actual"
            size="small"
            loading={loading}
            extra={
              activeAssignment && !loading ? (
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => { setReassignError(null); setReassignOpen(true); }}
                >
                  Cambiar
                </Button>
              ) : null
            }
          >
            {activeAssignment ? (
              <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 110 }}>
                <Descriptions.Item label="Alojamiento">
                  <Text strong>{activeAssignment.accommodation?.name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Habitación">
                  <Tag color="geekblue">Hab. {activeAssignment.room?.number}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Entrada">
                  {fDate(activeAssignment.move_in_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Facturación">
                  {fDate(activeAssignment.billing_start_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Renta">
                  <Text strong style={{ color: "#059669" }}>
                    {activeAssignment.monthly_rent != null
                      ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(activeAssignment.monthly_rent)
                      : "-"}
                    <Text type="secondary" style={{ fontSize: 11 }}>/mes</Text>
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary">Sin habitación asignada actualmente</Text>
            )}
          </Card>

          {lodger && (
            <Card title="Historial de Asignaciones" size="small" style={{ marginTop: 16 }}>
              {(lodger.assignments || []).length === 0 ? (
                <Text type="secondary">Sin historial</Text>
              ) : (
                <Space direction="vertical" style={{ width: "100%" }} size={6}>
                  {lodger.assignments.map((a) => (
                    <div key={a.id} style={{
                      padding: "8px 12px", background: "#f9fafb",
                      borderRadius: 6, borderLeft: `3px solid ${a.move_out_date ? "#d1d5db" : "#059669"}`,
                    }}>
                      <Text strong style={{ fontSize: 12 }}>
                        {a.accommodation?.name} · Hab. {a.room?.number}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {fDate(a.move_in_date)} → {a.move_out_date ? fDate(a.move_out_date) : "Actual"}
                      </Text>
                    </div>
                  ))}
                </Space>
              )}
            </Card>
          )}
        </Col>
      </Row>
      {/* ── Modal cambio de habitación ── */}
      <Modal
        title={<><SwapOutlined style={{ marginRight: 8 }} />Cambiar habitación</>}
        open={reassignOpen}
        onCancel={() => { setReassignOpen(false); reassignForm.resetFields(); setAvailableRooms([]); setReassignError(null); }}
        footer={null}
        width={520}
        destroyOnClose
      >
        {reassignError && (
          <Alert type="error" message={reassignError} showIcon style={{ marginBottom: 16 }} />
        )}

        {/* Asignación actual */}
        {activeAssignment && (
          <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 14px", marginBottom: 20, border: "1px solid #E5E7EB" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Habitación actual:</Text>
            <div>
              <Text strong>{activeAssignment.accommodation?.name}</Text>
              <Tag color="geekblue" style={{ marginLeft: 8 }}>Hab. {activeAssignment.room?.number}</Tag>
            </div>
          </div>
        )}

        <Form
          form={reassignForm}
          layout="vertical"
          onFinish={onReassignFinish}
          initialValues={{ move_in_date: dayjs() }}
        >
          <Form.Item
            label="Nuevo alojamiento"
            name="new_accommodation_id"
            rules={[{ required: true, message: "Selecciona un alojamiento" }]}
          >
            <Select
              showSearch
              placeholder="Seleccionar alojamiento..."
              optionFilterProp="label"
              onChange={onAccommodationChange}
              options={allAccommodations.map((a) => ({ value: a.id, label: a.name }))}
            />
          </Form.Item>

          <Form.Item
            label="Nueva habitación (solo libres)"
            name="new_room_id"
            rules={[{ required: true, message: "Selecciona una habitación" }]}
          >
            <Select
              showSearch
              placeholder={loadingRooms ? "Cargando..." : "Seleccionar habitación..."}
              loading={loadingRooms}
              disabled={availableRooms.length === 0 && !loadingRooms}
              optionFilterProp="label"
              options={availableRooms.map((r) => ({
                value: r.id,
                label: `Hab. ${r.number}${r.type ? ` · ${r.type}` : ""}`,
              }))}
              notFoundContent={loadingRooms ? "Cargando..." : "No hay habitaciones libres"}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Fecha de entrada"
                name="move_in_date"
                rules={[{ required: true, message: "Indica la fecha de entrada" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Inicio facturación" name="billing_start_date">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Igual que entrada" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Renta mensual (€)" name="monthly_rent">
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              precision={2}
              placeholder="Opcional"
              addonAfter="€/mes"
            />
          </Form.Item>

          <Row justify="end">
            <Space>
              <Button onClick={() => { setReassignOpen(false); reassignForm.resetFields(); setAvailableRooms([]); setReassignError(null); }}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" icon={<SwapOutlined />} loading={reassignBusy}>
                Confirmar cambio
              </Button>
            </Space>
          </Row>
        </Form>
      </Modal>
    </V2Layout>
  );
}
