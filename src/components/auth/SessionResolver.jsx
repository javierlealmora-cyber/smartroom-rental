// src/components/auth/SessionResolver.jsx
// Post-login screen: waits for AuthProvider to finish loading,
// then calls resolveDestination to determine where to go or what to show.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";

const PROFILE_TIMEOUT_MS = 6000; // max wait for profile to load

/**
 * SessionResolver
 * @param {Function} resolveDestination - (authState) => string (path) | JSX element
 *   If returns a string → navigate to that path
 *   If returns JSX → render it in place of the spinner
 */
export default function SessionResolver({ resolveDestination }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [resolved, setResolved] = useState(null);
  const [profileTimedOut, setProfileTimedOut] = useState(false);
  const timerRef = useRef(null);

  // Timeout: if profile never arrives, stop waiting
  useEffect(() => {
    if (auth.loading || !auth.user) return;

    // Profile already loaded — no timer needed
    if (auth.profile) return;

    timerRef.current = setTimeout(() => {
      console.warn("[SessionResolver] profile load timed out after", PROFILE_TIMEOUT_MS, "ms");
      setProfileTimedOut(true);
    }, PROFILE_TIMEOUT_MS);

    return () => clearTimeout(timerRef.current);
  }, [auth.loading, auth.user, auth.profile]);

  // Resolve destination when we have enough data
  useEffect(() => {
    if (auth.loading) return;

    // We need user. For profile, we accept either real profile or timeout.
    if (!auth.user) return;
    if (!auth.profile && !profileTimedOut) return;

    // Clear timeout since we're resolving
    clearTimeout(timerRef.current);

    const result = resolveDestination(auth);
    if (typeof result === "string") {
      navigate(result, { replace: true });
    } else {
      setResolved(result);
    }
  }, [auth.loading, auth.user, auth.profile, auth.tenantState, profileTimedOut]);

  if (resolved) return resolved;

  return (
    <div style={styles.container}>
      <div style={styles.spinner} />
      <p style={styles.text}>Cargando tu espacio...</p>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#f9fafb",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #e5e7eb",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "sr-spin 0.8s linear infinite",
  },
  text: {
    marginTop: 16,
    fontSize: 15,
    color: "#6b7280",
    fontWeight: 500,
  },
};

// Inject keyframes once
if (typeof document !== "undefined" && !document.getElementById("sr-spin-kf")) {
  const style = document.createElement("style");
  style.id = "sr-spin-kf";
  style.textContent = "@keyframes sr-spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}
