// src/pages/v2/admin/services/smart-access/tabs/SalSuscripcionTab.jsx
// Gestión de Suscripciones SAL — vista del admin cliente
//
// Muestra el estado de la suscripción SmartAccessLock de esta cuenta:
//   - No contratado → card de "solicitar información"
//   - Pendiente/Suspendida/Cancelada → badge de estado + info
//   - Activa → detalles de suscripción + estado de integración TTLock

import { useState, useEffect } from "react";
import { Alert, Badge, Button, Descriptions, Skeleton, Space, Tag, Typography } from "antd";
import {
  CheckCircleOutlined, ClockCircleOutlined, LockOutlined,
  MailOutlined, SettingOutlined, StopOutlined,
} from "@ant-design/icons";
import { supabase } from "../../../../../../services/supabaseClient";
import { useAdminLayout } from "../../../../../../hooks/useAdminLayout";

const { Title, Text, Paragraph } = Typography;

const STATUS_CONFIG = {
  pending:   { badge: "processing", label: "Pendiente de activación", color: "#D97706", icon: <ClockCircleOutlined /> },
  active:    { badge: "success",    label: "Activa",                  color: "#059669", icon: <CheckCircleOutlined /> },
  suspended: { badge: "warning",    label: "Suspendida",              color: "#D97706", icon: <StopOutlined /> },
  cancelled: { badge: "error",      label: "Cancelada",               color: "#DC2626", icon: <StopOutlined /> },
};

const INTEGRATION_STATUS = {
  connected:    { color: "success",  label: "Conectado" },
  disconnected: { color: "default",  label: "Sin conectar" },
  error:        { color: "error",    label: "Error de conexión" },
  syncing:      { color: "processing", label: "Sincronizando..." },
};

