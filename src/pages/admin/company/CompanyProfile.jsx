import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../services/supabaseClient";
import { updateCompany, deleteCompany } from "../../../services/companies.service";

export default function CompanyProfile() {
  const { id } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("basic");
  const [status, setStatus] = useState("active");
  const [startDate, setStartDate] = useState("");
  const [themePrimaryColor, setThemePrimaryColor] = useState("#111827");
  const [logoUrl, setLogoUrl] = useState("");

  const isValid = useMemo(() => {
    return !!id && !!name && !!plan && !!status && !!startDate;
  }, [id, name, plan, status, startDate]);

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("companies")
          .select("id, name, slug, plan, status, start_date, theme_primary_color, logo_url")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Empresa no encontrada");

        setName(data.name ?? "");
        setSlug(data.slug ?? "");
        setPlan(data.plan ?? "basic");
        setStatus(data.status ?? "active");
        setStartDate(data.start_date ?? "");
        setThemePrimaryColor(data.theme_primary_color ?? "#111827");
        setLogoUrl(data.logo_url ?? "");
      } catch (e) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  const onSave = async () => {
    setError(null);
    setSaving(true);

    try {
      const patch = {
        name,
        plan,
        status,
        start_date: startDate,
        theme_primary_color: themePrimaryColor || null,
        logo_url: logoUrl || null,
      };

      const res = await updateCompany({ company_id: id, patch });
      if (!res?.ok) throw new Error(res?.error ?? "No se pudo guardar");

      nav("/superadmin/companies", { replace: true });
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    setError(null);

    const ok = window.confirm(
      `¿Eliminar la empresa "${name}"?\n\nEsto llamará a la Edge Function delete_company.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await deleteCompany({ company_id: id });
      if (!res?.ok) throw new Error(res?.error ?? "No se pudo eliminar");

      nav("/superadmin/companies", { replace: true });
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Cargando...</div>;

  return (
    <div style={{ padding: 40, maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Empresa</h1>
        <button onClick={() => nav("/superadmin/companies")}>Volver</button>
      </div>

      {error ? <div style={{ color: "crimson", marginTop: 12 }}>{error}</div> : null}

      <div style={{ marginTop: 16 }}>
        <label>Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 10 }} />
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Slug (solo lectura)</label>
        <input value={slug} disabled style={{ width: "100%", padding: 10, opacity: 0.8 }} />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <label>Plan</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} style={{ width: "100%", padding: 10 }}>
            <option value="basic">basic</option>
            <option value="investor">investor</option>
            <option value="enterprise">enterprise</option>
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label>Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%", padding: 10 }}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label>Fecha alta</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <label>Color principal</label>
          <input
            value={themePrimaryColor}
            onChange={(e) => setThemePrimaryColor(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ flex: 2 }}>
          <label>Logo URL</label>
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button onClick={onSave} disabled={!isValid || saving || deleting}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>

        <button
          onClick={onDelete}
          disabled={deleting || saving}
          style={{ background: "crimson", color: "white", border: "none", padding: "10px 12px" }}
        >
          {deleting ? "Eliminando..." : "Eliminar empresa"}
        </button>
      </div>
    </div>
  );
}
