import { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { 
  ChevronLeft, 
  Calendar, 
  Thermometer, 
  Battery, 
  Signal, 
  Camera,
  Activity,
  Download,
  Edit,
  Settings,
  Info,
  RefreshCw
} from 'lucide-react';
import { getSiloHistory, getSiloCameraUrl } from '../services/api';
import { SiloVisual } from './SiloVisual';
import SiloHistory from './SiloHistory';

const CAMERA_REFRESH_MS = 5000; // Actualizar imagen cada 5 s (igual que el ESP32 puede enviar)

function SiloDetailView({ silo, onBack }) {
  const [histories, setHistories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cameraKey, setCameraKey] = useState(0); // Para forzar recarga de la imagen
  const [cameraError, setCameraError] = useState(false); // Sin imagen o error de carga

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getSiloHistory(silo.id, { limit: 100, hours: 720 }); // 30 días
        setHistories(history);
        setCurrentIndex(history.length - 1); // Empezar con el más reciente
      } catch (error) {
        console.error('Error al cargar historial:', error);
      }
    };

    loadHistory();
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
  }, [silo.id]);

  // Actualizar imagen de cámara cada CAMERA_REFRESH_MS y reintentar si antes falló
  useEffect(() => {
    setCameraError(false);
    const interval = setInterval(() => {
      setCameraError(false);
      setCameraKey((k) => k + 1);
    }, CAMERA_REFRESH_MS);
    return () => clearInterval(interval);
  }, [silo.id]);

  const currentData = histories[currentIndex] || silo.latestData;

  // Generar datos de contorno simulados (superficie del grano)
  const generateContourData = (percentage) => {
    const size = 20;
    const z = [];
    const centerX = size / 2;
    const centerY = size / 2;
    const maxHeight = percentage / 100 * 10; // altura máxima basada en porcentaje

    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < size; j++) {
        const dx = i - centerX;
        const dy = j - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        
        // Crear forma de cono con algo de ruido para simular irregularidad
        const noise = Math.random() * 0.3 - 0.15;
        const height = Math.max(0, maxHeight * (1 - distance / maxDistance) + noise);
        row.push(height);
      }
      z.push(row);
    }
    return z;
  };

  const contourData = currentData ? generateContourData(currentData.grainLevel?.percentage || 0) : [];

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const handleSliderChange = (value) => {
    setCurrentIndex(value[0]);
  };

  const stockPercentage = currentData?.grainLevel?.percentage || 0;
  const weight = currentData?.grainLevel?.tons || 0;
  const capacity = silo.capacity || 100;
  const freeSpace = Math.max(0, capacity - weight);

  // Calcular días restantes y consumo
  const calculateStockDays = () => {
    if (histories.length < 2 || !currentData) return { days: 7, consumption: 0.83 };
    
    const sortedHistory = [...histories].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const first = sortedHistory[0];
    const last = sortedHistory[sortedHistory.length - 1];
    const timeDiff = new Date(last.timestamp) - new Date(first.timestamp);
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 0) return { days: 7, consumption: 0.83 };
    
    const consumption = first.grainLevel.tons - last.grainLevel.tons;
    const dailyConsumption = Math.abs(consumption / daysDiff);
    
    if (dailyConsumption <= 0) return { days: 7, consumption: 0.83 };
    
    const remaining = currentData.grainLevel.tons;
    const daysRemaining = remaining / dailyConsumption;
    
    return {
      days: Math.round(daysRemaining),
      consumption: dailyConsumption.toFixed(2)
    };
  };

  const stockInfo = calculateStockDays();

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Panel de Control
        </Button>
        <span>/</span>
        <span className="text-gray-600">{silo.location}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">{silo.name}</span>
      </div>

      {/* Header con nombre e íconos de acción */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">{silo.name}</h1>
          <p className="text-gray-600 mt-1">
            <span className="font-medium">Product:</span> {silo.grainType || 'N/A'} (640 kg/m³)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Camera className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Bar - Debajo del nombre del silo */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">
                  {formatDateShort(currentData?.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">
                  {currentData?.temperature?.average?.toFixed(0) || '0'}°C
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {currentData?.humidity?.toFixed(0) || '0'}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Battery className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">100%</span>
              </div>
              <div className="flex items-center gap-2">
                <Signal className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {formatDate(currentData?.timestamp)}
                </span>
                <span className="text-xs text-gray-500">(18r/day)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout principal: 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUMNA IZQUIERDA - Estado del Silo */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado del Silo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                {/* Visualización 2D del silo */}
                <div className="flex-shrink-0">
                  <SiloVisual percentage={stockPercentage} />
                </div>
                
                {/* Datos principales */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="text-3xl font-semibold text-green-600">
                      {weight.toFixed(2)} t
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {stockPercentage.toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Estimated remaining:
                      </span>
                      <span className="font-medium">{stockInfo.days} days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Typical consumption:
                      </span>
                      <span className="font-medium">{stockInfo.consumption} t/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Capacity:</span>
                      <span className="font-medium">{capacity} t</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available Capacity:</span>
                      <span className="font-medium">{freeSpace.toFixed(2)} t</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Consumption:</span>
                      <span className="font-medium">0.3 t/day</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards de información adicional */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Temperature</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average:</span>
                    <span className="font-medium">
                      {currentData?.temperature?.average?.toFixed(1) || '0'}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Maximum:</span>
                    <span className="font-medium">
                      {currentData?.temperature?.max?.toFixed(1) || '0'}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum:</span>
                    <span className="font-medium">
                      {currentData?.temperature?.min?.toFixed(1) || '0'}°C
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Condition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Humidity:</span>
                    <span className="font-medium">
                      {currentData?.humidity?.toFixed(0) || '0'}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CO₂:</span>
                    <span className="font-medium">
                      {(currentData?.gases?.co2 ?? currentData?.co2)?.toFixed(0) || '0'} ppm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Normal</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* COLUMNA DERECHA - Camera y Contour Map */}
        <div className="space-y-6">
          {/* Camera History View */}
          <Card>
            <CardHeader>
              <CardTitle>Camera history view</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Dos visualizaciones lado a lado */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Imagen de cámara ESP32 o placeholder si no hay conexión */}
                  <div className="relative bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
                    {!cameraError ? (
                      <img
                        key={cameraKey}
                        src={getSiloCameraUrl(silo.id)}
                        alt={`Cámara ${silo.name}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={() => setCameraError(true)}
                        onLoad={() => setCameraError(false)}
                      />
                    ) : null}
                    {cameraError && (
                      <>
                        <div className="absolute inset-0 bg-gradient-radial from-gray-600 to-gray-900" />
                        <div className="relative z-10 text-center px-2">
                          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Conecta la cámara del ESP32</p>
                          <p className="text-xs text-gray-500 mt-1">POST /api/camera/{silo.id}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Contour Map - Vista 3D de la superficie */}
                  <div className="h-full">
                    {contourData.length > 0 && (
                      <Plot
                        data={[
                          {
                            z: contourData,
                            type: 'contour',
                            colorscale: [
                              [0, '#FF6B6B'],
                              [0.3, '#FFA500'],
                              [0.6, '#FFD700'],
                              [1, '#FFFF00']
                            ],
                            contours: {
                              coloring: 'heatmap',
                              showlabels: true,
                              labelfont: {
                                size: 8,
                                color: 'white'
                              },
                              start: 0.5,
                              end: 3,
                              size: 0.5
                            },
                            colorbar: {
                              visible: false
                            }
                          }
                        ]}
                        layout={{
                          autosize: true,
                          margin: { l: 0, r: 0, t: 0, b: 0 },
                          xaxis: { visible: false },
                          yaxis: { visible: false },
                          paper_bgcolor: 'transparent',
                          plot_bgcolor: 'transparent'
                        }}
                        config={{
                          displayModeBar: false,
                          responsive: true
                        }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                  </div>
                </div>

                {/* Información de la lectura histórica */}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {weight.toFixed(2)} t ({stockPercentage.toFixed(2)}%)
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <RefreshCw className="h-4 w-4" />
                    <span>{formatDate(currentData?.timestamp)}</span>
                  </div>
                </div>

                {/* Timeline Slider dentro de Camera history view */}
                <div className="space-y-2 pt-2 border-t">
                  <Slider
                    value={[currentIndex]}
                    onValueChange={handleSliderChange}
                    max={histories.length - 1}
                    step={1}
                    disabled={histories.length === 0}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>
                      {histories.length > 0 && formatDateShort(histories[0]?.timestamp)}
                    </span>
                    <span>
                      {histories.length > 0 && formatDateShort(histories[histories.length - 1]?.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historial de datos */}
      <SiloHistory histories={histories} />
    </div>
  );
}

export default SiloDetailView;
