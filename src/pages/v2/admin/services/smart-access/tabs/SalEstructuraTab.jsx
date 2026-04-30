// src/pages/v2/admin/services/smart-access/tabs/SalEstructuraTab.jsx
// Estructura de Accesos SAL — sub-pestaña de SAL.
//
// Muestra la jerarquía: Alojamiento → Habitaciones / Zonas comunes.
// Cada entidad muestra sus locks asignadas (placements activos).
// Permite asignar locks a ubicaciones mediante un Drawer lateral.
//
// Decisiones de diseño:
//   - auto_assign_to_lodger default=false; se pre-marca true solo si lock_purpose='entry_door'
//   - Lock sin ubicar → panel colapsable en la parte superior
//   - Drawer (no modal) para asignar locks

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Badge, Button, Col, Collapse, Drawer, Form, Row,
  Select, Skeleton, Space, Switch, Table, Tag, Tooltip,
  Typography, message, Popconfirm,
} from "antd";
import {
  PlusOutlined, LockOutlined, CloseCircleOutlined,
  ReloadOutlined, WarningOutlined,
} from "@ant-design/icons";
import { useAdminLayout } from "../../../../../../hooks/useAdminLayout";
import { useSalSubscription } from "../../../../../../hooks/useSalSubscription";
import { supabase } from "../../../../../../services/supabaseClient";
import { invokeWithAuth } from "../../../../../../services/supabaseInvoke.services";

const { Text, Title } = Typography;

const PURPOSE_LABEL = {
  entry_door:        "Puerta de entrada",
  parcel_locker:     "Taquilla / Paquetería",
  safe_box:          "Caja fuerte",
  common_area_entry: "Acceso zona común",
  storage_lock:      "Almacén / Trastero",
  custom:            "Otro",
};
const PURPOSE_COLOR = {
  entry_door:        "blue",
  parcel_locker:     "purple",
  safe_box:          "red",
  common_area_entry: "orange",
  storage_lock:      "cyan",
  custom:            "default",
};

const LOCK_PURPOSE_OPTIONS = Object.entries(PURPOSE_LABEL).map(([v, l]) => ({ value: v, label: l }));

// ── Hook para cargar datos en paralelo ───────────────────────────────────────
function useSalStructure(clientAccountId) {
  const [accommodations, setAccommodations] = useState([]);
  const [rooms, setRooms]                   = useState([]);
  const [commonAreas, setCommonAreas]       = useState([]);
  const [locks, setLocks]                   = useState([]);
  const [placements, setPlacements]         = useState([]);
  const [loading, setLoading]               = useState(true);

  const reload = useCallback(async () => {
    if (!clientAccountId) return;
    setLoading(true);
    const [accRes, roomRes, areaRes, lockRes, placeRes] = await Promise.allSettled([
      supabase.from("accommodations").select("id, name").eq("client_account_id", clientAccountId).eq("status", "active").order("name"),
      supabase.from("rooms").select("id, number, accommodation_id").eq("client_account_id", clientAccountId).order("number"),
      supabase.from("common_areas").select("id, name, area_type, accommodation_id").eq("client_account_id", clientAccountId).order("name"),
      supabase.from("locks").select("id, name, display_name, battery_level, is_online").eq("client_account_id", clientAccountId).order("name"),
      supabase.from("lock_placements").select("id, lock_id, placement_type, accommodation_id, room_id, common_area_id, lock_purpose, auto_assign_to_lodger, display_name").eq("client_account_id", clientAccountId).eq("is_active", true),
    ]);

    if (accRes.status === "fulfilled")   setAccommodations(accRes.value.data ?? []);
    if (roomRes.status === "fulfilled")  setRooms(roomRes.value.data ?? []);
    if (areaRes.status === "fulfilled")  setCommonAreas(areaRes.value.data ?? []);
    if (lockRes.status === "fulfilled")  setLocks(lockRes.value.data ?? []);
    if (placeRes.status === "fulfilled") setPlacements(placeRes.value.data ?? []);
    setLoading(false);
  }, [clientAccountId]);

  useEffect(() => { reload(); }, [reload]);
  return { accommodations, rooms, commonAreas, locks, placements, loading, reload };
}

