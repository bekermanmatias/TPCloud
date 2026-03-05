# Salgest — Checklist de Estado del Proyecto

> Última actualización: 05/03/2026 (rev. 2)

## Leyenda
- ✅ Completo y funcionando
- ⚠️ Parcialmente implementado
- ❌ Pendiente / no iniciado

---

## 🔐 Sistema Base

| Funcionalidad | Estado | Notas |
|---|---|---|
| Registro e inicio de sesión (JWT) | ✅ | 7 días de vigencia |
| Multi-usuario (cada uno ve sus propios silos) | ✅ | Ownership por `user_id` |
| Vinculación ESP32 ↔ Silo por `kit_code` | ✅ | Único por silo, validado |
| Recepción datos IoT (multipart + foto) | ✅ | `POST /api/datos-silo` |
| Cálculo de nivel desde `distancia_vacia` | ✅ | Backend calcula %, tons y nivelRealCm |
| Persistencia PostgreSQL | ✅ | Fallback en memoria si no hay BD |
| Estabilidad de sesión (sin logout al recargar) | ✅ | JWT validado en cliente + evento `auth:session-expired` |
| Edición de perfil de usuario | ✅ | Nombre y email editables desde `/configuracion` |
| Cambio de contraseña | ✅ | Requiere contraseña actual, validación mínimo 6 caracteres |

---

## 🏠 1. Dashboard (Inicio)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Tarjetas de estadísticas globales | ✅ | Total silos, en línea, alertas activas, toneladas totales |
| Tarjetas de resumen por silo | ✅ | `SiloSummaryCard`: stock, métricas, estado, alertas activas del silo |
| Estado (Normal / Atención / Crítico) en cada tarjeta | ✅ | Borde y badge con color, calculado desde sensores |
| Indicador en línea / sin señal en cada tarjeta | ✅ | Ícono Wifi, basado en lectura < 30 min |
| Panel de alertas globales (todos los silos) | ✅ | `GlobalAlertsPanel`: filtros por severidad/silo, acknowledge, polling 30 s |
| Contador de alertas críticas vs. atención | ✅ | Visible en el panel de alertas |
| Botón "Ver todos" → pestaña Silos | ✅ | Enlace a `/silos` |

---

## 🗂️ 2. Gestión de Silos (`/silos`)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Tabla completa de silos del usuario | ✅ | |
| Crear silo | ✅ | Modal con validación |
| Editar silo | ✅ | Modal reutilizable, actualiza lista |
| Eliminar silo (con confirmación) | ✅ | Cascade borra `sensor_data` |
| Búsqueda de texto libre | ✅ | Por nombre, ubicación y grano |
| Filtro por estado (Normal / Atención / Crítico) | ✅ | Chips de colores |
| Filtro por conexión (En línea / Sin señal) | ✅ | Basado en timestamp < 30 min |
| Filtro por nivel de stock (< 30% / 30–70% / > 70%) | ✅ | Chips con color |
| Filtro por tipo de grano | ✅ | Desplegable con todos los tipos |
| Botón "Limpiar filtros" con contador activos | ✅ | |
| Ordenamiento por columna (click en cabecera) | ✅ | Nombre, Producto, Peso, Stock %, Estado, Última lectura |
| Columna "Última lectura" con indicador online | ✅ | Punto verde/gris + fecha formateada |
| Contador "Mostrando X de Y silos" | ✅ | |
| Estado rápido por color (semáforo) en tabla | ✅ | Badge Normal / Atención / Crítico por fila |
| Ubicación geográfica (mapa) | ❌ | Solo texto libre por ahora |
| Comparación entre silos | ❌ | |

---

## 📏 3. Nivel del Silo

| Funcionalidad | Estado | Notas |
|---|---|---|
| % de llenado | ✅ | |
| Toneladas estimadas | ✅ | Volumen real × densidad ajustada por humedad |
| Altura medida (`distancia_vacia` en cm) | ✅ | Enviado por sensor ultrasónico |
| Gráfico histórico de nivel (Peso t / Volumen %) | ✅ | Toggle entre modos |
| Mapa de calor topográfico actual (vista cenital) | ✅ | Siempre visible, columnas izq/der simétricas en altura |
| Mapa de calor histórico (en tab "Historial visual") | ✅ | Sincronizado con slider temporal |
| Días de stock estimados | ✅ | Calculado desde consumo real en SilosTable y SiloSummaryCard |
| Consumo / ingreso estimado diario | ⚠️ | Calculado internamente; removido de la UI por ser poco estable |
| Estimación de días restantes estable | ❌ | Requiere consumo promedio de ≥ 7 días de datos |

---

## 🌡️ 4. Ambiente Interno

