// src/components/modals/AccommodationSelectorModal.jsx
// Modal para seleccionar alojamiento antes de crear una factura

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, List, Input, Empty, Spin, Typography, Tag } from "antd";
import { SearchOutlined, HomeOutlined } from "@ant-design/icons";
import { listAccommodations } from "../../services/accommodations.service";

const { Text } = Typography;
const { Search } = Input;

export default function AccommodationSelectorModal({ open, onCancel }) {
  const navigate = useNavigate();
  const [accommodations, setAccommodations] = useState([]);
  const [filteredAccommodations, setFilteredAccommodations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      loadAccommodations();
    }
  }, [open]);

  useEffect(() => {
    if (search) {
      const filtered = accommodations.filter((acc) =>
        acc.name.toLowerCase().includes(search.toLowerCase()) ||
        acc.street?.toLowerCase().includes(search.toLowerCase()) ||
        acc.city?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredAccommodations(filtered);
    } else {
      setFilteredAccommodations(accommodations);
    }
  }, [search, accommodations]);

  const loadAccommodations = async () => {
    setLoading(true);
    try {
      const accs = await listAccommodations({ status: "active" });
      setAccommodations(accs);
      setFilteredAccommodations(accs);
    } catch (error) {
      setAccommodations([]);
      setFilteredAccommodations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccommodation = (accId) => {
    // Navegar al alojamiento con el tab de Facturas y subtab de Carga abiertos
    navigate(`/v2/admin/alojamientos/${accId}/habitaciones?tab=facturas&subtab=carga`);
    onCancel();
    setSearch("");
  };

  const handleCancel = () => {
    onCancel();
    setSearch("");
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <HomeOutlined style={{ fontSize: 18, color: "#0071E3" }} />
          <span>Selecciona un Alojamiento</span>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13 }}>
        Selecciona el alojamiento para el cual deseas registrar una nueva factura de energía
      </Text>

      <Search
        placeholder="Buscar por nombre, calle o ciudad..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        allowClear
        prefix={<SearchOutlined />}
        style={{ marginBottom: 16 }}
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin size="large" />
        </div>
      ) : filteredAccommodations.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            search
              ? "No se encontraron alojamientos con ese criterio"
              : "No hay alojamientos activos"
          }
          style={{ padding: "40px 0" }}
        />
      ) : (
        <List
          dataSource={filteredAccommodations}
          style={{ maxHeight: 400, overflowY: "auto" }}
          renderItem={(acc) => {
            const stats = getStats(acc);
            return (
              <List.Item
                key={acc.id}
                onClick={() => handleSelectAccommodation(acc.id)}
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
                  borderRadius: 8,
                  marginBottom: 8,
                  transition: "all 0.2s",
                  border: "1px solid #F0F0F0",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F9FAFB";
                  e.currentTarget.style.borderColor = "#0071E3";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderColor = "#F0F0F0";
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: "linear-gradient(135deg, #0071E3 0%, #0056B3 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      🏠
                    </div>
                  }
                  title={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Text strong style={{ fontSize: 14 }}>
                        {acc.name}
                      </Text>
                      <Tag color={stats.rate >= 80 ? "success" : stats.rate >= 50 ? "warning" : "default"}>
                        {stats.rate}% ocupación
                      </Tag>
                    </div>
                  }
                  description={
                    <div style={{ fontSize: 12 }}>
                      <Text type="secondary">
                        {acc.street} {acc.street_number}, {acc.city}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {stats.total} habitaciones · {stats.occupied} ocupadas · {stats.free} libres
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </Modal>
  );
}

// Helper para calcular stats de habitaciones
function getStats(acc) {
  const rooms = acc.rooms || [];
  const total = rooms.length;
  const occupied = rooms.filter((r) => r.derivedStatus === "occupied").length;
  const free = rooms.filter((r) => r.derivedStatus === "free").length;
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  return { total, occupied, free, rate };
}
