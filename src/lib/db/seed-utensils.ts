/**
 * Ponmani Utensils & Kitchen Store — High Capacity Seed Data Generator
 * Multi-thousand records across ALL modules:
 * Inventory (1,200+), Customers (2,000+), Vendors (50+),
 * Purchase Orders (1,000+), Invoices (5,000+), Invoice Items (15,000+),
 * Service Tickets (1,000+), Scrap Entries (1,000+), Godown Transfers (1,000+)
 */

const BASE_PRODUCTS = [
  { name: "Pressure Cooker", cat: "Pressure Cookers", cost: 750, sell: 950, gst: 12, unit: "PCS", prefix: "PC" },
  { name: "Non-Stick Kadhai", cat: "Non-Stick Cookware", cost: 650, sell: 890, gst: 12, unit: "PCS", prefix: "NS" },
  { name: "Non-Stick Tawa", cat: "Non-Stick Cookware", cost: 380, sell: 520, gst: 12, unit: "PCS", prefix: "NT" },
  { name: "Hard Anodised Pan", cat: "Hard Anodised", cost: 850, sell: 1150, gst: 12, unit: "PCS", prefix: "HA" },
  { name: "Stainless Steel Kadhai", cat: "Stainless Steel", cost: 420, sell: 580, gst: 18, unit: "PCS", prefix: "SS" },
  { name: "Stainless Steel Sauce Pan", cat: "Stainless Steel", cost: 280, sell: 390, gst: 18, unit: "PCS", prefix: "SP" },
  { name: "Stainless Steel Pot", cat: "Stainless Steel", cost: 480, sell: 650, gst: 18, unit: "PCS", prefix: "POT" },
  { name: "Cast Iron Dosa Tawa", cat: "Cast Iron", cost: 550, sell: 780, gst: 12, unit: "PCS", prefix: "CI" },
  { name: "Melamine Dinner Set", cat: "Dinner Sets", cost: 780, sell: 1050, gst: 12, unit: "SET", prefix: "DS" },
  { name: "Borosil Glassware Set", cat: "Dinner Sets", cost: 1200, sell: 1650, gst: 12, unit: "SET", prefix: "GS" },
  { name: "Thermosteel Flask", cat: "Flasks & Bottles", cost: 420, sell: 580, gst: 12, unit: "PCS", prefix: "FL" },
  { name: "Airtight Storage Container", cat: "Storage Containers", cost: 180, sell: 260, gst: 12, unit: "PCS", prefix: "SC" },
  { name: "Table Top Wet Grinder 2L", cat: "Kitchen Appliances", cost: 3500, sell: 4500, gst: 18, unit: "PCS", prefix: "WG" },
  { name: "Mixer Grinder 750W", cat: "Kitchen Appliances", cost: 2800, sell: 3600, gst: 18, unit: "PCS", prefix: "MG" },
  { name: "Induction Cooktop 1800W", cat: "Kitchen Appliances", cost: 1600, sell: 2100, gst: 18, unit: "PCS", prefix: "IC" },
  { name: "Electric Kettle 1.5L", cat: "Kitchen Appliances", cost: 680, sell: 900, gst: 18, unit: "PCS", prefix: "EK" },
  { name: "LPG Gas Stove 2-Burner", cat: "Kitchen Appliances", cost: 1900, sell: 2500, gst: 18, unit: "PCS", prefix: "GS" },
  { name: "Cutlery Set 6pcs", cat: "Cutlery", cost: 120, sell: 180, gst: 18, unit: "SET", prefix: "CU" },
  { name: "Ladle & Spatula Set", cat: "Cooking Tools", cost: 220, sell: 320, gst: 18, unit: "SET", prefix: "CT" },
  { name: "Stainless Steel Idli Stand", cat: "Cooking Tools", cost: 280, sell: 390, gst: 18, unit: "PCS", prefix: "IS" },
  { name: "Casserole Hot Pot", cat: "Casseroles", cost: 480, sell: 650, gst: 12, unit: "PCS", prefix: "CA" },
  { name: "Idiyappam / Puttu Press", cat: "Specialty Items", cost: 320, sell: 450, gst: 12, unit: "PCS", prefix: "SP" },
  { name: "Copper Bottom Cooking Vessel", cat: "Copper Ware", cost: 580, sell: 820, gst: 18, unit: "PCS", prefix: "CP" },
  { name: "Traditional Brass Lamp / Vessel", cat: "Brass Ware", cost: 850, sell: 1200, gst: 18, unit: "PCS", prefix: "BR" },
];

