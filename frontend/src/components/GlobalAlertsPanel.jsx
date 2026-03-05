import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, AlertTriangle, CheckCircle,
  Bell, RefreshCw, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { getActiveAlerts, acknowledgeAlert } from '../services/api';

// ── helpers ────────────────────────────────────────────────────────────────────
function relTime(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'hace un momento';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const SEV = {
  critical: {
    row:   'bg-red-50 border-red-200',
    icon:  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />,
    badge: 'bg-red-100 text-red-700',
    label: 'Crítica',
    dot:   'bg-red-500',
  },
  warning: {
    row:   'bg-amber-50 border-amber-200',
    icon:  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />,
    badge: 'bg-amber-100 text-amber-700',
    label: 'Atención',
    dot:   'bg-amber-400',
  },
};

// ── componente ─────────────────────────────────────────────────────────────────
export default function GlobalAlertsPanel({ silos = [] }) {
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [acking,   setAcking]   = useState(null);
  const [filterSev, setFilterSev] = useState('');  // '' | 'critical' | 'warning'
  const [filterSilo, setFilterSilo] = useState(''); // '' | siloId
  const [showAcked, setShowAcked] = useState(false);

  // mapa id→nombre para mostrar el nombre del silo en cada alerta
  const siloMap = Object.fromEntries(silos.map((s) => [s.id, s.name]));

  const load = useCallback(async () => {
    try {
      const data = await getActiveAlerts();
      setAlerts(data);
    } catch (e) {
      console.warn('GlobalAlertsPanel:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  const handleAck = async (alertId) => {
    setAcking(alertId);
    try {
      await acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) => a.id === alertId ? { ...a, acknowledged_at: new Date().toISOString() } : a)
      );
    } catch (e) {
      console.warn('Ack error:', e.message);
    } finally {
      setAcking(null);
    }
  };

  // ── filtrado ────────────────────────────────────────────────────────────────
  const unacked = alerts.filter((a) => !a.acknowledged_at);
  const acked   = alerts.filter((a) =>  a.acknowledged_at);

  const displayed = unacked
    .filter((a) => !filterSev  || a.severity === filterSev)
    .filter((a) => !filterSilo || a.silo_id  === filterSilo)
    .sort((a, b) => {
      // críticas primero, luego por fecha
      if (a.severity !== b.severity)
        return a.severity === 'critical' ? -1 : 1;
      return new Date(b.triggered_at) - new Date(a.triggered_at);
    });

  // silos que tienen alertas activas (para filtro)
  const silosWithAlerts = [...new Set(unacked.map((a) => a.silo_id))];

  const critCount = unacked.filter((a) => a.severity === 'critical').length;
  const warnCount = unacked.filter((a) => a.severity === 'warning').length;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className={`h-4 w-4 ${unacked.length > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            Alertas activas
            {unacked.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unacked.length}
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} title="Actualizar">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Contadores de severidad */}
        {unacked.length > 0 && (
          <div className="flex items-center gap-3 mt-1.5">
            {critCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {critCount} crítica{critCount > 1 ? 's' : ''}
              </span>
            )}
            {warnCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {warnCount} atención
              </span>
            )}
          </div>
        )}

        {/* Filtros */}
        {unacked.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {/* Filtro severidad */}
            {['critical', 'warning'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterSev(filterSev === s ? '' : s)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                  filterSev === s
                    ? s === 'critical'
                      ? 'bg-red-100 border-red-400 text-red-700'
                      : 'bg-amber-100 border-amber-400 text-amber-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                {s === 'critical' ? 'Críticas' : 'Atención'}
              </button>
            ))}

            {/* Filtro silo */}
            {silosWithAlerts.length > 1 && (
              <select
                value={filterSilo}
                onChange={(e) => setFilterSilo(e.target.value)}
                className="h-6 px-2 text-xs border border-gray-200 rounded-full bg-white text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-300 cursor-pointer"
              >
                <option value="">Todos los silos</option>
                {silosWithAlerts.map((id) => (
                  <option key={id} value={id}>{siloMap[id] || `Silo ${id}`}</option>
                ))}
              </select>
            )}

            {/* Limpiar filtros */}
            {(filterSev || filterSilo) && (
              <button
                onClick={() => { setFilterSev(''); setFilterSilo(''); }}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border border-gray-300 text-gray-500 hover:bg-gray-50"
              >
                <X className="h-2.5 w-2.5" /> Limpiar
              </button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pt-3 space-y-2 min-h-0">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Verificando alertas…
          </div>
        )}

        {!loading && displayed.length === 0 && unacked.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle className="h-10 w-10 text-green-400 mb-3" />
            <p className="text-sm font-medium text-green-700">Todo en orden</p>
            <p className="text-xs text-gray-400 mt-1">Ningún silo presenta alertas activas.</p>
          </div>
        )}

        {!loading && displayed.length === 0 && unacked.length > 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            Sin resultados para los filtros aplicados.
          </p>
        )}

        {/* Lista de alertas activas */}
        {displayed.map((alert) => {
          const cfg      = SEV[alert.severity] || SEV.warning;
          const siloName = siloMap[alert.silo_id] || `Silo ${alert.silo_id}`;
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${cfg.row} transition-opacity`}
            >
              {cfg.icon}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 truncate">{siloName}</span>
                  <span className="text-[10px] text-gray-400 ml-auto shrink-0">{relTime(alert.triggered_at)}</span>
                </div>
                <p className="text-sm text-gray-800 leading-snug">{alert.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs flex-shrink-0 text-gray-500 hover:text-gray-800"
                disabled={acking === alert.id}
                onClick={() => handleAck(alert.id)}
                title="Marcar como vista"
              >
                {acking === alert.id ? '…' : 'Visto'}
              </Button>
            </div>
          );
        })}

        {/* Alertas reconocidas (colapsables) */}
        {acked.length > 0 && (
          <div className="border-t pt-2 mt-2">
            <button
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 select-none w-full"
              onClick={() => setShowAcked((v) => !v)}
            >
              {showAcked ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {acked.length} alerta{acked.length !== 1 ? 's' : ''} reconocida{acked.length !== 1 ? 's' : ''}
            </button>
            {showAcked && (
              <div className="mt-2 space-y-1">
                {acked.map((alert) => {
                  const siloName = siloMap[alert.silo_id] || `Silo ${alert.silo_id}`;
                  return (
                    <div key={alert.id} className="flex items-start gap-2 rounded px-2 py-1.5 bg-gray-50 border border-gray-100">
                      <CheckCircle className="h-3 w-3 text-gray-300 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-gray-400 font-medium">{siloName} · </span>
                        <span className="text-xs text-gray-400 line-through">{alert.message}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
