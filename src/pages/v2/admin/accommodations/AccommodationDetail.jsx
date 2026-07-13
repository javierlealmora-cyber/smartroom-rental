// src/pages/v2/admin/accommodations/AccommodationDetail.jsx
// Detalle de alojamiento: habitaciones con estado, características e inquilino asignado

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert, Avatar, Button, Card, Checkbox, Col, DatePicker, Divider, Form, Input,
  InputNumber, message, Modal, Popconfirm, Row,
  Select, Skeleton, Space, Switch, Table, Tag, Tooltip, Typography, Upload,
} from "antd";
import {
  AppstoreOutlined, ArrowLeftOutlined, DeleteOutlined, EditOutlined, HomeOutlined, LogoutOutlined,
  PlusOutlined, SaveOutlined, SearchOutlined, SwapOutlined, UnorderedListOutlined, UploadOutlined, UserAddOutlined, UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import V2Layout from "../../../../layouts/V2Layout";
import { getLodgerStatus, getLodgerStatusLabel } from "../../../../utils/lodgerStatus";
import { formatDate, formatCurrency } from "../../../../utils/formatters";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { supabase } from "../../../../services/supabaseClient";
import { listAccommodations } from "../../../../services/accommodations.service";
import { IllustrationRoom } from "../../../../components/icons3d/Illustrations3D";
import { listEntities } from "../../../../services/entities.service";
import { updateAccommodation } from "../../../../services/accommodations.service";
import { assignRoomToLodger } from "../../../../services/lodgers.service";
import { PROVINCIAS_ES } from "../../../../constants/formOptions";
import ConsumoTab from "./tabs/ConsumoTab";
import FacturasTab from "./tabs/FacturasTab";
import RoomAssignmentForm from "../tenants/components/RoomAssignmentForm";

const { Title, Text } = Typography;

const ROOM_STATUS_TAG = { free: "success", occupied: "error", pending_checkout: "warning", maintenance: "default", reserved: "warning" };
const ROOM_STATUS_LABEL = { free: "Libre", occupied: "Ocupada", pending_checkout: "Pendiente baja", maintenance: "Mantenimiento", reserved: "Reservada" };
const ROOM_STATUS_BG = {
  free: { card: "#F0FDF4", border: "#D1FAE5", icon: "#DCFCE7", text: "#16A34A" },
  occupied: { card: "#FFF5F5", border: "#FEE2E2", icon: "#FEE2E2", text: "#DC2626" },
  pending_checkout: { card: "#FFFBEB", border: "#FEF3C7", icon: "#FEF3C7", text: "#D97706" },
  maintenance: { card: "#F9FAFB", border: "#E5E7EB", icon: "#E5E7EB", text: "#6B7280" },
  reserved: { card: "#FFF7ED", border: "#FED7AA", icon: "#FED7AA", text: "#C2410C" },
};
const ROOM_STATUS_BADGE_BG = {
  free:             { bg: "#DCFCE7", color: "#15803D" },
  occupied:         { bg: "#FFE4E6", color: "#BE123C" },
  pending_checkout: { bg: "#FEF3C7", color: "#B45309" },
  maintenance:      { bg: "#F3F4F6", color: "#4B5563" },
  reserved:         { bg: "#FED7AA", color: "#C2410C" },
};
const LODGER_STATUS_COLOR = { active: "#059669", invited: "#3B82F6", pending_checkout: "#F59E0B", inactive: "#9CA3AF" };
const LODGER_STATUS_LABEL = { active: "Activo", invited: "Invitado", pending_checkout: "Pendiente baja", inactive: "Inactivo" };
const KITCHEN_LABEL = { shared: "Compartida", private: "Privada", none: "Sin cocina" };
const BATHROOM_LABEL = { shared: "Compartido", private: "Privado", ensuite: "En suite" };

const ROOM_IMG_FREE     = "/images/Habitación sin Inquilino en la cama.png";
const ROOM_IMG_OCCUPIED = "/images/Habitación con Inquilino en la cama.webp";
const ROOM_IMG_FEMALE   = "/images/Habitación con Inqulina en la cama.webp";

// ✅ REFACTOR: Funciones de formateo centralizadas en utils/formatters.js

// Estado de habitación calculado desde asignaciones (rooms.status solo importa para 'maintenance')
// active_assignment: asignaciones con move_in_date <= hoy (ya empezadas)
// future_assignment: asignaciones con move_in_date > hoy (reservas futuras)
function getRoomStatus(room) {
  if (room.is_maintenance) return "maintenance";
  const today = new Date().toISOString().split("T")[0];
  const current = (room.active_assignment || []).find(
    a => a.move_in_date <= today && (!a.move_out_date || a.move_out_date > today)
  );
  const upcoming = (room.future_assignment || []).find(
    a => a.move_in_date > today
  );
  if (!current && !upcoming) return "free";
  if (!current && upcoming) return "reserved";
  if (current && !current.move_out_date) return "occupied";
  return "pending_checkout";
}

// Devuelve la asignación futura (reserva) si existe
function getRoomUpcoming(room) {
  const today = new Date().toISOString().split("T")[0];
  return (room.future_assignment || []).find(a => a.move_in_date > today) ?? null;
}

// ✅ REFACTOR: Funciones de estado de inquilino centralizadas en utils/lodgerStatus.js

// Colores personalizados para badges de estado de inquilino (específicos de este componente)
const LODGER_STATUS_BADGE = {
  active:           { bg: "#DCFCE7", color: "#15803D" },
  pending_checkout: { bg: "#FEF3C7", color: "#B45309" },
  inactive:         { bg: "#F3F4F6", color: "#4B5563" },
  invited:          { bg: "#DBEAFE", color: "#1D4ED8" },
};
function getLodgerStatusColor(status) {
  return LODGER_STATUS_BADGE[status] || LODGER_STATUS_BADGE.inactive;
}

// Función para generar consumos moqueados basados en días de estancia
function generateMockedConsumptions(moveInDate, checkOutDate) {
  if (!moveInDate || !checkOutDate) return { water: 0, electricity: 0, gas: 0 };
  
  const days = dayjs(checkOutDate).diff(dayjs(moveInDate), 'day');
  const months = Math.max(1, Math.ceil(days / 30));
  
  // Consumos base por mes con variación aleatoria
  const waterPerMonth = 15 + Math.random() * 10; // 15-25€/mes
  const electricityPerMonth = 25 + Math.random() * 20; // 25-45€/mes
  const gasPerMonth = 10 + Math.random() * 15; // 10-25€/mes
  
  return {
    water: parseFloat((waterPerMonth * months).toFixed(2)),
    electricity: parseFloat((electricityPerMonth * months).toFixed(2)),
    gas: parseFloat((gasPerMonth * months).toFixed(2)),
  };
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
  
  // Estados para formulario completo de asignación
  const [selectedLodgerForAssignment, setSelectedLodgerForAssignment] = useState(null);
  const [payUntilEndOfMonth, setPayUntilEndOfMonth] = useState(false);
  const [assignmentForm] = Form.useForm();
  
  // Estados para modal de cambio de habitación
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [lodgerToReassign, setLodgerToReassign] = useState(null);
  const [reassignForm] = Form.useForm();
  const [reassignAccommodations, setReassignAccommodations] = useState([]);
  const [reassignFreeRooms, setReassignFreeRooms] = useState([]);
  const [loadingReassignRooms, setLoadingReassignRooms] = useState(false);
  const [reassignEntityId, setReassignEntityId] = useState(null);
  const [reassignCheckoutDate, setReassignCheckoutDate] = useState(null);
  
  // Estados para modal de check-out
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [lodgerToCheckout, setLodgerToCheckout] = useState(null);

  const [checkoutForm] = Form.useForm();
  const [mockedConsumptions, setMockedConsumptions] = useState(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);

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
  // Tab state — si viene ?tab=datos arranca en Datos del Alojamiento → Información
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "habitaciones";
  const initialSubTab = searchParams.get("subtab");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSubTab, setActiveSubTab] = useState(
    initialSubTab || (initialTab === "datos" ? "datos-alojamiento" : null)
  );

  // ── Filtros en pestaña Habitaciones (se limpian en cada entrada) ─────────
  const [roomStatusFilter,   setRoomStatusFilter]   = useState(null);
  const [roomBathroomFilter, setRoomBathroomFilter] = useState(null);
  const [roomKitchenFilter,  setRoomKitchenFilter]  = useState(null);
  const [roomViewMode,       setRoomViewMode]       = useState(
    () => localStorage.getItem("smartrent_accdetail_viewMode") || "cards"
  );
  const [hoveredRoomId, setHoveredRoomId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [{ data: acc, error: accErr }, { data: roomsData, error: roomsErr }, entities, { data: currentAssignments }, { data: futureAssignments }] = await Promise.all([
        supabase.from("accommodations")
          .select("*, owner_entity:entities!left(id, legal_name, first_name, last_name1, legal_type)")
          .eq("id", accId).single(),
        supabase.from("rooms")
          .select("*")
          .eq("accommodation_id", accId)
          .order("number"),
        listEntities({ type: "owner" }),
        // Asignaciones ya empezadas (move_in_date <= hoy) y no terminadas
        supabase.from("lodger_room_assignments")
          .select("id, room_id, move_in_date, move_out_date, monthly_rent, deposit_amount, accompanist_id, lodger:profiles(id, full_name, email, phone, onboarding_status, gender)")
          .eq("accommodation_id", accId)
          .lte("move_in_date", today)
          .or(`move_out_date.is.null,and(move_out_date.gt.${today},move_out_date.not.is.null)`),
        // Asignaciones futuras (reservas: move_in_date > hoy)
        supabase.from("lodger_room_assignments")
          .select("id, room_id, move_in_date, move_out_date, monthly_rent, accompanist_id, lodger:profiles(id, full_name, email, phone, onboarding_status, gender)")
          .eq("accommodation_id", accId)
          .gt("move_in_date", today),
      ]);
      if (accErr) throw new Error(accErr.message);
      if (roomsErr) throw new Error(roomsErr.message);
      setAccommodation(acc);

      // Adjuntar asignaciones a cada habitación (actuales y futuras separadas)
      const roomsWithAssignments = (roomsData || []).map(room => {
        const active = (currentAssignments || []).filter(a => a.room_id === room.id);
        const future = (futureAssignments || []).filter(a => a.room_id === room.id);
        return {
          ...room,
          active_assignment: active,
          future_assignment: future,
        };
      });

      // Cargar TODAS las asignaciones de cada inquilino para getLodgerStatus
      const lodgerIds = [
        ...(currentAssignments || []),
        ...(futureAssignments || []),
      ].map(a => a.lodger?.id).filter(Boolean);

      if (lodgerIds.length > 0) {
        const { data: allAssignments } = await supabase
          .from("lodger_room_assignments")
          .select("id, lodger_id, move_in_date, move_out_date, room_id, accommodation_id")
          .in("lodger_id", lodgerIds);

        roomsWithAssignments.forEach(room => {
          // Enriquecer inquilino actual con todas sus asignaciones
          const lodger = room.active_assignment?.[0]?.lodger;
          if (lodger) {
            lodger.assignments = (allAssignments || []).filter(a => a.lodger_id === lodger.id);
          }
          // Enriquecer inquilino de reserva futura también
          const futureLodger = room.future_assignment?.[0]?.lodger;
          if (futureLodger && futureLodger.id !== lodger?.id) {
            futureLodger.assignments = (allAssignments || []).filter(a => a.lodger_id === futureLodger.id);
          }
        });
      }

      setRooms(roomsWithAssignments);
      setOwnerEntities((entities || []).filter((e) => e.status === "active"));
      setExtraCosts(acc.extra_costs || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accId]);

  useEffect(() => { load(); }, [load]);

  // Cargar alojamientos cuando se abre el modal de reasignación
  useEffect(() => {
    if (!showReassignModal) return;
    setReassignFreeRooms([]);
    listAccommodations()
      .then(data => setReassignAccommodations(data || []))
      .catch(() => setReassignAccommodations([]));
  }, [showReassignModal]);

  // Cargar habitaciones libres en una fecha concreta (no hoy)
  const loadFreeRoomsForDate = useCallback(async (selectedAccId, changeDate) => {
    if (!selectedAccId || !changeDate) {
      setReassignFreeRooms([]);
      return;
    }
    setLoadingReassignRooms(true);
    try {
      const dateStr = typeof changeDate === "string"
        ? changeDate
        : changeDate.format("YYYY-MM-DD");
      const { data: roomsData } = await supabase
        .from("rooms").select("id, number, monthly_rent, is_maintenance")
        .eq("accommodation_id", selectedAccId).order("number");
      const { data: occupiedOnDate } = await supabase
        .from("lodger_room_assignments").select("room_id")
        .eq("accommodation_id", selectedAccId)
        .lte("move_in_date", dateStr)
        .or(`move_out_date.is.null,move_out_date.gt.${dateStr}`);
      const occupiedIds = new Set((occupiedOnDate || []).map(a => a.room_id));
      setReassignFreeRooms((roomsData || []).filter(r => !r.is_maintenance && !occupiedIds.has(r.id)));
    } finally {
      setLoadingReassignRooms(false);
    }
  }, []);

  // BUG-036 fix: Escuchar evento de checkout para recargar habitaciones
  useEffect(() => {
    const handleCheckout = (event) => {
      if (event.detail?.accommodationId === accId) {
        load();
      }
    };
    
    window.addEventListener('lodger-checkout', handleCheckout);
    return () => window.removeEventListener('lodger-checkout', handleCheckout);
  }, [accId, load]);

  // Poblar accForm solo cuando el tab "datos" está activo (Form renderizado → sin warning)
  useEffect(() => {
    if (!accommodation || activeTab !== "datos") return;
    accForm.setFieldsValue({
      name: accommodation.name,
      owner_entity_id: accommodation.owner_entity_id,
      address_street: accommodation.address_street || accommodation.address_line1 || "",
      address_number: accommodation.address_number || "",
      address_floor: accommodation.address_floor || "",
      address_postal_code: accommodation.address_postal_code || accommodation.postal_code || "",
      address_city: accommodation.address_city || accommodation.city || "",
      address_province: accommodation.address_province || null,
      address_country: accommodation.address_country || "España",
      notes: accommodation.notes || "",
      status: accommodation.status,
      // Configuración por suministro
      // included_X = true → "Incluido en el Alquiler" (toggle verde, sin reparto)
      // included_X = false → "No Incluido" → muestra opciones de reparto
      included_electricity:  !(accommodation.split_electricity || false),
      equal_electricity:     (accommodation.split_mode_electricity || "equal") !== "meter",
      meter_electricity:     accommodation.split_mode_electricity === "meter",
      prevision_electricity: accommodation.prevision_fund_electricity || 0,
      included_water:        !(accommodation.split_water || false),
      equal_water:           (accommodation.split_mode_water || "equal") !== "meter",
      meter_water:           accommodation.split_mode_water === "meter",
      prevision_water:       accommodation.prevision_fund_water || 0,
      included_gas:          !(accommodation.split_gas || false),
      equal_gas:             (accommodation.split_mode_gas || "equal") !== "meter",
      meter_gas:             accommodation.split_mode_gas === "meter",
      prevision_gas:         accommodation.prevision_fund_gas || 0,
    });
  }, [accommodation, activeTab, accForm]);

  useEffect(() => {
    if (activeTab !== "ocupacion") return;
    if (!clientAccountId) return;
    setLoadingGantt(true);
    
    // Cargar asignaciones y perfiles por separado para evitar error de relación obsoleta
    Promise.all([
      supabase
        .from("lodger_room_assignments")
        .select("id, room_id, lodger_id, move_in_date, move_out_date")
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
            id, room_id, accommodation_id,
            room:rooms(id, number),
            accommodation:accommodations(id, name)
          )
        `)
        .eq("role", "lodger")
        .eq("client_account_id", clientAccountId)
        .is("lodger_room_assignments.move_out_date", null)
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
      // Patch base — campos garantizados en el schema desde el baseline
      await updateAccommodation(accId, {
        name: values.name,
        owner_entity_id: values.owner_entity_id,
        address_street: values.address_street || null,
        address_number: values.address_number || null,
        address_floor: values.address_floor || null,
        address_postal_code: values.address_postal_code || null,
        address_city: values.address_city || null,
        address_province: values.address_province || null,
        address_country: values.address_country || "España",
        notes: values.notes || null,
        status: values.status,
        // Configuración por suministro (included_X es la inversa de split_X en BD)
        split_electricity:      !values.included_electricity,
        split_mode_electricity: values.meter_electricity ? "meter" : "equal",
        split_water:            !values.included_water,
        split_mode_water:       values.meter_water ? "meter" : "equal",
        split_gas:              !values.included_gas,
        split_mode_gas:         values.meter_gas ? "meter" : "equal",
        extra_costs: extraCosts.map((ec) => ({ ...ec, period: ec.period || "monthly" })),
      }, clientAccountId);

      // Prevision fund — migración BUG-050 aplicada
      await supabase.from("accommodations").update({
        prevision_fund_electricity: values.prevision_electricity || 0,
        prevision_fund_water:       values.prevision_water || 0,
        prevision_fund_gas:         values.prevision_gas || 0,
      }).eq("id", accId).eq("client_account_id", clientAccountId);

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
    const next = !room.is_maintenance;
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ is_maintenance: next })
        .eq("id", room.id)
        .eq("client_account_id", clientAccountId);
      if (error) throw new Error(error.message);
      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, is_maintenance: next } : r));
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
        })
        .select()
        .single();
      if (error) {
        console.error("Error inserting room:", error);
        throw new Error(error.message);
      }
      console.log("Room added successfully:", newRoom);
      setRooms((prev) => [...prev, { ...newRoom, active_assignment: [] }]);
      setAddingRoom(false);
      newRoomForm.resetFields();
    } catch (e) {
      console.error("Exception in onAddRoom:", e);
      setSaveError(e.message);
    }
  };

  const roomColumns = [
    { title: "Nº", dataIndex: "number", key: "number", width: 240, render: (v) => <Text strong>{v}</Text> },
    { title: "Estado", key: "status", width: 120,
      render: (_, room) => {
        const s = getRoomStatus(room);
        const badge = ROOM_STATUS_BADGE_BG[s] || { bg: "#F3F4F6", color: "#4B5563" };
        return (
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500, background: badge.bg, color: badge.color }}>
            {ROOM_STATUS_LABEL[s] || s}
          </span>
        );
      }},
    { title: "Precio/mes", dataIndex: "monthly_rent", key: "monthly_rent", width: 110,
      render: (v) => v != null ? formatCurrency(v) : "-" },
    { title: "m²", dataIndex: "square_meters", key: "square_meters", width: 70,
      render: (v) => v ? `${v} m²` : "-" },
    { title: "Baño", dataIndex: "bathroom_type", key: "bathroom_type", responsive: ["lg"],
      render: (v) => BATHROOM_OPTIONS.find((o) => o.value === v)?.label || v },
    { title: "Cocina", dataIndex: "kitchen_type", key: "kitchen_type", responsive: ["lg"],
      render: (v) => KITCHEN_OPTIONS.find((o) => o.value === v)?.label || v },
    { title: "Notas", dataIndex: "notes", key: "notes", responsive: ["xl"],
      render: (v) => v || "-" },
    { title: "Acciones", key: "actions", render: (_, room) => {
      const roomStatus = getRoomStatus(room);
      return (
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
          {roomStatus !== "occupied" && roomStatus !== "pending_checkout" && (
            <Popconfirm
              title={room.is_maintenance ? "¿Reactivar habitación?" : "¿Desactivar habitación?"}
              onConfirm={() => onToggleRoomStatus(room)} okText="Sí" cancelText="No"
            >
              <Button size="small" danger={!room.is_maintenance}>
                {room.is_maintenance ? "Reactivar" : "Desactivar"}
              </Button>
            </Popconfirm>
          )}
        </Space>
      );
    }},
  ];

  const TABS = [
    {
      key: "datos", label: "Edición de Datos",
      subTabs: [
        { key: "datos-alojamiento", label: "Datos de Alojamiento" },
        { key: "configurar-consumo", label: "Configurar Consumo" },
        { key: "configurar-habitaciones", label: "Configurar Habitaciones" },
      ],
    },
    { key: "ocupacion", label: "Ocupación", subTabs: null },
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
    // Limpiar filtros de habitaciones al cambiar de tab
    if (tab.key === "habitaciones") {
      setRoomStatusFilter(null);
      setRoomBathroomFilter(null);
      setRoomKitchenFilter(null);
    }
  };

  const handleSubTabClick = (subTab) => {
    setActiveSubTab(subTab.key);
  };

  // ── Habitaciones filtradas ────────────────────────────────────────────────
  const filteredRooms = rooms.filter((r) => {
    if (roomStatusFilter   && getRoomStatus(r) !== roomStatusFilter)   return false;
    if (roomBathroomFilter && r.bathroom_type  !== roomBathroomFilter) return false;
    if (roomKitchenFilter  && r.kitchen_type   !== roomKitchenFilter)  return false;
    return true;
  });
  const hasRoomFilters = roomStatusFilter || roomBathroomFilter || roomKitchenFilter;

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 10 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(backPath)}
          style={{ paddingLeft: 0, color: "#6B7280", marginBottom: 10, fontSize: 14 }}>
          {backLabel}
        </Button>

        {loading ? <Skeleton active title={{ width: 260 }} paragraph={{ rows: 1 }} /> : (
          <Row justify="space-between" align="top">
            <Col flex="auto">
              <Title level={2} style={{ margin: 0, fontWeight: 700, fontSize: 28, letterSpacing: "-0.5px", color: "#1D1D1F", marginBottom: 4 }}>
                <HomeOutlined style={{ marginRight: 10, color: "#1D1D1F" }} />{accommodation?.name}
              </Title>
              <Text style={{ fontSize: 14, color: "#6B7280" }}>
                {/* Compatibilidad con ambos esquemas de dirección */}
                {(() => {
                  const street = accommodation?.address_street || accommodation?.address_line1 || "";
                  const number = accommodation?.address_number || "";
                  const floor = accommodation?.address_floor || "";
                  const postal = accommodation?.address_postal_code || accommodation?.postal_code || "";
                  const city = accommodation?.address_city || accommodation?.city || "";
                  return [
                    [street, number].filter(Boolean).join(" "),
                    floor,
                    postal,
                    city,
                  ].filter(Boolean).join(", ") || "Sin dirección";
                })()}
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

      {/* ── Tab: Edición de Datos — Sub-tabs con formulario compartido ─── */}
      {activeTab === "datos" && (activeSubTab === "datos-alojamiento" || activeSubTab === "configurar-consumo") && (
        <div style={{ marginTop: 24 }}>
          {saveError && <Alert type="error" message={saveError} showIcon closable onClose={() => setSaveError(null)} style={{ marginBottom: 16 }} />}
          {saveOk && <Alert type="success" message="Alojamiento guardado correctamente" showIcon style={{ marginBottom: 16 }} />}

          {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : (
            <Form form={accForm} layout="vertical" onFinish={onSaveAccommodation}>

              {/* Sub-tab: Datos de Alojamiento */}
              <div style={{ display: activeSubTab === "datos-alojamiento" ? "block" : "none" }}>
                <Card title="Datos de Alojamiento" size="small" style={{ marginBottom: 16 }}>
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
                  <Col xs={24} sm={12}>
                    <Form.Item label="Calle / Vía" name="address_street" rules={[
                      { required: true, message: "La calle es obligatoria" },
                      { min: 3, message: "La calle debe tener al menos 3 caracteres" },
                      { max: 200, message: "La calle no puede exceder 200 caracteres" }
                    ]}>
                      <Input placeholder="Calle Gran Vía, Av. de la Constitución..." maxLength={200} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={4}>
                    <Form.Item label="Número" name="address_number">
                      <Input placeholder="12" maxLength={10} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Piso / Puerta / Escalera" name="address_floor">
                      <Input placeholder="2º A, Escalera B..." maxLength={50} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={4}>
                    <Form.Item label="C.P." name="address_postal_code" rules={[
                      { required: true, message: "El código postal es obligatorio" },
                      { pattern: /^\d{5}$/, message: "Debe ser un código postal válido de 5 dígitos" }
                    ]}>
                      <Input placeholder="28001" maxLength={5} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Ciudad / Municipio" name="address_city" rules={[
                      { required: true, message: "La ciudad es obligatoria" },
                      { min: 2, message: "La ciudad debe tener al menos 2 caracteres" },
                      { max: 100, message: "La ciudad no puede exceder 100 caracteres" }
                    ]}>
                      <Input placeholder="Madrid" maxLength={100} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Form.Item label="Provincia" name="address_province" rules={[{ required: true, message: "La provincia es obligatoria" }]}>
                      <Select showSearch placeholder="Seleccionar provincia..." optionFilterProp="label"
                        options={PROVINCIAS_ES} allowClear
                        filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Form.Item label="País" name="address_country" rules={[{ required: true, message: "El país es obligatorio" }]}>
                      <Input placeholder="España" maxLength={100} />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item label="Notas" name="notes">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
              </div>

              {/* Sub-tab: Configurar Consumo */}
              <div style={{ display: activeSubTab === "configurar-consumo" ? "block" : "none" }}>
              <Card title="Configuración de Consumo" size="small" style={{ marginBottom: 16 }}>
                {/* Helper local: bloque por suministro */}
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue, setFieldValue }) => {
                    const UTILITIES = [
                      { key: "electricity", label: "Electricidad", icon: "⚡" },
                      { key: "water",       label: "Agua",         icon: "💧" },
                      { key: "gas",         label: "Gas",          icon: "🔥" },
                    ];
                    return (
                      <Row gutter={[16, 0]}>
                        {UTILITIES.map(({ key, label, icon }) => {
                          const includedKey = `included_${key}`;
                          const equalKey    = `equal_${key}`;
                          const meterKey    = `meter_${key}`;
                          const prevKey     = `prevision_${key}`;
                          const isIncluded  = getFieldValue(includedKey);
                          const isEqual     = getFieldValue(equalKey);
                          const isMeter     = getFieldValue(meterKey);
                          return (
                            <Col key={key} xs={24} sm={8} style={{ borderRight: "1px solid #F3F4F6", paddingRight: 12, marginBottom: 16 }}>
                              {/* Toggle Incluido / No Incluido */}
                              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                                <Switch
                                  size="small"
                                  checked={isIncluded}
                                  onChange={(v) => setFieldValue(includedKey, v)}
                                />
                                <Text style={{ fontSize: 14, fontWeight: 600 }}>{icon} {label}</Text>
                              </div>
                              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12, paddingLeft: 2 }}>
                                {isIncluded ? "Incluido en el Alquiler" : "No Incluido en el Alquiler"}
                              </div>

                              {!isIncluded && (
                                <>
                                  {/* Previsión Fondo */}
                                  <div style={{ marginBottom: 14 }}>
                                    <Text style={{ fontSize: 12, color: "#374151", display: "block", marginBottom: 4 }}>
                                      Previsión Fondo
                                    </Text>
                                    <Form.Item name={prevKey} noStyle>
                                      <InputNumber
                                        size="small"
                                        min={0}
                                        precision={2}
                                        addonAfter="€"
                                        style={{ width: "100%" }}
                                      />
                                    </Form.Item>
                                  </div>

                                  {/* Reparto de Consumo Igualitario */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                                    <Switch
                                      size="small"
                                      checked={isEqual}
                                      onChange={(v) => {
                                        setFieldValue(equalKey, v);
                                        if (v) setFieldValue(meterKey, false);
                                      }}
                                    />
                                    <Text style={{ fontSize: 12 }}>Reparto de Consumo Igualitario</Text>
                                  </div>

                                  {/* Tiene Medidor individual */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                                    <Switch
                                      size="small"
                                      checked={isMeter}
                                      disabled={isEqual}
                                      onChange={(v) => {
                                        setFieldValue(meterKey, v);
                                        if (v) setFieldValue(equalKey, false);
                                      }}
                                    />
                                    <Text style={{ fontSize: 12, color: isEqual ? "#9CA3AF" : undefined }}>
                                      Tiene Medidor individual por habitación
                                    </Text>
                                  </div>
                                  {isEqual && (
                                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                                      Desactiva reparto igualitario para habilitar medidor
                                    </div>
                                  )}
                                </>
                              )}
                            </Col>
                          );
                        })}
                      </Row>
                    );
                  }}
                </Form.Item>

                {/* Otros gastos adicionales */}
                <Divider orientation="left" plain style={{ fontSize: 13, color: "#6B7280", marginTop: 8 }}>
                  Otros gastos adicionales
                </Divider>
                <div style={{ marginBottom: 8 }}>
                  <Row gutter={[8, 4]} style={{ marginBottom: 4 }}>
                    <Col xs={10} sm={7}><Text style={{ fontSize: 12, color: "#6B7280" }}>Concepto</Text></Col>
                    <Col xs={6}  sm={4}><Text style={{ fontSize: 12, color: "#6B7280" }}>Importe</Text></Col>
                    <Col xs={6}  sm={5}><Text style={{ fontSize: 12, color: "#6B7280" }}>Periodo Pago</Text></Col>
                  </Row>
                  {extraCosts.map((ec, idx) => (
                    <Row key={idx} gutter={[8, 8]} align="middle" style={{ marginBottom: 6 }}>
                      <Col xs={10} sm={7}>
                        <Input
                          size="small"
                          placeholder="Concepto (ej. WiFi, Basura...)"
                          value={ec.name}
                          onChange={(e) => setExtraCosts((prev) => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                        />
                      </Col>
                      <Col xs={6} sm={4}>
                        <InputNumber
                          size="small"
                          style={{ width: "100%" }}
                          placeholder="Importe"
                          value={ec.amount}
                          onChange={(v) => setExtraCosts((prev) => prev.map((x, i) => i === idx ? { ...x, amount: v } : x))}
                          min={0}
                          precision={2}
                          addonAfter="€"
                        />
                      </Col>
                      <Col xs={6} sm={5}>
                        <Select
                          size="small"
                          style={{ width: "100%" }}
                          value={ec.period || "monthly"}
                          onChange={(v) => setExtraCosts((prev) => prev.map((x, i) => i === idx ? { ...x, period: v } : x))}
                          options={[
                            { value: "monthly", label: "Mensual" },
                            { value: "annual",  label: "Anual" },
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
                    onClick={() => setExtraCosts((prev) => [...prev, { name: "", amount: 0, period: "monthly" }])}>
                    Añadir gasto adicional
                  </Button>
                </div>
              </Card>
              </div>

              <Row justify="end">
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
                  Guardar Alojamiento
                </Button>
              </Row>
            </Form>

          )}
        </div>
      )}

      {/* ── Sub-tab: Configurar Habitaciones ─── */}
      {activeTab === "datos" && activeSubTab === "configurar-habitaciones" && !loading && (
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
                    <Col span={12}>
                      <Form.Item 
                        name="notes" 
                        label="Notas"
                      >
                        <Input placeholder="Notas opcionales..." />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
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

      {/* ── Tab principal: Ocupación — Gantt ──────────────────────── */}
      {activeTab === "ocupacion" && (() => {
        const CELL_W = 6;   // ancho: 6px + 1px gap → 181 días (6 meses) ≈ 1260px
        const CELL_H = 18;  // alto mayor que ancho → rectángulo vertical
        const PALETTE = [
          "#93C5FD", "#6EE7B7", "#FCD34D", "#FCA5A5", "#C4B5FD",
          "#F9A8D4", "#67E8F9", "#FDBA74", "#A5B4FC", "#BEF264",
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
                    <span title="Presente / futuro" style={{ display: "inline-block", width: 6, height: 18, background: color, borderRadius: 1, opacity: 1 }} />
                    <span title="Histórico" style={{ display: "inline-block", width: 6, height: 18, background: color, borderRadius: 1, opacity: 0.45 }} />
                    <Text style={{ fontSize: 12, color: "#374151" }}>{name}</Text>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ display: "inline-block", width: 6, height: 18, background: "#EBEDF0", borderRadius: 1 }} />
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
                      <div key={m.idx} style={{ width: m.span * (CELL_W + 1), fontSize: 11, color: "#6B7280", fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap" }}>
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
                                  width: CELL_W, height: CELL_H, borderRadius: 1, flexShrink: 0,
                                  background: info ? info.color : "#EBEDF0",
                                  opacity: info && isPast ? 0.45 : 1,
                                  outline: isToday ? "2px solid #9CA3AF" : "none",
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
          <Button type="link" onClick={() => { setActiveTab("datos"); setActiveSubTab("configurar-habitaciones"); }} style={{ marginTop: 8 }}>
            Ir a Edición de Datos para añadir habitaciones
          </Button>
        </Card>
      ) : activeTab === "habitaciones" ? (
        <div style={{ marginTop: 6 }}>
          {/* ── Cabecera filtros habitaciones ── */}
          {rooms.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Select
                  placeholder="Estado"
                  size="small"
                  style={{ width: 150 }}
                  allowClear
                  value={roomStatusFilter}
                  onChange={v => setRoomStatusFilter(v ?? null)}
                  options={[
                    { value: "free",             label: "Libre" },
                    { value: "occupied",         label: "Ocupada" },
                    { value: "pending_checkout", label: "Pend. checkout" },
                    { value: "maintenance",      label: "Mantenimiento" },
                    { value: "reserved",         label: "Reservada" },
                  ]}
                />
                <Select
                  placeholder="Baño"
                  size="small"
                  style={{ width: 140 }}
                  allowClear
                  value={roomBathroomFilter}
                  onChange={v => setRoomBathroomFilter(v ?? null)}
                  options={[
                    { value: "shared",  label: "Compartido" },
                    { value: "private", label: "Privado" },
                    { value: "ensuite", label: "En suite" },
                  ]}
                />
                <Select
                  placeholder="Cocina"
                  size="small"
                  style={{ width: 140 }}
                  allowClear
                  value={roomKitchenFilter}
                  onChange={v => setRoomKitchenFilter(v ?? null)}
                  options={[
                    { value: "shared",  label: "Compartida" },
                    { value: "private", label: "Privada" },
                    { value: "none",    label: "Sin cocina" },
                  ]}
                />
                {hasRoomFilters && (
                  <Button
                    type="link"
                    danger
                    size="small"
                    style={{ paddingLeft: 0 }}
                    onClick={() => { setRoomStatusFilter(null); setRoomBathroomFilter(null); setRoomKitchenFilter(null); }}
                  >
                    Limpiar
                  </Button>
                )}
                <Text style={{ color: "#9CA3AF", fontSize: 13, marginLeft: "auto" }}>
                  {filteredRooms.length}{filteredRooms.length !== rooms.length ? ` de ${rooms.length}` : ""} habitaciones
                </Text>
                <Space size={4} style={{ marginLeft: 12 }}>
                  <Button
                    size="small"
                    icon={<AppstoreOutlined />}
                    type={roomViewMode === "cards" ? "primary" : "default"}
                    onClick={() => { setRoomViewMode("cards"); localStorage.setItem("smartrent_accdetail_viewMode", "cards"); }}
                  />
                  <Button
                    size="small"
                    icon={<UnorderedListOutlined />}
                    type={roomViewMode === "list" ? "primary" : "default"}
                    onClick={() => { setRoomViewMode("list"); localStorage.setItem("smartrent_accdetail_viewMode", "list"); }}
                  />
                </Space>
              </div>
            </div>
          )}
          {roomViewMode === "list" ? (
            <Table
              dataSource={filteredRooms}
              rowKey="id"
              size="middle"
              pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `${t} habitaciones` }}
              scroll={{ x: 700 }}
              columns={[
                {
                  title: "N.º",
                  key: "number",
                  width: 90,
                  render: (_, r) => {
                    const num = String(r.number);
                    return num.startsWith("HAB-") ? num : `HAB-${num.padStart(3, "0")}`;
                  },
                },
                {
                  title: "Estado",
                  key: "status",
                  width: 130,
                  render: (_, r) => {
                    const st = getRoomStatus(r);
                    const badge = ROOM_STATUS_BADGE_BG[st] || { bg: "#F3F4F6", color: "#4B5563" };
                    return (
                      <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                        {ROOM_STATUS_LABEL[st] || st}
                      </span>
                    );
                  },
                },
                {
                  title: "Inquilino",
                  key: "lodger",
                  render: (_, r) => {
                    const st = getRoomStatus(r);
                    const asgn = r.active_assignment?.[0];
                    const lodger = asgn?.lodger;
                    const up = getRoomUpcoming(r);
                    if ((st === "occupied" || st === "pending_checkout") && lodger) {
                      return (
                        <span>
                          <span style={{ fontWeight: 600 }}>{lodger.full_name}</span>
                          {asgn?.move_in_date && <span style={{ color: "#6B7280", fontSize: 11, marginLeft: 8 }}>desde {formatDate(asgn.move_in_date)}</span>}
                          {asgn?.move_out_date && <span style={{ color: "#DC2626", fontSize: 11, marginLeft: 8 }}>baja {formatDate(asgn.move_out_date)}</span>}
                        </span>
                      );
                    }
                    if (st === "reserved" && up?.lodger) {
                      return <span style={{ color: "#C2410C", fontWeight: 600 }}>{up.lodger.full_name} <span style={{ fontWeight: 400, fontSize: 11 }}>(entrada {formatDate(up.move_in_date)})</span></span>;
                    }
                    return <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>—</span>;
                  },
                },
                {
                  title: "Precio",
                  key: "rent",
                  width: 110,
                  render: (_, r) => r.monthly_rent != null ? formatCurrency(r.monthly_rent) : "—",
                },
                {
                  title: "Baño",
                  key: "bathroom",
                  width: 140,
                  render: (_, r) => r.bathroom_type ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                      <img src="/images/baño-icono.webp" alt="Baño" style={{ width: 18, height: 18, objectFit: "contain" }} />
                      <span style={{ fontSize: 12 }}>{BATHROOM_LABEL[r.bathroom_type] || r.bathroom_type}</span>
                    </div>
                  ) : "—",
                },
                {
                  title: "Cocina",
                  key: "kitchen",
                  width: 120,
                  render: (_, r) => r.kitchen_type ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <img src="/images/cocina-icono.webp" alt="Cocina" style={{ width: 22, height: 22, objectFit: "contain" }} />
                      <span style={{ fontSize: 12 }}>{KITCHEN_LABEL[r.kitchen_type] || r.kitchen_type}</span>
                    </div>
                  ) : "—",
                },
                {
                  title: "Acciones",
                  key: "actions",
                  width: 130,
                  render: (_, r) => {
                    const st = getRoomStatus(r);
                    const asgn = r.active_assignment?.[0];
                    const lodger = asgn?.lodger;
                    const isOcc = st === "occupied" || st === "pending_checkout";
                    return (
                      <Space size={2}>
                        {isOcc && lodger ? (
                          <>
                            <Tooltip title="Ver detalle"><Button size="small" type="text" icon={<UserOutlined />} onClick={() => navigate(`/v2/admin/inquilinos/${lodger.id}/detalle`)} /></Tooltip>
                            <Tooltip title="Ver / Editar inquilino"><Button size="small" type="text" icon={<EditOutlined />} onClick={() => navigate(`/v2/admin/inquilinos/${lodger.id}/detalle-inquilino`)} /></Tooltip>
                            <Tooltip title="Cambiar habitación"><Button size="small" type="text" icon={<SwapOutlined />} onClick={() => { const asgn2 = r.active_assignment?.[0]; setLodgerToReassign({ ...lodger, _room: r, _assignment: asgn2 }); setShowReassignModal(true); }} /></Tooltip>
                            {st === "occupied" && <Tooltip title="Check-out"><Button size="small" type="text" danger icon={<LogoutOutlined />} onClick={() => { setLodgerToCheckout({ ...lodger, active_assignment: r.active_assignment }); setShowCheckoutModal(true); }} /></Tooltip>}
                          </>
                        ) : st === "free" ? (
                          <Tooltip title="Asignar inquilino">
                            <Button size="small" type="primary" icon={<UserAddOutlined />} style={{ borderRadius: 20, fontSize: 11 }}
                              onClick={() => setAssignRoom(r)}>
                              Asignar
                            </Button>
                          </Tooltip>
                        ) : null}
                      </Space>
                    );
                  },
                },
              ]}
            />
          ) : (
          <Row gutter={[20, 20]}>
          {filteredRooms.map((room) => {
            const assignment = room.active_assignment?.[0];
            const lodger = assignment?.lodger;
            const roomStatus = getRoomStatus(room);
            const isOccupied = roomStatus === "occupied" || roomStatus === "pending_checkout";
            const rent = room.monthly_rent != null ? formatCurrency(room.monthly_rent) : null;
            const badge = ROOM_STATUS_BADGE_BG[roomStatus] || { bg: "#F3F4F6", color: "#4B5563" };
            const upcoming = getRoomUpcoming(room);
            return (
              <Col key={room.id} xs={24} sm={12} md={8} xl={6}>
                {(() => {
                  const roomNum = String(room.number);
                  const roomLabel = roomNum.startsWith("HAB-") ? roomNum : `HAB-${roomNum.padStart(3, "0")}`;
                  const roomImg = !isOccupied ? ROOM_IMG_FREE
                    : lodger?.gender === "female" ? ROOM_IMG_FEMALE
                    : ROOM_IMG_OCCUPIED;
                  const entityName = accommodation?.owner_entity
                    ? (accommodation.owner_entity.legal_type === "persona_juridica"
                        ? accommodation.owner_entity.legal_name
                        : [accommodation.owner_entity.first_name, accommodation.owner_entity.last_name1].filter(Boolean).join(" ") || "—")
                    : null;
                  const isHovered = hoveredRoomId === room.id;
                  return (
                    <div
                      onMouseEnter={() => setHoveredRoomId(room.id)}
                      onMouseLeave={() => setHoveredRoomId(null)}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        background: "#FFFFFF",
                        height: "100%",
                        boxShadow: isHovered ? "0 12px 32px rgba(0,0,0,0.13)" : "0 2px 8px rgba(0,0,0,0.06)",
                        overflow: "hidden",
                        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                        transition: "transform 0.18s ease, box-shadow 0.18s ease",
                        cursor: "pointer",
                      }}
                    >
                    <Card
                      style={{
                        borderRadius: 12,
                        border: "none",
                        background: "transparent",
                        height: "100%",
                        boxShadow: "none",
                      }}
                      styles={{ body: { padding: 0, background: "#fff" } }}
                    >
                      {/* ── 1: Cabecera blanca — título + badge habitación + precio ── */}
                      <div style={{ padding: "12px 14px 8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <Text strong style={{ fontSize: 13, color: "#1D1D1F", letterSpacing: "-0.2px", lineHeight: 1.2 }}>
                              Habitación {roomLabel}
                            </Text>
                            {/* REQ-015 — Badges de habitación compartida */}
                            {room.is_shared && (
                              <span style={{
                                background: "#EDE9FE", color: "#6D28D9",
                                borderRadius: 20, padding: "1px 8px",
                                fontSize: 9, fontWeight: 700,
                              }}>
                                Compartida
                              </span>
                            )}
                            {assignment?.accompanist_id && (
                              <span style={{
                                background: "#FEF3C7", color: "#92400E",
                                borderRadius: 20, padding: "1px 8px",
                                fontSize: 9, fontWeight: 700,
                              }}>
                                2 ocupantes
                              </span>
                            )}
                          </div>
                          <span style={{
                            background: badge.bg, color: badge.color,
                            borderRadius: 20, padding: "2px 10px",
                            fontSize: 10, fontWeight: 700,
                            whiteSpace: "nowrap", flexShrink: 0, marginLeft: 6,
                          }}>
                            {ROOM_STATUS_LABEL[roomStatus] || roomStatus}
                          </span>
                        </div>
                        <div>
                          <Text style={{ fontSize: 10, color: "#6B7280" }}>Precio </Text>
                          {rent
                            ? <><Text strong style={{ fontSize: 11, color: "#1D1D1F" }}>{rent}</Text><Text style={{ fontSize: 10, color: "#6B7280" }}>/mes</Text></>
                            : <Text style={{ fontSize: 10, color: "#9CA3AF" }}>—</Text>
                          }
                        </div>
                      </div>

                      {/* ── 2: Imagen grande — badge inquilino superpuesto abajo-izq ── */}
                      <div
                        style={{ position: "relative", height: 216, overflow: "hidden", background: "#fff", cursor: isOccupied && lodger ? "pointer" : "default" }}
                        onClick={() => { if (isOccupied && lodger) navigate(`/v2/admin/inquilinos/${lodger.id}/detalle-inquilino`); }}
                        title={isOccupied && lodger ? `Ver inquilino: ${lodger.full_name}` : undefined}
                      >
                        <img
                          src={roomImg}
                          alt="Habitación"
                          style={{ width: "100%", height: "100%", display: "block", objectFit: "contain", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.18)) drop-shadow(0 2px 4px rgba(0,0,0,0.10))" }}
                        />
                        {/* Badge estado inquilino superpuesto abajo-izquierda */}
                        {isOccupied && lodger && (() => {
                          const b = getLodgerStatusColor(getLodgerStatus(lodger));
                          return (
                            <span style={{
                              position: "absolute", bottom: 10, left: 12,
                              background: b.bg, color: b.color,
                              borderRadius: 20, padding: "1px 9px",
                              fontSize: 10, fontWeight: 700,
                            }}>
                              {getLodgerStatusLabel(getLodgerStatus(lodger))}
                            </span>
                          );
                        })()}
                        {/* Badge reserva futura abajo-derecha */}
                        {upcoming && (
                          <span style={{
                            position: "absolute", bottom: 10, right: 12,
                            background: "#FED7AA", color: "#C2410C",
                            borderRadius: 20, padding: "1px 9px",
                            fontSize: 10, fontWeight: 700,
                          }}>
                            Reservada {formatDate(upcoming.move_in_date)}
                          </span>
                        )}
                      </div>

                      {/* ── 3: Inquilino (izq) + Características (dcha) — sin separador ── */}
                      <div style={{ padding: "10px 14px 8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          {/* Izquierda: nombre + entrada */}
                          <div style={{ flex: 1, overflow: "hidden", paddingRight: 8 }}>
                            {isOccupied && lodger ? (
                              <>
                                <Text strong style={{ fontSize: 11, color: "#1D1D1F", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {lodger.full_name}
                                </Text>
                                {assignment?.move_in_date && (
                                  <Text style={{ fontSize: 10, color: "#6B7280", display: "block" }}>
                                    Entrada {formatDate(assignment.move_in_date)}
                                  </Text>
                                )}
                                {assignment?.move_out_date && (
                                  <Text style={{ fontSize: 10, color: "#DC2626", display: "block" }}>
                                    Baja {formatDate(assignment.move_out_date)}
                                  </Text>
                                )}
                              </>
                            ) : roomStatus === "reserved" && upcoming?.lodger ? (
                              <>
                                <Text strong style={{ fontSize: 11, color: "#C2410C", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {upcoming.lodger.full_name}
                                </Text>
                                <Text style={{ fontSize: 10, color: "#C2410C", display: "block" }}>
                                  Entrada {formatDate(upcoming.move_in_date)}
                                </Text>
                              </>
                            ) : (
                              <Text style={{ fontSize: 10, color: "#9CA3AF", fontStyle: "italic" }}>
                                {roomStatus === "free" ? "Habitación disponible" : "Sin inquilino asignado"}
                              </Text>
                            )}
                          </div>
                          {/* Derecha: Cocina + Baño con iconos */}
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            {room.kitchen_type && (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginBottom: 2 }}>
                                <img src="/images/cocina-icono.webp" alt="Cocina" style={{ width: 28, height: 28, objectFit: "contain" }} />
                                <Text strong style={{ fontSize: 10, color: "#1D1D1F" }}>{KITCHEN_LABEL[room.kitchen_type] || room.kitchen_type}</Text>
                              </div>
                            )}
                            {room.bathroom_type && (
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                                <img src="/images/baño-icono.webp" alt="Baño" style={{ width: 23, height: 23, objectFit: "contain" }} />
                                <Text strong style={{ fontSize: 10, color: "#1D1D1F" }}>{BATHROOM_LABEL[room.bathroom_type] || room.bathroom_type}</Text>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── 4: Botones de acción ── */}
                      <div style={{ borderTop: "1px solid #F3F4F6", padding: "6px 10px", display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                        {isOccupied && lodger ? (
                          <>
                            <Tooltip title="Ver detalle">
                              <Button size="small" type="text" icon={<UserOutlined />}
                                onClick={() => navigate(`/v2/admin/inquilinos/${lodger.id}/detalle`)} />
                            </Tooltip>
                            <Tooltip title="Ver / Editar inquilino">
                              <Button size="small" type="text" icon={<EditOutlined />}
                                onClick={() => navigate(`/v2/admin/inquilinos/${lodger.id}/detalle-inquilino`)} />
                            </Tooltip>
                            <Tooltip title="Cambiar habitación">
                              <Button size="small" type="text" icon={<SwapOutlined />}
                                onClick={() => { setLodgerToReassign({ ...lodger, _room: room, _assignment: assignment }); setShowReassignModal(true); }} />
                            </Tooltip>
                            {roomStatus === "occupied" && (
                              <Tooltip title="Check-out">
                                <Button size="small" type="text" danger icon={<LogoutOutlined />}
                                  onClick={() => { setLodgerToCheckout({ ...lodger, active_assignment: room.active_assignment }); setShowCheckoutModal(true); }} />
                              </Tooltip>
                            )}
                          </>
                        ) : roomStatus === "free" ? (
                          <Button size="small" type="primary" icon={<UserAddOutlined />}
                            style={{ borderRadius: 20, fontWeight: 600, fontSize: 11, background: "#0096D6", borderColor: "#0096D6" }}
                            onClick={() => openAssignModal(room)}>
                            Asignar Inquilino
                          </Button>
                        ) : null}
                      </div>

                      {/* ── 5: Footer — Alojamiento + Entidad ── */}
                      <div style={{ borderTop: "1px solid #F3F4F6", padding: "6px 14px 10px" }}>
                        <div style={{ display: "flex", gap: 3, overflow: "hidden" }}>
                          <Text style={{ fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap", flexShrink: 0 }}>Aloj.:</Text>
                          <Text style={{ fontSize: 10, color: "#6B7280", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {accommodation?.name || "—"}
                          </Text>
                        </div>
                        {entityName && (
                          <div style={{ display: "flex", gap: 3, overflow: "hidden" }}>
                            <Text style={{ fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap", flexShrink: 0 }}>Entidad:</Text>
                            <Text style={{ fontSize: 10, color: "#6B7280", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {entityName}
                            </Text>
                          </div>
                        )}
                      </div>
                    </Card>
                    </div>
                  );
                })()}
              </Col>
            );
          })}
        </Row>
          )}
        </div>
      ) : null}

      {/* Modal: Asignar inquilino a habitación */}
      <Modal
        title={`Asignar Inquilino a Habitación ${assignRoom?.number || ''}${assignRoom?.monthly_rent ? ` — ${formatCurrency(assignRoom.monthly_rent)}/mes` : ''}`}
        open={!!assignRoom}
        onCancel={() => {
          setAssignRoom(null);
          setSelectedLodgerForAssignment(null);
          setPayUntilEndOfMonth(false);
          assignmentForm.resetFields();
        }}
        footer={null}
        width={700}
        destroyOnClose
      >
        {/* Nombre del alojamiento para contexto */}
        <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <HomeOutlined style={{ marginRight: 6 }} />
            {accommodation?.name}
          </Text>
        </div>

        {/* Select de inquilinos + botón Crear */}
        <Form.Item label="Inquilino" required style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
          <Select
            style={{ flex: 1 }}
            showSearch
            loading={loadingLodgers}
            placeholder="Buscar por nombre o email..."
            optionFilterProp="label"
            value={selectedLodgerForAssignment?.id}
            onChange={(lodgerId) => {
              const selectedLodger = allLodgers.find(l => l.id === lodgerId);
              const hasAssignment = selectedLodger?.active_assignment?.length > 0;
              
              if (hasAssignment) {
                navigate(`/v2/admin/inquilinos/${lodgerId}/detalle-inquilino?action=reassign`);
                setAssignRoom(null);
              } else {
                setSelectedLodgerForAssignment(selectedLodger);
                setPayUntilEndOfMonth(false);
                
                // Prellenar formulario
                const monthlyRent = assignRoom?.monthly_rent || 0;
                assignmentForm.setFieldsValue({
                  move_in_date: dayjs(),
                  deposit_amount: monthlyRent * 2,
                  commission_amount: null,
                  first_month_amount: null,
                });
              }
            }}
            options={(allLodgers || []).map((l) => {
              const hasAssignment = l.active_assignment?.length > 0;
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
          />
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            style={{ borderRadius: 20, fontWeight: 600, whiteSpace: "nowrap", background: "#0096D6", borderColor: "#0096D6" }}
            onClick={() => {
              const roomId = assignRoom?.id;
              setAssignRoom(null);
              setSelectedLodgerForAssignment(null);
              assignmentForm.resetFields();
              navigate(`/v2/admin/inquilinos/nuevo?acc=${accId}&room=${roomId}`);
            }}
          >
            Crear Inquilino
          </Button>
          </div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
            Solo se muestran inquilinos sin habitación asignada
          </Text>
        </Form.Item>

        {/* Formulario de asignación (solo visible si hay inquilino seleccionado) */}
        {selectedLodgerForAssignment && (
          <Form
            form={assignmentForm}
            layout="vertical"
            onFinish={async (values) => {
              setAssigningLodger(true);
              setAssignError(null);
              try {
                const billingStartDate = values.move_in_date
                  ? values.move_in_date.add(1, 'month').startOf('month').format('YYYY-MM-DD')
                  : null;

                // REQ-015: habitación compartida — incluir acompañante si el admin lo activó
                const accompanist = values.accompanist && typeof values.accompanist === "object"
                  && (values.accompanist.first_name || values.accompanist.last_name1)
                  ? values.accompanist
                  : undefined;

                await assignRoomToLodger(selectedLodgerForAssignment.id, {
                  roomId: assignRoom?.id,
                  accommodationId: accId,
                  moveInDate: values.move_in_date ? values.move_in_date.format('YYYY-MM-DD') : null,
                  billingStartDate: billingStartDate,
                  monthlyRent: assignRoom?.monthly_rent || 0,
                  depositAmount: values.deposit_amount || 0,
                  commissionAmount: values.commission_amount || null,
                  firstMonthAmount: values.first_month_amount || null,
                  accompanist,
                });

                message.success('Inquilino asignado correctamente');
                setAssignRoom(null);
                setSelectedLodgerForAssignment(null);
                setPayUntilEndOfMonth(false);
                assignmentForm.resetFields();
                await load();
              } catch (e) {
                setAssignError(e.message);
                message.error(`Error al asignar: ${e.message}`);
              } finally {
                setAssigningLodger(false);
              }
            }}
          >
            {assignError && (
              <Alert type="error" message={assignError} showIcon style={{ marginBottom: 16 }} closable onClose={() => setAssignError(null)} />
            )}

            <Form.Item
              label="Fecha de Check-In"
              name="move_in_date"
              rules={[{ required: true, message: "La fecha de check-in es obligatoria" }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item>
              <Checkbox
                checked={payUntilEndOfMonth}
                onChange={(e) => {
                  setPayUntilEndOfMonth(e.target.checked);
                  if (!e.target.checked) {
                    assignmentForm.setFieldValue('first_month_amount', null);
                  }
                }}
              >
                El inquilino va a pagar desde la fecha de Check-in hasta fin de mes
              </Checkbox>
            </Form.Item>

            {payUntilEndOfMonth && (
              <Form.Item
                label="Importe a pagar hasta fin de mes"
                name="first_month_amount"
                rules={[{ required: true, message: "El importe es obligatorio" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  addonAfter="€"
                  placeholder="Ej: 450"
                />
              </Form.Item>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Importe de la Fianza (€)"
                  name="deposit_amount"
                  rules={[{ required: true, message: "El importe de la fianza es obligatorio" }]}
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
              <Col span={12}>
                <Form.Item label="Importe Comisión (€)" name="commission_amount">
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

            <Row justify="end" style={{ marginTop: 24 }}>
              <Space>
                <Button onClick={() => {
                  setAssignRoom(null);
                  setSelectedLodgerForAssignment(null);
                  setPayUntilEndOfMonth(false);
                  assignmentForm.resetFields();
                }}>
                  Cancelar
                </Button>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={assigningLodger}>
                  Asignar Habitación
                </Button>
              </Space>
            </Row>
          </Form>
        )}
      </Modal>

      {/* Modal: Cambiar habitación */}
      <Modal
        title={`Cambiar habitación — ${lodgerToReassign?.full_name || ''}`}
        open={showReassignModal}
        onCancel={() => {
          setShowReassignModal(false);
          setLodgerToReassign(null);
          setReassignFreeRooms([]);
          setReassignEntityId(null);
          setReassignCheckoutDate(null);
          reassignForm.resetFields();
        }}
        footer={null}
        width={700}
        destroyOnHidden
        styles={{ body: { paddingTop: 4, paddingBottom: 8 } }}
      >
        {lodgerToReassign && (() => {
          const curRoom = lodgerToReassign._room;
          const curAsgn = lodgerToReassign._assignment;
          const curRoomNum = curRoom ? `HAB-${String(curRoom.number).padStart(3, "0")}` : "N/A";
          const curRent = curAsgn?.monthly_rent ?? curRoom?.monthly_rent;
          const curEntityName = accommodation?.owner_entity
            ? (accommodation.owner_entity.legal_type === "persona_juridica"
                ? accommodation.owner_entity.legal_name
                : [accommodation.owner_entity.first_name, accommodation.owner_entity.last_name1].filter(Boolean).join(" "))
            : "—";

          // Entidades únicas derivadas de reassignAccommodations
          const entityMap = new Map();
          (reassignAccommodations || []).forEach(a => {
            if (a.owner_entity_id && a.owner_entity && !entityMap.has(a.owner_entity_id)) {
              entityMap.set(a.owner_entity_id, a.owner_entity);
            }
          });
          const entityOptions = [...entityMap.entries()].map(([id, e]) => ({
            value: id,
            label: e.legal_type === "persona_juridica"
              ? e.legal_name
              : [e.first_name, e.last_name1].filter(Boolean).join(" "),
          }));

          const filteredAccOptions = (reassignAccommodations || [])
            .filter(a => !reassignEntityId || a.owner_entity_id === reassignEntityId)
            .map(a => ({ value: a.id, label: a.name }));

          const iB = { marginBottom: 6 };

          // Calcula el importe de corrección proporcional por cambio de habitación a mitad de mes
          function calcCorrectionAmount(changeDate, currentRent, newRent) {
            if (!changeDate || currentRent == null || newRent == null) return null;
            const dayOfMonth = changeDate.date();
            if (dayOfMonth === 1) return 0;
            const daysInMonth = changeDate.daysInMonth();
            const remainingDays = daysInMonth - dayOfMonth + 1;
            const correction = (newRent - currentRent) * remainingDays / daysInMonth;
            return Math.round(correction * 100) / 100;
          }

          return (
            <Form
              form={reassignForm}
              layout="vertical"
              size="small"
              onFinish={async (values) => {
                setAssigningLodger(true);
                try {
                  const changeDate  = values.change_date.format("YYYY-MM-DD");
                  const curAsgnId   = lodgerToReassign._assignment?.id;
                  const curRoomNum  = lodgerToReassign._room
                    ? `HAB-${String(lodgerToReassign._room.number).padStart(3, "0")}`
                    : "?";
                  const newRoom = reassignFreeRooms.find(r => r.id === values.new_room_id);
                  const newRoomNum  = newRoom ? `HAB-${String(newRoom.number).padStart(3, "0")}` : "?";
                  const changeNote  = `Cambio de habitación: ${curRoomNum} → ${newRoomNum} el ${dayjs(changeDate).format("DD/MM/YYYY")}`;

                  // 1. Cerrar asignación actual con fecha de checkout y nota
                  if (curAsgnId) {
                    const { error: e1 } = await supabase
                      .from("lodger_room_assignments")
                      .update({ move_out_date: changeDate, notes: changeNote })
                      .eq("id", curAsgnId);
                    if (e1) throw new Error(e1.message);
                  }

                  // 2. Crear nueva asignación en la habitación destino
                  const { error: e2 } = await supabase
                    .from("lodger_room_assignments")
                    .insert({
                      lodger_id:          lodgerToReassign.id,
                      room_id:            values.new_room_id,
                      accommodation_id:   values.new_accommodation_id,
                      client_account_id:  clientAccountId,
                      move_in_date:       changeDate,
                      billing_start_date: changeDate,
                      monthly_rent:       values.monthly_rent ?? null,
                      deposit_amount:     values.deposit_amount ?? null,
                      commission_amount:  values.commission_amount ?? null,
                      correction_amount:  values.correction_amount ?? null,
                      notes:              changeNote,
                    });
                  if (e2) throw new Error(e2.message);

                  message.success("Habitación cambiada correctamente");
                  setShowReassignModal(false);
                  setLodgerToReassign(null);
                  setReassignFreeRooms([]);
                  setReassignEntityId(null);
                  setReassignCheckoutDate(null);
                  reassignForm.resetFields();
                  await load();
                } catch (e) {
                  message.error(`Error al cambiar habitación: ${e.message}`);
                } finally {
                  setAssigningLodger(false);
                }
              }}
            >
              {/* ── CHECK-OUT ── */}
              <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: "#6B7280", margin: "0 0 8px" }}>Check-Out</Divider>

              {/* Info fija actual */}
              <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 10px", marginBottom: 8, fontSize: 12 }}>
                <Row gutter={8}>
                  <Col span={12}>
                    <Text type="secondary">Entidad actual</Text>
                    <div><Text strong>{curEntityName}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Apartamento</Text>
                    <div><Text strong>{accommodation?.name || "—"}</Text></div>
                  </Col>
                </Row>
                <Row gutter={8} style={{ marginTop: 4 }}>
                  <Col span={12}>
                    <Text type="secondary">Habitación</Text>
                    <div><Text strong style={{ color: "#0071E3" }}>Hab. {curRoomNum}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Importe mensual</Text>
                    <div><Text strong>{curRent != null ? formatCurrency(curRent) : "—"}</Text></div>
                  </Col>
                </Row>
              </div>

              <Row gutter={12} align="middle">
                <Col span={14}>
                  <Form.Item
                    label="Fecha del cambio"
                    name="change_date"
                    style={iB}
                    rules={[
                      { required: true, message: "Obligatoria" },
                      { validator: (_, v) => v && v.isBefore(dayjs().startOf("day")) ? Promise.reject("Debe ser hoy o posterior") : Promise.resolve() },
                    ]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      format="DD/MM/YYYY"
                      disabledDate={d => d && d.isBefore(dayjs().startOf("day"))}
                      onChange={v => {
                        setReassignCheckoutDate(v);
                        const accId = reassignForm.getFieldValue("new_accommodation_id");
                        loadFreeRoomsForDate(accId, v);
                        // Recalcular corrección si ya hay renta nueva seleccionada
                        const newRent = reassignForm.getFieldValue("monthly_rent");
                        if (newRent != null) {
                          const corr = calcCorrectionAmount(v, curRent, newRent);
                          if (corr !== null) reassignForm.setFieldValue("correction_amount", corr);
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={10} style={{ paddingTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Hasta esa fecha: </Text>
                  <Text strong style={{ color: "#B45309" }}>Pte. Baja</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>Desde esa fecha: </Text>
                  <Text strong style={{ color: "#15803D" }}>Activo</Text>
                </Col>
              </Row>

              {/* ── CHECK-IN ── */}
              <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 8px" }}>Check-In</Divider>

              <Row gutter={12}>
                <Col span={11}>
                  <Form.Item label="Entidad" name="new_entity_id" style={iB}
                    rules={[{ required: true, message: "Selecciona una entidad" }]}>
                    <Select
                      placeholder="Seleccionar entidad..."
                      allowClear
                      showSearch
                      filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
                      options={entityOptions}
                      onChange={v => {
                        setReassignEntityId(v ?? null);
                        reassignForm.setFieldValue("new_accommodation_id", undefined);
                        reassignForm.setFieldValue("new_room_id", undefined);
                        reassignForm.setFieldValue("monthly_rent", undefined);
                        setReassignFreeRooms([]);
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={13}>
                  <Form.Item label="Alojamiento" name="new_accommodation_id" style={iB}>
                    <Select
                      placeholder="Seleccionar..."
                      allowClear
                      showSearch
                      filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
                      options={filteredAccOptions}
                      onChange={(selectedAccId) => {
                        reassignForm.setFieldValue("new_room_id", undefined);
                        reassignForm.setFieldValue("monthly_rent", undefined);
                        setReassignFreeRooms([]);
                        if (!selectedAccId) return;
                        const changeDate = reassignForm.getFieldValue("change_date");
                        loadFreeRoomsForDate(selectedAccId, changeDate);
                      }}
                />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Nueva habitación (libres en la fecha del cambio)" name="new_room_id" style={iB}
                rules={[{ required: true, message: "Selecciona una habitación" }]}>
                <Select
                  placeholder={!reassignCheckoutDate ? "Primero selecciona fecha del cambio" : "Seleccionar habitación..."}
                  loading={loadingReassignRooms}
                  disabled={!reassignCheckoutDate || !reassignForm.getFieldValue("new_accommodation_id")}
                  options={reassignFreeRooms.map(r => ({
                    value: r.id,
                    label: `Hab. ${String(r.number).padStart(3,"0")}${r.monthly_rent != null ? ` — ${formatCurrency(r.monthly_rent)}/mes` : ""}`,
                  }))}
                  onChange={(roomId) => {
                    const r = reassignFreeRooms.find(x => x.id === roomId);
                    if (r?.monthly_rent != null) {
                      reassignForm.setFieldValue("monthly_rent", r.monthly_rent);
                      // Auto-calc corrección
                      const changeDate = reassignForm.getFieldValue("change_date");
                      const corr = calcCorrectionAmount(changeDate, curRent, r.monthly_rent);
                      if (corr !== null) reassignForm.setFieldValue("correction_amount", corr);
                    }
                    // Auto-fill fianza desde asignación actual
                    if (curAsgn?.deposit_amount != null) {
                      reassignForm.setFieldValue("deposit_amount", curAsgn.deposit_amount);
                    }
                  }}
                />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Importe de la Fianza (€)" name="deposit_amount" style={iB}
                    rules={[{ required: true, message: "Obligatorio" }]}>
                    <InputNumber style={{ width: "100%" }} min={0} precision={2} placeholder="Ej. 900" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Renta mensual (€)" name="monthly_rent" style={iB}>
                    <InputNumber style={{ width: "100%" }} min={0} precision={2} placeholder="Ej. 450" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Importe Comisión (€)" name="commission_amount" style={iB}>
                    <InputNumber style={{ width: "100%" }} min={0} precision={2} placeholder="Opcional" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Corrección por cambio (€)"
                    name="correction_amount"
                    style={iB}
                    tooltip="Diferencia proporcional por días restantes del mes. Positivo = paga más. Negativo = descuento. 0 si el cambio es el día 1."
                  >
                    <InputNumber style={{ width: "100%" }} min={-99999} precision={2} placeholder="Auto-calculado" />
                  </Form.Item>
                </Col>
              </Row>

              <Row justify="end" style={{ marginTop: 12 }}>
                <Space>
                  <Button size="middle" onClick={() => {
                    setShowReassignModal(false);
                    setLodgerToReassign(null);
                    setReassignEntityId(null);
                    setReassignCheckoutDate(null);
                    reassignForm.resetFields();
                  }}>
                    Cancelar
                  </Button>
                  <Button size="middle" type="primary" htmlType="submit" icon={<SwapOutlined />} loading={assigningLodger}
                    style={{ background: "#0096D6", borderColor: "#0096D6" }}>
                    Confirmar cambio
                  </Button>
                </Space>
              </Row>
            </Form>
          );
        })()}
      </Modal>

      {/* Modal: Check-Out */}
      <Modal
        title={`Check-Out — ${lodgerToCheckout?.full_name || ''}`}
        open={showCheckoutModal}
        onCancel={() => {
          setShowCheckoutModal(false);
          setLodgerToCheckout(null);
          setMockedConsumptions(null);
          checkoutForm.resetFields();
        }}
        footer={null}
        width={700}
        destroyOnClose
      >
        {lodgerToCheckout && (() => {
          const assignment = lodgerToCheckout.active_assignment?.[0];
          const totalConsumptions = mockedConsumptions 
            ? mockedConsumptions.water + mockedConsumptions.electricity + mockedConsumptions.gas 
            : 0;
          const depositAmount = assignment?.deposit_amount || 0;
          const totalToReturn = depositAmount - totalConsumptions;
          
          return (
            <>
              {/* Info de la habitación */}
              <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                <Text>📅 Habitación {assignment?.room?.number || 'N/A'}</Text>
                <Text type="secondary" style={{ marginLeft: 16 }}>
                  Entrada: {assignment?.move_in_date ? formatDate(assignment.move_in_date) : 'N/A'}
                </Text>
              </div>

              <Form
                form={checkoutForm}
                layout="vertical"
                onFinish={async (values) => {
                  setProcessingCheckout(true);
                  try {
                    const checkoutDate = values.checkout_date.format('YYYY-MM-DD');
                    
                    // Actualizar la asignación con la fecha de check-out
                    const { error } = await supabase
                      .from('lodger_room_assignments')
                      .update({
                        move_out_date: checkoutDate,
                        notes: values.observations || null,
                      })
                      .eq('id', assignment.id);
                    
                    if (error) throw error;
                    
                    const isToday = values.checkout_date.isSame(dayjs(), 'day');
                    message.success(
                      isToday 
                        ? 'Check-out realizado. El inquilino ha sido dado de baja.'
                        : `Check-out programado para ${values.checkout_date.format('DD/MM/YYYY')}`
                    );
                    
                    setShowCheckoutModal(false);
                    setLodgerToCheckout(null);
                    setMockedConsumptions(null);
                    checkoutForm.resetFields();
                    await load();
                  } catch (error) {
                    message.error(`Error al procesar check-out: ${error.message}`);
                  } finally {
                    setProcessingCheckout(false);
                  }
                }}
                initialValues={{
                  checkout_date: dayjs(),
                }}
              >
                {/* Fecha de Check-Out */}
                <Form.Item
                  label="Fecha de Check-Out"
                  name="checkout_date"
                  rules={[
                    { required: true, message: "La fecha es obligatoria" },
                    () => ({
                      validator(_, value) {
                        const moveInDate = assignment?.move_in_date;
                        if (!value || !moveInDate) return Promise.resolve();
                        if (value.isBefore(dayjs(moveInDate), 'day')) {
                          return Promise.reject('La fecha no puede ser anterior a la entrada');
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <DatePicker 
                    style={{ width: "100%" }} 
                    format="DD/MM/YYYY"
                    onChange={(date) => {
                      if (date && assignment?.move_in_date) {
                        const consumptions = generateMockedConsumptions(
                          assignment.move_in_date,
                          date.format('YYYY-MM-DD')
                        );
                        setMockedConsumptions(consumptions);
                      }
                    }}
                  />
                </Form.Item>

                {/* Resumen Económico */}
                {mockedConsumptions && (
                  <>
                    <Divider orientation="left">💰 Resumen Económico</Divider>
                    
                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                      <Text>Fianza pagada:</Text>
                      <Text strong>{formatCurrency(depositAmount)}</Text>
                    </Row>

                    <Divider orientation="left">⚡ Consumos Pendientes</Divider>
                    
                    <Row justify="space-between" style={{ marginBottom: 4 }}>
                      <Text>💧 Agua:</Text>
                      <Text>{formatCurrency(mockedConsumptions.water)}</Text>
                    </Row>
                    <Row justify="space-between" style={{ marginBottom: 4 }}>
                      <Text>⚡ Electricidad:</Text>
                      <Text>{formatCurrency(mockedConsumptions.electricity)}</Text>
                    </Row>
                    <Row justify="space-between" style={{ marginBottom: 4 }}>
                      <Text>🔥 Gas:</Text>
                      <Text>{formatCurrency(mockedConsumptions.gas)}</Text>
                    </Row>
                    
                    <Row justify="space-between" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                      <Text strong>Subtotal consumos:</Text>
                      <Text strong>{formatCurrency(totalConsumptions)}</Text>
                    </Row>

                    <Divider orientation="left">💵 Total a Liquidar</Divider>
                    
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: totalToReturn >= 0 ? '#f0fdf4' : '#fef2f2', 
                      borderRadius: 8, 
                      border: `2px solid ${totalToReturn >= 0 ? '#16a34a' : '#dc2626'}`
                    }}>
                      <Row justify="space-between" style={{ marginBottom: 4 }}>
                        <Text>Fianza a devolver:</Text>
                        <Text>{formatCurrency(depositAmount)}</Text>
                      </Row>
                      <Row justify="space-between" style={{ marginBottom: 12 }}>
                        <Text>Menos consumos:</Text>
                        <Text type="danger">-{formatCurrency(totalConsumptions)}</Text>
                      </Row>
                      <Row justify="space-between">
                        <Text strong style={{ fontSize: 16 }}>TOTAL A DEVOLVER:</Text>
                        <Text strong style={{ 
                          fontSize: 18, 
                          color: totalToReturn >= 0 ? '#16a34a' : '#dc2626'
                        }}>
                          {formatCurrency(totalToReturn)}
                        </Text>
                      </Row>
                    </div>
                  </>
                )}

                {/* Observaciones */}
                <Form.Item
                  label="Observaciones"
                  name="observations"
                  style={{ marginTop: 24 }}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="Notas sobre el estado de la habitación, incidencias, etc."
                    maxLength={500}
                    showCount
                  />
                </Form.Item>

                {/* Aviso */}
                <Alert
                  message={
                    checkoutForm.getFieldValue('checkout_date')?.isSame(dayjs(), 'day')
                      ? "La fecha es hoy, se dará de baja inmediatamente"
                      : "La fecha es futura, quedará pendiente de baja"
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                {/* Botones */}
                <Row justify="end">
                  <Space>
                    <Button onClick={() => {
                      setShowCheckoutModal(false);
                      setLodgerToCheckout(null);
                      setMockedConsumptions(null);
                      checkoutForm.resetFields();
                    }}>
                      Cancelar
                    </Button>
                    <Button 
                      type="primary" 
                      danger
                      htmlType="submit" 
                      icon={<LogoutOutlined />}
                      loading={processingCheckout}
                    >
                      Confirmar Check-Out
                    </Button>
                  </Space>
                </Row>
              </Form>
            </>
          );
        })()}
      </Modal>
      </div>
    </V2Layout>
  );
}