const BRANDS = ["Hawkins", "Prestige", "Pigeon", "Butterfly", "Milton", "Cello", "Borosil", "Sujata", "Preethi", "Bajaj", "Philips", "Vinod", "Tefal", "Sunflame"];
const SIZES = ["1.5L", "2L", "3L", "5L", "7.5L", "10L", "20cm", "24cm", "28cm", "30cm", "32cm", "Small", "Medium", "Large", "Jumbo"];

const CUSTOMER_FIRST = [
  "Anitha", "Priya", "Lakshmi", "Muthu", "Saraswathi", "Vijayalakshmi", "Karthik", "Meenakshi",
  "Suresh", "Radha", "Thangamani", "Kavitha", "Senthil", "Devi", "Ganesh", "Yamini",
  "Balamurugan", "Parvathi", "Chandran", "Selvi", "Amutha", "Natarajan", "Rohini", "Manoharan",
  "Padma", "Rajendran", "Vasantha", "Usha", "Velmurugan", "Kamala", "Arumugam", "Santhi",
  "Palani", "Girija", "Rajagopal", "Malathi", "Krishnan", "Ponmani", "Duraisamy", "Jayanthi",
  "Murugesan", "Nirmala", "Selvakumar", "Geetha", "Ramachandran", "Indira", "Sathyamoorthy",
];

const CUSTOMER_LAST = [
  "Rajan", "Kumar", "Murali", "Priya", "Babu", "Shankar", "Nair", "Arumugam", "Devi", "Suresh",
  "Narayanan", "Balaji", "Raman", "Kalyan", "Ramanathan", "Pandi", "Swamy", "Nathan", "Mani",
];

const TOWNS = [
  "Coimbatore", "Salem", "Madurai", "Tirunelveli", "Erode", "Trichy", "Vellore", "Tiruppur",
  "Thanjavur", "Dindigul", "Karur", "Namakkal", "Villupuram", "Tuticorin", "Kanyakumari",
  "Virudhunagar", "Sivakasi", "Ramanathapuram", "Cuddalore", "Pollachi", "Tenkasi", "Sankarankovil",
];

const ISSUES = [
  "Mixer grinder motor overload tripping", "Pressure cooker whistle steam leak", "Induction cooktop E0 sensor error",
  "Mixer grinder jar coupling broken", "Gas stove burner flame low", "Induction cooktop heating coil burned",
  "Wet grinder stone shaft stuck", "Electric kettle thermal cutoff failed", "Toaster element wire broken",
  "Hand blender motor noise", "Pressure cooker gasket loose", "Mixer grinder stainless blade blunt",
  "Gas stove valve knob tight", "Electric kettle base connector loose", "Wet grinder top lock crack",
];

const SCRAP = [
  "Old aluminium vessel scrap", "Broken stainless steel kadhai", "Used copper vessels",
  "Old iron tawa scrap", "Damaged mixer grinder outer body", "Old brass brassware scrap",
  "Broken pressure cooker body", "Heavy gauge aluminium scrap", "Used brass lamps",
];

function fmtNum(n: number, pad = 5): string {
  return String(n).padStart(pad, "0");
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randDate(daysAgo: number, daysAgoMin = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - randInt(daysAgoMin, daysAgo));
  d.setHours(randInt(8, 21), randInt(0, 59), 0, 0);
  return d.toISOString();
}