| Funcionalidad | Estado | Notas |
|---|---|---|
| Temperatura actual | ✅ | |
| Temperatura histórica (promedio, mín, máx) | ✅ | Calculado iterando todo el historial cargado |
| Humedad relativa | ✅ | Con ícono `Droplets` |
| Densidad ajustada por humedad real | ✅ | `getDensityAdjusted()` + indicador visual |
| Riesgo de humedad (> 70%) | ✅ | Alineado con umbrales de alertas |
| Riesgo de temperatura (> 28°C atención / > 35°C crítico) | ✅ | Calculado en backend |
| Gráfico histórico Temperatura + Humedad | ✅ | Gráfico inferior sincronizado |
| Selector de rango de fechas funcional | ✅ | `datetime-local` con filtrado reactivo y botón reset |
| Presión atmosférica | ✅ | Enviada por ESP32, almacenada en BD, mostrada en UI |
| Punto de rocío (calculado) | ✅ | Calculado con fórmula Magnus, mostrado junto a presión |
| Tendencia 24 h / semanal / mensual | ⚠️ | Configurable por parámetro `hours` en API |

---

## 🌫️ 5. Calidad del Aire

| Funcionalidad | Estado | Notas |
|---|---|---|
| Valor bruto MQ-135 (CO₂ en ppm) | ✅ | Guardado y mostrado |
| Riesgo de gas (> 100 ppm leve / > 150 ppm crítico) | ✅ | Booleano calculado en backend |
| Estado interpretado en tarjeta "Condición actual" | ✅ | Normal / Atención / Crítico según sensores combinados |
| Gráfico histórico dedicado de CO₂ | ✅ | AreaChart sincronizado con slider, líneas de umbral |
| Índice normalizado de calidad del aire (IQA) | ✅ | 0–100, badge color en tiempo real |
| Comparación con promedio de los últimos 7 días | ❌ | |

---

## 📷 6. Cámara / Inspección Visual

| Funcionalidad | Estado | Notas |
|---|---|---|
| Imagen en vivo (refresco cada 5 s) | ✅ | Endpoint `GET /api/camera/:siloId`, siempre visible en detalle |
| Foto guardada por cada medición | ✅ | Almacenada en `/uploads/silo-photos/` |
| Tab "Historial visual" con slider temporal | ✅ | Lazy-load, carga bajo demanda, slider de fecha |
| "Cargar historial completo" (hasta 10 000 registros) | ✅ | Solo al solicitarlo explícitamente |
| Cámara en vivo y mapa de calor siempre visibles | ✅ | Grid 2 columnas en panel principal, sin slider |
| Mejora de brillo/contraste en la imagen | ✅ | CSS `brightness(1.6) contrast(1.1)` |
| Captura manual desde el frontend | ❌ | |
| Intervalo de captura configurable | ❌ | Hardcodeado en ESP32 (15 s) |
| Comparación antes/después | ❌ | |

---

## 📊 7. Históricos y Análisis

| Funcionalidad | Estado | Notas |
|---|---|---|
| Gráfico de área (Peso/Volumen a lo largo del tiempo) | ✅ | Recharts AreaChart |
| Gráfico de líneas (Temp + Humedad sincronizado) | ✅ | Recharts LineChart |
| Gráfico dedicado de CO₂ / IQA | ✅ | AreaChart, sin líneas de umbral (removidas por redundancia) |
| Selector de rango de fechas interactivo | ✅ | `datetime-local` con filtrado reactivo y botón reset |
| Historial visual (fotos + mapas de calor) | ✅ | Tab lazy-loaded con slider |
| Registro y visualización de alertas pasadas | ✅ | Tab "Historial" en detalle del silo, filtros por tipo y severidad |
| Eventos detectados automáticamente | ✅ | Timeline con tipo, duración, estado y reconocimiento |
| Exportar datos a CSV | ✅ | Botón "Exportar CSV" respeta el rango de fechas seleccionado; incluye peso, volumen, temp, humedad, CO₂, IQA; separador `;` para Excel |
| Correlación temperatura vs gas | ❌ | |

---

## ⚙️ 8. Configuración del Silo

| Funcionalidad | Estado | Notas |
|---|---|---|
| Altura, diámetro, capacidad, tipo de grano | ✅ | Editable desde modal en detalle y en `/silos` |
| Vinculación de dispositivo IoT (`kit_code`) | ✅ | Visible al editar el silo |
| Densidad estimada por tipo de grano | ✅ | Tabla completa con corrección por humedad |
| Ángulo de reposo por tipo de grano | ✅ | Mapa de calor usa ángulo específico de cada grano |
| Umbrales de alerta configurables por silo | ⚠️ | API implementada, falta UI de configuración |
| Frecuencia de medición configurable | ❌ | Hardcodeada en ESP32 (15 s) |

---

