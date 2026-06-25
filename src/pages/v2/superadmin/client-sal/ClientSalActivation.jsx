// src/pages/v2/superadmin/client-sal/ClientSalActivation.jsx
// Pantalla de activación/gestión de SAL para un client_account específico.
// Ruta: /v2/superadmin/cuentas/:id/smart-access
//
// Superadmin puede:
//   - Ver estado actual de la suscripción SAL
//   - Activar SAL (llama EF sal-activate-subscription)
//   - Suspender o cancelar la suscripción (update directo)

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert, Badge, Button, Descriptions, Form, Input, Modal, Select, Skeleton,
  Space, Tag, Typography, message, Popconfirm,
} from "antd";
import {
  ApiOutlined, ArrowLeftOutlined, CheckCircleOutlined, StopOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAuth } from "../../../../providers/AuthProvider";
import { supabase } from "../../../../services/supabaseClient";
import {
  listPlans,
  getClientSalSubscription,
  updateSubscriptionStatus,
} from "../../../../services/saasServices.service";
import { invokeWithAuth } from "../../../../services/supabaseInvoke.services";

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_CONFIG = {
  pending:   { badge: "default",     label: "Pendiente",   color: "#9CA3AF" },
  active:    { badge: "success",     label: "Activa",      color: "#059669" },
  suspended: { badge: "warning",     label: "Suspendida",  color: "#D97706" },
  cancelled: { badge: "error",       label: "Cancelada",   color: "#DC2626" },
};

const SAL_SERVICE_CODE = "smart_access_lock";

