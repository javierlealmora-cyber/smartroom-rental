// src/pages/v2/admin/tenants/TenantDetail.jsx
// Vista de detalle del inquilino en modo solo lectura con enlaces para editar

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Avatar, Button, Card, Col, DatePicker, Descriptions, Form, InputNumber, message, Modal, Row, Space, Tag, Typography, Skeleton
} from "antd";
import {
  ArrowLeftOutlined, EditOutlined, SaveOutlined, UserOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { getLodger } from "../../../../services/lodgers.service";
import PayersList from "./components/PayersList";

const { Title, Text } = Typography;

const STATUS_COLOR = {
  active: "#059669",
  invited: "#3B82F6",
  pending_checkout: "#F59E0B",
  inactive: "#9CA3AF"
};

const STATUS_LABEL = {
  active: "Activo",
  invited: "Invitado",
  pending_checkout: "Pendiente baja",
  inactive: "Inactivo"
};

const ROOM_STATUS_COLOR = {
  available: "success",
  occupied: "processing",
  maintenance: "warning",
  reserved: "default"
};

const ROOM_STATUS_LABEL = {
  available: "Disponible",
  occupied: "Ocupada",
  maintenance: "Mantenimiento",
  reserved: "Reservada"
};

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fCurrency(v) {
  if (v == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}

export default function TenantDetail() {
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [lodger, setLodger] = useState(null);
  const [error, setError] = useState(null);
  const [editAssignmentOpen, setEditAssignmentOpen] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentForm] = Form.useForm();

  useEffect(() => {
    if (clientAccountId) {
      loadLodger();
    }
  }, [id, clientAccountId]);

  async function loadLodger() {
    try {
      setLoading(true);
      setError(null);
      const data = await getLodger(id, clientAccountId);
      console.log("Datos del inquilino cargados:", data); // Debug
      setLodger(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const activeAssignment = lodger?.assignments?.find((a) => !a.move_out_date);
  const hasRoomAssignment = !!activeAssignment;

  const openEditAssignment = () => {
    if (!activeAssignment) return;
    assignmentForm.setFieldsValue({
      move_in_date: activeAssignment.move_in_date ? dayjs(activeAssignment.move_in_date) : null,
      move_out_date: activeAssignment.move_out_date ? dayjs(activeAssignment.move_out_date) : null,
      billing_start_date: activeAssignment.billing_start_date ? dayjs(activeAssignment.billing_start_date) : null,
      monthly_rent: activeAssignment.monthly_rent || 0,
      deposit_amount: activeAssignment.deposit_amount || 0,
      commission_amount: activeAssignment.commission_amount || 0,
      first_month_amount: activeAssignment.first_month_amount || 0,
    });
    setEditAssignmentOpen(true);
  };

  const onSaveAssignment = async (values) => {
    setSavingAssignment(true);
    try {
      const { supabase } = await import("../../../../services/supabaseClient");
      const { error } = await supabase
        .from("lodger_room_assignments")
        .update({
          move_in_date: values.move_in_date ? values.move_in_date.format("YYYY-MM-DD") : null,
          move_out_date: values.move_out_date ? values.move_out_date.format("YYYY-MM-DD") : null,
          billing_start_date: values.billing_start_date ? values.billing_start_date.format("YYYY-MM-DD") : null,
          monthly_rent: values.monthly_rent || 0,
          deposit_amount: values.deposit_amount || 0,
          commission_amount: values.commission_amount || 0,
          first_month_amount: values.first_month_amount || 0,
        })
        .eq("id", activeAssignment.id)
        .eq("client_account_id", clientAccountId);

      if (error) throw new Error(error.message);
      
      message.success("Asignación actualizada correctamente");
      setEditAssignmentOpen(false);
      loadLodger();
    } catch (err) {
      message.error(`Error al guardar: ${err.message}`);
    } finally {
      setSavingAssignment(false);
    }
  };

  if (loading) {
    return (
      <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
        <Skeleton active />
      </V2Layout>
    );
  }

  if (error) {
    return (
      <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
        <Alert type="error" description={error} showIcon />
      </V2Layout>
    );
  }

  if (!lodger) {
    return (
      <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
        <Alert type="warning" description="Inquilino no encontrado" showIcon />
      </V2Layout>
    );
  }

  const lodgerName = [lodger.first_name, lodger.last_name1, lodger.last_name2].filter(Boolean).join(" ") || lodger.email;
  
  // Obtener imagen de persona según género
  const getPersonImage = () => {
    if (lodger.gender === "female") {
      return "/icons/inquilina-card-model.png";
    } else if (lodger.gender === "male") {
      return "/icons/inquilino-card-model.png";
    }
    return "/icons/inquilino-icono-model.png"; // Icono genérico
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Detalle del Inquilino</Title>
          <Space size={12} align="center" style={{ marginTop: 8 }}>
            <img 
              src={getPersonImage()}
              alt="Inquilino"
              style={{ width: 48, height: 48, objectFit: "contain" }}
            />
            <div>
              <div>
                <Text strong style={{ fontSize: 15 }}>{lodgerName}</Text>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>{lodger.email}</Text>
              </div>
            </div>
            <Tag color={STATUS_COLOR[lodger.onboarding_status] || "default"}>
              {STATUS_LABEL[lodger.onboarding_status] || lodger.onboarding_status}
            </Tag>
          </Space>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/inquilinos")}>
            Volver
          </Button>
        </Col>
      </Row>

        {/* Datos del Inquilino */}
        <Card
          title="Datos del Inquilino"
          size="small"
          style={{ marginBottom: 16, borderRadius: 12 }}
          extra={
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/v2/admin/inquilinos/${id}/editar`)}
            >
              Editar
            </Button>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 150 }} colon={false}>
                <Descriptions.Item label="Nombre">
                  <Text strong>{lodger.first_name || "-"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Primer apellido">
                  <Text strong>{lodger.last_name1 || "-"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Segundo apellido">
                  {lodger.last_name2 || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="¿Cómo quieres que te llamen?">
                  {lodger.nickname || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {lodger.email || "-"}
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col xs={24} lg={12}>
              <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 150 }} colon={false}>
                <Descriptions.Item label="Teléfono">
                  {lodger.phone || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Documento">
                  {lodger.document_type ? `${lodger.document_type.toUpperCase()}: ${lodger.document_id || "-"}` : (lodger.document_id || "-")}
                </Descriptions.Item>
                <Descriptions.Item label="Género">
                  {lodger.gender || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Estado">
                  {lodger.onboarding_status || "-"}
                </Descriptions.Item>
              </Descriptions>
            </Col>
          </Row>

          {/* Dirección */}
          <Row gutter={[16, 0]} style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
            <Col xs={24}>
              <Text strong style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 12 }}>Dirección</Text>
              <Row gutter={[16, 8]}>
                <Col xs={24} lg={12}>
                  <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 150 }} colon={false}>
                    <Descriptions.Item label="Calle">
                      {lodger.address_street || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Número">
                      {lodger.address_number || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Piso / Puerta">
                      {lodger.address_floor || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Código Postal">
                      {lodger.address_postal_code || "-"}
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col xs={24} lg={12}>
                  <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 150 }} colon={false}>
                    <Descriptions.Item label="Localidad">
                      {lodger.address_city || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Provincia">
                      {lodger.address_province || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="País">
                      {lodger.address_country || "-"}
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {/* Habitación Actual */}
        <Card
          title="Habitación Actual"
          size="small"
          style={{ marginBottom: 16, borderRadius: 12 }}
          extra={
            activeAssignment ? (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={openEditAssignment}
              >
                Editar
              </Button>
            ) : null
          }
        >
          {activeAssignment ? (
            <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 150 }} colon={false}>
              <Descriptions.Item label="Alojamiento">
                <Text strong>{activeAssignment.accommodation?.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Habitación">
                <Space size={6}>
                  <Tag color="geekblue">Hab. {activeAssignment.room?.number}</Tag>
                  {activeAssignment.room?.status && (
                    <Tag color={ROOM_STATUS_COLOR[activeAssignment.room.status] || "default"}>
                      {ROOM_STATUS_LABEL[activeAssignment.room.status] || activeAssignment.room.status}
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Fecha de Check-In">
                {fDate(activeAssignment.move_in_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha primer pago">
                {fDate(activeAssignment.billing_start_date)}
              </Descriptions.Item>
              <Descriptions.Item label="Renta">
                <Text strong style={{ color: "#059669" }}>
                  {fCurrency(activeAssignment.monthly_rent)}
                  <Text type="secondary" style={{ fontSize: 11 }}>/mes</Text>
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Importe hasta fin de mes">
                {activeAssignment.pay_until_end_of_month && activeAssignment.amount_until_end_of_month != null ? (
                  <Text strong style={{ color: "#059669" }}>
                    {fCurrency(activeAssignment.amount_until_end_of_month)}
                  </Text>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Importe de la Fianza">
                {activeAssignment.deposit_amount != null ? (
                  <Text strong style={{ color: "#d97706" }}>
                    {fCurrency(activeAssignment.deposit_amount)}
                  </Text>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Importe de Comisión">
                {activeAssignment.commission_amount != null ? (
                  <Text strong style={{ color: "#7c3aed" }}>
                    {fCurrency(activeAssignment.commission_amount)}
                  </Text>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Text type="secondary">Sin habitación asignada actualmente</Text>
          )}
        </Card>

        {/* Historial de Asignaciones */}
        <Card title="Historial de Asignaciones" size="small" style={{ marginBottom: 16, borderRadius: 12 }}>
          {(lodger.assignments || []).length === 0 ? (
            <Text type="secondary">Sin historial</Text>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {lodger.assignments.map((asgn) => (
                <div
                  key={asgn.id}
                  style={{
                    background: "#F9FAFB",
                    borderRadius: 8,
                    padding: "10px 14px",
                    border: "1px solid #E5E7EB"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <Text strong>{asgn.accommodation?.name}</Text>
                      <Tag color="geekblue" style={{ marginLeft: 8 }}>
                        Hab. {asgn.room?.number}
                      </Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {fDate(asgn.move_in_date)} → {asgn.move_out_date ? fDate(asgn.move_out_date) : "Actual"}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pagadores */}
        {clientAccountId && (
          <Card title="Gestión de Pagadores" size="small" style={{ marginBottom: 16, borderRadius: 12 }}>
            <PayersList
              lodgerId={id}
              clientAccountId={clientAccountId}
              hasRoomAssignment={hasRoomAssignment}
            />
          </Card>
        )}

      {/* Modal de Edición de Asignación */}
      <Modal
        title="Editar Asignación de Habitación"
        open={editAssignmentOpen}
        onCancel={() => setEditAssignmentOpen(false)}
        footer={null}
        width={700}
      >
        <Form
          form={assignmentForm}
          layout="vertical"
          onFinish={onSaveAssignment}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Fecha de Check-In"
                name="move_in_date"
                rules={[{ required: true, message: "La fecha de check-in es obligatoria" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Fecha de Check-Out"
                name="move_out_date"
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Opcional" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Fecha del primer pago de la mensualidad"
                name="billing_start_date"
                rules={[{ required: true, message: "La fecha del primer pago es obligatoria" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Renta Mensual"
                name="monthly_rent"
                rules={[{ required: true, message: "La renta mensual es obligatoria" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  addonAfter="€"
                  placeholder="Ej: 450"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Importe hasta fin de mes"
                name="first_month_amount"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  addonAfter="€"
                  placeholder="Opcional"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Importe de la Fianza"
                name="deposit_amount"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  addonAfter="€"
                  placeholder="Ej: 900"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Importe de Comisión"
                name="commission_amount"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  addonAfter="€"
                  placeholder="Opcional"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row justify="end" style={{ marginTop: 16 }}>
            <Space>
              <Button onClick={() => setEditAssignmentOpen(false)}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingAssignment}>
                Guardar Cambios
              </Button>
            </Space>
          </Row>
        </Form>
      </Modal>
    </V2Layout>
  );
}
