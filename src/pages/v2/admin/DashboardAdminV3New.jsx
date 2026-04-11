// src/pages/v2/admin/DashboardAdminV3New.jsx
// Dashboard Admin V3 con visualizaciones 3D profesionales

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import V2Layout from "../../../layouts/V2Layout";
import { useAdminLayout } from "../../../hooks/useAdminLayout";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../services/supabaseClient";
import GraficoGenero3D from "../../../components/charts/GraficoGenero3D";
import GraficoIngresos3D from "../../../components/charts/GraficoIngresos3D";
import GraficoHorizontal3D from "../../../components/charts/GraficoHorizontal3D";

// Hook para detectar tamaño de pantalla
function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState('desktop');
  
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 480) setBreakpoint('mobile');
      else if (width < 768) setBreakpoint('tablet-small');
      else if (width < 1200) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };
    
    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);
  
  return breakpoint;
}

// Utilidades
const fEur = v => Number(v||0).toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const timeAgo = iso => {
  const s = Math.floor((Date.now()-new Date(iso))/1000);
  return s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:s<86400?`${Math.floor(s/3600)}h`:`${Math.floor(s/86400)}d`;
};

// Componente KPI Card con efectos 3D
function KPICard({ label, value, subtitle = "activos", color = "#4F46E5", loading }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '20px 24px',
        border: '1px solid #E5E7EB',
        boxShadow: hov ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        cursor: 'default',
        textAlign: 'center',
      }}
    >
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#9CA3AF',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 48,
        fontWeight: 900,
        color: loading ? '#D1D5DB' : color,
        letterSpacing: '-1px',
        lineHeight: 1,
        marginBottom: 8,
        textShadow: '8px 8px 16px rgba(30, 30, 30, 0.75)',
      }}>
        {loading ? '—' : value}
      </div>
      <div style={{
        fontSize: 14,
        fontWeight: 500,
        color: '#9CA3AF',
        letterSpacing: '0.02em',
      }}>
        {subtitle}
      </div>
    </div>
  );
}

