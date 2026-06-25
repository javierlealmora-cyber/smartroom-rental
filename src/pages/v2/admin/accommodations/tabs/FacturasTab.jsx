// src/pages/v2/admin/accommodations/tabs/FacturasTab.jsx
// Tab Facturas: Cargar + Lista + Boletines

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Alert, Button, Card, Col, DatePicker, Descriptions, Divider,
  Form, Input, InputNumber, Modal, Popconfirm, Row, Select,
  Space, Spin, Table, Tag, Typography, Upload,
} from "antd";
import {
  CameraOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
  FileTextOutlined, InboxOutlined, ReloadOutlined, RollbackOutlined, SwapOutlined,
  ThunderboltOutlined, FireOutlined, CloudOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { supabase } from "../../../../../services/supabaseClient";
import { settleEnergyBill, unsettleEnergyBill } from "../../../../../services/energy.service";

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
  
  // Camera states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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
      
      if (!res.ok) {
        await res.text();
        throw new Error(`Error ${res.status}: La función de escaneo con IA no está disponible. Por favor, usa la entrada manual de datos.`);
      }
      
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
    } catch (e) { 
      setScanError(e.message);
      // Mostrar formulario vacío para entrada manual
      setExtracted({});
      form.setFieldsValue({
        utility_type: null,
        supplier: "",
        bill_number: "",
        reference: "",
        issue_date: null,
        period_start: null,
        period_end: null,
        total_kwh: null,
        amount_energy: null,
        amount_power: null,
        amount_meter: null,
        amount_discounts: null,
        amount_other: null,
        amount_taxes: null,
        amount_total: null,
      });
    }
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
        amount_meter: values.amount_meter || 0,
        amount_discounts: values.amount_discounts || 0,
        amount_other: values.amount_other || 0,
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

  // Check camera availability on mount
  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          setCameraAvailable(true);
        }
      } catch (_e) {
        setCameraAvailable(false);
      }
    };
    checkCamera();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const openCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setCameraOpen(true);
      
      // Wait for modal to render, then attach stream to video
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (e) {
      setScanError(`Error al acceder a la cámara: ${e.message}`);
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    
    // Close current stream and open with new facing mode
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const constraints = {
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (e) {
      setScanError(`Error al cambiar cámara: ${e.message}`);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create File object from blob
        const timestamp = new Date().getTime();
        const capturedFile = new File([blob], `factura_${timestamp}.jpg`, { type: 'image/jpeg' });
        
        // Set as current file
        setFile(capturedFile);
        
        // Close camera
        closeCamera();
      }
    }, 'image/jpeg', 0.85);
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
          <Space wrap>
            {cameraAvailable && (
              <Button size="large" icon={<CameraOutlined />} onClick={openCamera}>
                📷 Tomar Foto
              </Button>
            )}
            <Button type="primary" size="large" loading={scanning} disabled={!file} onClick={onScan} icon={<FileTextOutlined />}>
              {scanning ? "Escaneando con IA..." : "Escanear con IA (GPT-4o)"}
            </Button>
            <Button size="large" onClick={() => {
              setExtracted({});
              setScanError(null);
              form.setFieldsValue({
                utility_type: null, supplier: "", bill_number: "", reference: "",
                issue_date: null, period_start: null, period_end: null, total_kwh: null,
                amount_energy: null, amount_power: null, amount_meter: null,
                amount_discounts: null, amount_other: null, amount_taxes: null, amount_total: null,
              });
            }}>
              Entrada Manual
            </Button>
          </Space>
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

      {/* Camera Modal */}
      <Modal
        title="📷 Capturar Factura"
        open={cameraOpen}
        onCancel={closeCamera}
        width={700}
        footer={[
          <Button key="cancel" onClick={closeCamera}>
            Cancelar
          </Button>,
          <Button key="switch" icon={<SwapOutlined />} onClick={switchCamera}>
            Cambiar Cámara
          </Button>,
          <Button key="capture" type="primary" icon={<CameraOutlined />} onClick={capturePhoto}>
            Capturar
          </Button>,
        ]}
        destroyOnClose
      >
        <div style={{ textAlign: 'center' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              maxHeight: '500px',
              borderRadius: '8px',
              backgroundColor: '#000',
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
            Posiciona la factura frente a la cámara y pulsa "Capturar"
          </Text>
        </div>
      </Modal>
    </div>
  );
}

