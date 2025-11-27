import { useMemo } from 'react';

function Silo2D({ silo, latestData }) {
  const visualization = useMemo(() => {
    if (!latestData || !silo) return null;

    const { grainLevel, temperature } = latestData;
    const fillPercentage = grainLevel.percentage;
    const height = silo.height || 10;
    const diameter = silo.diameter || 6;
    
    // Calcular altura del grano
    const grainHeight = (fillPercentage / 100) * height;
    const emptyHeight = height - grainHeight;
    
    // Determinar color del grano según temperatura
    const avgTemp = temperature.average;
    let grainColor = '#FFC107'; // Amarillo normal
    
    if (avgTemp > 28) {
      grainColor = '#F44336'; // Rojo - temperatura alta
    } else if (avgTemp > 25) {
      grainColor = '#FF9800'; // Naranja - temperatura elevada
    } else if (avgTemp < 15) {
      grainColor = '#2196F3'; // Azul - temperatura baja
    }

    // Posiciones de sensores de temperatura (4 sensores)
    const sensorPositions = [
      { y: height * 0.2, label: 'T1' },
      { y: height * 0.4, label: 'T2' },
      { y: height * 0.6, label: 'T3' },
      { y: height * 0.8, label: 'T4' }
    ];

    return {
      height,
      diameter,
      grainHeight,
      emptyHeight,
      grainColor,
      fillPercentage,
      sensorPositions,
      temperatures: temperature.sensors
    };
  }, [silo, latestData]);

  if (!visualization) {
    return (
      <div className="silo-2d-empty">
        <p>No hay datos disponibles</p>
      </div>
    );
  }

  const viewBoxWidth = visualization.diameter + 2;
  const viewBoxHeight = visualization.height + 2;
  const centerX = viewBoxWidth / 2;
  const radius = visualization.diameter / 2;

  return (
    <div className="silo-2d-container">
      <div className="silo-2d-header">
        <h3>Visualización del Silo</h3>
        <div className="silo-2d-stats">
          <span className="stat-badge">
            {visualization.fillPercentage.toFixed(1)}% lleno
          </span>
          <span className="stat-badge">
            {latestData.grainLevel.tons.toFixed(1)} ton
          </span>
        </div>
      </div>

      <div className="silo-2d-wrapper">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="silo-2d-svg"
          preserveAspectRatio="xMidYMin meet"
        >
          {/* Fondo del silo (vacio) */}
          <rect
            x={centerX - radius}
            y={1}
            width={visualization.diameter}
            height={visualization.emptyHeight}
            fill="#F5F5F5"
            stroke="#E0E0E0"
            strokeWidth="0.1"
          />

          {/* Grano */}
          <ellipse
            cx={centerX}
            cy={1 + visualization.emptyHeight}
            rx={radius}
            ry={radius * 0.3}
            fill={visualization.grainColor}
            opacity="0.9"
          />
          <rect
            x={centerX - radius}
            y={1 + visualization.emptyHeight}
            width={visualization.diameter}
            height={visualization.grainHeight}
            fill={visualization.grainColor}
            opacity="0.7"
          />

          {/* Contorno del silo */}
          <ellipse
            cx={centerX}
            cy={1}
            rx={radius}
            ry={radius * 0.2}
            fill="none"
            stroke="#212121"
            strokeWidth="0.15"
          />
          <line
            x1={centerX - radius}
            y1={1}
            x2={centerX - radius}
            y2={1 + visualization.height}
            stroke="#212121"
            strokeWidth="0.15"
          />
          <line
            x1={centerX + radius}
            y1={1}
            x2={centerX + radius}
            y2={1 + visualization.height}
            stroke="#212121"
            strokeWidth="0.15"
          />
          <ellipse
            cx={centerX}
            cy={1 + visualization.height}
            rx={radius}
            ry={radius * 0.2}
            fill="none"
            stroke="#212121"
            strokeWidth="0.15"
          />

          {/* Sensores de temperatura */}
          {visualization.sensorPositions.map((sensor, index) => {
            const temp = visualization.temperatures[index];
            const tempColor = temp > 28 ? '#F44336' : temp > 25 ? '#FF9800' : '#4CAF50';
            
            return (
              <g key={sensor.label}>
                <circle
                  cx={centerX - radius - 0.3}
                  cy={1 + sensor.y}
                  r="0.25"
                  fill={tempColor}
                  stroke="#FFFFFF"
                  strokeWidth="0.05"
                />
                <text
                  x={centerX - radius - 0.8}
                  y={1 + sensor.y + 0.1}
                  fontSize="0.4"
                  fill="#757575"
                  textAnchor="end"
                >
                  {temp.toFixed(1)}°
                </text>
              </g>
            );
          })}

          {/* Línea de nivel de grano */}
          <line
            x1={centerX - radius - 0.5}
            y1={1 + visualization.emptyHeight}
            x2={centerX + radius + 0.5}
            y2={1 + visualization.emptyHeight}
            stroke="#212121"
            strokeWidth="0.1"
            strokeDasharray="0.2 0.2"
            opacity="0.5"
          />
        </svg>

        {/* Leyenda */}
        <div className="silo-2d-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
            <span>Temp. Normal (&lt;25°C)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
            <span>Temp. Elevada (25-28°C)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#F44336' }}></div>
            <span>Temp. Alta (&gt;28°C)</span>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="silo-2d-info">
        <div className="info-row">
          <span className="info-label">Capacidad:</span>
          <span className="info-value">{silo.capacity} toneladas</span>
        </div>
        <div className="info-row">
          <span className="info-label">Altura:</span>
          <span className="info-value">{silo.height}m</span>
        </div>
        <div className="info-row">
          <span className="info-label">Tipo de grano:</span>
          <span className="info-value">{silo.grainType}</span>
        </div>
      </div>
    </div>
  );
}

export default Silo2D;

