import PublicHeader from "../../components/public/PublicHeader";
import PublicFooter from "../../components/public/PublicFooter";

export default function LegalPrivacidad() {
  return (
    <div style={styles.page}>
      <PublicHeader />
      <section style={styles.section}>
        <div style={styles.container}>
          <h1 style={styles.title}>Politica de privacidad</h1>
          <p style={styles.updated}>Ultima actualizacion: 13 de febrero de 2026</p>

          <h2 style={styles.h2}>1. Responsable del tratamiento</h2>
          <p style={styles.p}>
            El responsable del tratamiento de los datos personales es SmartRoom Rental Platform S.L.,
            con domicilio en Espana. Puedes contactarnos en info@smartroomrental.com para
            cualquier consulta relacionada con la proteccion de datos.
          </p>

          <h2 style={styles.h2}>2. Datos que recopilamos</h2>
          <p style={styles.p}>
            Recopilamos los datos que nos proporcionas al registrarte (email, nombre, telefono),
            los datos de uso de la plataforma y los datos de facturacion necesarios para procesar
            los pagos. Tambien podemos recopilar datos tecnicos como la direccion IP y el tipo
            de navegador.
          </p>

          <h2 style={styles.h2}>3. Finalidad del tratamiento</h2>
          <p style={styles.p}>
            Utilizamos tus datos para: (a) gestionar tu cuenta y proporcionar el servicio contratado,
            (b) procesar pagos y emitir facturas, (c) enviar comunicaciones relacionadas con el servicio,
            (d) mejorar la plataforma y (e) cumplir con nuestras obligaciones legales.
          </p>

          <h2 style={styles.h2}>4. Base legal</h2>
          <p style={styles.p}>
            El tratamiento de tus datos se basa en: la ejecucion del contrato de servicio,
            tu consentimiento explicito para comunicaciones comerciales, nuestro interes
            legitimo en mejorar el servicio, y el cumplimiento de obligaciones legales.
          </p>

          <h2 style={styles.h2}>5. Destinatarios</h2>
          <p style={styles.p}>
            Tus datos pueden ser compartidos con: Stripe (procesamiento de pagos), Supabase
            (almacenamiento de datos), y proveedores de infraestructura necesarios para
            el funcionamiento del servicio. No vendemos tus datos a terceros.
          </p>

          <h2 style={styles.h2}>6. Derechos del usuario</h2>
          <p style={styles.p}>
            Tienes derecho a acceder, rectificar, suprimir, portar tus datos, limitar u
            oponerte al tratamiento, y a no ser objeto de decisiones automatizadas. Puedes
            ejercer estos derechos enviando un email a info@smartroomrental.com.
          </p>

          <h2 style={styles.h2}>7. Conservacion de datos</h2>
          <p style={styles.p}>
            Conservaremos tus datos mientras mantengas tu cuenta activa y durante el plazo
            legalmente exigido tras la cancelacion. Los datos de facturacion se conservan
            durante el periodo legalmente establecido.
          </p>

          <h2 style={styles.h2}>8. Seguridad</h2>
          <p style={styles.p}>
            Implementamos medidas de seguridad tecnicas y organizativas para proteger tus
            datos, incluyendo cifrado en transito y en reposo, controles de acceso y
            auditorias regulares de seguridad.
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
};
