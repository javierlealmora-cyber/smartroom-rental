// src/pages/v2/superadmin/ClientAccountDetail.jsx
// Detalle de Cuenta Cliente para Superadmin
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import V2Layout from "../../../layouts/V2Layout";
import { supabase } from "../../../services/supabaseClient";

// Helpers locales — sustituyen el mock que usaba IDs ficticios
const STATUS = { ACTIVE: "active", SUSPENDED: "suspended", CANCELLED: "cancelled" };
const getPlanLabel = (p) => p ?? "—";
const getPlanColor = () => "#6B7280";
const getStatusLabel = (s) => ({ active: "Activo", suspended: "Suspendido", cancelled: "Cancelado" }[s] ?? s ?? "—");
const getStatusColor = (s) => ({ active: "#059669", suspended: "#D97706", cancelled: "#DC2626" }[s] ?? "#6B7280");
const formatDate = (d) => d ? new Date(d).toLocaleDateString("es-ES") : "—";

/** Devuelve el nombre de visualización:
 *  - persona_fisica / autonomo → "Nombre Apellido1 Apellido2"
 *  - persona_juridica          → legal_name
 *  - sin entidad               → fallback (account.name)
 */
const getDisplayName = (entity, fallback) => {
  if (!entity) return fallback;
  const isPhysical = ["persona_fisica", "autonomo"].includes(entity.legal_type);
  if (isPhysical) {
    return [entity.first_name, entity.last_name1, entity.last_name2]
      .filter(Boolean).join(" ") || fallback;
  }
  return entity.legal_name || fallback;
};

