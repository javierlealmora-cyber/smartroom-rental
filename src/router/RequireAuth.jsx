import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function RequireAuth({ loginPath = "/v2/auth/login" }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        Cargando...
      </div>
    );
  }

  if (!user) {
    const returnUrl = location.pathname + location.search;
    console.warn("[RequireAuth] Redirecting to login (no user)", {
      loginPath,
      returnUrl,
    });
    return <Navigate to={`${loginPath}?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }

  return <Outlet />;
}
