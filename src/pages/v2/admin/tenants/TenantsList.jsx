// src/pages/v2/admin/tenants/TenantsList.jsx
// Lista de Inquilinos para Admin — Ant Design + Supabase real

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Input, message, Row, Col, Select, Space,
  Tag, Typography, Tooltip, Skeleton,
} from "antd";
import { PlusOutlined, ReloadOutlined, LogoutOutlined, EditOutlined, SwapOutlined, MailOutlined, HomeOutlined, UserOutlined } from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listLodgers, scheduleCheckout, inviteLodger } from "../../../../services/lodgers.service";
import { listAccommodations } from "../../../../services/accommodations.service";

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

function _formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function TenantsList() {
  const navigate = useNavigate();
  const { userName, companyBranding } = useAdminLayout();

  const [allLodgers, setAllLodgers] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccommodation, setFilterAccommodation] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [sendingInvite, setSendingInvite] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lodgers, accs] = await Promise.all([
        listLodgers(),
        listAccommodations({ status: "active" }),
      ]);
      setAllLodgers(lodgers);
      setAccommodations(accs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tenants = useMemo(() => {
    let result = allLodgers;
    if (!showInactive) result = result.filter((t) => t.status !== "inactive");
    if (filterStatus) result = result.filter((t) => t.status === filterStatus);
    if (filterAccommodation) {
      result = result.filter((t) =>
        t.active_assignment?.[0]?.accommodation?.id === filterAccommodation
      );
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.full_name.toLowerCase().includes(s) ||
          t.email.toLowerCase().includes(s) ||
          t.phone?.includes(s)
      );
    }
    return result;
  }, [allLodgers, searchTerm, filterStatus, filterAccommodation, showInactive]);

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
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 12 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Gestión de Inquilinos</Title>
          <Text type="secondary">
            {loading ? "Cargando..." : `${tenants.length} inquilino${tenants.length !== 1 ? "s" : ""}`}
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
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

      {/* Cards grid */}
      {loading ? (
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
            return (
              <Col key={t.id} xs={24} sm={12} md={8} lg={6}>
                <div style={{
                  background: "#fff", borderRadius: 12, padding: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  border: "1px solid #F3F4F6",
                  display: "flex", flexDirection: "column", gap: 12,
                  height: "100%",
                }}>
                  {/* Avatar + nombre + estado */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={t.gender === "female" ? "/icons/inquilina-card-model.png" : "/icons/inquilino-card-model.png"}
                      alt="Inquilino"
                      style={{ width: 48, height: 48, objectFit: "contain", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.full_name}
                      </div>
                      <Tag
                        style={{ marginTop: 2, fontSize: 11 }}
                        color={STATUS_ANT_COLOR[t.status] || "default"}
                      >
                        {STATUS_LABEL[t.status] || t.status}
                      </Tag>
                    </div>
                  </div>

                  {/* Alojamiento y habitación */}
                  <div style={{
                    background: asgn ? "#F0F9FF" : "#F9FAFB",
                    borderRadius: 8, padding: "8px 10px",
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

                  {/* Contacto */}
                  <div style={{ fontSize: 12, color: "#6B7280", display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.email}</div>
                    {t.phone && <div>{t.phone}</div>}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: "flex", gap: 6, marginTop: "auto", flexWrap: "wrap" }}>
                    <Tooltip title="Editar">
                      <Button size="small" icon={<EditOutlined />}
                        onClick={() => navigate(`/v2/admin/inquilinos/${t.id}/editar`)} />
                    </Tooltip>
                    <Tooltip title="Ver detalle">
                      <Button size="small" icon={<UserOutlined />}
                        onClick={() => navigate(`/v2/admin/inquilinos/${t.id}/detalle`)} />
                    </Tooltip>
                    {t.status === "active" && (
                      <Tooltip title="Cambiar habitación">
                        <Button size="small" icon={<SwapOutlined />}
                          onClick={() => navigate(`/v2/admin/inquilinos/${t.id}/editar?action=reassign`)} />
                      </Tooltip>
                    )}
                    {t.status === "active" && (
                      <Tooltip title="Programar baja">
                        <Button size="small" icon={<LogoutOutlined />}
                          onClick={() => onScheduleCheckout(t)} />
                      </Tooltip>
                    )}
                    <Tooltip title="Enviar email de acceso">
                      <Button size="small" icon={<MailOutlined />}
                        loading={!!sendingInvite[t.id]}
                        onClick={() => onSendInvite(t)} />
                    </Tooltip>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
    </V2Layout>
  );
}

const STATUS_ANT_COLOR = {
  active: "success",
  invited: "processing",
  pending_checkout: "warning",
  inactive: "default",
};
