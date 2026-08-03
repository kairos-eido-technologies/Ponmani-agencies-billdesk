import { generateUtensilsSeedData } from "../src/lib/db/seed-utensils";
import { SQLiteDatabaseManager } from "../src/lib/db/sqlite-server-db";

async function main() {
  console.log("Generating 12,000+ utensils seed data...");
  const seed = generateUtensilsSeedData();

  console.log(`- Customers: ${seed.customers.length}`);
  console.log(`- Invoices: ${seed.invoices.length}`);
  console.log(`- Invoice Items: ${seed.invoice_items.length}`);
  console.log(`- Purchase Orders: ${seed.purchase_orders.length}`);
  console.log(`- Purchase Items: ${seed.purchase_items.length}`);
  console.log(`- Service Tickets: ${seed.service_tickets.length}`);
  console.log(`- Scrap Entries: ${seed.scrap_entries.length}`);
  console.log(`- Godown Transfers: ${seed.godown_transfers.length}`);

  const store = {
    users: [
      { id: "usr-1", username: "admin", pin: "1234", role: "Admin", created_at: new Date().toISOString() },
      { id: "usr-2", username: "cashier", pin: "0000", role: "Cashier", created_at: new Date().toISOString() },
    ],
    inventory: seed.inventory,
    vendors: seed.vendors,
    customers: seed.customers,
    purchase_orders: seed.purchase_orders,
    purchase_items: seed.purchase_items,
    invoices: seed.invoices,
    invoice_items: seed.invoice_items,
    loyalty_ledger: seed.loyalty_ledger,
    service_tickets: seed.service_tickets,
    scrap_entries: seed.scrap_entries,
    godown_transfers: seed.godown_transfers,
    backups_log: [],
    settings: seed.settings,
  };

  console.log("Seeding SQLite database file...");
  await SQLiteDatabaseManager.bulkSeedStore(store);
  console.log("Successfully seeded 12,000+ items into SQLite database!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
