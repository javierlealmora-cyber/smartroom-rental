// src/pages/v2/admin/tenants/TenantCreate.jsx
// Alta de inquilino en 2 pasos: 1) Datos personales → 2) Asignación de habitación

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert, Button, Card, Checkbox, Col, Divider, Form, Row, Space, Steps, Typography,
} from "antd";
import { ArrowLeftOutlined, CheckOutlined, InfoCircleOutlined, SaveOutlined, UserAddOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { createLodger, assignRoomToLodger } from "../../../../services/lodgers.service";
import { listAccommodations } from "../../../../services/accommodations.service";
import LodgerFormFields from "./components/LodgerFormFields";
import PayersList from "./components/PayersList";
import RoomAssignmentForm from "./components/RoomAssignmentForm";

const { Title, Text } = Typography;

export default function TenantCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const preselectedAccId  = searchParams.get("acc")  || null;
  const preselectedRoomId = searchParams.get("room") || null;

  // ── Stepper ──────────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);

  // ── Paso 1: datos personales ──────────────────────────────────────────────────
  const [personalForm] = Form.useForm();
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalError, setPersonalError]   = useState(null);
  const [createdLodgerId,   setCreatedLodgerId]   = useState(null);
  const [createdLodgerName, setCreatedLodgerName] = useState("");

  // ── Paso 2: asignación habitación ─────────────────────────────────────────────
  const [assignForm] = Form.useForm();
  const [savingAssign, setSavingAssign]     = useState(false);
  const [assignError,  setAssignError]      = useState(null);
  const [accommodations,  setAccommodations]  = useState([]);
  const [selectedRoomId,  setSelectedRoomId]  = useState(preselectedRoomId);
  const [availableRooms,  setAvailableRooms]  = useState([]);
  const [payUntilEndOfMonth, setPayUntilEndOfMonth] = useState(false);
  const [assignedWithRoom, setAssignedWithRoom] = useState(false);

  const backPath = preselectedAccId
    ? `/v2/admin/alojamientos/${preselectedAccId}/habitaciones`
    : "/v2/admin/inquilinos";

  const loadAccommodations = useCallback(async () => {
    try {
      const accs = await listAccommodations({ status: "active" });
      setAccommodations(accs);
      if (preselectedAccId) {
        assignForm.setFieldValue("accommodation_id", preselectedAccId);
      }
    } catch {
      setAccommodations([]);
    }
  }, [preselectedAccId, assignForm]);

  useEffect(() => { loadAccommodations(); }, [loadAccommodations]);

  // ── Paso 1: registrar datos personales ───────────────────────────────────────
  const handlePersonalSubmit = async (values) => {
    setSavingPersonal(true);
    setPersonalError(null);
    try {
      const fullName = [values.first_name, values.last_name1, values.last_name2]
        .filter(Boolean).join(" ").trim();

      const payload = {
        full_name:            fullName,
        first_name:           values.first_name           || null,
        last_name1:           values.last_name1            || null,
        last_name2:           values.last_name2            || null,
        nickname:             values.nickname              || null,
        gender:               values.gender               || null,
        email:                values.email,
        phone:                values.phone                || null,
        document_id:          values.document_id          || null,
        address_street:       values.address_street       || null,
        address_number:       values.address_number       || null,
        address_floor:        values.address_floor        || null,
        address_postal_code:  values.address_postal_code  || null,
        address_city:         values.address_city         || null,
        address_province:     values.address_province     || null,
        address_country:      values.address_country      || null,
        onboarding_status:    "invited",
      };

      const newLodger = await createLodger(payload);
      setCreatedLodgerId(newLodger.id);
      setCreatedLodgerName(fullName);
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const raw = e.message || "";
      let friendly = raw;
      if (raw.includes("already registered") || raw.includes("already been registered") || raw.includes("User already registered") || raw.includes("duplicate") || raw.includes("auth user")) {
        friendly = `El email ${values.email} ya está registrado en el sistema. Usa un email diferente o busca al inquilino en la lista de inquilinos.`;
      }
      setPersonalError(friendly);
    } finally {
      setSavingPersonal(false);
    }
  };

  // ── Paso 2: asignar habitación ────────────────────────────────────────────────
  const handleAssignSubmit = async (values) => {
    if (!selectedRoomId || !values.accommodation_id) {
      setAssignError("Selecciona un alojamiento y una habitación.");
      return;
    }
    setSavingAssign(true);
    setAssignError(null);
    try {
      const selectedRoom   = availableRooms.find(r => r.id === selectedRoomId);
      const moveInDate     = values.move_in_date.format("YYYY-MM-DD");
      const billingStart   = values.move_in_date.add(1, "month").startOf("month").format("YYYY-MM-DD");

      // REQ-015: si el admin activó "Habitación compartida", adjuntar acompañante
      // El RoomAssignmentForm escribe los campos anidados bajo values.accompanist.*
      const accompanist = values.accompanist && typeof values.accompanist === "object"
        && (values.accompanist.first_name || values.accompanist.last_name1)
        ? values.accompanist
        : undefined;

      await assignRoomToLodger(createdLodgerId, {
        roomId:                   selectedRoomId,
        accommodationId:          values.accommodation_id,
        moveInDate:               moveInDate,
        billingStartDate:         billingStart,
        monthlyRent:              selectedRoom?.monthly_rent ?? null,
        depositAmount:            values.deposit_amount            || 0,
        commissionAmount:         values.commission_amount         || null,
        firstMonthAmount:         payUntilEndOfMonth ? (values.first_month_amount || null) : null,
        servicesProvisionAmount:  values.services_provision_amount || null,
        accompanist,
      });

      setAssignedWithRoom(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setAssignError(e.message);
    } finally {
      setSavingAssign(false);
    }
  };

  const handleSkip = () => {
    navigate(`/v2/admin/inquilinos/${createdLodgerId}/detalle`);
  };

  const cardTitleStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderLeft: "3px solid #0071E3",
    paddingLeft: 8,
  };

  // ── Pantalla final tras asignar habitación ────────────────────────────────────
  if (assignedWithRoom) {
    return (
      <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                <CheckOutlined style={{ color: "#52c41a", marginRight: 10 }} />
                Inquilino Registrado Exitosamente
              </Title>
              <Text type="secondary">
                {createdLodgerName} ha sido creado y tiene habitación asignada. Ahora puedes añadir los pagadores.
              </Text>
            </Col>
          </Row>

          <Alert
            message="Gestión de Pagadores"
            description="Añade las personas o entidades que pagarán el alquiler de este inquilino (padre, madre, empresa, etc.). Puedes hacerlo ahora o más tarde desde el detalle del inquilino."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 24 }}
          />

          <Card
            title={<span style={cardTitleStyle}>Pagadores</span>}
            style={{ borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 24 }}
          >
            <PayersList
              lodgerId={createdLodgerId}
              clientAccountId={clientAccountId}
              hasRoomAssignment={true}
            />
          </Card>

          <Row justify="end" style={{ marginTop: 16 }}>
            <Space>
              <Button onClick={() => navigate(backPath)}>Finalizar</Button>
              <Button type="primary" onClick={() => navigate(`/v2/admin/inquilinos/${createdLodgerId}/detalle`)}>
                Ver detalle del inquilino
              </Button>
            </Space>
          </Row>
        </div>
      </V2Layout>
    );
  }

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <UserAddOutlined style={{ marginRight: 10 }} />
              {currentStep === 0 ? "Registro nuevo Inquilino" : "Asignación de habitación"}
            </Title>
            <Text type="secondary">
              {currentStep === 0
                ? "Complete los datos del nuevo inquilino"
                : `${createdLodgerName} — selecciona la habitación (puedes saltar este paso)`}
            </Text>
          </Col>
        </Row>

        {/* ── Steps ────────────────────────────────────────────────────── */}
        <Steps
          current={currentStep}
          style={{ margin: "24px 0" }}
          items={[{ title: "Datos del Inquilino" }, { title: "Asignar Habitación" }]}
        />

        {/* ── PASO 0: datos personales ── */}
        {currentStep === 0 && (
          <Card title={<span style={cardTitleStyle}>Datos del inquilino</span>} style={{ borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <Form
              form={personalForm}
              layout="vertical"
              onFinish={handlePersonalSubmit}
              initialValues={{ send_onboarding: true }}
            >
              {personalError && (
                <Alert type="error" message={personalError} showIcon style={{ marginBottom: 16 }} />
              )}

              {/* Sección superior: campos personales + imagen derecha */}
              <Row gutter={[48, 0]} align="top">
                {/* Campos personales */}
                <Col xs={24} md={18}>
                  <Divider orientation="left" style={{ fontSize: 12, color: "#6B7280", marginTop: 0 }}>
                    Información personal
                  </Divider>
                  <LodgerFormFields section="personal" />
                </Col>

                {/* Imagen — oculta en móvil, visible desde md */}
                <Col xs={0} md={6} style={{ paddingTop: "8%" }}>
                  <img
                    src="/images/inquilino-en-registro.webp"
                    alt="Nuevo inquilino"
                    style={{ width: "100%", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.12))" }}
                  />
                </Col>
              </Row>

              {/* Sección dirección */}
              <Divider orientation="left" style={{ fontSize: 12, color: "#6B7280" }}>
                Dirección
              </Divider>
              <LodgerFormFields section="address" />

              {/* Checkbox + alert */}
              <Form.Item name="send_onboarding" valuePropName="checked" style={{ marginTop: 4 }}>
                <Checkbox>Enviar email de onboarding al crear el inquilino</Checkbox>
              </Form.Item>

              <Alert
                message="Gestión de Pagadores"
                description="Después de registrar el inquilino, podrás añadir los pagadores (padre, madre, empresa, etc.) en la misma pantalla."
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ marginTop: 12, marginBottom: 24 }}
              />

              <Row justify="end" style={{ marginTop: 16 }}>
                <Space>
                  <Button onClick={() => navigate(backPath)}>Volver</Button>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingPersonal}>
                    Registrar Inquilino →
                  </Button>
                </Space>
              </Row>
            </Form>
          </Card>
        )}

        {/* ── PASO 1: asignación de habitación ── */}
        {currentStep === 1 && (
          <Card title={<span style={cardTitleStyle}>Asignar habitación</span>} style={{ borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <Form
              form={assignForm}
              layout="vertical"
              onFinish={handleAssignSubmit}
              initialValues={{ move_in_date: dayjs() }}
            >
              {assignError && (
                <Alert type="error" message={assignError} showIcon style={{ marginBottom: 16 }} />
              )}

              <Row gutter={[40, 0]} align="top">
                {/* Formulario */}
                <Col xs={24} md={18}>
                  {/* Banner: inquilino + nota opcional */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 16px", marginBottom: 20 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{createdLodgerName}</span>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>Opcional — puedes saltar este paso</span>
                  </div>

                  <RoomAssignmentForm
                    form={assignForm}
                    accommodations={accommodations}
                    preselectedAccId={preselectedAccId}
                    preselectedRoomId={preselectedRoomId}
                    required={false}
                    allowAccommodationChange={true}
                    onRoomSelect={(roomId) => setSelectedRoomId(roomId)}
                    onRoomsChange={(rooms) => setAvailableRooms(rooms)}
                    onPayUntilEndOfMonthChange={(checked) => setPayUntilEndOfMonth(checked)}
                  />
                </Col>

                {/* Imagen — oculta en móvil, visible desde md */}
                <Col xs={0} md={6} style={{ display: "flex", justifyContent: "center" }}>
                  <img
                    src="/images/Habitación sin Inquilino en la cama.png"
                    alt="Habitación disponible"
                    style={{ width: "130%", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.12))" }}
                  />
                </Col>
              </Row>

              <Row justify="end" style={{ marginTop: 16 }}>
                <Space>
                  <Button onClick={handleSkip}>Saltar — sin habitación</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<UserAddOutlined />}
                    loading={savingAssign}
                    disabled={!selectedRoomId}
                  >
                    Asignar Habitación →
                  </Button>
                </Space>
              </Row>
            </Form>
          </Card>
        )}

      </div>
    </V2Layout>
  );
}
