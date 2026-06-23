import { query } from '../db/database.js';
import { reportRange } from '../utils/date.js';
import { getCurrentUserId } from './userService.js';

export async function getFullReport(period) {
  const range = reportRange(period);
  const userId = getCurrentUserId();
  const params = [range.from, range.to, userId];

  const [labourAttendance, labourPayments, stockTransactions, stockPayments] = await Promise.all([
    query(
      `SELECT a.date, l.name, l.mobile, l.work_type, a.status, a.wage_amount,
        a.overtime_amount, a.remark
       FROM attendance a
       JOIN labour l ON l.id = a.labour_id
       WHERE a.date BETWEEN ? AND ? AND l.user_id = ?
       ORDER BY a.date DESC, l.name COLLATE NOCASE`,
      params,
    ),
    query(
      `SELECT p.date, l.name, l.mobile, p.amount, p.mode, p.note
       FROM labour_payments p
       JOIN labour l ON l.id = p.labour_id
       WHERE p.date BETWEEN ? AND ? AND l.user_id = ?
       ORDER BY p.date DESC, l.name COLLATE NOCASE`,
      params,
    ),
    query(
      `SELECT t.date, i.name AS item_name, t.type, t.quantity, t.unit_price,
        COALESCE(NULLIF(t.supplier_name, ''), i.supplier_name) AS supplier_name,
        i.unit, t.note
       FROM stock_transactions t
       JOIN stock_items i ON i.id = t.item_id
       WHERE t.date BETWEEN ? AND ? AND i.user_id = ?
       ORDER BY t.date DESC, i.name COLLATE NOCASE`,
      params,
    ),
    query(
      `SELECT p.date, i.name AS item_name, i.supplier_name, p.amount, p.mode, p.note
       FROM stock_payments p
       JOIN stock_items i ON i.id = p.item_id
       WHERE p.date BETWEEN ? AND ? AND i.user_id = ?
       ORDER BY p.date DESC, i.name COLLATE NOCASE`,
      params,
    ),
  ]);

  const labour = buildLabourSummary(labourAttendance, labourPayments);
  const stock = buildStockSummary(stockTransactions, stockPayments);

  return {
    period,
    range,
    labour,
    stock,
    labourAttendance,
    labourPayments,
    stockTransactions,
    stockPayments,
  };
}

function buildLabourSummary(attendance, payments) {
  return {
    present: attendance.filter((row) => row.status === 'Present').length,
    absent: attendance.filter((row) => row.status === 'Absent').length,
    halfDay: attendance.filter((row) => row.status === 'Half Day').length,
    earned: attendance.reduce((sum, row) => sum + Number(row.wage_amount || 0), 0),
    paid: payments.reduce((sum, row) => sum + Number(row.amount || 0), 0),
  };
}

function buildStockSummary(transactions, payments) {
  return {
    stockIn: transactions
      .filter((row) => row.type === 'IN')
      .reduce((sum, row) => sum + Number(row.quantity || 0), 0),
    stockOut: transactions
      .filter((row) => row.type === 'OUT')
      .reduce((sum, row) => sum + Number(row.quantity || 0), 0),
    purchaseValue: transactions
      .filter((row) => row.type === 'IN')
      .reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.unit_price || 0), 0),
    paid: payments.reduce((sum, row) => sum + Number(row.amount || 0), 0),
  };
}
