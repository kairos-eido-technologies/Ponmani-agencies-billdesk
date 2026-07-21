/**
 * Ponmani Agencies Offline - SheetJS Excel Engine
 * Handles template creation, bulk import parsing & validation, table exports,
 * GSTR filing formatting, and full system backup/restore workbooks.
 */

import * as XLSX from 'xlsx';
import { db, DBStore } from '../db/db';

export class ExcelEngine {
  /**
   * Downloads an import template as an .xlsx file.
   */
  public static downloadTemplate(type: 'products' | 'customers' | 'vendors') {
    let headers: string[] = [];
    let sampleRow: Record<string, any> = {};
    let filename = '';

    if (type === 'products') {
      filename = 'Ponmani_Products_Import_Template.xlsx';
      headers = ['Barcode', 'Name', 'Category', 'Unit', 'Cost Price', 'Selling Price', 'Stock Qty', 'Godown Qty', 'MOQ', 'Min Stock Alert', 'SKU Code', 'GST Rate (%)'];
      sampleRow = {
        'Barcode': 'PMA100001',
        'Name': 'Havells 2.5 sqmm Wire (100m Blue)',
        'Category': 'Electricals',
        'Unit': 'Roll',
        'Cost Price': 2100,
        'Selling Price': 2650,
        'Stock Qty': 30,
        'Godown Qty': 100,
        'MOQ': 5,
        'Min Stock Alert': 10,
        'SKU Code': 'SKU-PMA1001',
        'GST Rate (%)': 18,
      };
    } else if (type === 'customers') {
      filename = 'Ponmani_Customers_Import_Template.xlsx';
      headers = ['Name', 'Mobile', 'Email', 'Address', 'GST Number', 'Loyalty Points'];
      sampleRow = {
        'Name': 'Srinivasan K',
        'Mobile': '9443322110',
        'Email': 'srini@gmail.com',
        'Address': '45 West Car Street, Tenkasi',
        'GST Number': '33AAACS1122J1Z3',
        'Loyalty Points': 50,
      };
    } else if (type === 'vendors') {
      filename = 'Ponmani_Suppliers_Import_Template.xlsx';
      headers = ['Supplier Name', 'Company Name', 'Phone', 'Email', 'GST Number', 'Address', 'Balance Due'];
      sampleRow = {
        'Supplier Name': 'Selvam Electricals',
        'Company Name': 'Selvam & Co',
        'Phone': '9842233445',
        'Email': 'selvam@selvamelec.com',
        'GST Number': '33CCCSE3344K1Z2',
        'Address': '89 Market Street, Kovilpatti',
        'Balance Due': 0,
      };
    }

    const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
    XLSX.writeFile(wb, filename);
  }

  /**
   * Reads an uploaded .xlsx file and parses rows into objects.
   */
  public static async parseExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          const wb = XLSX.read(buffer, { type: 'binary' });
          const firstSheetName = wb.SheetNames[0];
          const ws = wb.Sheets[firstSheetName];
          const rawData = XLSX.utils.sheet_to_json(ws);
          resolve(rawData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  }

