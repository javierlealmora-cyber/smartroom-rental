// =============================================================================
// src/pages/v2/superadmin/SuperadminSettings.jsx
// Configuración del superadmin — perfil, contraseña, preferencias, seguridad
// =============================================================================

import { useState, useEffect } from "react";
import { Button, Form, Input, Switch, Divider, ColorPicker, message } from "antd";
import {
  UserOutlined, LockOutlined, BellOutlined, SafetyOutlined,
  SaveOutlined, BgColorsOutlined, PictureOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../layouts/V2Layout";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../services/supabaseClient";
import { useTenant } from "../../../providers/TenantProvider";

// ─── Paleta estándar ──────────────────────────────────────────────────────────
const C = {
  text:    "#1A2438",
  muted:   "#8A9BB8",
  light:   "#C0CCD8",
  divider: "rgba(0,0,0,0.07)",
  navy:    "#0B2E6D",
};

// ─── Sección con marco igual que KPIs ─────────────────────────────────────────
function SettingsSection({ icon, title, description, children }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid rgba(11,46,109,0.08)",
      borderRadius: 12,
      padding: "24px 28px",
      boxShadow: "0 1px 4px rgba(11,46,109,0.04)",
    }}>
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.divider}` }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 17, color: C.navy }}>{icon}</span>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 0", paddingLeft: 25 }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export default function SuperadminSettings() {
  const { user, profile } = useAuth();
  const { refreshBranding } = useTenant();

  const [profileForm]  = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [savingProfile,   setSavingProfile]   = useState(false);
  const [savingPassword,  setSavingPassword]  = useState(false);
  const [savingBranding,  setSavingBranding]  = useState(false);
  const [loadingProfile,  setLoadingProfile]  = useState(true);
  const [loadingBranding, setLoadingBranding] = useState(true);
  const [sessions,        setSessions]        = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Branding de plataforma
  const [brandingForm] = Form.useForm();

  // Preferencias locales
  const [prefs, setPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sr.superadmin.prefs.v1") || "{}");
    } catch { return {}; }
  });

  // ── Cargar perfil ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user?.id)
          .single();
        if (error) throw error;
        profileForm.setFieldsValue({
          full_name: data?.full_name || "",
          email:     user?.email    || "",
          phone:     data?.phone    || "",
        });
      } catch (err) {
        message.error("Error cargando perfil: " + err.message);
      } finally {
        setLoadingProfile(false);
      }
    };
    if (user?.id) load();
  }, [user?.id]);

  // ── Cargar branding de plataforma ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingBranding(true);
      try {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("platform_name, platform_tagline, logo_url, favicon_url, primary_color, secondary_color, support_email, support_url")
          .eq("id", 1)
          .single();
        if (error) throw error;
        brandingForm.setFieldsValue({
          platform_name:    data?.platform_name    || "SmartRoom Rental Platform",
          platform_tagline: data?.platform_tagline || "Panel de Gestión",
          logo_url:         data?.logo_url         || "",
          favicon_url:      data?.favicon_url      || "",
          primary_color:    data?.primary_color    || "#111827",
          secondary_color:  data?.secondary_color  || "#3B82F6",
          support_email:    data?.support_email    || "",
          support_url:      data?.support_url      || "",
        });
      } catch {
        // tabla no existe aún — silencioso
      } finally {
        setLoadingBranding(false);
      }
    };
    load();
  }, []);

  // ColorPicker puede devolver objeto Color o string según si el usuario interactuó
  const toHexString = (v) => {
    if (!v) return null;
    if (typeof v === "string") return v;
    // objeto AntD Color
    if (typeof v.toHexString === "function") return v.toHexString();
    if (typeof v.toHex === "function") return "#" + v.toHex();
    return String(v);
  };

  // ── Guardar branding de plataforma ───────────────────────────────────────────
  const handleSaveBranding = async () => {
    let values;
    try { values = await brandingForm.validateFields(); } catch { return; }
    setSavingBranding(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          platform_name:    values.platform_name,
          platform_tagline: values.platform_tagline || null,
          logo_url:         values.logo_url         || null,
          favicon_url:      values.favicon_url       || null,
          primary_color:    toHexString(values.primary_color)   || "#111827",
          secondary_color:  toHexString(values.secondary_color) || null,
          support_email:    values.support_email     || null,
          support_url:      values.support_url       || null,
          updated_by:       user?.id,
        })
        .eq("id", 1);
      if (error) throw error;
      // Forzar recarga inmediata del branding en el TenantProvider (sin reload de página)
      refreshBranding();
      message.success("Branding de plataforma actualizado");
    } catch (err) {
      message.error("Error al guardar branding: " + err.message);
    } finally {
      setSavingBranding(false);
    }
  };

  // ── Guardar perfil ───────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    let values;
    try { values = await profileForm.validateFields(); } catch { return; }
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: values.full_name, phone: values.phone || null })
        .eq("id", user?.id);
      if (error) throw error;
      message.success("Perfil actualizado correctamente");
    } catch (err) {
      message.error("Error al guardar perfil: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Cambiar contraseña ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    let values;
    try { values = await passwordForm.validateFields(); } catch { return; }
    if (values.new_password !== values.confirm_password) {
      message.error("Las contraseñas no coinciden");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.new_password });
      if (error) throw error;
      message.success("Contraseña actualizada correctamente");
      passwordForm.resetFields();
    } catch (err) {
      message.error("Error al cambiar contraseña: " + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Guardar preferencias ─────────────────────────────────────────────────────
  const setPref = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem("sr.superadmin.prefs.v1", JSON.stringify(next));
  };

  // ── Cargar sesiones activas ──────────────────────────────────────────────────
  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      // Supabase no expone sesiones de otros — mostramos la sesión actual
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        setSessions([{
          id:         data.session.access_token.slice(-8),
          created_at: data.session.created_at || new Date().toISOString(),
          current:    true,
          user_agent: navigator.userAgent.substring(0, 60) + "...",
        }]);
      }
    } catch { /* non-fatal */ } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => { loadSessions(); }, []);

  // ── Cerrar sesión en todos los dispositivos ───────────────────────────────────
  const handleSignOutAll = async () => {
    if (!window.confirm("¿Cerrar sesión en todos los dispositivos?")) return;
    try {
      await supabase.auth.signOut({ scope: "global" });
      message.success("Sesiones cerradas. Redirigiendo...");
    } catch (err) {
      message.error(err.message);
    }
  };

  const userName = profile?.full_name || user?.email || "Superadmin";

  return (
    <V2Layout role="superadmin" userName={userName}>
      <div style={{ background: "#fff", minHeight: "100%", paddingBottom: 40 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: 0, letterSpacing: "-0.4px", display: "flex", alignItems: "center", gap: 10 }}>
            <SafetyOutlined style={{ fontSize: 22, color: C.navy }} />
            Configuración
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
            Gestiona tu perfil, contraseña y preferencias de la plataforma
          </p>
        </div>

        {/* ── Branding plataforma (ancho completo) ────────────────────── */}
        <SettingsSection
          icon={<BgColorsOutlined />}
          title="Branding de la Plataforma"
          description="Nombre, colores y logo que se muestran en el panel del superadmin y en las páginas sin tenant"
        >
          <Form form={brandingForm} layout="vertical" disabled={loadingBranding}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              <Form.Item
                name="platform_name"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Nombre de la plataforma</span>}
                rules={[{ required: true, message: "El nombre es obligatorio" }]}
              >
                <Input placeholder="SmartRoom Rental Platform" />
              </Form.Item>
              <Form.Item
                name="platform_tagline"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Tagline (bajo el nombre)</span>}
              >
                <Input placeholder="Panel de Gestión" />
              </Form.Item>
              <Form.Item
                name="primary_color"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Color primario</span>}
                getValueFromEvent={(color) => "#" + color.toHex()}
              >
                <ColorPicker
                  showText
                  format="hex"
                  style={{ width: "100%" }}
                />
              </Form.Item>
              <Form.Item
                name="secondary_color"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Color secundario</span>}
                getValueFromEvent={(color) => "#" + color.toHex()}
              >
                <ColorPicker
                  showText
                  format="hex"
                  style={{ width: "100%" }}
                />
              </Form.Item>
              <Form.Item
                name="logo_url"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>URL del logo</span>}
                style={{ gridColumn: "1 / -1" }}
              >
                <Input prefix={<PictureOutlined style={{ color: C.light }} />} placeholder="https://... (bucket company-assets)" />
              </Form.Item>
              <Form.Item
                name="support_email"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Email de soporte</span>}
              >
                <Input placeholder="soporte@smartroom.es" />
              </Form.Item>
              <Form.Item
                name="support_url"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>URL de soporte</span>}
              >
                <Input placeholder="https://help.smartroom.es" />
              </Form.Item>
            </div>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={savingBranding}
              onClick={handleSaveBranding}
              style={{ background: C.navy, borderColor: C.navy }}
            >
              Guardar branding
            </Button>
            <p style={{ fontSize: 11, color: C.muted, margin: "10px 0 0" }}>
              Los cambios se aplican de inmediato. El logo debe estar en el bucket <code>company-assets</code> de Supabase Storage.
            </p>
          </Form>
        </SettingsSection>

        <div style={{ marginTop: 16 }} />

        {/* ── Grid 2 columnas ─────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

          {/* ── Perfil ──────────────────────────────────────────────── */}
          <SettingsSection
            icon={<UserOutlined />}
            title="Perfil"
            description="Tu nombre e información de contacto en la plataforma"
          >
            <Form form={profileForm} layout="vertical" disabled={loadingProfile}>
              <Form.Item
                name="full_name"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Nombre completo</span>}
                rules={[{ required: true, message: "El nombre es obligatorio" }]}
              >
                <Input prefix={<UserOutlined style={{ color: C.light }} />} placeholder="Nombre Apellido" />
              </Form.Item>
              <Form.Item
                name="email"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Email</span>}
              >
                <Input disabled style={{ color: C.muted }} />
              </Form.Item>
              <Form.Item
                name="phone"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Teléfono (opcional)</span>}
              >
                <Input placeholder="+34 600 000 000" />
              </Form.Item>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={savingProfile}
                onClick={handleSaveProfile}
                style={{ background: C.navy, borderColor: C.navy }}
              >
                Guardar perfil
              </Button>
            </Form>
          </SettingsSection>

          {/* ── Contraseña ──────────────────────────────────────────── */}
          <SettingsSection
            icon={<LockOutlined />}
            title="Contraseña"
            description="Cambia tu contraseña de acceso a la plataforma"
          >
            <Form form={passwordForm} layout="vertical">
              <Form.Item
                name="new_password"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Nueva contraseña</span>}
                rules={[
                  { required: true, message: "Introduce la nueva contraseña" },
                  { min: 8, message: "Mínimo 8 caracteres" },
                ]}
              >
                <Input.Password placeholder="Mínimo 8 caracteres" />
              </Form.Item>
              <Form.Item
                name="confirm_password"
                label={<span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Confirmar contraseña</span>}
                rules={[{ required: true, message: "Confirma la contraseña" }]}
              >
                <Input.Password placeholder="Repite la nueva contraseña" />
              </Form.Item>
              <Button
                type="primary"
                icon={<LockOutlined />}
                loading={savingPassword}
                onClick={handleChangePassword}
                style={{ background: C.navy, borderColor: C.navy }}
              >
                Cambiar contraseña
              </Button>
            </Form>
          </SettingsSection>

          {/* ── Preferencias ────────────────────────────────────────── */}
          <SettingsSection
            icon={<BellOutlined />}
            title="Preferencias"
            description="Notificaciones y comportamiento de la interfaz"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { key: "notif_new_account",   label: "Notificar nueva cuenta cliente",    desc: "Recibe un aviso cuando se crea una nueva cuenta" },
                { key: "notif_plan_change",   label: "Notificar cambio de plan",          desc: "Aviso al cambiar el plan de una cuenta" },
                { key: "notif_payment_issue", label: "Notificar problemas de pago",       desc: "Alertas por pagos fallidos o suspensos" },
                { key: "compact_tables",      label: "Tablas compactas",                  desc: "Reduce el espaciado de las filas en las tablas" },
                { key: "show_slug",           label: "Mostrar slugs en listas",           desc: "Muestra el identificador técnico bajo el nombre" },
              ].map(({ key, label, desc }) => (
                <div key={key} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: `1px solid ${C.divider}`,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{label}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{desc}</div>
                  </div>
                  <Switch
                    checked={!!prefs[key]}
                    onChange={v => setPref(key, v)}
                    size="small"
                  />
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: C.light, marginTop: 12 }}>
              Las preferencias se guardan localmente en este navegador.
            </p>
          </SettingsSection>

          {/* ── Seguridad / Sesiones ─────────────────────────────────── */}
          <SettingsSection
            icon={<SafetyOutlined />}
            title="Seguridad"
            description="Sesiones activas y control de acceso"
          >
            {/* Info cuenta */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Cuenta
              </div>
              {[
                { label: "Email",   value: user?.email || "—" },
                { label: "Rol",     value: "Superadmin" },
                { label: "Último acceso", value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("es-ES") : "—" },
                { label: "ID usuario",    value: user?.id?.slice(0, 16) + "…" || "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: `1px solid ${C.divider}`,
                }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: label === "ID usuario" ? "monospace" : "inherit" }}>{value}</span>
                </div>
              ))}
            </div>

            <Divider style={{ margin: "16px 0" }} />

            {/* Sesiones */}
            <div style={{ fontSize: 12, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
              Sesión activa
            </div>
            {loadingSessions ? (
              <div style={{ color: C.muted, fontSize: 13 }}>Cargando...</div>
            ) : sessions.map(s => (
              <div key={s.id} style={{
                padding: "10px 12px", borderRadius: 8,
                background: "#F0FDF4", border: "1px solid #BBF7D0",
                marginBottom: 8,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A" }}>Sesión actual</span>
                  <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>…{s.id}</span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.user_agent}
                </div>
              </div>
            ))}

            <Button
              danger
              icon={<SafetyOutlined />}
              onClick={handleSignOutAll}
              style={{ marginTop: 12, width: "100%" }}
            >
              Cerrar sesión en todos los dispositivos
            </Button>
          </SettingsSection>

        </div>
      </div>
      </div>
    </V2Layout>
  );
}
