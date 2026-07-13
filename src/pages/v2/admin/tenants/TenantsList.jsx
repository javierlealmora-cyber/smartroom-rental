// src/pages/v2/admin/tenants/TenantsList.jsx
// Lista de Inquilinos para Admin — Ant Design + Supabase real

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Input, message, Row, Col, Select, Space,
  Tag, Typography, Tooltip, Skeleton, Modal, Form, DatePicker, Divider, Table,
} from "antd";
import { PlusOutlined, ReloadOutlined, LogoutOutlined, EditOutlined, SwapOutlined, MailOutlined, HomeOutlined, UserOutlined, FileTextOutlined, LineChartOutlined, AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import EmptyState from "../../../../components/EmptyState";
import { getLodgerStatus, getLodgerStatusColor, getLodgerStatusLabel } from "../../../../utils/lodgerStatus";
import { formatDate as _formatDate, formatCurrency } from "../../../../utils/formatters";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listLodgers, scheduleCheckout, inviteLodger } from "../../../../services/lodgers.service";
import { listAccommodations } from "../../../../services/accommodations.service";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;
const { Search } = Input;

const STATUS_LABEL = {
  active: "Activo",
  invited: "Invitado",
  pending_checkout: "Pendiente de baja",
  inactive: "Inactivo",
};
const STATUS_COLOR = {
  active: "#059669",
  invited: "#3B82F6",
  pending_checkout: "#F59E0B",
  inactive: "#6B7280",
};

// ✅ REFACTOR: Funciones de formateo y estado centralizadas en utils/

