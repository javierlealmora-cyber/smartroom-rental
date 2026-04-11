// src/components/charts/GraficoIngresos3D.jsx
// Gráfico de barras 3D comparativo para ingresos mensuales 2025 vs 2026

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function GraficoIngresos3D({ data, loading }) {
  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
        fontSize: 14,
      }}>
        Cargando datos...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
        fontSize: 14,
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📈</div>
        <div>No hay datos de ingresos disponibles</div>
      </div>
    );
  }

  // Debug: ver qué datos llegan
  console.log('📊 GraficoIngresos3D - Datos recibidos:', data);
  
  // Agrupar datos por mes para comparar años
  const chartData = MONTHS.map((monthName, index) => {
    const monthNum = index + 1;
    const data2025 = data.find(d => d.month === monthNum && d.year === 2025);
    const data2026 = data.find(d => d.month === monthNum && d.year === 2026);
    
    return {
      month: monthName,
      '2025': data2025?.value || 0,
      '2026': data2026?.value || 0,
    };
  });
  
  console.log('📊 GraficoIngresos3D - Datos procesados para gráfico:', chartData);

  return (
    <div style={{
      width: '100%',
      height: 252,
      background: 'transparent',
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: 16,
        fontWeight: 700,
        color: '#1F2937',
        textAlign: 'center',
      }}>
        Ingresos Teóricos Mensuales (Histórico)
      </h3>

      <ResponsiveContainer width="100%" height={196} style={{ background: 'transparent' }}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          style={{ background: 'transparent' }}
          barCategoryGap="20%"
        >
          <defs>
            <linearGradient id="barGradient2025" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A5B4FC" stopOpacity={1} />
              <stop offset="100%" stopColor="#818CF8" stopOpacity={0.9} />
            </linearGradient>
            <linearGradient id="barGradient2026" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FCD34D" stopOpacity={1} />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity={0.9} />
            </linearGradient>
            <style>{`.recharts-wrapper, .recharts-surface, .recharts-wrapper svg { background: transparent !important; } .recharts-surface > rect:first-child { fill: transparent !important; }`}</style>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="transparent" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }}
            axisLine={{ stroke: '#D1D5DB' }}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }}
            axisLine={{ stroke: '#D1D5DB' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}k€`}
            domain={[0, 'auto']}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              padding: '8px 12px',
            }}
            formatter={(value) => [`${Number(value).toLocaleString('es-ES')}€`, '']}
            labelStyle={{ fontWeight: 700, color: '#1F2937' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: 5 }}
            iconType="rect"
          />
          <Bar
            dataKey="2025"
            fill="url(#barGradient2025)"
            radius={[8, 8, 0, 0]}
            animationBegin={0}
            animationDuration={800}
            style={{
              filter: 'drop-shadow(24px 24px 40px rgba(30, 30, 30, 0.8))',
            }}
          />
          <Bar
            dataKey="2026"
            fill="url(#barGradient2026)"
            radius={[8, 8, 0, 0]}
            animationBegin={200}
            animationDuration={800}
            style={{
              filter: 'drop-shadow(24px 24px 40px rgba(30, 30, 30, 0.8))',
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
