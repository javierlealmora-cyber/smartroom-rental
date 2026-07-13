// src/pages/v2/admin/tenants/components/ChangeRoomModal.jsx
// Modal reutilizable para cambio de habitación de un inquilino
// Idéntico al modal de AccommodationDetail

import { useCallback, useEffect, useState } from "react";
import {
  Alert, Button, Col, DatePicker, Divider, Form, InputNumber, Modal, Row, Select, Space, Typography,
} from "antd";
import { SwapOutlined, TeamOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { supabase } from "../../../../../services/supabaseClient";
import { listAccommodations } from "../../../../../services/accommodations.service";
import { formatCurrency } from "../../../../../utils/formatters";

const { Text } = Typography;

function calcCorrectionAmount(changeDate, currentRent, newRent) {
  if (!changeDate || currentRent == null || newRent == null) return null;
  const dayOfMonth = changeDate.date();
  if (dayOfMonth === 1) return 0;
  const daysInMonth = changeDate.daysInMonth();
  const remainingDays = daysInMonth - dayOfMonth + 1;
  return Math.round((newRent - currentRent) * remainingDays / daysInMonth * 100) / 100;
}

export default function ChangeRoomModal({ open, onClose, onSuccess, lodger, activeAssignment, clientAccountId }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [allAccs, setAllAccs] = useState([]);
  const [freeRooms, setFreeRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [entityId, setEntityId] = useState(null);
  const [changeDate, setChangeDate] = useState(null);

  // Cargar alojamientos al abrir
  useEffect(() => {
    if (!open) return;
    setFreeRooms([]);
    setEntityId(null);
    setChangeDate(null);
    form.resetFields();
    listAccommodations({ clientAccountId })
      .then(data => setAllAccs(data || []))
      .catch(() => setAllAccs([]));
  }, [open, clientAccountId, form]);

  const loadFreeRoomsForDate = useCallback(async (accId, date) => {
    if (!accId || !date) { setFreeRooms([]); return; }
    setLoadingRooms(true);
    try {
      const dateStr = typeof date === "string" ? date : date.format("YYYY-MM-DD");
      const [{ data: rooms }, { data: occupied }] = await Promise.all([
        supabase.from("rooms").select("id, number, monthly_rent, is_maintenance")
          .eq("accommodation_id", accId).order("number"),
        supabase.from("lodger_room_assignments").select("room_id")
          .eq("accommodation_id", accId)
          .lte("move_in_date", dateStr)
          .or(`move_out_date.is.null,move_out_date.gt.${dateStr}`),
      ]);
      const occupiedIds = new Set((occupied || []).map(a => a.room_id));
      setFreeRooms((rooms || []).filter(r => !r.is_maintenance && !occupiedIds.has(r.id)));
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  // Entidades únicas derivadas de alojamientos
  const entityMap = new Map();
  allAccs.forEach(a => {
    if (a.owner_entity_id && a.owner_entity && !entityMap.has(a.owner_entity_id)) {
      entityMap.set(a.owner_entity_id, a.owner_entity);
    }
  });
  const entityOptions = [...entityMap.entries()].map(([id, e]) => ({
    value: id,
    label: e.legal_type === "persona_juridica"
      ? e.legal_name
      : [e.first_name, e.last_name1].filter(Boolean).join(" "),
  }));

  const filteredAccOptions = allAccs
    .filter(a => !entityId || a.owner_entity_id === entityId)
    .map(a => ({ value: a.id, label: a.name }));

  const curRoom = activeAssignment?.room;
  const curAsgn = activeAssignment;
  const curRent = curAsgn?.monthly_rent ?? curRoom?.monthly_rent;
  const curRoomNum = curRoom ? `HAB-${String(curRoom.number).padStart(3, "0")}` : "N/A";

  const handleClose = () => {
    form.resetFields();
    setFreeRooms([]);
    setEntityId(null);
    setChangeDate(null);
    onClose();
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      const changeDateStr = values.change_date.format("YYYY-MM-DD");
      const newRoom = freeRooms.find(r => r.id === values.new_room_id);
      const newRoomNum = newRoom ? `HAB-${String(newRoom.number).padStart(3, "0")}` : "?";
      const changeNote = `Cambio de habitación: ${curRoomNum} → ${newRoomNum} el ${dayjs(changeDateStr).format("DD/MM/YYYY")}`;

      // supabase.rpc() usa el token cacheado internamente (igual que .from())
      // sin llamar a getSession() explícitamente — sin riesgo de logout.
      // La función reassign_lodger_room es SECURITY DEFINER y escribe en
      // audit_log aunque el RLS solo tenga política SELECT para authenticated.
      const { error } = await supabase.rpc("reassign_lodger_room", {
        p_lodger_id:            lodger.id,
        p_current_asgn_id:      activeAssignment?.id ?? null,
        p_new_room_id:          values.new_room_id,
        p_new_accommodation_id: values.new_accommodation_id,
        p_change_date:          changeDateStr,
        p_monthly_rent:         values.monthly_rent       ?? null,
        p_deposit_amount:       values.deposit_amount     ?? null,
        p_commission_amount:    values.commission_amount  ?? null,
        p_correction_amount:    values.correction_amount  ?? null,
        p_client_account_id:    clientAccountId,
        p_notes:                changeNote,
      });
      if (error) throw new Error(error.message);

      handleClose();
      onSuccess?.();
    } catch (e) {
      form.setFields([{ name: "new_room_id", errors: [e.message] }]);
    } finally {
      setSaving(false);
    }
  };

  const iB = { marginBottom: 6 };

  return (
    <Modal
      title={<><SwapOutlined style={{ marginRight: 8 }} />Cambiar habitación — {lodger?.full_name || ""}</>}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={700}
      destroyOnHidden
      styles={{ body: { paddingTop: 4, paddingBottom: 8 } }}
    >
      <Form form={form} layout="vertical" size="small" onFinish={onFinish}>
        {/* REQ-015: banner si la asignación activa incluye acompañante */}
        {activeAssignment?.accompanist_id && activeAssignment?.accompanist && (
          <Alert
            type="info"
            showIcon
            icon={<TeamOutlined />}
            style={{ marginBottom: 10 }}
            message="Esta asignación incluye un acompañante"
            description={
              <Text style={{ fontSize: 12 }}>
                <strong>
                  {[
                    activeAssignment.accompanist.first_name,
                    activeAssignment.accompanist.last_name1,
                    activeAssignment.accompanist.last_name2,
                  ].filter(Boolean).join(" ")}
                </strong>
                {" "}se mantiene en el contrato. Al cambiar de habitación, el acompañante acompaña al titular automáticamente.
              </Text>
            }
          />
        )}
        {/* ── CHECK-OUT ── */}
        <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: "#6B7280", margin: "0 0 8px" }}>
          Check-Out
        </Divider>

        <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 10px", marginBottom: 8, fontSize: 12 }}>
          <Row gutter={8}>
            <Col span={12}>
              <Text type="secondary">Entidad actual</Text>
              <div><Text strong>{
                activeAssignment?.accommodation?.owner_entity
                  ? (activeAssignment.accommodation.owner_entity.legal_type === "persona_juridica"
                    ? activeAssignment.accommodation.owner_entity.legal_name
                    : [activeAssignment.accommodation.owner_entity.first_name, activeAssignment.accommodation.owner_entity.last_name1].filter(Boolean).join(" "))
                  : "—"
              }</Text></div>
            </Col>
            <Col span={12}>
              <Text type="secondary">Apartamento</Text>
              <div><Text strong>{activeAssignment?.accommodation?.name || "—"}</Text></div>
            </Col>
          </Row>
          <Row gutter={8} style={{ marginTop: 4 }}>
            <Col span={12}>
              <Text type="secondary">Habitación</Text>
              <div><Text strong style={{ color: "#0071E3" }}>{curRoomNum}</Text></div>
            </Col>
            <Col span={12}>
              <Text type="secondary">Importe mensual</Text>
              <div><Text strong>{curRent != null ? formatCurrency(curRent) : "—"}</Text></div>
            </Col>
          </Row>
        </div>

        <Row gutter={12} align="middle">
          <Col span={14}>
            <Form.Item
              label="Fecha del cambio"
              name="change_date"
              style={iB}
              rules={[
                { required: true, message: "Obligatoria" },
                { validator: (_, v) => v && v.isBefore(dayjs().startOf("day")) ? Promise.reject("Debe ser hoy o posterior") : Promise.resolve() },
              ]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                disabledDate={d => d && d.isBefore(dayjs().startOf("day"))}
                onChange={v => {
                  setChangeDate(v);
                  const accId = form.getFieldValue("new_accommodation_id");
                  loadFreeRoomsForDate(accId, v);
                  const newRent = form.getFieldValue("monthly_rent");
                  if (newRent != null) {
                    const corr = calcCorrectionAmount(v, curRent, newRent);
                    if (corr !== null) form.setFieldValue("correction_amount", corr);
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={10} style={{ paddingTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Hasta esa fecha: </Text>
            <Text strong style={{ color: "#B45309" }}>Pte. Baja</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>Desde esa fecha: </Text>
            <Text strong style={{ color: "#15803D" }}>Activo</Text>
          </Col>
        </Row>

        {/* ── CHECK-IN ── */}
        <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 8px" }}>
          Check-In
        </Divider>

        <Row gutter={12}>
          <Col span={11}>
            <Form.Item label="Entidad" name="new_entity_id" style={iB}
              rules={[{ required: true, message: "Selecciona una entidad" }]}>
              <Select
                placeholder="Seleccionar entidad..."
                allowClear showSearch
                filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
                options={entityOptions}
                onChange={v => {
                  setEntityId(v ?? null);
                  form.setFieldValue("new_accommodation_id", undefined);
                  form.setFieldValue("new_room_id", undefined);
                  form.setFieldValue("monthly_rent", undefined);
                  setFreeRooms([]);
                }}
              />
            </Form.Item>
          </Col>
          <Col span={13}>
            <Form.Item label="Alojamiento" name="new_accommodation_id" style={iB}>
              <Select
                placeholder="Seleccionar..."
                allowClear showSearch
                filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())}
                options={filteredAccOptions}
                onChange={accId => {
                  form.setFieldValue("new_room_id", undefined);
                  form.setFieldValue("monthly_rent", undefined);
                  setFreeRooms([]);
                  if (!accId) return;
                  loadFreeRoomsForDate(accId, form.getFieldValue("change_date"));
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Nueva habitación (libres en la fecha del cambio)" name="new_room_id" style={iB}
          rules={[{ required: true, message: "Selecciona una habitación" }]}>
          <Select
            placeholder={!changeDate ? "Primero selecciona fecha del cambio" : "Seleccionar habitación..."}
            loading={loadingRooms}
            disabled={!changeDate || !form.getFieldValue("new_accommodation_id")}
            options={freeRooms.map(r => ({
              value: r.id,
              label: `Hab. ${String(r.number).padStart(3, "0")}${r.monthly_rent != null ? ` — ${formatCurrency(r.monthly_rent)}/mes` : ""}`,
            }))}
            onChange={roomId => {
              const r = freeRooms.find(x => x.id === roomId);
              if (r?.monthly_rent != null) {
                form.setFieldValue("monthly_rent", r.monthly_rent);
                const corr = calcCorrectionAmount(form.getFieldValue("change_date"), curRent, r.monthly_rent);
                if (corr !== null) form.setFieldValue("correction_amount", corr);
              }
              if (curAsgn?.deposit_amount != null) {
                form.setFieldValue("deposit_amount", curAsgn.deposit_amount);
              }
            }}
          />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Importe de la Fianza (€)" name="deposit_amount" style={iB}
              rules={[{ required: true, message: "Obligatorio" }]}>
              <InputNumber style={{ width: "100%" }} min={0} precision={2} placeholder="Ej. 900" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Renta mensual (€)" name="monthly_rent" style={iB}>
              <InputNumber style={{ width: "100%" }} min={0} precision={2} placeholder="Ej. 450" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Importe Comisión (€)" name="commission_amount" style={iB}>
              <InputNumber style={{ width: "100%" }} min={0} precision={2} placeholder="Opcional" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Corrección por cambio (€)"
              name="correction_amount"
              style={iB}
              tooltip="Diferencia proporcional por días restantes del mes. Positivo = paga más. Negativo = descuento. 0 si el cambio es el día 1."
            >
              <InputNumber style={{ width: "100%" }} min={-99999} precision={2} placeholder="Auto-calculado" />
            </Form.Item>
          </Col>
        </Row>

        <Row justify="end" style={{ marginTop: 12 }}>
          <Space>
            <Button size="middle" onClick={handleClose}>Cancelar</Button>
            <Button size="middle" type="primary" htmlType="submit" icon={<SwapOutlined />} loading={saving}
              style={{ background: "#0096D6", borderColor: "#0096D6" }}>
              Confirmar cambio
            </Button>
          </Space>
        </Row>
      </Form>
    </Modal>
  );
}
