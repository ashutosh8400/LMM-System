import { query, run } from '../db/database.js';
import { nowIso, reportRange, todayKey } from '../utils/date.js';
import { getCurrentUserId } from './userService.js';

export async function listItems(search = '') {
  const userId = getCurrentUserId();
  const term = `%${search.trim()}%`;
  return query(
    `SELECT i.*,
      COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END), 0) AS stock_in,
      COALESCE(SUM(CASE t.type WHEN 'IN' THEN t.quantity ELSE -t.quantity END), 0) AS current_stock,
      COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END), 0) AS stock_out,
      COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.unit_price ELSE 0 END), 0) AS purchase_value,
      COALESCE(p.total_paid, 0) AS total_paid,
      MAX(t.date) AS last_activity
     FROM stock_items i
     LEFT JOIN stock_transactions t ON t.item_id = i.id
     LEFT JOIN (
       SELECT item_id, SUM(amount) AS total_paid
       FROM stock_payments
       GROUP BY item_id
     ) p ON p.item_id = i.id
     WHERE i.user_id = ? AND (i.name LIKE ? OR i.supplier_name LIKE ?)
     GROUP BY i.id
     ORDER BY i.name COLLATE NOCASE`,
    [userId, term, term],
  );
}

export async function getItem(id) {
  const rows = await query(
    `SELECT i.*,
      COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END), 0) AS stock_in,
      COALESCE(SUM(CASE t.type WHEN 'IN' THEN t.quantity ELSE -t.quantity END), 0) AS current_stock,
      COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END), 0) AS stock_out,
      COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.unit_price ELSE 0 END), 0) AS purchase_value,
      COALESCE(p.total_paid, 0) AS total_paid,
      MAX(t.date) AS last_activity
     FROM stock_items i
     LEFT JOIN stock_transactions t ON t.item_id = i.id
     LEFT JOIN (
       SELECT item_id, SUM(amount) AS total_paid
       FROM stock_payments
       GROUP BY item_id
     ) p ON p.item_id = i.id
     WHERE i.id = ? AND i.user_id = ?
     GROUP BY i.id`,
    [id, getCurrentUserId()],
  );
  return rows[0] || null;
}

export async function saveItem(form) {
  const userId = getCurrentUserId();
  const timestamp = nowIso();
  const values = [
    form.name.trim(),
    form.unit || 'Qty',
    form.supplier_name.trim(),
    Number(form.low_stock_limit || 0),
    timestamp,
  ];

  if (form.id) {
    await run(
      `UPDATE stock_items
       SET name = ?, unit = ?, supplier_name = ?, low_stock_limit = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [...values, form.id, userId],
    );
    return form.id;
  }

  const result = await run(
    `INSERT INTO stock_items (user_id, name, unit, supplier_name, low_stock_limit, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, values[0], values[1], values[2], values[3], timestamp, timestamp],
  );
  return result.changes?.lastId;
}

export async function deleteItem(id) {
  await run('DELETE FROM stock_items WHERE id = ? AND user_id = ?', [id, getCurrentUserId()]);
}

export async function addStockTransaction(form) {
  const item = await query('SELECT id, supplier_name FROM stock_items WHERE id = ? AND user_id = ?', [form.item_id, getCurrentUserId()]);
  if (!item[0]) throw new Error('Item not found for current user');

  if (form.type === 'IN' && Number(form.unit_price || 0) <= 0) {
    throw new Error('Price must be greater than 0');
  }

  if (form.type === 'OUT') {
    const rows = await query(
      `SELECT COALESCE(SUM(CASE type WHEN 'IN' THEN quantity ELSE -quantity END), 0) AS current_stock
       FROM stock_transactions
       WHERE item_id = ?`,
      [form.item_id],
    );
    const available = Number(rows[0]?.current_stock || 0);
    if (Number(form.quantity || 0) > available) {
      throw new Error(`Stock Out cannot be more than ${available}`);
    }
  }

  await run(
    `INSERT INTO stock_transactions
      (item_id, type, quantity, unit_price, supplier_name, note, date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      form.item_id,
      form.type,
      Number(form.quantity),
      form.type === 'IN' ? Number(form.unit_price || 0) : 0,
      form.type === 'IN' ? form.supplier_name?.trim() || '' : item[0].supplier_name || '',
      form.note?.trim() || '',
      form.date || todayKey(),
      nowIso(),
    ],
  );
}

export async function addStockPayment(form) {
  const item = await query('SELECT id FROM stock_items WHERE id = ? AND user_id = ?', [form.item_id, getCurrentUserId()]);
  if (!item[0]) throw new Error('Item not found for current user');

  await run(
    `INSERT INTO stock_payments (item_id, date, amount, mode, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      form.item_id,
      form.date || todayKey(),
      Number(form.amount),
      form.mode,
      form.note?.trim() || '',
      nowIso(),
    ],
  );
}

export async function getPurchaseHistory(itemId, fromDate, toDate) {
  const hasRange = fromDate && toDate;
  return query(
    `SELECT *
     FROM (
       SELECT t.id AS history_id, t.date, t.type AS entry_type, t.quantity, t.unit_price,
        COALESCE(NULLIF(t.supplier_name, ''), i.supplier_name) AS supplier_name,
        t.note, 0 AS amount, NULL AS mode, i.unit, t.created_at
       FROM stock_transactions t
       JOIN stock_items i ON i.id = t.item_id
       WHERE t.item_id = ? AND i.user_id = ? ${hasRange ? 'AND t.date BETWEEN ? AND ?' : ''}
       UNION ALL
       SELECT p.id AS history_id, p.date, 'PAYMENT' AS entry_type, 0 AS quantity, 0 AS unit_price,
        i.supplier_name, p.note, p.amount, p.mode, i.unit, p.created_at
       FROM stock_payments p
       JOIN stock_items i ON i.id = p.item_id
       WHERE p.item_id = ? AND i.user_id = ? ${hasRange ? 'AND p.date BETWEEN ? AND ?' : ''}
     )
     ORDER BY date DESC, created_at DESC, history_id DESC
     LIMIT 1000`,
    hasRange
      ? [itemId, getCurrentUserId(), fromDate, toDate, itemId, getCurrentUserId(), fromDate, toDate]
      : [itemId, getCurrentUserId(), itemId, getCurrentUserId()],
  );
}

export async function stockReport(period) {
  const userId = getCurrentUserId();
  const range = reportRange(period);
  return query(
    `SELECT
      SUM(CASE type WHEN 'IN' THEN quantity ELSE 0 END) AS stock_in,
      SUM(CASE type WHEN 'OUT' THEN quantity ELSE 0 END) AS stock_out,
      COALESCE(SUM(CASE WHEN type = 'IN' THEN unit_price ELSE 0 END), 0) AS purchase_value,
      COALESCE((
        SELECT SUM(p.amount)
        FROM stock_payments p
        JOIN stock_items pi ON pi.id = p.item_id
        WHERE p.date BETWEEN ? AND ? AND pi.user_id = ?
      ), 0) AS paid
     FROM stock_transactions t
     JOIN stock_items i ON i.id = t.item_id
     WHERE t.date BETWEEN ? AND ? AND i.user_id = ?`,
    [range.from, range.to, userId, range.from, range.to, userId],
  );
}
