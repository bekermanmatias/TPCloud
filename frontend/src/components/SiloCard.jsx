function SiloCard({ silo, isSelected, onClick }) {
  const latestData = silo.latestData;
  
  const hasAlerts = latestData && (
    latestData.temperature.hasRisk || 
    latestData.humidityRisk || 
    latestData.gases.hasRisk
  );

  return (
    <div 
      className={`silo-card ${isSelected ? 'selected' : ''} ${hasAlerts ? 'has-alerts' : ''}`}
      onClick={onClick}
    >
      <div className="silo-card-header">
        <h3>{silo.name}</h3>
        {hasAlerts && <span className="alert-badge">⚠️</span>}
      </div>
      <p className="silo-location">{silo.location}</p>
      
      {latestData ? (
        <>
          <div className="silo-stats">
            <div className="stat">
              <span className="stat-label">Temp:</span>
              <span className={`stat-value ${latestData.temperature.hasRisk ? 'stat-warning' : ''}`}>
                {latestData.temperature.average.toFixed(1)}°C
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Humedad:</span>
              <span className={`stat-value ${latestData.humidityRisk ? 'stat-warning' : ''}`}>
                {latestData.humidity.toFixed(1)}%
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Nivel:</span>
              <span className="stat-value">{latestData.grainLevel.percentage.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Grano:</span>
              <span className="stat-value">{latestData.grainLevel.tons.toFixed(1)} ton</span>
            </div>
          </div>
          <div className="silo-card-footer">
            <span className="grain-type">{silo.grainType}</span>
            <span className="last-update">
              {new Date(latestData.timestamp).toLocaleTimeString('es-AR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </>
      ) : (
        <div className="silo-no-data">
          Sin datos disponibles
        </div>
      )}
    </div>
  );
}

export default SiloCard;

