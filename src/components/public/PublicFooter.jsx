import { Link } from "react-router-dom";

export default function PublicFooter() {
  return (
    <>
      <footer style={styles.footer}>
        <div style={styles.inner}>
          <div className="pf-cols">
            {/* Producto */}
            <div style={styles.col}>
              <h4 style={styles.heading}>Producto</h4>
              <Link to="/v2#producto" style={styles.link}>Funcionalidades</Link>
              <Link to="/v2/planes" style={styles.link}>Planes y precios</Link>
              <Link to="/v2/contacto" style={styles.link}>Contacto</Link>
            </div>

            {/* Legal */}
            <div style={styles.col}>
              <h4 style={styles.heading}>Legal</h4>
              <Link to="/v2/legal/terminos" style={styles.link}>Terminos y condiciones</Link>
              <Link to="/v2/legal/privacidad" style={styles.link}>Politica de privacidad</Link>
              <Link to="/v2/legal/cookies" style={styles.link}>Politica de cookies</Link>
            </div>

            {/* Contacto */}
            <div style={styles.col}>
              <h4 style={styles.heading}>Contacto</h4>
              <span style={styles.text}>info@smartrentsystems.com</span>
              <span style={styles.text}>+34 900 000 000</span>
              <span style={styles.text}>Lun-Vie 9:00 - 18:00</span>
            </div>
          </div>

          <div style={styles.bottom}>
            <span style={styles.copyright}>&copy; 2026 SmartRoom Rental Platform. Todos los derechos reservados.</span>
          </div>
        </div>
      </footer>
      <style>{responsiveCss}</style>
    </>
  );
}

const styles = {
  footer: {
    background: "#111827",
    color: "#9ca3af",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    padding: "48px 0 24px",
  },
  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px",
  },
  col: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  heading: {
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    margin: "0 0 8px",
  },
  link: {
    color: "#9ca3af",
    textDecoration: "none",
    fontSize: 14,
    transition: "color 0.2s",
  },
  text: {
    fontSize: 14,
    color: "#9ca3af",
  },
  bottom: {
    borderTop: "1px solid #1f2937",
    marginTop: 40,
    paddingTop: 20,
    textAlign: "center",
  },
  copyright: {
    fontSize: 13,
    color: "#6b7280",
  },
};

const responsiveCss = `
  .pf-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
  .pf-cols a:hover { color: #fff !important; }
  @media (max-width: 640px) {
    .pf-cols { grid-template-columns: 1fr; gap: 32px; }
  }
`;
