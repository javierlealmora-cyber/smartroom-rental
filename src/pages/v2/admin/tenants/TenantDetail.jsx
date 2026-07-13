// src/pages/v2/admin/tenants/TenantDetail.jsx

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Button, Card, DatePicker, Divider, Form, InputNumber, message, Modal, Row, Col, Space, Skeleton, Alert, Typography,
} from "antd";
import { EditOutlined, SaveOutlined, SwapOutlined, UserAddOutlined, UserOutlined } from "@ant-design/icons";
import LodgerFormFields from "./components/LodgerFormFields";
import RoomAssignmentForm from "./components/RoomAssignmentForm";
import ChangeRoomModal from "./components/ChangeRoomModal";
import { getLodger, updateLodger, assignRoomToLodger } from "../../../../services/lodgers.service";
import { listAccommodations } from "../../../../services/accommodations.service";
import dayjs from "dayjs";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { getLodgerStatus, getLodgerStatusLabel } from "../../../../utils/lodgerStatus";
import PayersList from "./components/PayersList";
import AccompanistSection from "./components/AccompanistSection";
import { useAuth } from "../../../../providers/AuthProvider";

const { Title, Text } = Typography;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fCurrency(v) {
  if (v == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}

const STATUS_COLOR = { active:"#059669", invited:"#3B82F6", pending_checkout:"#F59E0B", inactive:"#9CA3AF" };
const STATUS_BG    = { active:"#F0FDF4", invited:"#EFF6FF", pending_checkout:"#FFFBEB", inactive:"#F9FAFB" };

// ─── Fila de dato (label + valor) ──────────────────────────────────────────────
function DataRow({ label, value, valueStyle }) {
  return (
    <div style={{
      display:"flex", alignItems:"baseline",
      padding:"9px 0",
      borderBottom:"1px solid #F3F4F6",
    }}>
      <span style={{
        width:130, flexShrink:0,
        fontSize:12, color:"#9CA3AF", fontWeight:500,
        textAlign:"right", paddingRight:20,
      }}>{label}</span>
      <span style={{
        fontSize:13, color:"#1F2937", fontWeight:500,
        paddingLeft:50,
        ...valueStyle,
      }}>{value || "-"}</span>
    </div>
  );
}

// ─── Bloque de sección con título ───────────────────────────────────────────────
function Section({ title, extra, children, style }) {
  return (
    <div style={{marginBottom:28, ...style}}>
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:4,
        paddingBottom:8,
        borderBottom:"2px solid #F3F4F6",
      }}>
        <span style={{fontSize:13,fontWeight:700,color:"#374151",letterSpacing:"0.04em",textTransform:"uppercase"}}>
          {title}
        </span>
        {extra}
      </div>
      {children}
    </div>
  );
}

