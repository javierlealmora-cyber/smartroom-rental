// src/pages/v2/admin/tenants/components/RoomAssignmentForm.jsx
// Componente reutilizable para asignación de habitación

import { useState, useEffect, useCallback } from "react";
import { Checkbox, Col, DatePicker, Form, InputNumber, Row, Select, Switch, Tag, Typography } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { listRooms } from "../../../../../services/accommodations.service";
import LodgerFormFields from "./LodgerFormFields"; // REQ-015: sub-form de acompañante

const { Text } = Typography;

const ROOM_STATUS_TAG = { 
  free: "success", 
  occupied: "error", 
  pending_checkout: "warning", 
  maintenance: "default" 
};

const ROOM_STATUS_LABEL = { 
  free: "Libre", 
  occupied: "Ocupada", 
  pending_checkout: "Pendiente baja", 
  maintenance: "Mantenimiento" 
};

export default function RoomAssignmentForm({
  form,
  accommodations = [],
  preselectedAccId = null,
  preselectedRoomId = null,
  required = false,
  allowAccommodationChange = true,
  onAccommodationChange = null,
  onRoomSelect = null,
  onRoomsChange = null,
  onPayUntilEndOfMonthChange = null,
}) {
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(preselectedRoomId);
  const [payUntilEndOfMonth, setPayUntilEndOfMonth] = useState(false);
  // REQ-015: habitación compartida con acompañante
  const [sharedRoom, setSharedRoom] = useState(false);

  // Cargar habitaciones cuando hay un alojamiento preseleccionado
  useEffect(() => {
    if (preselectedAccId) {
      loadRoomsForAccommodation(preselectedAccId);
      if (preselectedRoomId) {
        setSelectedRoomId(preselectedRoomId);
      }
    }
  }, [preselectedAccId, preselectedRoomId]);

  const loadRoomsForAccommodation = useCallback(async (accId) => {
    if (!accId) {
      setAvailableRooms([]);
      if (onRoomsChange) onRoomsChange([]);
      return;
    }
    setLoadingRooms(true);
    try {
      const rooms = await listRooms(accId);
      setAvailableRooms(rooms || []);
      if (onRoomsChange) onRoomsChange(rooms || []);
    } catch (error) {
      console.error("Error loading rooms:", error);
      setAvailableRooms([]);
      if (onRoomsChange) onRoomsChange([]);
    } finally {
      setLoadingRooms(false);
    }
  }, [onRoomsChange]);

  const handleAccommodationChange = (accId) => {
    setSelectedRoomId(null);
    form.setFieldValue("room_id", undefined);
    
    if (!accId) {
      setAvailableRooms([]);
      form.setFieldsValue({
        move_in_date: undefined,
        deposit_amount: undefined,
        commission_amount: undefined,
        first_month_amount: undefined,
        services_provision_amount: undefined,
      });
      setPayUntilEndOfMonth(false);
      return;
    }
    
    loadRoomsForAccommodation(accId);
    
    // Llamar callback externo si existe
    if (onAccommodationChange) {
      onAccommodationChange(accId);
    }
  };

  const handleRoomSelect = (room) => {
    if ((room.derivedStatus ?? room.status) !== "free") return;
    
    setSelectedRoomId(room.id);
    form.setFieldValue("room_id", room.id);
    
    // Notificar al padre
    if (onRoomSelect) onRoomSelect(room.id);
    
    // Auto-rellenar fianza (2 meses de renta)
    if (room.monthly_rent > 0) {
      form.setFieldValue("deposit_amount", room.monthly_rent * 2);
    }

    // REQ-015: si la habitación está marcada como compartida, sugerir activar el toggle
    if (room.is_shared && !sharedRoom) {
      setSharedRoom(true);
    }
  };

  const sectionHeader = (label) => (
    <div style={{ paddingBottom: 8, marginBottom: 16, borderBottom: "2px solid #F3F4F6" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );

  return (
    <>
      {/* ── Sección: Habitación ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 10, padding: "20px 20px 4px", marginBottom: 20 }}>
        {sectionHeader("Asignación de Habitación")}

        <Form.Item
          label="Alojamiento"
          name="accommodation_id"
          rules={required ? [{ required: true, message: "Selecciona un alojamiento" }] : []}
        >
          <Select
            placeholder="Seleccionar alojamiento..."
            onChange={handleAccommodationChange}
            options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
            allowClear={allowAccommodationChange}
            disabled={!allowAccommodationChange}
          />
        </Form.Item>

        <Form.Item
          label="Habitación"
          name="room_id"
          rules={[
            {
              required: required || !!form.getFieldValue("accommodation_id"),
              message: "Debes seleccionar una habitación"
            }
          ]}
        >
          {loadingRooms ? (
            <Text type="secondary">Cargando habitaciones...</Text>
          ) : availableRooms.length === 0 ? (
            <Text type="secondary">
              {form.getFieldValue("accommodation_id")
                ? "No hay habitaciones disponibles en este alojamiento"
                : "Selecciona primero un alojamiento"}
            </Text>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
              {availableRooms.map((room) => {
                const isFree = (room.derivedStatus ?? room.status) === "free";
                const isSelected = selectedRoomId === room.id;
                return (
                  <div
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    style={{
                      padding: "12px 8px",
                      border: `2px solid ${isSelected ? "#111827" : isFree ? "#d9f7be" : "#ffd8bf"}`,
                      borderRadius: 8,
                      backgroundColor: isSelected ? "#f0f0f0" : "#fff",
                      cursor: isFree ? "pointer" : "not-allowed",
                      opacity: isFree ? 1 : 0.5,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Hab. {room.number}</div>
                    <Tag color={ROOM_STATUS_TAG[room.derivedStatus ?? room.status] || "default"} style={{ fontSize: 10 }}>
                      {ROOM_STATUS_LABEL[room.derivedStatus ?? room.status] || room.status}
                    </Tag>
                    {room.monthly_rent > 0 && (
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>{room.monthly_rent}€/mes</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Form.Item>

        {/* REQ-015: Toggle de habitación compartida (justo debajo del campo Habitación) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            border: "1px dashed #D1D5DB",
            borderRadius: 8,
            backgroundColor: sharedRoom ? "#F0F9FF" : "#FAFAFA",
            marginBottom: 20,
          }}
        >
          <TeamOutlined style={{ fontSize: 18, color: sharedRoom ? "#2563EB" : "#9CA3AF" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
              Habitación compartida — añadir acompañante
            </div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>
              Un único contrato a nombre del titular; el acompañante queda registrado en contrato.
            </div>
          </div>
          <Switch
            checked={sharedRoom}
            onChange={(checked) => {
              setSharedRoom(checked);
              if (!checked) {
                // Limpiar subform al desactivar para no enviar basura
                form.setFieldsValue({ accompanist: undefined });
              }
            }}
          />
        </div>

        {sharedRoom && (
          <div
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: 10,
              padding: "16px 16px 4px",
              marginBottom: 20,
              backgroundColor: "#FAFBFC",
            }}
          >
            {sectionHeader("Datos del acompañante")}
            <LodgerFormFields
              isAccompanist
              namePrefix={["accompanist"]}
              dividerText="Dirección del acompañante (opcional — si difiere del titular)"
            />
          </div>
        )}

        <Form.Item
          label="Fecha de Check-In"
          name="move_in_date"
          rules={[
            {
              required: required || !!form.getFieldValue("accommodation_id"),
              message: "La fecha de check-in es obligatoria"
            }
          ]}
        >
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
      </div>

      {/* ── Sección: Información Financiera ── */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 10, padding: "20px 20px 4px", marginBottom: 20 }}>
        {sectionHeader("Información Financiera")}

        <Form.Item>
          <Checkbox
          checked={payUntilEndOfMonth}
          onChange={(e) => {
            const checked = e.target.checked;
            setPayUntilEndOfMonth(checked);
            if (onPayUntilEndOfMonthChange) onPayUntilEndOfMonthChange(checked);
          }}
        >
          El inquilino va a pagar desde la fecha de Check-in hasta fin de mes
        </Checkbox>
      </Form.Item>

      {payUntilEndOfMonth && (
        <Form.Item
          label="Importe a pagar hasta fin de mes"
          name="first_month_amount"
          rules={[
            {
              required: payUntilEndOfMonth && (required || !!form.getFieldValue("accommodation_id")),
              message: "El importe es obligatorio"
            }
          ]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            precision={2}
            placeholder="Ej: 450"
            addonAfter="€"
          />
        </Form.Item>
      )}

      <Form.Item
        label={
          <span>
            Fecha del primer pago de la mensualidad{" "}
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
              (Nota: También de la previsión de Gastos de Servicios)
            </Text>
          </span>
        }
      >
        <input
          type="text"
          readOnly
          value={(() => {
            const moveInDate = form.getFieldValue('move_in_date');
            if (!moveInDate) return '';
            const nextMonth = moveInDate.add(1, 'month').startOf('month');
            return nextMonth.format('DD/MM/YYYY');
          })()}
          style={{
            width: '100%',
            padding: '4px 11px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            backgroundColor: '#f5f5f5',
            cursor: 'not-allowed',
            color: '#000'
          }}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Importe de la Fianza (€)"
            name="deposit_amount"
            rules={[
              {
                required: required || !!form.getFieldValue("accommodation_id"),
                message: "El importe de la fianza es obligatorio"
              }
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              precision={2}
              placeholder="Ej: 900"
              addonAfter="€"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Importe Comisión (€)" name="commission_amount">
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              precision={2}
              placeholder="Opcional"
              addonAfter="€"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="Previsión de Gastos de Servicios (€)"
        name="services_provision_amount"
        extra="Hucha Energética (Luz, agua, gas)"
      >
        <InputNumber
          style={{ width: "100%" }}
          min={0}
          precision={2}
          placeholder="Ej: 500"
          addonAfter="€"
        />
      </Form.Item>
      </div>{/* fin sección financiera */}

    </>
  );
}
