import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr, qty } from "@/lib/format";
import { FileSpreadsheet, LineChart as ChartIcon, BarChart3, PieChart as PieIcon, TrendingUp, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

type ReportType =
  | "daily_sales"
  | "monthly_revenue"
  | "category_breakdown"
  | "profit_margin"
  | "stock_movement"
  | "supplier_purchases"
  | "customer_ledger"
  | "service_revenue"
  | "gst_summary";

const COLORS = ['oklch(0.72 0.16 160)', 'oklch(0.65 0.18 210)', 'oklch(0.78 0.15 75)', 'oklch(0.62 0.22 25)', 'oklch(0.68 0.15 300)'];

function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("daily_sales");

  const reportData = useQuery({
    queryKey: ["local-reports-data", activeReport],
    queryFn: async () => {
      const store = db.getStore();

      if (activeReport === "daily_sales") {
        const byDay: Record<string, number> = {};
        for (let i = 14; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          byDay[d.toISOString().slice(0, 10)] = 0;
        }
        store.invoices.forEach((inv) => {
          const k = inv.created_at.slice(0, 10);
          if (k in byDay) byDay[k] += Number(inv.grand_total);
        });
        return Object.entries(byDay).map(([day, val]) => ({ label: day.slice(5), Revenue: Math.round(val) }));
      }

      if (activeReport === "monthly_revenue") {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const yearSales = new Array(12).fill(0);
        store.invoices.forEach((inv) => {
          const m = new Date(inv.created_at).getMonth();
          yearSales[m] += Number(inv.grand_total);
        });
        return months.map((m, idx) => ({ label: m, Sales: yearSales[idx] }));
      }

      if (activeReport === "category_breakdown") {
        const catMap: Record<string, number> = {};
        store.invoice_items.forEach((ii) => {
          const prod = store.inventory.find((p) => p.id === ii.product_id);
          const cat = prod?.category || "General";
          catMap[cat] = (catMap[cat] || 0) + ii.total_price;
        });
        return Object.entries(catMap).map(([cat, val]) => ({ label: cat, value: Math.round(val) }));
      }

      if (activeReport === "profit_margin") {
        return store.inventory.map((p) => {
          const margin = p.cost_price > 0 ? ((p.selling_price - p.cost_price) / p.selling_price) * 100 : 0;
          return {
            label: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
            Cost: p.cost_price,
            Selling: p.selling_price,
            MarginPercent: Math.round(margin),
          };
        });
      }

      if (activeReport === "stock_movement") {
        return store.inventory.map((p) => ({
          label: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
          ShopStock: p.stock_qty,
          GodownStock: p.godown_qty,
        }));
      }

      if (activeReport === "supplier_purchases") {
        return store.vendors.map((v) => ({
          label: v.company_name || v.name,
          BalanceDue: v.balance_due,
        }));
      }

      if (activeReport === "customer_ledger") {
        return store.customers.slice(0, 10).map((c) => ({
          label: c.name,
          TotalSpent: c.total_spent,
          LoyaltyPoints: c.loyalty_points,
        }));
      }

      if (activeReport === "service_revenue") {
        const catService: Record<string, number> = {};
        store.service_tickets.forEach((s) => {
          catService[s.status] = (catService[s.status] || 0) + (s.final_cost || s.estimated_cost);
        });
        return Object.entries(catService).map(([st, val]) => ({ label: st, Revenue: val }));
      }

      if (activeReport === "gst_summary") {
        let taxable = 0;
        let tax = 0;
        store.invoices.forEach((i) => {
          taxable += i.subtotal - i.discount_amount;
          tax += i.tax_amount;
        });
        return [
          { label: "Taxable Turnover", Amount: taxable },
          { label: "CGST Output (9%)", Amount: tax / 2 },
          { label: "SGST Output (9%)", Amount: tax / 2 },
          { label: "Total Tax Liability", Amount: tax },
        ];
      }

      return [];
    },
  });

  function exportActiveReportExcel() {
    const data = (reportData.data || []).map((row: any) => ({
      'Metric / Item': row.label,
      ...row,
    }));
    ExcelEngine.exportToExcel(data, `Ponmani_Report_${activeReport}_${new Date().toISOString().split('T')[0]}`);
    toast.success(`Report exported to Excel!`);
  }

  const REPORT_NAV: { id: ReportType; label: string }[] = [
    { id: "daily_sales", label: "1. Daily Sales Trend" },
    { id: "monthly_revenue", label: "2. Monthly Revenue" },
    { id: "category_breakdown", label: "3. Category Breakdown" },
    { id: "profit_margin", label: "4. Profit Margin Analysis" },
    { id: "stock_movement", label: "5. Stock Movement" },
    { id: "supplier_purchases", label: "6. Supplier Purchases" },
    { id: "customer_ledger", label: "7. Customer Ledger" },
    { id: "service_revenue", label: "8. Service Revenue" },
    { id: "gst_summary", label: "9. GST Summary" },
  ];

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Reports & Analytics Dashboard"
        subtitle="9 Comprehensive Business Intelligence Reports rendered locally with Recharts"
        action={
          <button
            onClick={exportActiveReportExcel}
            className="h-10 px-4 rounded-md bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/40"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Report to Excel
          </button>
        }
      />

      {/* 9 Report Selector Tabs */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
        {REPORT_NAV.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveReport(r.id)}
            className={`h-8 px-3 rounded text-xs font-semibold transition border ${
              activeReport === r.id
                ? "bg-primary/20 text-primary border-primary"
                : "bg-input border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Chart Display Area */}
      <div className="card-surface p-6 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-border">
          <div className="text-sm font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {REPORT_NAV.find((r) => r.id === activeReport)?.label}
          </div>
          <span className="text-xs text-muted-foreground font-mono">Real-time Local Recharts Engine</span>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            {activeReport === "category_breakdown" ? (
              <PieChart>
                <Pie data={reportData.data || []} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
                  {(reportData.data || []).map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.20 0.012 240)", border: "1px solid oklch(0.28 0.012 240)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            ) : activeReport === "daily_sales" ? (
              <LineChart data={reportData.data || []}>
                <CartesianGrid stroke="oklch(0.28 0.012 240)" vertical={false} />
                <XAxis dataKey="label" stroke="oklch(0.65 0.015 240)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0.015 240)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.012 240)", border: "1px solid oklch(0.28 0.012 240)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="Revenue" stroke="oklch(0.72 0.16 160)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            ) : (
              <BarChart data={reportData.data || []}>
                <CartesianGrid stroke="oklch(0.28 0.012 240)" vertical={false} />
                <XAxis dataKey="label" stroke="oklch(0.65 0.015 240)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0.015 240)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.012 240)", border: "1px solid oklch(0.28 0.012 240)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey={Object.keys((reportData.data || [])[0] || {}).find((k) => k !== 'label') || 'value'} fill="oklch(0.72 0.16 160)" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Data Table Breakdown */}
        <div className="pt-4 border-t border-border">
          <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Report Data Table Summary</div>
          <div className="max-h-48 overflow-auto border border-border rounded">
            <table className="w-full text-xs">
              <thead className="bg-card text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left">Label / Category</th>
                  <th className="px-3 py-2 text-right">Value / Metric</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {(reportData.data || []).map((row: any, i: number) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-sans font-medium">{row.label}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-primary">
                      {JSON.stringify(row).replace(/[{}"label]/g, '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
