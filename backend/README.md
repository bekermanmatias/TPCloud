# Backend API - Salgest

Backend Node.js para el sistema de monitoreo IoT de silos.

## Características

- ✅ API REST para recibir datos de sensores
- ✅ Almacenamiento de datos históricos
- ✅ Endpoints para consultar información de silos
- ✅ Soporte para PostgreSQL (opcional, puede funcionar sin BD)
- ✅ Validación de datos

## Instalación

```bash
cd backend
npm install
```

## Configuración

Copia el archivo `.env.example` a `.env` y configura las variables:

```bash
cp .env.example .env
```

Variables disponibles:
- `PORT`: Puerto del servidor (default: 3000)
- `DATABASE_URL`: URL de conexión a PostgreSQL (opcional)
- `DATABASE_SSL`: Habilitar SSL para PostgreSQL (default: false)

## Uso

### Modo desarrollo

```bash
npm run dev
```

### Modo producción

```bash
npm start
```

## Endpoints

### Health Check
- `GET /health` - Estado del servidor

### Datos de Sensores
- `POST /api/sensor-data` - Recibir datos de sensores IoT
- `GET /api/sensor-data/latest/:siloId` - Último dato de un silo

### Silos
- `GET /api/silos` - Listar todos los silos
- `GET /api/silos/:id` - Información de un silo específico
- `GET /api/silos/:id/history` - Historial de datos de un silo
  - Query params: `limit` (default: 100), `hours` (default: 24)

## Formato de Datos

### POST /api/sensor-data

```json
{
  "siloId": "silo-001",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "temperature": {
    "sensors": [22.5, 23.1, 24.2, 22.8],
    "average": 23.15,
    "min": 22.5,
    "max": 24.2,
    "hasRisk": false
  },
  "humidity": 58.5,
  "humidityRisk": false,
  "grainLevel": {
    "percentage": 72.5,
    "tons": 72.5,
    "distance": 2.75,
    "capacity": 100
  },
  "gases": {
    "co2": 485,
    "hasRisk": false
  }
}
```

## Notas

- Si no se configura PostgreSQL, el sistema funciona con almacenamiento en memoria
- Los datos en memoria se pierden al reiniciar el servidor
- Para producción, se recomienda configurar PostgreSQL