export default function ClientSalActivation() {
  const { id: clientAccountId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [account, setAccount]           = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans]               = useState([]);
  const [salServiceId, setSalServiceId] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [activating, setActivating]     = useState(false);
  const [updating, setUpdating]         = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [notes, setNotes]                   = useState("");

  // Shard pool
  const [shardAssignment, setShardAssignment] = useState(null);
  const [availableShards, setAvailableShards] = useState([]);
  const [shardModalOpen, setShardModalOpen]   = useState(false);
  const [selectedShardId, setSelectedShardId] = useState(null);
  const [assigningShared, setAssigningShared] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Cargar account
      const { data: acc, error: accErr } = await supabase
        .from("client_accounts")
        .select("id, name, last_name1, last_name2, status, plan_code")
        .eq("id", clientAccountId)
        .single();

      if (accErr) throw new Error(accErr.message);
      const ownerFullName = [acc.name, acc.last_name1, acc.last_name2]
        .filter(Boolean).join(" ") || acc.name;
      setAccount({ ...acc, ownerFullName });

      // Cargar servicio SAL
      const { data: svc } = await supabase
        .from("saas_services")
        .select("id")
        .eq("code", SAL_SERVICE_CODE)
        .single();

      if (svc) {
        setSalServiceId(svc.id);

        // Cargar planes disponibles
        const planList = await listPlans(svc.id);
        setPlans(planList.filter((p) => p.is_active));

        // Cargar suscripción actual
        const sub = await getClientSalSubscription(clientAccountId);
        setSubscription(sub);
      }

      // Cargar asignación de shard activa
      const { data: assignment } = await supabase
        .from("provider_account_assignments")
        .select(`
          id, status, assigned_at, notes,
          pool:pool_id ( id, shard_code, ttlock_email, status, is_blocked,
                         current_locks_count, max_locks, current_clients_count, max_clients )
        `)
        .eq("client_account_id", clientAccountId)
        .eq("provider", "ttlock")
        .eq("status", "active")
        .maybeSingle();
      setShardAssignment(assignment ?? null);

      // Cargar shards disponibles para asignar
      const { data: poolData } = await supabase
        .from("provider_account_pools")
        .select("id, shard_code, ttlock_email, status, is_blocked, current_clients_count, max_clients")
        .eq("provider", "ttlock")
        .order("shard_code");
      setAvailableShards(poolData ?? []);

    } catch (e) {
      message.error("Error cargando datos: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [clientAccountId]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const result = await invokeWithAuth("sal-activate-subscription", {
        body: {
          client_account_id:    clientAccountId,
          saas_service_plan_id: selectedPlanId || undefined,
          notes:                notes || undefined,
        },
      });

      if (result?.ok === false) {
        // 409 = ya activa
        if (result.error?.code === "CONFLICT") {
          message.info("SmartAccessLock ya está activo para esta cuenta.");
        } else {
          throw new Error(result.error?.message ?? "Error al activar");
        }
      } else {
        message.success("SmartAccessLock activado correctamente");
      }
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setActivating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await updateSubscriptionStatus(subscription.id, newStatus);
      message.success(`Suscripción ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`);
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignShard = async () => {
    if (!selectedShardId) return;
    setAssigningShared(true);
    try {
      // Desactivar asignación activa previa
      if (shardAssignment) {
        await supabase
          .from("provider_account_assignments")
          .update({ status: "migrated" })
          .eq("id", shardAssignment.id);
      }
      // Crear nueva asignación
      const { error } = await supabase
        .from("provider_account_assignments")
        .insert({
          client_account_id: clientAccountId,
          pool_id:           selectedShardId,
          provider:          "ttlock",
          status:            "active",
        });
      if (error) throw error;
      message.success("Shard asignado correctamente. El cliente puede ahora activar su integración.");
      setShardModalOpen(false);
      setSelectedShardId(null);
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setAssigningShared(false);
    }
  };

  const userName = profile?.full_name || user?.email || "Superadmin";

  if (loading) {
    return (
      <V2Layout role="superadmin" userName={userName}>
        <div style={{ padding: 32 }}><Skeleton active paragraph={{ rows: 6 }} /></div>
      </V2Layout>
    );
  }

  if (!account) {
    return (
      <V2Layout role="superadmin" userName={userName}>
        <div style={{ padding: 32 }}>
          <Alert type="error" message="Cuenta no encontrada" />
          <Button onClick={() => navigate("/v2/superadmin/cuentas")} style={{ marginTop: 16 }}>
            Volver
          </Button>
        </div>
      </V2Layout>
    );
  }

  if (!salServiceId) {
    return (
      <V2Layout role="superadmin" userName={userName}>
        <div style={{ padding: 32 }}>
          <Alert
            type="warning"
            message="Servicio SmartAccessLock no configurado"
            description="El servicio smart_access_lock no existe en el catálogo SaaS. Créalo primero en /v2/superadmin/saas-servicios."
            action={
              <Button size="small" onClick={() => navigate("/v2/superadmin/saas-servicios")}>
                Ir al catálogo
              </Button>
            }
          />
        </div>
      </V2Layout>
    );
  }

  const subStatus = subscription?.status;
  const statusCfg = subStatus ? STATUS_CONFIG[subStatus] : null;
  const isActive  = subStatus === "active";

  return (
    <V2Layout role="superadmin" userName={userName}>
      <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/v2/superadmin/cuentas/${clientAccountId}`)}
            style={{ padding: 0, color: "#6B7280", marginBottom: 8 }}
          >
            {account.ownerFullName}
          </Button>
          <Title level={4} style={{ margin: 0 }}>SmartAccessLock — Activación</Title>
        </div>

        {/* Datos de la cuenta */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 20, marginBottom: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Cuenta cliente
          </Text>
          <Descriptions column={2} size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label="Nombre">{account.ownerFullName}</Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={account.status === "active" ? "success" : "default"}>{account.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Plan actual">{account.plan_code ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="ID">
              <code style={{ fontSize: 11 }}>{account.id}</code>
            </Descriptions.Item>
          </Descriptions>
        </div>

        {/* Estado SAL */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Estado SmartAccessLock
            </Text>
            {statusCfg && (
              <Badge status={statusCfg.badge} text={<Text style={{ color: statusCfg.color, fontWeight: 600 }}>{statusCfg.label}</Text>} />
            )}
          </div>

          {!subscription ? (
            <Alert
              type="info"
              message="SmartAccessLock no está activo para esta cuenta"
              description="Selecciona un plan (opcional) y activa el módulo. En Fase 1 el cliente no es notificado automáticamente — el cobro se gestiona fuera del sistema."
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Activada el">
                {subscription.activated_at
                  ? new Date(subscription.activated_at).toLocaleDateString("es-ES")
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Plan">
                {subscription.saas_service_plans?.name ?? <Text type="secondary">Sin plan</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Notas" span={2}>
                {subscription.notes ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
            </Descriptions>
          )}

          {/* Acciones */}
          {!isActive ? (
            // Formulario de activación
            <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>
                    Plan (opcional)
                  </Text>
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Sin plan específico"
                    allowClear
                    value={selectedPlanId}
                    onChange={setSelectedPlanId}
                  >
                    {plans.map((p) => (
                      <Option key={p.id} value={p.id}>
                        {p.name} — {Number(p.price_amount).toFixed(2)} {p.price_currency}/{p.billing_period}
                      </Option>
                    ))}
                  </Select>
                </div>
                <div style={{ flex: 2, minWidth: 200 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 4 }}>
                    Notas internas
                  </Text>
                  <Input
                    placeholder="Ej: activado manualmente, facturación fuera del sistema..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={activating}
                  onClick={handleActivate}
                >
                  Activar módulo
                </Button>
              </div>
            </div>
          ) : (
            // Acciones sobre suscripción activa
            <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
              <Space>
                <Popconfirm
                  title="¿Suspender SmartAccessLock para esta cuenta?"
                  description="El cliente perderá acceso al módulo hasta que se reactive."
                  onConfirm={() => handleStatusChange("suspended")}
                  okText="Suspender"
                  okType="danger"
                >
                  <Button icon={<StopOutlined />} loading={updating}>
                    Suspender
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="¿Cancelar definitivamente la suscripción?"
                  description="Esta acción no revoca credenciales automáticamente. Asegúrate de revocar los accesos activos antes."
                  onConfirm={() => handleStatusChange("cancelled")}
                  okText="Cancelar suscripción"
                  okType="danger"
                >
                  <Button danger loading={updating}>
                    Cancelar suscripción
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          )}
        </div>

        {/* Shard asignado */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <ApiOutlined style={{ marginRight: 6 }} />Shard TTLock asignado
            </Text>
            <Button
              size="small"
              type={shardAssignment ? "default" : "primary"}
              onClick={() => setShardModalOpen(true)}
            >
              {shardAssignment ? "Cambiar shard" : "Asignar shard"}
            </Button>
          </div>

          {shardAssignment ? (
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Código">
                <Text code style={{ fontSize: 12 }}>{shardAssignment.pool?.shard_code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color={shardAssignment.pool?.is_blocked ? "error" : shardAssignment.pool?.status === "active" ? "success" : "default"} style={{ fontSize: 11 }}>
                  {shardAssignment.pool?.is_blocked ? "Bloqueado" : shardAssignment.pool?.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Email TTLock" span={2}>
                <Text code style={{ fontSize: 11 }}>{shardAssignment.pool?.ttlock_email}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Capacidad locks">
                {shardAssignment.pool?.current_locks_count ?? 0} / {shardAssignment.pool?.max_locks}
              </Descriptions.Item>
              <Descriptions.Item label="Clientes en shard">
                {shardAssignment.pool?.current_clients_count ?? 0} / {shardAssignment.pool?.max_clients}
              </Descriptions.Item>
              <Descriptions.Item label="Asignado el">
                {shardAssignment.assigned_at ? new Date(shardAssignment.assigned_at).toLocaleDateString("es-ES") : "—"}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Alert
              type="warning"
              showIcon
              message="Sin shard asignado"
              description="Este cliente no tiene un shard TTLock asignado. El cliente no podrá activar su integración hasta que asignes uno."
              style={{ fontSize: 13 }}
            />
          )}
        </div>

        {/* Modal asignar shard */}
        <Modal
          open={shardModalOpen}
          onCancel={() => { setShardModalOpen(false); setSelectedShardId(null); }}
          title="Asignar shard TTLock"
          onOk={handleAssignShard}
          confirmLoading={assigningShared}
          okText="Asignar"
          okButtonProps={{ disabled: !selectedShardId }}
          destroyOnClose
        >
          {shardAssignment && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16, fontSize: 12 }}
              message={`Shard actual: ${shardAssignment.pool?.shard_code} (${shardAssignment.pool?.ttlock_email}). Cambiar el shard requiere migración manual de cerraduras.`}
            />
          )}
          <div style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>Seleccionar shard destino:</Text>
          </div>
          <Select
            style={{ width: "100%" }}
            placeholder="Seleccionar shard..."
            value={selectedShardId}
            onChange={setSelectedShardId}
          >
            {availableShards
              .filter((s) => s.status === "active" && !s.is_blocked)
              .map((s) => (
                <Select.Option key={s.id} value={s.id}>
                  <Space>
                    <Text code style={{ fontSize: 11 }}>{s.shard_code}</Text>
                    <Text style={{ fontSize: 12 }}>{s.ttlock_email}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ({s.current_clients_count ?? 0}/{s.max_clients})
                    </Text>
                  </Space>
                </Select.Option>
              ))}
          </Select>
          {availableShards.filter((s) => s.status === "active" && !s.is_blocked).length === 0 && (
            <Alert
              type="error"
              style={{ marginTop: 12, fontSize: 12 }}
              message="No hay shards activos disponibles. Crea uno en SAL Shards."
            />
          )}
        </Modal>

        {/* Nota Fase 1 */}
        <Alert
          type="warning"
          showIcon
          message="Fase 1 — Activación manual"
          description="La integración con Stripe no está activa. El cobro se gestiona fuera del sistema. Tras activar y asignar el shard, el cliente puede conectar su integración desde Configuración → Smart Access Lock."
        />
      </div>
    </V2Layout>
  );
}
