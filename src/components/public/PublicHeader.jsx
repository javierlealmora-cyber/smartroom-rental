import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { getPortalHomeForRole } from "../../constants/roles";
import { supabase } from "../../services/supabaseClient";

export default function PublicHeader() {
  const { isAuthenticated, role, logout, profile, user } = useAuth();
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "";
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    const { data } = supabase.storage.from("Assets-SmartRent").getPublicUrl("logo-30.jpg");
    if (data?.publicUrl) {
      const img = new Image();
      img.onload = () => setLogoUrl(data.publicUrl);
      img.src = data.publicUrl;
    }
  }, []);

  const navLinks = [
    { label: "Producto", href: "/v2#producto" },
    { label: "Planes", href: "/v2/planes" },
    { label: "Contacto", href: "/v2/contacto" },
  ];

  return (
    <>
      <header style={styles.header}>
        <div style={styles.inner}>
          <Link to="/v2" style={styles.logoLink}>
            {logoUrl ? (
              <img src={logoUrl} alt="SmartRoom" style={styles.logoImg} />
            ) : (
              <span style={styles.logoIcon}>SR</span>
            )}
            <span style={styles.logoText}>SmartRoom Rental Platform</span>
          </Link>

          <nav className="ph-nav">
            {navLinks.map((l) => (
              <Link key={l.href} to={l.href} style={styles.navLink}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ph-cta">
            {isAuthenticated ? (
              <>
                {displayName && <span style={styles.userName}>{displayName}</span>}
                <button onClick={() => navigate(getPortalHomeForRole(role))} style={styles.ctaSecondary}>
                  Ir a SmartRoom
                </button>
                <button
                  onClick={async () => { await logout(); navigate("/v2"); }}
                  style={styles.ctaOutline}
                >
                  Cerrar sesion
                </button>
              </>
            ) : (
              <>
                <Link to="/v2/auth/login" style={styles.ctaOutline}>Iniciar sesion</Link>
                <Link to="/v2/registro" style={styles.ctaPrimary}>Registro</Link>
              </>
            )}
          </div>

          <button
            className="ph-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span style={{ ...styles.bar, transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span style={{ ...styles.bar, opacity: menuOpen ? 0 : 1 }} />
            <span style={{ ...styles.bar, transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
        </div>

        {menuOpen && (
          <div style={styles.mobileMenu}>
            {navLinks.map((l) => (
              <Link key={l.href} to={l.href} style={styles.mobileLink} onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div style={styles.mobileCta}>
              {isAuthenticated ? (
                <>
                  {displayName && <span style={styles.mobileUserName}>{displayName}</span>}
                  <button onClick={() => { setMenuOpen(false); navigate(getPortalHomeForRole(role)); }} style={styles.ctaSecondary}>
                    Ir a SmartRoom
                  </button>
                  <button onClick={async () => { await logout(); setMenuOpen(false); navigate("/v2"); }} style={styles.ctaOutline}>
                    Cerrar sesion
                  </button>
                </>
              ) : (
                <>
                  <Link to="/v2/auth/login" style={styles.ctaOutline} onClick={() => setMenuOpen(false)}>Iniciar sesion</Link>
                  <Link to="/v2/registro" style={styles.ctaPrimary} onClick={() => setMenuOpen(false)}>Registro</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <style>{responsiveCss}</style>
    </>
  );
}

const styles = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px",
    height: 80,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
  },
  logoImg: {
    width: 108,
    height: 108,
    objectFit: "contain",
  },
  logoIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: 1,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0B2E6D",
  },
  navLink: {
    textDecoration: "none",
    color: "#4b5563",
    fontSize: 15,
    fontWeight: 500,
  },
  ctaPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 20px",
    borderRadius: 8,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
  },
  ctaOutline: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 20px",
    borderRadius: 8,
    background: "transparent",
    color: "#374151",
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
    border: "1px solid #d1d5db",
    cursor: "pointer",
  },
  ctaSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 20px",
    borderRadius: 8,
    background: "#f3f4f6",
    color: "#374151",
    fontSize: 14,
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
  },
  userName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    maxWidth: 180,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  mobileUserName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#111827",
    padding: "8px 0",
  },
  bar: {
    display: "block",
    width: 24,
    height: 2,
    background: "#374151",
    borderRadius: 2,
    transition: "all 0.3s",
  },
  mobileMenu: {
    display: "flex",
    flexDirection: "column",
    padding: "16px 24px 24px",
    borderTop: "1px solid #e5e7eb",
    background: "#fff",
  },
  mobileLink: {
    textDecoration: "none",
    color: "#374151",
    fontSize: 16,
    fontWeight: 500,
    padding: "12px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  mobileCta: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 16,
  },
};

const responsiveCss = `
  .ph-nav { display: flex; gap: 32px; }
  .ph-cta { display: flex; gap: 12px; align-items: center; }
  .ph-hamburger { display: none; flex-direction: column; gap: 4px; background: none; border: none; cursor: pointer; padding: 4px; }
  @media (max-width: 768px) {
    .ph-nav { display: none !important; }
    .ph-cta { display: none !important; }
    .ph-hamburger { display: flex !important; }
  }
`;
