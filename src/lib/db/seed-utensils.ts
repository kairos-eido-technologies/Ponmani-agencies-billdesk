/**
 * Ponmani Utensils & Kitchen Store — Realistic Seed Data Generator
 * Covers: Inventory, Vendors, Customers, Purchase Orders, Invoices,
 *         Service Tickets, Scrap Entries, Godown Transfers
 * ~5000+ records across all tables
 */

// ─── Utensils & Kitchen Product Catalog ─────────────────────────────────────

const PRODUCTS_CATALOG = [
  // Cookware
  { name: "Hawkins Pressure Cooker 3L", cat: "Pressure Cookers", cost: 750, sell: 950, gst: 12, unit: "PCS", barcode: "HC001" },
  { name: "Hawkins Pressure Cooker 5L", cat: "Pressure Cookers", cost: 950, sell: 1200, gst: 12, unit: "PCS", barcode: "HC002" },
  { name: "Prestige Pressure Cooker 3L", cat: "Pressure Cookers", cost: 780, sell: 980, gst: 12, unit: "PCS", barcode: "HC003" },
  { name: "Prestige Pressure Cooker 5L", cat: "Pressure Cookers", cost: 990, sell: 1250, gst: 12, unit: "PCS", barcode: "HC004" },
  { name: "Vinod Pressure Cooker 2L", cat: "Pressure Cookers", cost: 680, sell: 850, gst: 12, unit: "PCS", barcode: "HC005" },
  { name: "Pigeon Pressure Cooker 3L", cat: "Pressure Cookers", cost: 620, sell: 790, gst: 12, unit: "PCS", barcode: "HC006" },
  { name: "Hawkins Futura Non-Stick Kadhai 3L", cat: "Non-Stick Cookware", cost: 1100, sell: 1450, gst: 12, unit: "PCS", barcode: "NS001" },
  { name: "Prestige Non-Stick Tawa 25cm", cat: "Non-Stick Cookware", cost: 380, sell: 520, gst: 12, unit: "PCS", barcode: "NS002" },
  { name: "Tefal Non-Stick Fry Pan 24cm", cat: "Non-Stick Cookware", cost: 850, sell: 1100, gst: 12, unit: "PCS", barcode: "NS003" },
  { name: "Pigeon Non-Stick Kadhai 2.5L", cat: "Non-Stick Cookware", cost: 450, sell: 620, gst: 12, unit: "PCS", barcode: "NS004" },
  { name: "Prestige Hard Anodised Kadhai 4L", cat: "Hard Anodised", cost: 1200, sell: 1600, gst: 12, unit: "PCS", barcode: "HA001" },
  { name: "Hawkins Hard Anodised Pressure Pan 3L", cat: "Hard Anodised", cost: 1050, sell: 1380, gst: 12, unit: "PCS", barcode: "HA002" },
  { name: "Stainless Steel Kadhai 30cm", cat: "Stainless Steel", cost: 420, sell: 580, gst: 18, unit: "PCS", barcode: "SS001" },
  { name: "Stainless Steel Sauce Pan 16cm", cat: "Stainless Steel", cost: 280, sell: 390, gst: 18, unit: "PCS", barcode: "SS002" },
  { name: "Stainless Steel Fry Pan 24cm", cat: "Stainless Steel", cost: 350, sell: 480, gst: 18, unit: "PCS", barcode: "SS003" },
  { name: "Stainless Steel Milk Pan 1L", cat: "Stainless Steel", cost: 180, sell: 250, gst: 18, unit: "PCS", barcode: "SS004" },
  { name: "Stainless Steel Cooking Pot 5L", cat: "Stainless Steel", cost: 480, sell: 650, gst: 18, unit: "PCS", barcode: "SS005" },
  { name: "Stainless Steel Biriyani Pot 10L", cat: "Stainless Steel", cost: 780, sell: 1050, gst: 18, unit: "PCS", barcode: "SS006" },
  { name: "Cast Iron Tawa 30cm", cat: "Cast Iron", cost: 650, sell: 890, gst: 12, unit: "PCS", barcode: "CI001" },
  { name: "Cast Iron Kadhai 3L", cat: "Cast Iron", cost: 890, sell: 1200, gst: 12, unit: "PCS", barcode: "CI002" },
  // Dinner Sets
  { name: "Milton Melamine Dinner Set 19pcs", cat: "Dinner Sets", cost: 780, sell: 1050, gst: 12, unit: "SET", barcode: "DS001" },
  { name: "Borosil Glass Dinner Set 14pcs", cat: "Dinner Sets", cost: 1200, sell: 1650, gst: 12, unit: "SET", barcode: "DS002" },
  { name: "Stainless Steel Dinner Set 26pcs", cat: "Dinner Sets", cost: 950, sell: 1290, gst: 18, unit: "SET", barcode: "DS003" },
  { name: "Ceramic Dinner Set 12pcs", cat: "Dinner Sets", cost: 1100, sell: 1500, gst: 12, unit: "SET", barcode: "DS004" },
  // Bottles & Containers
  { name: "Milton Thermosteel Flask 1L", cat: "Flasks & Bottles", cost: 420, sell: 580, gst: 12, unit: "PCS", barcode: "FL001" },
  { name: "Milton Thermosteel Flask 500ml", cat: "Flasks & Bottles", cost: 320, sell: 450, gst: 12, unit: "PCS", barcode: "FL002" },
  { name: "Borosil Flask 500ml", cat: "Flasks & Bottles", cost: 380, sell: 520, gst: 12, unit: "PCS", barcode: "FL003" },
  { name: "Cello Puro Water Bottle 1L", cat: "Flasks & Bottles", cost: 180, sell: 260, gst: 12, unit: "PCS", barcode: "FL004" },
  { name: "Milton Steel Water Bottle 750ml", cat: "Flasks & Bottles", cost: 220, sell: 320, gst: 12, unit: "PCS", barcode: "FL005" },
  { name: "Lock & Lock Airtight Container 1L", cat: "Storage Containers", cost: 180, sell: 260, gst: 12, unit: "PCS", barcode: "SC001" },
  { name: "Tupperware Container Set 4pcs", cat: "Storage Containers", cost: 520, sell: 720, gst: 12, unit: "SET", barcode: "SC002" },
  { name: "Borosil Mixing Bowl Set 3pcs", cat: "Storage Containers", cost: 450, sell: 620, gst: 12, unit: "SET", barcode: "SC003" },
  { name: "Stainless Steel Dabba Container 3L", cat: "Storage Containers", cost: 280, sell: 390, gst: 18, unit: "PCS", barcode: "SC004" },
  // Appliances
  { name: "Butterfly Wet Grinder 2L Table Top", cat: "Kitchen Appliances", cost: 3500, sell: 4500, gst: 18, unit: "PCS", barcode: "KA001" },
  { name: "Sujata Mixer Grinder 750W", cat: "Kitchen Appliances", cost: 2800, sell: 3600, gst: 18, unit: "PCS", barcode: "KA002" },
  { name: "Preethi Mixer Grinder 750W", cat: "Kitchen Appliances", cost: 3200, sell: 4100, gst: 18, unit: "PCS", barcode: "KA003" },
  { name: "Bajaj Mixer Grinder 500W", cat: "Kitchen Appliances", cost: 1800, sell: 2400, gst: 18, unit: "PCS", barcode: "KA004" },
  { name: "Prestige Induction Cooktop 1600W", cat: "Kitchen Appliances", cost: 1600, sell: 2100, gst: 18, unit: "PCS", barcode: "KA005" },
  { name: "Pigeon Induction Cooktop 1800W", cat: "Kitchen Appliances", cost: 1400, sell: 1850, gst: 18, unit: "PCS", barcode: "KA006" },
  { name: "Philips Hand Blender 600W", cat: "Kitchen Appliances", cost: 1200, sell: 1600, gst: 18, unit: "PCS", barcode: "KA007" },
  { name: "Bajaj Toaster 2-Slice", cat: "Kitchen Appliances", cost: 800, sell: 1050, gst: 18, unit: "PCS", barcode: "KA008" },
  { name: "Prestige Electric Kettle 1.5L", cat: "Kitchen Appliances", cost: 680, sell: 900, gst: 18, unit: "PCS", barcode: "KA009" },
  { name: "Butterfly LPG Stove 2-Burner", cat: "Kitchen Appliances", cost: 1900, sell: 2500, gst: 18, unit: "PCS", barcode: "KA010" },
  // Cutlery & Utensils
  { name: "Stainless Steel Spoon Set 6pcs", cat: "Cutlery", cost: 90, sell: 130, gst: 18, unit: "SET", barcode: "CU001" },
  { name: "Stainless Steel Fork Set 6pcs", cat: "Cutlery", cost: 90, sell: 130, gst: 18, unit: "SET", barcode: "CU002" },
  { name: "Stainless Steel Knife Set 3pcs", cat: "Cutlery", cost: 180, sell: 260, gst: 18, unit: "SET", barcode: "CU003" },
  { name: "Kitchen Scissors Stainless Steel", cat: "Cutlery", cost: 120, sell: 180, gst: 18, unit: "PCS", barcode: "CU004" },
  { name: "Ladle Set 5pcs Stainless Steel", cat: "Cooking Tools", cost: 220, sell: 320, gst: 18, unit: "SET", barcode: "CT001" },
  { name: "Turner Spatula Stainless Steel", cat: "Cooking Tools", cost: 80, sell: 120, gst: 18, unit: "PCS", barcode: "CT002" },
  { name: "Strainer Colander 26cm", cat: "Cooking Tools", cost: 150, sell: 220, gst: 18, unit: "PCS", barcode: "CT003" },
  { name: "Idli Stand 4-Plate Stainless", cat: "Cooking Tools", cost: 280, sell: 390, gst: 18, unit: "PCS", barcode: "CT004" },
  { name: "Dosa Tawa Flat 30cm Iron", cat: "Cooking Tools", cost: 280, sell: 380, gst: 12, unit: "PCS", barcode: "CT005" },
  { name: "Rolling Pin Belan Wooden", cat: "Cooking Tools", cost: 60, sell: 90, gst: 5, unit: "PCS", barcode: "CT006" },
  { name: "Chapati Press Roti Maker", cat: "Cooking Tools", cost: 380, sell: 520, gst: 12, unit: "PCS", barcode: "CT007" },
  { name: "Mortar Pestle Stone Small", cat: "Cooking Tools", cost: 180, sell: 260, gst: 5, unit: "PCS", barcode: "CT008" },
  { name: "Vegetable Peeler Stainless", cat: "Cooking Tools", cost: 60, sell: 90, gst: 18, unit: "PCS", barcode: "CT009" },
  { name: "Grater 4-Side Stainless Steel", cat: "Cooking Tools", cost: 90, sell: 130, gst: 18, unit: "PCS", barcode: "CT010" },
  // Casseroles & Serving
  { name: "Milton Casserole 2.5L", cat: "Casseroles", cost: 480, sell: 650, gst: 12, unit: "PCS", barcode: "CA001" },
  { name: "Cello Casserole 3.5L", cat: "Casseroles", cost: 550, sell: 750, gst: 12, unit: "PCS", barcode: "CA002" },
  { name: "Borosil Opalware Serving Bowl Set", cat: "Serving Ware", cost: 620, sell: 850, gst: 12, unit: "SET", barcode: "SW001" },
  { name: "Stainless Steel Serving Spoon Set 5pcs", cat: "Serving Ware", cost: 180, sell: 260, gst: 18, unit: "SET", barcode: "SW002" },
  { name: "Tray Stainless Steel Round 40cm", cat: "Serving Ware", cost: 220, sell: 320, gst: 18, unit: "PCS", barcode: "SW003" },
  // Specialty
  { name: "Idiyappam Maker Press Stainless", cat: "Specialty Items", cost: 350, sell: 480, gst: 12, unit: "PCS", barcode: "SP001" },
  { name: "Puttu Maker Stainless Steel", cat: "Specialty Items", cost: 280, sell: 390, gst: 12, unit: "PCS", barcode: "SP002" },
  { name: "Appam Kadhai Cast Iron", cat: "Specialty Items", cost: 580, sell: 790, gst: 12, unit: "PCS", barcode: "SP003" },
  { name: "Murukku Press 10 Disc Stainless", cat: "Specialty Items", cost: 320, sell: 440, gst: 12, unit: "PCS", barcode: "SP004" },
  { name: "Sambar Vessel 5L Aluminium", cat: "Specialty Items", cost: 380, sell: 520, gst: 18, unit: "PCS", barcode: "SP005" },
  { name: "Steamer Dhokla Stand 3-Layer", cat: "Specialty Items", cost: 480, sell: 650, gst: 12, unit: "PCS", barcode: "SP006" },
  // Gas & Cleaning
  { name: "Cleaning Brush Set 3pcs", cat: "Cleaning Tools", cost: 80, sell: 120, gst: 5, unit: "SET", barcode: "CL001" },
  { name: "Steel Scrubber Pack 6pcs", cat: "Cleaning Tools", cost: 60, sell: 90, gst: 5, unit: "PACK", barcode: "CL002" },
  { name: "Dish Rack Stainless Steel", cat: "Cleaning Tools", cost: 420, sell: 580, gst: 18, unit: "PCS", barcode: "CL003" },
  { name: "Rubber Gloves Kitchen Large", cat: "Cleaning Tools", cost: 60, sell: 90, gst: 5, unit: "PAIR", barcode: "CL004" },
];

