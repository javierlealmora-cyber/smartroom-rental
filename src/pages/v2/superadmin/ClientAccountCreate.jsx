// =============================================================================
// src/pages/v2/superadmin/ClientAccountCreate.jsx
// =============================================================================
// RCCP – SuperAdmin crea Cuenta Cliente
// Wrapper que usa el wizard compartido en modo "superadmin_create"
// Conectado a Edge Function provision_client_account_superadmin
// =============================================================================

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Col, Row, Space, Typography } from "antd";
import { ArrowLeftOutlined, UserAddOutlined } from "@ant-design/icons";
import V2Layout from "../../../layouts/V2Layout";
import ClientAccountWizard from "../../../components/wizards/ClientAccountWizard";
import { callProvisionSuperadmin } from "../../../services/clientAccounts.service";

const { Title, Text } = Typography;

const crumbs = [
  { label: "Dashboard",         path: "/v2/superadmin" },
  { label: "Cuentas Cliente",   path: "/v2/superadmin/cuentas" },
  { label: "Nueva Cuenta",      path: null },
];

export default function ClientAccountCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleFinalize = useCallback(async (payload) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await callProvisionSuperadmin(payload);
      console.log("[SuperAdmin] Cuenta creada:", result);
      navigate("/v2/superadmin/cuentas");
    } catch (err) {
      console.error("[SuperAdmin] provision error:", err);
      setSubmitError(err?.message || "Error al crear la cuenta. Intentalo de nuevo.");
      setSubmitting(false);
    }
  }, [navigate]);

  const handleCancel = useCallback(() => {
    if (confirm("¿Desea cancelar? Se perderán los datos no guardados.")) {
      navigate("/v2/superadmin/cuentas");
    }
  }, [navigate]);

  return (
    <V2Layout role="superadmin" userName="Administrador" customBreadcrumbs={crumbs}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 28 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <UserAddOutlined style={{ marginRight: 10, color: "#3B82F6" }} />
              Nueva Cuenta Cliente
            </Title>
            <Text type="secondary">
              Complete el asistente para crear una nueva cuenta en el sistema
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={handleCancel}>
                Cancelar
              </Button>
            </Space>
          </Col>
        </Row>

        {/* ── Wizard ─────────────────────────────────────────────────────── */}
        <ClientAccountWizard
          mode="superadmin_create"
          onFinalize={handleFinalize}
          onCancel={handleCancel}
          submitting={submitting}
          submitError={submitError}
        />

      </div>
    </V2Layout>
  );
}
