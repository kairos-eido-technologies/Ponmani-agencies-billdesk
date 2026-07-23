import { supabase } from '@/integrations/supabase/client';
import { db } from './db';

/**
 * PostgreSQL Cloud Sync Service
 * Handles bi-directional synchronization between local IndexedDB (Dexie) and Postgres.
 */
export class SyncService {
  /**
   * Check if client is online and remote server is reachable
   */
  public static async isOnline(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.navigator.onLine) {
      return false;
    }
    try {
      // Simple network ping to verify API connectivity
      const response = await fetch(import.meta.env.VITE_SUPABASE_URL, {
        method: 'HEAD',
        mode: 'no-cors',
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Pull categories, products, and customers from remote PostgreSQL into local database
   */
  public static async pullCloudCatalog(): Promise<{ success: boolean; pulledProducts: number; message: string }> {
    try {
      // 1. Fetch Categories to map name strings locally
      const { data: remoteCategories, error: catError } = await supabase
        .from('categories')
        .select('*');
      if (catError) throw catError;

      const categoryMap = new Map<string, string>();
      remoteCategories?.forEach((c) => {
        categoryMap.set(c.id, c.name);
      });

      // 2. Fetch Products
      const { data: remoteProducts, error: prodError } = await supabase
        .from('products')
        .select('*');
      if (prodError) throw prodError;

      if (remoteProducts && remoteProducts.length > 0) {
        remoteProducts.forEach((p) => {
          const categoryName = p.category_id ? categoryMap.get(p.category_id) || 'General' : 'General';
          db.saveInventoryItem({
            id: p.id,
            barcode: p.barcode || 'PMA' + Math.floor(100000 + Math.random() * 900000),
            name: p.name,
            category: categoryName,
            unit: 'Piece (Pcs)',
            cost_price: Number(p.purchase_price) || Number(p.mrp) || 0,
            selling_price: Number(p.selling_price) || 0,
            stock_qty: Number(p.stock_qty) || 0,
            godown_qty: Number(p.godown_qty) || 0,
            moq: Number(p.moq) || 1,
            min_stock_alert: Number(p.moq) || 5,
            sku_code: p.barcode || undefined,
            gst_rate: Number(p.gst_rate) || 18,
            image_path: p.image_url || undefined,
            created_at: p.created_at || new Date().toISOString(),
          });
        });
      }

      // 3. Fetch Customers
      const { data: remoteCustomers, error: custError } = await supabase
        .from('customers')
        .select('*');
      if (custError) throw custError;

      if (remoteCustomers && remoteCustomers.length > 0) {
        remoteCustomers.forEach((c) => {
          db.saveCustomer({
            id: c.id,
            name: c.name || 'Customer',
            mobile: c.mobile,
            email: c.email || '',
            address: c.address || '',
            gst_number: '',
            loyalty_points: Number(c.loyalty_points) || 0,
            total_spent: 0,
          });
        });
      }

      return {
        success: true,
        pulledProducts: remoteProducts?.length || 0,
        message: `Catalog synchronized successfully. Loaded ${remoteProducts?.length || 0} products from PostgreSQL.`,
      };
    } catch (err: any) {
      console.error('Failed to pull PostgreSQL catalog:', err);
      return {
        success: false,
        pulledProducts: 0,
        message: err.message || 'Database connection error.',
      };
    }
  }

  /**
   * Push locally saved transactions (invoices) created offline to remote PostgreSQL
   */
  public static async pushOfflineSales(): Promise<{ success: boolean; pushedInvoices: number; message: string }> {
    try {
      // Find all unsynced local invoices
      const allInvoices = db.getInvoices();
      const unsynced = allInvoices.filter((inv) => !inv.invoice.is_synced || inv.invoice.is_synced === 0);

      if (unsynced.length === 0) {
        return { success: true, pushedInvoices: 0, message: 'No offline sales to upload.' };
      }

      let count = 0;
      for (const inv of unsynced) {
        const invoiceInsert = {
          id: inv.invoice.id,
          created_at: inv.invoice.created_at,
          customer_id: inv.invoice.customer_id || null,
          discount: Number(inv.invoice.discount_amount) || 0,
          gst_amount: Number(inv.invoice.tax_amount) || 0,
          gst_enabled: inv.invoice.invoice_type === 'GST' || inv.invoice.invoice_type === 'MIXED',
          subtotal: Number(inv.invoice.subtotal) || 0,
          total: Number(inv.invoice.grand_total) || 0,
          payment_methods: inv.invoice.payment_method,
          invoice_no: Number(inv.invoice.invoice_number.replace(/\D/g, '')) || undefined,
        };

        const itemsInsert = inv.items.map((item) => ({
          id: item.id,
          invoice_id: item.invoice_id,
          product_id: item.product_id || null,
          name: item.product_name,
          qty: Number(item.qty) || 0,
          price: Number(item.unit_price) || 0,
          gst_rate: Number(item.tax_rate) || 18,
          line_total: Number(item.total_price) || 0,
          discount: 0,
        }));

        // Upsert Invoice Header
        const { error: headerErr } = await supabase
          .from('sales_invoices')
          .upsert(invoiceInsert);
        if (headerErr) throw headerErr;

        // Upsert Invoice Line Items
        const { error: itemsErr } = await supabase
          .from('invoice_items')
          .upsert(itemsInsert);
        if (itemsErr) throw itemsErr;

        // Mark as synced locally
        db.markInvoicesSynced([inv.invoice.id]);
        count++;
      }

      return {
        success: true,
        pushedInvoices: count,
        message: `Successfully uploaded ${count} invoices to PostgreSQL server.`,
      };
    } catch (err: any) {
      console.error('Failed to push offline sales:', err);
      return {
        success: false,
        pushedInvoices: 0,
        message: err.message || 'Database upload error.',
      };
    }
  }

  /**
   * Run full bi-directional sync (Pull catalog first, then push invoices)
   */
  public static async syncAll(): Promise<{
    success: boolean;
    pulled: number;
    pushed: number;
    message: string;
  }> {
    const isOnline = await this.isOnline();
    if (!isOnline) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        message: 'No internet connection. Synchronizing skipped.',
      };
    }

    const pullResult = await this.pullCloudCatalog();
    if (!pullResult.success) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        message: `Synchronize failed on catalog pull: ${pullResult.message}`,
      };
    }

    const pushResult = await this.pushOfflineSales();
    if (!pushResult.success) {
      return {
        success: false,
        pulled: pullResult.pulledProducts,
        pushed: 0,
        message: `Catalog pulled, but sales upload failed: ${pushResult.message}`,
      };
    }

    return {
      success: true,
      pulled: pullResult.pulledProducts,
      pushed: pushResult.pushedInvoices,
      message: `Full database sync completed! Pulled ${pullResult.pulledProducts} products. Pushed ${pushResult.pushedInvoices} invoices.`,
    };
  }
}