/* ── Lista de Facturas ───────────────────────────────────────────────────── */
function ListaFacturas({ accId, clientAccountId }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [viewingBill, setViewingBill] = useState(null);
  const [viewFileUrl, setViewFileUrl] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [filterYear, setFilterYear] = useState("all");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.from("energy_bills").select("*")
        .eq("accommodation_id", accId)
        .eq("client_account_id", clientAccountId)
        .order("issue_date", { ascending: false });
      if (err) throw new Error(err.message);
      setBills(data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accId, clientAccountId]);

  useEffect(() => { load(); }, [load]);

  // Años disponibles en las facturas
  const availableYears = [...new Set(
    bills.map((b) => b.issue_date ? dayjs(b.issue_date).year() : null).filter(Boolean)
  )].sort((a, b) => b - a);

  // Facturas filtradas por año
  const filteredBills = filterYear === "all"
    ? bills
    : bills.filter((b) => b.issue_date && dayjs(b.issue_date).year() === Number(filterYear));

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

  const onViewBill = async (bill) => {
    setViewingBill(bill);
    setViewFileUrl(null);
    if (bill.storage_path) {
      setLoadingFile(true);
      try {
        const { data, error: urlErr } = await supabase.storage
          .from("energy-bills")
          .createSignedUrl(bill.storage_path, 300);
        if (!urlErr && data?.signedUrl) setViewFileUrl(data.signedUrl);
      } catch (_err) { /* ignore */ }
      finally { setLoadingFile(false); }
    }
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
      await settleEnergyBill(bill.id, clientAccountId);
      load();
    } catch (e) { setError(e.message); }
  };

  const onUnsettle = async (bill) => {
    try {
      await unsettleEnergyBill(bill.id, clientAccountId);
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
        <Button size="small" icon={<EyeOutlined />} onClick={() => onViewBill(b)}>Ver</Button>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingBill(b); editForm.setFieldsValue({ supplier: b.supplier, bill_number: b.bill_number, issue_date: b.issue_date ? dayjs(b.issue_date) : null, period_start: b.period_start ? dayjs(b.period_start) : null, period_end: b.period_end ? dayjs(b.period_end) : null, total_kwh: b.total_kwh, amount_energy: b.amount_energy, amount_power: b.amount_power, amount_meter: b.amount_meter, amount_discounts: b.amount_discounts, amount_other: b.amount_other, amount_taxes: b.amount_taxes, amount_total: b.amount_total }); }}>Editar</Button>
        {b.status !== "settled" && (
          <Popconfirm title="¿Repartir esta factura?" description="Se generarán boletines para cada inquilino." onConfirm={() => onSettle(b)} okText="Repartir" cancelText="Cancelar">
            <Button size="small" type="primary">Repartir</Button>
          </Popconfirm>
        )}
        {b.status === "settled" && (
          <Popconfirm
            title="¿Borrar el reparto de esta factura?"
            description={
              <span>
                Se eliminarán todos los boletines generados,<br />
                <strong>incluidos los que ya se publicaron a los inquilinos.</strong><br />
                La factura volverá al estado <em>Validada</em> para poder repartirse de nuevo.
              </span>
            }
            onConfirm={() => onUnsettle(b)}
            okText="Sí, borrar reparto"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" icon={<RollbackOutlined />}>Borrar reparto</Button>
          </Popconfirm>
        )}
        <Popconfirm title="¿Eliminar esta factura?" description={b.status === "settled" ? "Se eliminarán también los repartos y boletines." : "Esta acción no se puede deshacer."} onConfirm={() => onDelete(b)} okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ];

  const [activeType, setActiveType] = useState("electricity");
  const activeBills = filteredBills.filter((b) => b.utility_type === activeType);

  return (
    <div>
      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} style={{ marginBottom: 12 }} />}

      {/* Sub-tabs de suministro */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E5E7EB", marginBottom: 16 }}>
        {TYPES.map((type) => {
          const count = bills.filter((b) => b.utility_type === type).length;
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", background: "none", border: "none", cursor: "pointer",
                borderBottom: isActive ? "2px solid #0071E3" : "2px solid transparent",
                marginBottom: -2,
                color: isActive ? "#0071E3" : "#6B7280",
                fontWeight: isActive ? 700 : 500, fontSize: 14,
              }}
            >
              {UTILITY_ICONS[type]}
              {UTILITY_LABELS[type]}
              <Tag color={isActive ? UTILITY_COLORS[type] : "default"} style={{ fontSize: 11, marginLeft: 2 }}>
                {count}
              </Tag>
            </button>
          );
        })}
      </div>

      {/* Filtro de año + botón actualizar */}
      <Row gutter={[12, 8]} align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Select
            style={{ width: 160 }}
            value={filterYear}
            onChange={setFilterYear}
            options={[
              { value: "all", label: "Todos los años" },
              ...availableYears.map((y) => ({ value: String(y), label: String(y) })),
            ]}
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>
        </Col>
      </Row>

      {/* Tabla del suministro activo */}
      {loading
        ? <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
        : activeBills.length === 0
          ? <Text type="secondary">No hay facturas de {UTILITY_LABELS[activeType]}{filterYear !== "all" ? ` en ${filterYear}` : ""}</Text>
          : <Table rowKey="id" columns={cols} dataSource={activeBills} pagination={{ pageSize: 15 }} size="small" scroll={{ x: true }} />
      }

      {/* Modal Ver factura */}
      <Modal
        title={`Factura — ${viewingBill?.bill_number ?? ""}`}
        open={!!viewingBill}
        onCancel={() => { setViewingBill(null); setViewFileUrl(null); }}
        footer={
          <Space>
            {viewFileUrl && <Button type="primary" icon={<EyeOutlined />} onClick={() => window.open(viewFileUrl, "_blank")}>Abrir PDF</Button>}
            <Button onClick={() => { setViewingBill(null); setViewFileUrl(null); }}>Cerrar</Button>
          </Space>
        }
        width={560}
      >
        {viewingBill && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Tipo" span={1}>
                <Tag color={UTILITY_COLORS[viewingBill.utility_type]} icon={UTILITY_ICONS[viewingBill.utility_type]}>
                  {UTILITY_LABELS[viewingBill.utility_type] ?? viewingBill.utility_type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Estado" span={1}>
                <Tag color={STATUS_COLORS[viewingBill.status]}>{STATUS_LABELS[viewingBill.status] ?? viewingBill.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Empresa" span={2}>{viewingBill.supplier ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Nº Factura" span={1}>{viewingBill.bill_number ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Referencia" span={1}>{viewingBill.reference ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Fecha emisión" span={1}>{fmtDate(viewingBill.issue_date)}</Descriptions.Item>
              <Descriptions.Item label="Período" span={1}>{fmtDate(viewingBill.period_start)} – {fmtDate(viewingBill.period_end)}</Descriptions.Item>
              <Descriptions.Item label="Consumo (kWh/m³)" span={2}>{viewingBill.total_kwh != null ? `${viewingBill.total_kwh}` : "-"}</Descriptions.Item>
              <Descriptions.Item label="Energía" span={1}>{fmt(viewingBill.amount_energy)}</Descriptions.Item>
              <Descriptions.Item label="Potencia" span={1}>{fmt(viewingBill.amount_power)}</Descriptions.Item>
              <Descriptions.Item label="Alq. contador" span={1}>{fmt(viewingBill.amount_meter)}</Descriptions.Item>
              <Descriptions.Item label="Descuentos" span={1}>{fmt(viewingBill.amount_discounts)}</Descriptions.Item>
              <Descriptions.Item label="Otros" span={1}>{fmt(viewingBill.amount_other)}</Descriptions.Item>
              <Descriptions.Item label="Impuestos" span={1}>{fmt(viewingBill.amount_taxes)}</Descriptions.Item>
              <Descriptions.Item label="TOTAL" span={2}>
                <Text strong style={{ fontSize: 16 }}>{fmt(viewingBill.amount_total)}</Text>
              </Descriptions.Item>
            </Descriptions>
            {loadingFile && <div style={{ textAlign: "center", padding: 8 }}><Spin size="small" /> <Text type="secondary"> Cargando archivo...</Text></div>}
            {!loadingFile && !viewFileUrl && viewingBill.storage_path && (
              <Alert type="warning" message="No se puede cargar el archivo adjunto" showIcon />
            )}
            {!loadingFile && !viewingBill.storage_path && (
              <Alert type="info" message="Esta factura no tiene archivo adjunto" showIcon />
            )}
          </>
        )}
      </Modal>

      <Modal title={`Editar — ${editingBill?.bill_number ?? ""}`} open={!!editingBill} onCancel={() => setEditingBill(null)} footer={null} width={640} destroyOnHidden>
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
  const [filterYear, setFilterYear] = useState("all");
  const [activeType, setActiveType] = useState("electricity");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.from("bulletins")
        .select("*, lodger:profiles(id,full_name,email), room:rooms(id,number), energy_bill:energy_bills(id,bill_number,utility_type,issue_date,period_start,period_end,amount_total)")
        .eq("accommodation_id", accId).order("period_start", { ascending: false });
      if (err) throw new Error(err.message);
      setBulletins(data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accId]);

  useEffect(() => { load(); }, [load]);

  const availableYears = [...new Set(
    bulletins.map((b) => b.period_start ? dayjs(b.period_start).year() : null).filter(Boolean)
  )].sort((a, b) => b - a);

  const filteredBulletins = filterYear === "all"
    ? bulletins
    : bulletins.filter((b) => b.period_start && dayjs(b.period_start).year() === Number(filterYear));

  const activeBulletins = filteredBulletins.filter((b) => b.energy_bill?.utility_type === activeType);

  const cols = [
    { title: "Período", key: "period", width: 150, render: (_, r) => `${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}` },
    { title: "Habitación", key: "room", width: 90, render: (_, r) => r.room ? <Tag>Hab. {r.room.number}</Tag> : "-" },
    { title: "Inquilino", key: "lodger", width: 180, render: (_, r) => r.lodger?.full_name ?? <Text type="secondary">Sin inquilino</Text> },
    { title: "Total asignado", dataIndex: "amount_total", width: 120, render: (v) => <Text strong>{fmt(v)}</Text> },
    { title: "Estado", dataIndex: "status", width: 100, render: (v) => <Tag color={v === "published" ? "blue" : v === "acknowledged" ? "green" : "default"}>{v === "published" ? "Publicado" : v === "acknowledged" ? "Confirmado" : "Borrador"}</Tag> },
    { title: "Acciones", key: "actions", width: 80, render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => setViewBulletin(r)}>Ver</Button> },
  ];

  return (
    <div>
      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} style={{ marginBottom: 12 }} />}

      {/* Sub-tabs de suministro */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E5E7EB", marginBottom: 16 }}>
        {TYPES.map((type) => {
          const count = bulletins.filter((b) => b.energy_bill?.utility_type === type).length;
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", background: "none", border: "none", cursor: "pointer",
                borderBottom: isActive ? "2px solid #0071E3" : "2px solid transparent",
                marginBottom: -2,
                color: isActive ? "#0071E3" : "#6B7280",
                fontWeight: isActive ? 700 : 500, fontSize: 14,
              }}
            >
              {UTILITY_ICONS[type]}
              {UTILITY_LABELS[type]}
              <Tag color={isActive ? UTILITY_COLORS[type] : "default"} style={{ fontSize: 11, marginLeft: 2 }}>
                {count}
              </Tag>
            </button>
          );
        })}
      </div>

      {/* Filtro de año + botón actualizar */}
      <Row gutter={[12, 8]} align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Select
            style={{ width: 160 }}
            value={filterYear}
            onChange={setFilterYear}
            options={[
              { value: "all", label: "Todos los años" },
              ...availableYears.map((y) => ({ value: String(y), label: String(y) })),
            ]}
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>
        </Col>
      </Row>

      {/* Tabla del suministro activo */}
      {loading
        ? <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
        : activeBulletins.length === 0
          ? <Text type="secondary">No hay boletines de {UTILITY_LABELS[activeType]}{filterYear !== "all" ? ` en ${filterYear}` : ""}</Text>
          : <Table rowKey="id" columns={cols} dataSource={activeBulletins} pagination={{ pageSize: 15 }} size="small" scroll={{ x: true }} />
      }

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
