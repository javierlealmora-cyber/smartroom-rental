// src/pages/v2/admin/services/smart-access/tabs/SmartAccessTab.jsx
// Configuración de la integración SAL — arquitectura Shard Pool v4.
//
// Secciones:
//   1. Estado de suscripción  → guard: si !salActive muestra alert
//   2. Estado de la integración → shard asignado, estado de conexión
//   3. Acción de conexión        → "Conectar" solo; sin formulario de credenciales
//   4. Sincronización manual   → solo si ya conectado

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Button, Descriptions, Radio,
  Skeleton, Space, Tag, Tooltip, Typography, message,
} from "antd";
import {
  CheckCircleOutlined, ClockCircleOutlined, DisconnectOutlined,
  InfoCircleOutlined, ReloadOutlined, SyncOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useAdminLayout } from "../../../../../../hooks/useAdminLayout";
import { useSalSubscription } from "../../../../../../hooks/useSalSubscription";
import { getLockIntegration } from "../../../../../../services/sal.service";
import { invokeWithAuth } from "../../../../../../services/supabaseInvoke.services";

const { Text, Paragraph } = Typography;

// ── Badge de estado de integración ───────────────────────────────────────────
const STATUS_TAG = {
  connected:     <Tag color="success"    icon={<CheckCircleOutlined />}>Conectado</Tag>,
  disconnected:  <Tag color="default"    icon={<DisconnectOutlined />}>Sin conectar</Tag>,
  pending_shard: <Tag color="processing" icon={<ClockCircleOutlined />}>Pendiente de configuración</Tag>,
  error:         <Tag color="error"      icon={<WarningOutlined />}>Error de conexión</Tag>,
  syncing:       <Tag color="processing" icon={<SyncOutlined spin />}>Sincronizando…</Tag>,
};

