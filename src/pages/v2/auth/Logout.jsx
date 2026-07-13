import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../services/supabaseClient";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.signOut().finally(() => {
      navigate("/v2/auth/login", { replace: true });
    });
  }, [navigate]);

  return null;
}
