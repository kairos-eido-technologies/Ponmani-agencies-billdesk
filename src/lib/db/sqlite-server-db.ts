import sqlite3 from 'sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Helper to determine OS-specific persistent database path
function getDbPath(): string {
  const isElectron = typeof process !== 'undefined' && !!process.versions?.electron;
  if (isElectron) {
    const userData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const dbDir = path.join(userData, 'Ponmani Stores');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'ponmani_console.db');
  }
  // Default workspace root for development
  return path.join(process.cwd(), 'ponmani_console.db');
}

class ServerSQLite {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
  }

  public run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  public all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  public get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  public exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export class SQLiteDatabaseManager {
  private static instance: ServerSQLite | null = null;
  private static columnCache: Record<string, Set<string>> = {};

  public static getDB(): ServerSQLite {
    if (!this.instance) {
      const dbPath = getDbPath();
      console.log(`[SQLite Server] Initializing SQLite database at: ${dbPath}`);
      this.instance = new ServerSQLite(dbPath);
    }
    return this.instance;
  }

  /**
   * Create schema tables if they don't exist and run auto-migrations
   */
  public static async initializeSchema(): Promise<void> {
    const db = this.getDB();
    
    const tablesSql = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT,
        password TEXT,
        role TEXT,
        pin TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        barcode TEXT,
        name TEXT,
        category TEXT,
        unit TEXT,
        cost_price REAL,
        selling_price REAL,
        stock_qty REAL,
        godown_qty REAL,
        moq REAL,
        min_stock_alert REAL,
        sku_code TEXT,
        gst_rate REAL,
        image_path TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS vendors (
        id TEXT PRIMARY KEY,
        name TEXT,
        company_name TEXT,
        mobile TEXT,
        email TEXT,
        address TEXT,
        gst_number TEXT,
        balance_due REAL DEFAULT 0,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        po_number TEXT,
        vendor_id TEXT,
        vendor_name TEXT,
        order_date TEXT,
        status TEXT,
        total_amount REAL,
        paid_amount REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS purchase_items (
        id TEXT PRIMARY KEY,
        po_id TEXT,
        product_id TEXT,
        product_name TEXT,
        qty REAL,
        unit_price REAL,
        cost_price REAL,
        tax_rate REAL,
        total_price REAL,
        total REAL
      );
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT,
        mobile TEXT,
        email TEXT,
        address TEXT,
        gst_number TEXT,
        loyalty_points REAL,
        total_spent REAL,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS loyalty_ledger (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        points_change REAL,
        reason TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT,
        customer_id TEXT,
        customer_name TEXT,
        customer_mobile TEXT,
        invoice_type TEXT,
        subtotal REAL,
        tax_amount REAL,
        discount_amount REAL,
        exchange_amount REAL DEFAULT 0,
        exchange_notes TEXT,
        grand_total REAL,
        payment_method TEXT,
        payment_status TEXT,
        is_synced REAL DEFAULT 0,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT,
        product_id TEXT,
        barcode TEXT,
        product_name TEXT,
        qty REAL,
        unit_price REAL,
        tax_rate REAL,
        total_price REAL,
        is_return INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS service_tickets (
        id TEXT PRIMARY KEY,
        ticket_number TEXT,
        customer_name TEXT,
        customer_mobile TEXT,
        device_name TEXT,
        issue_description TEXT,
        estimated_cost REAL,
        advance_paid REAL,
        status TEXT,
        assigned_technician TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS scrap_entries (
        id TEXT PRIMARY KEY,
        customer_name TEXT,
        customer_mobile TEXT,
        item_description TEXT,
        weight_kg REAL,
        price_per_kg REAL,
        total_payout REAL,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS godown_transfers (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        product_name TEXT,
        qty REAL,
        source TEXT,
        destination TEXT,
        transfer_date TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS backups_log (
        id TEXT PRIMARY KEY,
        filename TEXT,
        type TEXT,
        timestamp TEXT,
        size_kb REAL,
        status TEXT
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `;
    await db.exec(tablesSql);

    // Auto-migrate missing columns for existing databases on disk
    const migrations = [
      `ALTER TABLE invoices ADD COLUMN is_synced REAL DEFAULT 0;`,
      `ALTER TABLE invoice_items ADD COLUMN is_return INTEGER DEFAULT 0;`,
      `ALTER TABLE vendors ADD COLUMN balance_due REAL DEFAULT 0;`,
      `ALTER TABLE purchase_orders ADD COLUMN paid_amount REAL DEFAULT 0;`,
      `ALTER TABLE purchase_items ADD COLUMN cost_price REAL DEFAULT 0;`,
      `ALTER TABLE purchase_items ADD COLUMN total REAL DEFAULT 0;`,
      `ALTER TABLE invoices ADD COLUMN exchange_amount REAL DEFAULT 0;`,
      `ALTER TABLE invoices ADD COLUMN exchange_notes TEXT;`,
    ];

    for (const sql of migrations) {
      try {
        await db.exec(sql);
      } catch {
        // Column already exists, safe to ignore
      }
    }

    // Reset column cache after schema init/migrations
    this.columnCache = {};
  }

  /**
   * Get valid column names for a table to prevent SQLITE_ERROR on extra keys
   */
  private static async getTableColumns(table: string): Promise<Set<string>> {
    if (this.columnCache[table]) return this.columnCache[table];
    const db = this.getDB();
    try {
      const info = await db.all(`PRAGMA table_info(${table})`);
      const columns = new Set(info.map((col: any) => col.name));
      this.columnCache[table] = columns;
      return columns;
    } catch {
      return new Set();
    }
  }

  /**
   * Load entire database store for local syncing across client instances
   */
  public static async loadFullStore(): Promise<any> {
    const db = this.getDB();
    await this.initializeSchema();

    const tables = [
      'users', 'inventory', 'vendors', 'purchase_orders', 'purchase_items',
      'customers', 'loyalty_ledger', 'invoices', 'invoice_items',
      'service_tickets', 'scrap_entries', 'godown_transfers', 'backups_log'
    ];

    const store: any = {};
    for (const table of tables) {
      const rows = await db.all(`SELECT * FROM ${table}`);
      store[table] = rows;
    }

    // Process settings
    const settingsRows = await db.all(`SELECT * FROM settings`);
    const settingsObj: any = {};
    settingsRows.forEach((row) => {
      try {
        settingsObj[row.key] = JSON.parse(row.value);
      } catch (e) {
        settingsObj[row.key] = row.value;
      }
    });
    store.settings = settingsObj;

    return store;
  }

  /**
   * Save a single row to a table using SQLite upsert with column filtering
   */
  public static async upsertRow(table: string, data: any): Promise<void> {
    const db = this.getDB();
    await this.initializeSchema();

    if (table === 'settings') {
      const sql = `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`;
      const val = typeof data.value === 'object' ? JSON.stringify(data.value) : String(data.value);
      await db.run(sql, [data.key, val]);
      return;
    }

    const tableCols = await this.getTableColumns(table);
    let keys = Object.keys(data);

    // Filter out keys that don't exist as columns in SQLite schema
    if (tableCols.size > 0) {
      keys = keys.filter((k) => tableCols.has(k));
    }

    if (keys.length === 0) return;

    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.join(', ');
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));

    const sql = `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`;
    await db.run(sql, values);
  }

  /**
   * Delete a row from a table
   */
  public static async deleteRow(table: string, id: string): Promise<void> {
    const db = this.getDB();
    await this.initializeSchema();
    const pkColumn = table === 'settings' ? 'key' : 'id';
    const sql = `DELETE FROM ${table} WHERE ${pkColumn} = ?`;
    await db.run(sql, [id]);
  }

  /**
   * Reset database back to seed template (clears tables)
   */
  public static async clearAllTables(): Promise<void> {
    const db = this.getDB();
    await this.initializeSchema();
    const tables = [
      'users', 'inventory', 'vendors', 'purchase_orders', 'purchase_items',
      'customers', 'loyalty_ledger', 'invoices', 'invoice_items',
      'service_tickets', 'scrap_entries', 'godown_transfers', 'backups_log', 'settings'
    ];
    for (const table of tables) {
      await db.run(`DELETE FROM ${table}`);
    }
  }
}