function relativeTime(isoDate) {
  if (!isoDate) return "Nunca";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Hace menos de 1 min";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SmartAccessTab() {
  const { clientAccountId } = useAdminLayout();
  const { salActive, salLoading } = useSalSubscription();

  const [integration, setIntegration] = useState(null);
  const [loadingIntg, setLoadingIntg] = useState(true);
  const [connecting, setConnecting]   = useState(false);
  const [syncingLocks, setSyncingLocks] = useState(false);
  const [syncingRecs, setSyncingRecs]   = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("ttlock");
  // Respuesta de sal-connect-integration (estado transitorio hasta recargar)
  const [connectResult, setConnectResult] = useState(null);

  // ── Cargar integración existente ────────────────────────────────────────────
  const loadIntegration = useCallback(async () => {
    if (!clientAccountId) return;
    setLoadingIntg(true);
    try {
      const intg = await getLockIntegration(clientAccountId);
      setIntegration(intg);
    } catch {
      // non-fatal
    } finally {
      setLoadingIntg(false);
    }
  }, [clientAccountId]);

  useEffect(() => {
    loadIntegration();
  }, [loadIntegration]);

  // ── Conectar / activar integración ─────────────────────────────────────────
  // sal-connect-integration lee el shard asignado por el superadmin en
  // lock_provider_pool_assignments. No crea cuentas TTLock — solo vincula
  // lock_integrations al shard.
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await invokeWithAuth("sal-connect-integration", {
        body: { client_account_id: clientAccountId },
      });

      if (result?.ok === false) {
        message.error(result.error?.message ?? "Error al conectar la integración");
        return;
      }

      const data = result?.data ?? {};
      setConnectResult(data);

      if (data.status === "pending_shard") {
        message.info("La integración está pendiente de asignación de shard. Contacta con soporte.");
      } else {
        message.success("Integración conectada correctamente");
        await loadIntegration();
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setConnecting(false);
    }
  };

  // ── Sincronizar cerraduras ──────────────────────────────────────────────────
  const handleSyncLocks = async () => {
    setSyncingLocks(true);
    try {
      const result = await invokeWithAuth("sal-sync-locks", {
        body: { client_account_id: clientAccountId, mode: "full" },
      });
      if (result?.ok === false) {
        message.error(result.error?.message ?? "Error al sincronizar cerraduras");
      } else {
        message.success(`Cerraduras sincronizadas: ${result?.data?.synced ?? 0}`);
        await loadIntegration();
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setSyncingLocks(false);
    }
  };

  // ── Sincronizar registros de acceso ─────────────────────────────────────────
  const handleSyncRecords = async () => {
    setSyncingRecs(true);
    try {
      const result = await invokeWithAuth("sal-sync-lock-records", {
        body: { client_account_id: clientAccountId },
      });
      if (result?.ok === false) {
        message.error(result.error?.message ?? "Error al sincronizar registros");
      } else {
        message.success(`Registros sincronizados: ${result?.data?.records_synced ?? 0}`);
        await loadIntegration();
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setSyncingRecs(false);
    }
  };

  // ── Guards de carga ─────────────────────────────────────────────────────────
  if (salLoading || loadingIntg) {
    return <Skeleton active paragraph={{ rows: 5 }} style={{ maxWidth: 640 }} />;
  }

  if (!salActive) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Módulo no disponible"
        description="SmartAccessLock no está activo para esta cuenta. Contacta con el administrador de la plataforma para activarlo."
        style={{ maxWidth: 560 }}
      />
    );
  }

  const alreadyConnected = integration?.status === "connected";

  // Estado "pending_shard" puede venir de la respuesta de connect o de la BD
  // eslint-disable-next-line no-unused-vars
  const isPendingShard =
    connectResult?.status === "pending_shard" ||
    (!alreadyConnected && !integration);

  return (
    <div style={{ maxWidth: 680 }}>

      {/* ── Sección 1: Estado de la integración ───────────────────────────── */}
      <div style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: "18px 24px",
        marginBottom: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Estado de integración TTLock
          </Text>
          <div style={{ marginTop: 6 }}>
            {STATUS_TAG[integration?.status ?? (connectResult?.status === "pending_shard" ? "pending_shard" : "disconnected")]}
          </div>
          {alreadyConnected && connectResult?.shard_code && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
              Shard: <Text code>{connectResult.shard_code}</Text>
            </Text>
          )}
        </div>
        {alreadyConnected && (
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {integration.locks_synced_count ?? 0} cerraduras
            </Text>
            <Tag color={
              integration.last_sync_status === "success"  ? "green"  :
              integration.last_sync_status === "error"    ? "red"    :
              integration.last_sync_status === "partial"  ? "orange" : "default"
            }>
              {relativeTime(integration.last_sync_at)}
            </Tag>
          </Space>
        )}
      </div>

      {/* ── Sección 2: Conexión ───────────────────────────────────────────── */}
      <div style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 20,
      }}>
        <Text style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 12 }}>
          Conexión al proveedor
        </Text>

        {alreadyConnected ? (
          <>
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message="Integración SmartAccessLock activa"
              description={
                <>
                  SmartRoom gestiona automáticamente los PINs, el unlock remoto y la sincronización
                  a través del servidor compartido asignado a tu cuenta.
                  <br />
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
                    Para onboarding de cerraduras nuevas, usa la app SmartRoom.
                    Para importar cerraduras TTLock existentes, consulta la sección de estructura de accesos.
                  </Text>
                </>
              }
              style={{ marginBottom: 16, fontSize: 13 }}
            />

            {connectResult?.vault_configured === false && (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                message="Configuración pendiente"
                description="El servidor de integración no tiene credenciales TTLock configuradas aún. Las operaciones remota no estarán disponibles hasta que el equipo técnico complete la configuración."
                style={{ marginBottom: 16 }}
              />
            )}
          </>
        ) : connectResult?.status === "pending_shard" ? (
          <Alert
            type="info"
            showIcon
            icon={<ClockCircleOutlined />}
            message="Pendiente de asignación"
            description="Tu cuenta está a la espera de que el equipo técnico asigne un servidor de integración. Recibirás una notificación cuando esté listo. Si tienes prisa, contacta con soporte."
            style={{ marginBottom: 16 }}
          />
        ) : (
          <>
            {/* Selector de proveedor */}
            <div style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, display: "block", marginBottom: 8, color: "#6B7280" }}>
                ¿Qué sistema de cerraduras inteligentes usas?
              </Text>
              <Radio.Group
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                style={{ width: "100%" }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Radio.Button value="ttlock" style={{ borderRadius: 8, height: "auto", padding: "8px 16px", lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>TTLock</div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>Sciener / TTLock</div>
                  </Radio.Button>
                  <Radio.Button value="nuki" disabled style={{ borderRadius: 8, height: "auto", padding: "8px 16px", lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Nuki <Tag style={{ fontSize: 10, marginLeft: 4 }}>Próximamente</Tag></div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>Nuki Smart Lock</div>
                  </Radio.Button>
                  <Radio.Button value="other" disabled style={{ borderRadius: 8, height: "auto", padding: "8px 16px", lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Otro <Tag style={{ fontSize: 10, marginLeft: 4 }}>Próximamente</Tag></div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>August, Yale, …</div>
                  </Radio.Button>
                </div>
              </Radio.Group>
            </div>

            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              message="Activa tu SmartAccessLock"
              description="SmartRoom gestionará tus cerraduras a través de un servidor de integración TTLock asignado específicamente a tu cuenta. No necesitas credenciales TTLock — todo está preconfigurado."
              style={{ marginBottom: 20, fontSize: 13 }}
            />

            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              loading={connecting}
              onClick={handleConnect}
              block
            >
              Activar integración SmartAccessLock
            </Button>
          </>
        )}
      </div>

      {/* ── Sección 3: Sincronización (solo si conectado) ─────────────────── */}
      {alreadyConnected && (
        <div style={{
          background: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          padding: "20px 24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Sincronización manual
            </Text>
            <Tooltip title="Refrescar estado">
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={loadIntegration}
                type="text"
              />
            </Tooltip>
          </div>

          <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Cerraduras sincronizadas">
              <Text strong>{integration.locks_synced_count ?? 0}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Última sincronización">
              {relativeTime(integration.last_sync_at)}
            </Descriptions.Item>
            {integration.last_sync_error && (
              <Descriptions.Item label="Último error" span={2}>
                <Text type="danger" style={{ fontSize: 12 }}>{integration.last_sync_error}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>

          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
            La sincronización automática se ejecuta cada 4 horas. Usa los botones para forzar una sincronización manual.
          </Paragraph>

          <Space wrap>
            <Button
              icon={<SyncOutlined spin={syncingLocks} />}
              loading={syncingLocks}
              onClick={handleSyncLocks}
            >
              Sincronizar cerraduras
            </Button>
            <Button
              icon={<SyncOutlined spin={syncingRecs} />}
              loading={syncingRecs}
              onClick={handleSyncRecords}
            >
              Sincronizar registros de acceso
            </Button>
          </Space>
        </div>
      )}

      {/* Nota gateway */}
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 20 }}
        message="Requisito físico: gateway TTLock"
        description="Para gestionar PINs de forma remota, hacer unlock remoto y recibir registros en tiempo real, cada alojamiento necesita al menos un gateway TTLock físico instalado y conectado a internet."
      />
    </div>
  );
}
