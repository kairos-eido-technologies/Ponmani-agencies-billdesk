/**
 * Ponmani Agencies Offline - Large Dataset Seed Generator
 * Generates 500 Products, 5,000 Customers, 5,000 Sales Invoices,
 * Suppliers, Service Tickets, Scrap Entries, and Godown Transfers for realistic stress testing.
 */

import { DBStore, InventoryItem, Customer, Vendor, Invoice, InvoiceItem, ServiceTicket, ScrapEntry, GodownTransfer, PurchaseOrder, PurchaseItem, User } from './db';

const BRANDS = ['Havells', 'Legrand', 'Anchor', 'Finolex', 'Orient', 'Bosch', 'Exide', 'V-Guard', 'Crompton', 'Syska', 'Polycab', 'Supreme', 'Stanley', 'Microtek', 'Schneider'];

const CATEGORIES = [
  { name: 'Electricals', hsn: '8544', gst: 18, units: ['Roll', 'Meter', 'Box'] },
  { name: 'Switches & Sockets', hsn: '8536', gst: 18, units: ['Piece', 'Box'] },
  { name: 'Fans & Cooling', hsn: '8414', gst: 18, units: ['Piece', 'Set'] },
  { name: 'Plumbing & Pipes', hsn: '3917', gst: 18, units: ['Length', 'Piece'] },
  { name: 'Power Tools & Hardware', hsn: '8467', gst: 18, units: ['Piece', 'Kit'] },
  { name: 'Batteries & Inverters', hsn: '8507', gst: 28, units: ['Piece', 'Unit'] },
  { name: 'Appliances & Stabilizers', hsn: '9032', gst: 18, units: ['Piece', 'Unit'] },
  { name: 'Lighting & LEDs', hsn: '9405', gst: 12, units: ['Piece', 'Pack'] },
];

const FIRST_NAMES = ['Murugan', 'Karthik', 'Selvam', 'Ramanathan', 'Balaji', 'Vijay', 'Ganesh', 'Senthil', 'Kumar', 'Ananth', 'Subramanian', 'Rajesh', 'Srinivasan', 'Mani', 'Pandian', 'Sundar', 'Dinesh', 'Prakash', 'Saravanan', 'Venkatesh'];
const LAST_NAMES = ['Pillai', 'Nadar', 'Chettiar', 'Thevar', 'Iyer', 'Gounder', 'Naidu', 'S', 'K', 'M', 'R', 'T'];
const TOWNS = ['Tenkasi', 'Madurai', 'Tirunelveli', 'Tuticorin', 'Kovilpatti', 'Nagercoil', 'Rajapalayam', 'Sankarankovil', 'Ambasamudram', 'Courtallam', 'Surandai', 'Kadayanallur'];

