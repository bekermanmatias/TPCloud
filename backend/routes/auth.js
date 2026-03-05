import express from 'express';
import { register, login, getProfile, updateProfile } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await register({ email, password, name });
    res.status(201).json(result);
  } catch (error) {
    const status = error.message.includes('Ya existe') ? 409 : 400;
    res.status(status).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login({ email, password });
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message || 'Credenciales inválidas' });
  }
});

// GET /api/auth/profile — datos del usuario autenticado
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await getProfile(req.userId);
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// PUT /api/auth/profile — actualizar nombre, email y/o contraseña
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, email, password, currentPassword } = req.body;
    const updated = await updateProfile(req.userId, { name, email, password, currentPassword });
    res.json({ user: updated });
  } catch (error) {
    const status = error.message.includes('Ya existe') ? 409
                 : error.message.includes('incorrecta') ? 400
                 : 400;
    res.status(status).json({ error: error.message });
  }
});

export { router as authRouter };
