// src/pages/v2/admin/tenants/LodgerServiceCreate.jsx
// Admin — Asignar Servicio a Inquilino
//
// Exporta dos variantes:
//   LodgerServiceModal  → Modal reutilizable (usado en LodgerServicesTab)
//   default             → Página completa con V2Layout (ruta legacy)
//
// Flujo de selección:
//   1. Alojamiento  (siempre habilitado)
//   2. Inquilino    (filtrado por alojamiento; muestra nombre + habitación)
//   3. Servicio     (filtrado por alojamiento; se habilita al elegir alojamiento)
//   4. Resto de campos (cantidad, precio, fechas)

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Col, DatePicker, Form, InputNumber,
  Modal, Row, Select, Space, Typography,
} from "antd";
import { SaveOutlined, TagOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listLodgers } from "../../../../services/lodgers.service";
import { listAccommodations } from "../../../../services/accommodations.service";
import { supabase } from "../../../../services/supabaseClient";

const { Text } = Typography;

const cardTitleStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderLeft: "3px solid #0071E3",
  paddingLeft: 8,
};

// ── Formulario interno (sin contenedor) ───────────────────────────────────────
function LodgerServiceForm({ clientAccountId, onSuccess, onCancel, saving, setSaving, setError, error }) {
  const [form] = Form.useForm();

  const [allLodgers, setAllLodgers]         = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [filteredLodgers, setFilteredLodgers] = useState([]);
  const [accServices, setAccServices]         = useState([]);

  const selectedAccommodation = Form.useWatch("accommodation_id", form);
  const selectedAccServiceId  = Form.useWatch("service_catalog_id", form);

  // Carga inicial
  const loadBase = useCallback(async () => {
    try {
      const [lodgerList, accList] = await Promise.all([
        listLodgers({ status: "active", clientAccountId }),
        listAccommodations({ status: "active" }),
      ]);
      setAllLodgers(lodgerList);
      setAccommodations(accList);
    } catch {
      setAllLodgers([]);
      setAccommodations([]);
    }
  }, [clientAccountId]);

  useEffect(() => { loadBase(); }, [loadBase]);

  // Al cambiar alojamiento: filtrar inquilinos + cargar servicios
  useEffect(() => {
    form.setFieldsValue({
      lodger_id: undefined,
      service_catalog_id: undefined,
      price_applied: undefined,
    });
    if (!selectedAccommodation) {
      setFilteredLodgers([]);
      setAccServices([]);
      return;
    }
    const lodgersInAcc = allLodgers.filter((l) =>
      (l.active_assignment || []).some(
        (a) => !a.move_out_date && a.room?.accommodation_id === selectedAccommodation
      )
    );
    setFilteredLodgers(lodgersInAcc);

    // Carga todos los servicios activos del catálogo del tenant.
    // Si el alojamiento tiene un custom_price en benefits_accommodation lo usará al guardar,
    // pero mostramos el catálogo completo para que el usuario pueda asignar cualquier servicio.
    supabase
      .from("benefits_catalog")
      .select("id, name, unit, unit_price, is_recurring")
      .eq("status", "active")
      .order("name", { ascending: true })
      .then(({ data }) => setAccServices(data || []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccommodation, allLodgers]);

  // Auto-rellenar precio al elegir servicio del catálogo
  const handleServiceChange = (catalogServiceId) => {
    const svc = accServices.find((s) => s.id === catalogServiceId);
    if (svc) form.setFieldValue("price_applied", svc.unit_price ?? 0);
  };

  // Etiqueta del inquilino: nombre + habitación
  function lodgerLabel(l) {
    const assignment = (l.active_assignment || []).find(
      (a) => !a.move_out_date && a.room?.accommodation_id === selectedAccommodation
    );
    const name   = l.full_name || l.email;
    const room   = assignment?.room?.number;
    return room ? `${name} — Hab. ${room}` : name;
  }

  const onFinish = async (values) => {
    setSaving(true);
    if (setError) setError(null);
    try {
      const lodger     = allLodgers.find((l) => l.id === values.lodger_id);
      const assignment = (lodger?.active_assignment || []).find(
        (a) => !a.move_out_date && a.room?.accommodation_id === values.accommodation_id
      );
      const roomId = assignment?.room?.id || null;

      // 1. Buscar o crear el vínculo benefits_accommodation para este alojamiento+servicio.
      //    Si ya existe se reutiliza; si no, se crea con el precio del catálogo.
      let { data: accSvcData, error: accSvcErr } = await supabase
        .from("benefits_accommodation")
        .select("id")
        .eq("accommodation_id", values.accommodation_id)
        .eq("service_id", values.service_catalog_id)
        .maybeSingle();
      if (accSvcErr) throw new Error(accSvcErr.message);

      if (!accSvcData) {
        const selectedCatalogSvc = accServices.find((s) => s.id === values.service_catalog_id);
        const { data: newAccSvc, error: createErr } = await supabase
          .from("benefits_accommodation")
          .insert({
            client_account_id: clientAccountId,
            accommodation_id:  values.accommodation_id,
            service_id:        values.service_catalog_id,
            custom_price:      null, // usa el precio del catálogo
            status:            "active",
          })
          .select("id")
          .single();
        if (createErr) throw new Error(createErr.message);
        accSvcData = newAccSvc;
        // Silenciar lint de variable no usada
        void selectedCatalogSvc;
      }

      // 2. Crear el registro de prestación del inquilino
      const { error: insErr } = await supabase.from("benefits_lodger").insert({
        client_account_id:        clientAccountId,
        lodger_id:                values.lodger_id,
        accommodation_service_id: accSvcData.id,
        room_id:                  roomId,
        start_date:               values.start_date.format("YYYY-MM-DD"),
        end_date:                 values.end_date ? values.end_date.format("YYYY-MM-DD") : null,
        quantity:                 values.quantity ?? 1,
        price_applied:            values.price_applied,
        status:                   "active",
        notes:                    values.notes || null,
      });
      if (insErr) throw new Error(insErr.message);

      form.resetFields();
      onSuccess?.();
    } catch (e) {
      if (setError) setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedSvc = accServices.find((s) => s.id === selectedAccServiceId);

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ quantity: 1 }}>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <div style={{ ...cardTitleStyle, marginBottom: 16 }}>Datos de la asignación de prestación</div>

      <Row gutter={[16, 0]}>
        {/* 1. Alojamiento */}
        <Col xs={24} sm={24} md={8}>
          <Form.Item
            label="Alojamiento"
            name="accommodation_id"
            rules={[{ required: true, message: "Selecciona un alojamiento" }]}
          >
            <Select
              showSearch
              placeholder="Seleccionar alojamiento..."
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
            />
          </Form.Item>
        </Col>

        {/* 2. Inquilino */}
        <Col xs={24} sm={24} md={10}>
          <Form.Item
            label="Inquilino"
            name="lodger_id"
            rules={[{ required: true, message: "Selecciona un inquilino" }]}
          >
            <Select
              showSearch
              disabled={!selectedAccommodation}
              placeholder={
                selectedAccommodation
                  ? filteredLodgers.length === 0 ? "No hay inquilinos en este alojamiento" : "Seleccionar inquilino..."
                  : "Selecciona primero un alojamiento"
              }
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              options={filteredLodgers.map((l) => ({ value: l.id, label: lodgerLabel(l) }))}
            />
          </Form.Item>
        </Col>

        {/* 3. Prestación — cargada desde benefits_catalog */}
        <Col xs={24} sm={24} md={6}>
          <Form.Item
            label="Prestación"
            name="service_catalog_id"
            rules={[{ required: true, message: "Selecciona una prestación" }]}
          >
            <Select
              showSearch
              disabled={!selectedAccommodation}
              placeholder={
                selectedAccommodation
                  ? accServices.length === 0 ? "No hay prestaciones en el catálogo" : "Seleccionar prestación..."
                  : "Selecciona primero un alojamiento"
              }
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              onChange={handleServiceChange}
              options={accServices.map((s) => ({
                value: s.id,
                label: `${s.name} — ${s.unit_price}€/${s.unit}`,
              }))}
            />
          </Form.Item>
        </Col>

        {/* 4. Cantidad */}
        <Col xs={12} sm={6} md={4}>
          <Form.Item label="Cantidad" name="quantity">
            <InputNumber style={{ width: "100%" }} min={1} precision={2} />
          </Form.Item>
        </Col>

        {/* 5. Precio aplicado */}
        <Col xs={12} sm={6} md={5}>
          <Form.Item
            label="Precio aplicado"
            name="price_applied"
            rules={[{ required: true, message: "Introduce el precio" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} precision={2} addonAfter="€" />
          </Form.Item>
        </Col>

        {/* 6. Fecha inicio */}
        <Col xs={24} sm={12} md={7}>
          <Form.Item
            label="Fecha inicio"
            name="start_date"
            rules={[{ required: true, message: "Fecha de inicio requerida" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>

        {/* 7. Fecha fin */}
        <Col xs={24} sm={12} md={8}>
          <Form.Item label="Fecha fin" name="end_date">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
      </Row>

      {selectedSvc && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Prestación: ${selectedSvc.name} · Precio base: ${selectedSvc.unit_price}€/${selectedSvc.unit}${selectedSvc.is_recurring ? " · Recurrente" : ""}`}
        />
      )}

      <Row justify="end">
        <Space>
          <Button onClick={onCancel}>Cancelar</Button>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            Asignar Prestación
          </Button>
        </Space>
      </Row>
    </Form>
  );
}

// ── Modal exportable ──────────────────────────────────────────────────────────
export function LodgerServiceModal({ open, onClose, onSaved }) {
  const { clientAccountId } = useAdminLayout();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const handleClose = () => {
    setError(null);
    onClose?.();
  };

  const handleSuccess = () => {
    setError(null);
    onSaved?.();
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <span>
          <TagOutlined style={{ marginRight: 8, color: "#0071E3" }} />
          Asignar Prestación a Inquilino
        </span>
      }
      footer={null}
      width={820}
      destroyOnClose
    >
      <LodgerServiceForm
        clientAccountId={clientAccountId}
        onSuccess={handleSuccess}
        onCancel={handleClose}
        saving={saving}
        setSaving={setSaving}
        error={error}
        setError={setError}
      />
    </Modal>
  );
}

// ── Página completa legacy (ruta /v2/admin/inquilinos/servicios/nuevo) ────────
export default function LodgerServiceCreate() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Text style={{ fontSize: 22, fontWeight: 700 }}>
              <TagOutlined style={{ marginRight: 10 }} />
              Asignar Prestación a Inquilino
            </Text>
            <div>
              <Text type="secondary">Vincula una prestación del catálogo a un inquilino</Text>
            </div>
          </Col>
        </Row>

        <div style={{ background: "#fff", borderRadius: 10, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <LodgerServiceForm
            clientAccountId={clientAccountId}
            onSuccess={() => navigate("/v2/admin/servicios?tab=inquilinos")}
            onCancel={() => navigate("/v2/admin/servicios?tab=inquilinos")}
            saving={saving}
            setSaving={setSaving}
            error={error}
            setError={setError}
          />
        </div>
      </div>
    </V2Layout>
  );
}
