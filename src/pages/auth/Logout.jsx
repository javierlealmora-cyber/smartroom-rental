// src/pages/auth/Logout.jsx
// Página de logout manual - acceder a /auth/logout para forzar cierre de sesión
// Soporta ?portal=admin|lodger|superadmin para redirigir al login correcto
import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";

const LOGIN_ROUTES = {
  admin: "/v2/admin/auth/login",
  manager: "/v2/admin/auth/login",
  lodger: "/v2/lodger/auth/login",
  superadmin: "/v2/auth/login",
};

export default function Logout() {
  const [status, setStatus] = useState("Cerrando sesión...");

  useEffect(() => {
    // Leer portal antes de limpiar todo
    const params = new URLSearchParams(window.location.search);
    const portal = params.get("portal") || "";
    const redirectTo = LOGIN_ROUTES[portal] || "/v2/auth/login";

    const doLogout = async () => {
      try {
        // 1. SignOut de Supabase (global = invalida en servidor)
        setStatus("Cerrando sesión en Supabase...");
        await supabase.auth.signOut({ scope: "global" });
      } catch (e) {
        console.error("Error signOut:", e);
      }

      // 2. Limpiar localStorage
      setStatus("Limpiando localStorage...");
      localStorage.clear();

      // 3. Limpiar sessionStorage
      setStatus("Limpiando sessionStorage...");
      sessionStorage.clear();

      // 4. Limpiar IndexedDB
      setStatus("Limpiando IndexedDB...");
      try {
        const databases = await window.indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      } catch (e) {
        // No soportado en todos los navegadores
      }

      // 5. Limpiar cookies relacionadas con Supabase
      setStatus("Limpiando cookies...");
      document.cookie.split(";").forEach(c => {
        const name = c.split("=")[0].trim();
        if (name.includes("sb-") || name.includes("supabase")) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });

      setStatus("Sesión cerrada. Redirigiendo...");

      // 6. Esperar un momento y redirigir al login del portal correspondiente
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1000);
    };

    doLogout();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.spinner}></div>
        <h2 style={styles.title}>Cerrando Sesión</h2>
        <p style={styles.status}>{status}</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 40,
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    maxWidth: 400,
  },
  spinner: {
    width: 48,
    height: 48,
    border: "4px solid #E5E7EB",
    borderTop: "4px solid #111827",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px",
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 12px",
  },
  status: {
    fontSize: 14,
    color: "#6B7280",
    margin: 0,
  },
};
