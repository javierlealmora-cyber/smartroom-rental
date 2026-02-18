import { useState } from "react";
import { Link } from "react-router-dom";
import PublicHeader from "../../components/public/PublicHeader";
import PublicFooter from "../../components/public/PublicFooter";

export default function Landing() {
  return (
    <div style={styles.page}>
      <PublicHeader />

      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>
            Gestion inteligente del alquiler de habitaciones
          </h1>
          <p style={styles.heroSub}>
            Plataforma SaaS para propietarios, inversores y agencias que gestionan
            apartamentos con habitaciones. Control de alojamientos, consumos,
            facturacion y servicios en un solo lugar.
          </p>
          <div style={styles.heroCtas}>
            <Link to="/v2/planes" style={styles.btnPrimary}>Ver planes</Link>
            <Link to="/v2/contacto" style={styles.btnOutline}>Contactar</Link>
          </div>
        </div>
      </section>

      {/* Que incluye */}
      <section id="producto" style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Todo lo que necesitas</h2>
          <p style={styles.sectionSub}>
            SmartRoom cubre todo el ciclo de gestion del alquiler de habitaciones
          </p>
          <div className="landing-grid-4">
            {features.map((f) => (
              <div key={f.title} style={styles.featureCard}>
                <div style={styles.featureIcon}>{f.icon}</div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section style={{ ...styles.section, background: "#f9fafb" }}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Como funciona</h2>
          <p style={styles.sectionSub}>
            Empieza a gestionar tus alojamientos en 3 sencillos pasos
          </p>
          <div className="landing-grid-3">
            {steps.map((s, i) => (
              <div key={s.title} style={styles.stepCard}>
                <div style={styles.stepNumber}>{i + 1}</div>
                <h3 style={styles.stepTitle}>{s.title}</h3>
                <p style={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mini planes */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Planes adaptados a tu negocio</h2>
          <p style={styles.sectionSub}>
            Desde propietarios individuales hasta agencias con multiples inmuebles
          </p>
          <div className="landing-grid-3">
            {miniPlans.map((p) => (
              <div key={p.name} style={{ ...styles.miniPlanCard, ...(p.featured ? styles.miniPlanFeatured : {}) }}>
                {p.featured && <span style={styles.badge}>MEJOR CALIDAD-PRECIO</span>}
                <h3 style={styles.miniPlanName}>{p.name}</h3>
                <div style={styles.miniPlanPrice}>
                  <span style={styles.priceAmount}>{p.price}</span>
                  <span style={styles.priceUnit}>/mes</span>
                </div>
                <p style={styles.miniPlanDesc}>{p.desc}</p>
                <Link to="/v2/planes" style={styles.miniPlanCta}>Ver detalle</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ ...styles.section, background: "#f9fafb" }}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Preguntas frecuentes</h2>
          <div style={styles.faqList}>
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section style={styles.ctaSection}>
        <div style={styles.container}>
          <h2 style={{ ...styles.sectionTitle, color: "#fff" }}>Empieza a gestionar tus alojamientos hoy</h2>
          <p style={{ ...styles.sectionSub, color: "rgba(255,255,255,0.8)" }}>
            Registrate gratis y elige el plan que mejor se adapte a tu negocio
          </p>
          <Link to="/v2/registro" style={styles.ctaFinalBtn}>Crear cuenta gratis</Link>
        </div>
      </section>

      <PublicFooter />
      <style>{landingCss}</style>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={styles.faqItem}>
      <button onClick={() => setOpen(!open)} style={styles.faqQ}>
        <span>{q}</span>
        <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>&#9662;</span>
      </button>
      {open && <p style={styles.faqA}>{a}</p>}
    </div>
  );
}

const features = [
  { icon: "\u{1F3E0}", title: "Gestion de alojamientos", desc: "Controla pisos, habitaciones, ocupacion e inquilinos desde un unico panel." },
  { icon: "\u{26A1}", title: "Control de consumos", desc: "Registra consumos diarios, importa facturas electricas y reparte costes automaticamente." },
  { icon: "\u{1F4CB}", title: "Facturacion y liquidacion", desc: "Genera boletines energeticos y liquidaciones con cuadre exacto por inquilino." },
  { icon: "\u{1F465}", title: "Multi-tenant", desc: "Cada empresa tiene su espacio aislado con branding, usuarios y configuracion propia." },
];

const steps = [
  { title: "Registrate", desc: "Crea tu cuenta en minutos y elige el plan adecuado para tu volumen de propiedades." },
  { title: "Configura", desc: "Da de alta tus alojamientos, habitaciones e inquilinos. Personaliza tu branding." },
  { title: "Gestiona", desc: "Controla consumos, genera facturas, boletines y encuestas desde tu dashboard." },
];

const miniPlans = [
  { name: "Basic", price: "29,99\u20AC", desc: "Hasta 3 alojamientos y 20 habitaciones", featured: false },
  { name: "Investor", price: "79,99\u20AC", desc: "Hasta 8 alojamientos con branding personalizado", featured: true },
  { name: "Business", price: "149,99\u20AC", desc: "Alojamientos ilimitados y servicios avanzados", featured: false },
];

const faqs = [
  { q: "Puedo probar SmartRoom antes de contratar?", a: "Si, puedes crear una cuenta gratuita y explorar la plataforma. Solo necesitaras elegir un plan cuando quieras activar tu cuenta de gestion." },
  { q: "Como funciona el reparto de consumos?", a: "SmartRoom calcula automaticamente el coste fijo y variable por dia e inquilino, basandose en la factura electrica y los registros de consumo estimado." },
  { q: "Puedo personalizar la plataforma con mi marca?", a: "Si, los planes Investor, Business y Agency incluyen branding personalizado: logo, colores y dominio." },
  { q: "Que metodos de pago aceptais?", a: "Aceptamos tarjeta de credito y debito a traves de Stripe. Las facturas se generan automaticamente cada mes o ano segun tu ciclo de facturacion." },
  { q: "Puedo cambiar de plan en cualquier momento?", a: "Si, puedes actualizar o reducir tu plan desde el panel de configuracion. Los cambios se aplican en el siguiente ciclo de facturacion." },
  { q: "Que soporte ofreceis?", a: "Todos los planes incluyen soporte por email. Los planes superiores incluyen soporte prioritario y dedicado." },
];

const styles = {
  page: {
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    color: "#111827",
    overflowX: "hidden",
  },
  hero: {
    background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #7c3aed 100%)",
    padding: "80px 24px 100px",
    textAlign: "center",
  },
  heroInner: { maxWidth: 720, margin: "0 auto" },
  heroTitle: { fontSize: 44, fontWeight: 800, color: "#fff", margin: "0 0 20px", lineHeight: 1.15 },
  heroSub: { fontSize: 18, color: "rgba(255,255,255,0.85)", margin: "0 0 36px", lineHeight: 1.6 },
  heroCtas: { display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" },
  btnPrimary: {
    display: "inline-flex", alignItems: "center", padding: "14px 32px", borderRadius: 10,
    background: "#fff", color: "#2563eb", fontSize: 16, fontWeight: 700,
    textDecoration: "none", border: "none", cursor: "pointer",
  },
  btnOutline: {
    display: "inline-flex", alignItems: "center", padding: "14px 32px", borderRadius: 10,
    background: "transparent", color: "#fff", fontSize: 16, fontWeight: 600,
    textDecoration: "none", border: "2px solid rgba(255,255,255,0.4)", cursor: "pointer",
  },
  section: { padding: "80px 24px" },
  container: { maxWidth: 1100, margin: "0 auto" },
  sectionTitle: { fontSize: 32, fontWeight: 800, textAlign: "center", margin: "0 0 12px" },
  sectionSub: { fontSize: 17, color: "#6b7280", textAlign: "center", margin: "0 0 48px", lineHeight: 1.5 },

  featureCard: {
    background: "#fff", borderRadius: 16, padding: 32,
    border: "1px solid #e5e7eb", textAlign: "center",
  },
  featureIcon: { fontSize: 40, marginBottom: 16 },
  featureTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 8px" },
  featureDesc: { fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 },

  stepCard: { textAlign: "center", padding: 24 },
  stepNumber: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 48, height: 48, borderRadius: "50%",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff",
    fontSize: 20, fontWeight: 800, marginBottom: 16,
  },
  stepTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 8px" },
  stepDesc: { fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 },

  miniPlanCard: {
    background: "#fff", borderRadius: 16, padding: 32,
    border: "1px solid #e5e7eb", textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", position: "relative",
  },
  miniPlanFeatured: {
    border: "2px solid #2563eb",
    boxShadow: "0 4px 24px rgba(37,99,235,0.12)",
  },
  badge: {
    position: "absolute", top: -12,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff",
    fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 20,
    letterSpacing: 0.5,
  },
  miniPlanName: { fontSize: 20, fontWeight: 700, margin: "8px 0 4px" },
  miniPlanPrice: { margin: "8px 0 12px" },
  priceAmount: { fontSize: 36, fontWeight: 800, color: "#2563eb" },
  priceUnit: { fontSize: 16, color: "#6b7280" },
  miniPlanDesc: { fontSize: 14, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.4 },
  miniPlanCta: {
    display: "inline-flex", padding: "10px 24px", borderRadius: 8,
    background: "#f3f4f6", color: "#374151", fontSize: 14, fontWeight: 600,
    textDecoration: "none", border: "none", cursor: "pointer",
  },

  faqList: { maxWidth: 720, margin: "0 auto" },
  faqItem: { borderBottom: "1px solid #e5e7eb" },
  faqQ: {
    width: "100%", background: "none", border: "none", cursor: "pointer",
    padding: "20px 0", display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 16, fontWeight: 600, color: "#111827", textAlign: "left",
  },
  faqA: { fontSize: 15, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.6 },

  ctaSection: {
    background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #7c3aed 100%)",
    padding: "80px 24px", textAlign: "center",
  },
  ctaFinalBtn: {
    display: "inline-flex", alignItems: "center", padding: "16px 40px", borderRadius: 10,
    background: "#fff", color: "#2563eb", fontSize: 17, fontWeight: 700,
    textDecoration: "none", border: "none", cursor: "pointer",
  },
};

const landingCss = `
  .landing-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
  .landing-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  @media (max-width: 900px) {
    .landing-grid-4 { grid-template-columns: repeat(2, 1fr); }
    .landing-grid-3 { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .landing-grid-4 { grid-template-columns: 1fr; }
  }
`;
