import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr, qty } from "@/lib/format";
import { Receipt, RefreshCw, Filter, Search, Printer, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/billing")({ component: BillingHubPage });

function BillingHubPage() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState<"ALL" | "GST" | "NON_GST">("ALL");
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const invoices = useQuery({
    queryKey: ["local-billing-invoices", filterType, search],
    queryFn: async () => {
      let all = db.getInvoices();
      if (filterType !== "ALL") {
        all = all.filter((i) => i.invoice.invoice_type === filterType);
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

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Billing Hub & Invoicing"
        subtitle="Manage GST/Non-GST invoices, perform line-item sales returns & exchanges"
      />

      {/* Filter Bar */}
      <div className="card-surface p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          {(["ALL", "GST", "NON_GST"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`h-9 px-3 rounded text-xs font-bold transition border ${
                filterType === t
                  ? "bg-primary/20 text-primary border-primary"
                  : "bg-input border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "ALL" ? "All Invoices" : t === "GST" ? "GST Tax Invoices" : "Non-GST Bills"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or customer mobile…"
            className="w-full h-9 pl-9 pr-3 rounded bg-input border border-border text-xs font-mono"
          />
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="card-surface overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase text-muted-foreground tracking-wider bg-card border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5">Invoice #</th>
              <th className="text-left px-4 py-2.5">Customer</th>
              <th className="text-left px-4 py-2.5">Type</th>
              <th className="text-right px-4 py-2.5">Subtotal</th>
              <th className="text-right px-4 py-2.5">GST Tax</th>
              <th className="text-right px-4 py-2.5">Grand Total</th>
              <th className="text-right px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.data?.map(({ invoice: i, items }) => (
              <tr key={i.id} className="hover:bg-secondary/40 transition">
                <td className="px-4 py-2.5 font-mono font-bold text-primary">{i.invoice_number}</td>
                <td className="px-4 py-2.5 text-xs font-medium">
                  {i.customer_name} <span className="text-muted-foreground font-mono">({i.customer_mobile || "Walk-in"})</span>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-secondary border border-border">
                    {i.invoice_type}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{inr(i.subtotal)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{inr(i.tax_amount)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">{inr(i.grand_total)}</td>
                <td className="px-4 py-2.5 text-right space-x-2">
                  <button
                    onClick={() => setSelectedInvoice({ invoice: i, items })}
                    className="h-7 px-2.5 rounded bg-secondary hover:bg-muted text-xs font-semibold border border-border inline-flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3 text-amber-400" /> Return / Exchange
                  </button>
                  <Link
                    to="/invoices/$id"
                    params={{ id: i.id }}
                    className="h-7 px-2.5 rounded bg-primary/15 text-primary hover:bg-primary/25 text-xs font-semibold border border-primary/30 inline-flex items-center gap-1"
                  >
                    <Printer className="h-3 w-3" /> View Bill
                  </Link>
                </td>
              </tr>
            ))}
            {invoices.data?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                  No matching billing invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || "");
  const [returnQty, setReturnQty] = useState(1);

  function handleReturn() {
    const item = items.find((it) => it.id === selectedItemId);
    if (!item) return;

    db.returnInvoiceItem(invoice.id, item.id, returnQty);
    toast.success(`Returned ${returnQty}x ${item.product_name}. Inventory stock restored!`);
    onReturned();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md card-surface p-5 border-l-4 border-l-amber-500">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-400" /> Return Line Item ({invoice.invoice_number})
          </div>
          <button onClick={onClose}><RefreshCw className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Select Item to Return</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-medium"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.product_name} (Qty: {it.qty} | Price: ₹{it.unit_price}) {it.is_return ? "[Already Returned]" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Quantity to Return</label>
            <input
              type="number"
              min={1}
              value={returnQty}
              onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
              className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono font-bold"
            />
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
            • Stock quantity will be returned to local Shop Inventory automatically.<br />
            • Customer refund ledger adjustment logged.
          </div>

          <button
            onClick={handleReturn}
            className="w-full h-10 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition"
          >
            Process Item Return & Restock
          </button>
        </div>
      </div>
    </div>
  );
}