const VENDOR_DATA = [
  { name: "Rajkumar", company: "Sri Krishna Utensils Wholesale", phone: "9444123456", gst: "33AAACS1234B1Z5", addr: "45 Anna Salai, Coimbatore" },
  { name: "Subramanian", company: "Tamil Nadu Steel Traders", phone: "9876543210", gst: "33AABCT5678C1Z9", addr: "12 Nehru Street, Madurai" },
  { name: "Annamalai", company: "Hawkins Authorised Dealer", phone: "9942561234", gst: "33AADCH9012D1Z3", addr: "88 Market Road, Salem" },
  { name: "Selvaraj", company: "Prestige Distributors TN", phone: "9988776655", gst: "33AAECP3456E1Z7", addr: "23 Ring Road, Tirunelveli" },
  { name: "Palaniswamy", company: "Kitchen King Wholesale", phone: "9876012345", gst: "33AAFCK7890F1Z1", addr: "67 Gandhi Road, Trichy" },
  { name: "Murugan", company: "Butterfly Home Appliances", phone: "9443210987", gst: "33AAGCB2345G1Z5", addr: "34 Station Road, Erode" },
  { name: "Kannan", company: "Milton Authorized Dealer", phone: "9751234567", gst: "33AAHCM6789H1Z9", addr: "56 Market Complex, Chennai" },
  { name: "Ramamoorthy", company: "Borosil Tamil Nadu", phone: "9600123456", gst: "33AAICB1234I1Z3", addr: "11 Gandhi Nagar, Vellore" },
];

