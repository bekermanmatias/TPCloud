import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getAllSilos,
  getSiloById,
  getSiloHistory,
  createSilo,
  updateSilo,
  deleteSilo,
  updateSiloKitCode
} from '../services/silosService.js';

const router = express.Router();

router.use(requireAuth);

// GET /api/silos - Silos del usuario
router.get('/', async (req, res) => {
  try {
    const silos = await getAllSilos(req.userId);
    res.json(silos);
  } catch (error) {
    console.error('Error al obtener silos:', error);
    res.status(500).json({ error: 'Error al obtener silos', message: error.message });
  }
});

// GET /api/silos/:id - Un silo (solo si es del usuario)
router.get('/:id', async (req, res) => {
  try {
    const silo = await getSiloById(req.params.id, req.userId);
    if (!silo) return res.status(404).json({ error: 'Silo no encontrado' });
    res.json(silo);
  } catch (error) {
    console.error('Error al obtener silo:', error);
    res.status(500).json({ error: 'Error al obtener silo', message: error.message });
  }
});

// GET /api/silos/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const silo = await getSiloById(req.params.id, req.userId);
    if (!silo) return res.status(404).json({ error: 'Silo no encontrado' });
    const { limit = 100, hours = 24 } = req.query;
    const history = await getSiloHistory(req.params.id, {
      limit: parseInt(limit),
      hours: parseInt(hours)
    });
    res.json(history);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial', message: error.message });
  }
});

// PUT /api/silos/:id/vincular - Vincular dispositivo por kit_code (debe ir antes de PUT /:id)
router.put('/:id/vincular', async (req, res) => {
  try {
    const silo = await updateSiloKitCode(req.params.id, req.userId, req.body.kit_code);
    if (!silo) return res.status(404).json({ error: 'Silo no encontrado' });
    res.json(silo);
  } catch (error) {
    const status = error.message?.includes('ya está vinculado') ? 409 : 400;
    res.status(status).json({ error: error.message || 'Error al vincular dispositivo' });
  }
});

// POST /api/silos - Crear silo
router.post('/', async (req, res) => {
  try {
    const silo = await createSilo(req.userId, req.body);
    res.status(201).json(silo);
  } catch (error) {
    console.error('Error al crear silo:', error);
    res.status(400).json({ error: error.message || 'Error al crear silo' });
  }
});

// PUT /api/silos/:id - Actualizar silo
router.put('/:id', async (req, res) => {
  try {
    const silo = await updateSilo(req.params.id, req.userId, req.body);
    if (!silo) return res.status(404).json({ error: 'Silo no encontrado' });
    res.json(silo);
  } catch (error) {
    console.error('Error al actualizar silo:', error);
    res.status(400).json({ error: error.message || 'Error al actualizar silo' });
  }
});

// DELETE /api/silos/:id - Eliminar silo
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteSilo(req.params.id, req.userId);
    if (!deleted) return res.status(404).json({ error: 'Silo no encontrado' });
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar silo:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar silo' });
  }
});

export { router as silosRouter };