export default function SalSuscripcionTab() {
  const { clientAccountId } = useAdminLayout();
  const [subscription, setSubscription] = useState(null);
  const [integration, setIntegration]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [notAvailable, setNotAvailable] = useState(false);

  useEffect(() => {
    if (!clientAccountId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Cargar suscripción SAL
        const { data: sub, error: subErr } = await supabase
          .from("saas_service_subscriptions")
          .select(`
            id, status, activated_at, notes,
            saas_service_plans (id, name, billing_period, price_amount, price_currency)
          `)
          .eq("client_account_id", clientAccountId)
          .maybeSingle();

        if (cancelled) return;

        if (subErr) {
          // La tabla puede no existir aún en este entorno
          setNotAvailable(true);
          setLoading(false);
          return;
        }

        setSubscription(sub ?? null);

        // Si hay suscripción activa, cargar estado de integración TTLock
        if (sub?.status === "active") {
          const { data: intg } = await supabase
            .from("lock_integrations")
            .select("id, status, last_sync_at, locks_synced_count, provider")
            .eq("client_account_id", clientAccountId)
            .eq("provider", "ttlock")
            .maybeSingle();

          if (!cancelled) setIntegration(intg ?? null);
        }
      } catch {
        if (!cancelled) setNotAvailable(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [clientAccountId]);

  if (loading) {
    return <Skeleton active paragraph={{ rows: 4 }} style={{ maxWidth: 600 }} />;
  }

  if (notAvailable) {
    return (
      <Alert
        type="info"
        showIcon
        message="Módulo no disponible en este entorno"
        description="El módulo SmartAccessLock requiere que las migraciones de base de datos estén aplicadas. Contacta con el administrador de la plataforma."
        style={{ maxWidth: 600 }}
      />
    );
  }

  // ── Sin suscripción (no contratado) ───────────────────────────────────────
  if (!subscription) {
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{
          background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
          border: "1px solid #BAE6FD",
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            <LockOutlined style={{ color: "#0EA5E9" }} />
          </div>
          <Title level={4} style={{ margin: 0 }}>SmartAccessLock no contratado</Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 24 }}>
            Gestiona el acceso a tus alojamientos con cerraduras inteligentes.
            Controla quién entra, cuándo y desde dónde — todo desde esta plataforma.
          </Paragraph>
          <Space direction="vertical" style={{ width: "100%", textAlign: "left", marginBottom: 24 }}>
            {[
              "Integración con TTLock (más de 30 modelos de cerraduras)",
              "Acceso automático al asignar habitación a inquilino",
              "Revocación automática al registrar checkout",
              "Gestión de actores externos (limpieza, mantenimiento…)",
              "Historial de accesos y registros de auditoría",
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <CheckCircleOutlined style={{ color: "#0EA5E9", flexShrink: 0 }} />
                <Text>{item}</Text>
              </div>
            ))}
          </Space>
          <Button
            type="primary"
            size="large"
            icon={<MailOutlined />}
            href="mailto:soporte@smartroomrental.com?subject=Solicitud SmartAccessLock"
          >
            Solicitar información
          </Button>
          <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
            La activación es manual. Un miembro del equipo te contactará en 24-48h.
          </Paragraph>
        </div>
      </div>
    );
  }

  // ── Suscripción existente (cualquier estado) ──────────────────────────────
  const statusCfg = STATUS_CONFIG[subscription.status] ?? {
    badge: "default", label: subscription.status, color: "#6B7280", icon: null,
  };

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Estado badge */}
      <div style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <Text style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Estado suscripción
          </Text>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <Badge status={statusCfg.badge} />
            <Text style={{ fontSize: 16, fontWeight: 700, color: statusCfg.color }}>
              {statusCfg.label}
            </Text>
          </div>
        </div>
        {subscription.status === "active" && (
          <Tag color="success" icon={<CheckCircleOutlined />}>SmartAccessLock activo</Tag>
        )}
      </div>

      {/* Alertas por estado */}
      {subscription.status === "pending" && (
        <Alert
          type="info"
          showIcon
          message="Solicitud pendiente de revisión"
          description="Tu solicitud de activación está siendo procesada. Recibirás confirmación en 24-48h."
          style={{ marginBottom: 16 }}
        />
      )}
      {subscription.status === "suspended" && (
        <Alert
          type="warning"
          showIcon
          message="Suscripción suspendida"
          description="El acceso al módulo SmartAccessLock está temporalmente suspendido. Contacta con soporte para reactivarlo."
          style={{ marginBottom: 16 }}
        />
      )}
      {subscription.status === "cancelled" && (
        <Alert
          type="error"
          showIcon
          message="Suscripción cancelada"
          description="La suscripción SmartAccessLock ha sido cancelada. Contacta con soporte si deseas recontratarlo."
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Detalles */}
      <div style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 16,
      }}>
        <Text style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Detalles de suscripción
        </Text>
        <Descriptions column={1} size="small" style={{ marginTop: 12 }}>
          <Descriptions.Item label="Plan">
            {subscription.saas_service_plans?.name ?? (
              <Text type="secondary">Sin plan asignado</Text>
            )}
          </Descriptions.Item>
          {subscription.saas_service_plans?.price_amount != null && (
            <Descriptions.Item label="Precio">
              {Number(subscription.saas_service_plans.price_amount).toFixed(2)}{" "}
              {subscription.saas_service_plans.price_currency ?? "EUR"}
              /{subscription.saas_service_plans.billing_period ?? "mes"}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Activada el">
            {subscription.activated_at
              ? new Date(subscription.activated_at).toLocaleDateString("es-ES", {
                  day: "numeric", month: "long", year: "numeric",
                })
              : <Text type="secondary">—</Text>}
          </Descriptions.Item>
          {subscription.notes && (
            <Descriptions.Item label="Notas">{subscription.notes}</Descriptions.Item>
          )}
        </Descriptions>
      </div>

      {/* Estado integración TTLock (solo si activa) */}
      {subscription.status === "active" && (
        <div style={{
          background: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          padding: "20px 24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Integración TTLock
            </Text>
            {integration?.status && (
              <Tag color={INTEGRATION_STATUS[integration.status]?.color ?? "default"}>
                {INTEGRATION_STATUS[integration.status]?.label ?? integration.status}
              </Tag>
            )}
          </div>

          {!integration || integration.status === "disconnected" ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Conecta tus credenciales TTLock para empezar a gestionar cerraduras.
              </Text>
              <Button
                icon={<SettingOutlined />}
                size="small"
                onClick={() => {
                  // Navegar a la pestaña Configuración dentro de SAL
                  window.dispatchEvent(new CustomEvent("sal:navigate", { detail: "configuracion" }));
                }}
              >
                Ir a Configuración
              </Button>
            </div>
          ) : (
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Proveedor">TTLock</Descriptions.Item>
              <Descriptions.Item label="Cerraduras sync.">
                {integration.locks_synced_count ?? 0}
              </Descriptions.Item>
              {integration.last_sync_at && (
                <Descriptions.Item label="Última sync">
                  {new Date(integration.last_sync_at).toLocaleString("es-ES", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </Descriptions.Item>
              )}
            </Descriptions>
          )}
        </div>
      )}
    </div>
  );
}
