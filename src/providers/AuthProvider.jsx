import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../services/supabaseClient";

const AuthContext = createContext(null);

const AUTH_SYNC_CHANNEL = "srs-auth-sync";
const STORAGE_KEY = "srs_auth_event";

function safeRedirectToLogin() {
  const path = window.location.pathname;
  // Ya estamos en una pagina de login/landing → no redirigir
  if (path === "/v2" || path === "/" || path.includes("/auth/login") || path.includes("/auth/logout")) {
    return;
  }
  // Redirigir al login del portal correspondiente segun la URL actual
  if (path.startsWith("/v2/manager")) {
    window.location.assign("/v2/manager/auth/login");
  } else if (path.startsWith("/v2/lodger")) {
    window.location.assign("/v2/lodger/auth/login");
  } else if (path.startsWith("/v2/superadmin")) {
    window.location.assign("/v2/auth/login");
  } else {
    window.location.assign("/v2/auth/login");
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const bootstrappedRef = useRef(false); // evita redirects durante hidratación inicial

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 1) bootstrap session + onAuthStateChange
  useEffect(() => {
    let sub;

    const init = async () => {
      setLoading(true);

      // IMPORTANTE: getSession puede devolver null un instante tras reload/HMR.
      // No redirigimos aquí: solo seteamos estado.
      const { data, error } = await supabase.auth.getSession();
      if (!mountedRef.current) return;

      if (error) {
        console.warn("[AuthProvider] getSession error:", error.message);
      }

      const s = data?.session ?? null;
      setSession(s);
      setUser(s?.user ?? null);

      // Nos marcamos como "bootstrapped" cuando hemos leído storage al menos una vez
      bootstrappedRef.current = true;
      setLoading(false);

      sub = supabase.auth
        .onAuthStateChange((event, newSession) => {
          if (!mountedRef.current) return;

          setSession(newSession ?? null);
          setUser(newSession?.user ?? null);

          // ⚠️ CLAVE:
          // - NO redirigir por INITIAL_SESSION aunque venga null (puede ser transitorio)
          // - Redirigir SOLO cuando sea un logout real
          const isRealLogoutEvent =
            event === "SIGNED_OUT" ||
            event === "USER_DELETED"; // por si borras usuario

          if (isRealLogoutEvent) {
            setProfile(null);
            safeRedirectToLogin();
            return;
          }

          // Si no hay sesión pero NO es logout real (ej. INITIAL_SESSION null),
          // no forzamos redirect. Dejamos que el wrapper/UX decida.
          // (El wrapper ya emitirá SIGN_OUT/COOLDOWN cuando proceda.)
        }).data.subscription;
    };

    init();

    return () => {
      sub?.unsubscribe?.();
    };
  }, []);

  // 2) cargar profile (role, company_id, etc.) cuando cambie user
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setProfile(null);
        return;
      }

      console.log("[AuthProvider] loading profile for user:", user.id);

      // Intentar con columnas v2 (client_account_id, etc.)
      // Si la migracion 004 no se ha aplicado aun, hacer fallback a columnas legacy
      let { data, error } = await supabase
        .from("profiles")
        .select("id, role, company_id, client_account_id, onboarding_status, is_primary_admin, full_name, email, phone, created_at")
        .eq("id", user.id)
        .maybeSingle();

      // Fallback: si falla por columnas inexistentes, usar solo las legacy
      if (error && error.message?.includes("does not exist")) {
        console.warn("[AuthProvider] v2 columns not found, falling back to legacy SELECT");
        const fallback = await supabase
          .from("profiles")
          .select("id, role, company_id, full_name, email, phone, created_at")
          .eq("id", user.id)
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }

      if (!mountedRef.current) return;

      if (error) {
        console.warn("[AuthProvider] profile load error:", error.message);
        setProfile(null);
        return;
      }

      if (!data) {
        console.warn("[AuthProvider] profile NOT FOUND for user:", user.id, "— row may not exist in profiles table");
      } else {
        console.log("[AuthProvider] profile loaded:", { role: data.role, client_account_id: data.client_account_id, onboarding_status: data.onboarding_status });
      }

      setProfile(data ?? null);
    };

    loadProfile();
  }, [user?.id]);

  // 3) escuchar SIGN_OUT / COOLDOWN (emitidos por invokeWithAuth) y redirigir
  useEffect(() => {
    const bc =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(AUTH_SYNC_CHANNEL)
        : null;

    const handleGlobalAuthEvent = async (type) => {
      // Evita que un COOLDOWN durante bootstrap inicial te mande al login si el usuario está entrando
      // (si realmente está roto, el wrapper lo volverá a emitir al intentar una llamada)
      if (!bootstrappedRef.current) return;

      if (type === "SIGN_OUT" || type === "COOLDOWN") {
        try {
          // local: no depende de red
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          // ignore
        }
        setProfile(null);
        safeRedirectToLogin();
      }
    };

    const onBC = async (ev) => {
      const msg = ev?.data;
      if (!msg?.type) return;
      await handleGlobalAuthEvent(msg.type);
    };

    const onStorage = async (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const msg = JSON.parse(e.newValue);
        if (!msg?.type) return;
        await handleGlobalAuthEvent(msg.type);
      } catch {
        // ignore
      }
    };

    if (bc) bc.onmessage = onBC;
    window.addEventListener("storage", onStorage);

    return () => {
      try {
        bc?.close?.();
      } catch {
        // ignore
      }
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Refrescar perfil manualmente (tras wizard_submit, etc.)
  const refreshProfile = async () => {
    if (!user?.id) return;
    console.log("[AuthProvider] refreshProfile() called for user:", user.id);
    const { data } = await supabase
      .from("profiles")
      .select("id, role, company_id, client_account_id, onboarding_status, is_primary_admin, full_name, email, phone, created_at")
      .eq("id", user.id)
      .maybeSingle();
    if (mountedRef.current && data) {
      console.log("[AuthProvider] profile refreshed:", { role: data.role, client_account_id: data.client_account_id, onboarding_status: data.onboarding_status });
      setProfile(data);
    }
  };

  // Función de logout centralizada
  const logout = async () => {
    console.log("[AuthProvider] logout() llamado");

    // 1. Limpiar estado de React primero
    setSession(null);
    setUser(null);
    setProfile(null);

    // 2. Llamar a signOut de Supabase (scope: local no requiere red)
    try {
      console.log("[AuthProvider] Llamando supabase.auth.signOut...");
      await supabase.auth.signOut({ scope: "local" });
      console.log("[AuthProvider] signOut completado");
    } catch (error) {
      console.error("[AuthProvider] logout error:", error);
    }

    // 3. Limpiar localStorage relacionado con Supabase
    // (por si signOut no lo limpió correctamente)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      console.log("[AuthProvider] Eliminando localStorage key:", key);
      localStorage.removeItem(key);
    });

    console.log("[AuthProvider] logout() completado");
  };

  const value = useMemo(() => {
    const _clientAccountId = profile?.client_account_id ?? null;
    const _onboardingStatus = profile?.onboarding_status ?? "none";

    // Computed tenant state:
    // "none"            = sin client_account_id (tenant=0)
    // "in_progress"     = wizard iniciado, no enviado
    // "payment_pending" = wizard enviado, pago pendiente Stripe
    // "active"          = tenant activo (tenant=1)
    let _tenantState = "none";
    if (_clientAccountId) {
      _tenantState = _onboardingStatus === "active" ? "active" : (_onboardingStatus || "none");
    }

    return {
      loading,
      session,
      user,
      profile,
      role: profile?.role ?? null,
      companyId: profile?.company_id ?? null,
      clientAccountId: _clientAccountId,
      onboardingStatus: _onboardingStatus,
      isPrimaryAdmin: profile?.is_primary_admin ?? false,
      isAuthenticated: !!session,
      hasTenant: _tenantState === "active",
      tenantState: _tenantState,
      logout,
      refreshProfile,
    };
  }, [loading, session, user, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
