function AlertsPanel({ data }) {
  const alerts = [];

  if (data.temperature.hasRisk) {
    alerts.push({
      type: 'warning',
      message: '⚠️ Temperatura elevada detectada - Posible fermentación'
    });
  }

  if (data.humidityRisk) {
    alerts.push({
      type: 'danger',
      message: '🚨 Humedad alta - Riesgo de moho y deterioro'
    });
  }

  if (data.gases.hasRisk) {
    alerts.push({
      type: 'danger',
      message: '🚨 Nivel de CO₂ elevado - Posible fermentación o infestación'
    });
  }

  if (data.grainLevel.percentage < 10) {
    alerts.push({
      type: 'info',
      message: 'ℹ️ Nivel de grano bajo'
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="alerts-panel no-alerts">
        <span style={{ color: '#4CAF50', fontWeight: 500 }}>✓</span> Todos los parámetros están dentro de los rangos normales
      </div>
    );
  }

  return (
    <div className="alerts-panel">
      <h3>Alertas</h3>
      {alerts.map((alert, index) => (
        <div key={index} className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      ))}
    </div>
  );
}

export default AlertsPanel;