const CUSTOMER_NAMES = [
  "Anitha Devi", "Priya Kumari", "Lakshmi Narayanan", "Muthu Krishnan", "Saraswathi Rajan",
  "Vijayalakshmi", "Karthikeyan M", "Meenakshi S", "Suresh Kumar", "Radha Krishnan",
  "Thangamani V", "Kavitha Murali", "Senthil Kumar", "Devi Priya", "Ganesh Babu",
  "Yamini Shankar", "Balamurugan K", "Parvathi Nair", "Chandran S", "Selvi Arumugam",
  "Amutha Raj", "Natarajan P", "Rohini Devi", "Manoharan K", "Padma Suresh",
  "Rajendran V", "Vasantha Kumar", "Usha Rani", "Velmurugan S", "Kamala Devi",
  "Arumugam N", "Santhi Devi", "Palani Kumar", "Girija Shankar", "Rajagopal M",
  "Malathi Rajan", "Krishnaswamy", "Ponmani S", "Duraisamy K", "Jayanthi V",
  "Murugesan A", "Nirmala Kumari", "Selvakumar P", "Geetha Balaji", "Ramachandran T",
  "Indira Raman", "Sathyamoorthy", "Kowsalya Devi", "Periasamy N", "Ambika Rajan",
  "Muthusamy K", "Revathi Suresh", "Gopalakrishnan", "Chitra Murali", "Venugopal S",
  "Bharathi Rajan", "Soundararajan", "Vasuki Devi", "Shanmugam R", "Alamelu Nair",
  "Thiruvengadam", "Sumathi Priya", "Elumalai K", "Kalaiselvi M", "Rengasamy V",
  "Tulasi Devi", "Anbazhagan S", "Poorni Kalyan", "Sugumar P", "Janaki Raman",
  "Ilangovan K", "Tamilselvi R", "Mohanraj S", "Vijaya Rajan", "Kumaravel A",
  "Bhuvaneswari", "Ramasamy V", "Kokilavani S", "Manickam P", "Hemalatha K",
  "Arunkumar S", "Rekha Devi", "Marimuthu K", "Kanagalakshmi", "Ponnusamy V",
  "Vijayakumar M", "Sakunthala R", "Prakash Kumar", "Ambujam Devi", "Rathinam S",
  "Malarvizhi K", "Senthilnathan", "Kalaivani P", "Ramakrishnan", "Vasumathi Devi",
  "Pandiarajan K", "Saranya Priya", "Muniyasamy V", "Jayalakshmi S", "Palanivel K",
  "Pushpalatha M", "Somasundaram", "Renuka Devi", "Karunanithi S", "Sathya Priya",
  "Sivakumar R", "Nagalakshmi V", "Dhandayuthapani", "Komala Devi", "Vivekanandan",
  "Abirami Rajan", "Manikandan K", "Ponni Selvi", "Sakthivel M", "Saradha Devi",
  "Arjunan S", "Gowri Shankar", "Natchathiran", "Meena Kumari", "Velusamy P",
  "Savitha Rajan", "Thirumalai K", "Sudha Priya", "Rajan Murugan", "Valli Devi",
];

