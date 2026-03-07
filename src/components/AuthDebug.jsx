import { useState } from "react";
import { useAuth } from "../providers/AuthProvider";
import { supabase } from "../services/supabaseClient";

export default function AuthDebug() {
  const { user, profile } = useAuth();
  const [sessionInfo, setSessionInfo] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const checkSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setSessionInfo({ error: error.message });
    } else if (!data.session) {
      setSessionInfo({ error: "No hay sesión activa" });
    } else {
      setSessionInfo({
        userId: data.session.user.id,
        email: data.session.user.email,
        tokenPreview: data.session.access_token.substring(0, 50) + "...",
        expiresAt: new Date(data.session.expires_at * 1000).toLocaleString(),
      });
    }
  };

  const testEdgeFunction = async () => {
    setTestResult({ loading: true });

    try {
      // Obtener el token de acceso de la sesión actual
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        setTestResult({
          success: false,
          error: "No hay sesión activa",
          detail: sessionError?.message || "Por favor, inicia sesión de nuevo",
        });
        return;
      }

      const token = sessionData.session.access_token;

      // Invocar la función pasando explícitamente el token de autorización
      const { data, error } = await supabase.functions.invoke("provision_company", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {
          company: {
            name: "Test Company Debug",
            slug: "test-company-debug",
            plan: "basic",
            status: "active",
            start_date: "2026-01-23",
            theme_primary_color: "#111827",
            logo_url: null,
          },
          admin: {
            email: "test-debug@example.com",
            full_name: "Test Debug Admin",
          },
        },
      });

      if (error) {
        setTestResult({
          success: false,
          error: error.message || "Error desconocido",
          detail: error.context || error,
        });
      } else {
        setTestResult({
          success: true,
          data: data,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message,
        detail: err.stack || null,
      });
    }
  };

  return (
    <div style={{ padding: 20, background: "#f5f5f5", margin: 20, borderRadius: 8 }}>
      <h2>🔍 Debug de Autenticación</h2>

      <div style={{ marginBottom: 20 }}>
        <h3>Estado actual (AuthProvider)</h3>
        <pre style={{ background: "white", padding: 10, borderRadius: 4, fontSize: 12 }}>
          {JSON.stringify({ user: user?.id, profile: profile?.role }, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button onClick={checkSession} style={{ marginRight: 10, padding: "8px 16px" }}>
          Verificar Sesión Supabase
        </button>
        {sessionInfo && (
          <pre style={{ background: "white", padding: 10, borderRadius: 4, fontSize: 12, marginTop: 10 }}>
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <button onClick={testEdgeFunction} style={{ padding: "8px 16px" }}>
          Test Edge Function provision_company
        </button>
        {testResult && (
          <pre
            style={{
              background: testResult.success ? "#d4edda" : "#f8d7da",
              padding: 10,
              borderRadius: 4,
              fontSize: 12,
              marginTop: 10,
            }}
          >
            {JSON.stringify(testResult, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
