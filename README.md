# Sistema IoT para Monitoreo de Silos y Gestión de Stock en la Nube

**Autor:** Rau Bekerman Matias - 31787  
**Materia:** Desarrollo de Software Cloud  
**Institución:** UTN FRLP

## 📋 Descripción del Proyecto

Este proyecto consiste en el desarrollo de un sistema de monitoreo IoT para silos de granos que permite la visualización remota de datos críticos (temperatura, humedad, nivel de grano) a través de una aplicación web en la nube.

## 1. Introducción

### Problema
En la gestión de granos, la falta de monitoreo en tiempo real en silos rurales genera pérdidas económicas por deterioro, fermentación o plagas.

### Solución
Un sistema de monitoreo IoT que utiliza sensores en los silos para enviar datos críticos (temperatura, humedad, nivel de grano) a una plataforma en la nube, permitiendo al usuario visualizarlos de forma remota a través de una aplicación web.

## 2. Objetivo y Beneficios

### Objetivo
Visualizar información confiable y en tiempo real sobre el estado de un silo para la toma de decisiones, previniendo pérdidas y optimizar la gestión de stock.

### Beneficios

- **Monitoreo remoto:** Acceso a datos desde cualquier lugar, sin necesidad de estar presencial.
- **Prevención de pérdidas:** Alertas ante condiciones de riesgo (alta temperatura, humedad, etc).
- **Mejor gestión:** Datos sobre toneladas y nivel de grano.
- **Escalabilidad:** Base tecnológica para futuras integraciones, como la automatización industrial.

## 3. Alcance

### Incluye
- Prototipo funcional con sensores y ESP32.
- Simulación de silos con un modelo en laboratorio.
- Comunicación de datos vía WiFi y LoRa, con potencial evaluación de comunicación satelital para zonas sin conectividad.
- Visualización en la nube mediante aplicación web.
- Base de datos y backend para almacenamiento de datos históricos.
- Métricas y reportes: cálculo de métricas clave y generación de reportes.

### No incluye
- Automatización de motores del silo.
- Control directo de procesos físicos de ventilación o carga.
- Instalación en silos a escala real.

## 4. Componentes del Sistema

### Arquitectura

```
SENSORES → ESP32 → COMUNICACIÓN → AWS CLOUD → APP WEB
```

### Hardware (Unidad IoT)

**Sensores:**
- **Temperatura:** DS18B20 (multipunto)
- **Humedad:** SHT31 o DHT22
- **Nivel de grano:** Ultrasonido o ToF
- **Gases:** MQ-135 o CO2

**Procesador:** ESP32

**Comunicación:** WiFi y LoRa. Se evaluará la viabilidad de comunicación satelital (más costoso).

### Software (Cloud)

**Plataforma:** AWS Free Tier

**Servicios AWS:**
- AWS IoT Core

**Stack Tecnológico:**
- **Backend:** Node.js
- **Frontend:** React
- **Base de datos:** PostgreSQL

## 5. Información y Cálculos Disponibles para el Usuario

| Variable medida | Método de cálculo / interpretación | Información entregada al usuario |
|----------------|-----------------------------------|----------------------------------|
| **Temperatura multipunto** | Se registra la temperatura en varios puntos del silo. El sistema calcula el promedio, los valores mínimos y máximos. Un mapa de calor visualiza la distribución para identificar zonas de riesgo. | Estado térmico del grano. Alertas ante picos o variaciones que sugieren fermentación. |
| **Humedad interna** | Se mide la humedad relativa del aire dentro del silo. Se aplican umbrales críticos para generar alertas automáticas si se superan los valores seguros para el almacenamiento. | Humedad relativa actual. Alerta temprana de riesgo de moho y deterioro del grano. |
| **Nivel de grano** | El sensor mide la distancia desde el techo del silo hasta la superficie del grano. El sistema utiliza esta distancia, junto con las dimensiones del silo y la densidad del grano, para calcular el volumen y el peso (toneladas). | Porcentaje de llenado del silo. Toneladas exactas de grano almacenadas. |
| **Calidad del Aire / Gases** | Se mide la concentración de gases específicos (ej. CO₂). Un aumento en la concentración de estos gases es un indicador de actividad biológica (fermentación o plagas). | Nivel de concentración de gases. Alerta de fermentación o infestación incipiente. |
| **Datos Históricos** | El sistema almacena y analiza todos los datos medidos a lo largo del tiempo. Se utilizan algoritmos para identificar tendencias, ciclos y patrones de comportamiento. | Gráficos y reportes de tendencias. Comparativa del estado actual con registros pasados. Proyecciones básicas de consumo. |

## 6. Conclusión y Fases Futuras

Se espera combinar IoT y cloud para crear un prototipo funcional que resuelve una necesidad crítica en la agroindustria. Esta fase sienta las bases tecnológicas para un sistema industrial más robusto, permitiendo en el futuro la integración de la automatización de procesos físicos.

## 🚀 Estado del Proyecto

En desarrollo - 2025

## 🏗️ Estructura del Proyecto

```
Salgest/
├── backend/          # API REST en Node.js
├── frontend/         # Aplicación web en React
├── simulator/        # Simulador de datos IoT (para desarrollo sin hardware)
└── README.md
```

## 🎮 Inicio Rápido

### Requisitos
- Node.js (v18 o superior)
- npm

### Instalación

```bash
# Instalar todas las dependencias
npm run install:all
```

### Ejecución

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

**Terminal 3 - Simulador (datos IoT):**
```bash
npm run dev:simulator
```

### Acceso
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

> 📖 Para más detalles, consulta [INSTRUCCIONES.md](./INSTRUCCIONES.md)

## 🔧 Simulador de Datos IoT

Como el hardware físico no está disponible inicialmente, el proyecto incluye un **simulador de datos IoT** que genera valores realistas de todos los sensores:

- ✅ Temperatura multipunto (4 sensores DS18B20)
- ✅ Humedad relativa (SHT31/DHT22)
- ✅ Nivel de grano (ultrasonido/ToF)
- ✅ Calidad del aire / CO₂ (MQ-135)

El simulador envía datos al backend cada 5 segundos (configurable) y permite desarrollar y probar todo el sistema sin necesidad del hardware físico.

## 📷 Cámara ESP32-CAM

El sistema permite conectar una cámara en el ESP32 (ESP32-CAM) para ver la imagen en tiempo (casi) real en la vista de detalle de cada silo:

- **Backend:** `POST /api/camera/:siloId` recibe la foto JPEG; `GET /api/camera/:siloId` devuelve la última imagen.
- **Frontend:** en el detalle del silo se muestra la última imagen y se actualiza cada 5 segundos. Si no hay cámara conectada, se muestra un placeholder con instrucciones.

Para configurar el firmware del ESP32 y enviar fotos al backend, ver [docs/ESP32_CAMARA.md](./docs/ESP32_CAMARA.md).

## 📝 Licencia

Este proyecto es parte del trabajo académico para la materia Desarrollo de Software Cloud de la UTN FRLP.
