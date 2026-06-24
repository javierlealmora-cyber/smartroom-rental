// src/pages/v2/admin/entities/EntityDetail.jsx
// Detalle de entidad: muestra sus alojamientos como cards clicables

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Button, Card, Checkbox, Col, Input, Row, Skeleton, Tag, Tooltip, Typography,
} from "antd";
import {
  ArrowLeftOutlined, BankOutlined, EditOutlined, HomeOutlined,
  PlusOutlined, ReloadOutlined, ToolOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { supabase } from "../../../../services/supabaseClient";
import AccommodationCard from "../../../../components/AccommodationCard";

const { Title, Text } = Typography;


const LEGAL_TYPE_LABEL = {
  autonomo: "Autónomo",
  persona_fisica: "Persona física",
  persona_juridica: "Persona jurídica",
};

function formatEntityName(e) {
  if (!e) return "";
  if (e.legal_type === "persona_juridica") return e.legal_name || "(sin nombre)";
  const parts = [e.first_name, e.last_name1, e.last_name2].filter(Boolean);
  return parts.join(" ") || e.legal_name || "(sin nombre)";
}


export default function EntityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const [entity, setEntity] = useState(null);
  const [accommodations, setAccommodations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: ent, error: entErr }, { data: accs, error: accsErr }] = await Promise.all([
        supabase.from("entities").select("*").eq("id", id).eq("client_account_id", clientAccountId).single(),
        supabase
          .from("accommodations")
          .select("*, rooms(id, is_maintenance, current_assignments:lodger_room_assignments(room_id, move_out_date))")
          .eq("owner_entity_id", id)
          .eq("client_account_id", clientAccountId)
          .order("name"),
      ]);
      if (entErr) throw new Error(entErr.message);
      if (accsErr) throw new Error(accsErr.message);
      setEntity(ent);
      const today = new Date().toISOString().split("T")[0];
      const accsWithStatus = (accs || []).map(acc => ({
        ...acc,
        rooms: (acc.rooms || []).map(room => {
          const asgn = (room.current_assignments || []).find(
            a => !a.move_out_date || a.move_out_date > today
          );
          let derivedStatus;
          if (room.is_maintenance)     derivedStatus = "maintenance";
          else if (!asgn)              derivedStatus = "free";
          else if (!asgn.move_out_date) derivedStatus = "occupied";
          else                         derivedStatus = "pending_checkout";
          return { ...room, derivedStatus };
        }),
      }));
      setAccommodations(accsWithStatus);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, clientAccountId]);

  useEffect(() => { load(); }, [load]);

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/v2/admin/entidades")}
            style={{ marginBottom: 8, paddingLeft: 0, color: "#6B7280" }}
          >
            Entidades
          </Button>
          {loading ? (
            <Skeleton active title={{ width: 200 }} paragraph={false} />
          ) : (
            <>
              <Title level={2} style={{ margin: 0 }}>{formatEntityName(entity)}</Title>
              <Text type="secondary">
                {LEGAL_TYPE_LABEL[entity?.legal_type] || entity?.legal_type}
                {entity?.tax_id ? ` · ${entity.tax_id}` : ""}
                {" · "}
                <Tag color={entity?.status === "active" ? "success" : "error"} style={{ marginLeft: 4 }}>
                  {entity?.status === "active" ? "Activo" : entity?.status}
                </Tag>
              </Text>
            </>
          )}
        </Col>
        <Col>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/v2/admin/entidades/${id}/editar`)}
          >
            Editar entidad
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/v2/admin/alojamientos/nuevo")}
          >
            Nuevo alojamiento
          </Button>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {/* Filtros de alojamientos */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Input.Search
            placeholder="Buscar por nombre, dirección o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={(v) => setSearchTerm(v)}
            allowClear
          />
        </Col>
        <Col>
          <Checkbox checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}>
            Mostrar desactivados
          </Checkbox>
        </Col>
        <Col>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { setSearchTerm(""); setShowInactive(false); }}
          >
            Limpiar
          </Button>
        </Col>
      </Row>

      {loading ? (
        <Row gutter={[20, 20]}>
          {[1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} xl={8}>
              <Card><Skeleton active paragraph={{ rows: 4 }} /></Card>
            </Col>
          ))}
        </Row>
      ) : (() => {
        let filtered = showInactive ? accommodations : accommodations.filter((a) => a.status === "active");
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          filtered = filtered.filter((a) =>
            a.name?.toLowerCase().includes(s) ||
            (a.address_street || a.address_line1)?.toLowerCase().includes(s) ||
            (a.address_city || a.city)?.toLowerCase().includes(s)
          );
        }
        if (filtered.length === 0) return (
          <Card style={{ textAlign: "center", padding: "40px 0", borderStyle: "dashed" }}>
            <HomeOutlined style={{ fontSize: 40, color: "#D1D5DB", marginBottom: 12 }} />
            <div>
              <Text type="secondary">
                {searchTerm ? "No se encontraron alojamientos con ese criterio" : "Esta entidad no tiene alojamientos asignados"}
              </Text>
            </div>
            {!searchTerm && (
              <Button type="link" icon={<PlusOutlined />}
                onClick={() => navigate("/v2/admin/alojamientos/nuevo")} style={{ marginTop: 8 }}>
                Crear alojamiento
              </Button>
            )}
          </Card>
        );
        return (
        <Row gutter={[20, 20]}>
          {filtered.map((acc) => (
            <Col key={acc.id} xs={24} sm={12} lg={8} xl={6}>
              <AccommodationCard
                accommodation={acc}
                onCardClick={() => navigate(`/v2/admin/alojamientos/${acc.id}/habitaciones`)}
                onEdit={() => navigate(`/v2/admin/alojamientos/${acc.id}/habitaciones?tab=datos`)}
                onServices={() => navigate(`/v2/admin/alojamientos/${acc.id}/servicios`)}
                onRooms={() => navigate(`/v2/admin/alojamientos/${acc.id}/habitaciones`)}
              />
            </Col>
          ))}
        </Row>
        );
      })()}
    </V2Layout>
  );
}