const ADDRESSES = [
  "12 Anna Nagar, Coimbatore", "45 Gandhi Road, Salem", "78 Nehru Street, Madurai",
  "34 Market Road, Tirunelveli", "56 Station Road, Erode", "23 Temple Street, Trichy",
  "89 Raja Street, Vellore", "67 Main Road, Tiruppur", "11 Cross Street, Thanjavur",
  "90 West Street, Dindigul", "43 North Street, Karur", "76 South Street, Namakkal",
  "32 East Street, Villupuram", "65 Town Hall Road, Tuticorin", "18 Old Bus Stand, Kanyakumari",
  "54 School Road, Virudhunagar", "27 Hospital Road, Sivakasi", "81 Market Colony, Ramanathapuram",
  "36 Bazaar Street, Cuddalore", "59 Railway Station Road, Pollachi",
];

const ISSUES_SERVICE = [
  "Mixer grinder motor not working",
  "Pressure cooker whistle damaged",
  "Induction cooktop display not showing",
  "Mixer grinder jar cracked",
  "Gas stove burner not lighting",
  "Induction cooktop coil replacement needed",
  "Wet grinder stone not rotating",
  "Electric kettle leaking",
  "Toaster heating element broken",
  "Hand blender blade replacement",
  "Pressure cooker safety valve stuck",
  "Mixer grinder blade blunt",
  "Gas stove knob broken",
  "Electric kettle auto-cutoff not working",
  "Wet grinder drum crack",
];