// Componente Actividad Reciente
function ActividadReciente({ items, loading }) {
  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        minHeight: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
      }}>
        Cargando actividad...
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <div>No hay actividad reciente</div>
      </div>
    );
  }

  const getActionLabel = (action) => {
    const labels = {
      create: 'Creado',
      update: 'Actualizado',
      delete: 'Eliminado',
      assign: 'Asignado',
      checkout: 'Check-out',
    };
    return labels[action] || action;
  };

  const getEntityLabel = (type) => {
    const labels = {
      lodger: 'Inquilino',
      room: 'Habitación',
      accommodation: 'Alojamiento',
      energy_bill: 'Factura',
      bulletin: 'Boletín',
    };
    return labels[type] || type;
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    }}>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: 16,
        fontWeight: 700,
        color: '#1F2937',
      }}>
        Actividad Reciente
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10B981',
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: '#10B981' }}>
                  {getActionLabel(item.action)}
                </span>
                {' '}{getEntityLabel(item.entity_type)}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                {item.actor_name || item.actor_role || 'Sistema'} · {timeAgo(item.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardAdminV3New() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const { role } = useAuth();
  const breakpoint = useBreakpoint();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [generoData, setGeneroData] = useState([]);
  const [ingresosData, setIngresosData] = useState([]);
  const [actividadData, setActividadData] = useState([]);

  const loadDashboardData = useCallback(async () => {
    if (!clientAccountId) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      
      // Consultas paralelas
      const [
        { data: accommodations },
        { data: rooms },
        { data: assignments },
        { data: lodgers },
        { data: energyBills },
        { data: auditLog },
      ] = await Promise.all([
        supabase.from("accommodations").select("id,name").eq("client_account_id", clientAccountId).eq("status", "active"),
        supabase.from("rooms").select("id,is_maintenance").eq("client_account_id", clientAccountId),
        // Traer todas las asignaciones (sin filtro de fecha para evitar perder datos)
        supabase.from("lodger_room_assignments")
          .select("room_id,move_out_date,monthly_rent,billing_start_date")
          .eq("client_account_id", clientAccountId),
        supabase.from("profiles").select("id,gender").eq("role", "lodger").eq("client_account_id", clientAccountId),
        supabase.from("energy_bills").select("issue_date,amount_total,utility_type").eq("client_account_id", clientAccountId).eq("utility_type", "electricity").gte("issue_date", twelveMonthsAgo.toISOString().split("T")[0]),
        supabase.from("audit_log").select("id,entity_type,action,actor_role,actor_user_id,created_at").eq("client_account_id", clientAccountId).order("created_at", { ascending: false }).limit(10),
      ]);

      // Calcular estadísticas de habitaciones
      const allRooms = rooms || [];
      const byRoom = {};
      (assignments || []).forEach(a => { byRoom[a.room_id] = a; });
      
      let free = 0, occupied = 0, pending = 0;
      allRooms.forEach(r => {
        if (r.is_maintenance) return;
        const a = byRoom[r.id];
        if (!a) free++;
        else if (!a.move_out_date || a.move_out_date > today) occupied++;
        else pending++;
      });

      const totalRooms = allRooms.filter(r => !r.is_maintenance).length;
      const occRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

      // Datos de género
      const genderCounts = {};
      (lodgers || []).forEach(l => {
        const g = l.gender || 'other';
        genderCounts[g] = (genderCounts[g] || 0) + 1;
      });
      const generoChartData = Object.entries(genderCounts).map(([gender, count]) => ({
        gender,
        value: count,
      }));

      // Ingresos teóricos mensuales - solo meses pasados y actual
      const ingresosChartData = [];
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12
      
      console.log('📊 Calculando ingresos - Año actual:', currentYear, 'Mes actual:', currentMonth);
      console.log('📊 Asignaciones disponibles:', assignments?.length || 0);
      if (assignments && assignments.length > 0) {
        console.log('📊 TODAS las asignaciones:', assignments);
        console.log('📊 Primera asignación - billing_start_date:', assignments[0]?.billing_start_date);
        console.log('📊 Primera asignación - move_out_date:', assignments[0]?.move_out_date);
        console.log('📊 Primera asignación - monthly_rent:', assignments[0]?.monthly_rent);
      }
      
      // Determinar años a mostrar (año anterior y año actual)
      const years = [currentYear - 1, currentYear];
      
      years.forEach(year => {
        for (let month = 1; month <= 12; month++) {
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0);
          
          // Solo mostrar meses pasados o el mes actual (no futuros)
          if (year > currentYear || (year === currentYear && month > currentMonth)) {
            continue;
          }
          
          // Calcular ingresos teóricos de ese mes (asignaciones activas)
          let monthlyIncome = 0;
          (assignments || []).forEach(a => {
            if (!a.monthly_rent) return;
            
            const startDate = a.billing_start_date ? new Date(a.billing_start_date) : null;
            const endDate = a.move_out_date ? new Date(a.move_out_date) : null;
            
            // Si la asignación estaba activa en ese mes
            const isActive = (!startDate || startDate <= monthEnd) && (!endDate || endDate >= monthStart);
            
            if (isActive) {
              monthlyIncome += Number(a.monthly_rent);
            }
          });
          
          // Siempre agregar el mes, incluso si el ingreso es 0
          ingresosChartData.push({ 
            month, 
            year,
            value: monthlyIncome,
            name: `${['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][month - 1]}`
          });
          
          if (monthlyIncome > 0) {
            console.log(`📊 ${year}-${month}: ${monthlyIncome}€`);
          }
        }
      });
      
      console.log('📊 Total de datos de ingresos generados:', ingresosChartData.length);
      console.log('📊 Datos de ingresos:', ingresosChartData.filter(d => d.value > 0));

      // Gastos electricidad por mes
      const gastosPorMes = {};
      (energyBills || []).forEach(b => {
        if (!b.issue_date || !b.amount_total) return;
        const date = new Date(b.issue_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        gastosPorMes[monthKey] = (gastosPorMes[monthKey] || 0) + Number(b.amount_total);
      });
      
      const avgElectricity = Object.values(gastosPorMes).length > 0
        ? Object.values(gastosPorMes).reduce((a, b) => a + b, 0) / Object.values(gastosPorMes).length
        : 0;

      setStats({
        totalAccommodations: (accommodations || []).length,
        totalRooms,
        occupied,
        free,
        pending,
        occRate,
        activeTenants: (lodgers || []).length,
        avgElectricity,
      });

      setGeneroData(generoChartData);
      setIngresosData(ingresosChartData);
      setActividadData(auditLog || []);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Configuración responsive basada en breakpoint
  const isMobile = breakpoint === 'mobile';
  const isTabletSmall = breakpoint === 'tablet-small';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';
  
  const gridCols = isDesktop ? 'repeat(12, 1fr)' : '1fr';
  const kpiCols = isMobile ? '1fr' : isTabletSmall ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)';
  const imageSpan = isDesktop ? 5 : 1;
  const kpiSpan = isDesktop ? 7 : 1;
  const chartSpan = isDesktop ? 6 : 1;
  const smallChartSpan = isDesktop ? 4 : 1;
  
  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: isTabletSmall || isMobile ? '16px 12px' : '32px 24px',
        background: '#FFFFFF',
        minHeight: '100vh',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: isTabletSmall || isMobile ? 24 : 32,
            fontWeight: 900,
            color: '#1F2937',
            marginBottom: 8,
            letterSpacing: '-0.5px',
          }}>
            Dashboard V3
          </h1>
          <p style={{
            fontSize: 15,
            color: '#6B7280',
            margin: 0,
          }}>
            Buenas tardes, {userName || 'Admin'}
          </p>
        </div>

        {/* Grid Principal */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gap: 24,
        }}>
          {/* Imagen 3D del Alojamiento */}
          <div style={{ gridColumn: `span ${imageSpan}` }}>
            <img
              src="/images/Alojamiento Dashboard.png"
              alt="Plano 3D del alojamiento"
              style={{
                width: isTabletSmall || isMobile ? '100%' : '145%',
                height: 'auto',
                maxHeight: isTabletSmall || isMobile ? 300 : 580,
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15)) drop-shadow(0 20px 40px rgba(0, 0, 0, 0.2))',
                transform: 'perspective(1000px) rotateX(2deg)',
              }}
            />
          </div>

          {/* Panel de KPIs - Ahora ocupa todo el ancho */}
          <div style={{ gridColumn: isDesktop ? 'span 7' : 'span 1' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: kpiCols,
              gap: 12,
            }}>
              {/* Fila 1 */}
              <KPICard
                label="Alojamientos"
                value={loading ? '—' : stats?.totalAccommodations || 1}
                subtitle="activos"
                color="#374151"
                loading={loading}
              />
              <KPICard
                label="Habitaciones Totales"
                value={loading ? '—' : stats?.totalRooms || 7}
                subtitle="Individuales"
                color="#374151"
                loading={loading}
              />
              <KPICard
                label="Habitaciones Ocupadas"
                value={loading ? '—' : stats?.occupied || 7}
                subtitle="Individuales"
                color="#DC2626"
                loading={loading}
              />
              <KPICard
                label="Habitaciones Libres"
                value={loading ? '—' : stats?.free || 7}
                subtitle="Individuales"
                color="#16A34A"
                loading={loading}
              />
              <KPICard
                label="Ocupación"
                value={loading ? '—' : `${stats?.occRate || 57}%`}
                subtitle="4 de 7 hab."
                color="#F59E0B"
                loading={loading}
              />
              
              {/* Fila 2 */}
              <KPICard
                label="Ocupación Total"
                value={loading ? '—' : `${stats?.occRate || 88}%`}
                subtitle="Dobles"
                color="#0EA5E9"
                loading={loading}
              />
              <KPICard
                label="Habitaciones Totales"
                value={loading ? '—' : stats?.totalRooms || 7}
                subtitle="Dobles"
                color="#374151"
                loading={loading}
              />
              <KPICard
                label="Habitaciones Ocupadas"
                value={loading ? '—' : stats?.occupied || 7}
                subtitle="Dobles"
                color="#DC2626"
                loading={loading}
              />
              <KPICard
                label="Habitaciones Libres"
                value={loading ? '—' : stats?.free || 7}
                subtitle="Dobles"
                color="#16A34A"
                loading={loading}
              />
              <KPICard
                label="Ocupación"
                value={loading ? '—' : `${stats?.occRate || 57}%`}
                subtitle="Dobles"
                color="#F59E0B"
                loading={loading}
              />
            </div>
            
            {/* Gráficos debajo de los KPIs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? '25% 75%' : '1fr',
              gap: 24,
              marginTop: 24,
            }}>
              {/* Gráfico Género */}
              <div>
                <GraficoGenero3D data={generoData} loading={loading} />
              </div>

              {/* Gráfico Ingresos */}
              <div>
                <GraficoIngresos3D data={ingresosData} loading={loading} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </V2Layout>
  );
}
