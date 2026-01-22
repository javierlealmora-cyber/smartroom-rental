import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "./AuthProvider";

const ThemeContext = createContext(null);

const DEFAULT_THEME = {
  primaryColor: "#111827", // SmartRent Systems
  logoUrl: null,
  companyName: "SmartRent Systems",
};

export function ThemeProvider({ children }) {
  const { profile, loading: authLoading } = useAuth();
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applyCssVars = (t) => {
      document.documentElement.style.setProperty("--sr-primary", t.primaryColor || DEFAULT_THEME.primaryColor);
    };

    const load = async () => {
      if (authLoading) return;

      // No logueado → tema default
      if (!profile) {
        setTheme(DEFAULT_THEME);
        applyCssVars(DEFAULT_THEME);
        setLoading(false);
        return;
      }

      // Superadmin → tema SmartRent
      if (profile.role === "superadmin") {
        setTheme(DEFAULT_THEME);
        applyCssVars(DEFAULT_THEME);
        setLoading(false);
        return;
      }

      // Admin/API/Student → tema de su empresa
      if (!profile.company_id) {
        setTheme(DEFAULT_THEME);
        applyCssVars(DEFAULT_THEME);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("companies")
        .select("name, theme_primary_color, logo_url")
        .eq("id", profile.company_id)
        .single();

      if (error || !data) {
        setTheme(DEFAULT_THEME);
        applyCssVars(DEFAULT_THEME);
        setLoading(false);
        return;
      }

      const nextTheme = {
        primaryColor: data.theme_primary_color || DEFAULT_THEME.primaryColor,
        logoUrl: data.logo_url || null,
        companyName: data.name || DEFAULT_THEME.companyName,
      };

      setTheme(nextTheme);
      applyCssVars(nextTheme);
      setLoading(false);
    };

    load();
  }, [profile, authLoading]);

  const value = useMemo(() => ({ theme, loading }), [theme, loading]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
