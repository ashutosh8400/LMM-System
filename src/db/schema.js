export const DB_NAME = 'construction_manager';
export const DB_VERSION = 1;

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_admin INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS labour (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    work_type TEXT NOT NULL,
    daily_wage REAL NOT NULL,
    paid_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    labour_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Half Day')),
    paid_amount REAL NOT NULL DEFAULT 0,
    wage_amount REAL NOT NULL DEFAULT 0,
    overtime_amount REAL NOT NULL DEFAULT 0,
    remark TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(labour_id, date),
    FOREIGN KEY(labour_id) REFERENCES labour(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS labour_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    labour_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('Cash', 'UPI')),
    note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(labour_id) REFERENCES labour(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS stock_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'Qty',
    supplier_name TEXT NOT NULL,
    low_stock_limit REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS stock_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL DEFAULT 0,
    supplier_name TEXT,
    note TEXT,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(item_id) REFERENCES stock_items(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS stock_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('Cash', 'UPI')),
    note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(item_id) REFERENCES stock_items(id) ON DELETE CASCADE
  );`,
  'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);',
  'CREATE INDEX IF NOT EXISTS idx_labour_payments_date ON labour_payments(date);',
  'CREATE INDEX IF NOT EXISTS idx_stock_transactions_date ON stock_transactions(date);',
  'CREATE INDEX IF NOT EXISTS idx_stock_payments_date ON stock_payments(date);',
];

export const MIGRATIONS = [
  `INSERT OR IGNORE INTO users (id, name, is_admin, is_active, created_at)
   VALUES (1, 'Admin', 1, 1, datetime('now'));`,
  'ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;',
  'ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;',
  `INSERT OR IGNORE INTO users (name, is_admin, is_active, created_at)
   VALUES ('Admin', 1, 1, datetime('now'));`,
  "UPDATE users SET is_admin = 1, is_active = 1 WHERE name = 'Admin';",
  'ALTER TABLE labour ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;',
  'ALTER TABLE stock_items ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;',
  "ALTER TABLE stock_items ADD COLUMN unit TEXT NOT NULL DEFAULT 'Qty';",
  'CREATE INDEX IF NOT EXISTS idx_labour_user ON labour(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_stock_items_user ON stock_items(user_id);',
  'ALTER TABLE attendance ADD COLUMN wage_amount REAL NOT NULL DEFAULT 0;',
  'ALTER TABLE attendance ADD COLUMN overtime_amount REAL NOT NULL DEFAULT 0;',
  'ALTER TABLE attendance ADD COLUMN remark TEXT;',
  `UPDATE attendance
   SET wage_amount = (
    SELECT CASE attendance.status
      WHEN 'Present' THEN labour.daily_wage
      WHEN 'Half Day' THEN labour.daily_wage / 2
      ELSE 0
    END
    FROM labour
    WHERE labour.id = attendance.labour_id
   )
   WHERE wage_amount = 0;`,
  `INSERT INTO labour_payments (labour_id, date, amount, mode, note, created_at)
   SELECT id, date(created_at), paid_amount, 'Cash', 'Opening paid amount', created_at
   FROM labour
   WHERE paid_amount > 0;`,
  'UPDATE labour SET paid_amount = 0 WHERE paid_amount > 0;',
  `INSERT INTO labour_payments (labour_id, date, amount, mode, note, created_at)
   SELECT labour_id, date, paid_amount, 'Cash', 'Migrated attendance payment', created_at
   FROM attendance
   WHERE paid_amount > 0;`,
  'UPDATE attendance SET paid_amount = 0 WHERE paid_amount > 0;',
];
