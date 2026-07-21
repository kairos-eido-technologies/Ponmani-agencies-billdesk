import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, Customer } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr, qty } from "@/lib/format";
import { Plus, X, User, FileSpreadsheet, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showNew, setShowNew] = useState(false);

  const customers = useQuery({
    queryKey: ["local-customers", q],
    queryFn: async () => {
      const all = db.getCustomers();
      if (!q.trim()) return all;
      const clean = q.toLowerCase();
      return all.filter((c) => c.name.toLowerCase().includes(clean) || c.mobile.includes(clean));
    },
  });

  const history = useQuery({
    queryKey: ["local-customer-history", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const invoices = db.getInvoices();
      return invoices.filter(
        (i) => i.invoice.customer_id === selected?.id || (selected?.mobile && i.invoice.customer_mobile === selected.mobile)
      );
    },
  });

  function exportCustomersExcel() {
    const data = (customers.data || []).map((c) => ({
      'Customer Name': c.name,
      'Mobile': c.mobile,
      'Email': c.email,
      'Address': c.address,
      'GSTIN': c.gst_number,
      'Loyalty Points': c.loyalty_points,
      'Total Spent (₹)': c.total_spent,
    }));
    ExcelEngine.exportToExcel(data, `Ponmani_Customers_${new Date().toISOString().split('T')[0]}`);
    toast.success("Customer ledger exported to Excel");
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Customer Directory & Loyalty Ledger"
        subtitle={`${customers.data?.length ?? 0} registered customers`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => ExcelEngine.downloadTemplate('customers')}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition"
            >
              <Download className="h-3.5 w-3.5" /> Template
            </button>
            <button
              onClick={exportCustomersExcel}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition text-blue-400"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
            >
              <Plus className="h-4 w-4" /> Add Customer
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        <div className="card-surface">
          <div className="p-3 border-b border-border">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by mobile number or name…"
              className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm font-mono"
            />
          </div>
          <div className="max-h-[600px] overflow-auto divide-y divide-border">
            {customers.data?.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition ${
                  selected?.id === c.id ? "bg-primary/15 border-l-4 border-l-primary" : ""
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 grid place-items-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{c.name || "Walk-in Customer"}</div>
                  <div className="text-xs font-mono text-muted-foreground">{c.mobile}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-400">{qty(c.loyalty_points)} Pts</div>
                  <div className="text-[10px] text-muted-foreground">{inr(c.total_spent)} spent</div>
                </div>
              </button>
            ))}
            {customers.data?.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No customer records found.</div>
            )}
          </div>
        </div>

        <div className="card-surface p-5">
          {selected ? (
            <>
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-border">
                <div>
                  <div className="text-lg font-bold text-foreground">{selected.name || "Walk-in"}</div>
                  <div className="text-xs font-mono text-muted-foreground">Mobile: {selected.mobile}</div>
                  {selected.gst_number && (
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">GSTIN: {selected.gst_number}</div>
                  )}
                  {selected.address && (
                    <div className="text-xs text-muted-foreground mt-0.5 max-w-sm">{selected.address}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Loyalty Balance</div>
                  <div className="text-2xl font-mono font-bold text-emerald-400">{qty(selected.loyalty_points)} Pts</div>
                  <div className="text-xs font-mono text-muted-foreground mt-1">Total Spent: {inr(selected.total_spent)}</div>
                </div>
              </div>

              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Customer Purchase History</div>
              <div className="space-y-2 max-h-[450px] overflow-auto pr-1">
                {history.data?.map(({ invoice: h }) => (
                  <div key={h.id} className="flex justify-between items-center text-xs p-2.5 rounded bg-card border border-border">
                    <div>
                      <div className="font-mono font-bold text-primary">{h.invoice_number}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-foreground">{inr(h.grand_total)}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{h.payment_method}</div>
                    </div>
                  </div>
                ))}
                {history.data?.length === 0 && (
                  <div className="text-xs text-muted-foreground py-8 text-center">No purchases recorded for this customer.</div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full min-h-[300px] grid place-items-center text-sm text-muted-foreground">
              Select a customer from the left directory to view their ledger & history.
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewCustomerModal
          onClose={() => setShowNew(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["local-customers"] });
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

function NewCustomerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!mobile.trim() || !name.trim()) {
      toast.error("Name and mobile number are required");
      return;
    }
    db.saveCustomer({ name, mobile, email, address, gst_number: gstNumber });
    toast.success("Customer added to local database");
    onSaved();
  }

  const ic = "w-full h-9 rounded bg-input border border-border px-3 text-xs focus:outline-none focus:border-primary";
  const L = ({ label, children }: any) => <label className="block"><div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{label}</div>{children}</label>;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm card-surface p-5 border-l-4 border-l-primary">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground">Add New Customer</div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <L label="Mobile Number *">
            <input required value={mobile} onChange={(e) => setMobile(e.target.value)} className={`${ic} font-mono`} autoFocus />
          </L>
          <L label="Customer Name *">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={ic} />
          </L>
          <L label="Email Address">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={ic} />
          </L>
          <L label="GSTIN (For B2B Billing)">
            <input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className={`${ic} font-mono`} />
          </L>
          <L label="Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={ic} />
          </L>
          <button type="submit" className="w-full h-10 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:accent-glow transition">
            Save Customer Record
          </button>
        </form>
      </div>
    </div>
  );
}