import { query, run } from '../db/database.js';
import { nowIso } from '../utils/date.js';

const CURRENT_USER_KEY = 'construction_manager_current_user';

export function getStoredUser() {
  try {
    const value = localStorage.getItem(CURRENT_USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUserId() {
  return getStoredUser()?.id || 0;
}

export async function listUsers() {
  return query('SELECT * FROM users ORDER BY name COLLATE NOCASE');
}

export async function listActiveUsers() {
  return query('SELECT * FROM users WHERE is_active = 1 ORDER BY name COLLATE NOCASE');
}

export async function loginUser(name) {
  const cleanName = name.trim();
  const existing = await query('SELECT * FROM users WHERE lower(name) = lower(?)', [cleanName]);

  if (existing[0]) {
    if (Number(existing[0].is_active) !== 1) {
      throw new Error('This user is not allowed to login');
    }
    setStoredUser(existing[0]);
    return existing[0];
  }

  throw new Error('User not found. Ask Admin to create this user.');
}

export async function createUser(name, isAdmin = false) {
  const cleanName = name.trim();
  const result = await run(
    'INSERT INTO users (name, is_admin, is_active, created_at) VALUES (?, ?, 1, ?)',
    [cleanName, isAdmin ? 1 : 0, nowIso()],
  );
  return { id: result.changes?.lastId, name: cleanName, is_admin: isAdmin ? 1 : 0, is_active: 1 };
}

export async function updateUserPermission(id, changes) {
  await run(
    'UPDATE users SET is_admin = ?, is_active = ? WHERE id = ?',
    [changes.is_admin ? 1 : 0, changes.is_active ? 1 : 0, id],
  );
}
