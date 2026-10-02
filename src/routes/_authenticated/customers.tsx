import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, Customer } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr, qty } from "@/lib/format";
import { Plus, X, User, FileSpreadsheet, Download } from "lucide-react";
import { useT } from "@/lib/lang/lang-context";

export const Route = createFileRoute("/_authenticated/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const qc = useQueryClient();
  const t = useT();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  const customers = useQuery({
    queryKey: ["local-customers", q],
    staleTime: 60_000,
    queryFn: async () => {
      const all = db.getCustomers();
      if (!q.trim()) return all;
      const clean = q.toLowerCase();
      return all.filter((c) => c.name.toLowerCase().includes(clean) || c.mobile.includes(clean));
    },
  });

  const allCust = customers.data || [];
  const totalCustomersCount = allCust.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalCustomersCount / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const displayedCustomers = pageSize === -1 ? allCust : allCust.slice((activePage - 1) * pageSize, activePage * pageSize);

  const history = useQuery({
    queryKey: ["local-customer-history", selected?.id],
    staleTime: 60_000,
    enabled: !!selected,
    queryFn: async () => {
      const invoices = db.getInvoices();
      return invoices.filter(
        (i) => i.invoice.customer_id === selected?.id || (selected?.mobile && i.invoice.customer_mobile === selected.mobile)
      );
    },
  });

  const loyaltyLog = useQuery({
    queryKey: ["local-customer-loyalty-log", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      return db.getLoyaltyLedger(selected?.id);
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
        title={t("customers.title")}
        subtitle={`${customers.data?.length ?? 0} ${t("customers.registered")}`}
        action={
          <div className="flex gap-2">
            <button onClick={() => ExcelEngine.downloadTemplate('customers')} className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition">
              <Download className="h-3.5 w-3.5" /> {t("customers.template")}
            </button>
            <button onClick={exportCustomersExcel} className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition text-blue-400">
              <FileSpreadsheet className="h-3.5 w-3.5" /> {t("customers.exportExcel")}
            </button>
            <button onClick={() => setShowNew(true)} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition">
              <Plus className="h-4 w-4" /> {t("customers.addCustomer")}
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
              placeholder={t("customers.search")}
              className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm font-mono"
            />
          </div>
          <div className="max-h-[520px] overflow-auto divide-y divide-border">
            {displayedCustomers.map((c) => (
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
              <div className="p-8 text-center text-sm text-muted-foreground">{t("customers.noRecords")}</div>
            )}
          </div>

          {/* High Performance Customer Pagination Controls */}
          {totalCustomersCount > 0 && (
            <div className="p-2.5 border-t border-border bg-card/50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-muted-foreground font-mono text-[10px]">
                {activePage}/{totalPages} ({totalCustomersCount} cust.)
              </div>

              <div className="flex items-center gap-1 font-mono">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={activePage === 1}
                  className="h-7 px-2 rounded border border-border bg-secondary hover:bg-muted text-foreground disabled:opacity-40 text-xs transition"
                >
                  ‹
                </button>
                <span className="text-xs font-bold px-1 text-primary">{activePage}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={activePage >= totalPages}
                  className="h-7 px-2 rounded border border-border bg-secondary hover:bg-muted text-foreground disabled:opacity-40 text-xs transition"
                >
                  ›
                </button>
              </div>
            </div>
          )}
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
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("customers.loyaltyBalance")}</div>
                  <div className="text-2xl font-mono font-bold text-emerald-400">{qty(selected.loyalty_points)} {t("customers.pts")}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-1">{t("customers.totalSpent")} {inr(selected.total_spent)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Purchase History */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    🛍️ {t("customers.purchaseHistory")}
                  </div>
                  <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
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
                      <div className="text-xs text-muted-foreground py-8 text-center">{t("customers.noPurchases")}</div>
                    )}
                  </div>
                </div>

                {/* Loyalty Activity Log */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    🪙 {t("customers.loyaltyLedger")}
                  </div>
                  <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                    {loyaltyLog.data?.map((l) => {
                      const isGain = l.points_change >= 0;
                      return (
                        <div key={l.id} className="flex justify-between items-center text-xs p-2.5 rounded bg-card border border-border">
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-foreground truncate">{l.reason}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              isGain ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}>
                              {isGain ? `+${l.points_change}` : l.points_change} Pts
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {(!loyaltyLog.data || loyaltyLog.data.length === 0) && (
                      <div className="text-xs text-muted-foreground py-8 text-center">{t("customers.noLoyalty")}</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[300px] grid place-items-center text-sm text-muted-foreground">
              {t("customers.selectPrompt")}
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

const L = ({ label, children }: any) => (
  <label className="block">
    <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{label}</div>
    {children}
  </label>
);

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