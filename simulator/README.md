# Simulador de Datos IoT

Este módulo simula los sensores IoT del sistema de monitoreo de silos cuando el hardware físico no está disponible.

## Características

- ✅ Simula sensores DS18B20 (temperatura multipunto)
- ✅ Simula sensores SHT31/DHT22 (humedad)
- ✅ Simula sensores ultrasónicos/ToF (nivel de grano)
- ✅ Simula sensores MQ-135 (gases/CO2)
- ✅ Genera variaciones realistas con tendencias temporales
- ✅ Detecta condiciones de riesgo automáticamente

## Instalación

```bash
cd simulator
npm install
```

## Uso

### Simulador de un solo silo

Crea un archivo `.env` o configura las variables de entorno:

```env
API_URL=http://localhost:3000/api
SILO_ID=silo-001
INTERVAL_MS=5000
```

Ejecutar:

```bash
npm start
```

O en modo desarrollo con auto-reload:

```bash
npm run dev
```

### Simulador de múltiples silos

Para simular varios silos simultáneamente (recomendado para desarrollo):

```bash
npm run multi
```

O en modo desarrollo:

```bash
npm run multi:dev
```

Este modo simula automáticamente los silos: `silo-001`, `silo-002`, `silo-003`, `silo-004`, `silo-005`.

Para personalizar qué silos simular, edita el array `SILOS` en `multi-silo.js`.

## Variables de Entorno

- `API_URL`: URL del backend donde enviar los datos (default: `http://localhost:3000/api`)
- `SILO_ID`: Identificador del silo (default: `silo-001`)
- `INTERVAL_MS`: Intervalo de envío en milisegundos (default: `5000`)

## Datos Generados

El simulador genera datos cada X segundos (configurable) con la siguiente estructura:

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

- Los valores generados siguen patrones realistas con variaciones temporales
- El simulador detecta automáticamente condiciones de riesgo
- Los datos se envían al backend mediante HTTP POST

