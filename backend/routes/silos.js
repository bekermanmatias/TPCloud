import express from 'express';
import { getAllSilos, getSiloById, getSiloHistory } from '../services/silosService.js';

const router = express.Router();

// GET /api/silos - Obtener todos los silos
router.get('/', async (req, res) => {
  try {
    const silos = await getAllSilos();
    res.json(silos);
  } catch (error) {
    console.error('Error al obtener silos:', error);
    res.status(500).json({ 
      error: 'Error al obtener silos',
      message: error.message 
    });
  }
});

// GET /api/silos/:id - Obtener información de un silo específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const silo = await getSiloById(id);
    
    if (!silo) {
      return res.status(404).json({ 
        error: 'Silo no encontrado' 
      });
    }
    
    res.json(silo);
  } catch (error) {
    console.error('Error al obtener silo:', error);
    res.status(500).json({ 
      error: 'Error al obtener silo',
      message: error.message 
    });
  }
});

// GET /api/silos/:id/history - Obtener historial de datos de un silo
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, hours = 24 } = req.query;
    
    const history = await getSiloHistory(id, {
      limit: parseInt(limit),
      hours: parseInt(hours)
    });
    
    res.json(history);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ 
      error: 'Error al obtener historial',
      message: error.message 
    });
  }
});

export { router as silosRouter };

