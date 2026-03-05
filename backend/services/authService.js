import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../database/init.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'salgest-dev-secret-cambiar-en-produccion';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Registra un nuevo usuario
 * @param {{ email: string, password: string, name?: string }} data
 * @returns {{ user: { id, email, name }, token: string }}
 */
export async function register(data) {
  const pool = getPool();
  if (!pool) throw new Error('Base de datos no disponible');

  const { email, password, name } = data;
  if (!email || !password) throw new Error('Email y contraseña son requeridos');

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) throw new Error('Ya existe un usuario con ese email');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
    [normalizedEmail, passwordHash, (name || '').trim() || null]
  );
  const user = result.rows[0];
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return {
    user: { id: user.id, email: user.email, name: user.name },
    token
  };
}

/**
 * Inicia sesión y devuelve usuario + token
 * @param {{ email: string, password: string }}
 * @returns {{ user: { id, email, name }, token: string }}
 */
export async function login(data) {
  const pool = getPool();
  if (!pool) throw new Error('Base de datos no disponible');

  const { email, password } = data;
  if (!email || !password) throw new Error('Email y contraseña son requeridos');

  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(
    'SELECT id, email, name, password_hash FROM users WHERE email = $1',
    [normalizedEmail]
  );
  if (result.rows.length === 0) throw new Error('Credenciales inválidas');

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Credenciales inválidas');

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return {
    user: { id: user.id, email: user.email, name: user.name },
    token
  };
}

/**
 * Devuelve el perfil de un usuario por su ID.
 * @param {number} userId
 * @returns {{ id, email, name, created_at }}
 */
export async function getProfile(userId) {
  const pool = getPool();
  if (!pool) throw new Error('Base de datos no disponible');

  const result = await pool.query(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) throw new Error('Usuario no encontrado');
  return result.rows[0];
}

/**
 * Actualiza el perfil del usuario.
 * - name: actualiza el nombre.
 * - email: actualiza el email (verifica unicidad).
 * - password + currentPassword: cambia la contraseña (requiere la actual).
 * @param {number} userId
 * @param {{ name?, email?, password?, currentPassword? }} data
 * @returns {{ id, email, name }}
 */
export async function updateProfile(userId, data) {
  const pool = getPool();
  if (!pool) throw new Error('Base de datos no disponible');

  const { name, email, password, currentPassword } = data;
  const updates = [];
  const values  = [];

  // Cambio de nombre
  if (name !== undefined) {
    updates.push(`name = $${updates.length + 1}`);
    values.push((name || '').trim() || null);
  }

  // Cambio de email
  if (email !== undefined) {
    const normalized = email.trim().toLowerCase();
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id <> $2',
      [normalized, userId]
    );
    if (existing.rows.length > 0) throw new Error('Ya existe un usuario con ese email');
    updates.push(`name = $${updates.length + 1}`); // placeholder corrected below
    updates[updates.length - 1] = `email = $${values.length + 1}`;
    values.push(normalized);
  }

  // Cambio de contraseña
  if (password) {
    if (!currentPassword) throw new Error('Debés ingresar tu contraseña actual');
    const row = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (row.rows.length === 0) throw new Error('Usuario no encontrado');
    const valid = await bcrypt.compare(currentPassword, row.rows[0].password_hash);
    if (!valid) throw new Error('La contraseña actual es incorrecta');
    if (password.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    const newHash = await bcrypt.hash(password, SALT_ROUNDS);
    updates.push(`password_hash = $${values.length + 1}`);
    values.push(newHash);
  }

  if (updates.length === 0) throw new Error('No hay datos para actualizar');

  values.push(userId);
  const result = await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, email, name`,
    values
  );
  return result.rows[0];
}

/**
 * Verifica un token JWT y devuelve el payload
 * @param {string} token
 * @returns {{ userId: number } | null}
 */
export function verifyToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