export default function ClientAccountDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [payerEntity, setPayerEntity] = useState(null);
  const [ownerEntities, setOwnerEntities] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [salSubscription, setSalSubscription] = useState(null); // { status, activated_at, plan_name }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Cargar account real de Supabase (no mock)
        const { data: acc, error: accErr } = await supabase
          .from("client_accounts")
          .select("id, name, last_name1, last_name2, status, plan_code, created_at, updated_at")
          .eq("id", id)
          .single();

        if (accErr) throw new Error(accErr.message);

        // Nombre completo: name (nombre de pila) + apellidos propios de client_accounts
        const ownerFullName = [acc.name, acc.last_name1, acc.last_name2]
          .filter(Boolean).join(" ") || acc.name;

        // Adaptar plan_code → plan; rellenar campos opcionales del mock con null
        setAccount({
          slug: null, billing_start_date: null, theme_primary_color: "#6B7280", logo_url: null,
          ...acc,
          ownerFullName,
          plan: acc.plan_code,
        });

        // Entidades reales
        try {
          const { data: entities } = await supabase
            .from("entities")
            .select("*")
            .eq("client_account_id", id);
          const payer = (entities || []).find((e) => e.type === "payer") || null;
          const owners = (entities || []).filter((e) => e.type === "owner");
          setPayerEntity(payer);
          setOwnerEntities(owners);
        } catch {
          setPayerEntity(null);
          setOwnerEntities([]);
        }

        // Alojamientos reales con conteo de habitaciones
        try {
          const { data: accs } = await supabase
            .from("accommodations")
            .select("id, name, address_street, address_city, status")
            .eq("client_account_id", id);

          if (accs?.length) {
            const accIds = accs.map((a) => a.id);

            // Habitaciones de estos alojamientos
            const { data: rooms } = await supabase
              .from("rooms")
              .select("id, accommodation_id")
              .in("accommodation_id", accIds);

            const allRooms = rooms ?? [];
            const allRoomIds = allRooms.map((r) => r.id);

            // Asignaciones activas (sin fecha de salida)
            const { data: activeAssignments } = allRoomIds.length
              ? await supabase
                  .from("lodger_room_assignments")
                  .select("room_id")
                  .in("room_id", allRoomIds)
                  .is("move_out_date", null)
              : { data: [] };

            // Mapas: room_id → accommodation_id
            const roomToAcc = {};
            allRooms.forEach((r) => { roomToAcc[r.id] = r.accommodation_id; });

            // Conteo total de habitaciones por alojamiento
            const roomCount = {};
            allRooms.forEach((r) => {
              roomCount[r.accommodation_id] = (roomCount[r.accommodation_id] || 0) + 1;
            });

            // Conteo de habitaciones ocupadas por alojamiento
            const occupiedCount = {};
            (activeAssignments ?? []).forEach((a) => {
              const accId = roomToAcc[a.room_id];
              if (accId) occupiedCount[accId] = (occupiedCount[accId] || 0) + 1;
            });

            setAccommodations(accs.map((a) => ({
              ...a,
              stats: {
                total_rooms: roomCount[a.id] || 0,
                occupied:    occupiedCount[a.id] || 0,
              },
            })));
          } else {
            setAccommodations([]);
          }
        } catch {
          setAccommodations([]);
        }

        // Usuarios/perfiles reales
        try {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, email, role, status")
            .eq("client_account_id", id);
          setUsers(profs ?? []);
        } catch {
          setUsers([]);
        }

        // Suscripción SAL (no bloquea si la tabla no existe)
        try {
          const { data: sub } = await supabase
            .from("saas_service_subscriptions")
            .select(`id, status, activated_at, saas_service_plans ( name )`)
            .eq("client_account_id", id)
            .maybeSingle();
          setSalSubscription(sub ?? null);
        } catch {
          setSalSubscription(null);
        }
      } catch {
        setAccount(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <V2Layout role="superadmin" userName="Administrador">
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}>Cargando...</div>
        </div>
      </V2Layout>
    );
  }

  if (!account) {
    return (
      <V2Layout role="superadmin" userName="Administrador">
        <div style={styles.errorCard}>
          <h2>Cuenta no encontrada</h2>
          <p>No se encontró ninguna cuenta con el ID especificado.</p>
          <button
            style={styles.primaryButton}
            onClick={() => navigate("/v2/superadmin/cuentas")}
          >
            Volver al listado
          </button>
        </div>
      </V2Layout>
    );
  }

  const accountCompany = payerEntity;
  const fiscalCompanies = ownerEntities;
  // Nombre de la entidad pagadora (solo si es distinto del nombre del titular de la cuenta)
  const payerDisplayName = getDisplayName(payerEntity, null);
  const showPayerName = payerDisplayName && payerDisplayName !== account.ownerFullName;
  const totalRooms    = accommodations.reduce((s, a) => s + (a.stats?.total_rooms || 0), 0);
  const occupiedRooms = accommodations.reduce((s, a) => s + (a.stats?.occupied    || 0), 0);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const tabs = [
    { id: "overview", label: "Resumen", icon: "📊" },
    { id: "companies", label: "Empresas", icon: "🏢" },
    { id: "accommodations", label: "Alojamientos", icon: "🏠" },
    { id: "users", label: "Usuarios", icon: "👥" },
    { id: "addons", label: "Add-ons", icon: "🔌" },
    { id: "settings", label: "Configuración", icon: "⚙️" },
  ];

  // ── Helpers SAL ────────────────────────────────────────────────────────────
  const salStatus = salSubscription?.status ?? null;
  const salStatusLabel = { active: "Activo", pending: "Pendiente", suspended: "Suspendido", cancelled: "Cancelado" };
  const salStatusColor = { active: "#059669", pending: "#D97706", suspended: "#D97706", cancelled: "#DC2626" };

  return (
    <V2Layout
      role="superadmin"
      userName="Administrador"
      customBreadcrumbs={[
        { label: "Dashboard", path: "/v2/superadmin" },
        { label: "Cuentas Cliente", path: "/v2/superadmin/cuentas" },
        { label: account.ownerFullName, path: null },
      ]}
    >
      {/* Header con info de la cuenta */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {account.logo_url ? (
            <img src={account.logo_url} alt="" style={styles.accountLogo} />
          ) : (
            <div
              style={{
                ...styles.accountLogoPlaceholder,
                backgroundColor: account.theme_primary_color || "#6B7280",
              }}
            >
              {account.ownerFullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            {/* Cuenta Cliente */}
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
              Cuenta Cliente
            </div>
            <h1 style={styles.title}>{account.ownerFullName}</h1>

            {/* Entidad de Facturación — solo si existe y es distinta del nombre del titular */}
            {showPayerName && (
              <div style={{ marginTop: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Entidad de Facturación&nbsp;
                </span>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{payerDisplayName}</span>
              </div>
            )}

            <div style={{ ...styles.headerMeta, marginTop: 8 }}>
              <span
                style={{
                  ...styles.planBadge,
                  backgroundColor: `${getPlanColor(account.plan)}15`,
                  color: getPlanColor(account.plan),
                  border: `1px solid ${getPlanColor(account.plan)}40`,
                }}
              >
                {getPlanLabel(account.plan)}
              </span>
              <span
                style={{
                  ...styles.statusBadge,
                  backgroundColor: `${getStatusColor(account.status)}15`,
                  color: getStatusColor(account.status),
                  border: `1px solid ${getStatusColor(account.status)}40`,
                }}
              >
                {getStatusLabel(account.status)}
              </span>
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          {account.status === STATUS.ACTIVE ? (
            <button
              style={styles.warningButton}
              onClick={() => {
                if (window.confirm(`¿Suspender la cuenta "${account.ownerFullName}"?`)) {
                  alert("Cuenta suspendida (mock)");
                }
              }}
            >
              Suspender
            </button>
          ) : (
            <button
              style={styles.successButton}
              onClick={() => {
                if (window.confirm(`¿Reactivar la cuenta "${account.ownerFullName}"?`)) {
                  alert("Cuenta reactivada (mock)");
                }
              }}
            >
              Reactivar
            </button>
          )}
          <button
            style={styles.primaryButton}
            onClick={() => navigate(`/v2/superadmin/cuentas/${id}/editar`)}
          >
            Editar Cuenta
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}
      <div style={styles.content}>
        {/* Tab: Resumen */}
        {activeTab === "overview" && (
          <>
            {/* KPIs */}
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Alojamientos</div>
                <div style={styles.kpiValue}>{accommodations.length}</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Habitaciones</div>
                <div style={styles.kpiValue}>{totalRooms}</div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Ocupadas</div>
                <div style={{ ...styles.kpiValue, color: "#059669" }}>
                  {occupiedRooms}
                </div>
              </div>
              <div style={styles.kpiCard}>
                <div style={styles.kpiLabel}>Ocupación</div>
                <div
                  style={{
                    ...styles.kpiValue,
                    color: occupancyRate > 80 ? "#059669" : occupancyRate > 50 ? "#F59E0B" : "#DC2626",
                  }}
                >
                  {occupancyRate}%
                </div>
              </div>
            </div>

            <div style={styles.twoColumnGrid}>
              {/* Info de la cuenta */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Información de la Cuenta</h3>
                <div style={styles.infoGrid}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Fecha de alta:</span>
                    <span style={styles.infoValue}>{formatDate(account.created_at)}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Inicio facturación:</span>
                    <span style={styles.infoValue}>{formatDate(account.billing_start_date)}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Última actualización:</span>
                    <span style={styles.infoValue}>{formatDate(account.updated_at)}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Color primario:</span>
                    <span style={styles.infoValue}>
                      <span
                        style={{
                          ...styles.colorDot,
                          backgroundColor: account.theme_primary_color,
                        }}
                      />
                      {account.theme_primary_color}
                    </span>
                  </div>
                </div>
              </div>

              {/* Empresa pagadora */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Empresa Pagadora</h3>
                {accountCompany ? (
                  <div style={styles.infoGrid}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Nombre fiscal:</span>
                      <span style={styles.infoValue}>{accountCompany.legal_name || "-"}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>CIF/NIF:</span>
                      <span style={styles.infoValue}>{accountCompany.tax_id || "-"}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Email:</span>
                      <span style={styles.infoValue}>{accountCompany.billing_email || "-"}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Teléfono:</span>
                      <span style={styles.infoValue}>{accountCompany.phone || "-"}</span>
                    </div>
                  </div>
                ) : (
                  <p style={styles.emptyText}>No hay empresa pagadora configurada</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Tab: Empresas */}
        {activeTab === "companies" && (
          <>
            {/* Entidades Propietarias */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Entidades Propietarias</h3>
              </div>
              {fiscalCompanies.length > 0 ? (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Nombre</th>
                      <th style={styles.th}>CIF/NIF</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiscalCompanies.map((fc) => (
                      <tr key={fc.id} style={styles.tr}>
                        <td style={styles.td}>{fc.legal_name || fc.first_name || "-"}</td>
                        <td style={styles.td}>{fc.tax_id || "-"}</td>
                        <td style={styles.td}>{fc.billing_email || "-"}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badge,
                              backgroundColor: `${getStatusColor(fc.status)}15`,
                              color: getStatusColor(fc.status),
                            }}
                          >
                            {getStatusLabel(fc.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={styles.emptyText}>No hay entidades propietarias configuradas</p>
              )}
            </div>
          </>
        )}

        {/* Tab: Alojamientos */}
        {activeTab === "accommodations" && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Alojamientos</h3>
              <span style={styles.countBadge}>{accommodations.length}</span>
            </div>
            {accommodations.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>Dirección</th>
                    <th style={styles.th}>Habitaciones</th>
                    <th style={styles.th}>Ocupación</th>
                    <th style={styles.th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {accommodations.map((acc) => {
                    const occRate = acc.stats?.total_rooms > 0
                      ? Math.round((acc.stats.occupied / acc.stats.total_rooms) * 100)
                      : 0;
                    return (
                      <tr key={acc.id} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={styles.accName}>{acc.name}</span>
                        </td>
                        <td style={styles.td}>
                          {[acc.address_street, acc.address_city].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.roomStats}>
                            <span style={{ color: "#059669" }}>{acc.stats?.occupied || 0}</span>
                            {" / "}
                            <span>{acc.stats?.total_rooms || 0}</span>
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.progressContainer}>
                            <div style={styles.progressBar}>
                              <div
                                style={{
                                  ...styles.progressFill,
                                  width: `${occRate}%`,
                                  backgroundColor: occRate > 80 ? "#059669" : "#F59E0B",
                                }}
                              />
                            </div>
                            <span>{occRate}%</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badge,
                              backgroundColor: `${getStatusColor(acc.status)}15`,
                              color: getStatusColor(acc.status),
                            }}
                          >
                            {getStatusLabel(acc.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={styles.emptyText}>No hay alojamientos registrados</p>
            )}
          </div>
        )}

        {/* Tab: Usuarios */}
        {activeTab === "users" && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Usuarios de la Cuenta</h3>
              <button
                style={styles.addButton}
                onClick={() => navigate(`/v2/superadmin/cuentas/${id}/usuarios`)}
              >
                Gestionar Usuarios
              </button>
            </div>
            {users.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Rol</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={styles.tr}>
                      <td style={styles.td}>{user.full_name}</td>
                      <td style={styles.td}>{user.email}</td>
                      <td style={styles.td}>
                        <span style={styles.roleBadge}>{user.role}</span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor: `${getStatusColor(user.status)}15`,
                            color: getStatusColor(user.status),
                          }}
                        >
                          {getStatusLabel(user.status)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button style={styles.actionLink}>Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={styles.emptyText}>No hay usuarios registrados</p>
            )}
          </div>
        )}

        {/* Tab: Add-ons SaaS */}
        {activeTab === "addons" && (
          <div>
            {/* SmartAccessLock */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🔐</span>
                  <div>
                    <h3 style={{ ...styles.cardTitle, marginBottom: 2 }}>SmartAccessLock</h3>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>
                      Gestión de accesos con cerraduras TTLock
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {salStatus ? (
                    <span style={{
                      ...styles.badge,
                      backgroundColor: `${salStatusColor[salStatus]}15`,
                      color: salStatusColor[salStatus],
                    }}>
                      {salStatusLabel[salStatus] ?? salStatus}
                    </span>
                  ) : (
                    <span style={{ ...styles.badge, backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                      No contratado
                    </span>
                  )}
                  <button
                    style={styles.primaryButton}
                    onClick={() => navigate(`/v2/superadmin/cuentas/${id}/smart-access`)}
                  >
                    {salStatus === "active" ? "Gestionar SAL" : "Activar SAL"}
                  </button>
                </div>
              </div>

              {salSubscription && (
                <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 16, marginTop: 4 }}>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Plan</span>
                      <span style={styles.infoValue}>
                        {salSubscription.saas_service_plans?.name ?? "Sin plan asignado"}
                      </span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Activado el</span>
                      <span style={styles.infoValue}>
                        {salSubscription.activated_at
                          ? formatDate(salSubscription.activated_at)
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!salSubscription && (
                <p style={{ ...styles.emptyText, paddingTop: 12, paddingBottom: 4 }}>
                  SmartAccessLock no está activo para esta cuenta. Haz clic en "Activar SAL" para configurarlo.
                </p>
              )}
            </div>

            {/* Placeholder para futuros add-ons */}
            <div style={{ ...styles.card, opacity: 0.5, border: "1px dashed #D1D5DB" }}>
              <div style={styles.cardHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>📋</span>
                  <div>
                    <h3 style={{ ...styles.cardTitle, marginBottom: 2 }}>Ticket Incidencias</h3>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>
                      Sistema de tickets para gestión de incidencias
                    </span>
                  </div>
                </div>
                <span style={{ ...styles.badge, backgroundColor: "#F3F4F6", color: "#9CA3AF" }}>
                  Próximamente
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Configuración */}
        {activeTab === "settings" && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Configuración de la Cuenta</h3>
            <div style={styles.settingsGrid}>
              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <h4 style={styles.settingTitle}>Cambiar Plan</h4>
                  <p style={styles.settingDesc}>
                    Plan actual: <strong>{getPlanLabel(account.plan)}</strong>
                  </p>
                </div>
                <button style={styles.settingButton}>Cambiar</button>
              </div>
              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <h4 style={styles.settingTitle}>Branding</h4>
                  <p style={styles.settingDesc}>Personalizar logo y colores</p>
                </div>
                <button style={styles.settingButton}>Editar</button>
              </div>
              <div style={styles.settingItem}>
                <div style={styles.settingInfo}>
                  <h4 style={styles.settingTitle}>Datos Fiscales</h4>
                  <p style={styles.settingDesc}>Empresa pagadora y facturación</p>
                </div>
                <button style={styles.settingButton}>Editar</button>
              </div>
              <div style={{ ...styles.settingItem, borderColor: "#DC2626" }}>
                <div style={styles.settingInfo}>
                  <h4 style={{ ...styles.settingTitle, color: "#DC2626" }}>Zona de Peligro</h4>
                  <p style={styles.settingDesc}>Cancelar cuenta permanentemente</p>
                </div>
                <button style={{ ...styles.settingButton, color: "#DC2626", borderColor: "#DC2626" }}>
                  Cancelar Cuenta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </V2Layout>
  );
}

const styles = {
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "50vh",
  },
  spinner: {
    fontSize: 18,
    color: "#6B7280",
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    padding: 32,
    borderRadius: 12,
    textAlign: "center",
    maxWidth: 400,
    margin: "100px auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  headerLeft: {
    display: "flex",
    gap: 20,
    alignItems: "center",
  },
  accountLogo: {
    width: 64,
    height: 64,
    borderRadius: 12,
    objectFit: "cover",
  },
  accountLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },
  headerMeta: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginTop: 8,
  },
  slug: {
    fontSize: 14,
    color: "#6B7280",
  },
  planBadge: {
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "500",
  },
  statusBadge: {
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "500",
  },
  headerActions: {
    display: "flex",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
  },
  warningButton: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    border: "1px solid #F59E0B",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
  },
  successButton: {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
    border: "1px solid #059669",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
  },
  tabs: {
    display: "flex",
    gap: 8,
    marginBottom: 24,
    borderBottom: "1px solid #E5E7EB",
    paddingBottom: 0,
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 20px",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    fontSize: 14,
    color: "#6B7280",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginBottom: -1,
  },
  tabActive: {
    color: "#111827",
    fontWeight: "600",
    borderBottomColor: "#111827",
  },
  content: {},
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 20,
    marginBottom: 24,
  },
  kpiCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
  },
  kpiLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    marginBottom: 24,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  addButton: {
    backgroundColor: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: "500",
    cursor: "pointer",
    color: "#374151",
  },
  countBadge: {
    backgroundColor: "#E5E7EB",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  infoGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottom: "1px solid #F3F4F6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    border: "1px solid #E5E7EB",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    backgroundColor: "#F9FAFB",
    borderBottom: "1px solid #E5E7EB",
  },
  tr: {
    borderBottom: "1px solid #F3F4F6",
  },
  td: {
    padding: "14px 16px",
    fontSize: 14,
    color: "#374151",
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "500",
  },
  roleBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "500",
    backgroundColor: "#E5E7EB",
    color: "#374151",
    textTransform: "uppercase",
  },
  actionLink: {
    backgroundColor: "transparent",
    border: "none",
    color: "#3B82F6",
    fontSize: 13,
    fontWeight: "500",
    cursor: "pointer",
    padding: 0,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    padding: 32,
  },
  accName: {
    fontWeight: "600",
    color: "#111827",
  },
  roomStats: {
    fontWeight: "500",
  },
  progressContainer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    width: 60,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  settingsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  settingItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
  },
  settingInfo: {},
  settingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  settingDesc: {
    fontSize: 13,
    color: "#6B7280",
    margin: "4px 0 0 0",
  },
  settingButton: {
    padding: "8px 16px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: "500",
    cursor: "pointer",
    color: "#374151",
  },
};
