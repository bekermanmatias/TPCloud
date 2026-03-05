import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { 
  ChevronLeft, 
  Calendar, 
  Thermometer, 
  Signal, 
  Camera,
  Activity,
  Edit,
  Trash2,
  RefreshCw,
  BarChart2,
  Bell,
  ChevronDown,
  ImageIcon,
  Loader2,
  History,
  Droplets,
  Maximize2,
  X,
  Folder,
  Thermometer as ThermometerIcon,
  Wind,
  Package,
} from 'lucide-react';

// ── Lightbox (imagen a pantalla completa) ──────────────────────────────────
function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/70 rounded-full p-2 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
        style={{ filter: 'brightness(1.6) contrast(1.1)' }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
import { getSiloHistory, getSiloFullHistory, getSiloCameraUrl, getSiloHistoryImageUrl, updateSilo, deleteSilo, saveCapture } from '../services/api';
import { SiloVisual } from './SiloVisual';
import SiloHistory from './SiloHistory';
import MapaCalorSilo from './MapaCalorSilo';
import { getDensity, getDensityAdjusted, GRAIN_HUM_REF, DEFAULT_HUM_REF, GRAIN_ANGLES, DEFAULT_ANGLE } from '../constants/grainDensities';
import AlertsPanel from './AlertsPanel';
import AlertsHistorial from './AlertsHistorial';
import SiloFormModal from './SiloFormModal';

const CAMERA_REFRESH_MS = 5000; // Actualizar imagen cada 5 s (igual que el ESP32 puede enviar)

function SiloDetailView({ silo, onBack, onSiloUpdated }) {
  // Datos recientes (siempre cargados, 100 registros) — usados para stats y vista actual
  const [histories, setHistories] = useState([]);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [lightbox, setLightbox]       = useState(null); // { src, alt }
  const [savingCapture, setSavingCapture] = useState(false); // live camera
  const [savingHistCapture, setSavingHistCapture] = useState(false); // hist visual
  const [captureFeedback, setCaptureFeedback] = useState(null); // { msg, ok }

  // ── Historial visual (lazy) — solo carga al abrir el tab ────────────────
  const [histVisual, setHistVisual]         = useState([]);
  const [histVisualIdx, setHistVisualIdx]   = useState(0);
  const [histVisualLoading, setHistVisualLoading] = useState(false);
  const [histVisualFull, setHistVisualFull] = useState(false);   // ya cargó todo
  const [histVisualCamErr, setHistVisualCamErr]   = useState(false);

  // Pestaña activa del historial: null = colapsado
  const [histTab, setHistTab] = useState(null);
  // Conjunto de pestañas que ya fueron abiertas (para no desmontar al cambiar de pestaña)
  const [mountedTabs, setMountedTabs] = useState(new Set());

  const loadHistVisual = useCallback(async (full = false) => {
    if (histVisualLoading) return;
    setHistVisualLoading(true);
    try {
      const data = full
        ? await getSiloFullHistory(silo.id)
        : await getSiloHistory(silo.id, { limit: 200, hours: 720 });
      setHistVisual(data);
      setHistVisualIdx(0);
      if (full) setHistVisualFull(true);
    } catch (err) {
      console.error('Error cargando historial visual:', err);
    } finally {
      setHistVisualLoading(false);
    }
  }, [silo.id, histVisualLoading]);

  const openHistTab = useCallback((tab) => {
    setHistTab((prev) => (prev === tab ? null : tab)); // toggle
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      if (tab === 'visual') {
        setTimeout(() => loadHistVisual(false), 0);
      }
      return new Set([...prev, tab]);
    });
  }, [loadHistVisual]);

  // ── Guardar captura en galería ─────────────────────────────────────────────
  const showFeedback = (msg, ok) => {
    setCaptureFeedback({ msg, ok });
    setTimeout(() => setCaptureFeedback(null), 3000);
  };

  const handleSaveLiveCapture = async () => {
    if (savingCapture) return;
    const d = histories[0];
    setSavingCapture(true);
    try {
      await saveCapture({
        silo_id:               silo.id,
        silo_name:             silo.name,
        image_path:            d?.imagePath ?? null,
        captured_at:           d?.timestamp ?? new Date().toISOString(),
      temperature:           d?.temperature?.average ?? d?.temperature ?? null,
      humidity:              d?.humidity ?? null,
      co2:                   d?.gases?.co2 ?? (typeof d?.gases === 'number' ? d.gases : null),
      grain_level_percentage: d?.grainLevel?.percentage ?? null,
      grain_level_tons:      d?.grainLevel?.tons ?? null,
      presion:               d?.presion ?? null,
      source:                'live',
      });
      showFeedback('Captura guardada en Galería', true);
    } catch {
      showFeedback('Error al guardar la captura', false);
    } finally {
      setSavingCapture(false);
    }
  };

  const handleSaveHistCapture = async () => {
    if (savingHistCapture) return;
    const d = histVisual[histVisualIdx];
    if (!d) return;
    setSavingHistCapture(true);
    try {
      await saveCapture({
        silo_id:               silo.id,
        silo_name:             silo.name,
        image_path:            d.imagePath ?? null,
        captured_at:           d.timestamp ?? null,
      temperature:           d.temperature?.average ?? d.temperature ?? null,
      humidity:              d.humidity ?? null,
      co2:                   d.gases?.co2 ?? (typeof d.gases === 'number' ? d.gases : null),
      grain_level_percentage: d.grainLevel?.percentage ?? null,
      grain_level_tons:      d.grainLevel?.tons ?? null,
      presion:               d.presion ?? null,
      source:                'historical',
      });
      showFeedback('Captura guardada en Galería', true);
    } catch {
      showFeedback('Error al guardar la captura', false);
    } finally {
      setSavingHistCapture(false);
    }
  };

  // ── Editar silo ────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen]     = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState('');

  const handleEditSave = async (formData) => {
    setEditSaving(true);
    setEditError('');
    try {
      await updateSilo(silo.id, formData);
      setEditOpen(false);
      if (onSiloUpdated) onSiloUpdated();
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Error al guardar los cambios.');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Eliminar silo ──────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const reloadRecentHistory = useCallback(async () => {
    try {
      const history = await getSiloHistory(silo.id, { limit: 100, hours: 720 });
      setHistories(history);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  }, [silo.id]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteSilo(silo.id);
      if (onSiloUpdated) onSiloUpdated(); // refresca la lista en el padre
      onBack();                           // vuelve al dashboard
    } catch (err) {
      console.error('Error al eliminar silo:', err);
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  };

  useEffect(() => {
    reloadRecentHistory();
    const interval = setInterval(reloadRecentHistory, 5000);
    return () => clearInterval(interval);
  }, [reloadRecentHistory]);

  // La cámara en vivo siempre se refresca (ya no hay slider en la vista principal)
  useEffect(() => {
    setCameraError(false);
    const interval = setInterval(() => {
      setCameraError(false);
      setCameraKey((k) => k + 1);
    }, CAMERA_REFRESH_MS);
    return () => clearInterval(interval);
  }, [silo.id]);

  // Siempre usa el dato más reciente (índice 0 en orden DESC)
  const currentData = histories[0] || silo.latestData;

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

  // URL de imagen "en vivo": prioriza la última imagePath (S3/local), cae a /api/camera
  const liveBaseUrl = currentData?.imagePath
    ? getSiloHistoryImageUrl(currentData.imagePath)
    : getSiloCameraUrl(silo.id);

  const liveImageUrl = liveBaseUrl
    ? `${liveBaseUrl}${liveBaseUrl.includes('?') ? '&' : '?'}_r=${cameraKey}`
    : null;


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

  const stockPercentage = currentData?.grainLevel?.percentage || 0;
  const weight = currentData?.grainLevel?.tons || 0;

  // ── Estadísticas de temperatura calculadas sobre TODO el historial ─────────
  // El ESP32 envía una lectura puntual, así que min/max/avg del
  // dato individual siempre son iguales. Los calculamos desde histories[].
  const tempHistValues = histories
    .map(h => h.temperature?.average)
    .filter(v => typeof v === 'number' && isFinite(v));

  const tempHistAvg = tempHistValues.length > 0
    ? tempHistValues.reduce((a, b) => a + b, 0) / tempHistValues.length
    : (currentData?.temperature?.average ?? 0);
  const tempHistMax = tempHistValues.length > 0
    ? Math.max(...tempHistValues)
    : (currentData?.temperature?.average ?? 0);
  const tempHistMin = tempHistValues.length > 0
    ? Math.min(...tempHistValues)
    : (currentData?.temperature?.average ?? 0);
  // ──────────────────────────────────────────────────────────────────────────

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

  // ── Ángulo de reposo según tipo de grano ─────────────────────────────────
  const anguloReposo = GRAIN_ANGLES[silo.grainType] ?? DEFAULT_ANGLE;

  // ── Lecturas por día (últimas 24 h) ──────────────────────────────────────
  const now24 = Date.now();
  const lectsPorDia = histories.filter(
    h => (now24 - new Date(h.timestamp).getTime()) <= 24 * 60 * 60 * 1000
  ).length;

  // ── Consumo / ingreso estimado por día ────────────────────────────────────
  // Compara el peso actual con el de la lectura más cercana a hace ~24 h.
  // histories está ordenado DESC (más reciente primero).
  const newestWeight = histories[0]?.grainLevel?.tons ?? weight;
  const reading24h   = histories.find(h => {
    const diffH = (now24 - new Date(h.timestamp).getTime()) / 3_600_000;
    return diffH >= 20; // lectura de hace ≥ 20 h (proxy de "ayer")
  });
  const consumoTDia  = reading24h != null
    ? parseFloat(((reading24h.grainLevel?.tons ?? 0) - newestWeight).toFixed(2))
    : null; // positivo → consumo; negativo → carga

  // ── Estado general derivado de los datos del sensor ───────────────────────
  const tempActual = currentData?.temperature?.average ?? 0;
  const humActual  = currentData?.humidity ?? 0;
  const gasActual  = currentData?.gases?.co2 ?? 0;

  let estadoLabel = 'Normal';
  let estadoColor = 'text-green-600';

  if (
    (tempActual > 30 && humActual > 65 && gasActual > 100) ||
    gasActual > 150
  ) {
    estadoLabel = 'Crítico';
    estadoColor = 'text-red-600';
  } else if (tempActual > 28 || humActual > 70 || gasActual > 100) {
    estadoLabel = 'Atención';
    estadoColor = 'text-amber-600';
  }

  // ── Presión atmosférica y punto de rocío ─────────────────────────────────
  // La presión atmosférica es un dato "actual": siempre priorizamos el
  // registro más reciente (histories[0] en orden DESC), luego el slot del
  // slider actual, luego latestData del prop como último recurso.
  const presionActual =
    histories[0]?.presion ??
    currentData?.presion ??
    silo.latestData?.presion ??
    null;
  const dewPoint = (() => {
    if (humActual <= 0 || tempActual == null) return null;
    const a = 17.27, b = 237.7;
    const gamma = (a * tempActual) / (b + tempActual) + Math.log(Math.max(humActual, 1) / 100);
    return parseFloat(((b * gamma) / (a - gamma)).toFixed(1));
  })();
  // Margen al punto de rocío: < 2°C → riesgo de condensación
  const condensRisk = dewPoint != null && (tempActual - dewPoint) < 2;

  // ── Estado de conectividad del dispositivo ────────────────────────────────
  const lastTs        = histories[0]?.timestamp ?? currentData?.timestamp;
  const minsSinceData = lastTs
    ? (now24 - new Date(lastTs).getTime()) / 60_000
    : Infinity;
  const deviceOnline  = minsSinceData < 30;
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <>
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

      {/* Header con nombre, acciones y refresco */}
      <div className="flex items-start justify-between gap-4">
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            title="Actualizar datos"
            onClick={() => {
              // forzar recarga inmediata del historial y de la cámara
              reloadRecentHistory();
              setCameraKey((k) => k + 1);
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {deleteConfirm ? (
            <>
              <span className="text-sm text-red-600 font-medium mr-1">¿Eliminar este silo?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                title="Editar silo"
                onClick={() => { setEditError(''); setEditOpen(true); }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Eliminar silo"
                className="text-red-500 hover:text-red-700 hover:border-red-400"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Bar - Debajo del nombre del silo */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
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
                <div className={`h-2 w-2 rounded-full ${deviceOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-sm font-medium ${deviceOnline ? 'text-green-600' : 'text-red-500'}`}>
                  {deviceOnline ? 'En línea' : 'Sin señal'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Signal className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {formatDate(currentData?.timestamp)}
                </span>
                {lectsPorDia > 0 && (
                  <span className="text-xs text-gray-500">({lectsPorDia} lect/día)</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout principal: 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* COLUMNA IZQUIERDA - Estado del Silo */}
        <div className="flex flex-col gap-6">
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
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards de información adicional */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            <Card className="h-full">
              <CardHeader className="pb-1">
                <CardTitle className="text-base flex items-center justify-between">
                  Temperatura
                  {tempHistValues.length > 1 && (
                    <span className="text-xs font-normal text-gray-400">
                      últimas {tempHistValues.length} lect.
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actual:</span>
                    <span className="font-medium">
                      {(currentData?.temperature?.average ?? 0).toFixed(1)}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Promedio:</span>
                    <span className="font-medium">
                      {tempHistAvg.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Máximo:</span>
                    <span className="font-medium text-red-500">
                      {tempHistMax.toFixed(1)}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mínimo:</span>
                    <span className="font-medium text-blue-500">
                      {tempHistMin.toFixed(1)}°C
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Condición actual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      Humedad:
                    </span>
                    <span className={`font-medium ${humedadActual != null && humedadActual > humRef ? 'text-amber-600' : ''}`}>
                      {currentData?.humidity?.toFixed(0) || '0'}%
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
                    <span className="text-gray-600">Presión:</span>
                    <span className="font-medium">
                      {presionActual != null ? `${presionActual.toFixed(1)} hPa` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className="text-gray-600"
                      title="Temperatura a la que el vapor de agua condensa sobre superficies"
                    >
                      Pto. de rocío:
                    </span>
                    <span className={`font-medium ${condensRisk ? 'text-blue-600' : ''}`}
                      title={condensRisk ? 'Riesgo de condensación: temperatura interna muy cerca del punto de rocío' : ''}
                    >
                      {dewPoint != null ? `${dewPoint}°C` : '—'}
                      {condensRisk && <span className="text-xs ml-1">⚠️ cond.</span>}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className={`font-medium ${estadoColor}`}>{estadoLabel}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* COLUMNA DERECHA - Cámara en vivo + Mapa de calor actual */}
        <div className="flex flex-col">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Vista actual</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Cámara y mapa lado a lado — mismo tamaño que antes */}
              <div className="grid grid-cols-2 gap-4">
                {/* Cámara en vivo */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    <Camera className="h-3 w-3" /> Cámara
                  </p>
                  <div className="relative bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg overflow-hidden aspect-square flex items-center justify-center group">
                    {!cameraError && liveImageUrl ? (
                      <img
                        key={cameraKey}
                        src={liveImageUrl}
                        alt={`Cámara ${silo.name}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ filter: 'brightness(1.6) contrast(1.1)' }}
                        onError={() => setCameraError(true)}
                        onLoad={() => setCameraError(false)}
                      />
                    ) : null}
                    {(cameraError || !liveImageUrl) && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-b from-gray-600 to-gray-900" />
                        <div className="relative z-10 text-center px-2">
                          <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Sin imagen</p>
                          <p className="text-xs text-gray-500 mt-1">Esperando ESP32…</p>
                        </div>
                      </>
                    )}
                    {!cameraError && liveImageUrl && (
                      <>
                        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={handleSaveLiveCapture}
                            disabled={savingCapture}
                            className="bg-orange-600/80 hover:bg-orange-700 text-white rounded-md p-1.5 disabled:opacity-50 transition-colors"
                            title="Guardar captura en galería"
                          >
                            <Folder className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setLightbox({ src: liveImageUrl, alt: `Cámara ${silo.name}` })}
                            className="bg-black/50 hover:bg-black/80 text-white rounded-md p-1.5 transition-colors"
                            title="Ver en pantalla completa"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mapa de calor actual */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Distribución del grano</p>
                  <MapaCalorSilo
                    distanciaVacia={distanciaVaciaCalc}
                    alturaSilo={alturaSiloCm}
                    radioSilo={radioSiloCm}
                    anguloReposo={anguloReposo}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{weight.toFixed(2)} t · {stockPercentage.toFixed(1)}%</span>
                <span>{formatDate(currentData?.timestamp)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toast de feedback de captura */}
      {captureFeedback && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all ${
          captureFeedback.ok
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          <Folder className="h-4 w-4" />
          {captureFeedback.msg}
        </div>
      )}

      {/* Panel de alertas activas */}
      <AlertsPanel siloId={silo.id} />

      {/* ── Sección de historial (lazy) ─────────────────────────────────── */}
      <div className="space-y-0">
        {/* Botones para abrir cada pestaña */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'visual',   icon: <ImageIcon  className="h-4 w-4" />,  label: 'Historial visual'     },
            { id: 'datos',    icon: <BarChart2  className="h-4 w-4" />,  label: 'Historial de datos'   },
            { id: 'eventos',  icon: <Bell       className="h-4 w-4" />,  label: 'Historial de eventos' },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => openHistTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border text-sm font-medium transition-colors
                ${histTab === id
                  ? 'bg-white border-b-white text-orange-700 border-orange-200 shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
            >
              {icon}
              {label}
              <ChevronDown className={`h-3 w-3 transition-transform ${histTab === id ? 'rotate-180' : ''}`} />
            </button>
          ))}
        </div>

        {/* Contenido de la pestaña — solo se monta la primera vez que se abre */}
        {histTab && (
          <div className="border border-orange-200 rounded-b-lg rounded-tr-lg bg-white p-4 shadow-sm">

            {/* ── Historial visual (cámara + mapa de calor por fecha) ── */}
            {mountedTabs.has('visual') && (
              <div className={histTab === 'visual' ? '' : 'hidden'}>
                {histVisualLoading && histVisual.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Cargando historial visual…</span>
                  </div>
                ) : histVisual.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Sin datos históricos disponibles.</p>
                ) : (() => {
                  const hvData  = histVisual[histVisualIdx];
                  const hvRaw   = hvData?.grainLevel?.distance;
                  const hvPct   = hvData?.grainLevel?.percentage ?? 0;
                  const hvDist  = (hvRaw != null && hvRaw > 0) ? hvRaw : alturaSiloCm * (1 - hvPct / 100);
                  const hvImgUrl = getSiloHistoryImageUrl(hvData?.imagePath);
                  return (
                    <div className="space-y-4">
                      {/* Header: fecha + botón historial completo */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <History className="h-4 w-4" />
                          <span className="font-medium">{formatDate(hvData?.timestamp)}</span>
                          <span className="text-gray-400">
                            ({histVisualIdx + 1} / {histVisual.length})
                          </span>
                        </div>
                        {!histVisualFull && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadHistVisual(true)}
                            disabled={histVisualLoading}
                            className="text-xs"
                          >
                            {histVisualLoading
                              ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Cargando…</>
                              : <><History className="h-3 w-3 mr-1" />Cargar historial completo</>
                            }
                          </Button>
                        )}
                        {histVisualFull && (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <History className="h-3 w-3" />
                            Historial completo cargado ({histVisual.length} registros)
                          </span>
                        )}
                      </div>

                      {/* Slider de tiempo */}
                      <div className="space-y-1">
                        <Slider
                          value={[histVisualIdx]}
                          onValueChange={([v]) => { setHistVisualIdx(v); setHistVisualCamErr(false); }}
                          max={histVisual.length - 1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{histVisual.length > 0 && formatDateShort(histVisual[0]?.timestamp)}</span>
                          <span>{histVisual.length > 0 && formatDateShort(histVisual[histVisual.length - 1]?.timestamp)}</span>
                        </div>
                      </div>

                      {/* Cámara histórica + Mapa de calor lado a lado */}
                      <div className="flex gap-4 justify-center">
                        {/* Foto histórica */}
                        <div className="w-56 shrink-0">
                          <p className="text-xs text-gray-500 mb-1 font-medium">Foto</p>
                          <div className="relative bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg overflow-hidden aspect-square flex items-center justify-center group">
                            {hvImgUrl && !histVisualCamErr ? (
                              <img
                                key={hvImgUrl}
                                src={hvImgUrl}
                                alt="Foto histórica"
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ filter: 'brightness(1.6) contrast(1.1)' }}
                                onError={() => setHistVisualCamErr(true)}
                                onLoad={() => setHistVisualCamErr(false)}
                              />
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-b from-gray-600 to-gray-900" />
                                <div className="relative z-10 text-center px-2">
                                  <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                                  <p className="text-xs text-gray-400">Sin foto</p>
                                </div>
                              </>
                            )}
                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                              Histórica
                            </div>
                            {hvImgUrl && !histVisualCamErr && (
                              <>
                                <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={handleSaveHistCapture}
                                    disabled={savingHistCapture}
                                    className="bg-orange-600/80 hover:bg-orange-700 text-white rounded-md p-1.5 disabled:opacity-50 transition-colors"
                                    title="Guardar en galería"
                                  >
                                    <Folder className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setLightbox({ src: hvImgUrl, alt: 'Foto histórica' })}
                                    className="bg-black/50 hover:bg-black/80 text-white rounded-md p-1.5 transition-colors"
                                    title="Ver en pantalla completa"
                                  >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Mapa de calor histórico */}
                        <div className="w-56 shrink-0">
                          <p className="text-xs text-gray-500 mb-1 font-medium">Distribución</p>
                          <MapaCalorSilo
                            distanciaVacia={hvDist}
                            alturaSilo={alturaSiloCm}
                            radioSilo={radioSiloCm}
                            anguloReposo={anguloReposo}
                          />
                        </div>
                      </div>

                      {/* Stats del registro seleccionado */}
                      <div className="grid grid-cols-4 gap-2 text-center text-xs border-t pt-3">
                        <div><p className="text-gray-400">Toneladas</p><p className="font-semibold">{(hvData?.grainLevel?.tons ?? 0).toFixed(1)} t</p></div>
                        <div><p className="text-gray-400">Nivel</p><p className="font-semibold">{hvPct.toFixed(1)}%</p></div>
                        <div><p className="text-gray-400">Temp.</p><p className="font-semibold">{(hvData?.temperature?.average ?? 0).toFixed(1)}°C</p></div>
                        <div><p className="text-gray-400">Humedad</p><p className="font-semibold">{(hvData?.humidity ?? 0).toFixed(0)}%</p></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── Historial de datos de sensores (gráficos) ── */}
            {mountedTabs.has('datos') && (
              <div className={histTab === 'datos' ? '' : 'hidden'}>
                <SiloHistory histories={histories} siloName={silo.name} />
              </div>
            )}

            {/* ── Historial de eventos y alertas ── */}
            {mountedTabs.has('eventos') && (
              <div className={histTab === 'eventos' ? '' : 'hidden'}>
                <AlertsHistorial siloId={silo.id} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Modal de edición */}
    <SiloFormModal
      open={editOpen}
      silo={silo}
      onClose={() => setEditOpen(false)}
      onSave={handleEditSave}
      saving={editSaving}
      error={editError}
    />

    {/* Lightbox — imagen a pantalla completa */}
    {lightbox && (
      <ImageLightbox
        src={lightbox.src}
        alt={lightbox.alt}
        onClose={() => setLightbox(null)}
      />
    )}
    </>
  );
}

export default SiloDetailView;
