import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../services/supabaseClient";

const AuthContext = createContext(null);

const AUTH_SYNC_CHANNEL = "srs-auth-sync";
const STORAGE_KEY = "srs_auth_event";

function safeRedirectToLogin() {
  // Evita depender de useNavigate si este provider queda fuera del Router
  if (window.location.pathname !== "/auth/login") {
    window.location.assign("/auth/login");
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

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, company_id, full_name, email, phone, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        console.warn("[AuthProvider] profile load error:", error.message);
        setProfile(null);
        return;
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

  const value = useMemo(
    () => ({
      loading,
      session,
      user,
      profile,
      role: profile?.role ?? null,
      companyId: profile?.company_id ?? null,
      isAuthenticated: !!session,
    }),
    [loading, session, user, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
