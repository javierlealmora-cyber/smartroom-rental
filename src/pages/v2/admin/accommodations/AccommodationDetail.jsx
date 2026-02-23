// src/pages/v2/admin/accommodations/AccommodationDetail.jsx
// Detalle de alojamiento: habitaciones con estado, características e inquilino asignado

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Avatar, Button, Card, Col, Divider, Modal, Row,
  Select, Skeleton, Space, Tag, Tooltip, Typography,
} from "antd";
import {
  ArrowLeftOutlined, BankOutlined, EditOutlined, HomeOutlined,
  PlusOutlined, SearchOutlined, SwapOutlined, UserAddOutlined, UserOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { supabase } from "../../../../services/supabaseClient";
import { IllustrationRoom } from "../../../../components/icons3d/Illustrations3D";

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
function BuildingIcon({ size = 20, color = "#3B82F6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 22V12h6v10" />
      <path d="M3 9h18" />
      <rect x="7" y="5" width="2" height="2" fill={color} stroke="none" />
      <rect x="11" y="5" width="2" height="2" fill={color} stroke="none" />
      <rect x="15" y="5" width="2" height="2" fill={color} stroke="none" />
      <rect x="7" y="13" width="2" height="2" fill={color} stroke="none" />
      <rect x="15" y="13" width="2" height="2" fill={color} stroke="none" />
    </svg>
  );
}

export default function AccommodationDetail() {
  const { entityId, accId } = useParams();
  const navigate = useNavigate();
  const { userName, companyBranding } = useAdminLayout();

  const [accommodation, setAccommodation] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignRoom, setAssignRoom] = useState(null);
  const [allLodgers, setAllLodgers] = useState([]);
  const [loadingLodgers, setLoadingLodgers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: acc, error: accErr } = await supabase
        .from("accommodations")
        .select("*, owner_entity:entities(id, legal_name, first_name, last_name1, legal_type)")
        .eq("id", accId).single();
      if (accErr) throw new Error(accErr.message);
      const { data: roomsData, error: roomsErr } = await supabase
        .from("rooms")
        .select(`*, active_assignment:lodger_room_assignments(id, move_in_date, monthly_rent, status, lodger:lodgers(id, full_name, email, phone, status))`)
        .eq("accommodation_id", accId)
        .eq("lodger_room_assignments.status", "active")
        .order("number");
      if (roomsErr) throw new Error(roomsErr.message);
      setAccommodation(acc); setRooms(roomsData || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accId]);

  useEffect(() => { load(); }, [load]);

  const openAssignModal = useCallback(async (room) => {
    setAssignRoom(room);
    setLoadingLodgers(true);
    try {
      const { data } = await supabase
        .from("lodgers").select("id, full_name, email, status")
        .in("status", ["active", "invited"]).order("full_name");
      setAllLodgers(data || []);
    } catch { setAllLodgers([]); }
    finally { setLoadingLodgers(false); }
  }, []);

  const backPath = entityId ? `/v2/admin/entidades/${entityId}` : "/v2/admin/alojamientos";
  const backLabel = entityId ? "Entidad" : "Alojamientos";
  const freeCount = rooms.filter((r) => r.status === "free").length;
  const occupiedCount = rooms.filter((r) => r.status === "occupied").length;
  const pendingCount = rooms.filter((r) => r.status === "pending_checkout").length;

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header — back top-left, title below */}
      <div style={{ marginBottom: 28 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(backPath)}
          style={{ paddingLeft: 0, color: "#6B7280", marginBottom: 10, fontSize: 14 }}>
          {backLabel}
        </Button>
        {loading ? <Skeleton active title={{ width: 260 }} paragraph={{ rows: 1 }} /> : (
          <Row justify="space-between" align="top">
            <Col flex="auto">
              <Row align="middle" gutter={14} style={{ marginBottom: 4 }}>
                <Col>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BuildingIcon size={26} color="#3B82F6" />
                  </div>
                </Col>
                <Col>
                  <Title level={2} style={{ margin: 0, fontWeight: 700, fontSize: 28, letterSpacing: "-0.5px", color: "#1D1D1F" }}>
                    {accommodation?.name}
                  </Title>
                </Col>
              </Row>
              <Text style={{ fontSize: 14, color: "#6B7280" }}>
                {[accommodation?.address_line1 || accommodation?.street, accommodation?.postal_code, accommodation?.city].filter(Boolean).join(", ") || "Sin dirección"}
                {accommodation?.owner_entity && (
                  <span style={{ marginLeft: 10 }}>· <BankOutlined style={{ marginRight: 4, color: "#3B82F6" }} />
                    <span
                      style={{ color: "#3B82F6", fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => navigate(`/v2/admin/entidades/${accommodation.owner_entity.id}`)}
                    >
                      {accommodation.owner_entity.legal_name || [accommodation.owner_entity.first_name, accommodation.owner_entity.last_name1].filter(Boolean).join(" ")}
                    </span>
                  </span>
                )}
              </Text>
            </Col>
            <Col style={{ paddingTop: 4 }}>
              <Space>
                <Button icon={<EditOutlined />} onClick={() => navigate(`/v2/admin/alojamientos/${accId}/editar`)}>Editar</Button>
                <Button type="primary" icon={<UserAddOutlined />} onClick={() => navigate(`/v2/admin/inquilinos/nuevo?acc=${accId}`)}>
                  Nuevo inquilino
                </Button>
              </Space>
            </Col>
          </Row>
        )}
      </div>

      {/* Resumen rápido — Apple-style KPI row */}
      {!loading && rooms.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginBottom: 28 }}>
          {[
            { label: "Total", value: rooms.length, bg: "#F3F4F6", color: "#1D1D1F" },
            { label: "Ocupadas", value: occupiedCount, bg: "#FFF5F5", color: "#DC2626" },
            { label: "Libres", value: freeCount, bg: "#F0FDF4", color: "#16A34A" },
            { label: "Pte. baja", value: pendingCount, bg: "#FFFBEB", color: "#D97706" },
          ].map((s) => (
            <Col key={s.label} xs={6}>
              <div style={{
                background: s.bg, borderRadius: 10, padding: "6px 4px",
                textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: s.color, opacity: 0.7, marginTop: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <div style={{ marginBottom: 12 }}>
        <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>
          Habitaciones ({loading ? "…" : rooms.length})
        </Text>
      </div>

      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((i) => (
            <Col key={i} xs={24} sm={12} md={8} xl={6}><Card><Skeleton active paragraph={{ rows: 4 }} /></Card></Col>
          ))}
        </Row>
      ) : rooms.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "40px 0", borderStyle: "dashed" }}>
          <HomeOutlined style={{ fontSize: 40, color: "#D1D5DB", marginBottom: 12 }} />
          <div><Text type="secondary">Este alojamiento no tiene habitaciones configuradas</Text></div>
          <Button type="link" onClick={() => navigate(`/v2/admin/alojamientos/${accId}/editar`)} style={{ marginTop: 8 }}>
            Ir a editar alojamiento para añadir habitaciones
          </Button>
        </Card>
      ) : (
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
                    style={{ margin: "0 -20px 16px -20px", overflow: "hidden", background: "#F8FAFC", cursor: isOccupied && lodger ? "pointer" : "default" }}
                    onClick={() => { if (isOccupied && lodger) navigate(`/v2/admin/inquilinos/${lodger.id}/editar`); }}
                    title={isOccupied && lodger ? `Editar inquilino: ${lodger.full_name}` : undefined}
                  >
                    <img
                      src={ROOM_CARD_IMAGE}
                      alt="Habitación"
                      style={{ width: "100%", display: "block" }}
                    />
                  </div>

                  {/* ── 6: Datos inquilino (debajo de la foto, altura fija) ── */}
                  <div style={{ minHeight: 68, marginBottom: 4 }}>
                    {isOccupied && lodger ? (
                      <>
                        <Text strong style={{ fontSize: 15, display: "block", color: "#374151", marginBottom: 1 }}>
                          {lodger.full_name}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: 700, color: LODGER_STATUS_COLOR[lodger.status] || "#6B7280", display: "block", marginBottom: 1 }}>
                          {LODGER_STATUS_LABEL[lodger.status] || lodger.status}
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
      )}

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
        destroyOnClose
      >
        <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 14px", marginBottom: 16, border: "1px solid #E5E7EB" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Selecciona un inquilino ya dado de alta para asignarlo directamente a esta habitación, o crea uno nuevo.
          </Text>
        </div>
        <Select
          showSearch
          loading={loadingLodgers}
          placeholder="Buscar por nombre o email..."
          optionFilterProp="label"
          style={{ width: "100%", marginBottom: 8 }}
          options={(allLodgers || []).map((l) => ({
            value: l.id,
            label: `${l.full_name} — ${l.email}`,
          }))}
          onSelect={(lodgerId) => {
            setAssignRoom(null);
            navigate(`/v2/admin/inquilinos/${lodgerId}/editar?action=reassign&acc=${accId}&room=${assignRoom?.id}`);
          }}
        />
        <Text type="secondary" style={{ fontSize: 11 }}>
          Al seleccionar un inquilino se abrirá el formulario de cambio de habitación con esta habitación preseleccionada.
        </Text>
      </Modal>
    </V2Layout>
  );
}
