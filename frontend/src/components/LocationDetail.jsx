import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { SiloVisual } from './SiloVisual';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Edit, MapPin, Wheat, ChevronLeft, Info } from 'lucide-react';
import { getSiloHistory } from '../services/api';

// Importar Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix para iconos de Leaflet en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationDetail({ location, silos, onBack }) {
  const [histories, setHistories] = useState({});
  const locationSilos = silos.filter(silo => silo.locationId === location.id);

  // Coordenadas del mapa - usar la primera coordenada de los silos o valores por defecto
  const firstSilo = locationSilos[0];
  const mapCenter = firstSilo?.latitude && firstSilo?.longitude
    ? [firstSilo.latitude, firstSilo.longitude]
    : [-34.9215, -57.9545]; // Coordenadas de ejemplo (La Plata, Argentina)

  useEffect(() => {
    const loadHistories = async () => {
      const historyPromises = locationSilos.map(async (silo) => {
        try {
          const history = await getSiloHistory(silo.id, { limit: 30, hours: 168 });
          return { siloId: silo.id, history };
        } catch (error) {
          console.error(`Error al cargar historial de ${silo.id}:`, error);
          return { siloId: silo.id, history: [] };
        }
      });

      const results = await Promise.all(historyPromises);
      const historyMap = {};
      results.forEach(({ siloId, history }) => {
        historyMap[siloId] = history;
      });
      setHistories(historyMap);
    };

    if (locationSilos.length > 0) {
      loadHistories();
      const interval = setInterval(loadHistories, 5000);
      return () => clearInterval(interval);
    }
  }, [locationSilos, location.id]);

  const calculateStockDays = (silo) => {
    if (!silo.latestData) return { days: 0, dailyConsumption: 0 };
    
    const history = histories[silo.id] || [];
    if (history.length < 2) {
      const tons = silo.latestData.grainLevel.tons;
      if (tons === 0) return { days: 0, dailyConsumption: 0 };
      const estimatedDailyConsumption = 0.5;
      return {
        days: Math.round(tons / estimatedDailyConsumption),
        dailyConsumption: (estimatedDailyConsumption * 1000).toFixed(0)
      };
    }

    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const first = sortedHistory[0];
    const last = sortedHistory[sortedHistory.length - 1];
    const timeDiff = new Date(last.timestamp) - new Date(first.timestamp);
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 0) {
      const tons = silo.latestData.grainLevel.tons;
      const estimatedDailyConsumption = 0.5;
      return {
        days: Math.round(tons / estimatedDailyConsumption),
        dailyConsumption: (estimatedDailyConsumption * 1000).toFixed(0)
      };
    }
    
    const consumption = first.grainLevel.tons - last.grainLevel.tons;
    const dailyConsumption = Math.abs(consumption / daysDiff);
    
    if (dailyConsumption <= 0) {
      return { days: 0, dailyConsumption: 0 };
    }
    
    const remaining = silo.latestData.grainLevel.tons;
    const daysRemaining = remaining / dailyConsumption;
    
    return {
      days: Math.round(daysRemaining),
      dailyConsumption: (dailyConsumption * 1000).toFixed(0)
    };
  };

  const prepareChartData = (silo) => {
    const history = histories[silo.id] || [];
    if (history.length === 0) return [];
    
    return history
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-7)
      .map(item => ({
        date: new Date(item.timestamp).toLocaleDateString('es-AR', { 
          month: 'short', 
          day: '2-digit' 
        }),
        tons: item.grainLevel.tons
      }));
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb y header */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Panel de Control
        </Button>
        <span>/</span>
        <span className="text-gray-900 font-medium">{location.name}</span>
      </div>

      {/* Información de la ubicación y acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo - Información */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-lg">🏢</span>
              </div>
              <div>
                <CardTitle className="text-xl">{location.name}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">ID: {location.id.toUpperCase()}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Libro de Recetas:</span>
                <span className="ml-2 font-medium">Libro por Defecto</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-2">
                <MapPin className="h-4 w-4" />
                Mapa
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-2">
                <Wheat className="h-4 w-4" />
                Alimentación
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mapa */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mapa de Ubicación</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[400px] w-full">
              <MapContainer
                center={mapCenter}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                {locationSilos.map((silo) => (
                  <Marker
                    key={silo.id}
                    position={[
                      silo.latitude || mapCenter[0] + (Math.random() * 0.01 - 0.005),
                      silo.longitude || mapCenter[1] + (Math.random() * 0.01 - 0.005)
                    ]}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{silo.name}</div>
                        <div className="text-gray-600">{silo.grainType || 'N/A'}</div>
                        {silo.latestData && (
                          <div className="mt-1">
                            <div>Nivel: {silo.latestData.grainLevel.percentage.toFixed(1)}%</div>
                            <div>Peso: {silo.latestData.grainLevel.tons.toFixed(2)} t</div>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de silos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {locationSilos.map((silo) => {
          const latestData = silo.latestData;
          const stockDays = calculateStockDays(silo);
          const chartData = prepareChartData(silo);
          const stockPercentage = latestData ? latestData.grainLevel.percentage : 0;
          const weight = latestData ? latestData.grainLevel.tons : 0;

          return (
            <Card key={silo.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{silo.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {silo.grainType || 'N/A'} (640 kg/m³)
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* Visualización del silo y datos */}
                  <div className="space-y-4">
                    <SiloVisual percentage={stockPercentage} />
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-green-600">
                        {weight > 0 ? weight.toFixed(2) : '0.00'} t
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {stockPercentage.toFixed(2)} %
                      </div>
                    </div>
                  </div>

                  {/* Gráfico de tendencia */}
                  <div className="h-[200px]">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#757575"
                            style={{ fontSize: '10px' }}
                            angle={-45}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis 
                            stroke="#757575"
                            style={{ fontSize: '10px' }}
                            domain={[0, 'dataMax + 2']}
                            label={{ value: 't', position: 'insideLeft', style: { fontSize: '10px', fill: '#757575' } }}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E0E0E0',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value) => [`${value.toFixed(2)} t`, 'Cantidad']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="tons" 
                            stroke="#10B981" 
                            strokeWidth={2}
                            dot={{ fill: '#10B981', r: 3 }}
                            strokeDasharray="5 5"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Sin datos históricos
                      </div>
                    )}
                  </div>
                </div>

                {/* Información de consumo */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {stockDays.days} días
                    </span>
                  </div>
                  {stockDays.dailyConsumption > 0 && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {(stockDays.dailyConsumption / 1000).toFixed(2)} t/día
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default LocationDetail;
