// src/pages/v2/admin/tenants/TenantEdit.jsx
// Editar Inquilino — Ant Design + manage_lodger Edge Function

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert, Button, Card, Col, DatePicker, Descriptions, Form,
  InputNumber, message, Modal, Popconfirm, Row, Select, Space, Tag, Tooltip, Typography, Upload,
} from "antd";
import { ArrowLeftOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, FileOutlined, MailOutlined, PaperClipOutlined, SaveOutlined, SwapOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { getLodger, updateLodger, setLodgerStatus, reassignRoom, inviteLodger } from "../../../../services/lodgers.service";
import { listAccommodations } from "../../../../services/accommodations.service";
import { supabase } from "../../../../services/supabaseClient";
import LodgerFormFields from "./components/LodgerFormFields";
import PayersList from "./components/PayersList";

const { Title, Text } = Typography;

const ROOM_STATUS_LABEL = { free: "Libre", occupied: "Ocupada", pending_checkout: "Pendiente baja", maintenance: "Mantenimiento" };
const ROOM_STATUS_COLOR = { free: "success", occupied: "error", pending_checkout: "warning", maintenance: "default" };

const STORAGE_BUCKET = "lodger-documents";

function buildPath(lodgerId, roomId, fileName) {
  return `${lodgerId}/${roomId}/${fileName}`;
}

const STATUS_OPTIONS = [
  { value: "invited", label: "Invitado" },
  { value: "active", label: "Activo" },
  { value: "pending_checkout", label: "Pendiente de baja" },
  { value: "inactive", label: "Inactivo" },
];


function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TenantEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const [form] = Form.useForm();
  const [reassignForm] = Form.useForm();

  const [lodger, setLodger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [sendingInvite, setSendingInvite] = useState(false);

  // Documents
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const activeRoomIdRef = useRef(null);

  // Reassign modal state
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignBusy, setReassignBusy] = useState(false);
  const [reassignError, setReassignError] = useState(null);
  const [payUntilEndOfMonth, setPayUntilEndOfMonth] = useState(false);
  const [allAccommodations, setAllAccommodations] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const loadDocuments = useCallback(async (lodgerId, roomId) => {
    if (!lodgerId || !roomId) return;
    setDocsLoading(true);
    try {
      const { data, error: listErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(`${lodgerId}/${roomId}`, { sortBy: { column: "name", order: "asc" } });
      if (listErr) throw listErr;
      setDocuments((data || []).filter((f) => f.name !== ".emptyFolderPlaceholder"));
    } catch (e) {
      console.error("Docs error:", e.message);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, accs] = await Promise.all([
        getLodger(id, clientAccountId),
        listAccommodations({ status: "active" }),
      ]);
      setLodger(data);
      setAllAccommodations(accs);
      const activeAsgn = data.assignments?.find((a) => !a.move_out_date);
      activeRoomIdRef.current = activeAsgn?.room?.id || null;
      if (activeAsgn?.room?.id) {
        loadDocuments(id, activeAsgn.room.id);
      }
      form.setFieldsValue({
        first_name: data.first_name || "",
        last_name1: data.last_name1 || "",
        last_name2: data.last_name2 || "",
        nickname: data.nickname || "",
        email: data.email,
        phone: data.phone || "",
        document_id: data.document_id || "",
        status: data.onboarding_status,
        gender: data.gender || null,
        address_street: data.address_street || "",
        address_number: data.address_number || "",
        address_floor: data.address_floor || "",
        address_postal_code: data.address_postal_code || "",
        address_city: data.address_city || "",
        address_province: data.address_province || "",
        address_country: data.address_country || "",
      });
      // Auto-open reassign modal if ?action=reassign
      if (searchParams.get("action") === "reassign") {
        setReassignOpen(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, searchParams, clientAccountId]);

  useEffect(() => { load(); }, [load]);

  const onAccommodationChange = async (accId) => {
    reassignForm.setFieldValue("new_room_id", undefined);
    setAvailableRooms([]);
    if (!accId) return;
    setLoadingRooms(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [{ data, error: roomsErr }, { data: occupied }] = await Promise.all([
        supabase.from("rooms").select("id, number, is_maintenance").eq("accommodation_id", accId).eq("is_maintenance", false).order("number"),
        supabase.from("lodger_room_assignments").select("room_id").eq("accommodation_id", accId).or(`move_out_date.is.null,move_out_date.gt.${today}`),
      ]);
      if (roomsErr) throw new Error(roomsErr.message);
      const occupiedIds = new Set((occupied || []).map(a => a.room_id));
      setAvailableRooms((data || []).filter(r => !occupiedIds.has(r.id)));
    } catch (e) {
      setReassignError(e.message);
    } finally {
      setLoadingRooms(false);
    }
  };

  const onReassignFinish = async (values) => {
    setReassignBusy(true);
    setReassignError(null);
    try {
      const moveInDate = values.move_in_date.format("YYYY-MM-DD");
      const billingStart = values.move_in_date.add(1, "month").startOf("month").format("YYYY-MM-DD");
      await reassignRoom(id, {
        newRoomId: values.new_room_id,
        newAccommodationId: values.new_accommodation_id,
        moveInDate: moveInDate,
        billingStartDate: billingStart,
        monthlyRent: null,
        depositAmount: values.deposit_amount,
        commissionAmount: values.commission_amount || null,
        firstMonthAmount: payUntilEndOfMonth ? (values.end_of_month_amount || null) : null,
      });
      setReassignOpen(false);
      reassignForm.resetFields();
      setPayUntilEndOfMonth(false);
      setAvailableRooms([]);
      // Si venimos de ?action=reassign navegar sin el param para que load() no re-abra el modal.
      // Si el modal se abrió desde el botón directo, recargar datos en la misma página.
      if (searchParams.get("action") === "reassign") {
        navigate(`/v2/admin/inquilinos/${id}/editar`, { replace: true });
      } else {
        await load();
      }
    } catch (e) {
      setReassignError(e.message);
    } finally {
      setReassignBusy(false);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    setError(null);
    try {
      if (values.status !== lodger.onboarding_status) {
        await setLodgerStatus(id, values.status);
      }
      const full_name = [values.first_name, values.last_name1, values.last_name2]
        .filter(Boolean).join(" ");
      await updateLodger(id, {
        full_name,
        first_name: values.first_name || null,
        last_name1: values.last_name1 || null,
        last_name2: values.last_name2 || null,
        nickname: values.nickname || null,
        phone: values.phone || null,
        document_id: values.document_id || null,
        gender: values.gender || null,
        address_street: values.address_street || null,
        address_number: values.address_number || null,
        address_floor: values.address_floor || null,
        address_postal_code: values.address_postal_code || null,
        address_city: values.address_city || null,
        address_province: values.address_province || null,
        address_country: values.address_country || null,
      });
      navigate("/v2/admin/inquilinos");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const activeAssignment = lodger?.assignments?.find((a) => !a.move_out_date);

  const onUploadFile = async (file) => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) { message.error("El inquilino no tiene habitación asignada"); return false; }
    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const path = buildPath(id, roomId, safeFileName);
    setUploading(true);
    try {
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      message.success(`"${file.name}" subido correctamente`);
      await loadDocuments(id, roomId);
    } catch (e) {
      message.error(`Error al subir: ${e.message}`);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const onDeleteDoc = async (docName) => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    try {
      const { error: delErr } = await supabase.storage.from(STORAGE_BUCKET).remove([buildPath(id, roomId, docName)]);
      if (delErr) throw delErr;
      message.success("Documento eliminado");
      setDocuments((prev) => prev.filter((d) => d.name !== docName));
    } catch (e) {
      message.error(`Error al eliminar: ${e.message}`);
    }
  };

  const onRenameDoc = async () => {
    const roomId = activeRoomIdRef.current;
    if (!roomId || !renamingDoc || !renameValue.trim()) return;
    const oldPath = buildPath(id, roomId, renamingDoc);
    const newName = `${Date.now()}_${renameValue.trim().replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const newPath = buildPath(id, roomId, newName);
    try {
      const { error: copyErr } = await supabase.storage.from(STORAGE_BUCKET).copy(oldPath, newPath);
      if (copyErr) throw copyErr;
      await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
      message.success("Documento renombrado");
      setRenamingDoc(null);
      setRenameValue("");
      await loadDocuments(id, roomId);
    } catch (e) {
      message.error(`Error al renombrar: ${e.message}`);
    }
  };

  const openDocUrl = async (docName) => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    try {
      const { data, error: signErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(buildPath(id, roomId, docName), 3600);
      if (signErr) throw signErr;
      window.open(data.signedUrl, "_blank");
    } catch (e) {
      message.error(`Error al abrir documento: ${e.message}`);
    }
  };

  const onSendInvite = async () => {
    if (!lodger?.id) return;
    setSendingInvite(true);
    try {
      await inviteLodger(lodger.id);
      message.success(`Email de acceso enviado a ${lodger.email}`);
    } catch (e) {
      message.error(`Error al enviar: ${e.message}`);
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Editar Inquilino</Title>
          {lodger && (
            <Text type="secondary">{lodger.full_name} · {lodger.email}</Text>
          )}
        </Col>
        <Col>
          <Space>
            <Tooltip title="Enviar email de acceso al portal del inquilino">
              <Button
                icon={<MailOutlined />}
                loading={sendingInvite}
                onClick={onSendInvite}
                disabled={!lodger?.email}
              >
                Enviar acceso
              </Button>
            </Tooltip>
            {lodger?.status === "active" && (
              <Button
                icon={<SwapOutlined />}
                onClick={() => { setReassignError(null); setReassignOpen(true); }}
              >
                Cambiar habitación
              </Button>
            )}
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/inquilinos")}>
              Volver
            </Button>
          </Space>
        </Col>
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      )}

      <Row gutter={[20, 20]}>
        {/* Formulario de edición */}
        <Col xs={24} lg={14}>
          <Card title="Datos del Inquilino" size="small" loading={loading}>
            {!loading && (
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <LodgerFormFields disableEmail={true} />
                
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Estado" name="status"
                      rules={[{ required: true, message: "Selecciona un estado" }]}>
                      <Select options={STATUS_OPTIONS} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row justify="end" style={{ marginTop: 8 }}>
                  <Space>
                    <Button onClick={() => navigate("/v2/admin/inquilinos")}>Cancelar</Button>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                      Guardar Cambios
                    </Button>
                  </Space>
                </Row>
              </Form>
            )}
          </Card>
        </Col>

        {/* Info de asignación actual */}
        <Col xs={24} lg={10}>
          <Card
            title="Habitación Actual"
            size="small"
            loading={loading}
            extra={
              activeAssignment && !loading ? (
                <Space size={4}>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/v2/admin/alojamientos/${activeAssignment.accommodation_id}/editar`)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="small"
                    icon={<SwapOutlined />}
                    onClick={() => { setReassignError(null); setReassignOpen(true); }}
                  >
                    Cambiar
                  </Button>
                </Space>
              ) : null
            }
          >
            {activeAssignment ? (
              <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 150 }}>
                <Descriptions.Item label="Alojamiento">
                  <Text strong>{activeAssignment.accommodation?.name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Habitación">
                  <Space size={6}>
                    <Tag color="geekblue">Hab. {activeAssignment.room?.number}</Tag>
                    {activeAssignment.room?.status && (
                      <Tag color={ROOM_STATUS_COLOR[activeAssignment.room.status] || "default"}>
                        {ROOM_STATUS_LABEL[activeAssignment.room.status] || activeAssignment.room.status}
                      </Tag>
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Fecha de Check-In">
                  {fDate(activeAssignment.move_in_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha primer pago">
                  {fDate(activeAssignment.billing_start_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Renta">
                  <Text strong style={{ color: "#059669" }}>
                    {activeAssignment.monthly_rent != null
                      ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(activeAssignment.monthly_rent)
                      : "-"}
                    <Text type="secondary" style={{ fontSize: 11 }}>/mes</Text>
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Importe hasta fin de mes">
                  {activeAssignment.pay_until_end_of_month && activeAssignment.amount_until_end_of_month != null ? (
                    <Text strong style={{ color: "#059669" }}>
                      {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(activeAssignment.amount_until_end_of_month)}
                    </Text>
                  ) : (
                    <Text type="secondary">-</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Importe de la Fianza">
                  {activeAssignment.deposit_amount != null ? (
                    <Text strong style={{ color: "#d97706" }}>
                      {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(activeAssignment.deposit_amount)}
                    </Text>
                  ) : (
                    <Text type="secondary">-</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Importe de Comisión">
                  {activeAssignment.commission_amount != null ? (
                    <Text strong style={{ color: "#7c3aed" }}>
                      {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(activeAssignment.commission_amount)}
                    </Text>
                  ) : (
                    <Text type="secondary">-</Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary">Sin habitación asignada actualmente</Text>
            )}
          </Card>

          {lodger && (
            <Card title="Historial de Asignaciones" size="small" style={{ marginTop: 16 }}>
              {(lodger.assignments || []).length === 0 ? (
                <Text type="secondary">Sin historial</Text>
              ) : (
                <Space direction="vertical" style={{ width: "100%" }} size={6}>
                  {lodger.assignments.map((a) => (
                    <div key={a.id} style={{
                      padding: "8px 12px", background: "#f9fafb",
                      borderRadius: 6, borderLeft: `3px solid ${a.move_out_date ? "#d1d5db" : "#059669"}`,
                    }}>
                      <Text strong style={{ fontSize: 12 }}>
                        {a.accommodation?.name} · Hab. {a.room?.number}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {fDate(a.move_in_date)} → {a.move_out_date ? fDate(a.move_out_date) : "Actual"}
                      </Text>
                    </div>
                  ))}
                </Space>
              )}
            </Card>
          )}
        </Col>
      </Row>

      {/* Sección Pagadores - Siempre visible */}
      {lodger && (
        <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
          <Col xs={24}>
            <PayersList 
              lodgerId={lodger.id} 
              clientAccountId={clientAccountId}
              hasRoomAssignment={!!lodger.assignments?.find((a) => !a.move_out_date)}
            />
          </Col>
        </Row>
      )}

      {/* ── Sección Documentos adjuntos ── */}
      {lodger && (
        <Card
          title={<><PaperClipOutlined style={{ marginRight: 6 }} />Documentos adjuntos</>}
          size="small"
          style={{ marginTop: 20 }}
          extra={
            activeAssignment ? (
              <Upload beforeUpload={onUploadFile} showUploadList={false} multiple={false}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx">
                <Button size="small" icon={<UploadOutlined />} loading={uploading}>
                  Subir documento
                </Button>
              </Upload>
            ) : (
              <Tooltip title="Asigna una habitación al inquilino para poder subir documentos">
                <Button size="small" icon={<UploadOutlined />} disabled>Subir documento</Button>
              </Tooltip>
            )
          }
        >
          {!activeAssignment && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              Sin habitación asignada — los documentos se asocian al inquilino y su habitación actual.
            </Text>
          )}
          {activeAssignment && docsLoading && (
            <Text type="secondary">Cargando documentos...</Text>
          )}
          {activeAssignment && !docsLoading && documents.length === 0 && (
            <Text type="secondary" style={{ fontSize: 13 }}>No hay documentos adjuntos. Sube el contrato u otros archivos.</Text>
          )}
          {activeAssignment && !docsLoading && documents.length > 0 && (
            <Space direction="vertical" style={{ width: "100%" }} size={6}>
              {documents.map((doc) => {
                const displayName = doc.name.replace(/^\d+_/, "");
                const isRenaming = renamingDoc === doc.name;
                return (
                  <div key={doc.name} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", background: "#f9fafb",
                    borderRadius: 8, border: "1px solid #e5e7eb",
                  }}>
                    <FileOutlined style={{ color: "#6B7280", flexShrink: 0 }} />
                    {isRenaming ? (
                      <Input
                        size="small"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onPressEnter={onRenameDoc}
                        style={{ flex: 1 }}
                        autoFocus
                      />
                    ) : (
                      <Text style={{ flex: 1, fontSize: 13, wordBreak: "break-all" }}>{displayName}</Text>
                    )}
                    <Space size={4} style={{ flexShrink: 0 }}>
                      {isRenaming ? (
                        <>
                          <Button size="small" type="primary" onClick={onRenameDoc}>Guardar</Button>
                          <Button size="small" onClick={() => { setRenamingDoc(null); setRenameValue(""); }}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <Tooltip title="Descargar / Ver">
                            <Button size="small" icon={<DownloadOutlined />}
                              onClick={() => openDocUrl(doc.name)} />
                          </Tooltip>
                          <Tooltip title="Renombrar">
                            <Button size="small" icon={<EditOutlined />}
                              onClick={() => { setRenamingDoc(doc.name); setRenameValue(displayName); }} />
                          </Tooltip>
                          <Popconfirm
                            title="¿Eliminar este documento?"
                            okText="Eliminar"
                            cancelText="Cancelar"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => onDeleteDoc(doc.name)}
                          >
                            <Tooltip title="Eliminar">
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Tooltip>
                          </Popconfirm>
                        </>
                      )}
                    </Space>
                  </div>
                );
              })}
            </Space>
          )}
        </Card>
      )}
      {/* ── Modal cambio de habitación ── */}
      <Modal
        title={<><SwapOutlined style={{ marginRight: 8 }} />Cambiar habitación{lodger?.full_name ? ` — ${lodger.full_name}` : ""}</>}
        open={reassignOpen}
        onCancel={() => { setReassignOpen(false); reassignForm.resetFields(); setAvailableRooms([]); setReassignError(null); setPayUntilEndOfMonth(false); }}
        footer={null}
        width={520}
        destroyOnHidden
      >
        {reassignError && (
          <Alert type="error" message={reassignError} showIcon style={{ marginBottom: 16 }} />
        )}

        {/* Asignación actual */}
        {activeAssignment && (
          <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 14px", marginBottom: 20, border: "1px solid #E5E7EB" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Habitación actual:</Text>
            <div>
              <Text strong>{activeAssignment.accommodation?.name}</Text>
              <Tag color="geekblue" style={{ marginLeft: 8 }}>Hab. {activeAssignment.room?.number}</Tag>
            </div>
          </div>
        )}

        <Form
          form={reassignForm}
          layout="vertical"
          onFinish={onReassignFinish}
          initialValues={{ move_in_date: dayjs() }}
        >
          <Form.Item
            label="Nuevo alojamiento"
            name="new_accommodation_id"
            rules={[{ required: true, message: "Selecciona un alojamiento" }]}
          >
            <Select
              showSearch
              placeholder="Seleccionar alojamiento..."
              optionFilterProp="label"
              onChange={onAccommodationChange}
              options={allAccommodations.map((a) => ({ value: a.id, label: a.name }))}
            />
          </Form.Item>

          <Form.Item
            label="Nueva habitación (solo libres)"
            name="new_room_id"
            rules={[{ required: true, message: "Selecciona una habitación" }]}
          >
            <Select
              showSearch
              placeholder={loadingRooms ? "Cargando..." : "Seleccionar habitación..."}
              loading={loadingRooms}
              disabled={availableRooms.length === 0 && !loadingRooms}
              optionFilterProp="label"
              options={availableRooms.map((r) => ({
                value: r.id,
                label: `Hab. ${r.number}${r.type ? ` · ${r.type}` : ""}`,
              }))}
              notFoundContent={loadingRooms ? "Cargando..." : "No hay habitaciones libres"}
            />
          </Form.Item>

          <Form.Item
            label="Fecha de Check-In"
            name="move_in_date"
            rules={[{ required: true, message: "Indica la fecha de check-in" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              onChange={() => reassignForm.setFieldValue("end_of_month_amount", undefined)}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={payUntilEndOfMonth}
                onChange={e => {
                  setPayUntilEndOfMonth(e.target.checked);
                  if (!e.target.checked) reassignForm.setFieldValue("end_of_month_amount", undefined);
                }}
              />
              <span style={{ fontSize: 13 }}>El inquilino va a pagar desde la fecha de Check-in hasta fin de mes</span>
            </label>
          </Form.Item>

          {payUntilEndOfMonth && (
            <>
              <Form.Item
                label="Importe a pagar hasta fin de mes"
                name="end_of_month_amount"
                rules={[{ required: true, message: "El importe es obligatorio" }]}
              >
                <InputNumber style={{ width: "100%" }} min={0} precision={2} placeholder="Ej: 450" addonAfter="€" />
              </Form.Item>
              <Form.Item label="Fecha del primer pago de la mensualidad">
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  value={reassignForm.getFieldValue("move_in_date")?.add(1, "month").startOf("month")}
                  disabled
                />
              </Form.Item>
            </>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Importe de la Fianza (€)"
                name="deposit_amount"
                rules={[{ required: true, message: "El importe de la fianza es obligatorio" }]}
              >
                <InputNumber style={{ width: "100%" }} min={0} precision={2} placeholder="Ej: 900" addonAfter="€" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Importe Comisión (€)" name="commission_amount">
                <InputNumber style={{ width: "100%" }} min={0} precision={2} placeholder="Opcional" addonAfter="€" />
              </Form.Item>
            </Col>
          </Row>

          <Row justify="end">
            <Space>
              <Button onClick={() => { setReassignOpen(false); reassignForm.resetFields(); setAvailableRooms([]); setReassignError(null); }}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" icon={<SwapOutlined />} loading={reassignBusy}>
                Confirmar cambio
              </Button>
            </Space>
          </Row>
        </Form>
      </Modal>
    </V2Layout>
  );
}
