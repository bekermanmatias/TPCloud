import { verifyToken } from '../services/authService.js';

/**
 * Middleware que exige autenticación por JWT.
 * Espera header: Authorization: Bearer <token>
 * Añade req.userId (número) si el token es válido.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'No autorizado', message: 'Token inválido o expirado' });
  }

  req.userId = payload.userId;
  next();
}
