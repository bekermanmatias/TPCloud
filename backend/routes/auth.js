import express from 'express';
import { register, login } from '../services/authService.js';

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

export { router as authRouter };
