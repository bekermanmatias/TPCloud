**Autor:** Rau Bekerman Matias - 31787  
**Materia:** Desarrollo de Software Cloud  
**Institución:** UTN FRLP

## 🌾 Salgest – Plataforma de monitoreo de silos  
**Versión:** 1.0  
**Estado:** En producción (Fase 1)

---

### 1. Visión general del sistema

Salgest es una plataforma integral **AgTech** basada en **IoT**, diseñada para:

- Monitorear en tiempo real silos de almacenamiento de granos.  
- Analizar históricos de temperatura, humedad, nivel y gases.  
- Prevenir riesgos de fermentación, condensación, robo y fallas estructurales.  

El sistema reemplaza inspecciones manuales peligrosas combinando:

- **Telemetría de precisión** (sensores físicos en ESP32).  
- **Inspección visual** con cámara.  
- **Motor de reglas** en la nube para generar alertas inteligentes.  

> Hoy los sensores se simulan / provienen de un **ESP32** que ya envía los datos a la nube. Toda la arquitectura de backend, base de datos, almacenamiento de fotos y UI está lista para producción sobre AWS (**EC2, RDS, S3**).

---

### 2. Arquitectura y seguridad

#### 2.1 Componentes principales

- **Frontend**: React + Vite (`/frontend`)  
  - SPA con React Router.  
  - UI basada en tarjetas, paneles y gráficos (`recharts`, `react-plotly`, componentes propios).  

- **Backend**: Node.js + Express (`/backend`)  
  - API REST para auth, silos, datos de sensores, alertas y galería.  
  - Motor de alertas en el servidor.  
  - Servidor estático del frontend compilado (`../frontend/dist`).  

- **Base de datos**: PostgreSQL en **Amazon RDS**  
  - Tablas principales: `users`, `silos`, `sensor_data`, `alerts`, `alert_configs`, `gallery_captures`.  

- **Almacenamiento de imágenes**: **Amazon S3**  
  - Carpeta `silo-photos/` dentro de un bucket dedicado.  
  - URLs públicas guardadas en `sensor_data.image_path` y `gallery_captures.image_path`.  

- **Compute**: **Amazon EC2**  
  - Instancia que corre el backend Express y sirve el frontend compilado.  

#### 2.2 Autenticación y multi-tenant

- **JWT** (JSON Web Token) con vigencia configurable (por defecto 7 días).  
- Frontend escucha el evento `auth:session-expired` para cerrar sesión de forma elegante.  
- Cada fila en `silos`, `sensor_data`, `alerts` y `gallery_captures` está asociada a un `user_id`.  
  Todas las consultas filtran por usuario autenticado ⇒ **datos aislados por cliente**.

#### 2.3 Protocolo IoT

Cada dispositivo físico (kit ESP32) tiene un `kit_code` único, configurado por silo.

El ESP32 envía telemetría y foto en una sola llamada:

```text
POST /api/datos-silo  (alias de /api/sensor-data/iot)
Content-Type: multipart/form-data
Campos:
  - kit_code
  - temperatura
  - humedad
  - gas
  - presion (opcional)
  - distancia_vacia
  - fotoSilo (JPEG)
```

El backend:

1. Resuelve el `silo_id` a partir del `kit_code`.  
2. Calcula métricas (nivel, toneladas, riesgos).  
3. Guarda los datos en `sensor_data`.  
4. Sube la imagen a **S3** (multer-s3) y guarda la URL pública.  
5. Ejecuta `evaluateAlerts()` para disparar alertas.

---

### 3. Estructura del repositorio

```text
Salgest/
  backend/
    server.js
    routes/
    services/
    database/
    scripts/
    .env
  frontend/
    src/
    public/
    vite.config.js
    .env
  docs/
    CHECKLIST.md
```

---

### 4. Configuración de entorno

#### 4.1 Backend (`backend/.env`)

Ejemplo mínimo:

```env
PORT=3000

# PostgreSQL (RDS)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
DATABASE_SSL=true

# JWT
JWT_SECRET=cambia-esto-en-produccion
JWT_EXPIRES_IN=7d

# S3
AWS_REGION=us-east-2
AWS_BUCKET_NAME=salgest-bucket
AWS_ACCESS_KEY_ID=XXXX
AWS_SECRET_ACCESS_KEY=YYYY
```

El backend también soporta `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` como alternativa a `DATABASE_URL`.

