// =============================================================================
// src/pages/v2/admin/rooms/RoomsSearch.jsx
// =============================================================================
// REQ-012 — Búsqueda global de habitaciones
// Muestra todas las habitaciones de todos los alojamientos con filtros en cascada
// y dos vistas intercambiables: cards y tabla compacta.
// =============================================================================

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Row, Col, Select, Button, Space, Table, Tooltip,
  Card, Typography, Spin, Alert, Pagination,
} from "antd";
import {
  AppstoreOutlined, UnorderedListOutlined,
  UserOutlined, EditOutlined, SwapOutlined,
  LogoutOutlined, UserAddOutlined, ClearOutlined,
} from "@ant-design/icons";
import { supabase } from "../../../../services/supabaseClient";
import { listEntities } from "../../../../services/entities.service";
import { formatCurrency, formatDate } from "../../../../utils/formatters";
import {
  getLodgerStatus,
  getLodgerStatusLabel,
} from "../../../../utils/lodgerStatus";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";

const { Text, Title } = Typography;

const FILTERS_KEY = "smartrent_rooms_filters";

// ─── Constantes ──────────────────────────────────────────────────────────────

const ROOM_IMG_FREE     = "/images/Habitación sin Inquilino en la cama.png";
const ROOM_IMG_OCCUPIED = "/images/Habitación con Inquilino en la cama.webp";
const ROOM_IMG_FEMALE   = "/images/Habitación con Inqulina en la cama.webp";

const ROOM_STATUS_LABEL = {
  free:             "Libre",
  occupied:         "Ocupada",
  pending_checkout: "Pend. baja",
  maintenance:      "Mantenimiento",
  reserved:         "Reservada",
};

const ROOM_STATUS_BADGE = {
  free:             { bg: "#DCFCE7", color: "#15803D" },
  occupied:         { bg: "#FFE4E6", color: "#BE123C" },
  pending_checkout: { bg: "#FEF3C7", color: "#B45309" },
  maintenance:      { bg: "#F3F4F6", color: "#4B5563" },
  reserved:         { bg: "#FED7AA", color: "#C2410C" },
};

const LODGER_STATUS_BADGE = {
  active:           { bg: "#DCFCE7", color: "#15803D" },
  pending_checkout: { bg: "#FEF3C7", color: "#B45309" },
  inactive:         { bg: "#F3F4F6", color: "#4B5563" },
  invited:          { bg: "#DBEAFE", color: "#1D4ED8" },
};

const KITCHEN_LABEL   = { shared: "Compartida", private: "Privada", none: "Sin cocina" };
const BATHROOM_LABEL  = { shared: "Compartido", private: "Privado", ensuite: "En suite" };

function getRoomStatus(room) {
  if (room.is_maintenance) return "maintenance";
  const today = new Date().toISOString().split("T")[0];
  const current = (room.active_assignment || []).find(
    a => a.move_in_date <= today && (!a.move_out_date || a.move_out_date > today)
  );
  const upcoming = (room.future_assignment || []).find(a => a.move_in_date > today);
  if (!current && !upcoming) return "free";
  if (!current && upcoming) return "reserved";
  if (current && !current.move_out_date) return "occupied";
  return "pending_checkout";
}

function getRoomUpcoming(room) {
  const today = new Date().toISOString().split("T")[0];
  return (room.future_assignment || []).find(a => a.move_in_date > today) ?? null;
}

