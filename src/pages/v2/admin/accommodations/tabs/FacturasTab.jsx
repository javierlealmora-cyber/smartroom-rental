// src/pages/v2/admin/accommodations/tabs/FacturasTab.jsx
// Tab Facturas: Cargar + Lista + Boletines

import { useEffect, useState, useCallback } from "react";
import {
  Alert, Button, Card, Col, DatePicker, Descriptions, Divider,
  Form, Input, InputNumber, Modal, Popconfirm, Row, Select,
  Space, Spin, Table, Tag, Typography, Upload,
} from "antd";
import {
  CheckCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
  FileTextOutlined, InboxOutlined, ReloadOutlined,
  ThunderboltOutlined, FireOutlined, CloudOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { supabase } from "../../../../../services/supabaseClient";
import { invokeWithAuth } from "../../../../../services/supabaseInvoke.services";

const { Text, Title } = Typography;
const { Dragger } = Upload;

const UTILITY_LABELS = { electricity: "Electricidad", water: "Agua", gas: "Gas" };
const UTILITY_COLORS = { electricity: "gold", water: "blue", gas: "orange" };
const UTILITY_ICONS = { electricity: <ThunderboltOutlined />, water: <CloudOutlined />, gas: <FireOutlined /> };
const STATUS_LABELS = { pending: "Pendiente", validated: "Validada", settled: "Repartida" };
const STATUS_COLORS = { pending: "default", validated: "processing", settled: "success" };
const TYPES = ["electricity", "water", "gas"];

function fmt(v) { return v == null ? "-" : Number(v).toLocaleString("es-ES", { style: "currency", currency: "EUR" }); }
function fmtDate(d) { return d ? dayjs(d).format("DD/MM/YYYY") : "-"; }

export default function FacturasTab({ accId, subTab, clientAccountId }) {
  if (subTab === "carga")     return <CargarFacturas accId={accId} clientAccountId={clientAccountId} />;
  if (subTab === "lista")     return <ListaFacturas accId={accId} clientAccountId={clientAccountId} />;
  if (subTab === "boletines") return <BoletinesFacturas accId={accId} />;
  return null;
}

/* ── Cargar Facturas ─────────────────────────────────────────────────────── */
function CargarFacturas({ accId, clientAccountId }) {
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [storagePath, setStoragePath] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [form] = Form.useForm();

  const onScan = async () => {
    if (!file) return;
    setScanning(true); setScanError(null); setExtracted(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("accommodation_id", accId);
      fd.append("client_account_id", clientAccountId);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/scan_energy_bill`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: fd,
      });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error?.message || "Error en el escaneo");
      setExtracted(result.extracted);
      setStoragePath(result.storage_path);
      const e = result.extracted;
      form.setFieldsValue({
        utility_type: e.utility_type ?? null,
        supplier: e.supplier ?? "",
        bill_number: e.bill_number ?? "",
        reference: e.reference ?? "",
        issue_date: e.issue_date ? dayjs(e.issue_date) : null,
        period_start: e.period_start ? dayjs(e.period_start) : null,
        period_end: e.period_end ? dayjs(e.period_end) : null,
        total_kwh: e.total_kwh ?? e.total_m3 ?? null,
        amount_energy: e.amount_energy ?? null,
        amount_power: e.amount_power ?? null,
        amount_meter: e.amount_meter ?? null,
        amount_discounts: e.amount_discounts ?? null,
        amount_other: e.amount_other ?? null,
        amount_taxes: e.amount_taxes ?? null,
        amount_total: e.amount_total ?? null,
      });
    } catch (e) { setScanError(e.message); }
    finally { setScanning(false); }
  };

  const onSave = async (values) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("energy_bills").insert({
        client_account_id: clientAccountId,
        accommodation_id: accId,
        utility_type: values.utility_type,
        supplier: values.supplier,
        bill_number: values.bill_number,
        reference: values.reference || null,
        issue_date: values.issue_date?.format("YYYY-MM-DD"),
        period_start: values.period_start?.format("YYYY-MM-DD"),
        period_end: values.period_end?.format("YYYY-MM-DD"),
        total_kwh: values.total_kwh || null,
        amount_energy: values.amount_energy || 0,
        amount_power: values.amount_power || 0,
        amount_meter: values.amount_meter || null,
        amount_discounts: values.amount_discounts || null,
        amount_other: values.amount_other || null,
        amount_taxes: values.amount_taxes || 0,
        amount_total: values.amount_total || 0,
        storage_path: storagePath,
        scan_result: extracted,
        status: "validated",
      });
      if (error) throw new Error(error.message);
      setSaveOk(true); setFile(null); setExtracted(null); setStoragePath(null);
      form.resetFields();
      setTimeout(() => setSaveOk(false), 4000);
    } catch (e) { setScanError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16, color: "#374151" }}>Cargar Factura de Suministro</Title>
      {scanError && <Alert type="error" message={scanError} showIcon closable onClose={() => setScanError(null)} style={{ marginBottom: 12 }} />}
      {saveOk && <Alert type="success" message="Factura guardada correctamente" showIcon style={{ marginBottom: 12 }} />}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Dragger accept=".pdf,.jpg,.jpeg,.png" beforeUpload={(f) => { setFile(f); return false; }}
          onRemove={() => setFile(null)} maxCount={1}
          fileList={file ? [{ uid: "1", name: file.name, status: "done" }] : []}
          style={{ padding: "12px 0" }}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Arrastra la factura aquí o haz clic para seleccionarla</p>
          <p className="ant-upload-hint">Formatos: PDF, JPG, PNG · Máximo 20 MB</p>
        </Dragger>
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <Button type="primary" size="large" loading={scanning} disabled={!file} onClick={onScan} icon={<FileTextOutlined />}>
            {scanning ? "Escaneando con IA..." : "Escanear con IA (GPT-4o)"}
          </Button>
        </div>
      </Card>
      {extracted && (
        <Card title="Datos extraídos — Valida y corrige si es necesario" size="small">
          <Form form={form} layout="vertical" onFinish={onSave}>
            <Row gutter={[12, 0]}>
              <Col xs={24} sm={6} md={4}>
                <Form.Item label="Tipo" name="utility_type" rules={[{ required: true }]}>
                  <Select options={[{ value: "electricity", label: "⚡ Electricidad" }, { value: "water", label: "💧 Agua" }, { value: "gas", label: "🔥 Gas" }]} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={9} md={8}><Form.Item label="Empresa" name="supplier" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col xs={24} sm={9} md={6}><Form.Item label="Nº Factura" name="bill_number" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col xs={24} sm={6} md={6}><Form.Item label="Referencia" name="reference"><Input /></Form.Item></Col>
              <Col xs={12} sm={6} md={4}><Form.Item label="Fecha emisión" name="issue_date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
              <Col xs={12} sm={6} md={4}><Form.Item label="Período inicio" name="period_start" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
              <Col xs={12} sm={6} md={4}><Form.Item label="Período fin" name="period_end" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
              <Col xs={12} sm={6} md={4}><Form.Item label="Consumo (kWh/m³)" name="total_kwh"><InputNumber style={{ width: "100%" }} min={0} step={0.01} /></Form.Item></Col>
            </Row>
            <Divider orientation="left" plain style={{ fontSize: 12, color: "#9CA3AF" }}>Importes (€)</Divider>
            <Row gutter={[12, 0]}>
              {[["amount_energy","Energía"],["amount_power","Potencia"],["amount_meter","Alq. contador"],["amount_discounts","Descuentos"],["amount_other","Otros"],["amount_taxes","IVA/Impuestos"],["amount_total","TOTAL"]].map(([n, l]) => (
                <Col key={n} xs={12} sm={8} md={4}><Form.Item label={l} name={n}><InputNumber style={{ width: "100%" }} min={0} step={0.01} addonAfter="€" /></Form.Item></Col>
              ))}
            </Row>
            <Row justify="end"><Button type="primary" htmlType="submit" loading={saving} icon={<CheckCircleOutlined />} size="large">Guardar Factura</Button></Row>
          </Form>
        </Card>
      )}
    </div>
  );
}

/* ── Lista de Facturas ───────────────────────────────────────────────────── */
function ListaFacturas({ accId, clientAccountId }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.from("energy_bills").select("*")
        .eq("accommodation_id", accId).order("issue_date", { ascending: false });
      if (err) throw new Error(err.message);
      setBills(data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accId]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (bill) => {
    try {
      await supabase.from("energy_settlements").delete().eq("energy_bill_id", bill.id);
      await supabase.from("bulletins").delete().eq("energy_bill_id", bill.id);
      if (bill.storage_path) await supabase.storage.from("energy-bills").remove([bill.storage_path]);
      const { error } = await supabase.from("energy_bills").delete().eq("id", bill.id);
      if (error) throw new Error(error.message);
      load();
    } catch (e) { setError(e.message); }
  };

  const onViewFile = async (bill) => {
    if (!bill.storage_path) return;
    const { data } = await supabase.storage.from("energy-bills").createSignedUrl(bill.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const onSaveEdit = async (values) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("energy_bills").update({
        supplier: values.supplier, bill_number: values.bill_number,
        issue_date: values.issue_date?.format("YYYY-MM-DD"),
        period_start: values.period_start?.format("YYYY-MM-DD"),
        period_end: values.period_end?.format("YYYY-MM-DD"),
        total_kwh: values.total_kwh || null,
        amount_energy: values.amount_energy || 0, amount_power: values.amount_power || 0,
        amount_meter: values.amount_meter || null, amount_discounts: values.amount_discounts || null,
        amount_other: values.amount_other || null, amount_taxes: values.amount_taxes || 0,
        amount_total: values.amount_total || 0,
      }).eq("id", editingBill.id);
      if (error) throw new Error(error.message);
      setEditingBill(null); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const onSettle = async (bill) => {
    try {
      const result = await invokeWithAuth("settle_energy_bill", {
        body: { energy_bill_id: bill.id, accommodation_id: accId, client_account_id: clientAccountId },
      });
      if (!result?.ok) throw new Error(result?.error?.message || "Error al repartir");
      load();
    } catch (e) { setError(e.message); }
  };

  const cols = [
    { title: "Nº Factura", dataIndex: "bill_number", key: "bill_number", width: 130 },
    { title: "Emisión", dataIndex: "issue_date", key: "issue_date", width: 100, render: fmtDate },
    { title: "Período", key: "period", width: 180, render: (_, r) => `${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}` },
    { title: "Total", dataIndex: "amount_total", key: "amount_total", width: 100, render: (v) => <Text strong>{fmt(v)}</Text> },
    { title: "Estado", dataIndex: "status", key: "status", width: 100, render: (v) => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v] || v}</Tag> },
    { title: "Acciones", key: "actions", render: (_, b) => (
      <Space size="small">
        {b.storage_path && <Button size="small" icon={<EyeOutlined />} onClick={() => onViewFile(b)}>Ver</Button>}
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingBill(b); editForm.setFieldsValue({ supplier: b.supplier, bill_number: b.bill_number, issue_date: b.issue_date ? dayjs(b.issue_date) : null, period_start: b.period_start ? dayjs(b.period_start) : null, period_end: b.period_end ? dayjs(b.period_end) : null, total_kwh: b.total_kwh, amount_energy: b.amount_energy, amount_power: b.amount_power, amount_meter: b.amount_meter, amount_discounts: b.amount_discounts, amount_other: b.amount_other, amount_taxes: b.amount_taxes, amount_total: b.amount_total }); }}>Editar</Button>
        {b.status !== "settled" && (
          <Popconfirm title="¿Repartir esta factura?" description="Se generarán boletines para cada inquilino." onConfirm={() => onSettle(b)} okText="Repartir" cancelText="Cancelar">
            <Button size="small" type="primary">Repartir</Button>
          </Popconfirm>
        )}
        <Popconfirm title="¿Eliminar esta factura?" description={b.status === "settled" ? "Se eliminarán también los repartos y boletines." : "Esta acción no se puede deshacer."} onConfirm={() => onDelete(b)} okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16, color: "#374151" }}>Lista de Facturas</Title>
      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} style={{ marginBottom: 12 }} />}
      <Button icon={<ReloadOutlined />} onClick={load} style={{ marginBottom: 16 }}>Actualizar</Button>
      {TYPES.map((type) => {
        const tb = bills.filter((b) => b.utility_type === type);
        return (
          <Card key={type} size="small" style={{ marginBottom: 16 }}
            title={<Space>{UTILITY_ICONS[type]}<Text strong>{UTILITY_LABELS[type]}</Text><Tag color={UTILITY_COLORS[type]}>{tb.length}</Tag></Space>}>
            {loading ? <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
              : tb.length === 0 ? <Text type="secondary">No hay facturas de {UTILITY_LABELS[type]}</Text>
              : <Table rowKey="id" columns={cols} dataSource={tb} pagination={false} size="small" scroll={{ x: true }} />}
          </Card>
        );
      })}
      <Modal title={`Editar — ${editingBill?.bill_number ?? ""}`} open={!!editingBill} onCancel={() => setEditingBill(null)} footer={null} width={640} destroyOnClose>
        <Form form={editForm} layout="vertical" onFinish={onSaveEdit}>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12}><Form.Item label="Empresa" name="supplier" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item label="Nº Factura" name="bill_number" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={8}><Form.Item label="Fecha emisión" name="issue_date"><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col xs={8}><Form.Item label="Período inicio" name="period_start"><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col xs={8}><Form.Item label="Período fin" name="period_end"><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
            {[["total_kwh","Consumo kWh/m³"],["amount_energy","Energía (€)"],["amount_power","Potencia (€)"],["amount_meter","Alq. contador (€)"],["amount_discounts","Descuentos (€)"],["amount_other","Otros (€)"],["amount_taxes","Impuestos (€)"],["amount_total","TOTAL (€)"]].map(([n,l]) => (
              <Col key={n} xs={12} sm={6}><Form.Item label={l} name={n}><InputNumber style={{ width: "100%" }} min={0} step={0.01} /></Form.Item></Col>
            ))}
          </Row>
          <Row justify="end"><Space><Button onClick={() => setEditingBill(null)}>Cancelar</Button><Button type="primary" htmlType="submit" loading={saving}>Guardar</Button></Space></Row>
        </Form>
      </Modal>
    </div>
  );
}

/* ── Boletines de Facturas ───────────────────────────────────────────────── */
function BoletinesFacturas({ accId }) {
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewBulletin, setViewBulletin] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.from("bulletins")
        .select("*, lodger:lodgers(id,full_name,email), room:rooms(id,number), energy_bill:energy_bills(id,bill_number,utility_type,issue_date,period_start,period_end,amount_total)")
        .eq("accommodation_id", accId).order("period_start", { ascending: false });
      if (err) throw new Error(err.message);
      setBulletins(data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accId]);

  useEffect(() => { load(); }, [load]);

  const cols = [
    { title: "Período", key: "period", width: 150, render: (_, r) => `${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}` },
    { title: "Tipo", key: "type", width: 110, render: (_, r) => { const t = r.energy_bill?.utility_type; return t ? <Tag color={UTILITY_COLORS[t]} icon={UTILITY_ICONS[t]}>{UTILITY_LABELS[t]}</Tag> : "-"; } },
    { title: "Habitación", key: "room", width: 90, render: (_, r) => r.room ? <Tag>Hab. {r.room.number}</Tag> : "-" },
    { title: "Inquilino", key: "lodger", width: 180, render: (_, r) => r.lodger?.full_name ?? <Text type="secondary">Sin inquilino</Text> },
    { title: "Total asignado", dataIndex: "amount_total", width: 120, render: (v) => <Text strong>{fmt(v)}</Text> },
    { title: "Estado", dataIndex: "status", width: 100, render: (v) => <Tag color={v === "published" ? "blue" : v === "acknowledged" ? "green" : "default"}>{v === "published" ? "Publicado" : v === "acknowledged" ? "Confirmado" : "Borrador"}</Tag> },
    { title: "Acciones", key: "actions", width: 80, render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => setViewBulletin(r)}>Ver</Button> },
  ];

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16, color: "#374151" }}>Boletines de Facturas</Title>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
      <Button icon={<ReloadOutlined />} onClick={load} style={{ marginBottom: 16 }}>Actualizar</Button>
      {TYPES.map((type) => {
        const tb = bulletins.filter((b) => b.energy_bill?.utility_type === type);
        return (
          <Card key={type} size="small" style={{ marginBottom: 16 }}
            title={<Space>{UTILITY_ICONS[type]}<Text strong>{UTILITY_LABELS[type]}</Text><Tag color={UTILITY_COLORS[type]}>{tb.length}</Tag></Space>}>
            {loading ? <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
              : tb.length === 0 ? <Text type="secondary">No hay boletines de {UTILITY_LABELS[type]}</Text>
              : <Table rowKey="id" columns={cols} dataSource={tb} pagination={{ pageSize: 10 }} size="small" scroll={{ x: true }} />}
          </Card>
        );
      })}
      <Modal title={`Boletín — Hab. ${viewBulletin?.room?.number ?? ""} · ${viewBulletin?.lodger?.full_name ?? "Sin inquilino"}`}
        open={!!viewBulletin} onCancel={() => setViewBulletin(null)}
        footer={<Button onClick={() => setViewBulletin(null)}>Cerrar</Button>} width={500}>
        {viewBulletin && (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Tipo">{UTILITY_LABELS[viewBulletin.energy_bill?.utility_type] ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Factura">{viewBulletin.energy_bill?.bill_number ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Período">{fmtDate(viewBulletin.period_start)} – {fmtDate(viewBulletin.period_end)}</Descriptions.Item>
            <Descriptions.Item label="Días presentes">{viewBulletin.days_present ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="kWh asignados">{viewBulletin.kwh_consumed != null ? `${viewBulletin.kwh_consumed} kWh` : "-"}</Descriptions.Item>
            <Descriptions.Item label="Parte fija">{fmt(viewBulletin.amount_fixed)}</Descriptions.Item>
            <Descriptions.Item label="Parte variable">{fmt(viewBulletin.amount_variable)}</Descriptions.Item>
            <Descriptions.Item label="Servicios">{fmt(viewBulletin.amount_services)}</Descriptions.Item>
            <Descriptions.Item label="TOTAL"><Text strong style={{ fontSize: 16 }}>{fmt(viewBulletin.amount_total)}</Text></Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={viewBulletin.status === "published" ? "blue" : viewBulletin.status === "acknowledged" ? "green" : "default"}>
                {viewBulletin.status === "published" ? "Publicado" : viewBulletin.status === "acknowledged" ? "Confirmado" : "Borrador"}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