## 👤 9. Cuenta de Usuario (`/configuracion`)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Ver perfil (nombre y email) | ✅ | Avatar con inicial, modo lectura por defecto |
| Editar nombre | ✅ | PUT `/api/auth/profile`, formulario colapsable (botón Editar) |
| Editar email (validación de unicidad) | ✅ | |
| Cambiar contraseña | ✅ | Formulario colapsable, requiere contraseña actual, barra de fuerza |
| Mostrar/ocultar contraseña (ojo) | ✅ | |
| Cerrar sesión con confirmación | ✅ | Barra al fondo de la página, confirmación inline |
| Foto de perfil / avatar personalizado | ❌ | Muestra inicial del nombre |
| Historial de actividad del usuario | ❌ | |

---

## 🚨 10. Sistema de Alertas

| Funcionalidad | Estado | Notas |
|---|---|---|
| Tablas `alerts` y `alert_configs` en BD | ✅ | |
| Evaluación automática al recibir dato IoT | ✅ | `evaluateAlerts()` post-guardado |
| Alerta: Stock crítico (≤ 10%) | ✅ | |
| Alerta: Capacidad máxima (≥ 95%) | ✅ | |
| Alerta: Descenso brusco de nivel | ✅ | Solo si lectura anterior es reciente (< 2 h) |
| Alerta: Temperatura elevada (> 28°C) | ✅ | |
| Alerta: Humedad crítica (> 70%) | ✅ | |
| Alerta: Riesgo de condensación (< 2°C del punto de rocío) | ✅ | |
| Alerta: Gases leve (> 100 ppm) | ✅ | |
| Alerta: Gases crítico (> 150 ppm) | ✅ | |
| Alerta: Fermentación activa (Temp + Hum + Gas) | ✅ | |
| Alerta: Foco de calor (subida rápida de temperatura) | ✅ | Auto-resuelve si no se repite |
| Alerta: Ambiente ideal para insectos | ✅ | |
| Alerta: Pérdida de conexión del dispositivo | ✅ | Cron cada 5 min |
| Alerta: Sensor ultrasónico fuera de rango | ✅ | Detecta distancia imposible (> 110% altura) |
| Reconocer alertas (acknowledge) | ✅ | Botón en detalle del silo y en panel global del dashboard |
| Panel global de alertas en dashboard | ✅ | Todas las alertas de todos los silos, filtros por severidad y silo |
| Panel de alertas en detalle del silo | ✅ | Polling 30 s, severidad por color, sin texto redundante de conteo |
| Historial de alertas por silo | ✅ | Tab "Historial" con filtros por tipo, severidad y período |
| Configuración de umbrales desde UI | ❌ | API lista, falta formulario |
| Notificaciones push / email | ❌ | |

---

## 📡 11. Estado del Dispositivo

| Funcionalidad | Estado | Notas |
|---|---|---|
| Indicador En línea / Sin señal | ✅ | Verde/gris según si llegó dato en los últimos 30 min |
| Lecturas por día (real) | ✅ | Contador de lecturas de las últimas 24 h |
| Última conexión del ESP32 | ✅ | Se infiere del timestamp del último dato |
| Señal WiFi (RSSI) | ❌ | El ESP32 no la envía aún |
| Tiempo encendido (uptime) | ❌ | |
| Versión de firmware | ❌ | |

---

## 🧭 12. Navegación y Páginas

| Funcionalidad | Estado | Notas |
|---|---|---|
| Routing client-side con `react-router-dom` | ✅ | URLs únicas por silo (`/silo/:id`) |
| Panel de Control (`/`) | ✅ | Rediseñado con tarjetas y alertas globales |
| Silos (`/silos`) | ✅ | Tabla avanzada con filtros y ordenamiento |
| Detalle de silo (`/silo/:id`) | ✅ | Acceso directo por URL |
| Configuración (`/configuracion`) | ✅ | Layout: avatar full-width, datos+contraseña en 2 columnas simétricas, sesión al fondo |
| Mapa (`/mapa`) | ⚠️ | Página "Próximamente" |
| Reportes (`/reportes`) | ⚠️ | Página "Próximamente" |

---

## 📈 Resumen

| Estado | Cantidad |
|---|---|
| ✅ Completo | 71 |
| ⚠️ Parcial | 7 |
| ❌ Pendiente | 18 |
| **Total** | **96** |

---

## 🚀 Próximas prioridades sugeridas

1. ❌ **Configurar umbrales desde UI** — formulario para editar los valores de `alert_configs` por silo
2. ❌ **Exportar CSV** — conectar el botón de descarga en `SiloHistory`
3. ❌ **Mapa con ubicaciones reales** — integrar `react-leaflet` con lat/lon por silo
4. ❌ **Reportes** — exportar PDF/Excel con histórico de sensores y alertas por período
5. ❌ **RSSI del ESP32** — agregar campo en el payload IoT para mostrar calidad de señal WiFi
6. ❌ **Notificaciones** — alertas críticas por email o push
7. ❌ **Captura manual de foto** — botón en frontend que dispara una captura al ESP32
