// src/pages/v2/superadmin/ClientAccountsList.jsx
// Lista de cuentas cliente — datos reales de Supabase

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge, Button, Input, Select, Space, Table, Tag, Typography, message,
} from "antd";
import {
  PlusOutlined, ReloadOutlined, EyeOutlined, KeyOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../layouts/V2Layout";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../services/supabaseClient";

const { Title } = Typography;
const { Search } = Input;

const STATUS_CONFIG = {
  active:    { badge: "success", label: "Activo" },
  suspended: { badge: "warning", label: "Suspendido" },
  cancelled: { badge: "error",   label: "Cancelado" },
  pending:   { badge: "default", label: "Pendiente" },
};

export default function ClientAccountsList() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [accounts, setAccounts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("client_accounts")
        .select(`
          id, name, last_name1, last_name2, status, plan_code, created_at, slug,
          entities(legal_type, legal_name, first_name, last_name1, last_name2, type)
        `)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      const withDisplayName = (data ?? []).map((acc) => {
        // Nombre completo del titular de la cuenta (name + apellidos propios)
        const ownerFullName = [acc.name, acc.last_name1, acc.last_name2]
          .filter(Boolean).join(" ") || acc.name;

        // Entidad pagadora (para mostrar debajo solo si es distinta)
        const payer = (acc.entities ?? []).find((e) => e.type === "payer");
        let payerName = null;
        if (payer) {
          const isPhysical = ["persona_fisica", "autonomo"].includes(payer.legal_type);
          if (isPhysical) {
            const full = [payer.first_name, payer.last_name1, payer.last_name2].filter(Boolean).join(" ");
            if (full && full !== ownerFullName) payerName = full;
          } else if (payer.legal_name && payer.legal_name !== ownerFullName) {
            payerName = payer.legal_name;
          }
        }
        return { ...acc, ownerFullName, payerName };
      });

      setAccounts(withDisplayName);
    } catch (e) {
      message.error("Error cargando cuentas: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      a.ownerFullName?.toLowerCase().includes(q) ||
      a.slug?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      title: (
        <span>
          Cuenta Cliente
          <span style={{ color: "#D1D5DB", margin: "0 6px" }}>|</span>
          <span style={{ color: "#9CA3AF", fontWeight: 400 }}>Entidad de Facturación</span>
        </span>
      ),
      key: "name",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: "#111827" }}>{row.ownerFullName}</div>
          {row.payerName && (
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
              Entidad: {row.payerName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Plan",
      dataIndex: "plan_code",
      key: "plan_code",
      render: (v) => v ? <Tag>{v}</Tag> : <Tag color="default">—</Tag>,
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (v) => {
        const cfg = STATUS_CONFIG[v] ?? { badge: "default", label: v };
        return <Badge status={cfg.badge} text={cfg.label} />;
      },
    },
    {
      title: "Alta",
      dataIndex: "created_at",
      key: "created_at",
      render: (v) => v ? new Date(v).toLocaleDateString("es-ES") : "—",
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, row) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/v2/superadmin/cuentas/${row.id}`)}
          >
            Ver
          </Button>
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => navigate(`/v2/superadmin/cuentas/${row.id}/smart-access`)}
          >
            SAL
          </Button>
        </Space>
      ),
    },
  ];

  const userName = profile?.full_name || user?.email || "Superadmin";

  return (
    <V2Layout role="superadmin" userName={userName}>
      <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>Cuentas Cliente</Title>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              {filtered.length} cuenta{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/v2/superadmin/cuentas/nueva")}
            >
              Nueva cuenta
            </Button>
          </Space>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <Search
            placeholder="Buscar por nombre o slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 340 }}
            allowClear
          />
          <Select
            placeholder="Estado"
            value={filterStatus || undefined}
            onChange={setFilterStatus}
            allowClear
            style={{ width: 160 }}
            options={[
              { value: "active",    label: "Activo" },
              { value: "suspended", label: "Suspendido" },
              { value: "cancelled", label: "Cancelado" },
              { value: "pending",   label: "Pendiente" },
            ]}
          />
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={{ pageSize: 20, showSizeChanger: false }}
            onRow={() => ({ style: { cursor: "pointer" } })}
          />
        </div>
      </div>
    </V2Layout>
  );
}
