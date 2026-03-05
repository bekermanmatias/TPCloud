import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, AlertTriangle, CheckCircle2, Clock,
  RefreshCw, History, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { getAlertHistory } from '../services/api';

// ── Mapeo de tipos de alerta a etiquetas legibles ─────────────────────────
const TYPE_LABELS = {
  STOCK_CRITICAL:     'Stock crítico',
  STOCK_FULL:         'Silo al tope',
  SUDDEN_DROP:        'Descenso brusco',
  TEMP_HIGH:          'Temp. elevada',
  HUMIDITY_HIGH:      'Humedad crítica',
  CONDENSATION:       'Riesgo condensación',
  GAS_MILD:           'Gases (leve)',
  GAS_CRITICAL:       'Gases críticos',
  FERMENTATION:       'Fermentación activa',
  HEAT_FOCUS:         'Foco de calor',
  INSECTS:            'Riesgo de insectos',
  DEVICE_OFFLINE:     'Dispositivo offline',
  DEVICE_UNSTABLE:    'Hardware inestable',
  SENSOR_ERROR:       'Error de sensor',
};

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(mins) {
  if (mins == null) return null;
  if (mins < 1)   return '< 1 min';
  if (mins < 60)  return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

// ── Componente ────────────────────────────────────────────────────────────
export default function AlertsHistorial({ siloId }) {
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all'); // all | active | resolved | critical | warning
  const [days,     setDays]     = useState(30);

  const load = useCallback(async () => {
    if (!siloId) return;
    setLoading(true);
    try {
      const data = await getAlertHistory(siloId, { days, limit: 200 });
      setHistory(data);
    } catch (e) {
      console.warn('No se pudo cargar historial de alertas:', e.message);
    } finally {
      setLoading(false);
    }
  }, [siloId, days]);

  useEffect(() => { load(); }, [load]);

  // ── Filtrado ────────────────────────────────────────────────────────────
  const filtered = history.filter((a) => {
    if (filter === 'active')   return !a.resolvedAt;
    if (filter === 'resolved') return !!a.resolvedAt;
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'warning')  return a.severity === 'warning';
    return true;
  });

  // ── Resumen rápido ──────────────────────────────────────────────────────
  const total    = history.length;
  const actives  = history.filter((a) => !a.resolvedAt).length;
  const criticals = history.filter((a) => a.severity === 'critical').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial de eventos detectados
          </CardTitle>

          {/* Selector de días */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-300"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 3 meses</option>
              <option value={365}>Último año</option>
            </select>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} title="Actualizar">
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Resumen numérico */}
        {!loading && total > 0 && (
          <div className="flex gap-4 text-xs text-gray-500 mt-1">
            <span>{total} evento{total !== 1 ? 's' : ''} en el período</span>
            {actives > 0 && (
              <span className="text-red-500 font-medium">{actives} activo{actives !== 1 ? 's' : ''}</span>
            )}
            {criticals > 0 && (
              <span className="text-red-400">{criticals} crítico{criticals !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[
            { key: 'all',      label: 'Todos' },
            { key: 'active',   label: 'Activos' },
            { key: 'resolved', label: 'Resueltos' },
            { key: 'critical', label: 'Críticos' },
            { key: 'warning',  label: 'Atención' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                ${filter === key
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              <Filter className="h-2.5 w-2.5" />
              {label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Cargando historial…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {total === 0
              ? 'Sin eventos registrados en el período seleccionado.'
              : 'Ningún evento coincide con el filtro seleccionado.'}
          </div>
        ) : (
          <ol className="relative border-l border-gray-200 ml-3 space-y-0">
            {filtered.map((alert, idx) => {
              const isActive   = !alert.resolvedAt;
              const isCritical = alert.severity === 'critical';
              const duration   = formatDuration(alert.durationMins);
              const typeLabel  = TYPE_LABELS[alert.type] || alert.type;

              return (
                <li key={alert.id} className="mb-6 ml-5">
                  {/* Punto de timeline */}
                  <span className={`absolute -left-[9px] flex items-center justify-center w-[18px] h-[18px] rounded-full
                    ${isActive
                      ? isCritical ? 'bg-red-100 ring-2 ring-red-400' : 'bg-amber-100 ring-2 ring-amber-400'
                      : 'bg-green-100 ring-1 ring-green-300'}`}
                  >
                    {isActive
                      ? isCritical
                        ? <AlertCircle className="h-2.5 w-2.5 text-red-500" />
                        : <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
                      : <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />}
                  </span>

                  {/* Cabecera del evento */}
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                      ${isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {typeLabel}
                    </span>
                    {isActive ? (
                      <span className="text-xs font-medium text-red-500 animate-pulse">● Activa</span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">✓ Resuelta</span>
                    )}
                  </div>

                  {/* Mensaje */}
                  <p className="text-sm text-gray-700 mt-1 leading-snug">{alert.message}</p>

                  {/* Metadatos */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-gray-400">
                    <span title="Disparada">{formatDate(alert.triggeredAt)}</span>
                    {duration && (
                      <span title="Duración">⏱ {duration}</span>
                    )}
                    {alert.acknowledgedAt && (
                      <span title="Reconocida por">
                        Visto{alert.acknowledgedByEmail ? ` por ${alert.acknowledgedByEmail}` : ''}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
