import { useState, useEffect } from 'react';
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
import { getSiloHistory, getSiloCameraUrl, getSiloHistoryImageUrl } from '../services/api';
import { SiloVisual } from './SiloVisual';
import SiloHistory from './SiloHistory';
import MapaCalorSilo from './MapaCalorSilo';
import { getDensity, getDensityAdjusted, GRAIN_HUM_REF, DEFAULT_HUM_REF } from '../constants/grainDensities';

const CAMERA_REFRESH_MS = 5000; // Actualizar imagen cada 5 s (igual que el ESP32 puede enviar)

function SiloDetailView({ silo, onBack, onSiloUpdated }) {
  const [histories, setHistories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraError, setCameraError] = useState(false);

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

  // Refrescar la imagen en vivo solo cuando estamos viendo el dato más reciente
  useEffect(() => {
    setCameraError(false);
    const isLatest = currentIndex >= histories.length - 1;
    if (!isLatest) return;
    const interval = setInterval(() => {
      setCameraError(false);
      setCameraKey((k) => k + 1);
    }, CAMERA_REFRESH_MS);
    return () => clearInterval(interval);
  }, [silo.id, currentIndex, histories.length]);

  const currentData = histories[currentIndex] || silo.latestData;

  // URL de la imagen a mostrar:
  // – Si el dato histórico seleccionado tiene foto guardada → usarla
  // – Si es el dato más reciente o no hay foto histórica → imagen en vivo del endpoint de cámara
  const isViewingLatest = currentIndex >= histories.length - 1;
  const historicImageUrl = getSiloHistoryImageUrl(currentData?.imagePath);
  const cameraImageUrl = isViewingLatest || !historicImageUrl
    ? getSiloCameraUrl(silo.id)
    : historicImageUrl;

  // Dimensiones del silo en cm para el mapa de calor
  const alturaSiloCm = (silo.height ?? 10) * 100;
  const radioSiloCm  = ((silo.diameter ?? 6) / 2) * 100;

  // distanciaVacia para el mapa de calor:
  // Si el campo viene como 0 o null en BD (registros sin dato de distancia),
  // lo derivamos del porcentaje almacenado para que el mapa sea coherente.
  const rawDistance   = currentData?.grainLevel?.distance;
  const pctActual     = currentData?.grainLevel?.percentage ?? 0;
  const distanciaVaciaCalc = (rawDistance != null && rawDistance > 0)
    ? rawDistance
    : alturaSiloCm * (1 - pctActual / 100);


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
    setCameraError(false);
  };

  const stockPercentage = currentData?.grainLevel?.percentage || 0;
  const weight = currentData?.grainLevel?.tons || 0;

  // Densidad ajustada según humedad real del sensor
  const humedadActual  = currentData?.humidity ?? null;
  const densidadBase   = getDensity(silo.grainType);                           // t/m³ estándar
  const densidadGrano  = getDensityAdjusted(silo.grainType, humedadActual);    // t/m³ ajustada
  const humRef         = GRAIN_HUM_REF[silo.grainType] ?? DEFAULT_HUM_REF;
  const densidadAjustada = humedadActual != null && Math.abs(densidadGrano - densidadBase) > 0.0001;

  // Capacidad real: volumen total del silo × densidad ajustada
  const volTotalM3    = Math.PI * Math.pow((silo.diameter ?? 6) / 2, 2) * (silo.height ?? 10);
  const capacidadReal = parseFloat((volTotalM3 * densidadGrano).toFixed(2));
  const freeSpace     = Math.max(0, capacidadReal - weight);

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
          <p className="text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-medium">Producto:</span>{' '}
            {silo.grainType || 'N/A'}
            <span
              className={`text-sm ${densidadAjustada ? 'text-amber-600 font-medium' : 'text-gray-400'}`}
              title={
                densidadAjustada
                  ? `Densidad base: ${Math.round(densidadBase * 1000)} kg/m³ | Humedad referencia: ${humRef}% | Humedad actual: ${humedadActual?.toFixed(0)}%`
                  : `Densidad estándar a ${humRef}% HR`
              }
            >
              ({Math.round(densidadGrano * 1000)} kg/m³
              {densidadAjustada && (
                <span className="text-xs ml-1">
                  {densidadGrano > densidadBase ? '▲' : '▼'} ajustado por humedad
                </span>
              )}
              )
            </span>
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
                <span className="text-xs text-gray-500">(18 lect/día)</span>
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cap. máxima:</span>
                      <span className="font-medium">{capacidadReal.toFixed(2)} t</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cap. disponible:</span>
                      <span className="font-medium">{freeSpace.toFixed(2)} t</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Consumo actual:</span>
                      <span className="font-medium">0.3 t/día</span>
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
                <CardTitle className="text-base">Temperatura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Promedio:</span>
                    <span className="font-medium">
                      {currentData?.temperature?.average?.toFixed(1) || '0'}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Máximo:</span>
                    <span className="font-medium">
                      {currentData?.temperature?.max?.toFixed(1) || '0'}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mínimo:</span>
                    <span className="font-medium">
                      {currentData?.temperature?.min?.toFixed(1) || '0'}°C
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Condición actual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Humedad:</span>
                    <span className={`font-medium ${humedadActual != null && humedadActual > humRef ? 'text-amber-600' : ''}`}>
                      {currentData?.humidity?.toFixed(0) || '0'}%
                      <span className="text-gray-400 font-normal ml-1">(ref. {humRef}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Densidad efectiva:</span>
                    <span className={`font-medium text-xs ${densidadAjustada ? 'text-amber-600' : 'text-gray-600'}`}>
                      {Math.round(densidadGrano * 1000)} kg/m³
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CO₂:</span>
                    <span className="font-medium">
                      {(currentData?.gases?.co2 ?? currentData?.co2)?.toFixed(0) || '0'} ppm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
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
              <CardTitle>Historial de cámara</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Dos visualizaciones lado a lado */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Imagen de cámara ESP32 o placeholder si no hay conexión */}
                  <div className="relative bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
                    {!cameraError ? (
                      <img
                        key={`${cameraKey}-${currentIndex}`}
                        src={cameraImageUrl}
                        alt={`Cámara ${silo.name}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ filter: 'brightness(1.6) contrast(1.1)' }}
                        onError={() => setCameraError(true)}
                        onLoad={() => setCameraError(false)}
                      />
                    ) : null}
                    {cameraError && (
                      <>
                        <div className="absolute inset-0 bg-gradient-radial from-gray-600 to-gray-900" />
                        <div className="relative z-10 text-center px-2">
                          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Sin imagen disponible</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {isViewingLatest ? 'Esperando foto del ESP32...' : 'Esta medición no tiene foto'}
                          </p>
                        </div>
                      </>
                    )}
                    {!isViewingLatest && historicImageUrl && (
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        Foto histórica
                      </div>
                    )}
                  </div>

                  {/* Mapa de calor topográfico basado en física (Ángulo de Reposo) */}
                  <MapaCalorSilo
                    distanciaVacia={distanciaVaciaCalc}
                    alturaSilo={alturaSiloCm}
                    radioSilo={radioSiloCm}
                    anguloReposo={30}
                  />
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
