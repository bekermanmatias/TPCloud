import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getActiveAlertsByUser,
  getActiveAlertsBySilo,
  getAlertHistory,
  acknowledgeAlert,
  checkDeviceOffline,
  getSiloThresholds,
  updateSiloThreshold,
} from '../services/alertsService.js';

const router = express.Router();

// GET /api/alerts — todas las alertas activas del usuario (con check de dispositivos offline)
router.get('/', requireAuth, async (req, res) => {
  try {
    await checkDeviceOffline(req.userId);
    const alerts = await getActiveAlertsByUser(req.userId);
    res.json(alerts);
  } catch (err) {
    console.error('Error GET /api/alerts:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts/:siloId — alertas activas de un silo específico
router.get('/:siloId', requireAuth, async (req, res) => {
  try {
    const alerts = await getActiveAlertsBySilo(req.params.siloId);
    res.json(alerts);
  } catch (err) {
    console.error('Error GET /api/alerts/:siloId:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/alerts/:alertId/acknowledge — marcar alerta como vista
router.patch('/:alertId/acknowledge', requireAuth, async (req, res) => {
  try {
    const result = await acknowledgeAlert(Number(req.params.alertId), req.userId);
    if (!result) return res.status(404).json({ error: 'Alerta no encontrada o ya resuelta' });
    res.json(result);
  } catch (err) {
    console.error('Error PATCH /api/alerts/:alertId/acknowledge:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts/:siloId/history — historial de alertas (activas + resueltas)
router.get('/:siloId/history', requireAuth, async (req, res) => {
  try {
    const { limit = 100, days = 30 } = req.query;
    const history = await getAlertHistory(req.params.siloId, {
      limit: Math.min(parseInt(limit) || 100, 500),
      days:  Math.min(parseInt(days)  || 30,  365),
    });
    res.json(history);
  } catch (err) {
    console.error('Error GET /api/alerts/:siloId/history:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts/:siloId/config — umbrales configurados para el silo
router.get('/:siloId/config', requireAuth, async (req, res) => {
  try {
    const thresholds = await getSiloThresholds(req.params.siloId);
    res.json(thresholds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alerts/:siloId/config/:key — actualizar un umbral específico
router.put('/:siloId/config/:key', requireAuth, async (req, res) => {
  try {
    const { siloId, key } = req.params;
    const value = Number(req.body?.value);
    if (!Number.isFinite(value)) return res.status(400).json({ error: 'value debe ser un número' });
    const updated = await updateSiloThreshold(siloId, key, value);
    res.json(updated);
  } catch (err) {
    res.status(err.message.includes('desconocido') ? 400 : 500).json({ error: err.message });
  }
});

export { router as alertsRouter };
