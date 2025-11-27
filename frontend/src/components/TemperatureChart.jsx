import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function TemperatureChart({ history }) {
  if (!history || history.length === 0) {
    return <p className="chart-empty">No hay datos históricos disponibles</p>;
  }

  const chartData = history
    .slice()
    .reverse()
    .map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      promedio: item.temperature.average,
      min: item.temperature.min,
      max: item.temperature.max
    }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
        <XAxis 
          dataKey="time" 
          stroke="#757575"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#757575"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="promedio" 
          stroke="#FFC107" 
          strokeWidth={2}
          dot={false}
          name="Promedio" 
        />
        <Line 
          type="monotone" 
          dataKey="min" 
          stroke="#FFD54F" 
          strokeWidth={1.5}
          dot={false}
          name="Mín" 
        />
        <Line 
          type="monotone" 
          dataKey="max" 
          stroke="#FFB300" 
          strokeWidth={1.5}
          dot={false}
          name="Máx" 
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default TemperatureChart;

