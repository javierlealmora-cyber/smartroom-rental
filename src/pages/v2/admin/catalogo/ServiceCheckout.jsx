// src/pages/v2/admin/catalogo/ServiceCheckout.jsx
// Ruta: /v2/admin/catalogo/:serviceId/checkout/:planId
// Formulario de contratación de un plan de servicio SaaS.
// No integra pasarela de pago — registra la suscripción directamente.

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Button, Form, Input, Select, Skeleton, message } from "antd";
import {
  ArrowLeftOutlined, CreditCardOutlined, CheckCircleFilled,
  LockOutlined, SafetyCertificateOutlined, ShoppingOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { getSaasService, listPlans, listFeatures } from "../../../../services/saasServices.service";
import { supabase } from "../../../../services/supabaseClient";

const { Option } = Select;

// ── Países ────────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "ES", name: "España" },
  { code: "PT", name: "Portugal" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
  { code: "IT", name: "Italia" },
  { code: "GB", name: "Reino Unido" },
  { code: "NL", name: "Países Bajos" },
  { code: "BE", name: "Bélgica" },
  { code: "MX", name: "México" },
  { code: "AR", name: "Argentina" },
  { code: "CO", name: "Colombia" },
];

function fmtPrice(plan) {
  if (!plan) return null;
  const monthly = plan.monthly_price != null ? Number(plan.monthly_price) : null;
  const annual  = plan.annual_price  != null ? Number(plan.annual_price)  : null;
  // fallback campos legacy
  const price   = monthly ?? (plan.price_amount != null ? Number(plan.price_amount) : null);
  const period  = plan.billing_period === "annually" ? "año" : "mes";
  return price != null ? { price, period, monthly, annual } : null;
}

function featLabel(feat) {
  return feat.config?._name || feat.feature_code;
}

// ── Resumen del pedido ────────────────────────────────────────────────────────
function OrderSummary({ service, plan, features, billingCycle, onToggleCycle }) {
  const pricing = fmtPrice(plan);
  const monthlyPrice = pricing?.monthly ?? pricing?.price;
  const annualPrice  = pricing?.annual;
  const showToggle   = monthlyPrice != null && annualPrice != null;

  const displayPrice  = billingCycle === "annual" && annualPrice != null ? annualPrice : monthlyPrice;
  const displayPeriod = billingCycle === "annual" ? "año" : "mes";

  // Ahorro al pasar a anual
  const saving = monthlyPrice != null && annualPrice != null
    ? (monthlyPrice * 12 - annualPrice).toFixed(2)
    : null;

  return (
    <div style={{
      background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16,
      overflow: "hidden", position: "sticky", top: 24,
    }}>
      {/* Toggle anual */}
      {showToggle && (
        <button
          onClick={onToggleCycle}
          style={{
            width: "100%", padding: "12px 20px", border: "none", cursor: "pointer",
            background: billingCycle === "annual" ? "#ECFDF5" : "#F0F9FF",
            borderBottom: "1px solid #E5E7EB",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {billingCycle === "annual" ? "✓ Plan Anual activo" : "Cambiar a plan anual y ahorrar"}
          </span>
          {saving && (
            <span style={{ fontSize: 13, fontWeight: 800, color: "#059669" }}>
              {billingCycle === "annual" ? `Ahorras ${saving} €` : `${saving} €`}
            </span>
          )}
        </button>
      )}

      <div style={{ padding: "20px 20px 8px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Tu pedido
        </div>

        {/* Cabecera producto */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>Producto</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" }}>Subtotal</span>
        </div>

        {/* Línea del plan */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #F3F4F6" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2438" }}>{service?.name}</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{plan?.name}</div>
            {displayPrice != null && (
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                {displayPrice % 1 === 0 ? displayPrice.toFixed(0) : displayPrice.toFixed(2)} €/{displayPeriod}
              </div>
            )}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A2438", whiteSpace: "nowrap" }}>
            {displayPrice != null
              ? `${displayPrice % 1 === 0 ? displayPrice.toFixed(0) : displayPrice.toFixed(2)} €`
              : "A consultar"}
          </div>
        </div>

        {/* Características */}
        {features.length > 0 && (
          <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {features.map((f) => (
              <li key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}>
                <CheckCircleFilled style={{ color: "#10B981", fontSize: 13, flexShrink: 0 }} />
                {featLabel(f)}
              </li>
            ))}
          </ul>
        )}

        {/* Subtotal / Total */}
        <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>Subtotal</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1A2438" }}>
              {displayPrice != null ? `${displayPrice % 1 === 0 ? displayPrice.toFixed(0) : displayPrice.toFixed(2)} €` : "—"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1A2438" }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#1A2438" }}>
              {displayPrice != null ? `${displayPrice % 1 === 0 ? displayPrice.toFixed(0) : displayPrice.toFixed(2)} €` : "—"}
            </span>
          </div>
          {displayPrice != null && (
            <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "right" }}>IVA no incluido (21%)</div>
          )}
        </div>
      </div>

      {/* Sellos seguridad */}
      <div style={{ padding: "12px 20px 16px", background: "#F9FAFB", borderTop: "1px solid #F3F4F6", display: "flex", gap: 16, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9CA3AF" }}>
          <LockOutlined style={{ fontSize: 13 }} /> Pago seguro
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9CA3AF" }}>
          <SafetyCertificateOutlined style={{ fontSize: 13 }} /> SSL / TLS
        </div>
      </div>
    </div>
  );
}

// ── Formulario de tarjeta (visual, no validado) ───────────────────────────────
function CardInput({ value, onChange, placeholder, maxLength, style = {} }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        width: "100%", padding: "10px 12px", fontSize: 14,
        border: "1px solid #D1D5DB", borderRadius: 8,
        outline: "none", boxSizing: "border-box", color: "#1A2438",
        fontFamily: "'Courier New', monospace", letterSpacing: "0.05em",
        ...style,
      }}
    />
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ServiceCheckout() {
  const { serviceId, planId } = useParams();
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const [form] = Form.useForm();

  const [service,      setService]      = useState(null);
  const [plan,         setPlan]         = useState(null);
  const [features,     setFeatures]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");

  // Tarjeta (sin validar)
  const [cardNumber,  setCardNumber]  = useState("");
  const [cardExpiry,  setCardExpiry]  = useState("");
  const [cardCvc,     setCardCvc]     = useState("");

  useEffect(() => {
    if (!clientAccountId) return;
    Promise.all([
      getSaasService(serviceId),
      listPlans(serviceId),
    ]).then(async ([svc, plans]) => {
      setService(svc);
      const found = plans.find((p) => p.id === planId);
      if (!found) { setError("Plan no encontrado"); setLoading(false); return; }
      setPlan(found);
      const feats = await listFeatures(planId);
      setFeatures(feats);
      setLoading(false);
    }).catch((e) => { setError(e.message); setLoading(false); });
  }, [serviceId, planId, clientAccountId]);

  const handleSubmit = async () => {
    if (!clientAccountId) {
      message.error("No se pudo identificar tu cuenta. Recarga la página.");
      return;
    }
    try {
      await form.validateFields();
    } catch {
      message.warning("Por favor completa todos los campos obligatorios.");
      return;
    }
    setSubmitting(true);
    try {
      const values = form.getFieldsValue();

      const payload = {
        client_account_id:    clientAccountId,
        saas_service_id:      serviceId,
        saas_service_plan_id: planId,
        status:               "active",
        activated_at:         new Date().toISOString(),
        billing_starts_at:    new Date().toISOString(),
        notes: [
          `Ciclo: ${billingCycle === "annual" ? "anual" : "mensual"}`,
          values.firstName ? `Contacto: ${values.firstName}` : null,
          values.email     ? `Email: ${values.email}`         : null,
          values.country   ? `País: ${values.country}`        : null,
        ].filter(Boolean).join(" · "),
      };

      const { error: dbError } = await supabase
        .from("saas_service_subscriptions")
        .upsert(payload, { onConflict: "client_account_id,saas_service_id" });

      if (dbError) throw new Error(dbError.message);
      setSuccess(true);
    } catch (e) {
      message.error("Error al procesar el pedido: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Pantalla de éxito ────────────────────────────────────────────────────────
  if (success) {
    return (
      <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
        <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", background: "#ECFDF5",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <CheckCircleFilled style={{ fontSize: 44, color: "#10B981" }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1A2438", margin: "0 0 8px" }}>
            ¡Servicio contratado!
          </h1>
          <p style={{ fontSize: 16, color: "#6B7280", margin: "0 0 32px" }}>
            <strong>{plan?.name}</strong> de <strong>{service?.name}</strong> está activo en tu cuenta.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Button
              size="large" style={{ borderRadius: 10 }}
              onClick={() => navigate("/v2/admin/catalogo")}
            >
              Volver al catálogo
            </Button>
            <Button
              type="primary" size="large"
              style={{ background: "#0B2E6D", borderColor: "#0B2E6D", borderRadius: 10 }}
              onClick={() => navigate("/v2/admin/gestion-servicios")}
            >
              Ver mis servicios
            </Button>
          </div>
        </div>
      </V2Layout>
    );
  }

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* ── Breadcrumb ────────────────────────────────────────────────── */}
        <Button
          type="text" icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/v2/admin/catalogo/${serviceId}`)}
          style={{ paddingLeft: 0, color: "#6B7280", marginBottom: 16, fontSize: 14 }}
        >
          Volver a planes
        </Button>

        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#1A2438", margin: "0 0 28px", letterSpacing: "-0.4px" }}>
          Checkout
        </h1>

        {loading && <Skeleton active paragraph={{ rows: 10 }} />}
        {!loading && error && <Alert type="error" message={error} showIcon />}

        {!loading && !error && service && plan && (
          <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>

            {/* ── Columna izquierda: formulario ──────────────────────────── */}
            <div style={{ flex: "1 1 420px", minWidth: 0 }}>

              {/* Número de activación (WhatsApp del servicio si aplica) */}
              {service.code?.includes("whatsapp") || service.code?.includes("wa") || service.name?.toLowerCase().includes("whatsapp") ? (
                <div style={{
                  background: "#F9FAFB", border: "1px solid #E5E7EB",
                  borderRadius: 12, padding: "16px 20px", marginBottom: 20,
                }}>
                  <Form.Item
                    label={
                      <span style={{ fontSize: 13 }}>
                        Número de activación{" "}
                        <span style={{ color: "#6B7280", fontSize: 12 }}>(nº que usarás para mensajería)</span>
                      </span>
                    }
                    style={{ margin: 0 }}
                    required
                  >
                    <Input
                      prefix={<span style={{ fontSize: 16 }}>🇪🇸</span>}
                      placeholder="+34 612 34 56 78"
                      size="large"
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>
                </div>
              ) : null}

              {/* Datos de facturación */}
              <div style={{
                background: "#fff", border: "1px solid #E5E7EB",
                borderRadius: 12, padding: "20px",
              }}>
                <Form form={form} layout="vertical" size="middle">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Form.Item name="firstName" label="Nombre" rules={[{ required: true, message: "Requerido" }]} style={{ margin: 0 }}>
                      <Input placeholder="Nombre completo" style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Email válido" }]} style={{ margin: 0 }}>
                      <Input placeholder="correo@empresa.com" style={{ borderRadius: 8 }} />
                    </Form.Item>
                  </div>

                  <Form.Item name="address" label="Dirección" rules={[{ required: true, message: "Requerido" }]} style={{ marginTop: 12, marginBottom: 0 }}>
                    <Input placeholder="Calle, número, piso..." style={{ borderRadius: 8 }} />
                  </Form.Item>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                    <Form.Item name="country" label="País / Región" rules={[{ required: true, message: "Selecciona un país" }]} style={{ margin: 0 }}>
                      <Select placeholder="Selecciona..." style={{ borderRadius: 8 }} defaultValue="ES">
                        {COUNTRIES.map((c) => (
                          <Option key={c.code} value={c.code}>{c.name}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="state" label="Provincia / Estado" style={{ margin: 0 }}>
                      <Input placeholder="Provincia..." style={{ borderRadius: 8 }} />
                    </Form.Item>
                  </div>
                </Form>
              </div>

              {/* Tarjeta de crédito (visual, no validada) */}
              <div style={{
                background: "#F9FAFB", border: "1px solid #E5E7EB",
                borderRadius: 12, padding: "20px", marginTop: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                    <CreditCardOutlined /> Número de tarjeta
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["VISA", "MC", "AMEX"].map((b) => (
                      <span key={b} style={{
                        fontSize: 9, fontWeight: 800, padding: "2px 6px",
                        border: "1px solid #D1D5DB", borderRadius: 4, color: "#374151",
                        background: "#fff",
                      }}>
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                <CardInput
                  value={cardNumber}
                  onChange={setCardNumber}
                  placeholder="1234 1234 1234 1234"
                  maxLength={19}
                  style={{ marginBottom: 10 }}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Fecha de vencimiento</div>
                    <CardInput
                      value={cardExpiry}
                      onChange={setCardExpiry}
                      placeholder="MM / YY"
                      maxLength={7}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Código de seguridad</div>
                    <CardInput
                      value={cardCvc}
                      onChange={setCardCvc}
                      placeholder="CVC"
                      maxLength={4}
                    />
                  </div>
                </div>

                <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
                  Al proporcionar tu información de tarjeta autorizas a SmartRoom Rental a cobrar según los términos del plan contratado.
                </p>
              </div>

              {/* Aviso legal + botón */}
              <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", margin: "14px 0 10px" }}>
                Al realizar el pedido aceptas los{" "}
                <span style={{ color: "#2563EB", cursor: "pointer" }}>Términos y Condiciones</span>{" "}
                de SmartRoom Rental
              </p>

              <Button
                type="primary" block size="large"
                icon={<ShoppingOutlined />}
                loading={submitting}
                onClick={handleSubmit}
                style={{
                  height: 52, fontSize: 16, fontWeight: 800, borderRadius: 12,
                  background: "#10B981", borderColor: "#10B981",
                  letterSpacing: "0.03em",
                }}
              >
                CONTRATAR PLAN
              </Button>
            </div>

            {/* ── Columna derecha: resumen ───────────────────────────────── */}
            <div style={{ flex: "0 0 300px", minWidth: 260 }}>
              <OrderSummary
                service={service}
                plan={plan}
                features={features}
                billingCycle={billingCycle}
                onToggleCycle={() => setBillingCycle(c => c === "monthly" ? "annual" : "monthly")}
              />
            </div>

          </div>
        )}

      </div>
    </V2Layout>
  );
}
