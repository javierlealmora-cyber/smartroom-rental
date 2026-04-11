// src/components/charts/GraficoGenero3D.jsx
// Gráfico circular 3D para distribución de género de inquilinos

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  male: '#4F46E5',      // Indigo
  female: '#EC4899',    // Pink
  other: '#10B981',     // Green
};

const LABELS = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otros',
};

export default function GraficoGenero3D({ data, loading }) {
  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: 300,
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
        height: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
        fontSize: 14,
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
        <div>No hay datos de género disponibles</div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const chartData = data.map(item => ({
    name: LABELS[item.gender] || item.gender,
    value: item.value,
    percent: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0,
  }));

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // No mostrar label si es menor al 5%

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{
          fontSize: 14,
          fontWeight: 700,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 24,
        marginTop: 16,
        flexWrap: 'wrap',
      }}>
        {payload.map((entry, index) => {
          const item = chartData[index];
          return (
            <div
              key={`legend-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: entry.color,
                  boxShadow: `0 2px 8px ${entry.color}40`,
                }}
              />
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
                {entry.value}: {item.value} ({item.percent}%)
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      width: '100%',
      height: 224,
    }}>
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: 16,
        fontWeight: 700,
        color: '#1F2937',
        textAlign: 'center',
      }}>
        Género
      </h3>
      
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <defs>
            {data.map((item, index) => {
              const color = COLORS[item.gender] || '#6B7280';
              return (
                <radialGradient key={`gradient-${index}`} id={`gradient-${item.gender}`}>
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                </radialGradient>
              );
            })}
          </defs>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={90}
            innerRadius={0}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((item, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#gradient-${item.gender})`}
                stroke="#FFFFFF"
                strokeWidth={4}
                style={{
                  filter: 'drop-shadow(8px 8px 16px rgba(30, 30, 30, 0.5)) drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.3))',
                }}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              padding: '8px 12px',
            }}
            formatter={(value, name) => [`${value} inquilinos`, name]}
          />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
