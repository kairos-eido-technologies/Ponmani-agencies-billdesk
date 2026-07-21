import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { PageHeader } from "./dashboard";
import { inr } from "@/lib/format";
import { FileSpreadsheet, Receipt } from "lucide-react";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices")({ component: InvoicesPage });

function InvoicesPage() {
  const invoices = useQuery({
    queryKey: ["local-invoices-list"],
    queryFn: async () => db.getInvoices(),
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
      <div className="card-surface overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase text-muted-foreground tracking-wider bg-card border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5">Invoice #</th>
              <th className="text-left px-4 py-2.5">Date & Time</th>
              <th className="text-left px-4 py-2.5">Customer Name</th>
              <th className="text-left px-4 py-2.5">Type</th>
              <th className="text-right px-4 py-2.5">Subtotal</th>
              <th className="text-right px-4 py-2.5">Tax (GST)</th>
              <th className="text-right px-4 py-2.5">Grand Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.data?.map(({ invoice: i }) => (
              <tr key={i.id} className="hover:bg-secondary/40 transition">
                <td className="px-4 py-2.5 font-mono">
                  <Link to="/invoices/$id" params={{ id: i.id }} className="text-primary font-bold hover:underline">
                    {i.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                  {new Date(i.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-xs font-medium">
                  {i.customer_name} {i.customer_mobile ? `(${i.customer_mobile})` : ""}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-secondary border border-border">
                    {i.invoice_type}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{inr(i.subtotal)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{inr(i.tax_amount)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">{inr(i.grand_total)}</td>
              </tr>
            ))}
            {invoices.data?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                  No invoices recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}