// ── Componente de badge de lock ───────────────────────────────────────────────
function LockBadge({ lock, purpose, onRemove }) {
  return (
    <Space size={4} style={{ display: "inline-flex", alignItems: "center",
      background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8,
      padding: "4px 10px", marginRight: 6, marginBottom: 4 }}>
      <LockOutlined style={{ color: "#0369A1", fontSize: 12 }} />
      <Text style={{ fontSize: 12, fontWeight: 600 }}>
        {lock?.display_name ?? lock?.name ?? "Cerradura"}
      </Text>
      <Tag color={PURPOSE_COLOR[purpose] ?? "default"} style={{ marginLeft: 4, fontSize: 11 }}>
        {PURPOSE_LABEL[purpose] ?? purpose}
      </Tag>
      <Popconfirm
        title="¿Quitar cerradura de esta ubicación?"
        onConfirm={onRemove}
        okText="Quitar" okType="danger"
      >
        <CloseCircleOutlined style={{ color: "#9CA3AF", cursor: "pointer", marginLeft: 4 }} />
      </Popconfirm>
    </Space>
  );
}

// ── Drawer de asignación ─────────────────────────────────────────────────────
function AssignDrawer({ open, onClose, onSave, clientAccountId, accommodationId, placementType, entityId, availableLocks }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [purpose, setPurpose] = useState(null);

  const handlePurposeChange = (v) => {
    setPurpose(v);
    // Pre-marcar auto_assign si es entrada principal
    form.setFieldValue("auto_assign_to_lodger", v === "entry_door");
  };

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      await onSave({
        lock_id:               values.lock_id,
        lock_purpose:          values.lock_purpose,
        auto_assign_to_lodger: values.auto_assign_to_lodger ?? false,
        placement_type:        placementType,
        accommodation_id:      accommodationId,
        ...(placementType === "room"        && { room_id:       entityId }),
        ...(placementType === "common_area" && { common_area_id: entityId }),
      });
      form.resetFields();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Asignar cerradura"
      width={380}
      footer={
        <Space style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>Asignar</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Cerradura" name="lock_id" rules={[{ required: true, message: "Selecciona una cerradura" }]}>
          <Select
            placeholder="Selecciona cerradura disponible"
            options={availableLocks.map((l) => ({
              value: l.id,
              label: `${l.display_name ?? l.name}${l.battery_level != null ? ` (${l.battery_level}%)` : ""}`,
            }))}
          />
        </Form.Item>
        <Form.Item label="Propósito" name="lock_purpose" rules={[{ required: true, message: "Selecciona el propósito" }]}>
          <Select options={LOCK_PURPOSE_OPTIONS} onChange={handlePurposeChange} placeholder="¿Para qué sirve esta cerradura?" />
        </Form.Item>
        <Form.Item
          label="Acceso automático a inquilinos"
          name="auto_assign_to_lodger"
          valuePropName="checked"
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              Si está activo, al asignar habitación el sistema concederá acceso automáticamente.
              {purpose !== "entry_door" && (
                <> Solo recomendado para puertas de entrada.</>
              )}
            </Text>
          }
        >
          <Switch />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SalEstructuraTab() {
  const { clientAccountId } = useAdminLayout();
  const { salActive, salLoading } = useSalSubscription();
  const { accommodations, rooms, commonAreas, locks, placements, loading, reload } = useSalStructure(clientAccountId);

  const [drawer, setDrawer] = useState(null); // { placementType, accommodationId, entityId }

  // ── Locks sin ubicar ─────────────────────────────────────────────────────
  const assignedLockIds = new Set(placements.map((p) => p.lock_id));
  const unassignedLocks = locks.filter((l) => !assignedLockIds.has(l.id));

  // Locks disponibles = las que no tienen placement activo (para el drawer)
  const availableLocks = unassignedLocks;

  // ── Helper para obtener placements de una entidad ─────────────────────────
  const placementsFor = (type, entityId, accId) =>
    placements.filter((p) => {
      if (type === "accommodation_entry") return p.placement_type === "accommodation_entry" && p.accommodation_id === accId;
      if (type === "room")        return p.placement_type === "room"        && p.room_id        === entityId;
      if (type === "common_area") return p.placement_type === "common_area" && p.common_area_id === entityId;
      return false;
    });

  // ── Quitar placement ──────────────────────────────────────────────────────
  const handleRemovePlacement = async (placementId) => {
    const { error } = await supabase
      .from("lock_placements")
      .update({ is_active: false })
      .eq("id", placementId);
    if (error) {
      message.error(error.message);
    } else {
      message.success("Cerradura desasignada");
      reload();
    }
  };

  // ── Asignar lock desde Drawer ─────────────────────────────────────────────
  const handleAssign = async (payload) => {
    try {
      const result = await invokeWithAuth("sal-place-lock", {
        body: { client_account_id: clientAccountId, ...payload },
      });
      if (result?.ok === false) {
        message.error(result.error?.message ?? "Error al asignar cerradura");
      } else {
        message.success(result?.data?.message ?? "Cerradura asignada");
        setDrawer(null);
        reload();
      }
    } catch (e) {
      message.error(e.message);
    }
  };

  if (salLoading || loading) return <Skeleton active paragraph={{ rows: 6 }} />;

  if (!salActive) {
    return (
      <Alert
        type="warning" showIcon
        message="SmartAccessLock no está activo para esta cuenta"
        style={{ maxWidth: 560 }}
      />
    );
  }

  if (!locks.length) {
    return (
      <Alert
        type="info" showIcon
        message="No hay cerraduras sincronizadas"
        description="Ve a la pestaña «Configuración» para conectar TTLock y sincronizar tus cerraduras antes de configurar la estructura de accesos."
        style={{ maxWidth: 580 }}
      />
    );
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={reload}>Actualizar</Button>
      </div>

      {/* ── Panel locks sin ubicar ───────────────────────────────────────── */}
      {unassignedLocks.length > 0 && (
        <Collapse
          style={{ marginBottom: 20, background: "#FFFBEB", borderColor: "#FDE68A" }}
          items={[{
            key: "unassigned",
            label: (
              <Space>
                <WarningOutlined style={{ color: "#D97706" }} />
                <Text strong style={{ color: "#92400E" }}>
                  {unassignedLocks.length} cerradura{unassignedLocks.length > 1 ? "s" : ""} sin ubicar
                </Text>
              </Space>
            ),
            children: (
              <Space wrap>
                {unassignedLocks.map((l) => (
                  <Tag key={l.id} icon={<LockOutlined />} color="warning" style={{ fontSize: 13, padding: "4px 10px" }}>
                    {l.display_name ?? l.name}
                    {l.battery_level != null && <span style={{ color: "#9CA3AF", marginLeft: 6 }}>{l.battery_level}%</span>}
                  </Tag>
                ))}
              </Space>
            ),
          }]}
        />
      )}

      {/* ── Estructura por alojamiento ───────────────────────────────────── */}
      {accommodations.length === 0 ? (
        <Alert type="info" showIcon message="No hay alojamientos activos" />
      ) : (
        <Collapse
          defaultActiveKey={accommodations.map((a) => a.id)}
          items={accommodations.map((acc) => {
            const accRooms  = rooms.filter((r) => r.accommodation_id === acc.id);
            const accAreas  = commonAreas.filter((a) => a.accommodation_id === acc.id);
            const entryPlacements = placementsFor("accommodation_entry", null, acc.id);

            return {
              key: acc.id,
              label: (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <Text strong style={{ fontSize: 15 }}>{acc.name}</Text>
                  <Badge count={entryPlacements.length} showZero style={{ backgroundColor: "#0369A1" }} />
                </div>
              ),
              children: (
                <div>
                  {/* Entrada del alojamiento */}
                  <div style={{ marginBottom: 20, padding: "12px 16px", background: "#F0F9FF", borderRadius: 8, border: "1px solid #BAE6FD" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: 700, color: "#0369A1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Entrada del alojamiento
                      </Text>
                      <Button
                        size="small"
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => setDrawer({ placementType: "accommodation_entry", accommodationId: acc.id, entityId: acc.id })}
                        disabled={availableLocks.length === 0}
                      >
                        + Lock
                      </Button>
                    </div>
                    {entryPlacements.length > 0 ? (
                      <div>
                        {entryPlacements.map((p) => {
                          const l = locks.find((lk) => lk.id === p.lock_id);
                          return (
                            <LockBadge
                              key={p.id}
                              lock={l}
                              purpose={p.lock_purpose}
                              onRemove={() => handleRemovePlacement(p.id)}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>Sin cerradura asignada</Text>
                    )}
                  </div>

                  {/* Habitaciones */}
                  {accRooms.length > 0 && (
                    <>
                      <Text style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                        Habitaciones
                      </Text>
                      {accRooms.map((room) => {
                        const rPlacements = placementsFor("room", room.id, acc.id);
                        return (
                          <div key={room.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "10px 14px", marginBottom: 6, background: "#FAFAFA",
                            border: "1px solid #E5E7EB", borderRadius: 8 }}>
                            <div>
                              <Text style={{ fontWeight: 500 }}>Hab. {room.number}</Text>
                              <div style={{ marginTop: 4 }}>
                                {rPlacements.length > 0 ? (
                                  rPlacements.map((p) => {
                                    const l = locks.find((lk) => lk.id === p.lock_id);
                                    return (
                                      <LockBadge
                                        key={p.id}
                                        lock={l}
                                        purpose={p.lock_purpose}
                                        onRemove={() => handleRemovePlacement(p.id)}
                                      />
                                    );
                                  })
                                ) : (
                                  <Tag color="default" style={{ fontSize: 11 }}>Sin cerradura</Tag>
                                )}
                              </div>
                            </div>
                            <Tooltip title={availableLocks.length === 0 ? "Todas las cerraduras están asignadas" : "Asignar cerradura"}>
                              <Button
                                size="small"
                                type="dashed"
                                icon={<PlusOutlined />}
                                disabled={availableLocks.length === 0}
                                onClick={() => setDrawer({ placementType: "room", accommodationId: acc.id, entityId: room.id })}
                              />
                            </Tooltip>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Zonas comunes */}
                  {accAreas.length > 0 && (
                    <>
                      <Text style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8, marginTop: 16 }}>
                        Zonas comunes
                      </Text>
                      {accAreas.map((area) => {
                        const aPlacements = placementsFor("common_area", area.id, acc.id);
                        return (
                          <div key={area.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "10px 14px", marginBottom: 6, background: "#FAFAFA",
                            border: "1px solid #E5E7EB", borderRadius: 8 }}>
                            <div>
                              <Text style={{ fontWeight: 500 }}>{area.name}</Text>
                              <div style={{ marginTop: 4 }}>
                                {aPlacements.length > 0 ? (
                                  aPlacements.map((p) => {
                                    const l = locks.find((lk) => lk.id === p.lock_id);
                                    return (
                                      <LockBadge
                                        key={p.id}
                                        lock={l}
                                        purpose={p.lock_purpose}
                                        onRemove={() => handleRemovePlacement(p.id)}
                                      />
                                    );
                                  })
                                ) : (
                                  <Tag color="default" style={{ fontSize: 11 }}>Sin cerradura</Tag>
                                )}
                              </div>
                            </div>
                            <Tooltip title={availableLocks.length === 0 ? "Todas las cerraduras están asignadas" : "Asignar cerradura"}>
                              <Button
                                size="small"
                                type="dashed"
                                icon={<PlusOutlined />}
                                disabled={availableLocks.length === 0}
                                onClick={() => setDrawer({ placementType: "common_area", accommodationId: acc.id, entityId: area.id })}
                              />
                            </Tooltip>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              ),
            };
          })}
        />
      )}

      {/* ── Drawer de asignación ─────────────────────────────────────────── */}
      {drawer && (
        <AssignDrawer
          open={!!drawer}
          onClose={() => setDrawer(null)}
          onSave={handleAssign}
          clientAccountId={clientAccountId}
          accommodationId={drawer.accommodationId}
          placementType={drawer.placementType}
          entityId={drawer.entityId}
          availableLocks={availableLocks}
        />
      )}
    </div>
  );
}
