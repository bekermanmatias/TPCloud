# Salgest — Checklist de Estado del Proyecto

> Última actualización: 05/03/2026

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

---

## 🏠 1. Dashboard (Inicio)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Lista de todos los silos del usuario | ✅ | Tabla con búsqueda por nombre/ubicación/grano |
| Nivel actual (%) + barra visual | ✅ | |
| Toneladas estimadas | ✅ | |
| Temperatura / Humedad / CO₂ en resumen | ✅ | |
| Estado general (Normal / Atención / Crítico) | ⚠️ | Muestra "Normal" hardcodeado |
| Alertas activas (fermentación, humedad alta, gas) | ❌ | |
| Última captura de cámara en el dashboard | ❌ | Solo visible en el detalle del silo |

---

## 📏 2. Nivel del Silo

| Funcionalidad | Estado | Notas |
|---|---|---|
| % de llenado | ✅ | |
| Toneladas estimadas | ✅ | Calculado desde capacidad × % |
| Altura medida (distancia_vacia en cm) | ✅ | Enviado por sensor ultrasónico |
| Gráfico histórico de nivel (Peso t / Volumen %) | ✅ | Toggle entre modos |
| Mapa de calor topográfico (vista cenital) | ✅ | Física de ángulo de reposo, Plotly heatmap |
| Consumo promedio diario | ❌ | Fue removido temporalmente |
| Estimación de días restantes | ❌ | Fue removido temporalmente |

---

## 🌡️ 3. Ambiente Interno

| Funcionalidad | Estado | Notas |
|---|---|---|
| Temperatura interna (promedio, mín, máx) | ✅ | |
| Humedad relativa | ✅ | |
| Riesgo de humedad (>75%) | ✅ | Calculado en backend |
| Riesgo de temperatura (>35°C) | ✅ | Calculado en backend |
| Gráfico histórico Temperatura + Humedad | ✅ | Gráfico inferior sincronizado |
| Selector de rango de fechas funcional | ✅ | datetime-local con fecha + hora, filtrado reactivo y botón de reset |
| Tendencia 24h / semanal / mensual | ⚠️ | Configurable por parámetro `hours` en API |
| Presión atmosférica | ❌ | El ESP32 actual no la envía |
| Punto de rocío (calculado) | ❌ | Fórmula: `Td = T - ((100 - RH) / 5)` |

---

## 🌫️ 4. Calidad del Aire

| Funcionalidad | Estado | Notas |
|---|---|---|
| Valor bruto MQ-135 (CO₂ en ppm) | ✅ | Guardado y mostrado |
| Riesgo de gas (>120 ppm) | ✅ | Booleano calculado en backend |
| Estado interpretado (Normal / Atención / Riesgo) | ⚠️ | Solo booleano, sin niveles intermedios |
| Gráfico histórico dedicado de CO₂ | ❌ | |
| Índice normalizado de calidad del aire | ❌ | |
| Comparación con promedio de los últimos 7 días | ❌ | |

---

## 📷 5. Cámara / Inspección Visual

| Funcionalidad | Estado | Notas |
|---|---|---|
| Imagen en vivo (refresco cada 5 s) | ✅ | Endpoint `GET /api/camera/:siloId` |
| Foto guardada por cada medición | ✅ | Almacenada en `/uploads/silo-photos/` |
| Historial de imágenes por slider temporal | ✅ | Muestra la foto del momento exacto seleccionado |
| Badge "Foto histórica" en imágenes pasadas | ✅ | |
| Mejora de brillo/contraste en la imagen | ✅ | CSS `brightness(1.6) contrast(1.1)` |
| Captura manual desde el frontend | ❌ | |
| Intervalo de captura configurable | ❌ | Hardcodeado en ESP32 (15 s) |
| Comparación antes/después | ❌ | |

---

## 📊 6. Históricos y Análisis

| Funcionalidad | Estado | Notas |
|---|---|---|
| Gráfico de área (Peso/Volumen a lo largo del tiempo) | ✅ | Recharts AreaChart |
| Gráfico de líneas (Temp + Humedad sincronizado) | ✅ | Recharts LineChart |
| Navegación por slider temporal | ✅ | Muestra dato + foto del momento |
| Selector de rango de fechas interactivo | ⚠️ | Muestra fechas pero sin filtro real |
| Exportar datos a CSV | ❌ | Botón presente, sin funcionalidad |
| Correlación temperatura vs gas | ❌ | |
| Registro de alertas pasadas | ❌ | |
| Eventos detectados automáticamente | ❌ | |

---

## ⚙️ 7. Configuración del Silo

| Funcionalidad | Estado | Notas |
|---|---|---|
| Altura, diámetro, capacidad, tipo de grano | ✅ | Editable desde modal |
| Vinculación de dispositivo IoT (kit_code) | ✅ | Visible al editar el silo |
| Densidad estimada por tipo de grano | ❌ | Hardcodeado 640 kg/m³ |
| Umbrales de alerta configurables por silo | ❌ | Hardcodeados en backend |
| Frecuencia de medición configurable | ❌ | Hardcodeada en ESP32 (15 s) |
| Ángulo de reposo configurable por tipo de grano | ❌ | Hardcodeado en 30° (soja) |

---

## 👥 8. Gestión de Silos (Escalabilidad)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Lista de todos los silos del usuario | ✅ | |
| Crear silo | ✅ | |
| Editar silo | ✅ | |
| Eliminar silo (con confirmación) | ✅ | Cascade borra sensor_data |
| Búsqueda/filtro en la lista | ✅ | Por nombre, ubicación y grano |
| Estado rápido por color (semáforo) | ⚠️ | Solo barra de porcentaje verde/naranja |
| Ubicación geográfica (mapa) | ❌ | Solo texto libre |
| Comparación entre silos | ❌ | |

---

## 📡 9. Estado del Dispositivo

| Funcionalidad | Estado | Notas |
|---|---|---|
| Última conexión del ESP32 | ✅ | Se infiere del timestamp del último dato |
| Batería / voltaje | ❌ | Simulado como 100% fijo |
| Señal WiFi (RSSI) | ❌ | El ESP32 no la envía aún |
| Tiempo encendido (uptime) | ❌ | |
| Cantidad de reinicios | ❌ | |
| Versión de firmware | ❌ | |

---

## 📈 Resumen

| Estado | Cantidad |
|---|---|
| ✅ Completo | 22 |
| ⚠️ Parcial | 9 |
| ❌ Pendiente | 22 |
| **Total** | **53** |

---

## 🚀 Próximas prioridades sugeridas

1. ❌ **Sistema de alertas reales** — umbrales configurables + notificación visual en dashboard
2. ❌ **Gráfico de CO₂ histórico** — en la sección de historial
3. ❌ **Exportar CSV** — conectar el botón de descarga existente
4. ❌ **Selector de rango de fechas** — hacer funcional el filtro en historial
5. ❌ **Punto de rocío** — fácil de calcular desde temp + humedad ya disponibles
6. ❌ **Densidad por tipo de grano** — tabla: Soja 640 kg/m³, Maíz 720, Trigo 780, etc.
7. ❌ **Estado del dispositivo** — el ESP32 puede enviar `rssi` y `uptime` en el mismo multipart
