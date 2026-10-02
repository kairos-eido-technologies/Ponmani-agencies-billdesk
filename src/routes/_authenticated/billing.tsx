import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr, qty } from "@/lib/format";
import { Receipt, RefreshCw, Filter, Search, Printer, RotateCcw, Pencil } from "lucide-react";
import { BillViewerModal } from "@/components/BillViewerModal";
import { EditInvoiceModal } from "@/components/EditInvoiceModal";
import { useT } from "@/lib/lang/lang-context";

function matchesDateFilter(dateStr: string, filter: string) {
  if (filter === "ALL") return true;
  const date = new Date(dateStr);
  const now = new Date();
  
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  if (filter === "TODAY") {
    return dateDay === today;
  }
  if (filter === "YESTERDAY") {
    const yesterday = today - 86400000;
    return dateDay === yesterday;
  }
  if (filter === "WEEK") {
    const sevenDaysAgo = today - 7 * 86400000;
    return dateDay >= sevenDaysAgo;
  }
  if (filter === "MONTH") {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  if (filter === "LAST_MONTH") {
    let targetMonth = now.getMonth() - 1;
    let targetYear = now.getFullYear();
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    }
    return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
  }
  return true;
}

export const Route = createFileRoute("/_authenticated/billing")({ component: BillingHubPage });