  /**
   * Export any dataset table to .xlsx
   */
  public static exportToExcel(data: any[], filename: string, sheetName = 'Data') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  }

  /**
   * Export GST filing formatted workbook (B2B, B2C, HSN Summary)
   */
  public static exportGSTData() {
    const store = db.getStore();
    const b2b: any[] = [];
    const b2c: any[] = [];

    store.invoices.forEach((inv) => {
      if (inv.customer_id) {
        const cust = store.customers.find((c) => c.id === inv.customer_id);
        if (cust?.gst_number) {
          b2b.push({
            'GSTIN of Recipient': cust.gst_number,
            'Receiver Name': cust.name,
            'Invoice Number': inv.invoice_number,
            'Invoice Date': inv.created_at.split('T')[0],
            'Invoice Value': inv.grand_total,
            'Place of Supply': '33-Tamil Nadu',
            'Reverse Charge': 'N',
            'Invoice Type': 'Regular',
            'Taxable Value': inv.subtotal - inv.discount_amount,
            'Integrated Tax': 0,
            'Central Tax': (inv.tax_amount / 2).toFixed(2),
            'State Tax': (inv.tax_amount / 2).toFixed(2),
          });
          return;
        }
      }

      b2c.push({
        'Invoice Number': inv.invoice_number,
        'Date': inv.created_at.split('T')[0],
        'Customer': inv.customer_name,
        'Taxable Value': inv.subtotal - inv.discount_amount,
        'CGST (9%)': (inv.tax_amount / 2).toFixed(2),
        'SGST (9%)': (inv.tax_amount / 2).toFixed(2),
        'Total Tax': inv.tax_amount,
        'Invoice Total': inv.grand_total,
      });
    });

    // HSN Summary aggregation
    const hsnMap: Record<string, { description: string; qty: number; total_val: number; tax_val: number }> = {};
    store.invoice_items.forEach((ii) => {
      const prod = store.inventory.find((p) => p.id === ii.product_id);
      const sku = prod?.sku_code || prod?.barcode || 'PMA100001';
      if (!hsnMap[sku]) {
        hsnMap[sku] = { description: prod?.category || 'Hardware', qty: 0, total_val: 0, tax_val: 0 };
      }
      hsnMap[sku].qty += ii.qty;
      hsnMap[sku].total_val += ii.total_price;
      hsnMap[sku].tax_val += (ii.total_price * ii.tax_rate) / 100;
    });

    const hsnSummary = Object.entries(hsnMap).map(([sku, d]) => ({
      'SKU / Item Code': sku,
      'Description': d.description,
      'Total Quantity': d.qty,
      'Total Value (₹)': d.total_val,
      'Taxable Value (₹)': d.total_val,
      'Central Tax Amount (₹)': (d.tax_val / 2).toFixed(2),
      'State Tax Amount (₹)': (d.tax_val / 2).toFixed(2),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(b2b.length ? b2b : [{ 'Notice': 'No B2B Invoices Recorded' }]), 'B2B Invoices');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(b2c), 'B2C Small');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hsnSummary), 'HSN Summary');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Ponmani_GSTR_Filing_${timestamp}.xlsx`);
  }

  /**
   * Exports full multi-sheet database backup workbook (.xlsx)
   */
  public static exportFullBackup(): { filename: string; sizeKb: number } {
    const store = db.getStore();
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.inventory), 'Inventory');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.customers), 'Customers');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.vendors), 'Vendors');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.invoices), 'Invoices');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.invoice_items), 'InvoiceItems');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.purchase_orders), 'PurchaseOrders');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.service_tickets), 'ServiceTickets');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.scrap_entries), 'ScrapEntries');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.godown_transfers), 'GodownTransfers');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([store.settings]), 'Settings');

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const filename = `Ponmani_Full_Backup_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);

    const sizeKb = Math.round(JSON.stringify(store).length / 1024);
    db.logBackup(filename, 'MANUAL', sizeKb, 'SUCCESS');
    return { filename, sizeKb };
  }

  /**
   * Restores full database state from uploaded multi-sheet Excel backup
   */
  public static async restoreFromBackupFile(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          const wb = XLSX.read(buffer, { type: 'binary' });
          const currentStore = db.getStore();

          const newStore: Partial<DBStore> = {};
          wb.SheetNames.forEach((name) => {
            const sheet = wb.Sheets[name];
            const data = XLSX.utils.sheet_to_json(sheet);
            if (name === 'Inventory') newStore.inventory = data as any;
            if (name === 'Customers') newStore.customers = data as any;
            if (name === 'Vendors') newStore.vendors = data as any;
            if (name === 'Invoices') newStore.invoices = data as any;
            if (name === 'InvoiceItems') newStore.invoice_items = data as any;
            if (name === 'PurchaseOrders') newStore.purchase_orders = data as any;
            if (name === 'ServiceTickets') newStore.service_tickets = data as any;
            if (name === 'ScrapEntries') newStore.scrap_entries = data as any;
            if (name === 'GodownTransfers') newStore.godown_transfers = data as any;
            if (name === 'Settings' && data.length > 0) newStore.settings = data[0] as any;
          });

          const restoredStore: DBStore = {
            ...currentStore,
            ...newStore,
          };

          db.restoreFullBackup(restoredStore);
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    });
  }
}
