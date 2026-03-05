import express from 'express';
import { saveCameraFrame, getLatestFrame } from '../services/cameraService.js';

const router = express.Router();

// Middleware para aceptar imagen JPEG en bruto (desde ESP32-CAM)
const rawJpeg = express.raw({
  type: 'image/jpeg',
  limit: '2mb'
});

// POST /api/camera/:siloId - Recibir foto desde ESP32-CAM
router.post('/:siloId', rawJpeg, async (req, res) => {
  try {
    const { siloId } = req.params;
    const buffer = req.body;

    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({
        error: 'Cuerpo vacío o no válido. Envía la imagen JPEG en bruto (Content-Type: image/jpeg).'
      });
    }

    const contentType = req.headers['content-type'] || 'image/jpeg';
    saveCameraFrame(siloId, buffer, contentType);

    res.status(201).json({
      message: 'Imagen recibida correctamente',
      siloId,
      size: buffer.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al guardar imagen de cámara:', error);
    res.status(400).json({
      error: error.message || 'Error al procesar imagen'
    });
  }
});

// GET /api/camera/:siloId - Obtener última imagen del silo (para <img src="...">)
router.get('/:siloId', (req, res) => {
  try {
    const { siloId } = req.params;
    const frame = getLatestFrame(siloId);

    if (!frame) {
      return res.status(404).json({
        error: 'No hay imagen de cámara para este silo',
        siloId
      });
    }

    res.set({
      'Content-Type': frame.contentType,
      'Cache-Control': 'no-cache, no-store',
      'X-Captured-At': frame.timestamp
    });
    res.send(frame.buffer);
  } catch (error) {
    console.error('Error al servir imagen:', error);
    res.status(500).json({
      error: 'Error al obtener imagen'
    });
  }
});

export { router as cameraRouter };
