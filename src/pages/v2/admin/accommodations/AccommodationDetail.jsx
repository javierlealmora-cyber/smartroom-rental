// src/pages/v2/admin/accommodations/AccommodationDetail.jsx
// Detalle de alojamiento: habitaciones con estado e inquilino asignado

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Avatar, Button, Card, Col, Row, Skeleton, Tag, Tooltip, Typography,
} from "antd";
import {
  ArrowLeftOutlined, EditOutlined, HomeOutlined, PlusOutlined,
  SwapOutlined, UserOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;

const ROOM_STATUS_TAG = {
  free: "success",
  occupied: "error",
  pending_checkout: "warning",
  maintenance: "default",
};
const ROOM_STATUS_LABEL = {
  free: "Libre",
  occupied: "Ocupada",
  pending_checkout: "Pendiente baja",
  maintenance: "Mantenimiento",
};

const LODGER_STATUS_COLOR = {
  active: "#059669",
  invited: "#3B82F6",
  pending_checkout: "#F59E0B",
  inactive: "#9CA3AF",
};
const LODGER_STATUS_LABEL = {
  active: "Activo",
  invited: "Invitado",
  pending_checkout: "Pendiente baja",
  inactive: "Inactivo",
};

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AccommodationDetail() {
  const { entityId, accId } = useParams();
  const navigate = useNavigate();
  const { userName, companyBranding } = useAdminLayout();

  const [accommodation, setAccommodation] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Cargar alojamiento
      const { data: acc, error: accErr } = await supabase
        .from("accommodations")
        .select("*, owner_entity:entities(id, legal_name, first_name, last_name1, legal_type)")
        .eq("id", accId)
        .single();
      if (accErr) throw new Error(accErr.message);

      // Cargar habitaciones con asignación activa e inquilino
      const { data: roomsData, error: roomsErr } = await supabase
        .from("rooms")
        .select(`
          *,
          active_assignment:lodger_room_assignments(
            id, move_in_date, monthly_rent, status,
            lodger:lodgers(id, full_name, email, phone, status)
          )
        `)
        .eq("accommodation_id", accId)
        .eq("lodger_room_assignments.status", "active")
        .order("number");

      if (roomsErr) throw new Error(roomsErr.message);

      setAccommodation(acc);
      setRooms(roomsData || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [accId]);

  useEffect(() => { load(); }, [load]);

  const backPath = entityId
    ? `/v2/admin/entidades/${entityId}`
    : "/v2/admin/alojamientos";

  const backLabel = entityId ? "Entidad" : "Alojamientos";

  const freeCount = rooms.filter((r) => r.status === "free").length;
  const occupiedCount = rooms.filter((r) => r.status === "occupied").length;
  const pendingCount = rooms.filter((r) => r.status === "pending_checkout").length;

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(backPath)}
            style={{ marginBottom: 8, paddingLeft: 0, color: "#6B7280" }}
          >
            {backLabel}
          </Button>
          {loading ? (
            <Skeleton active title={{ width: 220 }} paragraph={false} />
          ) : (
            <>
              <Title level={2} style={{ margin: 0 }}>{accommodation?.name}</Title>
              <Text type="secondary">
                {[accommodation?.address_line1 || accommodation?.street, accommodation?.postal_code, accommodation?.city]
                  .filter(Boolean).join(", ") || "Sin dirección"}
                {accommodation?.owner_entity && (
                  <span style={{ marginLeft: 8 }}>
                    · <span style={{ color: "#3B82F6" }}>
                      {accommodation.owner_entity.legal_name ||
                        [accommodation.owner_entity.first_name, accommodation.owner_entity.last_name1].filter(Boolean).join(" ")}
                    </span>
                  </span>
                )}
              </Text>
            </>
          )}
        </Col>
        <Col>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/v2/admin/alojamientos/${accId}/editar`)}
          >
            Editar
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/v2/admin/inquilinos/nuevo")}
          >
            Nuevo inquilino
          </Button>
        </Col>
      </Row>

      {/* Resumen rápido */}
      {!loading && rooms.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
          {[
            { label: "Total hab.", value: rooms.length, color: "#1D1D1F" },
            { label: "Ocupadas", value: occupiedCount, color: "#DC2626" },
            { label: "Libres", value: freeCount, color: "#059669" },
            { label: "Pend. baja", value: pendingCount, color: "#F59E0B" },
          ].map((s) => (
            <Col key={s.label} xs={6} sm={6}>
              <Card size="small" style={{ textAlign: "center", borderRadius: 10 }} bodyStyle={{ padding: "12px 8px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {/* Sección habitaciones */}
      <div style={{ marginBottom: 12 }}>
        <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>
          Habitaciones ({loading ? "…" : rooms.length})
        </Text>
      </div>

      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((i) => (
            <Col key={i} xs={24} sm={12} md={8} xl={6}>
              <Card><Skeleton active paragraph={{ rows: 3 }} /></Card>
            </Col>
          ))}
        </Row>
      ) : rooms.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "40px 0", borderStyle: "dashed" }}>
          <HomeOutlined style={{ fontSize: 40, color: "#D1D5DB", marginBottom: 12 }} />
          <div><Text type="secondary">Este alojamiento no tiene habitaciones configuradas</Text></div>
          <Button
            type="link"
            onClick={() => navigate(`/v2/admin/alojamientos/${accId}/editar`)}
            style={{ marginTop: 8 }}
          >
            Ir a editar alojamiento para añadir habitaciones
          </Button>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {rooms.map((room) => {
            const assignment = room.active_assignment?.[0];
            const lodger = assignment?.lodger;
            const isOccupied = room.status === "occupied" || room.status === "pending_checkout";

            return (
              <Col key={room.id} xs={24} sm={12} md={8} xl={6}>
                <Card
                  style={{
                    borderRadius: 12,
                    border: `1.5px solid ${
                      room.status === "free" ? "#D1FAE5"
                      : room.status === "occupied" ? "#FEE2E2"
                      : room.status === "pending_checkout" ? "#FEF3C7"
                      : "#E5E7EB"
                    }`,
                    background: room.status === "free" ? "#F0FDF4"
                      : room.status === "occupied" ? "#FFF5F5"
                      : room.status === "pending_checkout" ? "#FFFBEB"
                      : "#F9FAFB",
                  }}
                  bodyStyle={{ padding: "18px 20px" }}
                >
                  {/* Número de habitación + estado */}
                  <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                    <Col>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: room.status === "free" ? "#DCFCE7"
                          : room.status === "occupied" ? "#FEE2E2"
                          : room.status === "pending_checkout" ? "#FEF3C7"
                          : "#E5E7EB",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Text strong style={{
                          fontSize: 16,
                          color: room.status === "free" ? "#16A34A"
                            : room.status === "occupied" ? "#DC2626"
                            : room.status === "pending_checkout" ? "#D97706"
                            : "#6B7280",
                        }}>
                          {room.number}
                        </Text>
                      </div>
                    </Col>
                    <Col>
                      <Tag color={ROOM_STATUS_TAG[room.status] || "default"} style={{ margin: 0 }}>
                        {ROOM_STATUS_LABEL[room.status] || room.status}
                      </Tag>
                    </Col>
                  </Row>

                  {/* Tipo de habitación */}
                  {room.type && (
                    <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {room.type}
                    </Text>
                  )}

                  {/* Inquilino */}
                  {isOccupied && lodger ? (
                    <div style={{
                      background: "rgba(255,255,255,0.7)",
                      borderRadius: 8, padding: "10px 12px",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}>
                      <Row align="middle" gutter={8} style={{ marginBottom: 6 }}>
                        <Col>
                          <Avatar
                            size={28}
                            style={{ backgroundColor: "#111827", fontSize: 12, flexShrink: 0 }}
                          >
                            {lodger.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </Avatar>
                        </Col>
                        <Col flex="auto">
                          <Text strong style={{ fontSize: 13, display: "block", lineHeight: 1.3 }}>
                            {lodger.full_name}
                          </Text>
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            color: LODGER_STATUS_COLOR[lodger.status] || "#6B7280",
                            textTransform: "uppercase", letterSpacing: "0.04em",
                          }}>
                            {LODGER_STATUS_LABEL[lodger.status] || lodger.status}
                          </span>
                        </Col>
                      </Row>
                      {lodger.email && (
                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{lodger.email}</Text>
                      )}
                      {assignment?.move_in_date && (
                        <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
                          Entrada: {formatDate(assignment.move_in_date)}
                        </Text>
                      )}
                      {assignment?.monthly_rent && (
                        <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
                          Renta: {Number(assignment.monthly_rent).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        </Text>
                      )}
                      <Row gutter={4} style={{ marginTop: 8 }}>
                        <Col>
                          <Tooltip title="Editar inquilino">
                            <Button
                              size="small" type="text" icon={<EditOutlined />}
                              onClick={() => navigate(`/v2/admin/inquilinos/${lodger.id}/editar`)}
                            />
                          </Tooltip>
                        </Col>
                        <Col>
                          <Tooltip title="Cambiar habitación">
                            <Button
                              size="small" type="text" icon={<SwapOutlined />}
                              onClick={() => navigate(`/v2/admin/inquilinos/${lodger.id}/editar?action=reassign`)}
                            />
                          </Tooltip>
                        </Col>
                      </Row>
                    </div>
                  ) : room.status === "free" ? (
                    <div style={{ textAlign: "center", paddingTop: 4 }}>
                      <UserOutlined style={{ fontSize: 20, color: "#D1D5DB", marginBottom: 4 }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Disponible</Text>
                      </div>
                      <Button
                        type="link"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => navigate("/v2/admin/inquilinos/nuevo")}
                        style={{ marginTop: 4, fontSize: 12 }}
                      >
                        Asignar inquilino
                      </Button>
                    </div>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>Sin inquilino asignado</Text>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </V2Layout>
  );
}
