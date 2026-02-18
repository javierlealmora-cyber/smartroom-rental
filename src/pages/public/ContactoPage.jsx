import { useState } from "react";
import PublicHeader from "../../components/public/PublicHeader";
import PublicFooter from "../../components/public/PublicFooter";

export default function ContactoPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder — no backend
    setSent(true);
  };

  return (
    <div style={styles.page}>
      <PublicHeader />

      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>Contacto</h1>
        <p style={styles.heroSub}>Estamos aqui para ayudarte. Escribenos y te responderemos lo antes posible.</p>
      </section>

      <section style={styles.section}>
        <div className="contacto-grid">
          {/* Info */}
          <div style={styles.info}>
            <h2 style={styles.infoTitle}>Informacion de contacto</h2>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Email</span>
              <span style={styles.infoValue}>info@smartrentsystems.com</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Telefono</span>
              <span style={styles.infoValue}>+34 900 000 000</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Horario de atencion</span>
              <span style={styles.infoValue}>Lunes a Viernes, 9:00 - 18:00 (CET)</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Tiempo de respuesta</span>
              <span style={styles.infoValue}>Maximo 24 horas habiles</span>
            </div>
          </div>

          {/* Form */}
          <div style={styles.formCard}>
            {sent ? (
              <div style={styles.success}>
                <h3 style={styles.successTitle}>Mensaje enviado</h3>
                <p style={styles.successText}>
                  Gracias por contactarnos. Te responderemos lo antes posible.
                </p>
                <button onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }} style={styles.resetBtn}>
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.field}>
                  <label style={styles.label}>Nombre</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Tu nombre"
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="tu@email.com"
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Asunto</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    placeholder="Como podemos ayudarte?"
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Mensaje</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder="Describe tu consulta..."
                    style={{ ...styles.input, minHeight: 120, resize: "vertical" }}
                    required
                  />
                </div>
                <button type="submit" style={styles.submitBtn}>Enviar mensaje</button>
              </form>
            )}
          </div>
        </div>
      </section>

      <PublicFooter />
      <style>{contactoCss}</style>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    color: "#111827", minHeight: "100vh",
  },
  hero: {
    background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #7c3aed 100%)",
    padding: "60px 24px 48px", textAlign: "center",
  },
  heroTitle: { fontSize: 36, fontWeight: 800, color: "#fff", margin: "0 0 12px" },
  heroSub: { fontSize: 17, color: "rgba(255,255,255,0.85)", margin: 0, maxWidth: 540, marginLeft: "auto", marginRight: "auto" },
  section: { maxWidth: 1000, margin: "0 auto", padding: "60px 24px 80px" },

  info: { display: "flex", flexDirection: "column", gap: 24 },
  infoTitle: { fontSize: 22, fontWeight: 700, margin: "0 0 8px" },
  infoItem: { display: "flex", flexDirection: "column", gap: 4 },
  infoLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 15, color: "#111827", fontWeight: 500 },

  formCard: {
    background: "#fff", borderRadius: 16, padding: 32,
    border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  form: { display: "flex", flexDirection: "column", gap: 20 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  input: {
    padding: "12px 16px", borderRadius: 10, border: "1px solid #d1d5db",
    fontSize: 15, color: "#111827", outline: "none",
  },
  submitBtn: {
    width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff",
    fontSize: 16, fontWeight: 700, cursor: "pointer",
  },
  success: { textAlign: "center", padding: 20 },
  successTitle: { fontSize: 20, fontWeight: 700, color: "#059669", margin: "0 0 8px" },
  successText: { fontSize: 15, color: "#6b7280", margin: "0 0 24px" },
  resetBtn: {
    padding: "10px 24px", borderRadius: 8, border: "1px solid #d1d5db",
    background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer",
  },
};

const contactoCss = `
  .contacto-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 48px; align-items: start; }
  @media (max-width: 768px) { .contacto-grid { grid-template-columns: 1fr; gap: 32px; } }
`;