#### 4.2 Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000/api
VITE_API_ORIGIN=http://localhost:3000
VITE_API_PROXY_TARGET=http://localhost:3000
```

En producción podés apuntar a tu backend en EC2, por ejemplo:

```env
VITE_API_URL=https://api.salgest.tu-dominio.com/api
VITE_API_ORIGIN=https://api.salgest.tu-dominio.com
VITE_API_PROXY_TARGET=https://api.salgest.tu-dominio.com
```

---

### 5. Ejecución local

#### 5.1 Backend

```bash
cd backend
npm install
npm run dev      # desarrollo (node --watch server.js)
# o
npm start        # producción simple
```

El backend:

- Expone la API en `http://localhost:3000`.  
- Sirve los estáticos de React desde `../frontend/dist` si existe.  
- Tiene las rutas de API bajo `/api/...` y el comodín para React Router:

```js
// server.js
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
```

#### 5.2 Frontend

```bash
cd frontend
npm install
npm run dev      # desarrollo con Vite
npm run build    # build de producción → dist/
```

Para servir el frontend desde el backend en producción:  
1. `npm run build` en `frontend`.  
2. Copiar (o dejar) `frontend/dist` accesible desde `backend`.  
3. Asegurarse de que el servidor Express tenga las líneas anteriores de estáticos y comodín.

---

### 6. Telemetría y cálculos

#### 6.1 Nivel y stock físico

- **Entrada**: `distancia_vacia` enviada por el ESP32 (`cm` desde el sensor hasta el grano).  
- **Altura total**: configurada por silo (`height` en metros).  
- **Nivel real**:

\[
\text{nivelRealCm} = \max(0, \text{alturaTotalCm} - \text{distancia\_vacia})
\]

- **Porcentaje de llenado**:

\[
\%\text{stock} = \min\left(100, \frac{\text{nivelRealCm}}{\text{alturaTotalCm}} \times 100\right)
\]

- **Toneladas**:

\[
\text{tons} = V_{\text{cilindro}} \times \rho_{\text{ajustada}}
\]

con:

- \(V_{\text{cilindro}} = \pi \times r^2 \times h_{\text{grano}}\)  
- \(\rho_{\text{ajustada}} =\) resultado de `getDensityAdjusted(grainType, humedad)`  
  (corrige la densidad base según la humedad real).

#### 6.2 Mapa de calor topográfico

Se muestra un mapa de calor cenital del silo (`MapaCalorSilo`) que simula:

- Superficie del grano según el **Ángulo de Reposo** del tipo de grano.  
- Cambios de nivel se traducen en variaciones topográficas.

#### 6.3 Clima interno

- Promedios, máximos y mínimos de **temperatura** y **humedad**.  
- **Punto de rocío (dew point)** calculado con fórmula de Magnus–Tetens.  
  Se usa para detectar riesgo de **condensación** (si la temperatura está a < 2°C del dew point).

#### 6.4 Calidad del aire

- Sensor MQ-135 → **CO₂ en ppm**.  
- Se mapea a un **Índice de Calidad del Aire (IQA)** 0–100 para visualización amigable.

---

### 7. Módulo de cámara y galería

#### 7.1 Cámara en vivo

- El ESP32-CAM envía imágenes a `/api/camera/:siloId` (JPEG en bruto).  
- El frontend refresca cada 5 segundos y aplica filtros:

  - `brightness(1.6)`  
  - `contrast(1.1)`

para aclarar imágenes oscuras dentro del silo.

- Si el último registro de sensores tiene `imagePath` (URL S3), la “Cámara” usa **esa URL** como fuente principal; si no, cae al endpoint `/api/camera`.

#### 7.2 Historial visual

- Pestaña dedicada (`Historial visual`) con:

  - Slider temporal.  
  - Foto histórica sincronizada con ese timestamp.  
  - Mapa de calor correspondiente a ese momento.

- Carga **lazy**: sólo cuando se abre la pestaña, y se puede cargar el historial completo bajo demanda.

#### 7.3 Galería global

- Nuevo menú `Galería` en el sidebar.  
- Cada captura guardada almacena:

  - Silo y nombre (`silo_id`, `silo_name`).  
  - Fecha de captura (`captured_at`).  
  - Métricas (temperatura, humedad, CO₂, nivel %, toneladas, presión).  
  - Origen (`live` o `historical`).  
  - URL de imagen (S3 o ruta local).  
  - **Nota opcional** escrita por el usuario.