export function generateLargeSeedData(): DBStore {
  const now = Date.now();
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

  // 1. Users
  const users: User[] = [
    { id: 'usr-1', username: 'admin', pin: '1234', role: 'Admin', created_at: new Date(now - ONE_YEAR_MS).toISOString() },
    { id: 'usr-2', username: 'cashier', pin: '0000', role: 'Cashier', created_at: new Date(now - ONE_YEAR_MS).toISOString() },
  ];

  // 2. 500 Inventory Products
  const inventory: InventoryItem[] = [];
  let prodCount = 1;

  for (let i = 0; i < 500; i++) {
    const brand = BRANDS[i % BRANDS.length];
    const catObj = CATEGORIES[i % CATEGORIES.length];
    const itemNum = Math.floor(i / CATEGORIES.length) + 1;
    const name = `${brand} ${catObj.name.slice(0, -1)} Series-${itemNum} (${catObj.units[i % catObj.units.length]})`;
    const cost = Math.round(50 + ((i * 37) % 4500));
    const markup = 1.25 + ((i % 15) * 0.02);
    const price = Math.round(cost * markup);
    const barcode = '890' + String(1000000000 + i);

    // Create 40 low stock items for alert testing
    const isLowStock = i < 40;
    const stockQty = isLowStock ? Math.floor(Math.random() * 4) : 15 + ((i * 13) % 200);
    const godownQty = 30 + ((i * 17) % 500);

    inventory.push({
      id: `prod-${prodCount++}`,
      barcode,
      name,
      category: catObj.name,
      unit: catObj.units[i % catObj.units.length],
      cost_price: cost,
      selling_price: price,
      stock_qty: stockQty,
      godown_qty: godownQty,
      moq: 10,
      min_stock_alert: 15,
      hsn_code: catObj.hsn,
      gst_rate: catObj.gst,
      created_at: new Date(now - ((i * 70000000) % ONE_YEAR_MS)).toISOString(),
    });
  }

  // 3. 5,000 Customers
  const customers: Customer[] = [];
  for (let i = 0; i < 5000; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[i % LAST_NAMES.length];
    const town = TOWNS[i % TOWNS.length];
    const mobile = `9${Math.floor(100000000 + ((i * 7919) % 899999999))}`;
    const isB2B = i % 25 === 0;

    customers.push({
      id: `cust-${i + 1}`,
      name: `${fn} ${ln}`,
      mobile,
      email: `${fn.toLowerCase()}.${i}@gmail.com`,
      address: `${(i % 120) + 1} Main Road, ${town}`,
      gst_number: isB2B ? `33AAAPF${String(1000 + (i % 8000))}H1Z${i % 9}` : '',
      loyalty_points: (i * 17) % 850,
      total_spent: Math.round(500 + ((i * 350) % 85000)),
      created_at: new Date(now - ((i * 6000000) % ONE_YEAR_MS)).toISOString(),
    });
  }

  // 4. 50 Suppliers
  const vendors: Vendor[] = [];
  for (let i = 0; i < 50; i++) {
    const brand = BRANDS[i % BRANDS.length];
    vendors.push({
      id: `ven-${i + 1}`,
      name: `${FIRST_NAMES[i % FIRST_NAMES.length]} (Agent)`,
      company_name: `${brand} Wholesale Agencies`,
      phone: `9842${String(100000 + i)}`,
      email: `orders@${brand.toLowerCase()}distributors.in`,
      gst_number: `33CCCSE${String(1000 + i)}K1Z2`,
      address: `${i + 10} Goods Shed Road, Madurai`,
      balance_due: (i % 4 === 0) ? Math.round(15000 + i * 1200) : 0,
      created_at: new Date(now - ONE_YEAR_MS).toISOString(),
    });
  }

  // 5. 5,000 Sales Invoices
  const invoices: Invoice[] = [];
  const invoice_items: InvoiceItem[] = [];
  const METHODS: Invoice['payment_method'][] = ['CASH', 'UPI', 'CARD', 'CREDIT'];

  let iiCount = 1;
  for (let i = 0; i < 5000; i++) {
    const invId = `inv-${i + 1}`;
    const invNumber = `INV-${2025 + Math.floor(i / 4000)}-${String((i % 4000) + 1).padStart(5, '0')}`;
    const cust = customers[i % customers.length];
    const isGST = i % 3 !== 0;

    // Pick 1 to 4 products for this invoice
    const itemCount = 1 + (i % 4);
    let subtotal = 0;
    let taxAmount = 0;

    for (let j = 0; j < itemCount; j++) {
      const prod = inventory[(i * 7 + j * 13) % inventory.length];
      const qty = 1 + ((i + j) % 5);
      const lineSubtotal = qty * prod.selling_price;
      const lineTax = isGST ? (lineSubtotal * prod.gst_rate) / 100 : 0;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      invoice_items.push({
        id: `ii-${iiCount++}`,
        invoice_id: invId,
        product_id: prod.id,
        barcode: prod.barcode,
        product_name: prod.name,
        qty,
        unit_price: prod.selling_price,
        tax_rate: isGST ? prod.gst_rate : 0,
        total_price: lineSubtotal,
      });
    }

    const discount = (i % 10 === 0) ? 100 : 0;
    const grandTotal = Math.max(0, subtotal + taxAmount - discount);
    const timestamp = new Date(now - ((5000 - i) * 600000)).toISOString();

    invoices.push({
      id: invId,
      invoice_number: invNumber,
      customer_id: cust.id,
      customer_name: cust.name,
      customer_mobile: cust.mobile,
      invoice_type: isGST ? (cust.gst_number ? 'GST' : 'GST') : 'NON_GST',
      subtotal,
      tax_amount: Math.round(taxAmount),
      discount_amount: discount,
      grand_total: Math.round(grandTotal),
      payment_method: METHODS[i % METHODS.length],
      payment_status: 'PAID',
      created_at: timestamp,
    });
  }

  // 6. Purchase Orders
  const purchase_orders: PurchaseOrder[] = [];
  const purchase_items: PurchaseItem[] = [];
  for (let i = 0; i < 60; i++) {
    const poId = `po-${i + 1}`;
    const vendor = vendors[i % vendors.length];
    const prod = inventory[i % inventory.length];
    const poNum = `PO-2026-${String(i + 1).padStart(3, '0')}`;
    const total = prod.cost_price * 50;

    purchase_orders.push({
      id: poId,
      po_number: poNum,
      vendor_id: vendor.id,
      vendor_name: vendor.company_name,
      status: 'Received',
      total_amount: total,
      paid_amount: total,
      created_at: new Date(now - (i * 5 * 86400000)).toISOString(),
    });

    purchase_items.push({
      id: `pi-${i + 1}`,
      po_id: poId,
      product_id: prod.id,
      product_name: prod.name,
      qty: 50,
      cost_price: prod.cost_price,
      total,
    });
  }

  // 7. Service Department Tickets
  const service_tickets: ServiceTicket[] = [];
  const ISSUES = [
    'No power output, charging light blinking red error code',
    'Ceiling fan humming noise and slow speed coil short',
    'Rotary hammer drill chuck jammed & armature sparking',
    'AC Stabilizer low voltage cut-off tripping repeatedly',
    'Modular switch spark burning and loose internal contact',
  ];
  const STATUSES: ServiceTicket['status'][] = ['Intake', 'In Progress', 'Ready', 'Delivered'];

  for (let i = 0; i < 150; i++) {
    const cust = customers[i % customers.length];
    const prod = inventory[(i * 3) % inventory.length];
    const est = 350 + (i * 45) % 1500;

    service_tickets.push({
      id: `srv-${i + 1}`,
      ticket_number: `SRV-2026-${String(i + 1).padStart(3, '0')}`,
      customer_id: cust.id,
      customer_name: cust.name,
      customer_mobile: cust.mobile,
      device_name: prod.name,
      serial_number: `SN2026-${Math.floor(10000 + i * 37)}`,
      issue_description: ISSUES[i % ISSUES.length],
      estimated_cost: est,
      final_cost: est + 50,
      status: STATUSES[i % STATUSES.length],
      created_at: new Date(now - (i * 2 * 86400000)).toISOString(),
      updated_at: new Date(now - (i * 86400000)).toISOString(),
    });
  }

  // 8. Scrap Purchases
  const scrap_entries: ScrapEntry[] = [];
  const SCRAP_TYPES = ['Copper Winding Wire Scrap', 'Brass Plumbing Fittings', 'Aluminum Cable Scrap', 'Old Pump Core Dismantled'];
  for (let i = 0; i < 100; i++) {
    const weight = 3 + ((i * 1.7) % 25);
    const rate = 350 + ((i * 15) % 250);
    scrap_entries.push({
      id: `scp-${i + 1}`,
      customer_name: FIRST_NAMES[i % FIRST_NAMES.length] + ' ' + LAST_NAMES[i % LAST_NAMES.length],
      customer_mobile: `9443${String(100000 + i)}`,
      item_type: SCRAP_TYPES[i % SCRAP_TYPES.length],
      weight_kg: Number(weight.toFixed(1)),
      price_per_kg: rate,
      total_payout: Math.round(weight * rate),
      notes: 'Dismantled old electrical coils',
      created_at: new Date(now - (i * 3 * 86400000)).toISOString(),
    });
  }

  // 9. Godown Stock Transfers
  const godown_transfers: GodownTransfer[] = [];
  for (let i = 0; i < 100; i++) {
    const prod = inventory[i % inventory.length];
    godown_transfers.push({
      id: `gdn-${i + 1}`,
      product_id: prod.id,
      product_name: prod.name,
      transfer_type: i % 2 === 0 ? 'GODOWN_TO_SHOP' : 'SHOP_TO_GODOWN',
      qty: 5 + (i % 20),
      notes: 'Refilling active counter display stock',
      created_at: new Date(now - (i * 2 * 86400000)).toISOString(),
    });
  }

  return {
    users,
    inventory,
    vendors,
    purchase_orders,
    purchase_items,
    customers,
    loyalty_ledger: [],
    invoices,
    invoice_items,
    service_tickets,
    scrap_entries,
    godown_transfers,
    backups_log: [],
    settings: {
      shop_name: 'Ponmani Agencies',
      shop_address: '142 Main Road, Tenkasi, Tamil Nadu - 627811',
      shop_phone: '+91 94422 12345',
      shop_gstin: '33AAPFP1234H1Z9',
      printer_type: 'Thermal ESC/POS 80mm',
      printer_name: 'POS-80 Series',
      auto_backup_enabled: true,
      auto_backup_frequency: 'Daily',
      retain_backups_count: 30,
      scanner_prefix: '',
      scanner_suffix: 'Enter',
    },
  };
}
