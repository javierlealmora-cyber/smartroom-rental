import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Row, Space, Table, Typography } from "antd";
import { BankOutlined, PlusOutlined } from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useTenant } from "../../../../providers/TenantProvider";
import { useAuth } from "../../../../providers/AuthProvider";
import { listEntities, setEntityStatus } from "../../../../services/entities.service";
import { supabase } from "../../../../services/supabaseClient";

function formatEntityName(e) {
  if (!e) return "";
  if (e.legal_type === "persona_juridica") return e.legal_name || "(sin nombre)";
  const parts = [e.first_name, e.last_name1, e.last_name2].filter(Boolean);
  return parts.join(" ") || e.legal_name || "(sin nombre)";
}

export default function EntitiesList() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const { planCode } = useTenant();

  const canWrite = role !== "viewer";

  const [payer, setPayer] = useState(null);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxOwners, setMaxOwners] = useState(null);

  const ownersCountForLimit = owners.length;

  const limitReached = useMemo(() => {
    if (maxOwners == null) return false;
    if (maxOwners === -1) return false;
    return ownersCountForLimit >= maxOwners;
  }, [ownersCountForLimit, maxOwners]);

  const ownerLimitLabel = useMemo(() => {
    if (!planCode) return "";
    if (maxOwners === -1) return `Ilimitadas (plan ${planCode})`;
    if (maxOwners == null) return `Plan ${planCode}`;
    return `${ownersCountForLimit} / ${maxOwners} usadas (incluye deshabilitadas)`;
  }, [planCode, maxOwners, ownersCountForLimit]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [payerEntities, ownerEntities] = await Promise.all([
          listEntities({ type: "payer" }),
          listEntities({ type: "owner" }),
        ]);

        setPayer(payerEntities[0] || null);
        setOwners(ownerEntities || []);

        if (planCode) {
          const { data, error: planErr } = await supabase
            .from("plans_catalog")
            .select("max_owners")
            .eq("code", planCode)
            .maybeSingle();

          if (!planErr) setMaxOwners(data?.max_owners ?? null);
        }
      } catch (e) {
        setError(e?.message || "Error cargando entidades");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [planCode]);

  const onToggleStatus = async (entity) => {
    if (!canWrite) return;
    const next = entity.status === "active" ? "disabled" : "active";
    const msg = next === "disabled" ? "¿Deshabilitar esta entidad?" : "¿Reactivar esta entidad?";
    if (!confirm(msg)) return;

    setError(null);
    try {
      const updated = await setEntityStatus(entity.id, next);
      setOwners((prev) => prev.map((x) => (x.id === entity.id ? updated : x)));
    } catch (e) {
      setError(e?.message || "Error actualizando entidad");
    }
  };

  const payerItems = payer
    ? [
        { label: "Nombre", value: formatEntityName(payer) },
        { label: "Tipo", value: payer.legal_type },
        { label: "NIF/CIF", value: payer.tax_id || "-" },
        { label: "Email", value: payer.billing_email || "-" },
      ]
    : [];

  const columns = [
    {
      title: "Nombre",
      key: "name",
      render: (_, record) => formatEntityName(record),
    },
    {
      title: "Tipo",
      dataIndex: "legal_type",
      key: "legal_type",
    },
    {
      title: "NIF/CIF",
      dataIndex: "tax_id",
      key: "tax_id",
      render: (v) => v || "-",
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (s) => (s || "").toUpperCase(),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, record) => {
        if (!canWrite) return <Typography.Text type="secondary">Solo lectura</Typography.Text>;
        return (
          <Space>
            <Button onClick={() => navigate(`/v2/admin/entidades/${record.id}/editar`)}>Editar</Button>
            <Button
              danger={record.status === "active"}
              type={record.status === "active" ? "default" : "primary"}
              onClick={() => onToggleStatus(record)}
            >
              {record.status === "active" ? "Deshabilitar" : "Reactivar"}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col flex="auto">
          <Typography.Title level={2} style={{ margin: 0 }}>
            Entidades
          </Typography.Title>
          <Typography.Text type="secondary">
            Pagadora y propietarias de la Cuenta Cliente
          </Typography.Text>
        </Col>
        <Col>
          <Button
            type="primary"
            disabled={!canWrite || limitReached}
            onClick={() => navigate("/v2/admin/entidades/nueva")}
          >
            + Nueva propietaria
          </Button>
        </Col>
      </Row>

      <div style={{ height: 16 }} />

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Entidad pagadora" loading={loading}>
            {!loading && !payer && (
              <EmptyState
                icon="🏦"
                title="Sin entidad pagadora"
                description="Configura la entidad pagadora de tu cuenta"
                actionLabel="Nueva Entidad"
                onAction={() => navigate("/v2/admin/entidades/nueva")}
              />
            )}
            {!loading && payer && (
              <Row gutter={[12, 12]}>
                {payerItems.map((it) => (
                  <Col key={it.label} xs={24} sm={12}>
                    <Card size="small">
                      <Typography.Text type="secondary">{it.label}</Typography.Text>
                      <div>
                        <Typography.Text strong>{it.value}</Typography.Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Entidades propietarias"
            extra={
              ownerLimitLabel ? (
                <Typography.Text type="secondary">{ownerLimitLabel}</Typography.Text>
              ) : null
            }
            loading={loading}
          >
            {!loading && owners.length === 0 ? (
              <EmptyState
                icon="🏠"
                title="Sin propietarios"
                description="Crea la primera entidad propietaria para asignar alojamientos"
                actionLabel="Nueva Entidad"
                onAction={() => navigate("/v2/admin/entidades/nueva")}
              />
            ) : (
              <Table
                rowKey="id"
                size="middle"
                scroll={{ x: true }}
                columns={columns}
                dataSource={owners}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <div style={{ height: 8 }} />
      <Typography.Text type="secondary">Tenant: {clientAccountId || "-"}</Typography.Text>
    </V2Layout>
  );
}
