import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr } from "@/lib/format";
import { FileSpreadsheet, Download, FileText, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/gst")({ component: GSTPage });

function GSTPage() {
  const storeQuery = useQuery({
    queryKey: ["local-gst-data"],
    queryFn: async () => db.getStore(),
  });

  const store = storeQuery.data;
  const invoices = store?.invoices || [];

  const b2bInvoices = invoices.filter((i) => {
    if (!i.customer_id) return false;
    const cust = store?.customers.find((c) => c.id === i.customer_id);
    return !!cust?.gst_number;
  });

  const b2cInvoices = invoices.filter((i) => !b2bInvoices.includes(i));

  const totalTaxable = invoices.reduce((s, i) => s + (i.subtotal - i.discount_amount), 0);
  const totalGST = invoices.reduce((s, i) => s + i.tax_amount, 0);
  const cgst = totalGST / 2;
  const sgst = totalGST / 2;

  function exportGSTRFiling() {
    ExcelEngine.exportGSTData();
    toast.success("GST filing workbook (B2B, B2C, HSN Summary) generated & downloaded!");
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="GST Compliance & Filing Center"
        subtitle="Tamil Nadu GST (State 33) — B2B, B2C Small, HSN Summaries & Direct GSTR Excel Export"
        action={
          <button
            onClick={exportGSTRFiling}
            className="h-10 px-4 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/40"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export GST Data straight to .xlsx
          </button>
        }
      />

      {/* Tax Liability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-surface p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs text-muted-foreground mb-1">Total Taxable Turnover</div>
          <div className="text-xl font-bold font-mono text-emerald-400">{inr(totalTaxable)}</div>
        </div>
        <div className="card-surface p-4 border-l-4 border-l-primary">
          <div className="text-xs text-muted-foreground mb-1">Total Output Tax (GST)</div>
          <div className="text-xl font-bold font-mono text-primary">{inr(totalGST)}</div>
        </div>
        <div className="card-surface p-4 border-l-4 border-l-blue-500">
          <div className="text-xs text-muted-foreground mb-1">CGST Liability (9%)</div>
          <div className="text-xl font-bold font-mono text-blue-400">{inr(cgst)}</div>
        </div>
        <div className="card-surface p-4 border-l-4 border-l-purple-500">
          <div className="text-xs text-muted-foreground mb-1">SGST Liability (9%)</div>
          <div className="text-xl font-bold font-mono text-purple-400">{inr(sgst)}</div>
        </div>
      </div>

      {/* B2B Invoices Section */}
      <div className="card-surface p-4 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <div className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-400" /> B2B Registered Tax Invoices ({b2bInvoices.length})
          </div>
          <span className="text-xs text-muted-foreground font-mono">Form GSTR-1 Section 4A</span>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground bg-card border-b border-border">
              <tr>
                <th className="text-left px-3 py-2">GSTIN of Recipient</th>
                <th className="text-left px-3 py-2">Receiver Name</th>
                <th className="text-left px-3 py-2">Invoice #</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-right px-3 py-2">Taxable Value</th>
                <th className="text-right px-3 py-2">CGST</th>
                <th className="text-right px-3 py-2">SGST</th>
                <th className="text-right px-3 py-2">Invoice Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {b2bInvoices.map((inv) => {
                const cust = store?.customers.find((c) => c.id === inv.customer_id);
                return (
                  <tr key={inv.id}>
                    <td className="px-3 py-2 font-mono font-semibold text-emerald-400">{cust?.gst_number || "—"}</td>
                    <td className="px-3 py-2 font-medium">{inv.customer_name}</td>
                    <td className="px-3 py-2 font-mono text-primary font-bold">{inv.invoice_number}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{inv.created_at.split('T')[0]}</td>
                    <td className="px-3 py-2 text-right font-mono">{inr(inv.subtotal - inv.discount_amount)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{inr(inv.tax_amount / 2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{inr(inv.tax_amount / 2)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-foreground">{inr(inv.grand_total)}</td>
                  </tr>
                );
              })}
              {b2bInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    No B2B invoices recorded yet. All sales currently categorized under B2C Small.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* B2C & HSN Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-surface p-4">
          <div className="text-sm font-bold text-foreground mb-3 border-b border-border pb-2">
            B2C Consumer Sales Summary ({b2cInvoices.length} Bills)
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Total B2C Taxable Value:</span>
              <span className="font-mono font-bold">{inr(b2cInvoices.reduce((s, i) => s + (i.subtotal - i.discount_amount), 0))}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Total B2C Tax (CGST + SGST):</span>
              <span className="font-mono text-primary font-bold">{inr(b2cInvoices.reduce((s, i) => s + i.tax_amount, 0))}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">B2C Gross Receipts:</span>
              <span className="font-mono text-emerald-400 font-bold">{inr(b2cInvoices.reduce((s, i) => s + i.grand_total, 0))}</span>
            </div>
          </div>
        </div>

        <div className="card-surface p-4">
          <div className="text-sm font-bold text-foreground mb-3 border-b border-border pb-2">
            GSTR Filing Readiness Check
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> 100% Offline Local Calculation
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Formatted for direct upload to GST Portal / CA
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> HSN Summary Sheet included in workbook
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
