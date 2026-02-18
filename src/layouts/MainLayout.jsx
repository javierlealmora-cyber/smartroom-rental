import { Outlet } from "react-router-dom";
import { useTheme } from "../providers/ThemeProvider";
import { useAuth } from "../providers/AuthProvider";
import { supabase } from "../services/supabaseClient";

export default function MainLayout() {
  const { theme, loading: themeLoading } = useTheme();
  const { profile, loading: authLoading } = useAuth();

  const primary = theme?.primaryColor || "#111827";

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div>
      <header
        style={{
          padding: 20,
          borderBottom: `3px solid ${primary}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {theme?.logoUrl ? (
            <img src={theme.logoUrl} alt="logo" style={{ height: 28 }} />
          ) : null}
          <strong>{themeLoading ? "Cargando..." : theme?.companyName || "SmartRoom Rental Platform"}</strong>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {!authLoading && profile?.role ? (
            <span style={{ fontSize: 12, opacity: 0.8 }}>Rol: {profile.role}</span>
          ) : null}
          <button onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
