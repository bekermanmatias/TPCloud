# Conectar la cámara del ESP32 (ESP32-CAM) al backend

El backend ya está preparado para recibir fotos enviadas por un ESP32 con módulo de cámara. La app web muestra la **última imagen recibida** en la vista de detalle de cada silo.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| **POST** | `/api/camera/:siloId` | Enviar una foto JPEG. Cuerpo: imagen en bruto (`Content-Type: image/jpeg`). Máx. 2 MB. |
| **GET** | `/api/camera/:siloId` | Obtener la última imagen guardada para ese silo (para `<img src="...">`). |

El `siloId` debe coincidir con un silo existente (por ejemplo `silo-001`, `silo-002`, `silo-003`).

## Cómo envía el ESP32 la imagen

1. Conectar el ESP32 a la misma red WiFi que el servidor (o usar la IP pública si el backend está en la nube).
2. Capturar un frame JPEG con la cámara.
3. Hacer un **POST** con:
   - **URL:** `http://<IP_BACKEND>:3000/api/camera/<SILO_ID>`
   - **Header:** `Content-Type: image/jpeg`
   - **Body:** los bytes de la imagen (binario), no Base64.

### Ejemplo en Arduino (ESP32-CAM)

```cpp
#include "esp_camera.h"
#include "WiFi.h"
#include "HTTPClient.h"

#define WIFI_SSID "tu_wifi"
#define WIFI_PASS "tu_password"
#define BACKEND_URL "http://192.168.1.100:3000"  // IP de tu PC con el backend
#define SILO_ID "silo-001"

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi OK");

  // Inicializar cámara (ajusta pines según tu placa ESP32-CAM)
  camera_config_t config = {};  // Configura según tu módulo
  esp_camera_init(&config);
}

void loop() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) { delay(1000); return; }

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/camera/" + SILO_ID;
  http.begin(url);
  http.addHeader("Content-Type", "image/jpeg");
  int code = http.POST(fb->buf, fb->len);
  http.end();

  if (code == 201) {
    Serial.println("Foto enviada OK");
  } else {
    Serial.printf("Error: %d\n", code);
  }

  esp_camera_fb_return(fb);
  delay(5000);  // Enviar cada 5 segundos (igual que el frontend actualiza)
}
```

Ajusta `camera_config_t` según tu placa (AI-Thinker, etc.); en el IDE de Arduino suele usarse el ejemplo **ESP32 > Camera** como base.

## Probar sin ESP32

Puedes simular el envío con `curl`:

```bash
curl -X POST http://localhost:3000/api/camera/silo-001 \
  -H "Content-Type: image/jpeg" \
  --data-binary @foto.jpg
```

Luego abre en el navegador el detalle del silo "silo-001" y deberías ver la imagen.

## Resumen

- **Backend:** recibe POST con JPEG en bruto, guarda la última imagen por silo en memoria y la sirve en GET.
- **Frontend:** en la vista del silo muestra esa imagen y la actualiza cada 5 segundos; si no hay imagen, muestra el mensaje "Conecta la cámara del ESP32".
- **ESP32:** captura foto, envía POST a `http://<backend>/api/camera/<siloId>` con `Content-Type: image/jpeg` y el cuerpo en binario.