const SCRAP_ITEMS = [
  "Old aluminium vessels",
  "Broken stainless steel kadhai",
  "Used copper utensils",
  "Old iron tawa",
  "Damaged mixer grinder body",
  "Old brass vessels",
  "Broken pressure cooker",
  "Scrap stainless steel pots",
];

// ─── Generator Utilities ─────────────────────────────────────────────────────

function uid(prefix: string): string {
  return prefix + "-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
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

function fmtNum(n: number, pad = 4): string {
  return String(n).padStart(pad, "0");
}

// ─── Main Seed Generator ─────────────────────────────────────────────────────

export function generateUtensilsSeedData() {
  const now = new Date().toISOString();

  // ── 1. Inventory ────────────────────────────────────────────────────────
  const inventory = PRODUCTS_CATALOG.map((p, i) => ({
    id: `inv-${fmtNum(i + 1)}`,
    barcode: p.barcode,
    name: p.name,
    category: p.cat,
    unit: p.unit,
    cost_price: p.cost,
    selling_price: p.sell,
    stock_qty: randInt(20, 150),
    godown_qty: randInt(30, 200),
    moq: 1,
    min_stock_alert: 5,
    sku_code: `KSH${fmtNum(i + 1)}`,
    gst_rate: p.gst,
    created_at: randDate(365, 300),
  }));

  // ── 2. Vendors ──────────────────────────────────────────────────────────
  const vendors = VENDOR_DATA.map((v, i) => ({
    id: `ven-${fmtNum(i + 1)}`,
    name: v.name,
    company_name: v.company,
    phone: v.phone,
    email: `${v.name.toLowerCase().replace(/\s/, "")}@${v.company.toLowerCase().split(" ")[0]}.com`,
    gst_number: v.gst,
    address: v.addr,
    balance_due: randInt(0, 50000),
    created_at: randDate(365, 300),
  }));

  // ── 3. Customers (500 customers generated dynamically) ─────────────────
  const customers: any[] = [];
  for (let i = 0; i < 500; i++) {
    const baseName = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length];
    const surname = i >= CUSTOMER_NAMES.length ? ` (${Math.floor(i / CUSTOMER_NAMES.length) + 1})` : "";
    const name = `${baseName}${surname}`;
    const totalSpent = randInt(500, 120000);
    customers.push({
      id: `cust-${fmtNum(i + 1)}`,
      name,
      mobile: `9${randInt(100000000, 999999999)}`,
      email: `${baseName.toLowerCase().replace(/[^a-z]/g, "")}${i + 1}@gmail.com`,
      address: randFrom(ADDRESSES),
      gst_number: i % 10 === 0 ? `33AABCK${fmtNum(1000 + i)}B1Z${(i % 9) + 1}` : "",
      loyalty_points: Math.floor(totalSpent / 100),
      total_spent: totalSpent,
      created_at: randDate(400, 200),
    });
  }

  // ── 4. Purchase Orders (150 POs + 750+ items) ─────────────────────────
  const purchase_orders: any[] = [];
  const purchase_items: any[] = [];
  let poCount = 1;
  let piCount = 1;

  for (let p = 0; p < 150; p++) {
    const vendor = randFrom(vendors);
    const poDate = randDate(365, 0);
    const status = p < 100 ? "Received" : p < 130 ? "Ordered" : "Draft";
    const numItems = randInt(4, 10);
    let poTotal = 0;
    let poTax = 0;
    const poId = `po-${fmtNum(poCount)}`;
    const poNumber = `PO-2026-${fmtNum(poCount)}`;

    for (let pi = 0; pi < numItems; pi++) {
      const prod = randFrom(inventory);
      const qty = randInt(10, 100);
      const taxRate = prod.gst_rate;
      const lineTotal = qty * prod.cost_price;
      const lineTax = (lineTotal * taxRate) / 100;
      poTotal += lineTotal;
      poTax += lineTax;

      purchase_items.push({
        id: `pi-${fmtNum(piCount++)}`,
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
      notes: `Purchase from ${vendor.company_name} — ${numItems} items`,
      expected_date: new Date(new Date(poDate).getTime() + 7 * 86400000).toISOString(),
      created_at: poDate,
    });
    poCount++;
  }

  // ── 5. Invoices + Items (3,000 invoices + 7,500+ items) ───────────────
  const invoices: any[] = [];
  const invoice_items: any[] = [];
  const loyalty_ledger: any[] = [];
  let invCount = 1;
  let iiCount = 1;
  let loyCount = 1;

  for (let inv = 0; inv < 3000; inv++) {
    const customer = randFrom(customers);
    const invType = Math.random() < 0.55 ? "GST" : Math.random() < 0.8 ? "NON_GST" : "MIXED";
    const payMethod = randFrom(["CASH", "UPI", "CARD", "CASH", "UPI", "CASH"]);
    const invDate = randDate(365, 0);
    const numItems = randInt(1, 5);
    const invId = `invoice-${fmtNum(invCount, 5)}`;
    const invNumber = `KSH-${new Date(invDate).getFullYear()}-${fmtNum(invCount, 5)}`;

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
        id: `ii-${fmtNum(iiCount++)}`,
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
        id: `loy-${fmtNum(loyCount++)}`,
        customer_id: customer.id,
        points_change: pts,
        reason: `Purchase ${invNumber}`,
        created_at: invDate,
      });
    }

    invCount++;
  }

  // ── 6. Service Tickets (300 tickets) ──────────────────────────────────
  const service_tickets: any[] = [];
  const serviceStatuses = ["Intake", "In Progress", "Ready", "Delivered"] as const;
  for (let s = 0; s < 300; s++) {
    const cust = randFrom(customers);
    const prod = randFrom(inventory.filter((i) => i.category === "Kitchen Appliances" || i.category === "Pressure Cookers"));
    const est = randInt(150, 2500);
    const status = randFrom(serviceStatuses);
    const tokNum = String((s % 99) + 1).padStart(2, "0");
    service_tickets.push({
      id: `srv-${fmtNum(s + 1)}`,
      ticket_number: `PMA-S-2026-${fmtNum(s + 1, 3)}`,
      queue_number: `TOKEN-#${tokNum}`,
      customer_id: cust.id,
      customer_name: cust.name,
      customer_mobile: cust.mobile,
      device_name: prod.name,
      serial_number: `SN${randInt(100000, 999999)}`,
      issue_description: randFrom(ISSUES_SERVICE),
      estimated_cost: est,
      final_cost: status === "Delivered" || status === "Ready" ? randInt(est, est + 500) : 0,
      status,
      created_at: randDate(200, 0),
      updated_at: randDate(50, 0),
    });
  }

  // ── 7. Scrap Entries (150) ─────────────────────────────────────────────
  const scrap_entries: any[] = [];
  for (let sc = 0; sc < 150; sc++) {
    const cust = randFrom(customers);
    const weight = randInt(1, 25);
    const priceKg = randInt(30, 120);
    scrap_entries.push({
      id: `scrap-${fmtNum(sc + 1)}`,
      customer_name: cust.name,
      customer_mobile: cust.mobile,
      item_type: randFrom(SCRAP_ITEMS),
      weight_kg: weight,
      price_per_kg: priceKg,
      total_payout: weight * priceKg,
      notes: "Utensils scrap buyback",
      created_at: randDate(300, 0),
    });
  }

  // ── 8. Godown Transfers (200) ─────────────────────────────────────────
  const godown_transfers: any[] = [];
  for (let gt = 0; gt < 200; gt++) {
    const prod = randFrom(inventory);
    const qty = randInt(5, 50);
    const dir = Math.random() < 0.5 ? "shop_to_godown" : "godown_to_shop";
    godown_transfers.push({
      id: `gdt-${fmtNum(gt + 1)}`,
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
