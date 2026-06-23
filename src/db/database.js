import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { DB_NAME, DB_VERSION, MIGRATIONS, SCHEMA } from './schema.js';

const sqlite = new SQLiteConnection(CapacitorSQLite);
const WEB_WASM_PATH = '/assets/sqljs-1.11';
let db;

async function ensureWebStore() {
  if (Capacitor.getPlatform() !== 'web') return;
  const existing = document.querySelector('jeep-sqlite');
  if (!existing) {
    const jeep = document.createElement('jeep-sqlite');
    jeep.setAttribute('wasmPath', WEB_WASM_PATH);
    document.body.appendChild(jeep);
    await customElements.whenDefined('jeep-sqlite');
  } else {
    existing.setAttribute('wasmPath', WEB_WASM_PATH);
  }
  await sqlite.initWebStore();
}

export async function initDatabase() {
  if (db) return db;

  await ensureWebStore();
  const consistent = await sqlite.checkConnectionsConsistency().catch(() => ({ result: false }));
  const hasConnection = consistent.result
    ? await sqlite.isConnection(DB_NAME, false).catch(() => ({ result: false }))
    : { result: false };

  db = hasConnection.result
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);

  await db.open();
  await db.execute('PRAGMA foreign_keys = ON;');

  for (const statement of SCHEMA) {
    await db.execute(statement);
  }

  for (const statement of MIGRATIONS) {
    await db.execute(statement).catch(() => {});
  }

  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DB_NAME);
  }

  return db;
}

export async function run(statement, values = []) {
  const connection = await initDatabase();
  const result = await connection.run(statement, values);
  await persistWeb();
  return result;
}

export async function query(statement, values = []) {
  const connection = await initDatabase();
  const result = await connection.query(statement, values);
  return result.values || [];
}

export async function execute(statement) {
  const connection = await initDatabase();
  const result = await connection.execute(statement);
  await persistWeb();
  return result;
}

export async function exportDatabaseJson() {
  await initDatabase();
  const result = await sqlite.exportToJson(DB_NAME, 'full');
  return result.export;
}

export async function importDatabaseJson(json) {
  await initDatabase();
  await sqlite.importFromJson(JSON.stringify(json));
  await persistWeb();
}

async function persistWeb() {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DB_NAME);
  }
}
