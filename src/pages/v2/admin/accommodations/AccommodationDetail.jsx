// src/pages/v2/admin/accommodations/AccommodationDetail.jsx
// Detalle de alojamiento: habitaciones con estado, características e inquilino asignado

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Avatar, Button, Card, Col, Divider, Form, Input,
  InputNumber, message, Modal, Popconfirm, Row,
  Select, Skeleton, Space, Switch, Table, Tag, Tooltip, Typography,
} from "antd";
import {
  ArrowLeftOutlined, DeleteOutlined, EditOutlined, HomeOutlined,
  PlusOutlined, SaveOutlined, SearchOutlined, SwapOutlined, UserAddOutlined, UserOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { supabase } from "../../../../services/supabaseClient";
import { IllustrationRoom } from "../../../../components/icons3d/Illustrations3D";
import { listEntities } from "../../../../services/entities.service";
import { updateAccommodation, setAccommodationStatus } from "../../../../services/accommodations.service";
import { assignRoomToLodger } from "../../../../services/lodgers.service";
import { PROVINCIAS_ES } from "../../../../constants/formOptions";
import ConsumoTab from "./tabs/ConsumoTab";
import FacturasTab from "./tabs/FacturasTab";

const { Title, Text } = Typography;

const ROOM_STATUS_TAG = { free: "success", occupied: "error", pending_checkout: "warning", maintenance: "default" };
const ROOM_STATUS_LABEL = { free: "Libre", occupied: "Ocupada", pending_checkout: "Pendiente baja", maintenance: "Mantenimiento" };
const ROOM_STATUS_BG = {
  free: { card: "#F0FDF4", border: "#D1FAE5", icon: "#DCFCE7", text: "#16A34A" },
  occupied: { card: "#FFF5F5", border: "#FEE2E2", icon: "#FEE2E2", text: "#DC2626" },
  pending_checkout: { card: "#FFFBEB", border: "#FEF3C7", icon: "#FEF3C7", text: "#D97706" },
  maintenance: { card: "#F9FAFB", border: "#E5E7EB", icon: "#E5E7EB", text: "#6B7280" },
};
const ROOM_STATUS_BADGE_BG = {
  free: "#16A34A", occupied: "#DC2626", pending_checkout: "#D97706", maintenance: "#6B7280",
};
const LODGER_STATUS_COLOR = { active: "#059669", invited: "#3B82F6", pending_checkout: "#F59E0B", inactive: "#9CA3AF" };
const LODGER_STATUS_LABEL = { active: "Activo", invited: "Invitado", pending_checkout: "Pendiente baja", inactive: "Inactivo" };
const KITCHEN_LABEL = { shared: "Compartida", private: "Privada", none: "Sin cocina" };
const BATHROOM_LABEL = { shared: "Baño compartido", private: "Baño privado", ensuite: "Baño en suite" };

const ROOM_CARD_IMAGE = "/icons/room-card-model.png";

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatCurrency(v) {
  if (v == null || v === "") return null;
  return Number(v).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}


const BATHROOM_OPTIONS = [
  { value: "shared", label: "Compartido" },
  { value: "private", label: "Privado" },
  { value: "suite", label: "Suite" },
];
const KITCHEN_OPTIONS = [
  { value: "shared", label: "Compartida" },
  { value: "private", label: "Privada" },
  { value: "suite", label: "Suite" },
];

export default function AccommodationDetail() {
  const { entityId, accId } = useParams();
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const [accommodation, setAccommodation] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignRoom, setAssignRoom] = useState(null);
  const [allLodgers, setAllLodgers] = useState([]);
  const [loadingLodgers, setLoadingLodgers] = useState(false);
  const [assigningLodger, setAssigningLodger] = useState(false);
  const [assignError, setAssignError] = useState(null);

  // Datos tab state
  const [accForm] = Form.useForm();
  const [ownerEntities, setOwnerEntities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);
  // Rooms edit state (dentro del tab Datos)
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm] = Form.useForm();
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomForm] = Form.useForm();
  // Extra costs state
  const [extraCosts, setExtraCosts] = useState([]);
  // Gantt state
  const [allAssignments, setAllAssignments] = useState([]);
  const [loadingGantt, setLoadingGantt] = useState(false);
  const [ganttYear, setGanttYear] = useState(new Date().getFullYear());
  // Tab state
  const [activeTab, setActiveTab] = useState("habitaciones");
  const [activeSubTab, setActiveSubTab] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [{ data: acc, error: accErr }, { data: roomsData, error: roomsErr }, entities] = await Promise.all([
        supabase.from("accommodations")
          .select("*, owner_entity:entities(id, legal_name, first_name, last_name1, legal_type)")
          .eq("id", accId).single(),
        supabase.from("rooms")
          .select(`*, active_assignment:lodger_room_assignments(id, move_in_date, monthly_rent, status, lodger:profiles(id, full_name, email, phone, onboarding_status))`)
          .eq("accommodation_id", accId)
          .eq("lodger_room_assignments.status", "active")
          .order("number"),
        listEntities({ type: "owner" }),
      ]);
      if (accErr) throw new Error(accErr.message);
      if (roomsErr) throw new Error(roomsErr.message);
      setAccommodation(acc);
      setRooms(roomsData || []);
      setOwnerEntities((entities || []).filter((e) => e.status === "active"));
      setExtraCosts(acc.extra_costs || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accId]);

  useEffect(() => { load(); }, [load]);

  // Poblar accForm solo cuando el tab "datos" está activo (Form renderizado → sin warning)
  useEffect(() => {
    if (!accommodation || activeTab !== "datos") return;
    accForm.setFieldsValue({
      name: accommodation.name,
      owner_entity_id: accommodation.owner_entity_id,
      address_line1: accommodation.address_line1 || "",
      address_line2: accommodation.address_line2 || "",
      postal_code: accommodation.postal_code || "",
      city: accommodation.city || "",
      province: accommodation.province || null,
      notes: accommodation.notes || "",
      status: accommodation.status,
      utilities_included: accommodation.utilities_included !== false,
      split_electricity: accommodation.split_electricity || false,
      split_water: accommodation.split_water || false,
      split_gas: accommodation.split_gas || false,
      split_mode_electricity: accommodation.split_mode_electricity || "equal",
      split_mode_water: accommodation.split_mode_water || "equal",
      split_mode_gas: accommodation.split_mode_gas || "equal",
      has_individual_meters: accommodation.has_individual_meters || false,
    });
  }, [accommodation, activeTab, accForm]);

  useEffect(() => {
    if (activeTab !== "datos" || activeSubTab !== "ocupacion") return;
    if (!clientAccountId) return;
    setLoadingGantt(true);
    
    // Cargar asignaciones y perfiles por separado para evitar error de relación obsoleta
    Promise.all([
      supabase
        .from("lodger_room_assignments")
        .select("id, room_id, lodger_id, move_in_date, move_out_date, status")
        .eq("accommodation_id", accId)
        .eq("client_account_id", clientAccountId)
        .order("move_in_date"),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "lodger")
        .eq("client_account_id", clientAccountId)
    ]).then(([{ data: assignments }, { data: profiles }]) => {
      if (assignments && profiles) {
        // Mapear nombres de inquilinos a las asignaciones
        const profileMap = {};
        profiles.forEach(p => { profileMap[p.id] = p; });
        const enrichedAssignments = assignments.map(a => ({
          ...a,
          lodger: profileMap[a.lodger_id] || null
        }));
        setAllAssignments(enrichedAssignments);
      }
      setLoadingGantt(false);
    }).catch(() => {
      setLoadingGantt(false);
    });
  }, [activeTab, activeSubTab, accId, clientAccountId]);

  const openAssignModal = useCallback(async (room) => {
    setAssignRoom(room);
    setLoadingLodgers(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select(`
          id, full_name, email, onboarding_status,
          active_assignment:lodger_room_assignments(
            id, room_id, accommodation_id, status,
            room:rooms(id, number),
            accommodation:accommodations(id, name)
          )
        `)
        .eq("role", "lodger")
        .eq("client_account_id", clientAccountId)
        .eq("lodger_room_assignments.status", "active")
        .in("onboarding_status", ["active", "invited"])
        .order("full_name");
      setAllLodgers(data || []);
    } catch { setAllLodgers([]); }
    finally { setLoadingLodgers(false); }
  }, [clientAccountId]);

  const backPath = entityId ? `/v2/admin/entidades/${entityId}` : "/v2/admin/alojamientos";
  const backLabel = entityId ? "Entidad" : "Alojamientos";

  // ── Save accommodation (Datos tab) ──────────────────────────────────────────
  const onSaveAccommodation = async (values) => {
    setSaving(true); setSaveError(null); setSaveOk(false);
    try {
      await updateAccommodation(accId, {
        name: values.name,
        owner_entity_id: values.owner_entity_id,
        address_line1: values.address_line1 || null,
        address_line2: values.address_line2 || null,
        postal_code: values.postal_code || null,
        city: values.city || null,
        province: values.province || null,
        notes: values.notes || null,
        status: values.status,
        utilities_included: values.utilities_included,
        split_electricity: values.split_electricity || false,
        split_water: values.split_water || false,
        split_gas: values.split_gas || false,
        split_mode_electricity: values.split_mode_electricity || "equal",
        split_mode_water: values.split_mode_water || "equal",
        split_mode_gas: values.split_mode_gas || "equal",
        has_individual_meters: values.has_individual_meters || false,
        extra_costs: extraCosts,
      });
      setSaveOk(true);
      load();
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  // ── Room handlers (Datos tab) ────────────────────────────────────────────────
  const onSaveRoom = async (roomId, values) => {
    try {
      const { error } = await supabase
        .from("rooms")
        .update(values)
        .eq("id", roomId)
        .eq("client_account_id", clientAccountId);
      if (error) throw new Error(error.message);
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, ...values } : r));
      setEditingRoom(null);
    } catch (e) { setSaveError(e.message); }
  };

  const onToggleRoomStatus = async (room) => {
    const next = room.status === "maintenance" ? "free" : "maintenance";
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ status: next })
        .eq("id", room.id)
        .eq("client_account_id", clientAccountId);
      if (error) throw new Error(error.message);
      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, status: next } : r));
    } catch (e) { setSaveError(e.message); }
  };

  const onAddRoom = async (values) => {
    console.log("onAddRoom called with values:", values);
    try {
      const { data: newRoom, error } = await supabase
        .from("rooms")
        .insert({
          accommodation_id: accId,
          client_account_id: clientAccountId,
          number: values.number,
          monthly_rent: values.monthly_rent || 0,
          square_meters: values.square_meters || null,
          bathroom_type: values.bathroom_type || "shared",
          kitchen_type: values.kitchen_type || "shared",
          notes: values.notes || null,
          status: "free",
        })
        .select()
        .single();
      if (error) {
        console.error("Error inserting room:", error);
        throw new Error(error.message);
      }
      console.log("Room added successfully:", newRoom);
      setRooms((prev) => [...prev, newRoom]);
      setAddingRoom(false);
      newRoomForm.resetFields();
    } catch (e) {
      console.error("Exception in onAddRoom:", e);
      setSaveError(e.message);
    }
  };

  const roomColumns = [
    { title: "Nº", dataIndex: "number", key: "number", width: 60, render: (v) => <Text strong>{v}</Text> },
    { title: "Estado", dataIndex: "status", key: "status", width: 110,
      render: (v) => <Tag color={ROOM_STATUS_TAG[v] || "default"}>{ROOM_STATUS_LABEL[v] || v}</Tag> },
    { title: "Precio/mes", dataIndex: "monthly_rent", key: "monthly_rent", width: 110,
      render: (v) => v != null ? formatCurrency(v) : "-" },
    { title: "m²", dataIndex: "square_meters", key: "square_meters", width: 70,
      render: (v) => v ? `${v} m²` : "-" },
    { title: "Baño", dataIndex: "bathroom_type", key: "bathroom_type", responsive: ["lg"],
      render: (v) => BATHROOM_OPTIONS.find((o) => o.value === v)?.label || v },
    { title: "Acciones", key: "actions", render: (_, room) => (
      <Space>
        <Button size="small" onClick={() => {
          setEditingRoom(room.id);
          roomForm.setFieldsValue({
            number: room.number, monthly_rent: room.monthly_rent,
            square_meters: room.square_meters,
            bathroom_type: room.bathroom_type || "shared",
            kitchen_type: room.kitchen_type || "shared",
            notes: room.notes || "",
          });
        }}>Editar</Button>
        {room.status !== "occupied" && (
          <Popconfirm
            title={room.status === "maintenance" || room.status === "inactive" ? "¿Reactivar habitación?" : "¿Desactivar habitación?"}
            onConfirm={() => onToggleRoomStatus(room)} okText="Sí" cancelText="No"
          >
            <Button size="small" danger={room.status !== "maintenance" && room.status !== "inactive"}>
              {room.status === "maintenance" || room.status === "inactive" ? "Reactivar" : "Desactivar"}
            </Button>
          </Popconfirm>
        )}
      </Space>
    )},
  ];

  const TABS = [
    {
      key: "datos", label: "Datos del Alojamiento",
      subTabs: [
        { key: "info", label: "Información" },
        { key: "ocupacion", label: "Ocupación" },
      ],
    },
    { key: "habitaciones", label: "Habitaciones", subTabs: null },
    {
      key: "consumos", label: "Consumos",
      subTabs: [
        { key: "registros", label: "Registros Estimado" },
        { key: "visor",     label: "Visor de Consumos" },
      ],
    },
    {
      key: "facturas", label: "Facturas",
      subTabs: [
        { key: "carga",       label: "Carga de Facturas" },
        { key: "lista",       label: "Lista de Facturas" },
        { key: "boletines",   label: "Boletines de Facturas" },
      ],
    },
    { key: "hucha", label: "Hucha Energética", subTabs: null },
  ];

  const handleTabClick = (tab) => {
    if (tab.subTabs) {
      setActiveTab(tab.key);
      setActiveSubTab(activeTab === tab.key ? activeSubTab : tab.subTabs[0].key);
    } else {
      setActiveTab(tab.key);
      setActiveSubTab(null);
    }
  };

  const handleSubTabClick = (subTab) => {
    setActiveSubTab(subTab.key);
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(backPath)}
          style={{ paddingLeft: 0, color: "#6B7280", marginBottom: 10, fontSize: 14 }}>
          {backLabel}
        </Button>
        {loading ? <Skeleton active title={{ width: 260 }} paragraph={{ rows: 1 }} /> : (
          <Row justify="space-between" align="top">
            <Col flex="auto">
              <Title level={2} style={{ margin: 0, fontWeight: 700, fontSize: 28, letterSpacing: "-0.5px", color: "#1D1D1F", marginBottom: 4 }}>
                {accommodation?.name}
              </Title>
              <Text style={{ fontSize: 14, color: "#6B7280" }}>
                {[accommodation?.address_line1 || accommodation?.street, accommodation?.postal_code, accommodation?.city].filter(Boolean).join(", ") || "Sin dirección"}
              </Text>
            </Col>
            <Col style={{ paddingTop: 4 }}>
              <Space>
                <Button type="primary" icon={<UserAddOutlined />} onClick={() => navigate(`/v2/admin/inquilinos/nuevo?acc=${accId}`)}>
                  Nuevo inquilino
                </Button>
              </Space>
            </Col>
          </Row>
        )}
      </div>

      {/* Tab menu */}
      <div style={{ marginBottom: 0 }}>
        {/* Main tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E5E7EB", marginBottom: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "10px 20px", fontSize: 14, fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? "#0071E3" : "#374151",
                borderBottom: activeTab === tab.key ? "2px solid #0071E3" : "2px solid transparent",
                marginBottom: "-2px", transition: "all 0.15s", fontFamily: "inherit",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sub-tabs */}
        {TABS.find((t) => t.key === activeTab)?.subTabs && (
          <div style={{ display: "flex", gap: 0, background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", paddingLeft: 8 }}>
            {TABS.find((t) => t.key === activeTab).subTabs.map((sub) => (
              <button
                key={sub.key}
                onClick={() => handleSubTabClick(sub)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "7px 16px", fontSize: 13, fontWeight: activeSubTab === sub.key ? 600 : 400,
                  color: activeSubTab === sub.key ? "#0071E3" : "#6B7280",
                  borderBottom: activeSubTab === sub.key ? "2px solid #0071E3" : "2px solid transparent",
                  marginBottom: "-1px", transition: "all 0.15s", fontFamily: "inherit",
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16, marginTop: 16 }} />}

      {/* ── Tab: Datos del Alojamiento ───────────────────────────────────── */}
      {activeTab === "datos" && activeSubTab !== "ocupacion" && (
        <div style={{ marginTop: 24 }}>
          {saveError && <Alert type="error" message={saveError} showIcon closable onClose={() => setSaveError(null)} style={{ marginBottom: 16 }} />}
          {saveOk && <Alert type="success" message="Alojamiento guardado correctamente" showIcon style={{ marginBottom: 16 }} />}

          {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : (
            <Form form={accForm} layout="vertical" onFinish={onSaveAccommodation}>

              {/* Datos básicos */}
              <Card title="Datos del Alojamiento" size="small" style={{ marginBottom: 16 }}>
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item label="Nombre" name="name" rules={[{ required: true, message: "El nombre es obligatorio" }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item label="Entidad Propietaria" name="owner_entity_id" rules={[{ required: true, message: "Selecciona una entidad" }]}>
                      <Select options={ownerEntities.map((e) => ({ value: e.id, label: e.legal_name || `${e.first_name} ${e.last_name1}` }))} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={4}>
                    <Form.Item label="Estado" name="status" rules={[{ required: true, message: "El estado es obligatorio" }]}>
                      <Select options={[{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }]} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={14}>
                    <Form.Item label="Calle" name="address_line1" rules={[
                      { required: true, message: "La calle es obligatoria" },
                      { min: 3, message: "La calle debe tener al menos 3 caracteres" },
                      { max: 200, message: "La calle no puede exceder 200 caracteres" }
                    ]}>
                      <Input placeholder="Calle Gran Vía, Av. de la Constitución..." />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={10}>
                    <Form.Item label="Bloque / Escalera / Piso (opcional)" name="address_line2">
                      <Input placeholder="Bloque B, Escalera 2, 3ºA..." />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={4}>
                    <Form.Item label="Código Postal" name="postal_code" rules={[
                      { required: true, message: "El código postal es obligatorio" },
                      { pattern: /^\d{5}$/, message: "Debe ser un código postal válido de 5 dígitos" }
                    ]}>
                      <Input placeholder="28001" maxLength={5} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Ciudad" name="city" rules={[
                      { required: true, message: "La ciudad es obligatoria" },
                      { min: 2, message: "La ciudad debe tener al menos 2 caracteres" },
                      { max: 100, message: "La ciudad no puede exceder 100 caracteres" }
                    ]}>
                      <Input placeholder="Madrid" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Provincia" name="province" rules={[{ required: true, message: "La provincia es obligatoria" }]}>
                      <Select showSearch placeholder="Seleccionar provincia..." optionFilterProp="label"
                        options={PROVINCIAS_ES} allowClear
                        filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item label="Notas" name="notes">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Configuración de consumo */}
              <Card title="Configuración de Consumo" size="small" style={{ marginBottom: 16 }}>
                <Form.Item name="utilities_included" valuePropName="checked">
                  <Space align="center">
                    <Form.Item name="utilities_included" valuePropName="checked" noStyle>
                      <Switch />
                    </Form.Item>
                    <Text>Los servicios (agua, luz, gas) están <strong>incluidos en el alquiler</strong></Text>
                  </Space>
                </Form.Item>

                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.utilities_included !== cur.utilities_included}>
                  {({ getFieldValue }) => !getFieldValue("utilities_included") && (
                    <>
                      <Divider orientation="left" plain style={{ fontSize: 13, color: "#6B7280" }}>Servicios a repartir</Divider>
                      <Row gutter={[24, 8]}>
                        {/* Electricidad */}
                        <Col xs={24} sm={8}>
                          <Form.Item name="split_electricity" valuePropName="checked" noStyle>
                            <Switch size="small" />
                          </Form.Item>
                          <Text style={{ marginLeft: 8 }}>⚡ Electricidad</Text>
                          <Form.Item noStyle shouldUpdate={(p, c) => p.split_electricity !== c.split_electricity}>
                            {({ getFieldValue: gfv }) => gfv("split_electricity") && (
                              <Form.Item name="split_mode_electricity" style={{ marginTop: 8, marginBottom: 0 }}>
                                <Select size="small" style={{ width: 180 }} options={[
                                  { value: "equal", label: "Partes iguales" },
                                  { value: "prorated", label: "Prorrateado por consumo" },
                                ]} />
                              </Form.Item>
                            )}
                          </Form.Item>
                        </Col>
                        {/* Agua */}
                        <Col xs={24} sm={8}>
                          <Form.Item name="split_water" valuePropName="checked" noStyle>
                            <Switch size="small" />
                          </Form.Item>
                          <Text style={{ marginLeft: 8 }}>💧 Agua</Text>
                          <Form.Item noStyle shouldUpdate={(p, c) => p.split_water !== c.split_water}>
                            {({ getFieldValue: gfv }) => gfv("split_water") && (
                              <Form.Item name="split_mode_water" style={{ marginTop: 8, marginBottom: 0 }}>
                                <Select size="small" style={{ width: 180 }} options={[
                                  { value: "equal", label: "Partes iguales" },
                                  { value: "prorated", label: "Prorrateado por consumo" },
                                ]} />
                              </Form.Item>
                            )}
                          </Form.Item>
                        </Col>
                        {/* Gas */}
                        <Col xs={24} sm={8}>
                          <Form.Item name="split_gas" valuePropName="checked" noStyle>
                            <Switch size="small" />
                          </Form.Item>
                          <Text style={{ marginLeft: 8 }}>🔥 Gas</Text>
                          <Form.Item noStyle shouldUpdate={(p, c) => p.split_gas !== c.split_gas}>
                            {({ getFieldValue: gfv }) => gfv("split_gas") && (
                              <Form.Item name="split_mode_gas" style={{ marginTop: 8, marginBottom: 0 }}>
                                <Select size="small" style={{ width: 180 }} options={[
                                  { value: "equal", label: "Partes iguales" },
                                  { value: "prorated", label: "Prorrateado por consumo" },
                                ]} />
                              </Form.Item>
                            )}
                          </Form.Item>
                        </Col>
                      </Row>

                      <Divider orientation="left" plain style={{ fontSize: 13, color: "#6B7280", marginTop: 16 }}>Medidores individuales</Divider>
                      <Space align="center" style={{ marginBottom: 8 }}>
                        <Form.Item name="has_individual_meters" valuePropName="checked" noStyle>
                          <Switch size="small" />
                        </Form.Item>
                        <Text style={{ fontSize: 13 }}>El alojamiento tiene <strong>medidores individuales</strong> por habitación</Text>
                      </Space>

                      <Divider orientation="left" plain style={{ fontSize: 13, color: "#6B7280", marginTop: 16 }}>Otros gastos adicionales</Divider>
                      <div style={{ marginBottom: 8 }}>
                        {extraCosts.map((ec, idx) => (
                          <Row key={idx} gutter={[8, 8]} align="middle" style={{ marginBottom: 6 }}>
                            <Col xs={12} sm={8}>
                              <Input
                                size="small"
                                placeholder="Concepto (ej. WiFi, Basura...)"
                                value={ec.name}
                                onChange={(e) => setExtraCosts((prev) => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                              />
                            </Col>
                            <Col xs={10} sm={6}>
                              <Select
                                size="small"
                                style={{ width: "100%" }}
                                value={ec.split_mode}
                                onChange={(v) => setExtraCosts((prev) => prev.map((x, i) => i === idx ? { ...x, split_mode: v } : x))}
                                options={[
                                  { value: "equal", label: "Partes iguales" },
                                  { value: "prorated", label: "Prorrateado" },
                                ]}
                              />
                            </Col>
                            <Col xs={2}>
                              <Button size="small" danger icon={<DeleteOutlined />}
                                onClick={() => setExtraCosts((prev) => prev.filter((_, i) => i !== idx))} />
                            </Col>
                          </Row>
                        ))}
                        <Button size="small" icon={<PlusOutlined />}
                          onClick={() => setExtraCosts((prev) => [...prev, { name: "", split_mode: "equal" }])}>
                          Añadir gasto adicional
                        </Button>
                      </div>
                    </>
                  )}
                </Form.Item>
              </Card>

              <Row justify="end">
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
                  Guardar Alojamiento
                </Button>
              </Row>
            </Form>

          )}
        </div>
      )}

      {/* ── Habitaciones (dentro del tab Datos, pero fuera del Form principal) ─── */}
      {activeTab === "datos" && activeSubTab !== "ocupacion" && !loading && (
        <div style={{ marginTop: 16 }}>
          <Card
            title={<Space><span>Habitaciones</span><Tag>{rooms.length}</Tag></Space>}
            size="small"
            style={{ marginBottom: 16 }}
            extra={
              <Button size="small" icon={<PlusOutlined />} onClick={() => {
                console.log("Añadir button clicked");
                setAddingRoom(true);
              }}>Añadir</Button>
            }
          >
            {addingRoom && (
              <Card size="small" style={{ marginBottom: 12, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                <Text strong style={{ display: "block", marginBottom: 10 }}>Nueva Habitación</Text>
                <Form 
                  form={newRoomForm} 
                  layout="vertical" 
                  onFinish={onAddRoom}
                  onFinishFailed={(errorInfo) => {
                    console.log("Form validation failed:", errorInfo);
                  }}
                >
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item 
                        name="number" 
                        label="Nº" 
                        rules={[
                          { required: true, message: "El número es obligatorio" },
                          { max: 10, message: "Máximo 10 caracteres" },
                          { whitespace: true, message: "No puede estar vacío" }
                        ]}
                      >
                        <Input placeholder="101" maxLength={10} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item 
                        name="monthly_rent" 
                        label="Precio/mes"
                        rules={[
                          { required: true, message: "El precio es obligatorio" },
                          { type: 'number', min: 0, message: "Debe ser mayor o igual a 0" }
                        ]}
                        initialValue={0}
                      >
                        <InputNumber placeholder="450" min={0} max={9999} step={10} addonAfter="€" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item 
                        name="square_meters" 
                        label="m²"
                        rules={[
                          { type: 'number', min: 1, message: "Debe ser mayor a 0" },
                          { type: 'number', max: 999, message: "Máximo 999 m²" }
                        ]}
                      >
                        <InputNumber placeholder="20" min={1} max={999} step={1} addonAfter="m²" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item 
                        name="bathroom_type" 
                        label="Baño" 
                        rules={[{ required: true, message: "Selecciona tipo de baño" }]}
                        initialValue="shared"
                      >
                        <Select options={BATHROOM_OPTIONS} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item 
                        name="kitchen_type" 
                        label="Cocina" 
                        rules={[{ required: true, message: "Selecciona tipo de cocina" }]}
                        initialValue="shared"
                      >
                        <Select options={KITCHEN_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col span={18}>
                      <Form.Item label=" " colon={false}>
                        <Space>
                          <Button 
                            type="primary" 
                            htmlType="submit" 
                            size="small"
                            onClick={() => console.log("Submit button clicked")}
                          >
                            Añadir
                          </Button>
                          <Button size="small" onClick={() => { 
                            console.log("Cancel clicked");
                            setAddingRoom(false); 
                            newRoomForm.resetFields(); 
                          }}>
                            Cancelar
                          </Button>
                        </Space>
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>
            )}
            {editingRoom && (
              <Card size="small" style={{ marginBottom: 12, background: "#fffbeb", border: "1px solid #fde68a" }}>
                <Text strong style={{ display: "block", marginBottom: 10 }}>Editando Hab. {rooms.find((r) => r.id === editingRoom)?.number}</Text>
                <Form form={roomForm} layout="inline" onFinish={(values) => onSaveRoom(editingRoom, values)}>
                  <Form.Item name="number" rules={[{ required: true }]}><Input placeholder="Nº" style={{ width: 70 }} /></Form.Item>
                  <Form.Item name="monthly_rent"><InputNumber placeholder="Precio/mes" min={0} addonAfter="€" style={{ width: 130 }} /></Form.Item>
                  <Form.Item name="square_meters"><InputNumber placeholder="m²" min={1} addonAfter="m²" style={{ width: 100 }} /></Form.Item>
                  <Form.Item name="bathroom_type"><Select style={{ width: 130 }} options={BATHROOM_OPTIONS} /></Form.Item>
                  <Form.Item name="kitchen_type"><Select style={{ width: 130 }} options={KITCHEN_OPTIONS} /></Form.Item>
                  <Form.Item name="notes"><Input placeholder="Notas" style={{ width: 140 }} /></Form.Item>
                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" size="small">Guardar</Button>
                      <Button size="small" onClick={() => setEditingRoom(null)}>Cancelar</Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            )}
            <Table rowKey="id" columns={roomColumns} dataSource={rooms}
              pagination={false} scroll={{ x: true }} size="small"
              locale={{ emptyText: "Sin habitaciones" }} />
          </Card>
        </div>
      )}

      {/* ── Gantt Ocupación (sub-tab de Datos) ──────────────────────── */}
      {activeTab === "datos" && activeSubTab === "ocupacion" && (() => {
        const CELL = 13;
        const PALETTE = [
          "#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED",
          "#DB2777", "#0891B2", "#EA580C", "#4F46E5", "#65A30D",
        ];

        const today = new Date(); today.setHours(0, 0, 0, 0);

        const minYear = allAssignments.length > 0
          ? Math.min(...allAssignments.map(a => new Date(a.move_in_date).getFullYear()))
          : ganttYear;
        const maxYear = today.getFullYear();
        const availableYears = [];
        for (let y = minYear; y <= maxYear; y++) availableYears.push(y);

        const yearStart = new Date(ganttYear, 0, 1);
        const daysInYear = new Date(ganttYear, 11, 31).getTime() - yearStart.getTime();
        const totalDays = Math.floor(daysInYear / 86400000) + 1;
        const days = Array.from({ length: totalDays }, (_, i) => {
          const d = new Date(yearStart); d.setDate(d.getDate() + i); return d;
        });

        const months = [];
        let curMonth = -1;
        days.forEach((d, i) => {
          if (d.getMonth() !== curMonth) {
            curMonth = d.getMonth();
            months.push({ idx: curMonth, startCol: i, label: d.toLocaleDateString("es-ES", { month: "short" }) });
          }
        });
        months.forEach((m, i) => {
          m.span = (i + 1 < months.length ? months[i + 1].startCol : days.length) - m.startCol;
        });

        const uniqueLodgers = [];
        const lodgerColorMap = {};
        allAssignments.forEach(asgn => {
          const name = asgn.lodger?.full_name || `Inquilino ${asgn.id.slice(0, 6)}`;
          if (!lodgerColorMap[name]) {
            const color = PALETTE[uniqueLodgers.length % PALETTE.length];
            lodgerColorMap[name] = color;
            uniqueLodgers.push({ name, color });
          }
        });

        const roomMaps = {};
        rooms.forEach(r => { roomMaps[r.id] = new Map(); });
        allAssignments.forEach(asgn => {
          if (!roomMaps[asgn.room_id]) return;
          const name = asgn.lodger?.full_name || `Inquilino ${asgn.id.slice(0, 6)}`;
          const color = lodgerColorMap[name];
          const start = new Date(asgn.move_in_date); start.setHours(0, 0, 0, 0);
          const end = asgn.move_out_date ? new Date(asgn.move_out_date) : new Date(ganttYear, 11, 31);
          end.setHours(0, 0, 0, 0);
          days.forEach(d => {
            if (d >= start && d <= end) roomMaps[asgn.room_id].set(d.toISOString().slice(0, 10), { name, color });
          });
        });

        return (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14 }}>Año:</Text>
              <Select
                value={ganttYear}
                onChange={setGanttYear}
                options={availableYears.map(y => ({ value: y, label: String(y) }))}
                style={{ width: 100 }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginLeft: 8 }}>
                {uniqueLodgers.map(({ name, color }) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span title="Presente / futuro" style={{ display: "inline-block", width: 13, height: 13, background: color, borderRadius: 2, opacity: 1 }} />
                    <span title="Histórico" style={{ display: "inline-block", width: 13, height: 13, background: color, borderRadius: 2, opacity: 0.25 }} />
                    <Text style={{ fontSize: 12, color: "#374151" }}>{name}</Text>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ display: "inline-block", width: 13, height: 13, background: "#EBEDF0", borderRadius: 2 }} />
                  <Text style={{ fontSize: 12, color: "#374151" }}>Libre</Text>
                </div>
              </div>
            </div>

            {loadingGantt ? <Skeleton active paragraph={{ rows: rooms.length || 3 }} /> : (
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "inline-block", minWidth: 600 }}>
                  {/* Month headers */}
                  <div style={{ display: "flex", marginLeft: 90, marginBottom: 2 }}>
                    {months.map(m => (
                      <div key={m.idx} style={{ width: m.span * (CELL + 1), fontSize: 11, color: "#6B7280", fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap" }}>
                        {m.label}
                      </div>
                    ))}
                  </div>
                  {/* Room rows */}
                  {rooms.map(room => {
                    const lodgerName = room.active_assignment?.[0]?.lodger?.full_name;
                    const headerColor = lodgerName ? (lodgerColorMap[lodgerName] || "#6B7280") : "#6B7280";
                    return (
                      <div key={room.id} style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
                        <div style={{ width: 85, paddingRight: 8, fontSize: 12, fontWeight: 600, color: headerColor, flexShrink: 0, whiteSpace: "nowrap" }}>
                          Hab. {room.number}
                        </div>
                        <div style={{ display: "flex", gap: 1 }}>
                          {days.map(d => {
                            const key = d.toISOString().slice(0, 10);
                            const info = roomMaps[room.id]?.get(key);
                            const isPast = d < today;
                            const isToday = d.getTime() === today.getTime();
                            return (
                              <div
                                key={key}
                                title={`${key}${info ? ` — ${info.name}` : ""}`}
                                style={{
                                  width: CELL, height: CELL, borderRadius: 2, flexShrink: 0,
                                  background: info ? info.color : "#EBEDF0",
                                  opacity: info && isPast ? 0.25 : 1,
                                  outline: isToday ? "2px solid #111827" : "none",
                                  outlineOffset: "-1px",
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {rooms.length === 0 && (
                    <Text type="secondary" style={{ fontSize: 13 }}>No hay habitaciones en este alojamiento.</Text>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Tab: Consumos Estimados ─────────────────────────────────── */}
      {activeTab === "consumos" && (
        <div style={{ marginTop: 24 }}>
          <ConsumoTab accId={accId} subTab={activeSubTab} rooms={rooms} />
        </div>
      )}

      {/* ── Tab: Facturas ──────────────────────────────────────────── */}
      {activeTab === "facturas" && (
        <div style={{ marginTop: 24 }}>
          <FacturasTab accId={accId} subTab={activeSubTab} clientAccountId={accommodation?.client_account_id} />
        </div>
      )}

      {/* ── Tab: Hucha Energética (pendiente) ────────────────────────── */}
      {activeTab === "hucha" && (
        <div style={{ marginTop: 24, padding: "48px 0", textAlign: "center", background: "#F9FAFB", borderRadius: 12, border: "1px dashed #E5E7EB" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
          <Text strong style={{ fontSize: 16, color: "#374151", display: "block", marginBottom: 6 }}>Hucha Energética</Text>
          <Text type="secondary" style={{ fontSize: 14 }}>Sección en construcción</Text>
        </div>
      )}


      {activeTab === "habitaciones" && loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((i) => (
            <Col key={i} xs={24} sm={12} md={8} xl={6}><Card><Skeleton active paragraph={{ rows: 4 }} /></Card></Col>
          ))}
        </Row>
      ) : activeTab === "habitaciones" && rooms.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "40px 0", borderStyle: "dashed" }}>
          <HomeOutlined style={{ fontSize: 40, color: "#D1D5DB", marginBottom: 12 }} />
          <div><Text type="secondary">Este alojamiento no tiene habitaciones configuradas</Text></div>
          <Button type="link" onClick={() => navigate(`/v2/admin/alojamientos/${accId}/editar`)} style={{ marginTop: 8 }}>
            Ir a editar alojamiento para añadir habitaciones
          </Button>
        </Card>
      ) : activeTab === "habitaciones" ? (
        <Row gutter={[20, 20]}>
          {rooms.map((room) => {
            const assignment = room.active_assignment?.[0];
            const lodger = assignment?.lodger;
            const isOccupied = room.status === "occupied" || room.status === "pending_checkout";
            const rent = room.monthly_rent != null ? formatCurrency(room.monthly_rent) : null;
            const badgeBg = ROOM_STATUS_BADGE_BG[room.status] || "#6B7280";
            return (
              <Col key={room.id} xs={24} sm={12} md={8} xl={6}>
                <Card
                  style={{
                    borderRadius: 16,
                    border: "1px solid #E5E7EB",
                    background: "#FFFFFF",
                    height: "100%",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                  }}
                  styles={{ body: { padding: "20px 20px 0 20px", background: "#fff" } }}
                >
                  {/* ── 1: Título + Badge ── */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 22, color: "#1D1D1F", letterSpacing: "-0.3px", lineHeight: 1.2 }}>
                      Habitación &nbsp;{String(room.number).padStart(2, "0")}
                    </Text>
                    <span style={{
                      background: badgeBg, color: "#fff",
                      borderRadius: 20, padding: "4px 16px",
                      fontSize: 13, fontWeight: 700,
                      whiteSpace: "nowrap", flexShrink: 0, marginLeft: 8,
                    }}>
                      {ROOM_STATUS_LABEL[room.status] || room.status}
                    </span>
                  </div>

                  {/* ── 2: Precio ── */}
                  <div style={{ marginBottom: 14, paddingLeft: 2 }}>
                    <Text style={{ fontSize: 14, color: "#6B7280" }}>Precio </Text>
                    {rent
                      ? <><Text strong style={{ fontSize: 16, color: "#1D1D1F" }}>{rent}</Text><Text style={{ fontSize: 14, color: "#6B7280" }}>/mes</Text></>
                      : <Text style={{ fontSize: 14, color: "#9CA3AF" }}>—</Text>
                    }
                  </div>

                  {/* ── 3: Características 2 columnas ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 5, columnGap: 8, marginBottom: 16 }}>
                    {room.kitchen_type && (
                      <div>
                        <Text style={{ fontSize: 13, color: "#6B7280" }}>Cocina </Text>
                        <Text strong style={{ fontSize: 13, color: "#1D1D1F" }}>{KITCHEN_LABEL[room.kitchen_type] || room.kitchen_type}</Text>
                      </div>
                    )}
                    {room.size_m2 != null && (
                      <div>
                        <Text style={{ fontSize: 13, color: "#6B7280" }}>Tamaño </Text>
                        <Text strong style={{ fontSize: 13, color: "#1D1D1F" }}>{room.size_m2}m.</Text>
                      </div>
                    )}
                    {room.bathroom_type && (
                      <div>
                        <Text style={{ fontSize: 13, color: "#6B7280" }}>Baño </Text>
                        <Text strong style={{ fontSize: 13, color: "#1D1D1F" }}>{BATHROOM_LABEL[room.bathroom_type] || room.bathroom_type}</Text>
                      </div>
                    )}
                    {room.lock_code && (
                      <div>
                        <Text style={{ fontSize: 13, color: "#6B7280" }}>Cod. Cerradura </Text>
                        <Text strong style={{ fontSize: 13, color: "#1D1D1F" }}>{room.lock_code}</Text>
                      </div>
                    )}
                  </div>

                  {/* ── 4: Divider ── */}
                  <div style={{ height: 1, background: "#E5E7EB", margin: "0 -20px 16px -20px" }} />

                  {/* ── 5: Imagen con margen lateral (siempre fija) ── */}
                  <div
                    style={{ margin: "0 -20px 16px -20px", overflow: "hidden", background: "#F8FAFC", cursor: isOccupied && lodger ? "pointer" : "default", height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={() => { if (isOccupied && lodger) navigate(`/v2/admin/inquilinos/${lodger.id}/editar`); }}
                    title={isOccupied && lodger ? `Editar inquilino: ${lodger.full_name}` : undefined}
                  >
                    <img
                      src={ROOM_CARD_IMAGE}
                      alt="Habitación"
                      style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
                    />
                  </div>

                  {/* ── 6: Datos inquilino (debajo de la foto, altura fija) ── */}
                  <div style={{ minHeight: 68, marginBottom: 4 }}>
                    {isOccupied && lodger ? (
                      <>
                        <Text strong style={{ fontSize: 15, display: "block", color: "#374151", marginBottom: 1 }}>
                          {lodger.full_name}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: 700, color: LODGER_STATUS_COLOR[lodger.onboarding_status] || "#6B7280", display: "block", marginBottom: 1 }}>
                          {LODGER_STATUS_LABEL[lodger.onboarding_status] || lodger.onboarding_status}
                        </Text>
                        {assignment?.move_in_date && (
                          <Text strong style={{ fontSize: 13, color: "#374151", display: "block" }}>
                            Entrada {formatDate(assignment.move_in_date)}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>
                        {room.status === "free" ? "Habitación disponible" : "Sin inquilino asignado"}
                      </Text>
                    )}
                  </div>

                  {/* ── 7: Divider + Botones ── */}
                  <div style={{ height: 1, background: "#E5E7EB", margin: "0 -20px 14px -20px" }} />
                  <div style={{ paddingBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {isOccupied && lodger ? (
                      <>
                        <Tooltip title="Ver detalle">
                          <Button size="small" type="text" icon={<UserOutlined />}
                            onClick={() => navigate(`/v2/admin/inquilinos/${lodger.id}/detalle`)} />
                        </Tooltip>
                        <Tooltip title="Editar inquilino">
                          <Button size="small" type="text" icon={<EditOutlined />}
                            onClick={() => navigate(`/v2/admin/inquilinos/${lodger.id}/editar`)} />
                        </Tooltip>
                        <Tooltip title="Cambiar habitación">
                          <Button size="small" type="text" icon={<SwapOutlined />}
                            onClick={() => navigate(`/v2/admin/inquilinos/${lodger.id}/editar?action=reassign`)} />
                        </Tooltip>
                      </>
                    ) : room.status === "free" ? (
                      <>
                        <Button size="middle" type="primary" icon={<UserAddOutlined />}
                          style={{ borderRadius: 20, fontWeight: 600, fontSize: 13 }}
                          onClick={() => navigate(`/v2/admin/inquilinos/nuevo?acc=${accId}&room=${room.id}`)}>
                          Crear Inquilino Nuevo
                        </Button>
                        <Button size="middle" type="link"
                          style={{ fontSize: 13, padding: 0, color: "#3B82F6", fontWeight: 500 }}
                          onClick={() => openAssignModal(room)}>
                          Buscar Inquilino Existente &gt;
                        </Button>
                      </>
                    ) : null}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : null}

      {/* Modal: buscar inquilino existente */}
      <Modal
        title={<><SearchOutlined style={{ marginRight: 8 }} />Asignar inquilino — Hab. {assignRoom?.number}</>}
        open={!!assignRoom}
        onCancel={() => setAssignRoom(null)}
        footer={[
          <Button key="cancel" onClick={() => setAssignRoom(null)}>Cancelar</Button>,
          <Button key="new" type="primary" icon={<UserAddOutlined />}
            onClick={() => { setAssignRoom(null); navigate(`/v2/admin/inquilinos/nuevo?acc=${accId}&room=${assignRoom?.id}`); }}>
            Crear nuevo inquilino
          </Button>,
        ]}
        width={480}
        destroyOnHidden
      >
        {assignError && (
          <Alert type="error" message={assignError} showIcon style={{ marginBottom: 16 }} closable onClose={() => setAssignError(null)} />
        )}
        <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 14px", marginBottom: 16, border: "1px solid #E5E7EB" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Selecciona un inquilino ya dado de alta para asignarlo directamente a esta habitación, o crea uno nuevo.
          </Text>
        </div>
        <Select
          showSearch
          loading={loadingLodgers || assigningLodger}
          disabled={assigningLodger}
          placeholder="Buscar por nombre o email..."
          optionFilterProp="label"
          style={{ width: "100%", marginBottom: 8 }}
          options={(allLodgers || []).map((l) => {
            const hasAssignment = l.active_assignment && l.active_assignment.length > 0;
            const assignment = hasAssignment ? l.active_assignment[0] : null;
            const roomInfo = assignment?.room ? `Hab. ${assignment.room.number}` : '';
            const accInfo = assignment?.accommodation ? ` - ${assignment.accommodation.name}` : '';
            const assignmentText = hasAssignment ? ` (${roomInfo}${accInfo})` : '';
            
            return {
              value: l.id,
              label: `${l.full_name} — ${l.email}${assignmentText}`,
              disabled: hasAssignment,
            };
          })}
          onSelect={async (lodgerId) => {
            const selectedLodger = allLodgers.find(l => l.id === lodgerId);
            const hasAssignment = selectedLodger?.active_assignment && selectedLodger.active_assignment.length > 0;
            
            if (hasAssignment) {
              // Si ya tiene habitación, redirigir al modal de cambio
              setAssignRoom(null);
              navigate(`/v2/admin/inquilinos/${lodgerId}/editar?action=reassign&acc=${accId}&room=${assignRoom?.id}`);
            } else {
              // Si no tiene habitación, asignar directamente
              setAssigningLodger(true);
              setAssignError(null);
              try {
                const selectedRoom = rooms.find(r => r.id === assignRoom?.id);
                const monthlyRent = selectedRoom?.monthly_rent || 0;
                await assignRoomToLodger(lodgerId, {
                  roomId: assignRoom.id,
                  accommodationId: accId,
                  moveInDate: new Date().toISOString().split('T')[0],
                  billingStartDate: new Date().toISOString().split('T')[0],
                  monthlyRent: monthlyRent,
                  depositAmount: monthlyRent * 2, // Por defecto 2 meses de fianza
                  commissionAmount: null,
                  firstMonthAmount: null,
                });
                message.success('Inquilino asignado correctamente');
                setAssignRoom(null);
                await load();
              } catch (e) {
                setAssignError(e.message);
              } finally {
                setAssigningLodger(false);
              }
            }
          }}
        />
        <Text type="secondary" style={{ fontSize: 11 }}>
          Solo se muestran inquilinos sin habitación asignada. Los inquilinos con habitación aparecen deshabilitados mostrando su ubicación actual.
        </Text>
      </Modal>
    </V2Layout>
  );
}
