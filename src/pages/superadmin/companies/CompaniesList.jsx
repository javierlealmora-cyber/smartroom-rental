// src/pages/superadmin/companies/CompaniesList.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { deleteCompany, getCompanies, updateCompany } from "../../../services/companies.service";

export default function CompaniesList() {
  const location = useLocation();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  // estados UI por fila
  const [deletingId, setDeletingId] = useState(null);
  const [rowError, setRowError] = useState({}); // { [companyId]: string }

  // editor inline
  const [editingId, setEditingId] = useState(null);
  const editingRow = useMemo(() => rows.find((r) => r.id === editingId) ?? null, [rows, editingId]);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    plan: "basic",
    status: "active",
    start_date: "",
    theme_primary_color: "",
    logo_url: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setPageError(null);
    setLoading(true);
    try {
      const data = await getCompanies();
      setRows(data);
    } catch (e) {
      setPageError(e?.message ?? String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, location.key]);

  const onClickDelete = async (companyId, companyName) => {
    setRowError((m) => ({ ...m, [companyId]: null }));
    const ok = window.confirm(`¿Eliminar la empresa "${companyName}"? (Se borrarán sus usuarios)`);
    if (!ok) return;

    try {
      setDeletingId(companyId);
      await deleteCompany({ company_id: companyId });
      await load();
    } catch (e) {
      setRowError((m) => ({ ...m, [companyId]: e?.message ?? String(e) }));
    } finally {
      setDeletingId(null);
    }
  };

  const onClickEdit = (c) => {
    setRowError((m) => ({ ...m, [c.id]: null }));
    setEditingId(c.id);
    setEditForm({
      name: c.name ?? "",
      slug: c.slug ?? "",
      plan: c.plan ?? "basic",
      status: c.status ?? "active",
      start_date: c.start_date ?? "",
      theme_primary_color: c.theme_primary_color ?? "",
      logo_url: c.logo_url ?? "",
    });
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setSaving(false);
  };

  const onSaveEdit = async () => {
    if (!editingId) return;

    setRowError((m) => ({ ...m, [editingId]: null }));
    setSaving(true);
    try {
      // Solo enviamos campos que realmente quieras permitir editar
      const patch = {
        name: editForm.name,
        slug: editForm.slug,
        plan: editForm.plan,
        status: editForm.status,
        start_date: editForm.start_date || null,
        theme_primary_color: editForm.theme_primary_color || null,
        logo_url: editForm.logo_url || null,
      };

      await updateCompany({ company_id: editingId, patch });
      setEditingId(null);
      await load();
    } catch (e) {
      setRowError((m) => ({ ...m, [editingId]: e?.message ?? String(e) }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Empresas</h1>
        <Link to="/superadmin/companies/new">+ Nueva empresa</Link>
      </div>

      {loading ? <p>Cargando...</p> : null}
      {pageError ? <p style={{ color: "crimson" }}>{pageError}</p> : null}

      <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 8 }}>Nombre</th>
            <th style={{ padding: 8 }}>Slug</th>
            <th style={{ padding: 8 }}>Plan</th>
            <th style={{ padding: 8 }}>Estado</th>
            <th style={{ padding: 8 }}>Alta</th>
            <th style={{ padding: 8 }}>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((c) => {
            const isEditing = editingId === c.id;
            const err = rowError?.[c.id];

            return (
              <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>
                  {isEditing ? (
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                      style={{ width: "100%", padding: 8 }}
                    />
                  ) : (
                    c.name
                  )}
                </td>

                <td style={{ padding: 8 }}>
                  {isEditing ? (
                    <input
                      value={editForm.slug}
                      onChange={(e) => setEditForm((s) => ({ ...s, slug: e.target.value }))}
                      style={{ width: "100%", padding: 8 }}
                    />
                  ) : (
                    c.slug
                  )}
                </td>

                <td style={{ padding: 8 }}>
                  {isEditing ? (
                    <select
                      value={editForm.plan}
                      onChange={(e) => setEditForm((s) => ({ ...s, plan: e.target.value }))}
                      style={{ width: "100%", padding: 8 }}
                    >
                      <option value="basic">basic</option>
                      <option value="investor">investor</option>
                      <option value="enterprise">enterprise</option>
                    </select>
                  ) : (
                    c.plan
                  )}
                </td>

                <td style={{ padding: 8 }}>
                  {isEditing ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value }))}
                      style={{ width: "100%", padding: 8 }}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  ) : (
                    c.status
                  )}
                </td>

                <td style={{ padding: 8 }}>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.start_date || ""}
                      onChange={(e) => setEditForm((s) => ({ ...s, start_date: e.target.value }))}
                      style={{ width: "100%", padding: 8 }}
                    />
                  ) : (
                    c.start_date ?? "-"
                  )}
                </td>

                <td style={{ padding: 8 }}>
                  {isEditing ? (
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button onClick={onSaveEdit} disabled={saving} style={{ padding: "8px 12px" }}>
                        {saving ? "Guardando..." : "Guardar"}
                      </button>
                      <button onClick={onCancelEdit} disabled={saving} style={{ padding: "8px 12px" }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <button
                        onClick={() => onClickEdit(c)}
                        style={{ padding: "8px 12px", background: "transparent", border: "1px solid #ddd" }}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => onClickDelete(c.id, c.name)}
                        disabled={deletingId === c.id}
                        style={{
                          padding: "8px 12px",
                          background: "#e11d48",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {deletingId === c.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  )}

                  {err ? <div style={{ color: "crimson", marginTop: 6, fontSize: 12 }}>{err}</div> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button onClick={load} style={{ marginTop: 12 }}>
        Recargar
      </button>
    </div>
  );
}
