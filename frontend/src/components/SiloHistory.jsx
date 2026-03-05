import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader } from './ui/card';

/**
 * Índice de Calidad del Aire normalizado (0-100) basado en ppm del MQ-135.
 * Umbrales alineados con las alertas del backend:
 *   0–100 ppm  → zona verde  (Normal)
 *   100–150    → zona naranja (Atención)
 *   150–300+   → zona roja   (Peligroso)
 */
function calcIQA(ppm) {
  if (ppm == null || ppm < 0) return 0;
  if (ppm <= 100) return Math.round((ppm / 100) * 50);           // 0–50
  if (ppm <= 150) return Math.round(50 + ((ppm - 100) / 50) * 25); // 50–75
  if (ppm <= 300) return Math.round(75 + ((ppm - 150) / 150) * 25); // 75–100
  return 100;
}

function iqaLabel(iqa) {
  if (iqa < 34) return { label: 'Normal',    color: 'text-green-600',  bg: 'bg-green-100'  };
  if (iqa < 67) return { label: 'Atención',  color: 'text-amber-600',  bg: 'bg-amber-100'  };
  return         { label: 'Peligroso', color: 'text-red-600',    bg: 'bg-red-100'    };
}

/** Convierte un ISO string a formato YYYY-MM-DDTHH:mm en hora local (requerido por datetime-local) */
function toInputDatetime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Export CSV ─────────────────────────────────────────────────────────────────
function exportCSV(data, siloName = 'silo') {
  const headers = [
    'Fecha y hora',
    'Peso (t)',
    'Volumen (%)',
    'Temperatura (°C)',
    'Humedad (%)',
    'CO₂ (ppm)',
    'IQA (0-100)',
  ];

  const rows = data.map((d) => [
    d.fullDate,
    d.weight.toFixed(3),
    d.volume.toFixed(2),
    d.temp.toFixed(1),
    d.humidity.toFixed(1),
    d.co2,
    d.iqa,
  ]);

  const csvContent =
    '\uFEFF' + // BOM para compatibilidad con Excel
    [headers, ...rows].map((r) => r.join(';')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const date = new Date().toISOString().slice(0, 10);
  link.href     = url;
  link.download = `salgest_${siloName.replace(/\s+/g, '_')}_${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function SiloHistory({ histories, siloName }) {
  const [viewMode, setViewMode] = useState('weight');
  const [fromDatetime, setFromDatetime] = useState('');
  const [toDatetime, setToDatetime] = useState('');

  // Preparar todos los datos ordenados con timestamp crudo para filtrar
  const chartData = useMemo(() => {
    if (!histories || histories.length === 0) return [];
    return histories
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((item, index) => {
        const date = new Date(item.timestamp);
        const co2 = item.gases?.co2 ?? 0;
        return {
          timestamp: item.timestamp,
          date: date.toLocaleDateString('es-AR', { month: 'short', day: '2-digit' }),
          fullDate: date.toLocaleDateString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }),
          weight: item.grainLevel?.tons || 0,
          volume: item.grainLevel?.percentage || 0,
          temp: item.temperature?.average || 0,
          humidity: item.humidity || 0,
          co2,
          iqa: calcIQA(co2),
        };
      });
  }, [histories]);

  // Inicializar / resetear el rango cuando cambia el historial
  useEffect(() => {
    if (chartData.length > 0) {
      setFromDatetime(toInputDatetime(chartData[0].timestamp));
      setToDatetime(toInputDatetime(chartData[chartData.length - 1].timestamp));
    }
  }, [chartData]);

  // Datos filtrados según el rango seleccionado
  const filteredData = useMemo(() => {
    if (!fromDatetime && !toDatetime) return chartData;
    const from = fromDatetime ? new Date(fromDatetime) : new Date(0);
    const to = toDatetime ? new Date(toDatetime) : new Date(9999999999999);
    return chartData.filter((d) => {
      const t = new Date(d.timestamp);
      return t >= from && t <= to;
    });
  }, [chartData, fromDatetime, toDatetime]);

  // IQA actual: último dato del rango filtrado
  const lastIQA = filteredData.length > 0
    ? iqaLabel(filteredData[filteredData.length - 1].iqa)
    : null;
  const lastCO2 = filteredData.length > 0
    ? filteredData[filteredData.length - 1].co2
    : null;

  const isFullRange =
    chartData.length === 0 ||
    (fromDatetime === toInputDatetime(chartData[0]?.timestamp) &&
      toDatetime === toInputDatetime(chartData[chartData.length - 1]?.timestamp));

  const resetRange = () => {
    if (chartData.length > 0) {
      setFromDatetime(toInputDatetime(chartData[0].timestamp));
      setToDatetime(toInputDatetime(chartData[chartData.length - 1].timestamp));
    }
  };

  const tooltipLabel = (label) => {
    const item = filteredData.find((d) => d.date === label);
    return item?.fullDate || label;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No hay datos históricos disponibles
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-sm border-slate-200">
      <CardHeader className="flex flex-col md:flex-row justify-between items-start gap-4 border-b pb-4">
        {/* Selectores de fecha y hora */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400 font-medium ml-1">Desde</label>
            <input
              type="datetime-local"
              value={fromDatetime}
              max={toDatetime || undefined}
              onChange={(e) => setFromDatetime(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300
                         cursor-pointer hover:border-slate-300 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400 font-medium ml-1">Hasta</label>
            <input
              type="datetime-local"
              value={toDatetime}
              min={fromDatetime || undefined}
              onChange={(e) => setToDatetime(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300
                         cursor-pointer hover:border-slate-300 transition-colors"
            />
          </div>
          {!isFullRange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetRange}
              className="gap-1.5 text-slate-500 hover:text-slate-700 mb-0.5"
              title="Restablecer rango completo"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 self-end">
          {/* Contador de registros en el rango */}
          <span className="text-xs text-slate-400">
            {filteredData.length} registro{filteredData.length !== 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200"
            title="Exportar datos del rango seleccionado a CSV"
            onClick={() => exportCSV(filteredData, siloName)}
            disabled={filteredData.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Toggle Central (Peso vs Volumen) */}
        <div className="flex justify-center mb-8">
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-[300px]">
            <TabsList className="grid w-full grid-cols-2 bg-orange-50/50">
              <TabsTrigger
                value="weight"
                className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
              >
                Peso (t)
              </TabsTrigger>
              <TabsTrigger
                value="volume"
                className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
              >
                Volumen (%)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filteredData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
            Sin datos en el rango seleccionado
          </div>
        ) : (
          <>
            {/* GRÁFICO SUPERIOR (Peso/Volumen) */}
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData} syncId="siloSync" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" hide />
                  <YAxis
                    label={{
                      value: viewMode === 'weight' ? 'Peso (t)' : 'Volumen (%)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#94a3b8' },
                    }}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    formatter={(value) =>
                      viewMode === 'weight'
                        ? [`${value.toFixed(2)} t`, 'Peso']
                        : [`${value.toFixed(2)}%`, 'Volumen']
                    }
                    labelFormatter={tooltipLabel}
                  />
                  <Area
                    type="stepAfter"
                    dataKey={viewMode === 'weight' ? 'weight' : 'volume'}
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill={viewMode === 'weight' ? 'url(#colorWeight)' : 'url(#colorVolume)'}
                    strokeWidth={2}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', stroke: '#f59e0b' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda */}
            <div className="flex justify-center gap-6 my-2 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-sky-400" />
                Temperatura (°C)
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-400" />
                Humedad (%)
              </div>
            </div>

            {/* GRÁFICO INFERIOR (Ambiente: Temp + Humedad) */}
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData} syncId="siloSync" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                    formatter={(value, name) => {
                      if (name === 'temp') return [`${value.toFixed(1)}°C`, 'Temperatura'];
                      if (name === 'humidity') return [`${value.toFixed(1)}%`, 'Humedad'];
                      return [value, name];
                    }}
                    labelFormatter={tooltipLabel}
                  />
                  <Line type="monotone" dataKey="temp" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="humidity" stroke="#a3e635" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Separador + encabezado CO₂ */}
            <div className="flex items-center justify-between mt-6 mb-1 px-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-violet-400" />
                <span className="text-xs font-medium text-slate-500">CO₂ / Gases (ppm)</span>
              </div>
              {lastIQA && lastCO2 != null && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">IQA actual:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full ${lastIQA.bg} ${lastIQA.color}`}>
                    {lastCO2} ppm — {lastIQA.label}
                  </span>
                </div>
              )}
            </div>

            {/* GRÁFICO CO₂ con líneas de umbral */}
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData} syncId="siloSync" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCO2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }}
                    formatter={(value, name) => {
                      if (name === 'co2') return [`${value} ppm`, 'CO₂'];
                      if (name === 'iqa')  return [`${value}/100`, 'IQA'];
                      return [value, name];
                    }}
                    labelFormatter={tooltipLabel}
                  />
                  <Area
                    type="monotone"
                    dataKey="co2"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCO2)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#fff', stroke: '#8b5cf6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SiloHistory;

