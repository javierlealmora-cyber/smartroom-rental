// src/components/charts/GraficoHorizontal3D.jsx
// Gráfico de barras horizontales 3D reutilizable

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

export default function GraficoHorizontal3D({ 
  title, 
  data, 
  color = '#4F46E5',
  unit = '',
  loading,
  placeholder = false,
}) {
  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: 180,
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
        fontSize: 13,
      }}>
        Cargando...
      </div>
    );
  }

  if (placeholder) {
    return (
      <div style={{
        width: '100%',
        height: 180,
        background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#6B7280',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 13,
          color: '#9CA3AF',
          fontStyle: 'italic',
        }}>
          Próximamente
        </div>
        <div style={{
          fontSize: 11,
          color: '#D1D5DB',
        }}>
          Datos no disponibles
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: 180,
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
        fontSize: 13,
      }}>
        <div style={{ marginBottom: 8, fontWeight: 700, color: '#6B7280' }}>{title}</div>
        <div>Sin datos</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{
      width: '100%',
      height: 180,
      background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#6B7280',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        marginBottom: 12,
        textAlign: 'center',
      }}>
        {title}
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
        >
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis type="number" hide domain={[0, maxValue * 1.1]} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Bar
            dataKey="value"
            fill={`url(#gradient-${title})`}
            radius={[0, 6, 6, 0]}
            animationBegin={0}
            animationDuration={600}
            label={{
              position: 'right',
              fill: '#374151',
              fontSize: 12,
              fontWeight: 700,
              formatter: (value) => `${Number(value).toLocaleString('es-ES')}${unit}`,
            }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
