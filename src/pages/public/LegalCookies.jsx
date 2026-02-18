import PublicHeader from "../../components/public/PublicHeader";
import PublicFooter from "../../components/public/PublicFooter";

export default function LegalCookies() {
  return (
    <div style={styles.page}>
      <PublicHeader />
      <section style={styles.section}>
        <div style={styles.container}>
          <h1 style={styles.title}>Politica de cookies</h1>
          <p style={styles.updated}>Ultima actualizacion: 13 de febrero de 2026</p>

          <h2 style={styles.h2}>1. Que son las cookies</h2>
          <p style={styles.p}>
            Las cookies son pequenos archivos de texto que se almacenan en tu navegador cuando
            visitas un sitio web. Se utilizan para recordar tus preferencias, mejorar la
            experiencia de usuario y analizar el uso del sitio.
          </p>

          <h2 style={styles.h2}>2. Cookies que utilizamos</h2>
          <p style={styles.p}>
            <strong>Cookies esenciales:</strong> Son necesarias para el funcionamiento basico
            de la plataforma, incluyendo la autenticacion de usuario y la gestion de sesion.
            Estas cookies no pueden desactivarse.
          </p>
          <p style={styles.p}>
            <strong>Cookies de preferencias:</strong> Permiten recordar tus ajustes de configuracion,
            como el idioma o el tema visual seleccionado.
          </p>
          <p style={styles.p}>
            <strong>Cookies analiticas:</strong> Nos ayudan a entender como se utiliza la plataforma
            para poder mejorar el servicio. Los datos se recopilan de forma anonima.
          </p>

          <h2 style={styles.h2}>3. Cookies de terceros</h2>
          <p style={styles.p}>
            Utilizamos servicios de terceros que pueden establecer sus propias cookies:
            Stripe (procesamiento de pagos) y Supabase (autenticacion). Cada proveedor
            tiene su propia politica de cookies.
          </p>

          <h2 style={styles.h2}>4. Gestion de cookies</h2>
          <p style={styles.p}>
            Puedes gestionar las cookies desde la configuracion de tu navegador. Ten en cuenta
            que desactivar algunas cookies puede afectar al funcionamiento de la plataforma.
            A continuacion, los enlaces para gestionar cookies en los navegadores mas comunes:
          </p>
          <ul style={styles.list}>
            <li>Google Chrome: Configuracion &gt; Privacidad y seguridad &gt; Cookies</li>
            <li>Mozilla Firefox: Opciones &gt; Privacidad y seguridad</li>
            <li>Safari: Preferencias &gt; Privacidad</li>
            <li>Microsoft Edge: Configuracion &gt; Cookies y permisos de sitios</li>
          </ul>

          <h2 style={styles.h2}>5. Actualizaciones</h2>
          <p style={styles.p}>
            Esta politica de cookies puede actualizarse periodicamente para reflejar cambios
            en las cookies que utilizamos o por motivos legales. Te recomendamos revisarla
            regularmente.
          </p>

          <h2 style={styles.h2}>6. Contacto</h2>
          <p style={styles.p}>
            Si tienes preguntas sobre nuestra politica de cookies, puedes contactarnos en
            info@smartrentsystems.com.
          </p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

const styles = {
  page: { fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", color: "#111827" },
  section: { padding: "48px 24px 80px" },
  container: { maxWidth: 720, margin: "0 auto" },
  title: { fontSize: 32, fontWeight: 800, margin: "0 0 8px" },
  updated: { fontSize: 13, color: "#9ca3af", margin: "0 0 40px" },
  h2: { fontSize: 20, fontWeight: 700, margin: "32px 0 12px" },
  p: { fontSize: 15, color: "#4b5563", lineHeight: 1.7, margin: "0 0 16px" },
  list: { fontSize: 15, color: "#4b5563", lineHeight: 1.8, paddingLeft: 24 },
};
