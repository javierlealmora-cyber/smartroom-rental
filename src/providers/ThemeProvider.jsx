import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ConfigProvider } from "antd";
import esES from "antd/locale/es_ES";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "./AuthProvider";
import { useTenant } from "./TenantProvider";

const ThemeContext = createContext(null);

const DEFAULT_THEME = {
  primaryColor: "#111827", // SmartRoom Rental Platform
  secondaryColor: null,
  logoUrl: null,
  companyName: "SmartRoom Rental Platform",
};

export function ThemeProvider({ children }) {
  const { profile, loading: authLoading } = useAuth();
  const { branding, loading: tenantLoading } = useTenant();
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applyCssVars = (t) => {
      document.documentElement.style.setProperty("--sr-primary", t.primaryColor || DEFAULT_THEME.primaryColor);
      if (t.secondaryColor) {
        document.documentElement.style.setProperty("--sr-secondary", t.secondaryColor);
      }
    };

    const load = async () => {
      if (authLoading || tenantLoading) return;

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

      // Nuevo sistema: si TenantProvider tiene branding → usarlo
      if (profile.client_account_id && branding) {
        const tenantTheme = {
          primaryColor: branding.primary_color || DEFAULT_THEME.primaryColor,
          secondaryColor: branding.secondary_color || null,
          logoUrl: branding.logo_url || null,
          companyName: branding.name || DEFAULT_THEME.companyName,
        };
        setTheme(tenantTheme);
        applyCssVars(tenantTheme);
        setLoading(false);
        return;
      }

      // Legacy: Admin/API/Student → tema de su empresa (company_id)
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
        secondaryColor: null,
        logoUrl: data.logo_url || null,
        companyName: data.name || DEFAULT_THEME.companyName,
      };

      setTheme(nextTheme);
      applyCssVars(nextTheme);
      setLoading(false);
    };

    load();
  }, [profile, authLoading, branding, tenantLoading]);

  const value = useMemo(() => ({ theme, loading }), [theme, loading]);

  const antTheme = useMemo(() => ({
    token: {
      colorPrimary: theme.primaryColor || "#111827",
      borderRadius: 8,
      fontFamily: "inherit",
    },
  }), [theme.primaryColor]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={antTheme} locale={esES}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