export function generateUtensilsSeedData() {
  // ── 1. Inventory (4,000 products) ───────────────────────────────────────
  const inventory: any[] = [];
  let itemCounter = 1;
  for (let i = 0; i < 4000; i++) {
    const base = BASE_PRODUCTS[i % BASE_PRODUCTS.length];
    const brand = BRANDS[Math.floor(i / BASE_PRODUCTS.length) % BRANDS.length];
    const size = SIZES[i % SIZES.length];
    const variantNum = Math.floor(i / (BASE_PRODUCTS.length * BRANDS.length)) + 1;
    const variantSuffix = variantNum > 1 ? ` v${variantNum}` : "";
    const name = `${brand} ${base.name} ${size}${variantSuffix}`;
    const barcode = `${base.prefix}${fmtNum(itemCounter, 5)}`;
    const sku = `KSH-${base.prefix}-${fmtNum(itemCounter, 5)}`;
    const cost = base.cost + randInt(-50, 150);
    const sell = Math.round(cost * (1.25 + Math.random() * 0.2));

    inventory.push({
      id: `inv-${fmtNum(itemCounter, 6)}`,
      barcode,
      name,
      category: base.cat,
      unit: base.unit,
      cost_price: cost,
      selling_price: sell,
      stock_qty: randInt(15, 250),
      godown_qty: randInt(30, 400),
      moq: 1,
      min_stock_alert: 5,
      sku_code: sku,
      gst_rate: base.gst,
      created_at: randDate(400, 300),
    });
    itemCounter++;
  }

  // ── 2. Vendors (100 wholesale suppliers) ──────────────────────────────────
  const vendors: any[] = [];
  for (let v = 1; v <= 100; v++) {
    const fn = randFrom(CUSTOMER_FIRST);
    const ln = randFrom(CUSTOMER_LAST);
    const town = randFrom(TOWNS);
    const company = `${fn} ${randFrom(["Utensils Wholesale", "Steel Traders", "Kitchen Appliances", "Metal Industries", "Distributors"])} ${town}`;
    vendors.push({
      id: `ven-${fmtNum(v, 4)}`,
      name: `${fn} ${ln}`,
      company_name: company,
      phone: `9${randInt(100000000, 999999999)}`,
      email: `${fn.toLowerCase()}.${town.toLowerCase()}${v}@utensilstrade.in`,
      gst_number: `33AA${randFrom(["B","C","D","E","F"])}C${fmtNum(v, 4)}B1Z${(v % 9) + 1}`,
      address: `${randInt(1, 120)} Main Road, ${town}, Tamil Nadu`,
      balance_due: randInt(0, 75000),
      created_at: randDate(400, 300),
    });
  }

  // ── 3. Customers (5,000 retail buyers) ──────────────────────────────────
  const customers: any[] = [];
  for (let c = 1; c <= 5000; c++) {
    const fn = CUSTOMER_FIRST[(c - 1) % CUSTOMER_FIRST.length];
    const ln = CUSTOMER_LAST[Math.floor((c - 1) / CUSTOMER_FIRST.length) % CUSTOMER_LAST.length];
    const town = TOWNS[c % TOWNS.length];
    const suffix = c > 940 ? ` (${Math.floor(c / 940)})` : "";
    const name = `${fn} ${ln}${suffix}`;
    const totalSpent = randInt(800, 150000);

    customers.push({
      id: `cust-${fmtNum(c, 5)}`,
      name,
      mobile: `9${randInt(100000000, 999999999)}`,
      email: `${fn.toLowerCase()}${c}@gmail.com`,
      address: `${randInt(1, 99)} Bazaar Street, ${town}`,
      gst_number: c % 12 === 0 ? `33AABCK${fmtNum(1000 + c, 4)}B1Z${(c % 9) + 1}` : "",
      loyalty_points: Math.floor(totalSpent / 100),
      total_spent: totalSpent,
      created_at: randDate(400, 100),
    });
  }

  // ── 4. Purchase Orders (2,500 POs + 12,500+ items) ─────────────────────
  const purchase_orders: any[] = [];
  const purchase_items: any[] = [];
  let piCount = 1;

  for (let p = 1; p <= 2500; p++) {
    const vendor = randFrom(vendors);
    const poDate = randDate(365, 0);
    const status = p <= 1800 ? "Received" : p <= 2200 ? "Ordered" : "Draft";
    const numItems = randInt(4, 7);
    let poTotal = 0;
    let poTax = 0;
    const poId = `po-${fmtNum(p, 5)}`;
    const poNumber = `PO-2026-${fmtNum(p, 5)}`;

    for (let pi = 0; pi < numItems; pi++) {
      const prod = randFrom(inventory);
      const qty = randInt(10, 80);
      const taxRate = prod.gst_rate;
      const lineTotal = qty * prod.cost_price;
      const lineTax = (lineTotal * taxRate) / 100;
      poTotal += lineTotal;
      poTax += lineTax;

      purchase_items.push({
        id: `pi-${fmtNum(piCount++, 6)}`,
        po_id: poId,
        product_id: prod.id,
        product_name: prod.name,
        qty,
        unit: prod.unit,
        cost_price: prod.cost_price,
        gst_rate: taxRate,
        total: lineTotal,
      });
    }

    purchase_orders.push({
      id: poId,
      po_number: poNumber,
      vendor_id: vendor.id,
      vendor_name: vendor.company_name,
      status,
      total_amount: Math.round(poTotal + poTax),
      paid_amount: status === "Received" ? Math.round(poTotal + poTax) : randInt(0, Math.round(poTotal)),
      tax_amount: Math.round(poTax),
      discount_amount: 0,
      notes: `Purchase order for ${vendor.company_name}`,
      expected_date: new Date(new Date(poDate).getTime() + 7 * 86400000).toISOString(),
      created_at: poDate,
    });
  }

  // ── 5. Invoices + Items (10,000 Invoices + 25,000+ items) ──────────────
  const invoices: any[] = [];
  const invoice_items: any[] = [];
  const loyalty_ledger: any[] = [];
  let iiCount = 1;
  let loyCount = 1;

  for (let inv = 1; inv <= 10000; inv++) {
    const customer = randFrom(customers);
    const invType = Math.random() < 0.55 ? "GST" : Math.random() < 0.8 ? "NON_GST" : "MIXED";
    const payMethod = randFrom(["CASH", "UPI", "CARD", "CASH", "UPI", "CASH"]);
    const invDate = randDate(365, 0);
    const numItems = randInt(1, 4);
    const invId = `invoice-${fmtNum(inv, 6)}`;
    const invNumber = `KSH-${new Date(invDate).getFullYear()}-${fmtNum(inv, 5)}`;

    let subtotal = 0;
    let taxAmt = 0;
    const discount = Math.random() < 0.15 ? randInt(20, 200) : 0;

    for (let ii = 0; ii < numItems; ii++) {
      const prod = randFrom(inventory);
      const qty = randInt(1, 4);
      const unitPrice = prod.selling_price;
      const taxRate = invType === "NON_GST" ? 0 : prod.gst_rate;
      const lineTotal = qty * unitPrice;
      const lineTax = (lineTotal * taxRate) / 100;
      subtotal += lineTotal;
      taxAmt += lineTax;

      invoice_items.push({
        id: `ii-${fmtNum(iiCount++, 6)}`,
        invoice_id: invId,
        product_id: prod.id,
        barcode: prod.barcode,
        product_name: prod.name,
        qty,
        unit_price: unitPrice,
        tax_rate: taxRate,
        total_price: lineTotal,
        is_return: false,
      });
    }

    const grandTotal = Math.round(subtotal + taxAmt - discount);
    const pts = Math.floor(grandTotal / 100);

    invoices.push({
      id: invId,
      invoice_number: invNumber,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_mobile: customer.mobile,
      invoice_type: invType,
      subtotal: Math.round(subtotal),
      tax_amount: Math.round(taxAmt),
      discount_amount: discount,
      exchange_amount: 0,
      exchange_notes: "",
      grand_total: Math.max(grandTotal, 0),
      payment_method: payMethod,
      payment_status: Math.random() < 0.92 ? "PAID" : "PENDING",
      created_at: invDate,
      is_synced: 1,
    });

    if (pts > 0) {
      loyalty_ledger.push({
        id: `loy-${fmtNum(loyCount++, 6)}`,
        customer_id: customer.id,
        points_change: pts,
        reason: `Purchase ${invNumber}`,
        created_at: invDate,
      });
    }
  }

  // ── 6. Service Tickets (2,500 tickets) ─────────────────────────────────
  const service_tickets: any[] = [];
  const serviceStatuses: string[] = ["Intake", "In Progress", "Ready", "Delivered"];
  for (let s = 1; s <= 2500; s++) {
    const cust = randFrom(customers);
    const prod = randFrom(inventory.filter((i) => i.category === "Kitchen Appliances" || i.category === "Pressure Cookers"));
    const est = randInt(150, 2500);
    const status = randFrom(serviceStatuses);
    const tokNum = String(((s - 1) % 99) + 1).padStart(2, "0");

    service_tickets.push({
      id: `srv-${fmtNum(s, 5)}`,
      ticket_number: `PMA-S-2026-${fmtNum(s, 5)}`,
      queue_number: `TOKEN-#${tokNum}`,
      customer_id: cust.id,
      customer_name: cust.name,
      customer_mobile: cust.mobile,
      device_name: prod ? prod.name : "Pressure Cooker 5L",
      serial_number: `SN${randInt(100000, 999999)}`,
      issue_description: randFrom(ISSUES),
      estimated_cost: est,
      final_cost: status === "Delivered" || status === "Ready" ? randInt(est, est + 400) : 0,
      status,
      created_at: randDate(200, 0),
      updated_at: randDate(50, 0),
    });
  }

  // ── 7. Scrap Entries (2,500 entries) ───────────────────────────────────
  const scrap_entries: any[] = [];
  for (let sc = 1; sc <= 2500; sc++) {
    const cust = randFrom(customers);
    const weight = randInt(1, 30);
    const priceKg = randInt(30, 150);
    scrap_entries.push({
      id: `scrap-${fmtNum(sc, 5)}`,
      customer_name: cust.name,
      customer_mobile: cust.mobile,
      item_type: randFrom(SCRAP),
      weight_kg: weight,
      price_per_kg: priceKg,
      total_payout: weight * priceKg,
      notes: "Utensils metal scrap buyback",
      created_at: randDate(300, 0),
    });
  }

  // ── 8. Godown Transfers (2,500 transfers) ─────────────────────────────
  const godown_transfers: any[] = [];
  for (let gt = 1; gt <= 2500; gt++) {
    const prod = randFrom(inventory);
    const qty = randInt(5, 60);
    const dir = Math.random() < 0.5 ? "shop_to_godown" : "godown_to_shop";
    godown_transfers.push({
      id: `gdt-${fmtNum(gt, 5)}`,
      product_id: prod.id,
      product_name: prod.name,
      qty,
      direction: dir,
      notes: `Stock transfer - ${dir.replace("_", " to ")}`,
      created_at: randDate(200, 0),
    });
  }

  // ── 9. Settings ────────────────────────────────────────────────────────
  const settings = {
    shop_name: "Ponmani Utensils & Kitchen Store",
    shop_address: "142 Main Bazaar Road, Kalampalayam, Coimbatore, Tamil Nadu - 641030",
    shop_phone: "+91 63797 25737",
    shop_gstin: "33AAPFP1234H1Z9",
    receipt_header_note: "Kitchen Utensils • Cookware • Appliances",
    receipt_footer_note: "Goods once sold can be exchanged within 7 days with original receipt. Quality guaranteed. Thank you for your business!",
    service_ticket_terms: "Present this receipt token during appliance collection. Items left unclaimed over 30 days are subject to shop terms. Thank you!",
    po_footer_terms: "Please acknowledge receipt of this Purchase Order and confirm delivery schedule.",
    printer_type: "Thermal ESC/POS 80mm",
    printer_name: "POS-80 Series",
    auto_backup_enabled: true,
    auto_backup_frequency: "Daily",
    retain_backups_count: 30,
    scanner_prefix: "",
    scanner_suffix: "Enter",
  };

  return {
    inventory,
    vendors,
    customers,
    purchase_orders,
    purchase_items,
    invoices,
    invoice_items,
    loyalty_ledger,
    service_tickets,
    scrap_entries,
    godown_transfers,
    settings,
  };
}
