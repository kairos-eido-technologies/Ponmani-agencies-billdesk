import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

const dbPaths = [
  path.join(process.cwd(), 'ponmani_console.db'),
  path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Ponmani Stores', 'ponmani_console.db'),
  path.join(process.cwd(), 'release-desktop', 'Ponmani Agencies Console ERP-win32-x64', 'resources', 'app', 'ponmani_console.db'),
];

async function resetDatabase(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log(`[Skip] Database not found at: ${filePath}`);
    return;
  }

  console.log(`[Resetting] Processing database at: ${filePath}`);

  const db = new sqlite3.Database(filePath);

  const run = (sql: string, params: any[] = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    });

  const exec = (sql: string) =>
    new Promise<void>((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

  const all = (sql: string) =>
    new Promise<any[]>((resolve, reject) => {
      db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

  const tables = [
    'inventory',
    'invoices',
    'invoice_items',
    'service_tickets',
    'scrap_entries',
    'godown_transfers',
    'purchase_orders',
    'purchase_items',
    'loyalty_ledger',
    'customers',
    'vendors',
    'backups_log',
    'users',
    'settings'
  ];

  await exec('BEGIN TRANSACTION;');
  for (const table of tables) {
    try {
      await run(`DELETE FROM ${table}`);
    } catch (e: any) {
      console.warn(`Could not clear table ${table}:`, e.message);
    }
  }

  const now = new Date().toISOString();
  // Insert fresh default Admin and Cashier accounts
  await run(
    `INSERT INTO users (id, username, pin, role, created_at) VALUES (?, ?, ?, ?, ?)`,
    ['usr-admin-1', 'admin', '1234', 'Admin', now]
  );
  await run(
    `INSERT INTO users (id, username, pin, role, created_at) VALUES (?, ?, ?, ?, ?)`,
    ['usr-cashier-1', 'cashier', '0000', 'Cashier', now]
  );

  // Insert clean default store settings
  const cleanSettings: Record<string, string> = {
    shop_name: 'Ponmani Agencies',
    shop_address: 'Main Road, Market Center',
    shop_phone: '+91 98765 43210',
    shop_gstin: '',
    receipt_header_note: 'Retail & Service Management',
    receipt_footer_note: 'Goods once sold can be exchanged with valid bill.',
    thermal_printer_width: '80mm',
    app_lang: 'en',
    system_initialized: 'true',
  };

  for (const [key, value] of Object.entries(cleanSettings)) {
    await run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, String(value)]);
  }

  await exec('COMMIT;');

  // Run VACUUM to reclaim space and shrink file
  try {
    await exec('VACUUM;');
  } catch (e: any) {
    console.warn(`Vacuum failed:`, e.message);
  }

  // Verify counts
  console.log(`--- Verification for ${path.basename(filePath)} ---`);
  for (const t of ['inventory', 'customers', 'vendors', 'invoices', 'service_tickets', 'users', 'settings']) {
    const res = await all(`SELECT count(*) as count FROM ${t}`);
    console.log(`- ${t}: ${res[0].count} rows`);
  }

  await new Promise<void>((res) => db.close(() => res()));
  const stats = fs.statSync(filePath);
  console.log(`New file size: ${(stats.size / 1024).toFixed(1)} KB`);
}

async function main() {
  for (const p of dbPaths) {
    await resetDatabase(p);
  }
  console.log('\nAll databases are completely clean with 0 product catalog and 0 transaction data!');
}

main().catch(console.error);
