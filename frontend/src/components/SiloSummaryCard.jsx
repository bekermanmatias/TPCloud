import { Thermometer, Droplets, Wind, AlertTriangle, ChevronRight, Wifi, WifiOff } from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────────
const getEstado = (ld) => {
  if (!ld) return { label: 'Sin datos', color: 'text-gray-400', bg: 'bg-gray-100', border: 'border-gray-200' };
  const t = ld.temperature?.average ?? 0;
  const h = ld.humidity ?? 0;
  const g = ld.gases?.co2 ?? 0;
  if ((t > 30 && h > 65 && g > 100) || g > 150)
    return { label: 'Crítico',  color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-300' };
  if (t > 28 || h > 70 || g > 100)
    return { label: 'Atención', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' };
  return { label: 'Normal', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
};

const stockBarColor = (p) => p >= 60 ? 'bg-green-500' : p >= 30 ? 'bg-amber-400' : 'bg-red-500';

function Metric({ icon, value, warn }) {
  return (
    <div className={`flex items-center gap-1 text-xs ${warn ? 'text-amber-600 font-semibold' : 'text-gray-600'}`}>
      {icon}
      <span>{value}</span>
    </div>
  );
}

/**
 * Tarjeta compacta de resumen de un silo para el Panel de Control.
 *
 * Props:
 *   silo       {object}    datos del silo (incluyendo latestData)
 *   alertCount {number}    número de alertas activas del silo
 *   onClick    {function}  navegar al detalle
 */
export default function SiloSummaryCard({ silo, alertCount = 0, onClick }) {
  const ld       = silo.latestData;
  const estado   = getEstado(ld);
  const stockPct = ld?.grainLevel?.percentage ?? 0;
  const weight   = ld?.grainLevel?.tons ?? 0;
  const lastTs   = ld?.timestamp ? new Date(ld.timestamp).getTime() : 0;
  const online   = lastTs > 0 && (Date.now() - lastTs) / 60_000 < 30;

  const temp   = ld?.temperature?.average;
  const hum    = ld?.humidity;
  const co2    = ld?.gases?.co2;
  const tempW  = temp != null && temp > 28;
  const humW   = hum  != null && hum  > 70;
  const co2W   = co2  != null && co2  > 100;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border ${estado.border} bg-white hover:shadow-md transition-all duration-150 group overflow-hidden`}
    >
      {/* Cabecera coloreada según estado */}
      <div className={`${estado.bg} px-4 pt-3 pb-2 border-b ${estado.border}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{silo.name}</p>
            {silo.location && (
              <p className="text-[11px] text-gray-500 truncate mt-0.5">{silo.location}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {/* Indicador en línea */}
            {online
              ? <Wifi className="h-3.5 w-3.5 text-green-500" />
              : <WifiOff className="h-3.5 w-3.5 text-gray-400" />}
            {/* Badge estado */}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${estado.bg} ${estado.color} border ${estado.border}`}>
              {estado.label}
            </span>
          </div>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="px-4 py-2.5 space-y-2">
        {/* Barra de stock */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-500">
              {silo.grainType || 'Grano'}
            </span>
            <span className="text-xs font-semibold text-gray-800">
              {weight.toFixed(1)} t · {stockPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${stockBarColor(stockPct)}`}
              style={{ width: `${Math.min(stockPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Métricas */}
        {ld ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {temp != null && (
                <Metric
                  icon={<Thermometer className="h-3 w-3" />}
                  value={`${temp.toFixed(1)}°C`}
                  warn={tempW}
                />
              )}
              {hum != null && (
                <Metric
                  icon={<Droplets className="h-3 w-3" />}
                  value={`${hum.toFixed(0)}%`}
                  warn={humW}
                />
              )}
              {co2 != null && (
                <Metric
                  icon={<Wind className="h-3 w-3" />}
                  value={`${co2} ppm`}
                  warn={co2W}
                />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {alertCount > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {alertCount}
                </span>
              )}
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-1">Sin datos de sensores</p>
        )}
      </div>
    </button>
  );
}