// Imagen de la card: si la asignación activa tiene acompañante,
// usar el dibujo de pareja; si no, la imagen individual por género.
function getTenantImage(t) {
  const hasAccompanist = Boolean(t?.active_assignment?.accompanist_id);
  if (hasAccompanist) return "/images/Inquilinos_cuerpo_entero.webp";
  return t?.gender === "female"
    ? "/images/inquilina-card-model.webp"
    : "/images/inquilino-card-model.webp";
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

export default function TenantsList() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const [allLodgers, setAllLodgers] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccommodation, setFilterAccommodation] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [sendingInvite, setSendingInvite] = useState({});
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("smartrent_tenants_viewMode") || "cards"
  );
  
  // Estados para modal de check-out
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [lodgerToCheckout, setLodgerToCheckout] = useState(null);
  const [checkoutForm] = Form.useForm();
  const [mockedConsumptions, setMockedConsumptions] = useState(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lodgers, accs] = await Promise.all([
        listLodgers({ clientAccountId }),
        listAccommodations({ status: "active" }),
      ]);
      
      // Cargar todas las asignaciones de los inquilinos para calcular estado dinámico
      const lodgerIds = lodgers.map(l => l.id).filter(Boolean);
      
      if (lodgerIds.length > 0) {
        const { data: allAssignments } = await supabase
          .from("lodger_room_assignments")
          .select("id, lodger_id, move_in_date, move_out_date, room_id, accommodation_id, deposit_amount, monthly_rent")
          .in("lodger_id", lodgerIds)
          .eq("client_account_id", clientAccountId); // ✅ SEGURIDAD: Filtro multi-tenant
        
        // Mapear asignaciones a cada lodger
        lodgers.forEach(lodger => {
          lodger.assignments = (allAssignments || []).filter(a => a.lodger_id === lodger.id);
        });
      }
      
      setAllLodgers(lodgers);
      setAccommodations(accs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId]);

  useEffect(() => { load(); }, [load]);

  const tenants = useMemo(() => {
    let result = allLodgers;
    if (!showInactive) result = result.filter((t) => getLodgerStatus(t) !== "inactive");
    if (filterStatus) result = result.filter((t) => getLodgerStatus(t) === filterStatus);
    if (filterAccommodation) {
      result = result.filter((t) =>
        t.active_assignment?.[0]?.accommodation?.id === filterAccommodation
      );
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter((t) => {
        // REQ-015: incluimos al acompañante en la búsqueda
        const acc = t.active_assignment?.[0]?.accompanist;
        const accName = acc
          ? [acc.first_name, acc.last_name1, acc.last_name2, acc.nickname].filter(Boolean).join(" ").toLowerCase()
          : "";
        return (
          t.full_name.toLowerCase().includes(s) ||
          t.email.toLowerCase().includes(s) ||
          (t.phone && t.phone.includes(s)) ||
          (accName && accName.includes(s))
        );
      });
    }
    return result;
  }, [allLodgers, searchTerm, filterStatus, filterAccommodation, showInactive]);

  // eslint-disable-next-line no-unused-vars
  const onScheduleCheckout = async (tenant) => {
    const date = prompt("Fecha de baja (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
    if (!date) return;
    try {
      await scheduleCheckout(tenant.id, date);
      setAllLodgers((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: "pending_checkout" } : t))
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const onSendInvite = async (tenant) => {
    setSendingInvite((prev) => ({ ...prev, [tenant.id]: true }));
    try {
      await inviteLodger(tenant.id);
      message.success(`Email de acceso enviado a ${tenant.email}`);
    } catch (e) {
      message.error(`Error al enviar: ${e.message}`);
    } finally {
      setSendingInvite((prev) => ({ ...prev, [tenant.id]: false }));
    }
  };

  const clearFilters = () => {
    setSearchTerm(""); setFilterStatus(""); setFilterAccommodation(""); setShowInactive(false);
  };

  const hasFilters = searchTerm || filterStatus || filterAccommodation;

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <style>{`
        .tenant-card {
          transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
        }
        .tenant-card:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 6px 18px rgba(0,0,0,0.10) !important;
        }
      `}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 12 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}><UserOutlined style={{ marginRight: 10, color: "#1D1D1F" }} />Inquilinos</Title>
          <Text type="secondary">
            {loading ? "Cargando..." : `${tenants.length} inquilino${tenants.length !== 1 ? "s" : ""}`}
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: "#2563EB", borderColor: "#2563EB" }}
            onClick={() => navigate("/v2/admin/inquilinos/nuevo")}
          >
            Nuevo Inquilino
          </Button>
        </Col>
      </Row>

      {/* Filtros */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }} align="middle">
        <Col xs={24} sm={24} md={8} lg={7}>
          <Search
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={(v) => setSearchTerm(v)}
            allowClear
          />
        </Col>
        <Col xs={12} sm={8} md={5} lg={4}>
          <Select
            style={{ width: "100%" }}
            placeholder="Estado"
            value={filterStatus || undefined}
            onChange={(v) => setFilterStatus(v || "")}
            allowClear
            options={[
              { value: "active", label: "Activo" },
              { value: "invited", label: "Invitado" },
              { value: "pending_checkout", label: "Pendiente de baja" },
            ]}
          />
        </Col>
        <Col xs={12} sm={8} md={6} lg={5}>
          <Select
            style={{ width: "100%" }}
            placeholder="Filtrar por alojamiento"
            value={filterAccommodation || undefined}
            onChange={(v) => setFilterAccommodation(v || "")}
            allowClear
            options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Col>
        <Col xs={12} sm={4} md={3}>
          <Button
            icon={<ReloadOutlined />}
            onClick={clearFilters}
            disabled={!hasFilters && !showInactive}
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
              style={viewMode === "cards" ? { background: "color-mix(in srgb, #BFDBFE, black 30%)", borderColor: "color-mix(in srgb, #BFDBFE, black 30%)", color: "#1E3A5F" } : {}}
              onClick={() => { setViewMode("cards"); localStorage.setItem("smartrent_tenants_viewMode", "cards"); }}
            />
            <Button
              size="small"
              icon={<UnorderedListOutlined />}
              type={viewMode === "list" ? "primary" : "default"}
              style={viewMode === "list" ? { background: "color-mix(in srgb, #BFDBFE, black 30%)", borderColor: "color-mix(in srgb, #BFDBFE, black 30%)", color: "#1E3A5F" } : {}}
              onClick={() => { setViewMode("list"); localStorage.setItem("smartrent_tenants_viewMode", "list"); }}
            />
          </Space>
        </Col>
      </Row>

      {/* Error */}
      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          action={<Button size="small" onClick={load}>Reintentar</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Vista: Cards o Lista */}
      {viewMode === "list" ? (
        <Table
          dataSource={tenants}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total: ${total} inquilinos` }}
          style={{ 
            '--ant-table-padding-vertical': '6px',
            '--ant-table-padding-horizontal': '8px'
          }}
          className="compact-table"
          locale={{
            emptyText: hasFilters
              ? <EmptyState icon="🔍" title="Sin resultados" description="No se encontraron inquilinos con los filtros aplicados" />
              : <EmptyState icon="👥" title="No hay inquilinos" description="Registra tu primer inquilino para empezar" actionLabel="Nuevo Inquilino" onAction={() => navigate("/v2/admin/inquilinos/nuevo")} />
          }}
          columns={[
            {
              title: "Nombre",
              dataIndex: "full_name",
              key: "full_name",
              render: (name, record) => {
                const acc = record.active_assignment?.[0]?.accompanist;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                      src={getTenantImage(record)}
                      alt="Inquilino"
                      style={{ width: 41, height: 41, objectFit: "contain", borderRadius: 8 }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{name}</div>
                      {acc && (
                        <Tag color="purple" style={{ margin: 0, fontWeight: 600, fontSize: 10, alignSelf: "flex-start" }}>
                          Compartida
                        </Tag>
                      )}
                    </div>
                  </div>
                );
              },
            },
            {
              title: "Email",
              dataIndex: "email",
              key: "email",
              render: (email) => <div style={{ fontSize: 13, color: "#6B7280" }}>{email}</div>,
            },
            {
              title: "Teléfono",
              dataIndex: "phone",
              key: "phone",
              render: (phone) => phone || "—",
            },
            {
              title: "Estado",
              key: "status",
              render: (_, record) => (
                <Tag color={getLodgerStatusColor(getLodgerStatus(record))} style={{ fontWeight: 600 }}>
                  {getLodgerStatusLabel(getLodgerStatus(record))}
                </Tag>
              ),
            },
            {
              title: "Alojamiento",
              key: "accommodation",
              render: (_, record) => {
                const asgn = record.active_assignment?.[0];
                return asgn?.accommodation?.name ? (
                  <div style={{ fontWeight: 600, color: "#0071E3" }}>{asgn.accommodation.name}</div>
                ) : (
                  <Text style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>—</Text>
                );
              },
            },
            {
              title: "Habitación",
              key: "room",
              render: (_, record) => {
                const asgn = record.active_assignment?.[0];
                return asgn?.room?.number ? (
                  <div style={{ fontSize: 13, color: "#374151" }}>Hab. {asgn.room.number}</div>
                ) : (
                  "—"
                );
              },
            },
            {
              title: "Precio",
              key: "rent",
              render: (_, record) => {
                const asgn = record.active_assignment?.[0];
                return asgn?.monthly_rent ? (
                  <div style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>{formatCurrency(asgn.monthly_rent)}</div>
                ) : (
                  "—"
                );
              },
            },
            {
              title: "Check-in",
              key: "move_in_date",
              render: (_, record) => {
                const asgn = record.active_assignment?.[0];
                return asgn?.move_in_date ? new Date(asgn.move_in_date).toLocaleDateString('es-ES') : "—";
              },
            },
            {
              title: "Acciones",
              key: "actions",
              render: (_, record) => (
                <Space size="small">
                  <Tooltip title="Detalle del Inquilino">
                    <Button size="small" icon={<FileTextOutlined />}
                      onClick={() => navigate(`/v2/admin/inquilinos/${record.id}/detalle-inquilino`)} />
                  </Tooltip>
                  <Tooltip title={getLodgerStatus(record) === "invited" ? "Sin consumos (inquilino invitado)" : "Ver Consumos"}>
                    <Button size="small" icon={<LineChartOutlined />}
                      disabled={getLodgerStatus(record) === "invited"}
                      onClick={() => navigate(`/v2/admin/inquilinos/${record.id}/detalle`)} />
                  </Tooltip>
                  {getLodgerStatus(record) === "active" && (
                    <Tooltip title="Cambiar habitación">
                      <Button size="small" icon={<SwapOutlined />}
                        onClick={() => navigate(`/v2/admin/inquilinos/${record.id}/detalle-inquilino?action=reassign`)} />
                    </Tooltip>
                  )}
                  {getLodgerStatus(record) === "active" && (
                    <Tooltip title="Hacer Check-Out">
                      <Button size="small" danger icon={<LogoutOutlined />}
                        onClick={() => { 
                          setLodgerToCheckout(record);
                          setShowCheckoutModal(true);
                        }} />
                    </Tooltip>
                  )}
                  <Tooltip title="Enviar email de acceso">
                    <Button size="small" icon={<MailOutlined />}
                      loading={!!sendingInvite[record.id]}
                      onClick={() => onSendInvite(record)} />
                  </Tooltip>
                </Space>
              ),
            },
          ]}
        />
      ) : loading ? (
        <Row gutter={[16, 16]}>
          {[1,2,3,4,5,6].map((i) => (
            <Col key={i} xs={24} sm={12} md={8} lg={6}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <Skeleton active avatar paragraph={{ rows: 3 }} />
              </div>
            </Col>
          ))}
        </Row>
      ) : tenants.length === 0 ? (
        hasFilters
          ? <EmptyState icon="🔍" title="Sin resultados" description="No se encontraron inquilinos con los filtros aplicados" />
          : <EmptyState icon="👥" title="No hay inquilinos" description="Registra tu primer inquilino para empezar" actionLabel="Nuevo Inquilino" onAction={() => navigate("/v2/admin/inquilinos/nuevo")} />
      ) : (
        <Row gutter={[16, 16]}>
          {tenants.map((t) => {
            const asgn = t.active_assignment?.[0];
            const accName = asgn?.accommodation?.name;
            const roomNum = asgn?.room?.number;
            const status = getLodgerStatus(t);
            const STATUS_BG = { active: "#DCFCE7", invited: "#DBEAFE", pending_checkout: "#FEF3C7", inactive: "#F3F4F6" };
            const STATUS_TC = { active: "#15803D", invited: "#1D4ED8", pending_checkout: "#B45309",  inactive: "#6B7280" };
            return (
              <Col key={t.id} xs={24} sm={12} md={8} lg={6} style={{ display: "flex" }}>
                <Card
                  hoverable
                  className="tenant-card"
                  bodyStyle={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}
                  style={{
                    borderRadius: 14, overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    border: "none", width: "100%", cursor: "pointer",
                  }}
                  onClick={() => navigate(`/v2/admin/inquilinos/${t.id}/detalle-inquilino`)}
                >
                  {/* ── Header degradado ──────────────────────────────── */}
                  <div style={{
                    background: "linear-gradient(135deg, color-mix(in srgb, #EFF6FF, black 30%) 0%, color-mix(in srgb, #BFDBFE, black 30%) 100%)",
                    padding: "14px 14px 16px",
                    position: "relative",
                  }}>
                    {/* Badge estado */}
                    <div style={{ position: "absolute", top: 10, right: 12 }}>
                      <span style={{
                        background: STATUS_BG[status] ?? "#F3F4F6",
                        color: STATUS_TC[status] ?? "#6B7280",
                        fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px",
                      }}>
                        {getLodgerStatusLabel(status)}
                      </span>
                    </div>

                    {/* Foto + nombre */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                      <img
                        src={getTenantImage(t)}
                        alt="Inquilino"
                        style={{ width: 90, height: 90, objectFit: "contain", flexShrink: 0, borderRadius: 10 }}
                      />
                      <div style={{ minWidth: 0, paddingRight: 50 }}>
                        <div style={{ color: "#1E3A5F", fontWeight: 700, fontSize: 15, lineHeight: 1.3, marginBottom: 4 }}>
                          {t.full_name}
                        </div>
                        {asgn?.accompanist && (
                          <span style={{
                            background: "rgba(37,99,235,0.12)", color: "#1D4ED8",
                            fontSize: 10, fontWeight: 700, borderRadius: 20,
                            padding: "2px 8px", display: "inline-block",
                          }}>
                            Compartida
                          </span>
                        )}
                        {searchTerm && asgn?.accompanist && (() => {
                          const s = searchTerm.toLowerCase();
                          const accFullName = [asgn.accompanist.first_name, asgn.accompanist.last_name1, asgn.accompanist.last_name2, asgn.accompanist.nickname].filter(Boolean).join(" ").toLowerCase();
                          if (!accFullName.includes(s) || t.full_name.toLowerCase().includes(s)) return null;
                          return (
                            <span style={{
                              background: "rgba(234,179,8,0.2)", color: "#92400E",
                              fontSize: 10, fontWeight: 700, borderRadius: 20,
                              padding: "2px 8px", display: "inline-block", marginLeft: 4,
                            }}>
                              Match acompañante
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* ── Cuerpo blanco ────────────────────────────────── */}
                  <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
                    {/* Email + teléfono */}
                    <div style={{ fontSize: 12, color: "#6B7280", display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.email}</div>
                      {t.phone && <div>{t.phone}</div>}
                      {asgn?.move_in_date && (
                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                          Check-in: {new Date(asgn.move_in_date).toLocaleDateString("es-ES")}
                        </div>
                      )}
                      {asgn?.move_out_date && (
                        <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>
                          Check-out: {new Date(asgn.move_out_date).toLocaleDateString("es-ES")}
                        </div>
                      )}
                    </div>

                    {/* Alojamiento y habitación */}
                    <div style={{
                      background: asgn ? "#F0F9FF" : "#F9FAFB",
                      borderRadius: 8, padding: "7px 10px",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <HomeOutlined style={{ color: asgn ? "#0071E3" : "#9CA3AF", fontSize: 14, flexShrink: 0 }} />
                      {asgn ? (
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#0071E3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {accName || "—"}
                          </div>
                          <div style={{ fontSize: 11, color: "#374151" }}>Habitación {roomNum || "—"}</div>
                        </div>
                      ) : (
                        <Text style={{ fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>Sin habitación asignada</Text>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: "flex", gap: 6, marginTop: "auto", flexWrap: "wrap" }}>
                      <Tooltip title="Detalle del Inquilino">
                        <Button size="small" icon={<FileTextOutlined />}
                          onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/inquilinos/${t.id}/detalle-inquilino`); }} />
                      </Tooltip>
                      <Tooltip title={status === "invited" ? "Sin consumos (inquilino invitado)" : "Ver Consumos"}>
                        <Button size="small" icon={<LineChartOutlined />}
                          disabled={status === "invited"}
                          onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/inquilinos/${t.id}/detalle`); }} />
                      </Tooltip>
                      {status === "active" && (
                        <Tooltip title="Cambiar habitación">
                          <Button size="small" icon={<SwapOutlined />}
                            onClick={(e) => { e.stopPropagation(); navigate(`/v2/admin/inquilinos/${t.id}/detalle-inquilino?action=reassign`); }} />
                        </Tooltip>
                      )}
                      {status === "active" && (
                        <Tooltip title="Hacer Check-Out">
                          <Button size="small" danger icon={<LogoutOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLodgerToCheckout(t);
                              setShowCheckoutModal(true);
                            }} />
                        </Tooltip>
                      )}
                      <Tooltip title="Enviar email de acceso">
                        <Button size="small" icon={<MailOutlined />}
                          loading={!!sendingInvite[t.id]}
                          onClick={(e) => { e.stopPropagation(); onSendInvite(t); }} />
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

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
        destroyOnHidden
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
                  Entrada: {assignment?.move_in_date ? _formatDate(assignment.move_in_date) : 'N/A'}
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
                        checkout_notes: values.observations || null,
                      })
                      .eq('id', assignment.id);
                    
                    if (error) throw error;

                    const isToday = values.checkout_date.isSame(dayjs(), 'day');
                    message.success(
                      isToday 
                        ? 'Check-out realizado. El inquilino ha sido dado de baja.'
                        : `Check-out programado para ${values.checkout_date.format('DD/MM/YYYY')}`
                    );
                    
                    // BUG-036 fix: Emitir evento para que AccommodationDetail recargue habitaciones
                    window.dispatchEvent(new CustomEvent('lodger-checkout', { 
                      detail: { 
                        accommodationId: assignment.accommodation_id,
                        roomId: assignment.room_id 
                      } 
                    }));
                    
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

const STATUS_ANT_COLOR = {
  active: "success",
  invited: "processing",
  pending_checkout: "warning",
  inactive: "default",
};