// =============================================================================
export default function TenantDetail() {
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const { profile } = useAuth();
  const isSuperadmin = profile?.role === "superadmin";
  const navigate = useNavigate();
  const { id }   = useParams();
  const [searchParams] = useSearchParams();

  const [loading, setLoading]                   = useState(true);
  const [lodger,  setLodger]                    = useState(null);
  const [error,   setError]                     = useState(null);
  const [editAssignmentOpen, setEditOpen]       = useState(false);
  const [savingAssignment,   setSaving]         = useState(false);
  const [assignmentForm] = Form.useForm();

  // Modal edición datos personales
  const [editLodgerOpen,  setEditLodgerOpen]  = useState(false);
  const [savingLodger,    setSavingLodger]    = useState(false);
  const [editLodgerForm] = Form.useForm();

  // Modal nueva asignación de habitación
  const [newAssignOpen,     setNewAssignOpen]     = useState(false);
  const [savingNewAssign,   setSavingNewAssign]   = useState(false);
  const [accommodations,    setAccommodations]    = useState([]);
  const [selectedRoomId,    setSelectedRoomId]    = useState(null);
  const [,    setAvailableRooms]    = useState([]);
  const [payUntilEndOfMonth,setPayUntilEndOfMonth]= useState(false);
  const [newAssignForm] = Form.useForm();

  // Modal cambio de habitación
  const [reassignOpen, setReassignOpen] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (clientAccountId) loadLodger(); }, [id, clientAccountId]);

  useEffect(() => {
    if (searchParams.get("action") === "reassign" && lodger) {
      setReassignOpen(true);
    }
  }, [searchParams, lodger]);

  async function loadLodger() {
    try {
      setLoading(true); setError(null);
      setLodger(await getLodger(id, clientAccountId));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const activeAssignment = lodger?.assignments?.find(a => !a.move_out_date);

  const openEditLodger = () => {
    editLodgerForm.setFieldsValue({
      first_name:          lodger.first_name          || "",
      last_name1:          lodger.last_name1           || "",
      last_name2:          lodger.last_name2           || "",
      nickname:            lodger.nickname             || "",
      email:               lodger.email               || "",
      phone:               lodger.phone               || "",
      document_id:         lodger.document_id         || "",
      gender:              lodger.gender              || undefined,
      address_street:      lodger.address_street      || "",
      address_number:      lodger.address_number      || "",
      address_floor:       lodger.address_floor       || "",
      address_postal_code: lodger.address_postal_code || "",
      address_city:        lodger.address_city        || "",
      address_province:    lodger.address_province    || "",
      address_country:     lodger.address_country     || "España",
    });
    setEditLodgerOpen(true);
  };

  const handleSaveLodger = async (values) => {
    setSavingLodger(true);
    try {
      const fullName = [values.first_name, values.last_name1, values.last_name2]
        .filter(Boolean).join(" ").trim();
      await updateLodger(id, { ...values, full_name: fullName });
      message.success("Datos actualizados");
      setEditLodgerOpen(false);
      loadLodger();
    } catch (err) {
      message.error(`Error: ${err.message}`);
    } finally {
      setSavingLodger(false);
    }
  };

  const openNewAssign = async () => {
    setSelectedRoomId(null);
    newAssignForm.resetFields();
    newAssignForm.setFieldsValue({ move_in_date: dayjs() });
    try {
      const list = await listAccommodations(clientAccountId);
      setAccommodations(list || []);
    } catch { setAccommodations([]); }
    setNewAssignOpen(true);
  };

  const handleNewAssignSubmit = async (values) => {
    setSavingNewAssign(true);
    try {
      await assignRoomToLodger(id, {
        roomId:                  selectedRoomId,
        accommodationId:         values.accommodation_id,
        clientAccountId,
        moveInDate:              values.move_in_date?.format("YYYY-MM-DD"),
        billingStartDate:        values.move_in_date?.add(1, "month").startOf("month").format("YYYY-MM-DD"),
        depositAmount:           values.deposit_amount,
        commissionAmount:        values.commission_amount,
        firstMonthAmount:        payUntilEndOfMonth ? values.first_month_amount : null,
        servicesProvisionAmount: values.services_provision_amount || null,
      });
      message.success("Habitación asignada correctamente");
      setNewAssignOpen(false);
      loadLodger();
    } catch (err) {
      message.error(`Error: ${err.message}`);
    } finally {
      setSavingNewAssign(false);
    }
  };

  const openEditAssignment = () => {
    if (!activeAssignment) return;
    assignmentForm.setFieldsValue({
      move_in_date:             activeAssignment.move_in_date          ? dayjs(activeAssignment.move_in_date)          : null,
      move_out_date:            activeAssignment.move_out_date         ? dayjs(activeAssignment.move_out_date)         : null,
      billing_start_date:       activeAssignment.billing_start_date    ? dayjs(activeAssignment.billing_start_date)    : null,
      monthly_rent:             activeAssignment.monthly_rent             || 0,
      deposit_amount:           activeAssignment.deposit_amount           || 0,
      commission_amount:        activeAssignment.commission_amount        || 0,
      first_month_amount:       activeAssignment.first_month_amount       || 0,
      services_provision_amount:activeAssignment.services_provision_amount|| null,
    });
    setEditOpen(true);
  };

  const onSaveAssignment = async (values) => {
    setSaving(true);
    try {
      const { supabase } = await import("../../../../services/supabaseClient");
      const { error } = await supabase.from("lodger_room_assignments").update({
        move_in_date:              values.move_in_date        ? values.move_in_date.format("YYYY-MM-DD")        : null,
        move_out_date:             values.move_out_date       ? values.move_out_date.format("YYYY-MM-DD")       : null,
        billing_start_date:        values.billing_start_date  ? values.billing_start_date.format("YYYY-MM-DD")  : null,
        monthly_rent:              values.monthly_rent              || 0,
        deposit_amount:            values.deposit_amount            || 0,
        commission_amount:         values.commission_amount         || 0,
        first_month_amount:        values.first_month_amount        || 0,
        services_provision_amount: values.services_provision_amount || null,
      }).eq("id", activeAssignment.id).eq("client_account_id", clientAccountId);

      if (error) throw new Error(error.message);
      message.success("Asignación actualizada");
      setEditOpen(false);
      loadLodger();
    } catch (err) { message.error(`Error: ${err.message}`); }
    finally { setSaving(false); }
  };

  // ─── Estados de carga ─────────────────────────────────────────────────────────
  if (loading) return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{maxWidth: 1100,margin:"0 auto"}}><Skeleton active paragraph={{rows:10}}/></div>
    </V2Layout>
  );
  if (error) return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Alert type="error" description={error} showIcon/>
    </V2Layout>
  );
  if (!lodger) return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Alert type="warning" description="Inquilino no encontrado" showIcon/>
    </V2Layout>
  );

  const lodgerName  = [lodger.first_name, lodger.last_name1, lodger.last_name2].filter(Boolean).join(" ") || lodger.email;
  const isFemale    = lodger.gender === "female";
  // REQ-015: si la asignación activa tiene acompañante, la habitación es compartida
  const hasAccompanist = !!activeAssignment?.accompanist;
  const photoTop    = hasAccompanist
    ? "/images/Inquilinos_cuerpo_entero.webp"
    : isFemale ? "/images/Inquilina agachada.webp" : "/images/Inquilino agachado.png";
  const photoBottom = !activeAssignment
    ? "/images/Habitación sin Inquilino en la cama.png"
    : hasAccompanist
      ? "/images/Inquilinos_cuerpo_entero.webp"
      : isFemale ? "/images/Habitación con Inqulina en la cama.webp"
      : "/images/Habitación con Inquilino en la cama.webp";
  const computedStatus = getLodgerStatus(lodger);
  const statusColor = STATUS_COLOR[computedStatus] || "#9CA3AF";
  const statusBg    = STATUS_BG[computedStatus]    || "#F9FAFB";
  const statusLabel = getLodgerStatusLabel(computedStatus);

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
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── HEADER ───────────────────────────────────────── */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <UserOutlined style={{ marginRight: 10 }} />
              {lodgerName}
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: statusColor,
                background: statusBg,
                borderRadius: 20,
                padding: "2px 10px",
                border: `1px solid ${statusColor}30`,
                marginLeft: 10,
                verticalAlign: "middle",
              }}>
                {statusLabel}
              </span>
            </Title>
            <Text type="secondary">
              {activeAssignment
                ? <>{activeAssignment.accommodation?.name} · <span style={{ color: "#6366F1", fontWeight: 600 }}>Hab. {activeAssignment.room?.number}</span></>
                : <span style={{ fontStyle: "italic" }}>Sin habitación asignada</span>}
              {lodger.phone && <> · Teléfono: {lodger.phone}</>}
            </Text>
          </Col>
          <Col>
            <Button type="primary" icon={<EditOutlined />} onClick={openEditLodger}>
              Editar
            </Button>
          </Col>
        </Row>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        {/* ── INFORMACIÓN GENERAL ──────────────────────────── */}
        <Card
          title={<span style={cardTitleStyle}>Información general</span>}
          style={{ borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 24 }}
        >
          <Row gutter={[40, 24]} align="top">
            <Col xs={24} md={16}>
              <Divider orientation="left" style={{ fontSize: 12, color: "#6B7280", marginTop: 0 }}>
                Datos personales
              </Divider>
              <DataRow label="Nombre"           value={lodger.first_name}/>
              <DataRow label="Primer apellido" value={lodger.last_name1}/>
              <DataRow label="Segundo apellido" value={lodger.last_name2}/>
              <DataRow label="Alias"            value={lodger.nickname}/>
              <DataRow label="Email"            value={lodger.email}/>
              <DataRow label="Teléfono"         value={lodger.phone}/>
              <DataRow label="Documento"        value={lodger.document_type
                ? `${lodger.document_type.toUpperCase()}: ${lodger.document_id || "-"}`
                : lodger.document_id}/>
              <DataRow label="Género"           value={lodger.gender}/>
            </Col>

            <Col xs={0} md={8} style={{ display: "flex", justifyContent: "center", paddingTop: "4%" }}>
              <img
                src={photoTop}
                alt={lodgerName}
                style={{ width: "80%", objectFit: "contain", filter: "drop-shadow(0 24px 50px rgba(0,0,0,0.45))" }}
              />
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 12, color: "#6B7280" }}>
            Dirección
          </Divider>
          <DataRow label="Calle"                    value={lodger.address_street}/>
          <DataRow label="Número"                   value={lodger.address_number}/>
          <DataRow label="Piso / Puerta / Escalera" value={lodger.address_floor}/>
          <DataRow label="Código Postal"            value={lodger.address_postal_code}/>
          <DataRow label="Localidad"                value={lodger.address_city}/>
          <DataRow label="Provincia"                value={lodger.address_province}/>
          <DataRow label="País"                     value={lodger.address_country}/>
        </Card>

        {/* ── HISTORIAL DE ASIGNACIONES ───────────────────── */}
        <Card
          title={<span style={cardTitleStyle}>Historial de asignaciones</span>}
          style={{ borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 24 }}
        >
          {(lodger.assignments || []).length === 0 ? (
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>Sin historial</span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lodger.assignments.map(asgn => (
                <div key={asgn.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px",
                  background: "#F9FAFB", borderRadius: 8,
                  border: "1px solid #F3F4F6",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                      {asgn.accommodation?.name}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: "#6366F1",
                      background: "#EEF2FF", borderRadius: 6, padding: "1px 7px",
                    }}>
                      Hab. {asgn.room?.number}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {fDate(asgn.move_in_date)} → {asgn.move_out_date ? fDate(asgn.move_out_date) : "Actual"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── HABITACIÓN ACTUAL ───────────────────────────── */}
        <Card
          title={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={cardTitleStyle}>Habitación actual</span>
              <Space size={8}>
                {activeAssignment ? (
                  <>
                    <button onClick={openEditAssignment} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6366F1", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <EditOutlined style={{ fontSize: 11 }} /> Editar
                    </button>
                    <button onClick={() => setReassignOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#D97706", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <SwapOutlined style={{ fontSize: 11 }} /> Cambiar
                    </button>
                  </>
                ) : (
                  <button onClick={openNewAssign} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#059669", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                    <UserAddOutlined style={{ fontSize: 11 }} /> Asignar habitación
                  </button>
                )}
              </Space>
            </div>
          }
          style={{ borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 24 }}
        >
          <Row gutter={[40, 24]} align="top">
            <Col xs={24} md={16}>
              {activeAssignment ? (<>
                <DataRow label="Alojamiento"  value={activeAssignment.accommodation?.name}/>
                <DataRow label="Habitación"   value={`Hab. ${activeAssignment.room?.number}`}/>
                <DataRow label="Check-In"     value={fDate(activeAssignment.move_in_date)}/>
                <DataRow label="Primer pago"  value={fDate(activeAssignment.billing_start_date)}/>
                <DataRow label="Renta"
                  value={`${fCurrency(activeAssignment.monthly_rent)} / mes`}
                  valueStyle={{ color: "#059669", fontWeight: 700 }}/>
                {activeAssignment.amount_until_end_of_month != null && (
                  <DataRow label="Hasta fin de mes"
                    value={fCurrency(activeAssignment.amount_until_end_of_month)}
                    valueStyle={{ color: "#059669", fontWeight: 600 }}/>
                )}
                {activeAssignment.deposit_amount != null && (
                  <DataRow label="Fianza"
                    value={fCurrency(activeAssignment.deposit_amount)}
                    valueStyle={{ color: "#D97706", fontWeight: 600 }}/>
                )}
                {activeAssignment.commission_amount != null && (
                  <DataRow label="Comisión"
                    value={fCurrency(activeAssignment.commission_amount)}
                    valueStyle={{ color: "#7C3AED", fontWeight: 600 }}/>
                )}
              </>) : (
                <span style={{ fontSize: 13, color: "#9CA3AF" }}>Sin habitación asignada</span>
              )}
            </Col>

            <Col xs={0} md={8} style={{ display: "flex", justifyContent: "center" }}>
              <img
                src={photoBottom}
                alt="Habitación"
                style={{ width: "100%", objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.12))" }}
              />
            </Col>
          </Row>

          {/* REQ-015 — Sección Acompañante (sólo si la asignación activa lo tiene) */}
          {activeAssignment?.accompanist && (
            <div style={{ marginTop: 12 }}>
              <AccompanistSection
                accompanist={activeAssignment.accompanist}
                historical={!!activeAssignment.move_out_date}
                isSuperadmin={isSuperadmin}
                onChanged={async () => {
                  const fresh = await getLodger(id, clientAccountId);
                  setLodger(fresh);
                }}
              />
            </div>
          )}
        </Card>

        {/* ── PAGADORES ───────────────────────────────────── */}
        {clientAccountId && (
          <Card
            title={<span style={cardTitleStyle}>Gestión de pagadores</span>}
            style={{ borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <PayersList
              lodgerId={id}
              clientAccountId={clientAccountId}
              hasRoomAssignment={!!activeAssignment}
            />
          </Card>
        )}

      </div>

      {/* ── MODAL NUEVA ASIGNACIÓN DE HABITACIÓN ─────────── */}
      <Modal
        title="Asignación de habitación"
        open={newAssignOpen}
        onCancel={() => setNewAssignOpen(false)}
        footer={null}
        width={860}
        destroyOnClose
      >
        <Form
          form={newAssignForm}
          layout="vertical"
          onFinish={handleNewAssignSubmit}
          initialValues={{ move_in_date: dayjs() }}
          style={{ marginTop: 16 }}
        >
          <RoomAssignmentForm
            form={newAssignForm}
            accommodations={accommodations}
            required={true}
            allowAccommodationChange={true}
            onRoomSelect={(roomId) => setSelectedRoomId(roomId)}
            onRoomsChange={(rooms) => setAvailableRooms(rooms)}
            onPayUntilEndOfMonthChange={(checked) => setPayUntilEndOfMonth(checked)}
          />
          <Row justify="end" style={{ marginTop: 16 }}>
            <Space>
              <Button onClick={() => setNewAssignOpen(false)}>Cancelar</Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<UserAddOutlined />}
                loading={savingNewAssign}
                disabled={!selectedRoomId}
              >
                Asignar Habitación
              </Button>
            </Space>
          </Row>
        </Form>
      </Modal>

      {/* ── MODAL EDICIÓN DATOS PERSONALES ─────────────────── */}
      <Modal
        title="Editar datos del inquilino"
        open={editLodgerOpen}
        onCancel={() => setEditLodgerOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form
          form={editLodgerForm}
          layout="vertical"
          onFinish={handleSaveLodger}
          style={{ marginTop: 16 }}
        >
          <LodgerFormFields disableEmail={true} />
          <Row justify="end" style={{ marginTop: 16 }}>
            <Space>
              <Button onClick={() => setEditLodgerOpen(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingLodger}>
                Guardar
              </Button>
            </Space>
          </Row>
        </Form>
      </Modal>

      {/* ── MODAL EDICIÓN ASIGNACIÓN ──────────────────────── */}
      <Modal
        title="Editar asignación de habitación"
        open={editAssignmentOpen}
        onCancel={()=>setEditOpen(false)}
        footer={null}
        width={640}
      >
        <Form form={assignmentForm} layout="vertical" onFinish={onSaveAssignment} style={{marginTop:16}}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Fecha de Check-In" name="move_in_date"
                rules={[{required:true,message:"Obligatorio"}]}>
                <DatePicker style={{width:"100%"}} format="DD/MM/YYYY"/>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Fecha de Check-Out" name="move_out_date">
                <DatePicker style={{width:"100%"}} format="DD/MM/YYYY" placeholder="Opcional"/>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Fecha primer pago" name="billing_start_date"
                rules={[{required:true,message:"Obligatorio"}]}>
                <DatePicker style={{width:"100%"}} format="DD/MM/YYYY"/>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Renta mensual" name="monthly_rent"
                rules={[{required:true,message:"Obligatorio"}]}>
                <InputNumber style={{width:"100%"}} min={0} precision={2} addonAfter="€" placeholder="450"/>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Importe hasta fin de mes" name="first_month_amount">
                <InputNumber style={{width:"100%"}} min={0} precision={2} addonAfter="€" placeholder="Opcional"/>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Fianza" name="deposit_amount">
                <InputNumber style={{width:"100%"}} min={0} precision={2} addonAfter="€" placeholder="900"/>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Comisión" name="commission_amount">
                <InputNumber style={{width:"100%"}} min={0} precision={2} addonAfter="€" placeholder="Opcional"/>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Previsión gastos servicios" name="services_provision_amount"
                extra="Hucha energética (luz, agua, gas)">
                <InputNumber style={{width:"100%"}} min={0} precision={2} addonAfter="€" placeholder="Opcional"/>
              </Form.Item>
            </Col>
          </Row>
          <Row justify="end" style={{marginTop:8}}>
            <Space>
              <Button onClick={()=>setEditOpen(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined/>} loading={savingAssignment}>
                Guardar
              </Button>
            </Space>
          </Row>
        </Form>
      </Modal>

      {/* ── MODAL CAMBIO DE HABITACIÓN ────────────────────── */}
      <ChangeRoomModal
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        onSuccess={() => {
          setReassignOpen(false);
          navigate(`/v2/admin/inquilinos/${id}/detalle-inquilino`, { replace: true });
          loadLodger();
          message.success("Habitación cambiada correctamente");
        }}
        lodger={lodger}
        activeAssignment={activeAssignment}
        clientAccountId={clientAccountId}
      />
    </V2Layout>
  );
}
