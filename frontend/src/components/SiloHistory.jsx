import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { CalendarIcon, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader } from './ui/card';

function SiloHistory({ histories }) {
  const [viewMode, setViewMode] = useState('weight'); // 'weight' o 'volume'

  // Preparar datos para los gráficos
  const chartData = useMemo(() => {
    if (!histories || histories.length === 0) return [];

    return histories
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((item, index) => {
        const date = new Date(item.timestamp);
        const dateLabel = date.toLocaleDateString('es-AR', { 
          month: 'short', 
          day: '2-digit' 
        });
        
        return {
          date: dateLabel,
          fullDate: date.toLocaleDateString('es-AR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          weight: item.grainLevel?.tons || 0,
          volume: item.grainLevel?.percentage || 0,
          temp: item.temperature?.average || 0,
          humidity: item.humidity || 0,
          battery: 100 - (index * 0.1), // Simulación de batería
        };
      });
  }, [histories]);

  const formatDateShort = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const fromDate = histories.length > 0 ? formatDateShort(histories[0]?.timestamp) : 'N/A';
  const toDate = histories.length > 0 ? formatDateShort(histories[histories.length - 1]?.timestamp) : 'N/A';

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
      <CardHeader className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-6">
        {/* Selectores de Fecha */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium ml-1">From Date</span>
            <Button variant="outline" className="w-[140px] justify-start text-left font-normal text-slate-600">
              <CalendarIcon className="mr-2 h-4 w-4" /> {fromDate}
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium ml-1">To Date</span>
            <Button variant="outline" className="w-[140px] justify-start text-left font-normal text-slate-600">
              <CalendarIcon className="mr-2 h-4 w-4" /> {toDate}
            </Button>
          </div>
        </div>
        {/* Botón de descarga */}
        <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
          <Download className="h-5 w-5" />
        </Button>
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
                Weight (t)
              </TabsTrigger>
              <TabsTrigger 
                value="volume" 
                className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
              >
                Volume (%)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* GRÁFICO SUPERIOR (Peso/Volumen - Área Amarilla) */}
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData} 
              syncId="siloSync" 
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
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
              <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e2e8f0" />
              <XAxis dataKey="date" hide />
              <YAxis 
                label={{ 
                  value: viewMode === 'weight' ? 'Weight (t)' : 'Volume (%)', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { fill: '#94a3b8' } 
                }} 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  color: '#fff', 
                  borderRadius: '8px', 
                  border: 'none' 
                }}
                itemStyle={{ color: '#fff' }}
                cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                formatter={(value, name) => {
                  if (viewMode === 'weight') {
                    return [`${value.toFixed(2)} t`, 'Weight'];
                  } else {
                    return [`${value.toFixed(2)}%`, 'Volume'];
                  }
                }}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.date === label);
                  return item?.fullDate || label;
                }}
              />
              <Area 
                type="stepAfter"
                dataKey={viewMode === 'weight' ? 'weight' : 'volume'}
                stroke="#f59e0b" 
                fillOpacity={1} 
                fill={viewMode === 'weight' ? "url(#colorWeight)" : "url(#colorVolume)"}
                strokeWidth={2}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#fff", stroke: "#f59e0b" }} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda Personalizada intermedia */}
        <div className="flex justify-center gap-6 my-2 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full border border-orange-400 bg-orange-100"></span>
            Battery (%)
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-sky-400"></span>
            Temperature (°C)
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-400"></span>
            Humidity (%)
          </div>
        </div>

        {/* GRÁFICO INFERIOR (Ambiente - Líneas Azul/Verde) */}
        <div className="h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData} 
              syncId="siloSync" 
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis 
                hide 
                domain={[0, 100]} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  color: '#fff', 
                  borderRadius: '8px' 
                }}
                formatter={(value, name) => {
                  if (name === 'temp') {
                    return [`${value.toFixed(1)}°C`, 'Temperature'];
                  } else if (name === 'humidity') {
                    return [`${value.toFixed(1)}%`, 'Humidity'];
                  } else {
                    return [`${value.toFixed(1)}%`, 'Battery'];
                  }
                }}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.date === label);
                  return item?.fullDate || label;
                }}
              />
              {/* Línea Temperatura (Azul) */}
              <Line 
                type="monotone" 
                dataKey="temp" 
                stroke="#38bdf8" 
                strokeWidth={2} 
                dot={false} 
              />
              {/* Línea Humedad (Verde) */}
              <Line 
                type="monotone" 
                dataKey="humidity" 
                stroke="#a3e635" 
                strokeWidth={2} 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default SiloHistory;

