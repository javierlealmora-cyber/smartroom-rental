import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { provisionCompany } from "../../../services/companies.service";

function slugify(str) {
  return (str ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function CompanyCreate() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [plan, setPlan] = useState("basic");
  const [status, setStatus] = useState("active");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [themePrimaryColor, setThemePrimaryColor] = useState("#111827");
  const [logoUrl, setLogoUrl] = useState("");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminFullName, setAdminFullName] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const slug = useMemo(() => slugify(name), [name]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    setError(null);
    setBusy(true);

    try {
      const payload = {
        company: {
          name,
          slug,
          plan,
          status,
          start_date: startDate,
          theme_primary_color: themePrimaryColor,
          logo_url: logoUrl || null,
        },
        admin: {
          email: adminEmail,
          full_name: adminFullName || null,
        },
      };

      await provisionCompany(payload);

      // Volver a la lista (monta de nuevo y recarga)
      nav("/superadmin/companies", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = !!name && !!adminEmail && !!slug && !busy;

  return (
    <div style={{ padding: 40, maxWidth: 720 }}>
      <h1>Nueva empresa</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginTop: 16 }}>
          <label>Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
            Slug: {slug || "-"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label>Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              style={{ width: "100%", padding: 10 }}
            >
              <option value="basic">basic</option>
              <option value="investor">investor</option>
              <option value="enterprise">enterprise</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label>Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "100%", padding: 10 }}
            >
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
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              style={{ width: "100%", padding: 10 }}
            />
          </div>
        </div>

        <h3 style={{ marginTop: 18 }}>Admin de empresa</h3>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 2 }}>
            <label>Email</label>
            <input
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              style={{ width: "100%", padding: 10 }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label>Nombre</label>
            <input
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
              style={{ width: "100%", padding: 10 }}
            />
          </div>
        </div>

        {error ? <div style={{ color: "crimson", marginTop: 12 }}>{error}</div> : null}

        <button type="submit" disabled={!canSubmit} style={{ marginTop: 14 }}>
          {busy ? "Creando..." : "Crear empresa"}
        </button>
      </form>
    </div>
  );
}
