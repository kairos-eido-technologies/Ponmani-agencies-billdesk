import Dexie, { type Table } from 'dexie';
import { generateUtensilsSeedData } from './seed-utensils';

/**
 * Ponmani Agencies Offline - Local Relational Database Engine
 * Zero internet dependency. Powered by Dexie (IndexedDB) for high-performance scale,
 * supporting 1,000,000+ data rows with synchronous memory cache access for the UI.
 */

export interface User {
  id: string;
  username: string;
  pin: string;
  role: 'Admin' | 'Cashier';
  created_at: string;
}

export interface InventoryItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  godown_qty: number;
  moq: number;
  min_stock_alert: number;
  sku_code?: string;
  gst_rate: number;
  image_path?: string;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  company_name: string;
  phone: string;
  email: string;
  gst_number: string;
  address: string;
  balance_due: number;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor_name: string;
  status: 'Draft' | 'Ordered' | 'Received';
  total_amount: number;
  paid_amount: number;
  tax_amount?: number;
  discount_amount?: number;
  notes?: string;
  expected_date?: string;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  po_id: string;
  product_id?: string;
  product_name: string;
  qty: number;
  unit?: string;
  cost_price: number;
  gst_rate?: number;
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  gst_number: string;
  loyalty_points: number;
  total_spent: number;
  created_at: string;
}

export interface LoyaltyLedger {
  id: string;
  customer_id: string;
  points_change: number;
  reason: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  customer_mobile: string;
  invoice_type: 'GST' | 'NON_GST' | 'MIXED';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  exchange_amount?: number;
  exchange_notes?: string;
  grand_total: number;
  payment_method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
  payment_status: 'PAID' | 'PENDING';
  created_at: string;
  is_synced?: number; // 0 = unsynced, 1 = synced
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  barcode: string;
  product_name: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  total_price: number;
  is_return?: boolean;
}

export interface ServiceTicket {
  id: string;
  ticket_number: string;
  queue_number?: string;
  customer_id?: string;
  customer_name: string;
  customer_mobile: string;
  device_name: string;
  serial_number: string;
  issue_description: string;
  estimated_cost: number;
  final_cost: number;
  status: 'Intake' | 'In Progress' | 'Ready' | 'Delivered';
  created_at: string;
  updated_at: string;
}

export interface ScrapEntry {
  id: string;
  customer_name: string;
  customer_mobile: string;
  item_type: string;
  weight_kg: number;
  price_per_kg: number;
  total_payout: number;
  notes: string;
  created_at: string;
  is_exchange?: boolean;
  invoice_id?: string;
}

export interface GodownTransfer {
  id: string;
  product_id: string;
  product_name: string;
  transfer_type: 'SHOP_TO_GODOWN' | 'GODOWN_TO_SHOP';
  qty: number;
  notes: string;
  created_at: string;
}

export interface BackupLog {
  id: string;
  filename: string;
  type: 'MANUAL' | 'SCHEDULED';
  timestamp: string;
  size_kb: number;
  status: 'SUCCESS' | 'FAILED';
}

export interface DBStore {
  users: User[];
  inventory: InventoryItem[];
  vendors: Vendor[];
  purchase_orders: PurchaseOrder[];
  purchase_items: PurchaseItem[];
  customers: Customer[];
  loyalty_ledger: LoyaltyLedger[];
  invoices: Invoice[];
  invoice_items: InvoiceItem[];
  service_tickets: ServiceTicket[];
  scrap_entries: ScrapEntry[];
  godown_transfers: GodownTransfer[];
  backups_log: BackupLog[];
  settings: Record<string, any>;
}

const INITIAL_SEED: DBStore = {
  users: [
    {
      id: 'usr-1',
      username: 'admin',
      pin: '1234',
      role: 'Admin',
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-2',
      username: 'cashier',
      pin: '0000',
      role: 'Cashier',
      created_at: new Date().toISOString(),
    },
  ],
  inventory: [],
  vendors: [],
  purchase_orders: [],
  purchase_items: [],
  customers: [],
  loyalty_ledger: [],
  invoices: [],
  invoice_items: [],
  service_tickets: [],
  scrap_entries: [],
  godown_transfers: [],
  backups_log: [],
  settings: {
    shop_name: 'Ponmani Agencies',
    shop_address: '142 Main Road, Tenkasi, Tamil Nadu - 627811',
    shop_phone: '+91 94422 12345',
    shop_gstin: '33AAPFP1234H1Z9',
    receipt_header_note: 'Hardware • Electricals • Electronics',
    receipt_footer_note: 'Goods once sold can be exchanged within 7 days with original receipt. Thank you for your business!',
    service_ticket_terms: 'Present this receipt token during device collection. Goods left unclaimed over 30 days are subject to shop terms. Thank you for your business!',
    po_footer_terms: 'Please acknowledge receipt of this Purchase Order and confirm delivery schedule.',
    printer_type: 'Thermal ESC/POS 80mm',
    printer_name: 'POS-80 Series',
    auto_backup_enabled: true,
    auto_backup_frequency: 'Daily',
    retain_backups_count: 30,
    scanner_prefix: '',
    scanner_suffix: 'Enter',
  },
};

let isSyncingFromSQLite = false;

function postRowToSQLite(action: 'upsert' | 'delete' | 'reset', table?: string, data?: any, id?: any): Promise<any> | void {
  if (isSyncingFromSQLite) return;
  if (typeof window === 'undefined') return;

  return fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, table, data, id }),
  }).catch((err) => {
    console.warn('[SQLite Sync Error] Failed mirroring to server:', err);
  });
}

function postInvoiceToSQLite(invoice: any, items: any[]): Promise<any> | void {
  if (isSyncingFromSQLite) return;
  if (typeof window === 'undefined') return;

  return fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upsert_invoice',
      invoice,
      items,
    }),
  }).catch((err) => {
    console.warn('[SQLite Sync Error] Failed mirroring invoice to server:', err);
  });
}

// Dexie Database Declaration
class PonmaniDatabase extends Dexie {
  users!: Table<User>;
  inventory!: Table<InventoryItem>;
  vendors!: Table<Vendor>;
  purchase_orders!: Table<PurchaseOrder>;
  purchase_items!: Table<PurchaseItem>;
  customers!: Table<Customer>;
  loyalty_ledger!: Table<LoyaltyLedger>;
  invoices!: Table<Invoice>;
  invoice_items!: Table<InvoiceItem>;
  service_tickets!: Table<ServiceTicket>;
  scrap_entries!: Table<ScrapEntry>;
  godown_transfers!: Table<GodownTransfer>;
  backups_log!: Table<BackupLog>;
  settings!: Table<{ key: string; value: any }>;

  constructor() {
    super('PonmaniDatabase');
    this.version(1).stores({
      users: 'id, username',
      inventory: 'id, barcode, name, category',
      vendors: 'id, name, company_name',
      purchase_orders: 'id, po_number, vendor_id',
      purchase_items: 'id, po_id, product_id',
      customers: 'id, mobile, name',
      loyalty_ledger: 'id, customer_id',
      invoices: 'id, invoice_number, customer_id, created_at',
      invoice_items: 'id, invoice_id, product_id, barcode',
      service_tickets: 'id, ticket_number, customer_id',
      scrap_entries: 'id, customer_mobile',
      godown_transfers: 'id, product_id',
      backups_log: 'id',
      settings: 'key',
    });
    this.version(2).stores({
      invoices: 'id, invoice_number, customer_id, created_at, is_synced',
    });

    // Automatically mirror writes to local SQLite server in background
    const tables = [
      'users', 'inventory', 'vendors', 'purchase_orders', 'purchase_items',
      'customers', 'loyalty_ledger',
      'service_tickets', 'scrap_entries', 'godown_transfers', 'backups_log', 'settings'
    ];

    tables.forEach((tableName) => {
      this.table(tableName).hook('creating', (primKey, obj) => {
        postRowToSQLite('upsert', tableName, obj);
      });
      this.table(tableName).hook('updating', (modifications, primKey, obj) => {
        const updatedObj = { ...obj, ...modifications };
        postRowToSQLite('upsert', tableName, updatedObj);
      });
      this.table(tableName).hook('deleting', (primKey) => {
        postRowToSQLite('delete', tableName, undefined, primKey);
      });
    });
  }
}

