import { useState, useEffect } from 'react';
import { getSiloById, getSiloHistory } from '../services/api';
import TemperatureChart from './TemperatureChart';
import HumidityChart from './HumidityChart';
import GrainLevelChart from './GrainLevelChart';
import AlertsPanel from './AlertsPanel';
import Silo2D from './Silo2D';

function Dashboard({ siloId }) {
  const [silo, setSilo] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [siloId]);

  const loadData = async () => {
    try {
      const [siloData, historyData] = await Promise.all([
        getSiloById(siloId),
        getSiloHistory(siloId, { limit: 50, hours: 24 })
      ]);
      setSilo(siloData);
      setHistory(historyData);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Cargando datos...</div>;
  }

  if (!silo || !silo.latestData) {
    return (
      <div className="dashboard-empty">
        <p>No hay datos disponibles para este silo</p>
        <p>Inicia el simulador para comenzar a recibir datos</p>
      </div>
    );
  }

  const { latestData } = silo;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>{silo.name}</h2>
          <p className="dashboard-location">{silo.location}</p>
        </div>
        <div className="dashboard-status">
          <span className={`status-indicator ${latestData.temperature.hasRisk || latestData.humidityRisk || latestData.gases.hasRisk ? 'warning' : 'ok'}`}>
            {latestData.temperature.hasRisk || latestData.humidityRisk || latestData.gases.hasRisk ? '⚠️' : '✓'}
          </span>
        </div>
      </div>
      
      <AlertsPanel data={latestData} />

      {/* Visualización 2D del silo */}
      <div className="silo-2d-section">
        <Silo2D silo={silo} latestData={latestData} />
      </div>

      <div className="dashboard-grid">
        <div className="metric-card">
          <h3>🌡️ Temperatura</h3>
          <div className="metric-value">
            {latestData.temperature.average.toFixed(1)}°C
          </div>
          <div className="metric-details">
            Mín: {latestData.temperature.min.toFixed(1)}°C | 
            Máx: {latestData.temperature.max.toFixed(1)}°C
          </div>
          <TemperatureChart history={history} />
        </div>

        <div className="metric-card">
          <h3>💧 Humedad</h3>
          <div className="metric-value">
            {latestData.humidity.toFixed(1)}%
          </div>
          <HumidityChart history={history} />
        </div>

        <div className="metric-card">
          <h3>📊 Nivel de Grano</h3>
          <div className="metric-value">
            {latestData.grainLevel.percentage.toFixed(1)}%
          </div>
          <div className="metric-details">
            {latestData.grainLevel.tons.toFixed(1)} toneladas
          </div>
          <GrainLevelChart history={history} />
        </div>

        <div className="metric-card">
          <h3>🌬️ Calidad del Aire</h3>
          <div className="metric-value">
            {latestData.gases.co2} ppm
          </div>
          <div className="metric-details">
            CO₂
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

