import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { PageHeader } from "./dashboard";
import { inr } from "@/lib/format";
import { FileSpreadsheet, Printer, Pencil } from "lucide-react";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { toast } from "sonner";
import { useState } from "react";
import { BillViewerModal } from "@/components/BillViewerModal";
import { EditInvoiceModal } from "@/components/EditInvoiceModal";

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

export const Route = createFileRoute("/_authenticated/invoices/")({ component: InvoicesIndexPage });

function InvoicesIndexPage() {
  const [selectedBill, setSelectedBill] = useState<{ invoice: any; items: any[] } | null>(null);
  const [editingBill, setEditingBill] = useState<{ invoice: any; items: any[] } | null>(null);
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "LAST_MONTH">("ALL");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const invoices = useQuery({
    queryKey: ["local-invoices-list", dateFilter, search],
    queryFn: async () => {
      await db.loadPromise;
      let all = db.getInvoices();
      if (dateFilter !== "ALL") {
        all = all.filter((i) => matchesDateFilter(i.invoice.created_at, dateFilter));
      }
      if (search.trim()) {
        const clean = search.toLowerCase();
        all = all.filter(
          (i) =>
            i.invoice.invoice_number.toLowerCase().includes(clean) ||
            i.invoice.customer_name.toLowerCase().includes(clean) ||
            (i.invoice.customer_mobile && i.invoice.customer_mobile.includes(clean))
        );
      }
      return all;
    },
  });

  function exportInvoicesExcel() {
    const data = (invoices.data || []).map(({ invoice: i }) => ({
      'Invoice Number': i.invoice_number,
      'Date': i.created_at.split('T')[0],
      'Customer': i.customer_name,
      'Mobile': i.customer_mobile,
      'Type': i.invoice_type,
      'Subtotal (₹)': i.subtotal,
      'Tax (₹)': i.tax_amount,
      'Discount (₹)': i.discount_amount,
      'Grand Total (₹)': i.grand_total,
      'Payment Method': i.payment_method,
    }));
    ExcelEngine.exportToExcel(data, `Ponmani_Invoices_${new Date().toISOString().split('T')[0]}`);
    toast.success("Invoices exported to Excel");
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Sales Invoices & Billing Log"
        subtitle={`${invoices.data?.length ?? 0} invoices recorded locally`}
        action={
          <button
            onClick={exportInvoicesExcel}
            className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export Invoices to Excel
          </button>
        }
      />
      {/* Filter Bar */}
      <div className="card-surface p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase">Filter Date:</span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="h-9 rounded bg-input border border-border px-3 text-xs font-bold text-foreground focus:border-primary focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">This Month</option>
            <option value="LAST_MONTH">Last Month</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or customer name/mobile..."
            className="w-full h-9 px-3 rounded bg-input border border-border text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="card-surface overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase text-muted-foreground tracking-wider bg-card border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5">Invoice #</th>
              <th className="text-left px-4 py-2.5">Date & Time</th>
              <th className="text-left px-4 py-2.5">Customer</th>
              <th className="text-left px-4 py-2.5">Type</th>
              <th className="text-right px-4 py-2.5">Subtotal</th>
              <th className="text-right px-4 py-2.5">Tax (GST)</th>
              <th className="text-right px-4 py-2.5">Grand Total</th>
              <th className="text-right px-4 py-2.5">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.isLoading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-sm text-muted-foreground animate-pulse">
                  Loading invoices from database...
                </td>
              </tr>
            )}
            {!invoices.isLoading && invoices.data?.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                  No invoices recorded yet. Create a sale from the POS page.
                </td>
              </tr>
            )}
            {invoices.data?.map(({ invoice: i, items }) => (
              <tr key={i.id} className="hover:bg-secondary/40 transition">
                <td className="px-4 py-2.5 font-mono font-bold text-primary">{i.invoice_number}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                  {new Date(i.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-xs font-medium">
                  {i.customer_name}
                  {i.customer_mobile ? (
                    <span className="text-muted-foreground font-mono ml-1">({i.customer_mobile})</span>
                  ) : null}
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
                    onClick={() => setEditingBill({ invoice: i, items })}
                    className="h-7 px-2 rounded bg-secondary hover:bg-muted text-xs font-semibold border border-border inline-flex items-center gap-1 transition"
                  >
                    <Pencil className="h-3 w-3 text-indigo-400" /> Edit
                  </button>
                  <button
                    onClick={() => setSelectedBill({ invoice: i, items })}
                    className="h-7 px-2 rounded bg-primary/15 text-primary hover:bg-primary/25 text-xs font-semibold border border-primary/30 inline-flex items-center gap-1 transition"
                  >
                    <Printer className="h-3 w-3" /> View Bill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedBill && (
        <BillViewerModal
          invoiceData={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}

      {editingBill && (
        <EditInvoiceModal
          invoice={editingBill.invoice}
          items={editingBill.items}
          onClose={() => setEditingBill(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["local-invoices-list"] });
            setEditingBill(null);
          }}
        />
      )}
    </div>
  );
}
