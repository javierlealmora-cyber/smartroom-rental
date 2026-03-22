// src/pages/v2/admin/tenants/TenantCreate.jsx
// Crear nuevo Inquilino con asignación de habitación — Ant Design + Supabase real

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert, Button, Card, Checkbox, Col, DatePicker, Form, InputNumber,
  Row, Select, Space, Tag, Typography,
} from "antd";
import { ArrowLeftOutlined, CheckOutlined, ClearOutlined, InfoCircleOutlined, SaveOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { createLodger } from "../../../../services/lodgers.service";
import { listAccommodations, listRooms } from "../../../../services/accommodations.service";
import LodgerFormFields from "./components/LodgerFormFields";
import PayersList from "./components/PayersList";

const { Title, Text } = Typography;

const ROOM_STATUS_TAG = { free: "success", occupied: "error", pending_checkout: "warning", maintenance: "default" };
const ROOM_STATUS_LABEL = { free: "Libre", occupied: "Ocupada", pending_checkout: "Pendiente baja", maintenance: "Mantenimiento" };

export default function TenantCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userName, companyBranding, clientAccountId: _clientAccountId } = useAdminLayout();
  const [form] = Form.useForm();

  const preselectedAccId = searchParams.get("acc") || null;
  const preselectedRoomId = searchParams.get("room") || null;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [accommodations, setAccommodations] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(preselectedRoomId);
  const [payUntilEndOfMonth, setPayUntilEndOfMonth] = useState(false);
  const [createdLodgerId, setCreatedLodgerId] = useState(null);
  const [createdLodgerName, setCreatedLodgerName] = useState("");
  const [createdWithRoom, setCreatedWithRoom] = useState(false);

  const loadAccommodations = useCallback(async () => {
    try {
      const accs = await listAccommodations({ status: "active" });
      setAccommodations(accs);
      // Auto-select accommodation from query param
      if (preselectedAccId) {
        form.setFieldValue("accommodation_id", preselectedAccId);
        setLoadingRooms(true);
        listRooms(preselectedAccId)
          .then((rooms) => {
            setAvailableRooms(rooms);
            // Auto-select room from query param
            if (preselectedRoomId) {
              const room = rooms.find((r) => r.id === preselectedRoomId);
              if (room && room.status === "free") {
                setSelectedRoomId(preselectedRoomId);
                form.setFieldValue("room_id", preselectedRoomId);
              }
            }
          })
          .catch(() => setAvailableRooms([]))
          .finally(() => setLoadingRooms(false));
      }
    } catch {
      setAccommodations([]);
    }
  }, [preselectedAccId, preselectedRoomId]);

  useEffect(() => { loadAccommodations(); }, [loadAccommodations]);

  const onAccommodationChange = (accId) => {
    setSelectedRoomId(null);
    form.setFieldValue("room_id", undefined);
    if (!accId) { 
      setAvailableRooms([]);
      // Limpiar campos de asignación cuando se deselecciona alojamiento
      form.setFieldsValue({
        move_in_date: dayjs(),
        deposit_amount: undefined,
        commission_amount: undefined,
        first_month_amount: undefined,
        end_of_month_amount: undefined
      });
      setPayUntilEndOfMonth(false);
      return;
    }
    setLoadingRooms(true);
    listRooms(accId)
      .then(setAvailableRooms)
      .catch(() => setAvailableRooms([]))
      .finally(() => setLoadingRooms(false));
  };

  const clearRoomAssignment = () => {
    form.setFieldsValue({
      accommodation_id: undefined,
      room_id: undefined,
      move_in_date: dayjs(),
      deposit_amount: undefined,
      commission_amount: undefined,
      first_month_amount: undefined,
      end_of_month_amount: undefined
    });
    setSelectedRoomId(null);
    setAvailableRooms([]);
    setPayUntilEndOfMonth(false);
  };

  const backPath = preselectedAccId
    ? `/v2/admin/alojamientos/${preselectedAccId}/habitaciones`
    : "/v2/admin/inquilinos";

  const onFinish = async (values) => {
    setSaving(true);
    setSaveError(null);
    try {
      const fullName = [values.first_name, values.last_name1, values.last_name2]
        .filter(Boolean).join(" ").trim();
      
      const payload = {
        full_name: fullName,
        first_name: values.first_name || null,
        last_name1: values.last_name1 || null,
        last_name2: values.last_name2 || null,
        nickname: values.nickname || null,
        gender: values.gender || null,
        email: values.email,
        phone: values.phone || null,
        document_id: values.document_id || null,
        onboarding_status: selectedRoomId ? "active" : "invited",
      };

      // Solo agregar datos de habitación si se seleccionó una
      if (selectedRoomId && values.accommodation_id) {
        const selectedRoom = availableRooms.find((r) => r.id === selectedRoomId);
        const moveInDate = values.move_in_date.format("YYYY-MM-DD");
        
        payload.room_id = selectedRoomId;
        payload.accommodation_id = values.accommodation_id;
        payload.move_in_date = moveInDate;
        payload.billing_start_date = moveInDate;
        payload.monthly_rent = selectedRoom?.monthly_rent ?? null;
        payload.deposit_amount = values.deposit_amount || 0;
        payload.commission_amount = values.commission_amount || null;
        payload.first_month_amount = payUntilEndOfMonth ? values.end_of_month_amount : (values.first_month_amount || null);
      }

      const newLodger = await createLodger(payload);
      // Guardar ID del inquilino creado para mostrar sección de pagadores
      setCreatedLodgerId(newLodger.id);
      setCreatedLodgerName(fullName);
      setCreatedWithRoom(!!selectedRoomId);
      // Scroll to top para ver la sección de pagadores
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Si ya se creó el inquilino, mostrar sección de pagadores
  if (createdLodgerId) {
    return (
      <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
        <div style={{ marginBottom: 28 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(backPath)}
            style={{ paddingLeft: 0, color: "#6B7280", marginBottom: 10, fontSize: 14 }}
          >
            {preselectedAccId ? "Volver al alojamiento" : "Inquilinos"}
          </Button>
          <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: "-0.5px" }}>
            <CheckOutlined style={{ color: "#52c41a", marginRight: 12 }} />
            Inquilino Registrado Exitosamente
          </Title>
          <Text type="secondary" style={{ fontSize: 15 }}>
            {createdLodgerName} ha sido creado. Ahora puedes añadir los pagadores.
          </Text>
        </div>

        {createdWithRoom ? (
          <>
            <Alert
              message="Gestión de Pagadores"
              description="Añade las personas o entidades que pagarán el alquiler de este inquilino (padre, madre, empresa, etc.). Puedes hacerlo ahora o más tarde desde la edición del inquilino."
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 24 }}
            />

            <Card title="Pagadores" style={{ marginBottom: 24 }}>
              <PayersList 
                lodgerId={createdLodgerId} 
                clientAccountId={_clientAccountId}
                hasRoomAssignment={true}
              />
            </Card>
          </>
        ) : (
          <Alert
            message="Sin habitación asignada"
            description="El inquilino fue creado sin habitación asignada. Debes asignarle una habitación antes de poder añadir pagadores. Ve a la edición del inquilino para asignar una habitación."
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Row justify="end">
          <Col>
            <Space>
              <Button onClick={() => navigate(backPath)}>
                Finalizar
              </Button>
              <Button
                type="primary"
                onClick={() => navigate(`/v2/admin/inquilinos/${createdLodgerId}/editar`)}
              >
                Ir a Editar Inquilino
              </Button>
            </Space>
          </Col>
        </Row>
      </V2Layout>
    );
  }

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header — back top-left, title below */}
      <div style={{ marginBottom: 28 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(backPath)}
          style={{ paddingLeft: 0, color: "#6B7280", marginBottom: 10, fontSize: 14 }}
        >
          {preselectedAccId ? "Volver al alojamiento" : "Inquilinos"}
        </Button>
        <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: "-0.5px" }}>Registrar Inquilino</Title>
        <Text type="secondary" style={{ fontSize: 15 }}>Complete los datos del nuevo inquilino (la asignación de habitación es opcional)</Text>
      </div>

      {saveError && (
        <Alert type="error" message={saveError} showIcon style={{ marginBottom: 16 }} />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          move_in_date: dayjs(),
          send_onboarding: true,
        }}
      >
        <Row gutter={[24, 0]}>
          {/* Datos personales */}
          <Col xs={24} lg={12}>
            <Card title="Datos Personales" style={{ marginBottom: 24 }}>
              <LodgerFormFields />
              
              <Form.Item name="send_onboarding" valuePropName="checked">
                <Checkbox>Enviar email de onboarding al crear el inquilino</Checkbox>
              </Form.Item>

              <Alert
                message="Gestión de Pagadores"
                description="Después de registrar el inquilino, podrás añadir los pagadores (padre, madre, empresa, etc.) en la misma pantalla."
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ marginTop: 16 }}
              />
            </Card>
          </Col>

          {/* Asignación */}
          <Col xs={24} lg={12}>
            <Card 
              title="Asignación de Habitación (Opcional)" 
              extra={
                form.getFieldValue("accommodation_id") && (
                  <Button 
                    type="text" 
                    icon={<ClearOutlined />}
                    onClick={clearRoomAssignment}
                    danger
                    size="small"
                  >
                    Limpiar Asignación
                  </Button>
                )
              }
              style={{ marginBottom: 24 }}
            >
              <Form.Item
                label="Alojamiento"
                name="accommodation_id"
              >
                <Select
                  placeholder="Seleccionar alojamiento..."
                  onChange={onAccommodationChange}
                  options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
                  allowClear
                />
              </Form.Item>

              <Form.Item
                label="Habitación"
                name="room_id"
                rules={[
                  { 
                    required: !!form.getFieldValue("accommodation_id"), 
                    message: "Debes seleccionar una habitación" 
                  }
                ]}
              >
                {loadingRooms ? (
                  <Text type="secondary">Cargando habitaciones...</Text>
                ) : availableRooms.length === 0 ? (
                  <Text type="secondary">
                    {form.getFieldValue("accommodation_id")
                      ? "No hay habitaciones en este alojamiento"
                      : "Selecciona primero un alojamiento"}
                  </Text>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
                    {availableRooms.map((room) => {
                      const isFree = room.status === "free";
                      const isSelected = selectedRoomId === room.id;
                      return (
                        <div
                          key={room.id}
                          onClick={() => { if (isFree) { setSelectedRoomId(room.id); form.setFieldValue("room_id", room.id); } }}
                          style={{
                            padding: "12px 8px",
                            border: `2px solid ${isSelected ? "#111827" : isFree ? "#d9f7be" : "#ffd8bf"}`,
                            borderRadius: 8,
                            backgroundColor: isSelected ? "#f0f0f0" : "#fff",
                            cursor: isFree ? "pointer" : "not-allowed",
                            opacity: isFree ? 1 : 0.5,
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>Hab. {room.number}</div>
                          <Tag color={ROOM_STATUS_TAG[room.status] || "default"} style={{ fontSize: 10 }}>
                            {ROOM_STATUS_LABEL[room.status] || room.status}
                          </Tag>
                          {room.monthly_rent > 0 && (
                            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>{room.monthly_rent}€/mes</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Form.Item>

              <Form.Item
                label="Fecha de Check-In"
                name="move_in_date"
                rules={[
                  { 
                    required: !!form.getFieldValue("accommodation_id"), 
                    message: "La fecha de check-in es obligatoria" 
                  }
                ]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>

              <Form.Item>
                <Checkbox
                  checked={payUntilEndOfMonth}
                  onChange={(e) => setPayUntilEndOfMonth(e.target.checked)}
                >
                  El inquilino va a pagar desde la fecha de Check-in hasta fin de mes
                </Checkbox>
              </Form.Item>

              {payUntilEndOfMonth && (
                <>
                  <Form.Item
                    label="Importe a pagar hasta fin de mes"
                    name="end_of_month_amount"
                    rules={[
                      { 
                        required: payUntilEndOfMonth && !!form.getFieldValue("accommodation_id"), 
                        message: "El importe es obligatorio" 
                      }
                    ]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={2}
                      placeholder="Ej: 450"
                      addonAfter="€"
                    />
                  </Form.Item>

                  <Form.Item label="Fecha del próximo pago">
                    <input
                      type="text"
                      readOnly
                      value={(() => {
                        const moveInDate = form.getFieldValue('move_in_date');
                        if (!moveInDate) return '';
                        const nextMonth = moveInDate.add(1, 'month').startOf('month');
                        return nextMonth.format('DD/MM/YYYY');
                      })()}
                      style={{
                        width: '100%',
                        padding: '4px 11px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        backgroundColor: '#f5f5f5',
                        cursor: 'not-allowed',
                        color: '#000'
                      }}
                    />
                  </Form.Item>
                </>
              )}

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Importe de la Fianza (€)"
                    name="deposit_amount"
                    rules={[
                      { 
                        required: !!form.getFieldValue("accommodation_id"), 
                        message: "El importe de la fianza es obligatorio" 
                      }
                    ]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={2}
                      placeholder="Ej: 900"
                      addonAfter="€"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Importe Comisión (€)" name="commission_amount">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={2}
                      placeholder="Opcional"
                      addonAfter="€"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {!payUntilEndOfMonth && (
                <Form.Item label="Importe Mes Entrada (€)" name="first_month_amount">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    placeholder="Para entradas a mitad de mes (opcional)"
                    addonAfter="€"
                  />
                </Form.Item>
              )}
            </Card>
          </Col>
        </Row>

        {/* Acciones */}
        <Row justify="end">
          <Col>
            <Space>
              <Button onClick={() => navigate(backPath)}>Cancelar</Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
              >
                Registrar Inquilino
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </V2Layout>
  );
}
