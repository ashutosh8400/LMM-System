import { query, run } from '../db/database.js';
import { nowIso, reportRange } from '../utils/date.js';
import { getCurrentUserId } from './userService.js';

export function calculateAttendanceWage(dailyWage, status, overtimeAmount = 0) {
  const wage = Number(dailyWage || 0);
  const overtime = Number(overtimeAmount || 0);
  const base = status === 'Present' ? wage : status === 'Half Day' ? wage / 2 : 0;
  return base + overtime;
}

export async function listLabour(search = '') {
  const userId = getCurrentUserId();
  const term = `%${search.trim()}%`;
  return query(
    `SELECT l.*,
      COALESCE(a.total_earned, 0) AS earned_amount,
      COALESCE(p.total_paid, 0) AS total_paid
    FROM labour l
    LEFT JOIN (
      SELECT labour_id, SUM(wage_amount) AS total_earned
      FROM attendance
      GROUP BY labour_id
    ) a ON a.labour_id = l.id
    LEFT JOIN (
      SELECT labour_id, SUM(amount) AS total_paid
      FROM labour_payments
      GROUP BY labour_id
    ) p ON p.labour_id = l.id
    WHERE l.user_id = ? AND (l.name LIKE ? OR l.mobile LIKE ? OR l.work_type LIKE ?)
    ORDER BY l.name COLLATE NOCASE`,
    [userId, term, term, term],
  );
}

export async function getLabour(id) {
  const userId = getCurrentUserId();
  const rows = await query(
    `SELECT l.*,
      COALESCE(a.total_earned, 0) AS earned_amount,
      COALESCE(p.total_paid, 0) AS total_paid
    FROM labour l
    LEFT JOIN (
      SELECT labour_id, SUM(wage_amount) AS total_earned
      FROM attendance
      GROUP BY labour_id
    ) a ON a.labour_id = l.id
    LEFT JOIN (
      SELECT labour_id, SUM(amount) AS total_paid
      FROM labour_payments
      GROUP BY labour_id
    ) p ON p.labour_id = l.id
    WHERE l.id = ? AND l.user_id = ?`,
    [id, userId],
  );
  return rows[0] || null;
}

export async function saveLabour(form) {
  const userId = getCurrentUserId();
  const timestamp = nowIso();
  const values = [
    form.name.trim(),
    form.mobile.trim(),
    form.work_type.trim(),
    Number(form.daily_wage),
    timestamp,
  ];

  if (form.id) {
    await run(
      `UPDATE labour
       SET name = ?, mobile = ?, work_type = ?, daily_wage = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [...values, form.id, userId],
    );
    return form.id;
  }

  const result = await run(
    `INSERT INTO labour (user_id, name, mobile, work_type, daily_wage, paid_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [userId, ...values.slice(0, 4), timestamp, timestamp],
  );
  return result.changes?.lastId;
}

export async function deleteLabour(id) {
  await run('DELETE FROM labour WHERE id = ? AND user_id = ?', [id, getCurrentUserId()]);
}

export async function addAttendance(form) {
  const labour = await getLabour(form.labour_id);
  if (!labour) throw new Error('Labour not found for current user');

  const existing = await query('SELECT id FROM attendance WHERE labour_id = ? AND date = ?', [
    form.labour_id,
    form.date,
  ]);

  if (existing.length > 0) {
    throw new Error('Attendance already exists for this date');
  }

  const timestamp = nowIso();
  await run(
    `INSERT INTO attendance
      (labour_id, date, status, paid_amount, wage_amount, overtime_amount, remark, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)`,
    [
      form.labour_id,
      form.date,
      form.status,
      Number(form.wage_amount),
      Number(form.overtime_amount || 0),
      form.remark?.trim() || '',
      timestamp,
      timestamp,
    ],
  );
}

export async function addPayment(form) {
  const labour = await getLabour(form.labour_id);
  if (!labour) throw new Error('Labour not found for current user');

  await run(
    `INSERT INTO labour_payments (labour_id, date, amount, mode, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      form.labour_id,
      form.date,
      Number(form.amount),
      form.mode,
      form.note?.trim() || '',
      nowIso(),
    ],
  );
}

export async function getLabourHistory(labourId) {
  const labour = await getLabour(labourId);
  if (!labour) return [];

  return query(
    `SELECT id, date, 'Attendance' AS entry_type, status AS title, wage_amount AS amount,
      overtime_amount, remark AS note, NULL AS mode
     FROM attendance
     WHERE labour_id = ?
     UNION ALL
     SELECT id, date, 'Payment' AS entry_type, mode AS title, amount,
      0 AS overtime_amount, note, mode
     FROM labour_payments
     WHERE labour_id = ?
     ORDER BY date DESC, entry_type ASC, id DESC`,
    [labourId, labourId],
  );
}

export async function labourReport(period) {
  const userId = getCurrentUserId();
  const range = reportRange(period);
  return query(
    `SELECT
      COUNT(*) AS records,
      SUM(CASE status WHEN 'Present' THEN 1 ELSE 0 END) AS present,
      SUM(CASE status WHEN 'Absent' THEN 1 ELSE 0 END) AS absent,
      SUM(CASE status WHEN 'Half Day' THEN 1 ELSE 0 END) AS half_day,
      COALESCE((SELECT SUM(p.amount) FROM labour_payments p JOIN labour lp ON lp.id = p.labour_id WHERE p.date BETWEEN ? AND ? AND lp.user_id = ?), 0) AS paid
     FROM attendance a
     JOIN labour l ON l.id = a.labour_id
     WHERE a.date BETWEEN ? AND ? AND l.user_id = ?`,
    [range.from, range.to, userId, range.from, range.to, userId],
  );
}