- Desde el **detalle del silo**:

  - Botones con icono de carpeta permiten guardar:
    - La vista actual de la cámara.  
    - Una foto del historial visual.
  - Al hacer clic, se abre un **modal estilizado** donde el usuario puede escribir una nota.  
  - Al confirmar, se llama a `POST /api/gallery` y se muestra un toast de éxito/error.

---

### 8. Motor de alertas

El servicio de alertas evalúa cada nuevo registro (`sensor_data`) y genera alertas en la tabla `alerts`.  
Algunos ejemplos:

#### 8.1 Críticas (🔴)

- **Fermentación activa**: temperatura alta + humedad alta + pico de gases.  
- **Capacidad máxima ≥ 95%**.  
- **Descenso brusco de nivel**: caída de toneladas más rápida que el ritmo máximo de extracción.  
- **Foco de calor**: pendiente de temperatura muy pronunciada.  
- **Gases críticos > 150 ppm**.  
- **Humedad crítica > 70%**.

#### 8.2 Atención (🟠)

- **Riesgo de condensación**: temperatura a menos de 2°C del punto de rocío.  
- **Ambiente ideal para insectos**: patrón de temperatura/humedad que favorece plagas.  
- **Temperatura elevada > 28°C**.  
- **Gases leves > 100 ppm**.  
- **Stock crítico ≤ 10%**.

#### 8.3 Sistema (⚙️)

- **Pérdida de conexión**: más de 30 minutos sin datos.  
- **Sensor ultrasónico fuera de rango**: lectura mayor al 110% de la altura total del silo.

Las alertas se muestran:

- En el **panel global de alertas** (Dashboard).  
- En el panel de alertas del **detalle de cada silo**.  
- Pueden marcarse como “reconocidas” (acknowledge) desde el frontend.

---

### 9. Endpoints principales (resumen)

Auth:

- `POST /api/auth/register` – registro usuario.  
- `POST /api/auth/login` – login (JWT).  
- `GET  /api/auth/profile` – perfil del usuario.  
- `PUT  /api/auth/profile` – actualizar nombre/email/contraseña.

Silos:

- `GET    /api/silos` – lista de silos del usuario.  
- `POST   /api/silos` – crear silo.  
- `GET    /api/silos/:id` – detalle de silo.  
- `PUT    /api/silos/:id` – actualizar silo (incluye `kit_code`).  
- `DELETE /api/silos/:id` – eliminar silo.  
- `PUT    /api/silos/:id/vincular` – vincular/desvincular `kit_code` a un silo.

Datos de sensores:

- `POST /api/sensor-data` – datos de sensores “puros” (JSON).  
- `POST /api/sensor-data/iot` – datos desde ESP32 con foto (`/api/datos-silo`).  
- `GET  /api/silos/:id/history` – historial.  

Imágenes de cámara:

- `POST /api/camera/:siloId` – última foto de cámara (JPEG).  
- `GET  /api/camera/:siloId` – obtener última foto.

Alertas:

- `GET    /api/alerts` – alertas activas globales.  
- `GET    /api/alerts/:siloId` – alertas activas por silo.  
- `GET    /api/alerts/:siloId/history` – historial de alertas por silo.  
- `PATCH  /api/alerts/:id/acknowledge` – reconocer alerta.  
- `GET    /api/alerts/:siloId/config` – umbrales configurados.  
- `PUT    /api/alerts/:siloId/config/:key` – actualizar un umbral.

Galería:

- `GET    /api/gallery` – capturas guardadas del usuario.  
- `POST   /api/gallery` – guardar captura (live/histórica + nota).  
- `DELETE /api/gallery/:id` – eliminar captura.

---

### 10. Roadmap (Fase 2 y 3)

#### 10.1 Módulo geoespacial (/mapa)

- Agrupar silos por establecimiento/campo.  
- Mostrar pines en mapa satelital (React Leaflet) usando el peor estado de los silos cercanos.  
- Dibujar polígonos que delimiten las áreas de cada cliente.

#### 10.2 Reportes ejecutivos (/reportes)

- Reportes PDF/Excel para gerencia (stock, alertas, tiempos de respuesta).  
- Análisis de correlación entre temperatura, humedad y gases a lo largo de meses.  
- Métricas de tiempo promedio de reconocimiento de alertas críticas.

