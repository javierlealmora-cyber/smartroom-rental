// src/hooks/useLoginForm.js
// Shared login logic for the 3 portal login pages
import { useState } from "react";
import { supabase } from "../services/supabaseClient";

export default function useLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Forgot password modal state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  const handleLogin = async (onSuccess, onError) => {
    if (!email || !password) return;
    setError(null);
    setBusy(true);

    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);
    if (err) {
      setError(err.message);
      if (onError) onError(err);
    } else if (onSuccess) {
      onSuccess();
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setError("Por favor, introduce tu email");
      return;
    }
    setError(null);
    setForgotBusy(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(
      forgotEmail.trim(),
      { redirectTo: `${window.location.origin}/v2/auth/reset-password` }
    );

    setForgotBusy(false);
    if (err) {
      setError(err.message);
    } else {
      setForgotSent(true);
    }
  };

  const openForgotModal = () => {
    setForgotMode(true);
    setForgotEmail(email);
    setError(null);
  };

  const closeForgotModal = () => {
    setForgotMode(false);
    setForgotEmail("");
    setForgotSent(false);
    setError(null);
  };

  return {
    // Login form state
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    setError,
    busy,

    // Login action
    handleLogin,

    // Forgot password
    forgotMode,
    forgotEmail,
    setForgotEmail,
    forgotSent,
    forgotBusy,
    handleForgotPassword,
    openForgotModal,
    closeForgotModal,
  };
}