function BillingHubPage() {
  const qc = useQueryClient();
  const t = useT();
  const [filterType, setFilterType] = useState<"ALL" | "GST" | "NON_GST">("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "LAST_MONTH">("ALL");
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [viewingBill, setViewingBill] = useState<{ invoice: any; items: any[] } | null>(null);
  const [editingBill, setEditingBill] = useState<{ invoice: any; items: any[] } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, dateFilter, search]);

  const invoices = useQuery({
    queryKey: ["local-billing-invoices", filterType, search, dateFilter],
    staleTime: 60_000,
    queryFn: async () => {
      await db.loadPromise;
      let all = db.getInvoices();
      if (filterType !== "ALL") {
        all = all.filter((i) => i.invoice.invoice_type === filterType);
      }
      if (dateFilter !== "ALL") {
        all = all.filter((i) => matchesDateFilter(i.invoice.created_at, dateFilter));
      }
      if (search.trim()) {
        const clean = search.toLowerCase();
        all = all.filter(
          (i) =>
            i.invoice.invoice_number.toLowerCase().includes(clean) ||
            i.invoice.customer_name.toLowerCase().includes(clean) ||
            i.invoice.customer_mobile.includes(clean)
        );
      }
      return all;
    },
  });

  const allInvs = invoices.data || [];
  const totalInvoicesCount = allInvs.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalInvoicesCount / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const displayedInvoices = pageSize === -1 ? allInvs : allInvs.slice((activePage - 1) * pageSize, activePage * pageSize);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={t("billing.title")}
        subtitle={t("billing.subtitle")}
      />

      {/* Filter Bar */}
      <div className="card-surface p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("billing.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-secondary border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-1 border border-border rounded p-0.5 bg-secondary text-xs">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1 rounded font-medium transition ${filterType === "ALL" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-card text-muted-foreground"}`}
            >
              {t("billing.all")}
            </button>
            <button
              onClick={() => setFilterType("GST")}
              className={`px-3 py-1 rounded font-medium transition ${filterType === "GST" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-card text-muted-foreground"}`}
            >
              GST
            </button>
            <button
              onClick={() => setFilterType("NON_GST")}
              className={`px-3 py-1 rounded font-medium transition ${filterType === "NON_GST" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-card text-muted-foreground"}`}
            >
              Non-GST
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e: any) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md bg-secondary border border-border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">{t("billing.dateAll")}</option>
            <option value="TODAY">{t("billing.today")}</option>
            <option value="YESTERDAY">{t("billing.yesterday")}</option>
            <option value="WEEK">{t("billing.week")}</option>
            <option value="MONTH">{t("billing.month")}</option>
            <option value="LAST_MONTH">{t("billing.lastMonth")}</option>
          </select>
        </div>
      </div>

        {/* Invoices List Table */}
      <div className="card-surface overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase text-muted-foreground tracking-wider bg-card border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5">{t("billing.col.invoice")}</th>
              <th className="text-left px-4 py-2.5">{t("billing.col.customer")}</th>
              <th className="text-left px-4 py-2.5">{t("billing.col.type")}</th>
              <th className="text-right px-4 py-2.5">{t("billing.col.subtotal")}</th>
              <th className="text-right px-4 py-2.5">{t("billing.col.gst")}</th>
              <th className="text-right px-4 py-2.5">{t("billing.col.total")}</th>
              <th className="text-right px-4 py-2.5 min-w-[280px]">{t("billing.col.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayedInvoices.map(({ invoice: i, items }) => (
              <tr key={i.id} className="hover:bg-secondary/40 transition">
                <td className="px-4 py-2.5 font-mono font-bold text-primary">{i.invoice_number}</td>
                <td className="px-4 py-2.5 text-xs font-medium">
                  {i.customer_name} <span className="text-muted-foreground font-mono">({i.customer_mobile || t("common.walkin")})</span>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-secondary border border-border">
                    {i.invoice_type}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{inr(i.subtotal)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{inr(i.tax_amount)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">{inr(i.grand_total)}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap space-x-1.5">
                  <button
                    onClick={() => setSelectedInvoice({ invoice: i, items })}
                    className="h-8 px-2.5 rounded bg-secondary hover:bg-muted text-xs font-semibold border border-border inline-flex items-center gap-1 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-400" /> {t("billing.return")}
                  </button>
                  <button
                    onClick={() => setEditingBill({ invoice: i, items })}
                    className="h-8 px-2.5 rounded bg-secondary hover:bg-muted text-xs font-semibold border border-border inline-flex items-center gap-1 transition"
                  >
                    <Pencil className="h-3.5 w-3.5 text-indigo-400" /> {t("billing.editBill")}
                  </button>
                  <button
                    onClick={() => setViewingBill({ invoice: i, items })}
                    className="h-8 px-2.5 rounded bg-primary/15 text-primary hover:bg-primary/25 text-xs font-semibold border border-primary/30 inline-flex items-center gap-1 transition"
                  >
                    <Printer className="h-3.5 w-3.5" /> {t("billing.printBill")}
                  </button>
                </td>
              </tr>
            ))}
            {allInvs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                  {t("billing.noResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {totalInvoicesCount > 0 && (
          <div className="p-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-muted-foreground">
              {t("billing.showing")}{" "}
              <span className="font-mono font-bold text-foreground">
                {pageSize === -1 ? 1 : Math.min((activePage - 1) * pageSize + 1, totalInvoicesCount)}
              </span>{" "}
              {t("billing.to")}{" "}
              <span className="font-mono font-bold text-foreground">
                {pageSize === -1 ? totalInvoicesCount : Math.min(activePage * pageSize, totalInvoicesCount)}
              </span>{" "}
              {t("billing.of")} <span className="font-mono font-bold text-foreground">{totalInvoicesCount}</span> {t("billing.invoices")}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{t("billing.rowsPerPage")}</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-secondary border border-border rounded text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={-1}>All ({totalInvoicesCount})</option>
                </select>
              </div>
              {pageSize !== -1 && (
                <div className="flex items-center gap-1 font-mono">
                  <button
                    disabled={activePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-secondary border border-border rounded disabled:opacity-40 hover:bg-muted font-bold transition"
                  >
                    {t("billing.prev")}
                  </button>
                  <span className="px-2 font-bold text-primary">
                    {activePage} / {totalPages}
                  </span>
                  <button
                    disabled={activePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 bg-secondary border border-border rounded disabled:opacity-40 hover:bg-muted font-bold transition"
                  >
                    {t("billing.next")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {viewingBill && (
        <BillViewerModal
          invoiceData={viewingBill}
          onClose={() => setViewingBill(null)}
        />
      )}

      {editingBill && (
        <EditInvoiceModal
          invoice={editingBill.invoice}
          items={editingBill.items}
          onClose={() => setEditingBill(null)}
          onSaved={() => {
            qc.invalidateQueries();
            setEditingBill(null);
          }}
        />
      )}

      {selectedInvoice && (
        <ReturnWizardModal
          invoice={selectedInvoice.invoice}
          items={selectedInvoice.items}
          onClose={() => setSelectedInvoice(null)}
          onReturned={() => {
            qc.invalidateQueries({ queryKey: ["local-billing-invoices"] });
            qc.invalidateQueries({ queryKey: ["local-inventory-products"] });
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
}

function ReturnWizardModal({
  invoice,
  items,
  onClose,
  onReturned,
}: {
  invoice: any;
  items: any[];
  onClose: () => void;
  onReturned: () => void;
}) {
  const t = useT();
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || "");
  const [returnQty, setReturnQty] = useState(1);

  async function handleReturn() {
    const item = items.find((it) => it.id === selectedItemId);
    if (!item) return;

    await db.returnInvoiceItem(invoice.id, item.id, returnQty);
    toast.success(`Returned ${returnQty}x ${item.product_name}. Inventory stock restored!`);
    onReturned();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md card-surface p-5 border-l-4 border-l-amber-500">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-400" /> {t("billing.return.title")} ({invoice.invoice_number})
          </div>
          <button onClick={onClose}><RefreshCw className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">{t("billing.return.selectItem")}</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-medium"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.product_name} (Qty: {it.qty} | Price: ₹{it.unit_price}) {it.is_return ? `[${t("billing.alreadyReturned")}]` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">{t("billing.return.qty")}</label>
            <input
              type="number"
              min={1}
              value={returnQty}
              onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
              className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono font-bold"
            />
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300 space-y-1">
            <div>• {t("billing.return.note1")}</div>
            <div>• {t("billing.return.note2")}</div>
          </div>

          <button
            onClick={handleReturn}
            className="w-full h-10 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition"
          >
            {t("billing.return.process")}
          </button>
        </div>
      </div>
    </div>
  );
}