function getEntityName(entity) {
  if (!entity) return "—";
  return entity.legal_type === "persona_juridica"
    ? entity.legal_name || "—"
    : [entity.first_name, entity.last_name1].filter(Boolean).join(" ") || "—";
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RoomsSearch() {
  const navigate = useNavigate();
  const { userName, companyBranding } = useAdminLayout();

  // ── Datos cargados ────────────────────────────────────────────────────────
  const [allRooms, setAllRooms]             = useState([]);
  const [entities, setEntities]             = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);

  // ── Filtros — persisten entre navegaciones via localStorage ─────────────
  const [filterEntityId,  setFilterEntityId]  = useState(() => JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}").entityId  ?? null);
  const [filterAccId,     setFilterAccId]     = useState(() => JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}").accId     ?? null);
  const [filterStatus,    setFilterStatus]    = useState(() => JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}").status    ?? null);
  const [filterBathroom,  setFilterBathroom]  = useState(() => JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}").bathroom  ?? null);
  const [filterKitchen,   setFilterKitchen]   = useState(() => JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}").kitchen   ?? null);
  const [hasSearched,     setHasSearched]     = useState(() => JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}").searched  ?? false);

  // ── Vista — persiste entre navegaciones via localStorage ──────────────────
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("smartrent_rooms_viewMode") || "cards"
  );
  const [cardPage, setCardPage] = useState(1);
  const [hoveredRoomId, setHoveredRoomId] = useState(null);
  const PAGE_SIZE = 24;

  // Guardar filtros en localStorage cuando cambian
  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify({
      entityId: filterEntityId, accId: filterAccId, status: filterStatus,
      bathroom: filterBathroom, kitchen: filterKitchen, searched: hasSearched,
    }));
  }, [filterEntityId, filterAccId, filterStatus, filterBathroom, filterKitchen, hasSearched]);

  function changeViewMode(mode) {
    setViewMode(mode);
    localStorage.setItem("smartrent_rooms_viewMode", mode);
  }

  // ─── Carga de datos ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];

      // 1. Cargar entidades y alojamientos (con owner_entity) en paralelo
      const [entitiesData, { data: accsRaw, error: accsErr }, { data: roomsData, error: roomsErr }, { data: currentAssignments }, { data: futureAssignments }] = await Promise.all([
        listEntities({ type: "owner" }),
        // Alojamientos con entidad propietaria (sin filtrar rooms aquí)
        supabase
          .from("accommodations")
          .select("id, name, address_street, address_postal_code, address_city, status, owner_entity_id, owner_entity:entities!left(id, legal_name, first_name, last_name1, legal_type)")
          .order("name"),
        // TODAS las habitaciones (sin filtro de asignaciones para no excluir las libres)
        supabase
          .from("rooms")
          .select("id, accommodation_id, number, is_maintenance, kitchen_type, bathroom_type, monthly_rent")
          .order("number"),
        // Asignaciones ya empezadas y no terminadas (move_in_date <= hoy)
        supabase
          .from("lodger_room_assignments")
          .select("id, room_id, accommodation_id, move_in_date, move_out_date, monthly_rent, lodger:profiles(id, full_name, email, phone, onboarding_status, gender)")
          .lte("move_in_date", today)
          .or(`move_out_date.is.null,move_out_date.gt.${today}`),
        // Asignaciones futuras (reservas: move_in_date > hoy)
        supabase
          .from("lodger_room_assignments")
          .select("id, room_id, accommodation_id, move_in_date, move_out_date, monthly_rent, lodger:profiles(id, full_name, email, phone, onboarding_status, gender)")
          .gt("move_in_date", today),
      ]);

      if (accsErr) throw new Error(accsErr.message);
      if (roomsErr) throw new Error(roomsErr.message);

      const accsData = accsRaw || [];
      const roomsDetails = roomsData || [];

      // Construir mapa accId → accommodation (con owner_entity)
      const accMap = {};
      accsData.forEach(acc => { accMap[acc.id] = acc; });

      // Construir mapas roomId → asignaciones actuales / futuras
      const currentMap = {};
      (currentAssignments || []).forEach(a => {
        if (!currentMap[a.room_id]) currentMap[a.room_id] = [];
        currentMap[a.room_id].push(a);
      });
      const futureMap = {};
      (futureAssignments || []).forEach(a => {
        if (!futureMap[a.room_id]) futureMap[a.room_id] = [];
        futureMap[a.room_id].push(a);
      });

      // Cargar todos los assignments del lodger para calcular getLodgerStatus
      const allKnown = [...(currentAssignments || []), ...(futureAssignments || [])];
      const lodgerIds = [...new Set(allKnown.map(a => a.lodger?.id).filter(Boolean))];
      let allLodgerAssignments = [];
      if (lodgerIds.length > 0) {
        const { data: laData } = await supabase
          .from("lodger_room_assignments")
          .select("id, lodger_id, move_in_date, move_out_date")
          .in("lodger_id", lodgerIds);
        allLodgerAssignments = laData || [];
      }

      function enrichLodger(a) {
        if (!a.lodger) return a;
        return { ...a, lodger: { ...a.lodger, assignments: allLodgerAssignments.filter(la => la.lodger_id === a.lodger.id) } };
      }

      // Enriquecer cada habitación con su alojamiento, entidad y asignaciones
      const enrichedRooms = roomsDetails.map(room => {
        const acc = accMap[room.accommodation_id] || null;
        return {
          ...room,
          active_assignment: (currentMap[room.id] || []).map(enrichLodger),
          future_assignment: (futureMap[room.id] || []).map(enrichLodger),
          accommodation: acc,
          entity: acc?.owner_entity || null,
        };
      });

      setEntities(entitiesData || []);
      setAccommodations(accsData || []);
      setAllRooms(enrichedRooms);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Filtrado en cascada ───────────────────────────────────────────────────

  const availableAccs = useMemo(() =>
    filterEntityId
      ? accommodations.filter(a => a.owner_entity_id === filterEntityId)
      : accommodations,
  [accommodations, filterEntityId]);

  // Si la entidad cambia y el alojamiento seleccionado ya no pertenece a ella → limpiar
  useEffect(() => {
    if (filterEntityId && filterAccId) {
      const stillValid = availableAccs.find(a => a.id === filterAccId);
      if (!stillValid) setFilterAccId(null);
    }
  }, [filterEntityId, availableAccs, filterAccId]);

  const filteredRooms = useMemo(() => {
    return allRooms.filter(r => {
      const roomStatus = getRoomStatus(r);
      if (filterEntityId && r.entity?.id !== filterEntityId) return false;
      if (filterAccId    && r.accommodation_id !== filterAccId) return false;
      if (filterStatus   && roomStatus !== filterStatus) return false;
      if (filterBathroom && r.bathroom_type !== filterBathroom) return false;
      if (filterKitchen  && r.kitchen_type !== filterKitchen) return false;
      return true;
    });
  }, [allRooms, filterEntityId, filterAccId, filterStatus, filterBathroom, filterKitchen]);

  function clearFilters() {
    setFilterEntityId(null);
    setFilterAccId(null);
    setFilterStatus(null);
    setFilterBathroom(null);
    setFilterKitchen(null);
    setCardPage(1);
    setHasSearched(false);
    localStorage.removeItem(FILTERS_KEY);
  }

  const hasFilters = filterEntityId || filterAccId || filterStatus || filterBathroom || filterKitchen;

  // ─── Acciones de habitación ────────────────────────────────────────────────

  function navigateToRoom(room) {
    navigate(`/v2/admin/alojamientos/${room.accommodation_id}/habitaciones`);
  }

  // ─── Columns para la vista tabla ──────────────────────────────────────────

  const tableColumns = [
    {
      title: "N.º",
      key: "number",
      width: 120,
      render: (_, r) => {
        const num = String(r.number);
        const roomLabel = num.startsWith("HAB-") ? num : `HAB-${num.padStart(3, "0")}`;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="/images/habitacion-icono-model.webp"
              alt="Habitación"
              style={{ width: 41, height: 41, objectFit: "contain" }}
            />
            <span style={{ fontWeight: 600, color: "#374151" }}>{roomLabel}</span>
          </div>
        );
      },
    },
    {
      title: "Alojamiento",
      key: "accommodation",
      render: (_, r) => r.accommodation?.name || "—",
    },
    {
      title: "Entidad",
      key: "entity",
      render: (_, r) => getEntityName(r.entity),
    },
    {
      title: "Estado",
      key: "status",
      width: 140,
      render: (_, r) => {
        const st = getRoomStatus(r);
        const badge = ROOM_STATUS_BADGE[st] || ROOM_STATUS_BADGE.maintenance;
        return (
          <span style={{
            background: badge.bg, color: badge.color,
            borderRadius: 20, padding: "2px 10px",
            fontSize: 12, fontWeight: 700,
          }}>
            {ROOM_STATUS_LABEL[st] || st}
          </span>
        );
      },
    },
    {
      title: "Precio",
      key: "rent",
      width: 110,
      render: (_, r) => {
        const asgn = r.active_assignment?.[0];
        const rent = asgn?.monthly_rent ?? r.monthly_rent;
        return rent != null ? formatCurrency(rent) : "—";
      },
    },
    {
      title: "Baño",
      key: "bathroom",
      width: 130,
      render: (_, r) => r.bathroom_type ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <img src="/images/baño-icono.webp" alt="Baño" style={{ width: 18, height: 18, objectFit: "contain" }} />
          <span style={{ fontSize: 12 }}>{BATHROOM_LABEL[r.bathroom_type] || r.bathroom_type}</span>
        </div>
      ) : "—",
    },
    {
      title: "Cocina",
      key: "kitchen",
      width: 130,
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
        const roomStatus = getRoomStatus(r);
        const asgn = r.active_assignment?.[0];
        const lodger = asgn?.lodger;
        const isOccupied = roomStatus === "occupied" || roomStatus === "pending_checkout";
        return (
          <Space size={2}>
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
                <Tooltip title="Ir al alojamiento">
                  <Button size="small" type="text" icon={<SwapOutlined />}
                    onClick={() => navigateToRoom(r)} />
                </Tooltip>
                {roomStatus === "occupied" && (
                  <Tooltip title="Check-out (ir al alojamiento)">
                    <Button size="small" type="text" danger icon={<LogoutOutlined />}
                      onClick={() => navigateToRoom(r)} />
                  </Tooltip>
                )}
              </>
            ) : roomStatus === "free" ? (
              <Tooltip title="Asignar inquilino">
                <Button size="small" type="primary" icon={<UserAddOutlined />}
                  style={{ borderRadius: 20, fontSize: 11 }}
                  onClick={() => navigate(`/v2/admin/inquilinos/nuevo?acc=${r.accommodation_id}&room=${r.id}`)}>
                  Asignar
                </Button>
              </Tooltip>
            ) : null}
          </Space>
        );
      },
    },
  ];

  // ─── Vista cards ──────────────────────────────────────────────────────────

  function RoomCard({ room, hoveredRoomId, setHoveredRoomId }) {
    const roomStatus = getRoomStatus(room);
    const isOccupied = roomStatus === "occupied" || roomStatus === "pending_checkout";
    const asgn = room.active_assignment?.[0];
    const lodger = asgn?.lodger;
    const badge = ROOM_STATUS_BADGE[roomStatus] || ROOM_STATUS_BADGE.maintenance;
    const upcoming = getRoomUpcoming(room);

    const roomNum = String(room.number);
    const roomLabel = roomNum.startsWith("HAB-") ? roomNum : `HAB-${roomNum.padStart(3, "0")}`;
    const roomImg = !isOccupied ? ROOM_IMG_FREE
      : lodger?.gender === "female" ? ROOM_IMG_FEMALE
      : ROOM_IMG_OCCUPIED;

    const rent = asgn?.monthly_rent ?? room.monthly_rent;
    const entityName = getEntityName(room.entity);
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
        {/* ── 1: Cabecera — título + badge + precio ── */}
        <div style={{ padding: "12px 14px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
            <Text strong style={{ fontSize: 13, color: "#1D1D1F", letterSpacing: "-0.2px", lineHeight: 1.2 }}>
              Habitación {roomLabel}
            </Text>
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
            {rent != null
              ? <><Text strong style={{ fontSize: 11, color: "#1D1D1F" }}>{formatCurrency(rent)}</Text><Text style={{ fontSize: 10, color: "#6B7280" }}>/mes</Text></>
              : <Text style={{ fontSize: 10, color: "#9CA3AF" }}>—</Text>
            }
          </div>
        </div>

        {/* ── 2: Imagen con badge inquilino superpuesto ── */}
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
          {isOccupied && lodger && (() => {
            const st = getLodgerStatus(lodger);
            const b = LODGER_STATUS_BADGE[st] || LODGER_STATUS_BADGE.inactive;
            return (
              <span style={{
                position: "absolute", bottom: 10, left: 12,
                background: b.bg, color: b.color,
                borderRadius: 20, padding: "1px 9px",
                fontSize: 10, fontWeight: 700,
              }}>
                {getLodgerStatusLabel(st)}
              </span>
            );
          })()}
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

        {/* ── 3: Inquilino (izq) + Características (dcha) ── */}
        <div style={{ padding: "10px 14px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, overflow: "hidden", paddingRight: 8 }}>
              {isOccupied && lodger ? (
                <>
                  <Text strong style={{ fontSize: 11, color: "#1D1D1F", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lodger.full_name}
                  </Text>
                  {asgn?.move_in_date && (
                    <Text style={{ fontSize: 10, color: "#6B7280", display: "block" }}>
                      Entrada {formatDate(asgn.move_in_date)}
                    </Text>
                  )}
                  {asgn?.move_out_date && (
                    <Text style={{ fontSize: 10, color: "#DC2626", display: "block" }}>
                      Baja {formatDate(asgn.move_out_date)}
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
              <Tooltip title="Ir al alojamiento">
                <Button size="small" type="text" icon={<SwapOutlined />}
                  onClick={() => navigateToRoom(room)} />
              </Tooltip>
              {roomStatus === "occupied" && (
                <Tooltip title="Check-out (ir al alojamiento)">
                  <Button size="small" type="text" danger icon={<LogoutOutlined />}
                    onClick={() => navigateToRoom(room)} />
                </Tooltip>
              )}
            </>
          ) : roomStatus === "free" ? (
            <Button size="small" type="primary" icon={<UserAddOutlined />}
              style={{ borderRadius: 20, fontWeight: 600, fontSize: 11, background: "#0096D6", borderColor: "#0096D6" }}
              onClick={() => navigate(`/v2/admin/inquilinos/nuevo?acc=${room.accommodation_id}&room=${room.id}`)}>
              Asignar Inquilino
            </Button>
          ) : null}
        </div>

        {/* ── 5: Footer — Alojamiento + Entidad ── */}
        <div style={{ borderTop: "1px solid #F3F4F6", padding: "6px 14px 10px" }}>
          <div style={{ display: "flex", gap: 3, overflow: "hidden" }}>
            <Text style={{ fontSize: 10, color: "#9CA3AF", whiteSpace: "nowrap", flexShrink: 0 }}>Aloj.:</Text>
            <Text style={{ fontSize: 10, color: "#6B7280", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {room.accommodation?.name || "—"}
            </Text>
          </div>
          {entityName && entityName !== "—" && (
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
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 12 }}>
          <Col flex="auto">
            <Title level={2} style={{ margin: 0 }}>Búsqueda de Habitaciones</Title>
            <Text type="secondary">
              {loading ? "Cargando..." : `${filteredRooms.length} habitación${filteredRooms.length !== 1 ? "es" : ""}`}
            </Text>
          </Col>
        </Row>

        {/* Filtros */}
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }} align="middle">
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Entidad propietaria"
              style={{ width: "100%" }}
              allowClear
              showSearch
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              value={filterEntityId}
              onChange={v => { setFilterEntityId(v ?? null); setCardPage(1); setHasSearched(true); }}
              options={entities.map(e => ({
                value: e.id,
                label: getEntityName(e),
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Alojamiento"
              style={{ width: "100%" }}
              allowClear
              showSearch
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              value={filterAccId}
              onChange={v => { setFilterAccId(v ?? null); setCardPage(1); setHasSearched(true); }}
              options={availableAccs.map(a => ({ value: a.id, label: a.name }))}
            />
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              placeholder="Estado"
              style={{ width: "100%" }}
              allowClear
              value={filterStatus}
              onChange={v => { setFilterStatus(v ?? null); setCardPage(1); setHasSearched(true); }}
              options={[
                { value: "free",             label: "Libre" },
                { value: "occupied",          label: "Ocupada" },
                { value: "pending_checkout",  label: "Pend. baja" },
                { value: "maintenance",       label: "Mantenimiento" },
              ]}
            />
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              placeholder="Baño"
              style={{ width: "100%" }}
              allowClear
              value={filterBathroom}
              onChange={v => { setFilterBathroom(v ?? null); setCardPage(1); setHasSearched(true); }}
              options={[
                { value: "shared",  label: "Compartido" },
                { value: "private", label: "Privado" },
                { value: "ensuite", label: "En suite" },
              ]}
            />
          </Col>
          <Col xs={12} sm={8} md={4} lg={3}>
            <Select
              placeholder="Cocina"
              style={{ width: "100%" }}
              allowClear
              value={filterKitchen}
              onChange={v => { setFilterKitchen(v ?? null); setCardPage(1); setHasSearched(true); }}
              options={[
                { value: "shared",  label: "Compartida" },
                { value: "private", label: "Privada" },
                { value: "none",    label: "Sin cocina" },
              ]}
            />
          </Col>
          <Col xs={12} sm={4} md={3}>
            <Button
              icon={<ClearOutlined />}
              onClick={clearFilters}
              disabled={!hasSearched && !hasFilters}
            >
              Limpiar
            </Button>
          </Col>
          <Col flex="auto" />
          <Col>
            <Space size={4}>
              <Button
                size="small"
                icon={<AppstoreOutlined />}
                type={viewMode === "cards" ? "primary" : "default"}
                onClick={() => changeViewMode("cards")}
              />
              <Button
                size="small"
                icon={<UnorderedListOutlined />}
                type={viewMode === "list" ? "primary" : "default"}
                onClick={() => changeViewMode("list")}
              />
            </Space>
          </Col>
        </Row>

        {/* Error */}
        {error && (
          <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />
        )}

        {/* Contenido */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : !hasSearched ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>
            Selecciona uno o más filtros para ver habitaciones.
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}>
            No hay habitaciones que coincidan con los filtros.
          </div>
        ) : viewMode === "cards" ? (
          <>
            <Row gutter={[20, 20]}>
              {filteredRooms
                .slice((cardPage - 1) * PAGE_SIZE, cardPage * PAGE_SIZE)
                .map(room => (
                  <Col key={room.id} xs={24} sm={12} md={8} xl={6}>
                    <RoomCard room={room} hoveredRoomId={hoveredRoomId} setHoveredRoomId={setHoveredRoomId} />
                  </Col>
                ))}
            </Row>
            {filteredRooms.length > PAGE_SIZE && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                <Pagination
                  current={cardPage}
                  pageSize={PAGE_SIZE}
                  total={filteredRooms.length}
                  onChange={p => { setCardPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  showTotal={(t, [s, e]) => `${s}–${e} de ${t} habitaciones`}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        ) : (
          <Table
            dataSource={filteredRooms}
            columns={tableColumns}
            rowKey="id"
            size="small"
            className="compact-table"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total: ${t} habitaciones` }}
            scroll={{ x: 900 }}
          />
        )}
    </V2Layout>
  );
}
