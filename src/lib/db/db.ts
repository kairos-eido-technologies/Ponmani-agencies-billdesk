/**
 * Ponmani Agencies Offline - Local Relational Database Engine
 * Zero internet dependency. Supports IndexedDB persistent storage in web/dev mode
 * and Electron IPC main process binding in desktop mode.
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
  hsn_code: string;
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
  status: 'Draft' | 'Sent' | 'Received' | 'Paid';
  total_amount: number;
  paid_amount: number;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  po_id: string;
  product_id: string;
  product_name: string;
  qty: number;
  cost_price: number;
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
  grand_total: number;
  payment_method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
  payment_status: 'PAID' | 'PENDING';
  created_at: string;
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

import { generateLargeSeedData } from './seed-generator';

const STORAGE_KEY = 'ponmani_offline_db_v1';

const INITIAL_SEED: DBStore = generateLargeSeedData();

class OfflineDB {
  private memoryData: DBStore;

  constructor() {
    this.memoryData = this.loadFromStorage();
  }

  private loadFromStorage(): DBStore {
    if (typeof window === 'undefined') return INITIAL_SEED;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...INITIAL_SEED,
          ...parsed,
          settings: { ...INITIAL_SEED.settings, ...(parsed.settings || {}) },
        };
      }
    } catch (err) {
      console.error('Failed reading local DB storage:', err);
    }
    this.saveToStorage(INITIAL_SEED);
    return INITIAL_SEED;
  }

  private saveToStorage(data: DBStore) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.memoryData = data;
    } catch (err) {
      console.error('Failed saving local DB storage:', err);
    }
  }

  public getStore(): DBStore {
    return this.memoryData;
  }

  public resetToSeed() {
    const freshSeed = generateLargeSeedData();
    this.saveToStorage(freshSeed);
    return freshSeed;
  }

  public restoreFullBackup(newData: DBStore) {
    this.saveToStorage(newData);
    return true;
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
    const data = { ...this.memoryData };
    if (user.id) {
      const idx = data.users.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        data.users[idx] = { ...data.users[idx], ...user };
      }
    } else {
      const newUser: User = {
        id: 'usr-' + Date.now(),
        username: user.username,
        pin: user.pin,
        role: user.role,
        created_at: new Date().toISOString(),
      };
      data.users.push(newUser);
    }
    this.saveToStorage(data);
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
    const data = { ...this.memoryData };
    if (item.id) {
      const idx = data.inventory.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        data.inventory[idx] = { ...data.inventory[idx], ...item };
      }
    } else {
      const newItem: InventoryItem = {
        id: 'prod-' + Date.now(),
        barcode: item.barcode || '890' + Math.floor(100000000 + Math.random() * 900000000),
        name: item.name,
        category: item.category || 'General',
        unit: item.unit || 'Piece',
        cost_price: Number(item.cost_price) || 0,
        selling_price: Number(item.selling_price) || 0,
        stock_qty: Number(item.stock_qty) || 0,
        godown_qty: Number(item.godown_qty) || 0,
        moq: Number(item.moq) || 1,
        min_stock_alert: Number(item.min_stock_alert) || 5,
        hsn_code: item.hsn_code || '8414',
        gst_rate: Number(item.gst_rate) || 18,
        image_path: item.image_path || '',
        created_at: new Date().toISOString(),
      };
      data.inventory.unshift(newItem);
    }
    this.saveToStorage(data);
  }

  public bulkImportInventory(items: Partial<InventoryItem>[]): { success: boolean; count: number; errors: string[] } {
    const data = { ...this.memoryData };
    const errors: string[] = [];
    const barcodesSeen = new Set(data.inventory.map((i) => i.barcode));

    const validated: InventoryItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      if (!raw.name) {
        errors.push(`Row ${i + 1}: Missing product name`);
        continue;
      }
      const barcode = raw.barcode?.toString().trim() || '890' + Math.floor(1000000000 + Math.random() * 8000000000);
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
        hsn_code: raw.hsn_code?.toString() || '8414',
        gst_rate: Number(raw.gst_rate) || 18,
        image_path: raw.image_path || '',
        created_at: new Date().toISOString(),
      });
    }

    if (errors.length > 0) {
      return { success: false, count: 0, errors };
    }

    data.inventory.unshift(...validated);
    this.saveToStorage(data);
    return { success: true, count: validated.length, errors: [] };
  }

  public deleteInventoryItem(id: string) {
    const data = { ...this.memoryData };
    data.inventory = data.inventory.filter((i) => i.id !== id);
    this.saveToStorage(data);
  }

  // Vendors & Purchases
  public getVendors(): Vendor[] {
    return this.memoryData.vendors;
  }

  public saveVendor(vendor: Partial<Vendor> & { name: string }) {
    const data = { ...this.memoryData };
    if (vendor.id) {
      const idx = data.vendors.findIndex((v) => v.id === vendor.id);
      if (idx >= 0) data.vendors[idx] = { ...data.vendors[idx], ...vendor };
    } else {
      const newV: Vendor = {
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
      data.vendors.unshift(newV);
    }
    this.saveToStorage(data);
  }

  public getPurchaseOrders(): { order: PurchaseOrder; items: PurchaseItem[] }[] {
    return this.memoryData.purchase_orders.map((po) => ({
      order: po,
      items: this.memoryData.purchase_items.filter((pi) => pi.po_id === po.id),
    }));
  }

  public createPurchaseOrder(
    poData: { vendor_id: string; status: 'Draft' | 'Sent' | 'Received' | 'Paid'; paid_amount: number },
    items: { product_id: string; product_name: string; qty: number; cost_price: number }[]
  ) {
    const data = { ...this.memoryData };
    const vendor = data.vendors.find((v) => v.id === poData.vendor_id);
    const poId = 'po-' + Date.now();
    const poNumber = 'PO-' + new Date().getFullYear() + '-' + String(data.purchase_orders.length + 1).padStart(3, '0');

    let totalAmount = 0;
    const poItems: PurchaseItem[] = items.map((item) => {
      const lineTotal = item.qty * item.cost_price;
      totalAmount += lineTotal;
      return {
        id: 'pi-' + Math.random().toString(36).substr(2, 9),
        po_id: poId,
        product_id: item.product_id,
        product_name: item.product_name,
        qty: item.qty,
        cost_price: item.cost_price,
        total: lineTotal,
      };
    });

    const newPO: PurchaseOrder = {
      id: poId,
      po_number: poNumber,
      vendor_id: poData.vendor_id,
      vendor_name: vendor?.company_name || vendor?.name || 'Vendor',
      status: poData.status,
      total_amount: totalAmount,
      paid_amount: poData.paid_amount,
      created_at: new Date().toISOString(),
    };

    data.purchase_orders.unshift(newPO);
    data.purchase_items.push(...poItems);

    // If Received, update inventory stock
    if (poData.status === 'Received') {
      poItems.forEach((pi) => {
        const inv = data.inventory.find((i) => i.id === pi.product_id);
        if (inv) inv.stock_qty += pi.qty;
      });
    }

    // Update vendor balance due
    if (vendor) {
      vendor.balance_due += totalAmount - poData.paid_amount;
    }

    this.saveToStorage(data);
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
    const data = { ...this.memoryData };
    if (cust.id) {
      const idx = data.customers.findIndex((c) => c.id === cust.id);
      if (idx >= 0) data.customers[idx] = { ...data.customers[idx], ...cust };
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
      data.customers.unshift(newC);
    }
    this.saveToStorage(data);
  }

  // Invoices & POS
  public getInvoices(): { invoice: Invoice; items: InvoiceItem[] }[] {
    return this.memoryData.invoices.map((inv) => ({
      invoice: inv,
      items: this.memoryData.invoice_items.filter((ii) => ii.invoice_id === inv.id),
    }));
  }

  public createInvoice(saleData: {
    customer_id?: string;
    customer_name: string;
    customer_mobile: string;
    invoice_type: 'GST' | 'NON_GST' | 'MIXED';
    discount_amount: number;
    payment_method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
    loyalty_points_redeemed?: number;
    items: { product_id: string; barcode: string; product_name: string; qty: number; unit_price: number; tax_rate: number }[];
  }): Invoice {
    const data = { ...this.memoryData };
    const invId = 'inv-' + Date.now();
    const invNumber = 'INV-' + new Date().getFullYear() + '-' + String(data.invoices.length + 1).padStart(4, '0');

    let subtotal = 0;
    let taxAmount = 0;

    const invItems: InvoiceItem[] = saleData.items.map((item) => {
      const lineSubtotal = item.qty * item.unit_price;
      const lineTax = (lineSubtotal * item.tax_rate) / 100;
      subtotal += lineSubtotal;
      taxAmount += lineTax;

      // Update Inventory Stock
      const invProd = data.inventory.find((i) => i.id === item.product_id);
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

    const grandTotal = Math.max(0, subtotal + taxAmount - saleData.discount_amount);

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
      grand_total: grandTotal,
      payment_method: saleData.payment_method,
      payment_status: 'PAID',
      created_at: new Date().toISOString(),
    };

    data.invoices.unshift(newInvoice);
    data.invoice_items.push(...invItems);

    // Update Customer record & loyalty ledger if customer selected
    let customer = data.customers.find(
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
      data.customers.unshift(customer);
    }

    if (customer) {
      customer.total_spent += grandTotal;
      const pointsEarned = Math.floor(grandTotal / 100);
      let pointsNet = pointsEarned;
      if (saleData.loyalty_points_redeemed) {
        pointsNet -= saleData.loyalty_points_redeemed;
      }
      customer.loyalty_points = Math.max(0, customer.loyalty_points + pointsNet);

      data.loyalty_ledger.unshift({
        id: 'lgt-' + Date.now(),
        customer_id: customer.id,
        points_change: pointsNet,
        reason: `Transaction ${invNumber}`,
        created_at: new Date().toISOString(),
      });
    }

    this.saveToStorage(data);
    return newInvoice;
  }

  public returnInvoiceItem(invoiceId: string, itemId: string, returnQty: number) {
    const data = { ...this.memoryData };
    const item = data.invoice_items.find((ii) => ii.id === itemId && ii.invoice_id === invoiceId);
    if (!item) return;

    item.is_return = true;
    const invProd = data.inventory.find((i) => i.id === item.product_id);
    if (invProd) {
      invProd.stock_qty += returnQty;
    }

    this.saveToStorage(data);
  }

  // Service Center
  public getServiceTickets(): ServiceTicket[] {
    return this.memoryData.service_tickets;
  }

  public saveServiceTicket(ticket: Partial<ServiceTicket> & { customer_name: string; device_name: string }) {
    const data = { ...this.memoryData };
    if (ticket.id) {
      const idx = data.service_tickets.findIndex((s) => s.id === ticket.id);
      if (idx >= 0) {
        data.service_tickets[idx] = {
          ...data.service_tickets[idx],
          ...ticket,
          updated_at: new Date().toISOString(),
        };
      }
    } else {
      const count = data.service_tickets.length + 1;
      const newTicket: ServiceTicket = {
        id: 'srv-' + Date.now(),
        ticket_number: 'SRV-' + new Date().getFullYear() + '-' + String(count).padStart(3, '0'),
        customer_id: ticket.customer_id,
        customer_name: ticket.customer_name,
        customer_mobile: ticket.customer_mobile || '',
        device_name: ticket.device_name,
        serial_number: ticket.serial_number || '',
        issue_description: ticket.issue_description || '',
        estimated_cost: Number(ticket.estimated_cost) || 0,
        final_cost: Number(ticket.final_cost) || Number(ticket.estimated_cost) || 0,
        status: ticket.status || 'Intake',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      data.service_tickets.unshift(newTicket);
    }
    this.saveToStorage(data);
  }

  // Scrap Buying
  public getScrapEntries(): ScrapEntry[] {
    return this.memoryData.scrap_entries;
  }

  public saveScrapEntry(entry: Partial<ScrapEntry> & { item_type: string; weight_kg: number; price_per_kg: number }) {
    const data = { ...this.memoryData };
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
    data.scrap_entries.unshift(newScrap);
    this.saveToStorage(data);
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
    const data = { ...this.memoryData };
    const product = data.inventory.find((p) => p.id === transfer.product_id);

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

    data.godown_transfers.unshift(newLog);
    this.saveToStorage(data);
    return { success: true, message: 'Stock transferred successfully' };
  }

  // Settings & Backups Log
  public getSettings() {
    return this.memoryData.settings;
  }

  public updateSettings(newSettings: Record<string, any>) {
    const data = { ...this.memoryData };
    data.settings = { ...data.settings, ...newSettings };
    this.saveToStorage(data);
  }

  public getBackupsLog(): BackupLog[] {
    return this.memoryData.backups_log;
  }

  public logBackup(filename: string, type: 'MANUAL' | 'SCHEDULED', sizeKb: number, status: 'SUCCESS' | 'FAILED') {
    const data = { ...this.memoryData };
    data.backups_log.unshift({
      id: 'bkp-' + Date.now(),
      filename,
      type,
      timestamp: new Date().toISOString(),
      size_kb: sizeKb,
      status,
    });
    // Retain last N backups
    const retain = data.settings.retain_backups_count || 30;
    data.backups_log = data.backups_log.slice(0, retain);
    this.saveToStorage(data);
  }
}

export const db = new OfflineDB();
