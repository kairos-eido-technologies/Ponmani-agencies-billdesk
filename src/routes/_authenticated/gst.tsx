import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db, Invoice, InvoiceItem } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr } from "@/lib/format";
import {
  FileSpreadsheet, FileText, CheckCircle2, AlertCircle,
  Building2, Users, LayoutList, TrendingUp, Download,
  CalendarDays, Info, Printer, X, FileDown,
} from "lucide-react";
import { GSTReportDocument } from "@/components/GSTReportDocument";

export const Route = createFileRoute("/_authenticated/gst")({ component: GSTPage });

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getCurrentFY(): { fyLabel: string; fyStart: Date; fyEnd: Date } {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    fyLabel: `FY ${yr}-${String(yr + 1).slice(2)}`,
    fyStart: new Date(yr, 3, 1),   // April 1
    fyEnd: new Date(yr + 1, 2, 31, 23, 59, 59), // March 31
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

type GSTTab = "summary" | "b2b" | "b2c" | "hsn" | "gstr3b" | "purchase";

// ─── Main Page ───────────────────────────────────────────────────────────────

function GSTPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [filterMode, setFilterMode] = useState<"month" | "fy">("month");
  const [activeTab, setActiveTab] = useState<GSTTab>("summary");
  const [showReportModal, setShowReportModal] = useState(false);

  const storeQuery = useQuery({
    queryKey: ["local-gst-data"],
    queryFn: async () => db.getStore(),
  });

  const store = storeQuery.data;

  // ─── Date Filtering ──────────────────────────────────────────────────────

  const { fyLabel, fyStart, fyEnd } = getCurrentFY();

  const filteredInvoices = useMemo(() => {
    if (!store?.invoices) return [];
    return store.invoices.filter((inv) => {
      const d = new Date(inv.created_at);
      if (filterMode === "month") {
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      } else {
        return d >= fyStart && d <= fyEnd;
      }
    });
  }, [store, selectedMonth, selectedYear, filterMode]);

  const filteredPOs = useMemo(() => {
    if (!store?.purchase_orders) return [];
    return store.purchase_orders.filter((po) => {
      const d = new Date(po.created_at);
      if (filterMode === "month") {
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      } else {
        return d >= fyStart && d <= fyEnd;
      }
    });
  }, [store, selectedMonth, selectedYear, filterMode]);

  // ─── Classification ──────────────────────────────────────────────────────

  const gstInvoices = filteredInvoices.filter(
    (i) => i.invoice_type === "GST" || i.invoice_type === "MIXED"
  );

  const b2bInvoices = gstInvoices.filter((inv) => {
    if (!inv.customer_id) return false;
    const cust = store?.customers.find((c) => c.id === inv.customer_id);
    return !!cust?.gst_number;
  });

  const b2cInvoices = gstInvoices.filter((inv) => !b2bInvoices.includes(inv));

  // ─── Summary Totals ──────────────────────────────────────────────────────

  const calcTotals = (invList: Invoice[]) => ({
    taxable: invList.reduce((s, i) => s + (i.subtotal - i.discount_amount), 0),
    tax: invList.reduce((s, i) => s + i.tax_amount, 0),
    gross: invList.reduce((s, i) => s + i.grand_total, 0),
    count: invList.length,
  });

  const b2bTotals = calcTotals(b2bInvoices);
  const b2cTotals = calcTotals(b2cInvoices);
  const allGSTTotals = calcTotals(gstInvoices);

  // Purchase (ITC) — from POs received in the period
  const receivedPOs = filteredPOs.filter((po) => po.status === "Received");
  const itcTotal = receivedPOs.reduce((s, po) => s + (po.tax_amount || 0), 0);
  const netTaxLiability = allGSTTotals.tax - itcTotal;

  // ─── HSN Summary ─────────────────────────────────────────────────────────

  const hsnSummary = useMemo(() => {
    if (!store) return [];
    const invoiceIds = new Set(gstInvoices.map((i) => i.id));
    const items = store.invoice_items.filter((ii) => invoiceIds.has(ii.invoice_id));

    const map: Record<string, {
      description: string; hsn: string; uqc: string;
      qty: number; taxableVal: number; taxAmt: number; rate: number;
    }> = {};

    items.forEach((ii) => {
      const prod = store.inventory.find((p) => p.id === ii.product_id);
      const hsn = prod?.sku_code || prod?.barcode || "GENERAL";
      const desc = prod?.category || "Hardware & Electricals";
      const rate = Number(ii.tax_rate) || 18;
      const key = `${hsn}-${rate}`;

      if (!map[key]) {
        map[key] = { description: desc, hsn, uqc: "NOS", qty: 0, taxableVal: 0, taxAmt: 0, rate };
      }
      map[key].qty += Number(ii.qty);
      map[key].taxableVal += Number(ii.total_price);
      map[key].taxAmt += (Number(ii.total_price) * rate) / 100;
    });

    return Object.values(map).sort((a, b) => b.taxableVal - a.taxableVal);
  }, [store, gstInvoices]);

  // ─── Tax Rate Breakdown ───────────────────────────────────────────────────

  const taxRateBreakdown = useMemo(() => {
    if (!store) return [];
    const invoiceIds = new Set(gstInvoices.map((i) => i.id));
    const items = store.invoice_items.filter((ii) => invoiceIds.has(ii.invoice_id));
    const rateMap: Record<number, { taxable: number; tax: number }> = {};
    items.forEach((ii) => {
      const rate = Number(ii.tax_rate) || 0;
      if (!rateMap[rate]) rateMap[rate] = { taxable: 0, tax: 0 };
      rateMap[rate].taxable += Number(ii.total_price);
      rateMap[rate].tax += (Number(ii.total_price) * rate) / 100;
    });
    return Object.entries(rateMap)
      .filter(([r]) => Number(r) > 0)
      .map(([rate, vals]) => ({ rate: Number(rate), ...vals }))
      .sort((a, b) => a.rate - b.rate);
  }, [store, gstInvoices]);

  // ─── Export ───────────────────────────────────────────────────────────────

  function exportGSTWorkbook() {
    ExcelEngine.exportGSTData(gstInvoices);
    toast.success(`GSTR Filing workbook (${periodLabel}) downloaded!`);
  }

  // ─── Build Report Data ────────────────────────────────────────────────────

  function buildReportData() {
    const settings = store?.settings || {};
    return {
      periodLabel,
      periodType: filterMode,
      generatedAt: new Date().toLocaleString("en-IN"),
      shopName: settings.shop_name || "PONMANI AGENCIES",
      shopAddress: settings.shop_address || "142 Main Road, Tenkasi, Tamil Nadu",
      shopPhone: settings.shop_phone || "+91 94422 12345",
      shopGstin: settings.shop_gstin || "33AAPFP1234H1Z9",
      shopTagline: settings.receipt_header_note || "Hardware • Electricals • Electronics",
      totalInvoices: filteredInvoices.length,
      gstInvoices: gstInvoices.length,
      b2bCount: b2bInvoices.length,
      b2cCount: b2cInvoices.length,
      totalTaxable: allGSTTotals.taxable,
      totalOutputGST: allGSTTotals.tax,
      cgstOutput: allGSTTotals.tax / 2,
      sgstOutput: allGSTTotals.tax / 2,
      itcInput: itcTotal,
      netTaxPayable: netTaxLiability,
      b2bRows: b2bInvoices.map((inv) => {
        const cust = store?.customers.find((c) => c.id === inv.customer_id);
        return {
          gstin: cust?.gst_number || "—",
          name: inv.customer_name,
          invoiceNo: inv.invoice_number,
          date: inv.created_at.split("T")[0],
          taxable: inv.subtotal - inv.discount_amount,
          cgst: inv.tax_amount / 2,
          sgst: inv.tax_amount / 2,
          total: inv.grand_total,
        };
      }),
      b2cRows: b2cInvoices.map((inv) => ({
        invoiceNo: inv.invoice_number,
        date: inv.created_at.split("T")[0],
        customer: inv.customer_name,
        taxable: inv.subtotal - inv.discount_amount,
        cgst: inv.tax_amount / 2,
        sgst: inv.tax_amount / 2,
        total: inv.grand_total,
      })),
      hsnRows: hsnSummary.map((h) => ({
        hsn: h.hsn,
        description: h.description,
        qty: h.qty,
        rate: h.rate,
        taxable: h.taxableVal,
        cgst: h.taxAmt / 2,
        sgst: h.taxAmt / 2,
      })),
      rateBreakup: taxRateBreakdown.map((r) => ({
        rate: r.rate,
        taxable: r.taxable,
        cgst: r.tax / 2,
        sgst: r.tax / 2,
      })),
      itcRows: receivedPOs.map((po) => ({
        poNo: po.po_number,
        vendor: po.vendor_name,
        date: po.created_at.split("T")[0],
        total: po.total_amount,
        taxAmt: po.tax_amount || 0,
      })),
    };
  }

  function exportGSTR1Report() {
    if (!store) return;
    const periodLabel = filterMode === "month"
      ? `${MONTHS[selectedMonth]}_${selectedYear}`
      : `${fyLabel.replace(/\s/g, "_")}`;

    // B2B Sheet
    const b2bRows = b2bInvoices.map((inv) => {
      const cust = store.customers.find((c) => c.id === inv.customer_id);
      return {
        "GSTIN of Recipient": cust?.gst_number || "",
        "Receiver Name": inv.customer_name,
        "Invoice Number": inv.invoice_number,
        "Invoice Date": fmtDate(inv.created_at),
        "Invoice Value (₹)": inv.grand_total.toFixed(2),
        "Place of Supply": "33-Tamil Nadu",
        "Reverse Charge": "N",
        "Invoice Type": "Regular B2B",
        "Applicable % of Tax Rate": "",
        "Taxable Value (₹)": (inv.subtotal - inv.discount_amount).toFixed(2),
        "Integrated Tax (₹)": "0.00",
        "Central Tax / CGST (₹)": (inv.tax_amount / 2).toFixed(2),
        "State/UT Tax / SGST (₹)": (inv.tax_amount / 2).toFixed(2),
        "Cess (₹)": "0.00",
      };
    });

    // B2C Sheet
    const b2cRows = b2cInvoices.map((inv) => ({
      "Invoice Number": inv.invoice_number,
      "Invoice Date": fmtDate(inv.created_at),
      "Customer Name": inv.customer_name,
      "Place of Supply": "33-Tamil Nadu",
      "Taxable Value (₹)": (inv.subtotal - inv.discount_amount).toFixed(2),
      "CGST (₹)": (inv.tax_amount / 2).toFixed(2),
      "SGST (₹)": (inv.tax_amount / 2).toFixed(2),
      "Total GST (₹)": inv.tax_amount.toFixed(2),
      "Invoice Total (₹)": inv.grand_total.toFixed(2),
      "Payment Method": inv.payment_method,
    }));

    // HSN Sheet
    const hsnRows = hsnSummary.map((h) => ({
      "HSN / SKU Code": h.hsn,
      "Description": h.description,
      "UQC": h.uqc,
      "Total Quantity": h.qty.toFixed(2),
      "Total Value (₹)": h.taxableVal.toFixed(2),
      "Taxable Value (₹)": h.taxableVal.toFixed(2),
      "Integrated Tax (₹)": "0.00",
      "Central Tax CGST (₹)": (h.taxAmt / 2).toFixed(2),
      "State Tax SGST (₹)": (h.taxAmt / 2).toFixed(2),
      "GST Rate (%)": h.rate,
      "Cess (₹)": "0.00",
    }));

    // GSTR-3B Summary Sheet
    const gstr3bRows = [
      { "Section": "3.1(a) Outward Taxable Supplies (other than zero rated, nil, exempt)", "Taxable Value (₹)": allGSTTotals.taxable.toFixed(2), "IGST (₹)": "0.00", "CGST (₹)": (allGSTTotals.tax / 2).toFixed(2), "SGST (₹)": (allGSTTotals.tax / 2).toFixed(2), "Cess (₹)": "0.00" },
      { "Section": "3.1(b) Outward Taxable Supplies (zero rated)", "Taxable Value (₹)": "0.00", "IGST (₹)": "0.00", "CGST (₹)": "0.00", "SGST (₹)": "0.00", "Cess (₹)": "0.00" },
      { "Section": "3.1(c) Other Outward Supplies (Nil rated, Exempt)", "Taxable Value (₹)": (filteredInvoices.filter(i => i.invoice_type === 'NON_GST').reduce((s,i)=>s+i.grand_total,0)).toFixed(2), "IGST (₹)": "0.00", "CGST (₹)": "0.00", "SGST (₹)": "0.00", "Cess (₹)": "0.00" },
      { "Section": "4(A) ITC Available — Inputs (Purchases Received)", "Taxable Value (₹)": receivedPOs.reduce((s,po)=>s+(po.total_amount - (po.tax_amount||0)),0).toFixed(2), "IGST (₹)": "0.00", "CGST (₹)": (itcTotal / 2).toFixed(2), "SGST (₹)": (itcTotal / 2).toFixed(2), "Cess (₹)": "0.00" },
      { "Section": "5.1 Net Output Tax Liability (3.1 - 4)", "Taxable Value (₹)": "", "IGST (₹)": "0.00", "CGST (₹)": ((allGSTTotals.tax - itcTotal) / 2).toFixed(2), "SGST (₹)": ((allGSTTotals.tax - itcTotal) / 2).toFixed(2), "Cess (₹)": "0.00" },
    ];

    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(b2bRows.length ? b2bRows : [{ Notice: "No B2B invoices in this period" }]), "4A-B2B Invoices");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(b2cRows.length ? b2cRows : [{ Notice: "No B2C invoices in this period" }]), "7-B2C Small");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hsnRows.length ? hsnRows : [{ Notice: "No GST items in this period" }]), "12-HSN Summary");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gstr3bRows), "GSTR-3B Summary");
      XLSX.writeFile(wb, `Ponmani_GSTR1_${periodLabel}.xlsx`);
      toast.success(`GSTR-1 Report for ${periodLabel} exported successfully!`);
    });
  }

  // ─── Period Label ─────────────────────────────────────────────────────────

  const periodLabel = filterMode === "month"
    ? `${MONTHS[selectedMonth]} ${selectedYear}`
    : fyLabel;

  const tabs: { id: GSTTab; label: string; icon: React.ReactNode }[] = [
    { id: "summary", label: "GST Summary", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: "b2b", label: `B2B Invoices (${b2bInvoices.length})`, icon: <Building2 className="h-3.5 w-3.5" /> },
    { id: "b2c", label: `B2C Sales (${b2cInvoices.length})`, icon: <Users className="h-3.5 w-3.5" /> },
    { id: "hsn", label: `HSN Summary`, icon: <LayoutList className="h-3.5 w-3.5" /> },
    { id: "gstr3b", label: "GSTR-3B", icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "purchase", label: `ITC / Purchases (${receivedPOs.length})`, icon: <Download className="h-3.5 w-3.5" /> },
  ];

  return (
    <>
      <div className="p-6 space-y-5 print:hidden">
      <PageHeader
        title="GST Compliance & Filing Center"
        subtitle={`Tamil Nadu GST (State Code 33) — GSTR-1 & GSTR-3B Reports | ${store?.settings?.shop_gstin || "GSTIN not configured"}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="h-10 px-4 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 transition shadow"
            >
              <Printer className="h-4 w-4" /> Generate Report
            </button>
            <button
              onClick={exportGSTR1Report}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 hover:opacity-90 transition shadow"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </button>
            <button
              onClick={exportGSTWorkbook}
              className="h-10 px-4 rounded-md bg-secondary border border-border text-foreground text-xs font-semibold flex items-center gap-2 hover:bg-muted transition"
            >
              <Download className="h-4 w-4" /> All Periods
            </button>
          </div>
        }
      />

      {/* ── Period Selector ─────────────────────────────────────────────── */}
      <div className="card-surface p-4 flex flex-wrap gap-3 items-center">
        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter Period:</span>

        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <button
            onClick={() => setFilterMode("month")}
            className={`h-7 px-3 rounded text-xs font-semibold transition ${filterMode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setFilterMode("fy")}
            className={`h-7 px-3 rounded text-xs font-semibold transition ${filterMode === "fy" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Financial Year
          </button>
        </div>

        {filterMode === "month" && (
          <>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-8 rounded bg-input border border-border px-2 text-xs font-mono"
            >
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-8 rounded bg-input border border-border px-2 text-xs font-mono"
            >
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}

        {filterMode === "fy" && (
          <span className="text-xs font-bold text-primary font-mono bg-primary/10 px-3 py-1 rounded border border-primary/20">
            {fyLabel} (Apr {fyStart.getFullYear()} – Mar {fyEnd.getFullYear()})
          </span>
        )}

        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {gstInvoices.length} GST invoices | Period: <strong className="text-foreground">{periodLabel}</strong>
        </span>
      </div>

      {/* ── Top KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Taxable Turnover", val: allGSTTotals.taxable, color: "border-l-emerald-500", text: "text-emerald-400" },
          { label: "Output GST Collected", val: allGSTTotals.tax, color: "border-l-primary", text: "text-primary" },
          { label: "CGST Output", val: allGSTTotals.tax / 2, color: "border-l-blue-500", text: "text-blue-400" },
          { label: "SGST Output", val: allGSTTotals.tax / 2, color: "border-l-purple-500", text: "text-purple-400" },
          { label: "ITC (Input Tax Credit)", val: itcTotal, color: "border-l-amber-500", text: "text-amber-400" },
          { label: "Net Tax Payable", val: netTaxLiability, color: netTaxLiability > 0 ? "border-l-red-500" : "border-l-emerald-400", text: netTaxLiability > 0 ? "text-red-400" : "text-emerald-400" },
        ].map((card) => (
          <div key={card.label} className={`card-surface p-3 border-l-4 ${card.color}`}>
            <div className="text-[10px] text-muted-foreground mb-1 leading-tight">{card.label}</div>
            <div className={`text-base font-bold font-mono ${card.text}`}>{inr(card.val)}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`h-8 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition border ${
              activeTab === tab.id
                ? "bg-primary/20 text-primary border-primary"
                : "bg-input border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── GST Summary Tab ─────────────────────────────────────────────── */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales Breakdown */}
          <div className="card-surface p-4 space-y-3">
            <div className="text-sm font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Outward Supply Breakdown
            </div>
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="text-left py-1.5">Category</th>
                  <th className="text-right py-1.5">Invoices</th>
                  <th className="text-right py-1.5">Taxable Value</th>
                  <th className="text-right py-1.5">GST</th>
                  <th className="text-right py-1.5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                <tr className="hover:bg-secondary/30">
                  <td className="py-2 font-semibold text-emerald-400">B2B (Registered)</td>
                  <td className="py-2 text-right">{b2bTotals.count}</td>
                  <td className="py-2 text-right">{inr(b2bTotals.taxable)}</td>
                  <td className="py-2 text-right">{inr(b2bTotals.tax)}</td>
                  <td className="py-2 text-right font-bold">{inr(b2bTotals.gross)}</td>
                </tr>
                <tr className="hover:bg-secondary/30">
                  <td className="py-2 font-semibold text-blue-400">B2C (Consumer)</td>
                  <td className="py-2 text-right">{b2cTotals.count}</td>
                  <td className="py-2 text-right">{inr(b2cTotals.taxable)}</td>
                  <td className="py-2 text-right">{inr(b2cTotals.tax)}</td>
                  <td className="py-2 text-right font-bold">{inr(b2cTotals.gross)}</td>
                </tr>
                <tr className="bg-primary/5 font-bold">
                  <td className="py-2 text-foreground">TOTAL GST Sales</td>
                  <td className="py-2 text-right text-foreground">{allGSTTotals.count}</td>
                  <td className="py-2 text-right text-emerald-400">{inr(allGSTTotals.taxable)}</td>
                  <td className="py-2 text-right text-primary">{inr(allGSTTotals.tax)}</td>
                  <td className="py-2 text-right text-foreground">{inr(allGSTTotals.gross)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Rate Wise Breakup */}
          <div className="card-surface p-4 space-y-3">
            <div className="text-sm font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-primary" /> Tax Rate Wise Breakup (for HSN)
            </div>
            {taxRateBreakdown.length === 0 ? (
              <div className="text-xs text-muted-foreground py-6 text-center">No GST items in this period</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left py-1.5">GST Rate</th>
                    <th className="text-right py-1.5">Taxable Value</th>
                    <th className="text-right py-1.5">CGST</th>
                    <th className="text-right py-1.5">SGST</th>
                    <th className="text-right py-1.5">Total GST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {taxRateBreakdown.map((row) => (
                    <tr key={row.rate} className="hover:bg-secondary/30">
                      <td className="py-2 font-bold text-primary">{row.rate}%</td>
                      <td className="py-2 text-right">{inr(row.taxable)}</td>
                      <td className="py-2 text-right text-blue-400">{inr(row.tax / 2)}</td>
                      <td className="py-2 text-right text-purple-400">{inr(row.tax / 2)}</td>
                      <td className="py-2 text-right font-bold text-emerald-400">{inr(row.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* GSTR Filing Readiness */}
          <div className="card-surface p-4 space-y-3 lg:col-span-2">
            <div className="text-sm font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> GSTR-1 Filing Readiness Check — {periodLabel}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { ok: gstInvoices.length > 0, label: "GST invoices exist for period" },
                { ok: !!store?.settings?.shop_gstin, label: "GSTIN configured in settings" },
                { ok: allGSTTotals.taxable > 0, label: "Taxable turnover recorded" },
                { ok: hsnSummary.length > 0, label: "HSN/item data available" },
              ].map((check) => (
                <div key={check.label} className={`flex items-start gap-2 p-3 rounded-lg border ${check.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                  {check.ok
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    : <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  }
                  <span className={`text-xs font-semibold ${check.ok ? "text-emerald-400" : "text-amber-400"}`}>{check.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">How to file:</strong> Click <em>Export GSTR-1</em> above to download the Excel workbook.
                Share the <strong>4A-B2B</strong>, <strong>7-B2C Small</strong>, and <strong>12-HSN Summary</strong> sheets with your CA, or upload directly to the{" "}
                <strong className="text-primary">GST Portal (gst.gov.in)</strong> under "Returns → GSTR-1 → Upload via Excel". The <strong>GSTR-3B Summary</strong> sheet helps compute your net tax payable.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── B2B Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "b2b" && (
        <div className="card-surface overflow-auto">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-400" />
              B2B Registered Tax Invoices — Form GSTR-1 Section 4A
            </div>
            <span className="text-xs text-muted-foreground font-mono">{b2bInvoices.length} invoices | {inr(b2bTotals.gross)} total</span>
          </div>
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground bg-card border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5">GSTIN of Recipient</th>
                <th className="text-left px-4 py-2.5">Receiver Name</th>
                <th className="text-left px-4 py-2.5">Invoice #</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-right px-4 py-2.5">Taxable Value</th>
                <th className="text-right px-4 py-2.5">IGST</th>
                <th className="text-right px-4 py-2.5">CGST (½)</th>
                <th className="text-right px-4 py-2.5">SGST (½)</th>
                <th className="text-right px-4 py-2.5">Invoice Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {b2bInvoices.map((inv) => {
                const cust = store?.customers.find((c) => c.id === inv.customer_id);
                return (
                  <tr key={inv.id} className="hover:bg-secondary/30 transition">
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-400">{cust?.gst_number || "—"}</td>
                    <td className="px-4 py-2.5 font-semibold">{inv.customer_name}</td>
                    <td className="px-4 py-2.5 font-mono text-primary font-bold">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{inv.created_at.split("T")[0]}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{inr(inv.subtotal - inv.discount_amount)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">₹0.00</td>
                    <td className="px-4 py-2.5 text-right font-mono text-blue-400">{inr(inv.tax_amount / 2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-purple-400">{inr(inv.tax_amount / 2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold">{inr(inv.grand_total)}</td>
                  </tr>
                );
              })}
              {b2bInvoices.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No B2B invoices in this period. All current sales are B2C.</td></tr>
              )}
            </tbody>
            {b2bInvoices.length > 0 && (
              <tfoot className="border-t-2 border-border bg-primary/5 font-bold text-xs">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-muted-foreground uppercase text-[10px]">B2B Totals</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{inr(b2bTotals.taxable)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">₹0.00</td>
                  <td className="px-4 py-2.5 text-right font-mono text-blue-400">{inr(b2bTotals.tax / 2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-purple-400">{inr(b2bTotals.tax / 2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{inr(b2bTotals.gross)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── B2C Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "b2c" && (
        <div className="card-surface overflow-auto">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              B2C Consumer Sales — Form GSTR-1 Section 7 (B2C Small)
            </div>
            <span className="text-xs text-muted-foreground font-mono">{b2cInvoices.length} bills | {inr(b2cTotals.gross)} gross</span>
          </div>
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground bg-card border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5">Invoice #</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Customer</th>
                <th className="text-left px-4 py-2.5">Place of Supply</th>
                <th className="text-right px-4 py-2.5">Taxable Value</th>
                <th className="text-right px-4 py-2.5">CGST</th>
                <th className="text-right px-4 py-2.5">SGST</th>
                <th className="text-right px-4 py-2.5">GST Total</th>
                <th className="text-right px-4 py-2.5">Invoice Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {b2cInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-secondary/30 transition">
                  <td className="px-4 py-2.5 font-mono font-bold text-primary">{inv.invoice_number}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{inv.created_at.split("T")[0]}</td>
                  <td className="px-4 py-2.5 font-medium">{inv.customer_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">33-Tamil Nadu</td>
                  <td className="px-4 py-2.5 text-right font-mono">{inr(inv.subtotal - inv.discount_amount)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-blue-400">{inr(inv.tax_amount / 2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-purple-400">{inr(inv.tax_amount / 2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-primary">{inr(inv.tax_amount)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold">{inr(inv.grand_total)}</td>
                </tr>
              ))}
              {b2cInvoices.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No B2C GST invoices in this period.</td></tr>
              )}
            </tbody>
            {b2cInvoices.length > 0 && (
              <tfoot className="border-t-2 border-border bg-primary/5 font-bold text-xs">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-muted-foreground uppercase text-[10px]">B2C Totals</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{inr(b2cTotals.taxable)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-blue-400">{inr(b2cTotals.tax / 2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-purple-400">{inr(b2cTotals.tax / 2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-primary">{inr(b2cTotals.tax)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{inr(b2cTotals.gross)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── HSN Summary Tab ──────────────────────────────────────────────── */}
      {activeTab === "hsn" && (
        <div className="card-surface overflow-auto">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="text-sm font-bold flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-primary" />
              HSN-wise Summary — Form GSTR-1 Section 12
            </div>
            <span className="text-xs text-muted-foreground font-mono">{hsnSummary.length} HSN groups</span>
          </div>
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground bg-card border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5">HSN / SKU Code</th>
                <th className="text-left px-4 py-2.5">Description</th>
                <th className="text-center px-4 py-2.5">UQC</th>
                <th className="text-right px-4 py-2.5">Total Qty</th>
                <th className="text-right px-4 py-2.5">GST Rate</th>
                <th className="text-right px-4 py-2.5">Taxable Value</th>
                <th className="text-right px-4 py-2.5">IGST</th>
                <th className="text-right px-4 py-2.5">CGST</th>
                <th className="text-right px-4 py-2.5">SGST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hsnSummary.map((row, i) => (
                <tr key={i} className="hover:bg-secondary/30 transition">
                  <td className="px-4 py-2.5 font-mono font-bold text-primary">{row.hsn}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.description}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-muted-foreground">{row.uqc}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{row.qty.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-amber-400">{row.rate}%</td>
                  <td className="px-4 py-2.5 text-right font-mono">{inr(row.taxableVal)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">₹0.00</td>
                  <td className="px-4 py-2.5 text-right font-mono text-blue-400">{inr(row.taxAmt / 2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-purple-400">{inr(row.taxAmt / 2)}</td>
                </tr>
              ))}
              {hsnSummary.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No HSN data in this period.</td></tr>
              )}
            </tbody>
            {hsnSummary.length > 0 && (
              <tfoot className="border-t-2 border-border bg-primary/5 font-bold text-xs">
                <tr>
                  <td colSpan={5} className="px-4 py-2.5 text-muted-foreground uppercase text-[10px]">HSN Grand Totals</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{inr(hsnSummary.reduce((s, h) => s + h.taxableVal, 0))}</td>
                  <td className="px-4 py-2.5 text-right font-mono">₹0.00</td>
                  <td className="px-4 py-2.5 text-right font-mono text-blue-400">{inr(hsnSummary.reduce((s, h) => s + h.taxAmt / 2, 0))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-purple-400">{inr(hsnSummary.reduce((s, h) => s + h.taxAmt / 2, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── GSTR-3B Tab ──────────────────────────────────────────────────── */}
      {activeTab === "gstr3b" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-surface p-4 space-y-3">
            <div className="text-sm font-bold border-b border-border pb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> GSTR-3B — Table 3.1: Outward Supplies
            </div>
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="text-left py-1.5">Nature of Supply</th>
                  <th className="text-right py-1.5">Taxable Value</th>
                  <th className="text-right py-1.5">CGST</th>
                  <th className="text-right py-1.5">SGST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs">
                {[
                  {
                    label: "3.1(a) Outward Taxable Supplies",
                    taxable: allGSTTotals.taxable,
                    cgst: allGSTTotals.tax / 2,
                    sgst: allGSTTotals.tax / 2,
                    bold: false,
                  },
                  {
                    label: "3.1(b) Zero Rated Supplies",
                    taxable: 0, cgst: 0, sgst: 0, bold: false,
                  },
                  {
                    label: "3.1(c) Nil/Exempt Supplies",
                    taxable: filteredInvoices.filter(i => i.invoice_type === 'NON_GST').reduce((s, i) => s + i.grand_total, 0),
                    cgst: 0, sgst: 0, bold: false,
                  },
                  {
                    label: "3.1(d) Inward Supplies (RCM)",
                    taxable: 0, cgst: 0, sgst: 0, bold: false,
                  },
                ].map((row) => (
                  <tr key={row.label} className="hover:bg-secondary/30">
                    <td className={`py-2 font-sans text-[11px] ${row.bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>{row.label}</td>
                    <td className="py-2 text-right">{inr(row.taxable)}</td>
                    <td className="py-2 text-right text-blue-400">{inr(row.cgst)}</td>
                    <td className="py-2 text-right text-purple-400">{inr(row.sgst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card-surface p-4 space-y-3">
            <div className="text-sm font-bold border-b border-border pb-2 flex items-center gap-2">
              <Download className="h-4 w-4 text-amber-400" /> GSTR-3B — Table 4: ITC & Net Liability
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border font-mono">
                {[
                  { label: "4A(1) All ITC (Received Purchases)", cgst: itcTotal / 2, sgst: itcTotal / 2, color: "text-amber-400" },
                  { label: "5.1 Output Tax Liability", cgst: allGSTTotals.tax / 2, sgst: allGSTTotals.tax / 2, color: "text-red-400" },
                  { label: "5.1 ITC Set-off", cgst: -(itcTotal / 2), sgst: -(itcTotal / 2), color: "text-emerald-400" },
                  { label: "Net Tax Payable to Govt.", cgst: (allGSTTotals.tax - itcTotal) / 2, sgst: (allGSTTotals.tax - itcTotal) / 2, color: netTaxLiability > 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-secondary/30">
                    <td className="py-2 font-sans text-[11px] text-muted-foreground">{row.label}</td>
                    <td className={`py-2 text-right ${row.color}`}>{row.cgst < 0 ? `-${inr(Math.abs(row.cgst))}` : inr(row.cgst)}</td>
                    <td className={`py-2 text-right ${row.color}`}>{row.sgst < 0 ? `-${inr(Math.abs(row.sgst))}` : inr(row.sgst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={`p-3 rounded-lg border ${netTaxLiability > 0 ? "border-red-500/30 bg-red-500/5" : "border-emerald-500/30 bg-emerald-500/5"} text-xs font-bold`}>
              {netTaxLiability > 0
                ? <span className="text-red-400">⚠ Net Tax Payable to Government: {inr(netTaxLiability)} (CGST: {inr(netTaxLiability / 2)} + SGST: {inr(netTaxLiability / 2)})</span>
                : <span className="text-emerald-400">✓ No tax payable — ITC exceeds output tax for this period.</span>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── ITC / Purchases Tab ──────────────────────────────────────────── */}
      {activeTab === "purchase" && (
        <div className="card-surface overflow-auto">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="text-sm font-bold flex items-center gap-2">
              <Download className="h-4 w-4 text-amber-400" />
              Input Tax Credit (ITC) — Received Purchase Orders
            </div>
            <span className="text-xs text-muted-foreground font-mono">{receivedPOs.length} POs | ITC: {inr(itcTotal)}</span>
          </div>
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground bg-card border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5">PO Number</th>
                <th className="text-left px-4 py-2.5">Supplier</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-right px-4 py-2.5">PO Value</th>
                <th className="text-right px-4 py-2.5">Tax (ITC)</th>
                <th className="text-right px-4 py-2.5">CGST ITC</th>
                <th className="text-right px-4 py-2.5">SGST ITC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {receivedPOs.map((po) => {
                const taxAmt = po.tax_amount || 0;
                return (
                  <tr key={po.id} className="hover:bg-secondary/30 transition">
                    <td className="px-4 py-2.5 font-mono font-bold text-primary">{po.po_number}</td>
                    <td className="px-4 py-2.5 font-medium">{po.vendor_name}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{po.created_at.split("T")[0]}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{inr(po.total_amount)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-amber-400">{inr(taxAmt)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-blue-400">{inr(taxAmt / 2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-purple-400">{inr(taxAmt / 2)}</td>
                  </tr>
                );
              })}
              {receivedPOs.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No received purchase orders in this period to claim ITC.</td></tr>
              )}
            </tbody>
            {receivedPOs.length > 0 && (
              <tfoot className="border-t-2 border-border bg-amber-500/5 font-bold text-xs">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-muted-foreground uppercase text-[10px]">ITC Totals</td>
                  <td className="px-4 py-2.5 text-right font-mono">{inr(receivedPOs.reduce((s, p) => s + p.total_amount, 0))}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-amber-400">{inr(itcTotal)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-blue-400">{inr(itcTotal / 2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-purple-400">{inr(itcTotal / 2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      </div>

      {/* ── GST Report Print Modal ──────────────────────────────────────── */}
      {showReportModal && store && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col print:bg-white print:inset-auto print:static print:block"
          onClick={() => setShowReportModal(false)}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3 bg-card border-b border-border shrink-0 print:hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              <div>
                <div className="font-bold text-sm">GST Compliance Report</div>
                <div className="text-xs text-muted-foreground font-mono">{periodLabel}</div>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); window.print(); }}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow hover:opacity-90 transition"
              >
                <Printer className="h-4 w-4" /> Print / Save as PDF
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="h-9 w-9 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable A4 preview */}
          <div
            className="flex-1 overflow-y-auto overflow-x-auto flex justify-center py-8 px-4 bg-zinc-900/60 print:bg-white print:p-0 print:overflow-visible print:block"
            onClick={(e) => e.stopPropagation()}
          >
            <div ref={reportRef} className="shadow-2xl print:shadow-none">
              <GSTReportDocument data={buildReportData()} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
