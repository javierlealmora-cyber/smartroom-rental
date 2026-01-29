// src/pages/admin/occupancy/OccupancyHistory.jsx
import { useState, useEffect } from "react";
import Sidebar from "../../../components/Sidebar";
import { useAuth } from "../../../providers/AuthProvider";
import { getCompanies } from "../../../services/companies.service";

export default function OccupancyHistory() {
  const { profile } = useAuth();
  const role = profile?.role;
  const userCompanyId = profile?.company_id;
  const isSuperadmin = role === "superadmin";

  // Estado para filtro de empresa (solo visible para superadmin)
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(userCompanyId || "");

  const currentYear = new Date().getFullYear();
  const [selectedApartment, setSelectedApartment] = useState("1");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  // Cargar lista de empresas para superadmin
  useEffect(() => {
    if (isSuperadmin) {
      loadCompanies();
    } else if (userCompanyId) {
      setSelectedCompanyId(userCompanyId);
    }
  }, [isSuperadmin, userCompanyId]);

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      const activeCompanies = data.filter(c => c.status === "active");
      setCompanies(activeCompanies);
      if (activeCompanies.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(activeCompanies[0].id);
      }
    } catch (err) {
      console.error("[OccupancyHistory] Error loading companies:", err);
    }
  };

  const sidebarItems = [
    { label: "Visión General", path: "/alojamientos", icon: "⊞" },
    { type: "section", label: "ALOJAMIENTO" },
    { label: "Gestión de Alojamiento", path: "/alojamientos/gestion", icon: "🏢", isSubItem: true },
    { label: "Gestión de Inquilinos", path: "/alojamientos/inquilinos", icon: "👥", isSubItem: true },
    { label: "Historial de Ocupación", path: "/alojamientos/ocupacion", icon: "⏱", isSubItem: true },
  ];

  // Datos dummy
  const apartments = [
    { id: "1", name: "Edificio Central", rooms: 12 },
    { id: "2", name: "Residencia Norte", rooms: 8 },
    { id: "3", name: "Apartamento Sur", rooms: 6 },
  ];

  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  // Datos de ocupación dummy (room: number, periods: [{startMonth, endMonth, tenant}])
  const occupancyData = [
    {
      room: 1,
      periods: [
        { startMonth: 0, endMonth: 5, tenant: "Ana Martínez" },
        { startMonth: 6, endMonth: 11, tenant: "Pedro Sánchez" },
      ],
    },
    {
      room: 2,
      periods: [{ startMonth: 2, endMonth: 8, tenant: "Luis González" }],
    },
    {
      room: 3,
      periods: [{ startMonth: 0, endMonth: 11, tenant: "María García" }],
    },
    {
      room: 4,
      periods: [],
    },
    {
      room: 5,
      periods: [
        { startMonth: 0, endMonth: 3, tenant: "Carlos López" },
        { startMonth: 5, endMonth: 11, tenant: "Juan Pérez" },
      ],
    },
    {
      room: 6,
      periods: [],
    },
    {
      room: 7,
      periods: [],
    },
    {
      room: 8,
      periods: [{ startMonth: 3, endMonth: 9, tenant: "Laura Torres" }],
    },
    {
      room: 9,
      periods: [],
    },
    {
      room: 10,
      periods: [{ startMonth: 0, endMonth: 11, tenant: "David Ruiz" }],
    },
    {
      room: 11,
      periods: [],
    },
    {
      room: 12,
      periods: [{ startMonth: 7, endMonth: 11, tenant: "Elena Morales" }],
    },
  ];

  const selectedApartmentData = apartments.find((apt) => apt.id === selectedApartment);

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="Alojamientos" />
      <div style={styles.container}>
        <h1 style={styles.title}>Historial de Ocupación</h1>

      <div style={styles.filtersContainer}>
        {/* Selector de empresa - solo visible para superadmin */}
        {isSuperadmin && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Empresa</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              style={styles.select}
            >
              <option value="">-- Seleccionar empresa --</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>Alojamiento</label>
          <select
            value={selectedApartment}
            onChange={(e) => setSelectedApartment(e.target.value)}
            style={styles.select}
          >
            {apartments.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Año</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={styles.select}
          >
            <option value={(currentYear - 1).toString()}>{currentYear - 1}</option>
            <option value={currentYear.toString()}>{currentYear}</option>
            <option value={(currentYear + 1).toString()}>{currentYear + 1}</option>
          </select>
        </div>
      </div>

      <div style={styles.chartContainer}>
        {/* Header con meses */}
        <div style={styles.chartHeader}>
          <div style={styles.roomLabelHeader}>Habitación</div>
          <div style={styles.timelineHeader}>
            {months.map((month, index) => (
              <div key={index} style={styles.monthLabel}>
                {month}
              </div>
            ))}
          </div>
        </div>

        {/* Filas de habitaciones */}
        <div style={styles.chartBody}>
          {occupancyData.map((roomData) => (
            <div key={roomData.room} style={styles.chartRow}>
              <div style={styles.roomLabel}>Hab. {roomData.room}</div>
              <div style={styles.timeline}>
                {/* Grid de meses (background) */}
                {months.map((_, monthIndex) => (
                  <div key={monthIndex} style={styles.monthCell}></div>
                ))}

                {/* Barras de ocupación */}
                {roomData.periods.map((period, periodIndex) => {
                  const width = ((period.endMonth - period.startMonth + 1) / 12) * 100;
                  const left = (period.startMonth / 12) * 100;

                  return (
                    <div
                      key={periodIndex}
                      style={{
                        ...styles.occupancyBar,
                        width: `${width}%`,
                        left: `${left}%`,
                      }}
                      title={`${period.tenant} (${months[period.startMonth]} - ${months[period.endMonth]})`}
                    >
                      <span style={styles.tenantName}>{period.tenant}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, backgroundColor: "#3B82F6" }}></div>
          <span>Ocupado</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, backgroundColor: "#F3F4F6" }}></div>
          <span>Libre</span>
        </div>
      </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },

  container: {
    flex: 1,
    padding: 40,
    overflow: "auto",
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 32,
    margin: 0,
    marginBottom: 32,
  },

  filtersContainer: {
    display: "flex",
    gap: 16,
    marginBottom: 32,
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    minWidth: 200,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  select: {
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
  },

  chartContainer: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    overflow: "auto",
    marginBottom: 24,
  },

  chartHeader: {
    display: "flex",
    borderBottom: "2px solid #E5E7EB",
    position: "sticky",
    top: 0,
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },

  roomLabelHeader: {
    width: 120,
    flexShrink: 0,
    padding: "12px 16px",
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    backgroundColor: "#F9FAFB",
    borderRight: "1px solid #E5E7EB",
  },

  timelineHeader: {
    flex: 1,
    display: "flex",
    minWidth: 900,
  },

  monthLabel: {
    flex: 1,
    padding: "12px 8px",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    borderRight: "1px solid #F3F4F6",
  },

  chartBody: {
    minHeight: 400,
  },

  chartRow: {
    display: "flex",
    borderBottom: "1px solid #F3F4F6",
    minHeight: 50,
  },

  roomLabel: {
    width: 120,
    flexShrink: 0,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    backgroundColor: "#F9FAFB",
    borderRight: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
  },

  timeline: {
    flex: 1,
    display: "flex",
    position: "relative",
    minWidth: 900,
  },

  monthCell: {
    flex: 1,
    borderRight: "1px solid #F3F4F6",
    backgroundColor: "#FAFAFA",
  },

  occupancyBar: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    height: 32,
    backgroundColor: "#3B82F6",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    padding: "0 8px",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  },

  tenantName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  legend: {
    display: "flex",
    gap: 24,
    justifyContent: "center",
    padding: 16,
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#374151",
  },

  legendColor: {
    width: 24,
    height: 16,
    borderRadius: 4,
    border: "1px solid #E5E7EB",
  },
};