#### 10.3 IA y predicción

- **Predicción de consumo** y “día cero” de stock con modelos de regresión / series temporales.  
- **Prevención de putrefacción**: modelos ARIMA / LSTM para predecir fermentación días antes.  

---

### 11. Notas finales

- Actualmente se pueden simular o usar sensores reales en ESP32.  
- Toda la infraestructura está pensada para convivir en AWS (**EC2 + RDS + S3**), con el frontend servido desde el propio backend Express.  
- Los archivos `.env` (backend y frontend) y los directorios `dist` y `uploads` están ignorados en git para evitar exponer secretos y builds.
---

### 12. Despliegue en AWS (guía resumida)

#### 12.1 Base de datos en Amazon RDS (PostgreSQL)

1. Crear instancia RDS PostgreSQL.  
2. Definir:
   - `DB_NAME` (ej. `salgest` o `postgres`).  
   - Usuario maestro y contraseña (usar luego en `DATABASE_URL`).  
3. Configurar:
   - VPC donde vivirá también la instancia EC2.  
   - Security Group que permita tráfico entrante por puerto **5432** solo desde:
     - Tu IP (para dev), o  
     - El security group de la instancia EC2 (para prod).  
4. En el backend, ajustar `DATABASE_URL` y `DATABASE_SSL=true`.

#### 12.2 Bucket en Amazon S3

1. Crear un bucket (ej. `salgest-photos`) en la región indicada en `AWS_REGION`.  
2. En `backend/.env`, configurar:

   ```env
   AWS_REGION=us-east-2
   AWS_BUCKET_NAME=salgest-photos
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```

3. El bucket puede ser “Bloquear ACLs = true”; el código ya no las usa.  
4. Otorgar a la IAM user/role permisos mínimos:
   - `s3:PutObject` y `s3:GetObject` sobre `arn:aws:s3:::salgest-photos/silo-photos/*`.

#### 12.3 Backend en EC2

1. Crear una instancia EC2 (ej. Amazon Linux 2) en la misma VPC/subred que RDS.  
2. Instalar Node.js (>= 20), git y PostgreSQL client (opcional).  
3. Clonar el repo y configurar `.env` en `backend/`.  
4. Construir el frontend:

   ```bash
   cd frontend
   npm install
   npm run build
   ```

5. Volver a `backend/`, instalar dependencias y lanzar la app con un process manager:

   ```bash
   cd backend
   npm install
   npx pm2 start server.js --name salgest-backend
   npx pm2 save
   ```

6. Abrir el puerto **3000** en el security group de la EC2 (o usar Nginx para exponer en 80/443).

#### 12.4 (Opcional) Nginx como reverse proxy

Configurar un virtual host que apunte a `http://localhost:3000` y sirva HTTPS con un certificado TLS (ej. Let’s Encrypt).  
De esta forma, el frontend y la API quedarán disponibles bajo un mismo dominio (ej. `https://app.salgest.com`).

---

### 13. ESP32 / Simulación de envío de datos

Si bien el sistema está pensado para trabajar con un **ESP32** real, durante el desarrollo se pueden probar llamadas desde herramientas como `curl` o Postman.

#### 13.1 Ejemplo de payload JSON simple

```bash
curl -X POST http://localhost:3000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "siloId": "silo-demo-aws-1",
    "timestamp": "2026-03-05T18:00:00.000Z",
    "temperature": { "average": 27.5, "min": 26.8, "max": 28.2, "hasRisk": false },
    "humidity": 62.5,
    "humidityRisk": false,
    "presion": 1011.3,
    "grainLevel": { "percentage": 68.3, "tons": 78.2, "distance": 115.0 },
    "gases": { "co2": 95, "hasRisk": false }
  }'
```

#### 13.2 Ejemplo de multipart/form-data (como el ESP32)

```bash
curl -X POST http://localhost:3000/api/datos-silo \
  -H "Content-Type: multipart/form-data" \
  -F "kit_code=SILO-DEMO-AWS" \
  -F "temperatura=27.4" \
  -F "humedad=63.1" \
  -F "gas=110" \
  -F "presion=1010.8" \
  -F "distancia_vacia=120.5" \
  -F "fotoSilo=@./ejemplos/foto-silo.jpg;type=image/jpeg"
```

En un escenario real, el firmware del ESP32 se encarga de construir este request periódicamente (cada N segundos/minutos).

