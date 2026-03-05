import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPool } from '../database/init.js';

const router = express.Router();

// GET /api/gallery — todas las capturas guardadas del usuario
router.get('/', requireAuth, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.json([]);

  try {
    const result = await pool.query(
      `SELECT id, silo_id, silo_name, image_path, captured_at,
              temperature, humidity, co2, grain_level_percentage,
              grain_level_tons, presion, source, saved_at
       FROM gallery_captures
       WHERE user_id = $1
       ORDER BY saved_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener galería:', err);
    res.status(500).json({ error: 'Error al obtener la galería' });
  }
});

// POST /api/gallery — guardar una captura
router.post('/', requireAuth, async (req, res) => {
  const pool = getPool();
  const {
    silo_id, silo_name, image_path, captured_at,
    temperature, humidity, co2,
    grain_level_percentage, grain_level_tons, presion, source
  } = req.body;

  if (!silo_id) return res.status(400).json({ error: 'silo_id requerido' });

  if (!pool) {
    return res.status(201).json({ id: Date.now(), silo_id, silo_name, image_path, captured_at, saved_at: new Date().toISOString() });
  }

  try {
    // Verificar que el silo pertenezca al usuario
    const silo = await pool.query(
      'SELECT id FROM silos WHERE id = $1 AND user_id = $2',
      [silo_id, req.userId]
    );
    if (silo.rows.length === 0) {
      return res.status(403).json({ error: 'Silo no encontrado o sin acceso' });
    }

    const result = await pool.query(
      `INSERT INTO gallery_captures
         (user_id, silo_id, silo_name, image_path, captured_at,
          temperature, humidity, co2, grain_level_percentage,
          grain_level_tons, presion, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        req.userId, silo_id, silo_name, image_path || null,
        captured_at || new Date().toISOString(),
        temperature ?? null, humidity ?? null, co2 ?? null,
        grain_level_percentage ?? null, grain_level_tons ?? null,
        presion ?? null, source || 'live'
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al guardar captura:', err);
    res.status(500).json({ error: 'Error al guardar la captura' });
  }
});

// DELETE /api/gallery/:id — eliminar una captura
router.delete('/:id', requireAuth, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.json({ ok: true });

  try {
    const result = await pool.query(
      'DELETE FROM gallery_captures WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Captura no encontrada' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar captura:', err);
    res.status(500).json({ error: 'Error al eliminar la captura' });
  }
});

export { router as galleryRouter };
