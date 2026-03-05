import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, RefreshCw, Bell, BellOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { getAlertsBySilo, acknowledgeAlert } from '../services/api';

const SEVERITY_CONFIG = {
  critical: {
    bg:        'bg-red-50 border-red-200',
    icon:      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />,
    badge:     'bg-red-100 text-red-700',
    label:     'Crítica',
  },
  warning: {
    bg:        'bg-amber-50 border-amber-200',
    icon:      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />,
    badge:     'bg-amber-100 text-amber-700',
    label:     'Atención',
  },
};

function formatRelativeTime(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} d`;
}

/**
 * Panel de alertas activas para un silo.
 *
 * Props:
 *   siloId    {string}   ID del silo
 *   compact   {boolean}  Si es true, muestra versión compacta (sin card wrapper)
 */
export default function AlertsPanel({ siloId, compact = false }) {
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [acking, setAcking]     = useState(null); // alertId en proceso
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    if (!siloId) return;
    try {
      const data = await getAlertsBySilo(siloId);
      setAlerts(data);
    } catch (e) {
      console.warn('No se pudieron cargar las alertas:', e.message);
    } finally {
      setLoading(false);
    }
  }, [siloId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // actualizar cada 30 s
    return () => clearInterval(interval);
  }, [load]);

  const handleAcknowledge = async (alertId) => {
    setAcking(alertId);
    try {
      await acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, acknowledged_at: new Date().toISOString() } : a
        )
      );
    } catch (e) {
      console.warn('Error al reconocer alerta:', e.message);
    } finally {
      setAcking(null);
    }
  };

  const criticals = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged_at);
  const warnings  = alerts.filter((a) => a.severity === 'warning'  && !a.acknowledged_at);
  const acked     = alerts.filter((a) => a.acknowledged_at);
  const unacked   = [...criticals, ...warnings];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Verificando alertas…
      </div>
    );
  }

  const content = (
    <div className="space-y-2">
      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} title="Actualizar">
          <RefreshCw className="h-3 w-3" />
        </Button>
        {alerts.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
          </Button>
        )}
      </div>

      {/* Lista de alertas */}
      {!collapsed && (
        <>
          {unacked.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.warning;
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 rounded-lg border p-3 ${cfg.bg}`}
              >
                {cfg.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(alert.triggered_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mt-1 leading-snug">{alert.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs flex-shrink-0"
                  disabled={acking === alert.id}
                  onClick={() => handleAcknowledge(alert.id)}
                  title="Marcar como vista"
                >
                  {acking === alert.id ? '…' : 'Visto'}
                </Button>
              </div>
            );
          })}

          {/* Alertas ya reconocidas (colapsadas) */}
          {acked.length > 0 && (
            <details className="text-xs text-gray-400">
              <summary className="cursor-pointer select-none hover:text-gray-600 py-1">
                {acked.length} alerta{acked.length !== 1 ? 's' : ''} reconocida{acked.length !== 1 ? 's' : ''}
              </summary>
              <div className="mt-1 space-y-1">
                {acked.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-2 rounded px-2 py-1 bg-gray-50 border border-gray-100">
                    <CheckCircle className="h-3 w-3 text-gray-300 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-400 line-through leading-snug">{alert.message}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {alerts.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">
              Todas las condiciones del silo son normales.
            </p>
          )}
        </>
      )}
    </div>
  );

  if (compact) return content;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alertas del silo
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