class OfflineDB {
  private memoryData: DBStore;
  private dexieDb!: PonmaniDatabase;
  public isLoaded = false;
  public loadPromise: Promise<void>;

  constructor() {
    this.memoryData = { ...INITIAL_SEED };
    
    if (typeof window === 'undefined') {
      this.isLoaded = true;
      this.loadPromise = Promise.resolve();
    } else {
      this.dexieDb = new PonmaniDatabase();
      this.loadPromise = this.loadFromIndexedDB();
    }
  }

  private async loadFromIndexedDB() {
    // 1. Try to fetch from the server-side SQLite API first
    try {
      const response = await fetch('/api/db');
      if (response.ok) {
        const store = await response.json();
        // If server SQLite database is empty (e.g. newly initialized), initialize with seed
        if (!store.users || store.users.length === 0) {
          console.log('[SQLite Server] SQLite database is empty. Seeding initial data...');
          this.memoryData = { ...INITIAL_SEED };
          this.isLoaded = true;
          // Seed the SQLite server in background
          await this.syncLocalStoreToSQLite(INITIAL_SEED);
          // Sync local IndexedDB fallback cache
          await this.syncLocalStoreToIndexedDB(INITIAL_SEED);
          return;
        }

        // Initialize cache with SQLite store data
        this.memoryData = {
          users: store.users || [],
          inventory: store.inventory || [],
          vendors: store.vendors || [],
          purchase_orders: store.purchase_orders || [],
          purchase_items: store.purchase_items || [],
          customers: store.customers || [],
          loyalty_ledger: store.loyalty_ledger || [],
          invoices: store.invoices || [],
          invoice_items: store.invoice_items || [],
          service_tickets: store.service_tickets || [],
          scrap_entries: store.scrap_entries || [],
          godown_transfers: store.godown_transfers || [],
          backups_log: store.backups_log || [],
          settings: { ...INITIAL_SEED.settings, ...store.settings },
        };
        this.isLoaded = true;

        // Sync local IndexedDB fallback cache in background
        this.syncLocalStoreToIndexedDB(this.memoryData).catch(console.error);
        return;
      }
    } catch (e) {
      console.warn('[SQLite Server] API unavailable, falling back to local browser IndexedDB:', e);
    }

    // 2. Fallback: Load from local IndexedDB if server is not reachable
    try {
      const [
        users,
        inventory,
        vendors,
        purchase_orders,
        purchase_items,
        customers,
        loyalty_ledger,
        invoices,
        invoice_items,
        service_tickets,
        scrap_entries,
        godown_transfers,
        backups_log,
        settingsArr,
      ] = await Promise.all([
        this.dexieDb.users.toArray(),
        this.dexieDb.inventory.toArray(),
        this.dexieDb.vendors.toArray(),
        this.dexieDb.purchase_orders.toArray(),
        this.dexieDb.purchase_items.toArray(),
        this.dexieDb.customers.toArray(),
        this.dexieDb.loyalty_ledger.toArray(),
        this.dexieDb.invoices.toArray(),
        this.dexieDb.invoice_items.toArray(),
        this.dexieDb.service_tickets.toArray(),
        this.dexieDb.scrap_entries.toArray(),
        this.dexieDb.godown_transfers.toArray(),
        this.dexieDb.backups_log.toArray(),
        this.dexieDb.settings.toArray(),
      ]);

      const settings: Record<string, any> = {};
      settingsArr.forEach((s) => {
        settings[s.key] = s.value;
      });

      if (users.length === 0) {
        await this.seedInitialData();
      } else {
        this.memoryData = {
          users,
          inventory,
          vendors,
          purchase_orders,
          purchase_items,
          customers,
          loyalty_ledger,
          invoices,
          invoice_items,
          service_tickets,
          scrap_entries,
          godown_transfers,
          backups_log,
          settings: { ...INITIAL_SEED.settings, ...settings },
        };
      }
    } catch (err) {
      console.error('Failed loading IndexedDB database, falling back to seed:', err);
      this.memoryData = { ...INITIAL_SEED };
    } finally {
      this.isLoaded = true;
    }
  }

