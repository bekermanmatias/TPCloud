# Frontend - Salgest

Aplicación web React para visualización de datos de monitoreo IoT de silos.

## Características

- ✅ Dashboard en tiempo real
- ✅ Visualización de múltiples silos
- ✅ Gráficos históricos (temperatura, humedad, nivel de grano)
- ✅ Sistema de alertas automático
- ✅ Actualización automática cada 5 segundos
- ✅ Diseño responsive

## Instalación

```bash
cd frontend
npm install
```

## Uso

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en http://localhost:5173

### Producción

```bash
npm run build
npm run preview
```

## Configuración

El frontend se conecta automáticamente al backend en `http://localhost:3000/api`.

Para cambiar la URL del backend, crea un archivo `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

## Componentes Principales

- **App.jsx**: Componente principal que gestiona el estado de la aplicación
- **Dashboard.jsx**: Panel principal con métricas y gráficos
- **SiloCard.jsx**: Tarjeta de resumen para cada silo
- **AlertsPanel.jsx**: Panel de alertas y notificaciones
- **TemperatureChart.jsx**: Gráfico de temperatura histórica
- **HumidityChart.jsx**: Gráfico de humedad histórica
- **GrainLevelChart.jsx**: Gráfico de nivel de grano histórico

## Tecnologías

- React 18
- Vite
- Recharts (gráficos)
- Axios (HTTP client)

## Notas

- Los datos se actualizan automáticamente cada 5 segundos
- Requiere que el backend esté corriendo
- Requiere que el simulador o hardware IoT esté enviando datos

