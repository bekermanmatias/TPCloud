import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function SiloWidget({ silo, history = [] }) {
  const latestData = silo.latestData;

  if (!latestData) {
    return (
      <div className="silo-widget">
        <div className="silo-widget-header">
          <h3>{silo.name}</h3>
          <span className="silo-location-badge">{silo.location}</span>
        </div>
        <div className="silo-widget-empty">
          <p>Sin datos disponibles</p>
        </div>
      </div>
    );
  }

  const { grainLevel, temperature, humidity, gases } = latestData;
  
  // Calcular días restantes estimados (basado en consumo promedio)
  const calculateDaysRemaining = () => {
    if (history.length < 2) return null;
    
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const first = sortedHistory[0];
    const last = sortedHistory[sortedHistory.length - 1];
    
    const timeDiff = new Date(last.timestamp) - new Date(first.timestamp);
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 0) return null;
    
    const consumption = first.grainLevel.tons - last.grainLevel.tons;
    const dailyConsumption = Math.abs(consumption / daysDiff);
    
    if (dailyConsumption <= 0) return null;
    
    const remaining = grainLevel.tons;
    const daysRemaining = remaining / dailyConsumption;
    
    return {
      days: Math.round(daysRemaining),
      dailyConsumption: dailyConsumption.toFixed(2)
    };
  };

  const consumptionData = calculateDaysRemaining();

  // Preparar datos para el gráfico
  const chartData = useMemo(() => {
    if (history.length === 0) return [];
    
    return history
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-7) // Últimos 7 días
      .map(item => ({
        date: new Date(item.timestamp).toLocaleDateString('es-AR', { 
          month: 'short', 
          day: '2-digit' 
        }),
        tons: item.grainLevel.tons,
        percentage: item.grainLevel.percentage
      }));
  }, [history]);

  // Visualización 2D simplificada
  const fillPercentage = grainLevel.percentage;
  const avgTemp = temperature.average;
  
  // Color del grano según temperatura
  let grainColor = '#FFC107'; // Amarillo normal
  if (avgTemp > 28) {
    grainColor = '#F44336'; // Rojo
  } else if (avgTemp > 25) {
    grainColor = '#FF9800'; // Naranja
  } else if (avgTemp < 15) {
    grainColor = '#2196F3'; // Azul
  }

  return (
    <div className="silo-widget">
      {/* Header */}
      <div className="silo-widget-header">
        <div>
          <h3>{silo.name}</h3>
          <span className="silo-location-badge">{silo.location}</span>
        </div>
        {silo.grainType && (
          <div className="silo-recipe">
            <span className="recipe-label">Tipo:</span>
            <span className="recipe-value">{silo.grainType}</span>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="silo-widget-content">
        {/* Panel izquierdo - Visualización y datos */}
        <div className="silo-widget-left">
          {/* Silo 2D minimalista */}
          <div className="silo-2d-minimal">
            <svg viewBox="0 0 120 200" className="silo-2d-svg-minimal">
              {/* Contorno del silo */}
              <ellipse cx="60" cy="20" rx="50" ry="15" fill="none" stroke="#E0E0E0" strokeWidth="2"/>
              <rect x="10" y="20" width="100" height="160" fill="none" stroke="#E0E0E0" strokeWidth="2"/>
              <ellipse cx="60" cy="180" rx="50" ry="15" fill="none" stroke="#E0E0E0" strokeWidth="2"/>
              
              {/* Grano */}
              <ellipse 
                cx="60" 
                cy={180 - (fillPercentage / 100) * 160} 
                rx={50} 
                ry={15} 
                fill={grainColor} 
                opacity="0.8"
              />
              <rect 
                x="10" 
                y={180 - (fillPercentage / 100) * 160} 
                width="100" 
                height={(fillPercentage / 100) * 160} 
                fill={grainColor} 
                opacity="0.6"
              />
              
              {/* Línea de nivel */}
              <line
                x1="5"
                y1={180 - (fillPercentage / 100) * 160}
                x2="115"
                y2={180 - (fillPercentage / 100) * 160}
                stroke="#212121"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.3"
              />
            </svg>
          </div>

          {/* Datos principales */}
          <div className="silo-widget-stats">
            <div className="silo-stat-main">
              <div className="stat-value-large">{grainLevel.tons.toFixed(2)} t</div>
              <div className="stat-percentage">{fillPercentage.toFixed(2)}%</div>
            </div>

            {consumptionData && (
              <>
                <div className="silo-stat-item">
                  <span className="stat-label-with-icon">
                    <span className="stat-icon">⏱️</span>
                    {consumptionData.days} días
                  </span>
                  <span className="stat-info">estimados restantes</span>
                </div>
                <div className="silo-stat-item">
                  <span className="stat-label-with-icon">
                    <span className="stat-icon">📉</span>
                    {consumptionData.dailyConsumption} t/día
                  </span>
                  <span className="stat-info">consumo diario</span>
                </div>
              </>
            )}

            <div className="silo-stat-item">
              <span className="stat-label">Temp. promedio:</span>
              <span className={`stat-value-small ${temperature.hasRisk ? 'stat-warning' : ''}`}>
                {temperature.average.toFixed(1)}°C
              </span>
            </div>
            <div className="silo-stat-item">
              <span className="stat-label">Humedad:</span>
              <span className={`stat-value-small ${latestData.humidityRisk ? 'stat-warning' : ''}`}>
                {humidity.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Panel derecho - Gráfico histórico */}
        <div className="silo-widget-right">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#757575"
                  style={{ fontSize: '11px' }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  stroke="#757575"
                  style={{ fontSize: '11px' }}
                  domain={[0, 'dataMax + 2']}
                  label={{ value: 't', position: 'insideLeft', style: { fontSize: '11px', fill: '#757575' } }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`${value.toFixed(2)} t`, 'Cantidad']}
                />
                <Line 
                  type="monotone" 
                  dataKey="tons" 
                  stroke="#FFC107" 
                  strokeWidth={2}
                  dot={{ fill: '#FFC107', r: 3 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty-state">
              <p>No hay datos históricos disponibles</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Última actualización */}
      <div className="silo-widget-footer">
        <span className="last-update">
          Última actualización: {new Date(latestData.timestamp).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
}

export default SiloWidget;