  private async syncLocalStoreToSQLite(store: DBStore) {
    try {
      isSyncingFromSQLite = true;
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_seed', store }),
      });
      isSyncingFromSQLite = false;
    } catch (e) {
      console.error('[SQLite Server] Seeding/Syncing store failed:', e);
      isSyncingFromSQLite = false;
    }
  }

  private async syncLocalStoreToIndexedDB(store: DBStore) {
    try {
      isSyncingFromSQLite = true;
      await Promise.all([
        this.dexieDb.users.clear(),
        this.dexieDb.inventory.clear(),
        this.dexieDb.vendors.clear(),
        this.dexieDb.purchase_orders.clear(),
        this.dexieDb.purchase_items.clear(),
        this.dexieDb.customers.clear(),
        this.dexieDb.loyalty_ledger.clear(),
        this.dexieDb.invoices.clear(),
        this.dexieDb.invoice_items.clear(),
        this.dexieDb.service_tickets.clear(),
        this.dexieDb.scrap_entries.clear(),
        this.dexieDb.godown_transfers.clear(),
        this.dexieDb.backups_log.clear(),
        this.dexieDb.settings.clear(),
      ]);

      await Promise.all([
        this.dexieDb.users.bulkAdd(store.users),
        this.dexieDb.inventory.bulkAdd(store.inventory),
        this.dexieDb.vendors.bulkAdd(store.vendors),
        this.dexieDb.purchase_orders.bulkAdd(store.purchase_orders),
        this.dexieDb.purchase_items.bulkAdd(store.purchase_items),
        this.dexieDb.customers.bulkAdd(store.customers),
        this.dexieDb.loyalty_ledger.bulkAdd(store.loyalty_ledger),
        this.dexieDb.invoices.bulkAdd(store.invoices),
        this.dexieDb.invoice_items.bulkAdd(store.invoice_items),
        this.dexieDb.service_tickets.bulkAdd(store.service_tickets),
        this.dexieDb.scrap_entries.bulkAdd(store.scrap_entries),
        this.dexieDb.godown_transfers.bulkAdd(store.godown_transfers),
        this.dexieDb.backups_log.bulkAdd(store.backups_log),
        this.dexieDb.settings.bulkAdd(Object.entries(store.settings).map(([k, v]) => ({ key: k, value: v }))),
      ]);
      isSyncingFromSQLite = false;
    } catch (e) {
      console.warn('[IndexedDB Fallback Cache] Syncing failed:', e);
      isSyncingFromSQLite = false;
    }
  }

  public async pullServerUpdates() {
    try {
      const response = await fetch('/api/db');
      if (response.ok) {
        const store = await response.json();
        
        isSyncingFromSQLite = true;
        this.memoryData = {
          users: store.users || [],
          inventory: store.inventory || [],
          vendors: store.vendors || [],
          purchase_orders: store.purchase_orders || [],
          purchase_items: store.purchase_items || [],
          customers: store.customers || [],
          loyalty_ledger: store.loyalty_ledger || [],
          invoices: store.invoices || [],
          invoice_items: store.invoice_items || [],
          service_tickets: store.service_tickets || [],
          scrap_entries: store.scrap_entries || [],
          godown_transfers: store.godown_transfers || [],
          backups_log: store.backups_log || [],
          settings: { ...INITIAL_SEED.settings, ...store.settings },
        };
        
        await this.syncLocalStoreToIndexedDB(this.memoryData);
        isSyncingFromSQLite = false;
      }
    } catch (e) {
      console.warn('[SQLite Server Refresh] Failed polling updates:', e);
      isSyncingFromSQLite = false;
    }
  }

  private async seedInitialData() {
    this.memoryData = { ...INITIAL_SEED };
    try {
      await Promise.all([
        this.dexieDb.users.bulkAdd(INITIAL_SEED.users),
        this.dexieDb.settings.bulkAdd(
          Object.entries(INITIAL_SEED.settings).map(([key, value]) => ({ key, value }))
        ),
      ]);
    } catch (err) {
      console.error('Seeding database failed:', err);
    }
  }

  public getStore(): DBStore {
    return this.memoryData;
  }

  public async resetToSeed() {
    try {
      await Promise.all([
        this.dexieDb.users.clear(),
        this.dexieDb.inventory.clear(),
        this.dexieDb.vendors.clear(),
        this.dexieDb.purchase_orders.clear(),
        this.dexieDb.purchase_items.clear(),
        this.dexieDb.customers.clear(),
        this.dexieDb.loyalty_ledger.clear(),
        this.dexieDb.invoices.clear(),
        this.dexieDb.invoice_items.clear(),
        this.dexieDb.service_tickets.clear(),
        this.dexieDb.scrap_entries.clear(),
        this.dexieDb.godown_transfers.clear(),
        this.dexieDb.backups_log.clear(),
        this.dexieDb.settings.clear(),
      ]);
      await this.seedInitialData();
    } catch (err) {
      console.error('Failed resetting Dexie database:', err);
    }
    return this.memoryData;
  }

  public async wipeAndSeedUtensils(onProgress?: (msg: string) => void): Promise<void> {
    const log = (msg: string) => { console.log('[Seed]', msg); onProgress?.(msg); };

    log('Generating utensils seed data...');
    const seed = generateUtensilsSeedData();

    log('Resetting SQLite server database...');
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
    } catch (e) { console.warn('[Seed] SQLite reset failed (offline mode):', e); }

    log('Clearing local IndexedDB...');
    await Promise.all([
      this.dexieDb.inventory.clear(),
      this.dexieDb.vendors.clear(),
      this.dexieDb.purchase_orders.clear(),
      this.dexieDb.purchase_items.clear(),
      this.dexieDb.customers.clear(),
      this.dexieDb.loyalty_ledger.clear(),
      this.dexieDb.invoices.clear(),
      this.dexieDb.invoice_items.clear(),
      this.dexieDb.service_tickets.clear(),
      this.dexieDb.scrap_entries.clear(),
      this.dexieDb.godown_transfers.clear(),
      this.dexieDb.backups_log.clear(),
      this.dexieDb.settings.clear(),
    ]);

    isSyncingFromSQLite = true;
    log('Writing inventory & vendors...');
    await this.dexieDb.inventory.bulkAdd(seed.inventory);
    await this.dexieDb.vendors.bulkAdd(seed.vendors);

    log(`Writing ${seed.customers.length} customers...`);
    await this.dexieDb.customers.bulkAdd(seed.customers);

    log(`Writing ${seed.purchase_orders.length} purchase orders & ${seed.purchase_items.length} items...`);
    await this.dexieDb.purchase_orders.bulkAdd(seed.purchase_orders);
    await this.dexieDb.purchase_items.bulkAdd(seed.purchase_items);

    const INV_BATCH = 500;
    for (let i = 0; i < seed.invoices.length; i += INV_BATCH) {
      const current = Math.min(i + INV_BATCH, seed.invoices.length);
      log(`Writing invoices (${current} / ${seed.invoices.length})...`);
      await this.dexieDb.invoices.bulkAdd(seed.invoices.slice(i, current));
    }

    const II_BATCH = 1500;
    for (let i = 0; i < seed.invoice_items.length; i += II_BATCH) {
      const current = Math.min(i + II_BATCH, seed.invoice_items.length);
      log(`Writing invoice line items (${current} / ${seed.invoice_items.length})...`);
      await this.dexieDb.invoice_items.bulkAdd(seed.invoice_items.slice(i, current));
    }

    log('Writing service tickets, scrap & transfers...');
    await this.dexieDb.service_tickets.bulkAdd(seed.service_tickets);
    await this.dexieDb.scrap_entries.bulkAdd(seed.scrap_entries);
    await this.dexieDb.godown_transfers.bulkAdd(seed.godown_transfers);
    await this.dexieDb.loyalty_ledger.bulkAdd(seed.loyalty_ledger);

    log('Writing settings...');
    await this.dexieDb.settings.bulkAdd(
      Object.entries(seed.settings).map(([key, value]) => ({ key, value }))
    );
    isSyncingFromSQLite = false;

    // Update memory cache immediately
    this.memoryData = {
      users: this.memoryData.users,
      inventory: seed.inventory,
      vendors: seed.vendors,
      customers: seed.customers,
      purchase_orders: seed.purchase_orders,
      purchase_items: seed.purchase_items,
      invoices: [...seed.invoices].reverse(),
      invoice_items: seed.invoice_items,
      loyalty_ledger: seed.loyalty_ledger,
      service_tickets: [...seed.service_tickets].reverse(),
      scrap_entries: [...seed.scrap_entries].reverse(),
      godown_transfers: [...seed.godown_transfers].reverse(),
      backups_log: [],
      settings: seed.settings as any,
    };

    // Sync to SQLite server (instant bulk_seed single transaction)
    log('Syncing to server database...');
    await this.syncLocalStoreToSQLite(this.memoryData);
    log('Seed complete!');
  }

  public async restoreFullBackup(newData: DBStore) {
    this.memoryData = newData;
    try {
      await this.dexieDb.transaction(
        'rw',
        [
          this.dexieDb.users,
          this.dexieDb.inventory,
          this.dexieDb.vendors,
          this.dexieDb.purchase_orders,
          this.dexieDb.purchase_items,
          this.dexieDb.customers,
          this.dexieDb.loyalty_ledger,
          this.dexieDb.invoices,
          this.dexieDb.invoice_items,
          this.dexieDb.service_tickets,
          this.dexieDb.scrap_entries,
          this.dexieDb.godown_transfers,
          this.dexieDb.backups_log,
          this.dexieDb.settings,
        ],
        async () => {
          await Promise.all([
            this.dexieDb.users.clear(),
            this.dexieDb.inventory.clear(),
            this.dexieDb.vendors.clear(),
            this.dexieDb.purchase_orders.clear(),
            this.dexieDb.purchase_items.clear(),
            this.dexieDb.customers.clear(),
            this.dexieDb.loyalty_ledger.clear(),
            this.dexieDb.invoices.clear(),
            this.dexieDb.invoice_items.clear(),
            this.dexieDb.service_tickets.clear(),
            this.dexieDb.scrap_entries.clear(),
            this.dexieDb.godown_transfers.clear(),
            this.dexieDb.backups_log.clear(),
            this.dexieDb.settings.clear(),
          ]);

          await Promise.all([
            this.dexieDb.users.bulkAdd(newData.users || []),
            this.dexieDb.inventory.bulkAdd(newData.inventory || []),
            this.dexieDb.vendors.bulkAdd(newData.vendors || []),
            this.dexieDb.purchase_orders.bulkAdd(newData.purchase_orders || []),
            this.dexieDb.purchase_items.bulkAdd(newData.purchase_items || []),
            this.dexieDb.customers.bulkAdd(newData.customers || []),
            this.dexieDb.loyalty_ledger.bulkAdd(newData.loyalty_ledger || []),
            this.dexieDb.invoices.bulkAdd(newData.invoices || []),
            this.dexieDb.invoice_items.bulkAdd(newData.invoice_items || []),
            this.dexieDb.service_tickets.bulkAdd(newData.service_tickets || []),
            this.dexieDb.scrap_entries.bulkAdd(newData.scrap_entries || []),
            this.dexieDb.godown_transfers.bulkAdd(newData.godown_transfers || []),
            this.dexieDb.backups_log.bulkAdd(newData.backups_log || []),
            this.dexieDb.settings.bulkAdd(
              Object.entries(newData.settings || {}).map(([key, value]) => ({ key, value }))
            ),
          ]);
        }
      );
      return true;
    } catch (err) {
      console.error('Failed database restore:', err);
      return false;
    }
  }

  // --- QUERY METHODS ---

  // Auth & Users
  public getUsers(): User[] {
    return this.memoryData.users;
  }

  public authenticate(username: string, pin: string): User | null {
    const user = this.memoryData.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.pin === pin
    );
    return user || null;
  }

  public saveUser(user: Partial<User> & { username: string; pin: string; role: 'Admin' | 'Cashier' }) {
    if (user.id) {
      const idx = this.memoryData.users.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        const updated = { ...this.memoryData.users[idx], ...user };
        this.memoryData.users[idx] = updated;
        this.dexieDb.users.put(updated).catch(console.error);
      }
    } else {
      const newUser: User = {
        id: 'usr-' + Date.now(),
        username: user.username,
        pin: user.pin,
        role: user.role,
        created_at: new Date().toISOString(),
      };
      this.memoryData.users.push(newUser);
      this.dexieDb.users.add(newUser).catch(console.error);
    }
  }

  // Inventory
  public getInventory(): InventoryItem[] {
    return this.memoryData.inventory;
  }

  public getProductByBarcode(barcode: string): InventoryItem | undefined {
    const clean = barcode.trim();
    return this.memoryData.inventory.find((i) => i.barcode === clean);
  }

  public saveInventoryItem(item: Partial<InventoryItem> & { name: string; selling_price: number }) {
    if (item.id) {
      const idx = this.memoryData.inventory.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const updated = { ...this.memoryData.inventory[idx], ...item };
        this.memoryData.inventory[idx] = updated;
        this.dexieDb.inventory.put(updated).catch(console.error);
      }
    } else {
      const newItem: InventoryItem = {
        id: 'prod-' + Date.now(),
        barcode: item.barcode || 'PMA' + Math.floor(100000 + Math.random() * 900000),
        name: item.name,
        category: item.category || 'General',
        unit: item.unit || 'Piece',
        cost_price: Number(item.cost_price) || 0,
        selling_price: Number(item.selling_price) || 0,
        stock_qty: Number(item.stock_qty) || 0,
        godown_qty: Number(item.godown_qty) || 0,
        moq: Number(item.moq) || 1,
        min_stock_alert: Number(item.min_stock_alert) || 5,
        sku_code: item.sku_code || item.barcode || ('PMA' + Math.floor(100000 + Math.random() * 900000)),
        gst_rate: Number(item.gst_rate) || 18,
        image_path: item.image_path || '',
        created_at: new Date().toISOString(),
      };
      this.memoryData.inventory.unshift(newItem);
      this.dexieDb.inventory.add(newItem).catch(console.error);
    }
  }

  public deleteInventoryItem(id: string) {
    this.memoryData.inventory = this.memoryData.inventory.filter((i) => i.id !== id);
    this.dexieDb.inventory.delete(id).catch(console.error);
  }

  public bulkImportInventory(items: Partial<InventoryItem>[]): { success: boolean; count: number; errors: string[] } {
    const errors: string[] = [];
    const barcodesSeen = new Set(this.memoryData.inventory.map((i) => i.barcode));
    const validated: InventoryItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      if (!raw.name) {
        errors.push(`Row ${i + 1}: Missing product name`);
        continue;
      }
      const barcode = raw.barcode?.toString().trim() || ('PMA' + Math.floor(100000 + Math.random() * 900000));
      if (barcodesSeen.has(barcode)) {
        errors.push(`Row ${i + 1}: Duplicate barcode ${barcode}`);
        continue;
      }
      barcodesSeen.add(barcode);

      validated.push({
        id: 'prod-' + Date.now() + '-' + i,
        barcode,
        name: raw.name,
        category: raw.category || 'General',
        unit: raw.unit || 'Piece',
        cost_price: Number(raw.cost_price) || 0,
        selling_price: Number(raw.selling_price) || 0,
        stock_qty: Number(raw.stock_qty) || 0,
        godown_qty: Number(raw.godown_qty) || 0,
        moq: Number(raw.moq) || 1,
        min_stock_alert: Number(raw.min_stock_alert) || 5,
        sku_code: raw.sku_code || barcode,
        gst_rate: Number(raw.gst_rate) || 18,
        image_path: raw.image_path || '',
        created_at: new Date().toISOString(),
      });
    }

    if (errors.length > 0) {
      return { success: false, count: 0, errors };
    }

    this.memoryData.inventory.unshift(...validated);
    this.dexieDb.inventory.bulkAdd(validated).catch(console.error);
    return { success: true, count: validated.length, errors: [] };
  }

  // Vendors & Purchases
  public getVendors(): Vendor[] {
    return this.memoryData.vendors;
  }

  public saveVendor(vendor: Partial<Vendor> & { name: string }) {
    let savedVendor: Vendor;
    if (vendor.id) {
      const idx = this.memoryData.vendors.findIndex((v) => v.id === vendor.id);
      if (idx >= 0) {
        savedVendor = { ...this.memoryData.vendors[idx], ...vendor };
        this.memoryData.vendors[idx] = savedVendor;
        this.dexieDb.vendors.put(savedVendor).catch(console.error);
      } else {
        savedVendor = {
          id: vendor.id,
          name: vendor.name,
          company_name: vendor.company_name || vendor.name,
          phone: vendor.phone || '',
          email: vendor.email || '',
          gst_number: vendor.gst_number || '',
          address: vendor.address || '',
          balance_due: Number(vendor.balance_due) || 0,
          created_at: new Date().toISOString(),
        };
        this.memoryData.vendors.unshift(savedVendor);
        this.dexieDb.vendors.put(savedVendor).catch(console.error);
      }
    } else {
      savedVendor = {
        id: 'ven-' + Date.now(),
        name: vendor.name,
        company_name: vendor.company_name || vendor.name,
        phone: vendor.phone || '',
        email: vendor.email || '',
        gst_number: vendor.gst_number || '',
        address: vendor.address || '',
        balance_due: Number(vendor.balance_due) || 0,
        created_at: new Date().toISOString(),
      };
      this.memoryData.vendors.unshift(savedVendor);
      this.dexieDb.vendors.add(savedVendor).catch(console.error);
    }
    postRowToSQLite('upsert', 'vendors', savedVendor);
  }

  public deleteVendor(id: string) {
    this.memoryData.vendors = this.memoryData.vendors.filter((v) => v.id !== id);
    this.dexieDb.vendors.delete(id).catch(console.error);
    postRowToSQLite('delete', 'vendors', undefined, id);
  }

  public getPurchaseOrders(): { order: PurchaseOrder; items: PurchaseItem[] }[] {
    return this.memoryData.purchase_orders.map((po) => ({
      order: po,
      items: this.memoryData.purchase_items.filter((pi) => pi.po_id === po.id),
    }));
  }

  public getPurchaseOrder(id: string): { order: PurchaseOrder; items: PurchaseItem[] } | null {
    const order = this.memoryData.purchase_orders.find((po) => po.id === id);
    if (!order) return null;
    const items = this.memoryData.purchase_items.filter((pi) => pi.po_id === id);
    return { order, items };
  }

  public savePurchaseOrder(
    poData: Partial<PurchaseOrder> & { vendor_id: string; status: 'Draft' | 'Ordered' | 'Received'; paid_amount: number },
    items: { product_id?: string; product_name: string; qty: number; unit?: string; cost_price: number; gst_rate?: number; update_inventory_cost?: boolean }[]
  ): PurchaseOrder {
    const isEdit = Boolean(poData.id);
    const vendor = this.memoryData.vendors.find((v) => v.id === poData.vendor_id);
    const vendorName = vendor?.company_name || vendor?.name || poData.vendor_name || 'Vendor';

    let oldPO: PurchaseOrder | undefined;
    let oldItems: PurchaseItem[] = [];

    if (isEdit) {
      oldPO = this.memoryData.purchase_orders.find((p) => p.id === poData.id);
      oldItems = this.memoryData.purchase_items.filter((pi) => pi.po_id === poData.id);
    }

    // Revert stock from old PO if it was Received
    if (oldPO && oldPO.status === 'Received') {
      oldItems.forEach((pi) => {
        if (pi.product_id) {
          const inv = this.memoryData.inventory.find((i) => i.id === pi.product_id);
          if (inv) {
            inv.stock_qty = Math.max(0, inv.stock_qty - pi.qty);
            this.dexieDb.inventory.put(inv).catch(console.error);
          }
        }
      });
    }

    // Revert vendor balance from old PO
    if (oldPO) {
      const oldVendor = this.memoryData.vendors.find((v) => v.id === oldPO!.vendor_id);
      if (oldVendor) {
        const oldDue = oldPO.total_amount - oldPO.paid_amount;
        oldVendor.balance_due = Math.max(0, oldVendor.balance_due - oldDue);
        this.dexieDb.vendors.put(oldVendor).catch(console.error);
      }
    }

    const poId = poData.id || ('po-' + Date.now());
    const poNumber = poData.po_number || oldPO?.po_number || ('PO-' + new Date().getFullYear() + '-' + String(this.memoryData.purchase_orders.length + 1).padStart(3, '0'));

    let totalAmount = 0;
    const poItems: PurchaseItem[] = items.map((item) => {
      const lineTotal = item.qty * item.cost_price;
      totalAmount += lineTotal;

      if (item.product_id && item.update_inventory_cost) {
        const inv = this.memoryData.inventory.find((i) => i.id === item.product_id);
        if (inv) {
          inv.cost_price = item.cost_price;
          this.dexieDb.inventory.put(inv).catch(console.error);
        }
      }

      return {
        id: 'pi-' + Math.random().toString(36).substr(2, 9),
        po_id: poId,
        product_id: item.product_id || '',
        product_name: item.product_name,
        qty: item.qty,
        unit: item.unit || 'Pcs',
        cost_price: item.cost_price,
        gst_rate: item.gst_rate || 0,
        total: lineTotal,
      };
    });

    const taxAmount = Number(poData.tax_amount) || 0;
    const discountAmount = Number(poData.discount_amount) || 0;
    const grandTotal = Math.max(0, totalAmount + taxAmount - discountAmount);

    const updatedPO: PurchaseOrder = {
      id: poId,
      po_number: poNumber,
      vendor_id: poData.vendor_id,
      vendor_name: vendorName,
      status: poData.status,
      total_amount: grandTotal,
      paid_amount: Number(poData.paid_amount) || 0,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      notes: poData.notes || '',
      expected_date: poData.expected_date || '',
      created_at: oldPO?.created_at || new Date().toISOString(),
    };

    if (isEdit) {
      const idx = this.memoryData.purchase_orders.findIndex((p) => p.id === poId);
      if (idx >= 0) {
        this.memoryData.purchase_orders[idx] = updatedPO;
      }
      this.memoryData.purchase_items = this.memoryData.purchase_items.filter((pi) => pi.po_id !== poId);
      this.memoryData.purchase_items.push(...poItems);

      this.dexieDb.purchase_orders.put(updatedPO).catch(console.error);
      this.dexieDb.purchase_items.where('po_id').equals(poId).delete().then(() => {
        this.dexieDb.purchase_items.bulkAdd(poItems).catch(console.error);
      }).catch(console.error);
    } else {
      this.memoryData.purchase_orders.unshift(updatedPO);
      this.memoryData.purchase_items.push(...poItems);

      this.dexieDb.purchase_orders.add(updatedPO).catch(console.error);
      this.dexieDb.purchase_items.bulkAdd(poItems).catch(console.error);
    }

    if (poData.status === 'Received') {
      poItems.forEach((pi) => {
        if (pi.product_id) {
          const inv = this.memoryData.inventory.find((i) => i.id === pi.product_id);
          if (inv) {
            inv.stock_qty += pi.qty;
            this.dexieDb.inventory.put(inv).catch(console.error);
          }
        }
      });
    }

    if (vendor) {
      const due = grandTotal - updatedPO.paid_amount;
      vendor.balance_due += due;
      this.dexieDb.vendors.put(vendor).catch(console.error);
      postRowToSQLite('upsert', 'vendors', vendor);
    }

    // Mirror PO & Items to SQLite database explicitly
    postRowToSQLite('upsert', 'purchase_orders', updatedPO);
    poItems.forEach((pi) => {
      postRowToSQLite('upsert', 'purchase_items', pi);
    });

    return updatedPO;
  }

  public createPurchaseOrder(
    poData: { vendor_id: string; status: 'Draft' | 'Ordered' | 'Received'; paid_amount: number; notes?: string },
    items: { product_id: string; product_name: string; qty: number; cost_price: number }[]
  ) {
    return this.savePurchaseOrder(poData, items);
  }

  public updatePOStatus(poId: string, newStatus: 'Draft' | 'Ordered' | 'Received') {
    const existing = this.getPurchaseOrder(poId);
    if (!existing) return null;
    return this.savePurchaseOrder(
      {
        ...existing.order,
        status: newStatus,
      },
      existing.items.map((pi) => ({
        product_id: pi.product_id,
        product_name: pi.product_name,
        qty: pi.qty,
        unit: pi.unit,
        cost_price: pi.cost_price,
        gst_rate: pi.gst_rate,
      }))
    );
  }

  public receivePOWithAllocation(
    poId: string,
    allocations: {
      product_id?: string;
      product_name: string;
      qty: number;
      cost_price: number;
      selling_price: number;
      shop_qty: number;
      godown_qty: number;
    }[]
  ) {
    const poData = this.getPurchaseOrder(poId);
    if (!poData) return null;

    // Update PO status to Received
    poData.order.status = 'Received';
    const idx = this.memoryData.purchase_orders.findIndex((p) => p.id === poId);
    if (idx >= 0) {
      this.memoryData.purchase_orders[idx] = poData.order;
      this.dexieDb.purchase_orders.put(poData.order).catch(console.error);
      postRowToSQLite('upsert', 'purchase_orders', poData.order);
    }

    // Process allocations to update inventory selling price, shop stock, & godown stock
    allocations.forEach((alloc) => {
      let inv = alloc.product_id ? this.memoryData.inventory.find((i) => i.id === alloc.product_id) : undefined;

      if (!inv && alloc.product_name) {
        inv = this.memoryData.inventory.find(
          (i) => i.name.toLowerCase().trim() === alloc.product_name.toLowerCase().trim()
        );
      }

      if (inv) {
        inv.stock_qty = Math.max(0, Number(inv.stock_qty || 0) + Number(alloc.shop_qty || 0));
        inv.godown_qty = Math.max(0, Number(inv.godown_qty || 0) + Number(alloc.godown_qty || 0));
        inv.cost_price = Number(alloc.cost_price) || inv.cost_price;
        if (Number(alloc.selling_price) > 0) {
          inv.selling_price = Number(alloc.selling_price);
        }
        this.dexieDb.inventory.put(inv).catch(console.error);
        postRowToSQLite('upsert', 'inventory', inv);
      } else {
        const newItem: InventoryItem = {
          id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          barcode: 'PMA' + Math.floor(100000 + Math.random() * 900000),
          name: alloc.product_name,
          category: 'General',
          unit: 'Pcs',
          cost_price: Number(alloc.cost_price) || 0,
          selling_price: Number(alloc.selling_price) || Number(alloc.cost_price) * 1.25,
          stock_qty: Number(alloc.shop_qty) || 0,
          godown_qty: Number(alloc.godown_qty) || 0,
          moq: 1,
          min_stock_alert: 5,
          sku_code: '',
          gst_rate: 18,
          image_path: '',
          created_at: new Date().toISOString(),
        };
        newItem.sku_code = newItem.barcode;
        this.memoryData.inventory.unshift(newItem);
        this.dexieDb.inventory.add(newItem).catch(console.error);
        postRowToSQLite('upsert', 'inventory', newItem);
      }
    });

    return poData.order;
  }

  public deletePurchaseOrder(poId: string) {
    const po = this.memoryData.purchase_orders.find((p) => p.id === poId);
    if (!po) return;

    const poItems = this.memoryData.purchase_items.filter((pi) => pi.po_id === poId);

    if (po.status === 'Received') {
      poItems.forEach((pi) => {
        if (pi.product_id) {
          const inv = this.memoryData.inventory.find((i) => i.id === pi.product_id);
          if (inv) {
            inv.stock_qty = Math.max(0, inv.stock_qty - pi.qty);
            this.dexieDb.inventory.put(inv).catch(console.error);
          }
        }
      });
    }

    const vendor = this.memoryData.vendors.find((v) => v.id === po.vendor_id);
    if (vendor) {
      const due = po.total_amount - po.paid_amount;
      vendor.balance_due = Math.max(0, vendor.balance_due - due);
      this.dexieDb.vendors.put(vendor).catch(console.error);
    }

    this.memoryData.purchase_orders = this.memoryData.purchase_orders.filter((p) => p.id !== poId);
    this.memoryData.purchase_items = this.memoryData.purchase_items.filter((pi) => pi.po_id !== poId);

    this.dexieDb.purchase_orders.delete(poId).catch(console.error);
    this.dexieDb.purchase_items.where('po_id').equals(poId).delete().catch(console.error);

    postRowToSQLite('delete', 'purchase_orders', undefined, poId);
    poItems.forEach((pi) => {
      postRowToSQLite('delete', 'purchase_items', undefined, pi.id);
    });
  }

  // Customers & Loyalty
  public getCustomers(): Customer[] {
    return this.memoryData.customers;
  }

  public getCustomerByMobile(mobile: string): Customer | undefined {
    const clean = mobile.trim();
    return this.memoryData.customers.find((c) => c.mobile === clean);
  }

  public saveCustomer(cust: Partial<Customer> & { name: string; mobile: string }) {
    if (cust.id) {
      const idx = this.memoryData.customers.findIndex((c) => c.id === cust.id);
      if (idx >= 0) {
        const updated = { ...this.memoryData.customers[idx], ...cust };
        this.memoryData.customers[idx] = updated;
        this.dexieDb.customers.put(updated).catch(console.error);
      }
    } else {
      const newC: Customer = {
        id: 'cust-' + Date.now(),
        name: cust.name,
        mobile: cust.mobile,
        email: cust.email || '',
        address: cust.address || '',
        gst_number: cust.gst_number || '',
        loyalty_points: Number(cust.loyalty_points) || 0,
        total_spent: Number(cust.total_spent) || 0,
        created_at: new Date().toISOString(),
      };
      this.memoryData.customers.unshift(newC);
      this.dexieDb.customers.add(newC).catch(console.error);
    }
  }

  public getLoyaltyLedger(customerId?: string): LoyaltyLedger[] {
    const all = this.memoryData.loyalty_ledger || [];
    if (!customerId) return all;
    return all.filter((l) => l.customer_id === customerId);
  }

  // Invoices & POS
  public getInvoices(): { invoice: Invoice; items: InvoiceItem[] }[] {
    const list = this.memoryData.invoices.map((inv) => ({
      invoice: inv,
      items: this.memoryData.invoice_items.filter(
        (ii) => ii.invoice_id === inv.id || ii.invoice_id === inv.invoice_number
      ),
    }));
    return list.sort((a, b) => new Date(b.invoice.created_at).getTime() - new Date(a.invoice.created_at).getTime());
  }

  public getInvoice(idOrNumber: string): { invoice: Invoice; items: InvoiceItem[] } | null {
    const inv = this.memoryData.invoices.find(
      (i) => i.id === idOrNumber || i.invoice_number === idOrNumber
    );
    if (!inv) return null;
    const items = this.memoryData.invoice_items.filter(
      (ii) => ii.invoice_id === inv.id || ii.invoice_id === inv.invoice_number
    );
    return { invoice: inv, items };
  }

  public async createInvoice(saleData: {
    customer_id?: string;
    customer_name: string;
    customer_mobile: string;
    invoice_type: 'GST' | 'NON_GST' | 'MIXED';
    discount_amount: number;
    exchange_amount?: number;
    exchange_notes?: string;
    payment_method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
    loyalty_points_redeemed?: number;
    items: { product_id: string; barcode: string; product_name: string; qty: number; unit_price: number; tax_rate: number }[];
  }): Promise<Invoice> {
    const invId = 'inv-' + Date.now();
    const currentYear = new Date().getFullYear();
    const yearInvoices = this.memoryData.invoices.filter((i) => {
      const invYear = new Date(i.created_at || Date.now()).getFullYear();
      return invYear === currentYear;
    });
    const invSeq = yearInvoices.length + 1;
    const invNumber = `INV-${currentYear}-${String(invSeq).padStart(invSeq > 9999 ? 5 : 4, '0')}`;

    let subtotal = 0;
    let taxAmount = 0;

    const invItems: InvoiceItem[] = saleData.items.map((item) => {
      const lineSubtotal = item.qty * item.unit_price;
      const lineTax = (saleData.invoice_type === 'GST' || saleData.invoice_type === 'MIXED')
        ? ((lineSubtotal * item.tax_rate) / 100)
        : 0;
      subtotal += lineSubtotal;
      taxAmount += lineTax;

      // Update Inventory Stock in memory
      const invProd = this.memoryData.inventory.find((i) => i.id === item.product_id);
      if (invProd) {
        invProd.stock_qty = Math.max(0, invProd.stock_qty - item.qty);
      }

      return {
        id: 'ii-' + Math.random().toString(36).substr(2, 9),
        invoice_id: invId,
        product_id: item.product_id,
        barcode: item.barcode,
        product_name: item.product_name,
        qty: item.qty,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        total_price: lineSubtotal,
      };
    });

    const grandTotal = Math.max(0, subtotal + taxAmount - saleData.discount_amount - (saleData.exchange_amount || 0));

    const newInvoice: Invoice = {
      id: invId,
      invoice_number: invNumber,
      customer_id: saleData.customer_id,
      customer_name: saleData.customer_name || 'Walk-in Customer',
      customer_mobile: saleData.customer_mobile || '',
      invoice_type: saleData.invoice_type,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: saleData.discount_amount,
      exchange_amount: saleData.exchange_amount || 0,
      exchange_notes: saleData.exchange_notes || '',
      grand_total: grandTotal,
      payment_method: saleData.payment_method,
      payment_status: 'PAID',
      created_at: new Date().toISOString(),
      is_synced: 0,
    };

    this.memoryData.invoices.unshift(newInvoice);
    this.memoryData.invoice_items.push(...invItems);

    // Save to local IndexedDB & await server SQLite database sync
    if (typeof window !== 'undefined' && this.dexieDb) {
      await this.dexieDb.invoices.add(newInvoice).catch(console.error);
      for (const item of invItems) {
        await this.dexieDb.invoice_items.add(item).catch(console.error);
      }

      // Single atomic post for invoice + items
      await postInvoiceToSQLite(newInvoice, invItems);

      for (const item of saleData.items) {
        const invProd = this.memoryData.inventory.find((i) => i.id === item.product_id);
        if (invProd) {
          await this.dexieDb.inventory.put(invProd).catch(console.error);
          await postRowToSQLite('upsert', 'inventory', invProd);
        }
      }
    }

    // Update Customer record & loyalty ledger if customer selected
    let customer = this.memoryData.customers.find(
      (c) => (saleData.customer_id && c.id === saleData.customer_id) || (saleData.customer_mobile && c.mobile === saleData.customer_mobile)
    );

    if (!customer && saleData.customer_mobile && saleData.customer_name) {
      customer = {
        id: 'cust-' + Date.now(),
        name: saleData.customer_name,
        mobile: saleData.customer_mobile,
        email: '',
        address: '',
        gst_number: '',
        loyalty_points: 0,
        total_spent: 0,
        created_at: new Date().toISOString(),
      };
      this.memoryData.customers.unshift(customer);
      if (typeof window !== 'undefined' && this.dexieDb) {
        await this.dexieDb.customers.add(customer).catch(console.error);
        await postRowToSQLite('upsert', 'customers', customer);
      }
    }

    if (customer) {
      customer.total_spent += grandTotal;
      const pointsEarned = Math.floor(grandTotal / 100);
      const billMaxRedeem = Math.max(0, Math.ceil(subtotal + taxAmount - saleData.discount_amount - (saleData.exchange_amount || 0)));
      const actualRedeemed = Math.min(saleData.loyalty_points_redeemed || 0, customer.loyalty_points, billMaxRedeem);
      const pointsNet = pointsEarned - actualRedeemed;

      customer.loyalty_points = Math.max(0, customer.loyalty_points + pointsNet);
      if (typeof window !== 'undefined' && this.dexieDb) {
        await this.dexieDb.customers.put(customer).catch(console.error);
        await postRowToSQLite('upsert', 'customers', customer);
      }

      let ledgerReason = `Transaction ${invNumber}`;
      if (actualRedeemed > 0 && pointsEarned > 0) {
        ledgerReason = `Redeemed ${actualRedeemed} Pts & Earned ${pointsEarned} Pts (Bill #${invNumber})`;
      } else if (actualRedeemed > 0) {
        ledgerReason = `Redeemed ${actualRedeemed} Pts (Bill #${invNumber})`;
      } else if (pointsEarned > 0) {
        ledgerReason = `Earned ${pointsEarned} Pts (Bill #${invNumber})`;
      }

      const newLoyalty = {
        id: 'lgt-' + Date.now(),
        customer_id: customer.id,
        points_change: pointsNet,
        reason: ledgerReason,
        created_at: new Date().toISOString(),
      };
      this.memoryData.loyalty_ledger.unshift(newLoyalty);
      if (typeof window !== 'undefined' && this.dexieDb) {
        await this.dexieDb.loyalty_ledger.add(newLoyalty).catch(console.error);
        await postRowToSQLite('upsert', 'loyalty_ledger', newLoyalty);
      }
    }

    return newInvoice;
  }

  public async updateInvoice(invoiceId: string, saleData: {
    customer_name: string;
    customer_mobile: string;
    invoice_type: 'GST' | 'NON_GST' | 'MIXED';
    discount_amount: number;
    exchange_amount?: number;
    exchange_notes?: string;
    payment_method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
    items: { id?: string; product_id: string; barcode: string; product_name: string; qty: number; unit_price: number; tax_rate: number }[];
  }) {
    const invoice = this.memoryData.invoices.find((i) => i.id === invoiceId);
    if (!invoice) throw new Error("Invoice not found in memory");

    // 1. Revert original inventory stocks
    const originalItems = this.memoryData.invoice_items.filter((ii) => ii.invoice_id === invoiceId);
    for (const orig of originalItems) {
      const prod = this.memoryData.inventory.find((p) => p.id === orig.product_id);
      if (prod) {
        prod.stock_qty += orig.qty;
      }
    }

    // 4. Calculate new subtotal and tax
    let subtotal = 0;
    let taxAmount = 0;

    const newInvItems: InvoiceItem[] = saleData.items.map((item) => {
      const lineSubtotal = item.qty * item.unit_price;
      const lineTax = (saleData.invoice_type === 'GST' || saleData.invoice_type === 'MIXED')
        ? ((lineSubtotal * item.tax_rate) / 100)
        : 0;
      subtotal += lineSubtotal;
      taxAmount += lineTax;

      // Update inventory stock in memory
      const prod = this.memoryData.inventory.find((p) => p.id === item.product_id);
      if (prod) {
        prod.stock_qty = Math.max(0, prod.stock_qty - item.qty);
      }

      return {
        id: item.id || ('ii-' + Math.random().toString(36).substr(2, 9)),
        invoice_id: invoiceId,
        product_id: item.product_id,
        barcode: item.barcode,
        product_name: item.product_name,
        qty: item.qty,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        total_price: lineSubtotal,
      };
    });

    const grandTotal = Math.max(0, subtotal + taxAmount - saleData.discount_amount - (saleData.exchange_amount || 0));

    // Update invoice fields
    invoice.customer_name = saleData.customer_name;
    invoice.customer_mobile = saleData.customer_mobile;
    invoice.invoice_type = saleData.invoice_type;
    invoice.subtotal = subtotal;
    invoice.tax_amount = taxAmount;
    invoice.discount_amount = saleData.discount_amount;
    invoice.exchange_amount = saleData.exchange_amount || 0;
    invoice.exchange_notes = saleData.exchange_notes || '';
    invoice.grand_total = grandTotal;
    invoice.payment_method = saleData.payment_method;

    // 5. Update local memory structures
    this.memoryData.invoice_items = this.memoryData.invoice_items.filter((ii) => ii.invoice_id !== invoiceId);
    this.memoryData.invoice_items.push(...newInvItems);

    // 6. Persist to Dexie and SQLite
    if (typeof window !== 'undefined' && this.dexieDb) {
      await this.dexieDb.invoices.put(invoice).catch(console.error);

      // Delete old items locally
      for (const orig of originalItems) {
        await this.dexieDb.invoice_items.delete(orig.id).catch(console.error);
      }

      // Save new items locally
      for (const item of newInvItems) {
        await this.dexieDb.invoice_items.put(item).catch(console.error);
      }

      // Single atomic post for invoice + items
      await postInvoiceToSQLite(invoice, newInvItems);

      // Update inventory levels in Dexie/SQLite for any modified products
      const modifiedProductIds = new Set([
        ...originalItems.map((oi) => oi.product_id),
        ...newInvItems.map((ni) => ni.product_id),
      ]);
      for (const pId of modifiedProductIds) {
        const prod = this.memoryData.inventory.find((p) => p.id === pId);
        if (prod) {
          await this.dexieDb.inventory.put(prod).catch(console.error);
          await postRowToSQLite('upsert', 'inventory', prod);
        }
      }
    }

    return { invoice, items: newInvItems };
  }

  public async returnInvoiceItem(invoiceId: string, itemId: string, returnQty: number) {
    const item = this.memoryData.invoice_items.find((ii) => ii.id === itemId && ii.invoice_id === invoiceId);
    if (!item) return;

    item.is_return = true;
    if (typeof window !== 'undefined' && this.dexieDb) {
      await this.dexieDb.invoice_items.put(item).catch(console.error);
      await postRowToSQLite('upsert', 'invoice_items', item);
    }

    const invProd = this.memoryData.inventory.find((i) => i.id === item.product_id);
    if (invProd) {
      invProd.stock_qty += returnQty;
      if (typeof window !== 'undefined' && this.dexieDb) {
        await this.dexieDb.inventory.put(invProd).catch(console.error);
        await postRowToSQLite('upsert', 'inventory', invProd);
      }
    }
  }

  // Service Center
  public getServiceTickets(): ServiceTicket[] {
    return this.memoryData.service_tickets;
  }

  public saveServiceTicket(ticket: Partial<ServiceTicket> & { customer_name: string; device_name: string }): ServiceTicket {
    if (ticket.id) {
      const idx = this.memoryData.service_tickets.findIndex((s) => s.id === ticket.id);
      if (idx >= 0) {
        const updated: ServiceTicket = {
          ...this.memoryData.service_tickets[idx],
          ...ticket,
          updated_at: new Date().toISOString(),
        };
        this.memoryData.service_tickets[idx] = updated;
        if (typeof window !== 'undefined' && this.dexieDb) {
          this.dexieDb.service_tickets.put(updated).catch(console.error);
        }
        return updated;
      }
    }

    const totalCount = this.memoryData.service_tickets.length + 1;
    const tokenSeq = String(totalCount).padStart(2, '0');
    const queueNo = ticket.queue_number || `TOKEN-#${tokenSeq}`;

    const ticketNo = ticket.ticket_number || 'PMA-S-' + new Date().getFullYear() + '-' + String(totalCount).padStart(3, '0');
    const serialNo = ticket.serial_number?.trim() || `SN-${Date.now().toString().slice(-6)}`;

    const newTicket: ServiceTicket = {
      id: 'srv-' + Date.now(),
      ticket_number: ticketNo,
      queue_number: queueNo,
      customer_id: ticket.customer_id,
      customer_name: ticket.customer_name,
      customer_mobile: ticket.customer_mobile || '',
      device_name: ticket.device_name,
      serial_number: serialNo,
      issue_description: ticket.issue_description || '',
      estimated_cost: Number(ticket.estimated_cost) || 0,
      final_cost: Number(ticket.final_cost) || Number(ticket.estimated_cost) || 0,
      status: ticket.status || 'Intake',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.memoryData.service_tickets.unshift(newTicket);
    if (typeof window !== 'undefined' && this.dexieDb) {
      this.dexieDb.service_tickets.add(newTicket).catch(console.error);
    }
    return newTicket;
  }

  // Scrap Buying
  public getScrapEntries(): ScrapEntry[] {
    const explicit = this.memoryData.scrap_entries || [];
    const explicitInvIds = new Set(explicit.map((s) => s.invoice_id).filter(Boolean));

    const invoiceExchanges: ScrapEntry[] = (this.memoryData.invoices || [])
      .filter((i) => Number(i.exchange_amount || 0) > 0 && !explicitInvIds.has(i.id))
      .map((i) => ({
        id: `scrap-inv-${i.id}`,
        invoice_id: i.id,
        is_exchange: true,
        customer_name: i.customer_name || "Walk-in Customer",
        customer_mobile: i.customer_mobile || "",
        item_type: i.exchange_notes ? `Exchange: ${i.exchange_notes}` : `Old Exchanged Item`,
        weight_kg: 1,
        price_per_kg: Number(i.exchange_amount) || 0,
        total_payout: Number(i.exchange_amount) || 0,
        notes: `From POS Bill #${i.invoice_number}`,
        created_at: i.created_at || new Date().toISOString(),
      }));

    const combined = [...explicit, ...invoiceExchanges];
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return combined;
  }

  public saveScrapEntry(entry: Partial<ScrapEntry> & { item_type: string; weight_kg: number; price_per_kg: number }) {
    const weight = Number(entry.weight_kg) || 0;
    const rate = Number(entry.price_per_kg) || 0;
    const payout = weight * rate;

    const newScrap: ScrapEntry = {
      id: 'scp-' + Date.now(),
      customer_name: entry.customer_name || 'Walk-in Seller',
      customer_mobile: entry.customer_mobile || '',
      item_type: entry.item_type,
      weight_kg: weight,
      price_per_kg: rate,
      total_payout: payout,
      notes: entry.notes || '',
      created_at: new Date().toISOString(),
    };
    this.memoryData.scrap_entries.unshift(newScrap);
    this.dexieDb.scrap_entries.add(newScrap).catch(console.error);
  }

  // Godown Stock Transfers
  public getGodownTransfers(): GodownTransfer[] {
    return this.memoryData.godown_transfers;
  }

  public createGodownTransfer(transfer: {
    product_id: string;
    transfer_type: 'SHOP_TO_GODOWN' | 'GODOWN_TO_SHOP';
    qty: number;
    notes?: string;
  }): { success: boolean; message: string } {
    const product = this.memoryData.inventory.find((p) => p.id === transfer.product_id);

    if (!product) return { success: false, message: 'Product not found' };
    const transferQty = Number(transfer.qty);

    if (transfer.transfer_type === 'SHOP_TO_GODOWN') {
      if (product.stock_qty < transferQty) {
        return { success: false, message: `Insufficient shop stock. Available: ${product.stock_qty}` };
      }
      product.stock_qty -= transferQty;
      product.godown_qty += transferQty;
    } else {
      if (product.godown_qty < transferQty) {
        return { success: false, message: `Insufficient godown stock. Available: ${product.godown_qty}` };
      }
      product.godown_qty -= transferQty;
      product.stock_qty += transferQty;
    }

    const newLog: GodownTransfer = {
      id: 'gdn-' + Date.now(),
      product_id: product.id,
      product_name: product.name,
      transfer_type: transfer.transfer_type,
      qty: transferQty,
      notes: transfer.notes || '',
      created_at: new Date().toISOString(),
    };

    this.memoryData.godown_transfers.unshift(newLog);
    this.dexieDb.inventory.put(product).catch(console.error);
    this.dexieDb.godown_transfers.add(newLog).catch(console.error);
    return { success: true, message: 'Stock transferred successfully' };
  }

  // Settings & Backups Log
  public getSettings() {
    return this.memoryData.settings;
  }

  public updateSettings(newSettings: Record<string, any>) {
    this.memoryData.settings = { ...this.memoryData.settings, ...newSettings };
    const settingsEntries = Object.entries(newSettings).map(([key, value]) => ({ key, value }));
    settingsEntries.forEach((s) => {
      this.dexieDb.settings.put(s).catch(console.error);
    });
  }

  public getBackupsLog(): BackupLog[] {
    return this.memoryData.backups_log;
  }

  public logBackup(filename: string, type: 'MANUAL' | 'SCHEDULED', sizeKb: number, status: 'SUCCESS' | 'FAILED') {
    const newBackup = {
      id: 'bkp-' + Date.now(),
      filename,
      type,
      timestamp: new Date().toISOString(),
      size_kb: sizeKb,
      status,
    };
    this.memoryData.backups_log.unshift(newBackup);
    this.dexieDb.backups_log.add(newBackup).catch(console.error);

    // Retain last N backups
    const retain = this.memoryData.settings.retain_backups_count || 30;
    if (this.memoryData.backups_log.length > retain) {
      const removed = this.memoryData.backups_log.slice(retain);
      this.memoryData.backups_log = this.memoryData.backups_log.slice(0, retain);
      removed.forEach((r) => {
        this.dexieDb.backups_log.delete(r.id).catch(console.error);
      });
    }
  }

  public markInvoicesSynced(ids: string[]) {
    ids.forEach((id) => {
      const idx = this.memoryData.invoices.findIndex((inv) => inv.id === id);
      if (idx >= 0) {
        this.memoryData.invoices[idx].is_synced = 1;
        this.dexieDb.invoices.update(id, { is_synced: 1 }).catch(console.error);
      }
    });
  }
}

export const db = new OfflineDB();
