import PublicHeader from "../../components/public/PublicHeader";
import PublicFooter from "../../components/public/PublicFooter";

export default function LegalTerminos() {
  return (
    <div style={styles.page}>
      <PublicHeader />
      <section style={styles.section}>
        <div style={styles.container}>
          <h1 style={styles.title}>Terminos y condiciones</h1>
          <p style={styles.updated}>Ultima actualizacion: 13 de febrero de 2026</p>

          <h2 style={styles.h2}>1. Objeto</h2>
          <p style={styles.p}>
            Los presentes terminos y condiciones regulan el acceso y uso de la plataforma SmartRoom Rental Platform
            (en adelante, "la Plataforma"), propiedad de SmartRoom Rental Platform S.L. La Plataforma ofrece un
            servicio SaaS de gestion inteligente del alquiler de habitaciones para empresas, inversores y
            agencias inmobiliarias.
          </p>

          <h2 style={styles.h2}>2. Registro y cuenta de usuario</h2>
          <p style={styles.p}>
            Para acceder a los servicios de la Plataforma es necesario crear una cuenta de usuario
            proporcionando informacion veraz y actualizada. El usuario es responsable de mantener la
            confidencialidad de sus credenciales de acceso y de todas las actividades realizadas bajo
            su cuenta.
          </p>

          <h2 style={styles.h2}>3. Planes y facturacion</h2>
          <p style={styles.p}>
            La Plataforma ofrece diferentes planes de suscripcion con distintos niveles de funcionalidad
            y limites de uso. Los precios se muestran sin IVA salvo que se indique lo contrario. La
            facturacion puede ser mensual o anual segun el plan contratado. Los pagos se procesan a
            traves de Stripe.
          </p>

          <h2 style={styles.h2}>4. Proteccion de datos</h2>
          <p style={styles.p}>
            SmartRoom Rental Platform se compromete a proteger los datos personales de los usuarios de acuerdo
            con el Reglamento General de Proteccion de Datos (RGPD) y la legislacion espanola vigente.
            Para mas informacion, consulta nuestra Politica de Privacidad.
          </p>

          <h2 style={styles.h2}>5. Propiedad intelectual</h2>
          <p style={styles.p}>
            Todos los contenidos de la Plataforma, incluyendo textos, graficos, logos, iconos, imagenes
            y software, son propiedad de SmartRoom Rental Platform S.L. o de sus licenciantes y estan protegidos
            por las leyes de propiedad intelectual aplicables.
          </p>

          <h2 style={styles.h2}>6. Limitacion de responsabilidad</h2>
          <p style={styles.p}>
            SmartRoom Rental Platform no sera responsable de danos indirectos, incidentales o consecuentes derivados
            del uso o la imposibilidad de uso de la Plataforma. El servicio se proporciona "tal cual" y
            SmartRoom Rental Platform no garantiza la disponibilidad ininterrumpida del servicio.
          </p>

          <h2 style={styles.h2}>7. Modificaciones</h2>
          <p style={styles.p}>
            SmartRoom Rental Platform se reserva el derecho de modificar estos terminos en cualquier momento.
            Los cambios seran comunicados a los usuarios con la debida antelacion. El uso continuado
            de la Plataforma despues de las modificaciones constituye la aceptacion de los nuevos terminos.
          </p>

          <h2 style={styles.h2}>8. Contacto</h2>
          <p style={styles.p}>
            Para cualquier consulta relacionada con estos terminos, puedes escribirnos a
            info@smartrentsystems.com o contactarnos a traves de la pagina de contacto.
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
