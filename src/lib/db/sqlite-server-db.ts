import sqlite3 from 'sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Helper to determine OS-specific persistent database path
function getDbPath(): string {
  const isElectron = typeof process !== 'undefined' && (!!process.versions?.electron || !!process.env.ELECTRON_RUN_AS_NODE);
  if (isElectron) {
    const userData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const dbDir = path.join(userData, 'Ponmani Stores');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const targetDb = path.join(dbDir, 'ponmani_console.db');
    // On first run in Electron, if target doesn't exist, initialize from bundled db
    if (!fs.existsSync(targetDb)) {
      const candidates = [
        path.join(process.cwd(), 'ponmani_console.db'),
        path.join(process.cwd(), 'resources', 'app', 'ponmani_console.db'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            fs.copyFileSync(candidate, targetDb);
            console.log(`[SQLite Server] Initialized database from ${candidate}`);
            break;
          } catch (e) {
            console.warn(`[SQLite Server] Could not copy initial database:`, e);
          }
        }
      }
    }
    return targetDb;
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
  private static schemaInitialized = false;

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
    if (this.schemaInitialized) return;
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
        mrp REAL DEFAULT 0,
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
        phone TEXT,
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
        expected_date TEXT,
        status TEXT,
        total_amount REAL,
        paid_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS purchase_items (
        id TEXT PRIMARY KEY,
        po_id TEXT,
        product_id TEXT,
        product_name TEXT,
        qty REAL,
        unit TEXT,
        unit_price REAL,
        cost_price REAL,
        gst_rate REAL DEFAULT 0,
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
        mrp REAL DEFAULT 0,
        tax_rate REAL,
        total_price REAL,
        is_return INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS service_tickets (
        id TEXT PRIMARY KEY,
        ticket_number TEXT,
        queue_number TEXT,
        customer_id TEXT,
        customer_name TEXT,
        customer_mobile TEXT,
        device_name TEXT,
        serial_number TEXT,
        issue_description TEXT,
        estimated_cost REAL,
        advance_paid REAL,
        final_cost REAL DEFAULT 0,
        status TEXT,
        assigned_technician TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS scrap_entries (
        id TEXT PRIMARY KEY,
        customer_name TEXT,
        customer_mobile TEXT,
        item_type TEXT,
        item_description TEXT,
        weight_kg REAL,
        price_per_kg REAL,
        total_payout REAL,
        notes TEXT,
        is_exchange INTEGER DEFAULT 0,
        invoice_id TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS godown_transfers (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        product_name TEXT,
        transfer_type TEXT,
        qty REAL,
        source TEXT,
        destination TEXT,
        notes TEXT,
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

      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = -64000;
      PRAGMA temp_store = MEMORY;

      CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(barcode);
      CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);
      CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
      CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);

      PRAGMA optimize;
    `;
    await db.exec(tablesSql);

    // Auto-migrate missing columns for existing databases on disk
    const migrations = [
      `ALTER TABLE inventory ADD COLUMN mrp REAL DEFAULT 0;`,
      `ALTER TABLE invoices ADD COLUMN is_synced REAL DEFAULT 0;`,
      `ALTER TABLE invoice_items ADD COLUMN is_return INTEGER DEFAULT 0;`,
      `ALTER TABLE invoice_items ADD COLUMN mrp REAL DEFAULT 0;`,
      `ALTER TABLE vendors ADD COLUMN balance_due REAL DEFAULT 0;`,
      `ALTER TABLE vendors ADD COLUMN phone TEXT;`,
      `ALTER TABLE vendors ADD COLUMN email TEXT;`,
      `ALTER TABLE purchase_orders ADD COLUMN paid_amount REAL DEFAULT 0;`,
      `ALTER TABLE purchase_orders ADD COLUMN expected_date TEXT;`,
      `ALTER TABLE purchase_orders ADD COLUMN tax_amount REAL DEFAULT 0;`,
      `ALTER TABLE purchase_orders ADD COLUMN discount_amount REAL DEFAULT 0;`,
      `ALTER TABLE purchase_items ADD COLUMN cost_price REAL DEFAULT 0;`,
      `ALTER TABLE purchase_items ADD COLUMN total REAL DEFAULT 0;`,
      `ALTER TABLE purchase_items ADD COLUMN unit TEXT;`,
      `ALTER TABLE purchase_items ADD COLUMN gst_rate REAL DEFAULT 0;`,
      `ALTER TABLE invoices ADD COLUMN exchange_amount REAL DEFAULT 0;`,
      `ALTER TABLE invoices ADD COLUMN exchange_notes TEXT;`,
      `ALTER TABLE service_tickets ADD COLUMN queue_number TEXT;`,
      `ALTER TABLE service_tickets ADD COLUMN customer_id TEXT;`,
      `ALTER TABLE service_tickets ADD COLUMN serial_number TEXT;`,
      `ALTER TABLE service_tickets ADD COLUMN final_cost REAL DEFAULT 0;`,
      `ALTER TABLE service_tickets ADD COLUMN updated_at TEXT;`,
      `ALTER TABLE scrap_entries ADD COLUMN item_type TEXT;`,
      `ALTER TABLE scrap_entries ADD COLUMN notes TEXT;`,
      `ALTER TABLE scrap_entries ADD COLUMN is_exchange INTEGER DEFAULT 0;`,
      `ALTER TABLE scrap_entries ADD COLUMN invoice_id TEXT;`,
      `ALTER TABLE godown_transfers ADD COLUMN transfer_type TEXT;`,
      `ALTER TABLE godown_transfers ADD COLUMN notes TEXT;`,
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
    this.schemaInitialized = true;
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
      if (table === 'vendors') {
        rows.forEach((r: any) => {
          r.phone = r.phone || r.mobile || '';
          r.mobile = r.mobile || r.phone || '';
        });
      }
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

    if (table === 'vendors') {
      if (data.phone && !data.mobile) data.mobile = data.phone;
      if (data.mobile && !data.phone) data.phone = data.mobile;
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

  /**
   * High-performance bulk seed store in a single SQLite transaction
   */
  public static async bulkSeedStore(store: any): Promise<void> {
    const db = this.getDB();
    await this.initializeSchema();

    await db.exec('BEGIN TRANSACTION;');
    try {
      const tables = [
        'users', 'inventory', 'vendors', 'purchase_orders', 'purchase_items',
        'customers', 'loyalty_ledger', 'invoices', 'invoice_items',
        'service_tickets', 'scrap_entries', 'godown_transfers', 'backups_log', 'settings'
      ];

      for (const table of tables) {
        await db.run(`DELETE FROM ${table}`);
      }

      for (const table of tables) {
        if (table === 'settings') {
          const settingsObj = store.settings || {};
          for (const [key, value] of Object.entries(settingsObj)) {
            const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
            await db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, val]);
          }
          continue;
        }

        const rows = store[table] || [];
        if (!rows.length) continue;

        const tableCols = await this.getTableColumns(table);
        for (const data of rows) {
          if (table === 'vendors') {
            if (data.phone && !data.mobile) data.mobile = data.phone;
            if (data.mobile && !data.phone) data.phone = data.mobile;
          }

          let keys = Object.keys(data);
          if (tableCols.size > 0) {
            keys = keys.filter((k) => tableCols.has(k));
          }
          if (keys.length === 0) continue;

          const placeholders = keys.map(() => '?').join(', ');
          const columns = keys.join(', ');
          const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));

          const sql = `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`;
          await db.run(sql, values);
        }
      }

      await db.exec('COMMIT;');
    } catch (err) {
      await db.exec('ROLLBACK;');
      throw err;
    }
  }

  /**
   * Reset transactions only: wipes invoices, sales, service tickets while keeping inventory & settings
   */
  public static async clearTransactionsOnly(): Promise<void> {
    const db = this.getDB();
    await this.initializeSchema();
    await db.exec('BEGIN TRANSACTION;');
    try {
      const txTables = [
        'invoices', 'invoice_items', 'service_tickets', 'scrap_entries',
        'godown_transfers', 'purchase_orders', 'purchase_items', 'loyalty_ledger'
      ];
      for (const table of txTables) {
        await db.run(`DELETE FROM ${table}`);
      }
      await db.run(`UPDATE customers SET balance_due = 0`);
      await db.run(`UPDATE vendors SET balance_due = 0`);
      await db.exec('COMMIT;');
    } catch (err) {
      await db.exec('ROLLBACK;');
      throw err;
    }
  }

  /**
   * Full Factory Reset: wipes store data and re-provisions for a clean new store
   */
  public static async factoryResetStore(options?: {
    shop_name?: string;
    shop_address?: string;
    shop_phone?: string;
    shop_gstin?: string;
    receipt_header_note?: string;
    receipt_footer_note?: string;
    keepProducts?: boolean;
  }): Promise<void> {
    const db = this.getDB();
    await this.initializeSchema();
    await db.exec('BEGIN TRANSACTION;');
    try {
      const allTables = [
        'invoices', 'invoice_items', 'service_tickets', 'scrap_entries',
        'godown_transfers', 'purchase_orders', 'purchase_items', 'loyalty_ledger',
        'customers', 'vendors', 'backups_log'
      ];
      if (!options?.keepProducts) {
        allTables.push('inventory');
      }
      for (const table of allTables) {
        await db.run(`DELETE FROM ${table}`);
      }

      // Ensure default admin user exists
      await db.run(`DELETE FROM users`);
      await db.run(
        `INSERT INTO users (id, username, pin, role, created_at) VALUES (?, ?, ?, ?, ?)`,
        ['usr-admin-1', 'admin', '1234', 'Admin', new Date().toISOString()]
      );

      // Re-provision settings for the new store
      const newSettings: Record<string, string> = {
        shop_name: options?.shop_name || 'My Retail Store',
        shop_address: options?.shop_address || 'Main Road, Market Center',
        shop_phone: options?.shop_phone || '+91 98765 43210',
        shop_gstin: options?.shop_gstin || '',
        receipt_header_note: options?.receipt_header_note || 'Retail & Service Management',
        receipt_footer_note: options?.receipt_footer_note || 'Goods once sold can be exchanged with valid bill.',
        thermal_printer_width: '80mm',
        app_lang: 'en'
      };

      for (const [key, value] of Object.entries(newSettings)) {
        await db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, String(value)]);
      }

      await db.exec('COMMIT;');
    } catch (err) {
      await db.exec('ROLLBACK;');
      throw err;
    }
  }
}

