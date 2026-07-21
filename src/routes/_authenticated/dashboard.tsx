import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { inr, qty } from "@/lib/format";
import { Package, Receipt, Users, AlertTriangle, Wrench, Recycle, ShoppingBag, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const stats = useQuery({
    queryKey: ["local-dashboard-stats"],
    queryFn: async () => {
      const store = db.getStore();
      const invoices = store.invoices;
      const totalSales = invoices.reduce((s, i) => s + Number(i.grand_total), 0);

      // Low stock check against MOQ / min alert
      const lowStock = store.inventory.filter(
        (p) => Number(p.stock_qty) <= Number(p.min_stock_alert) || Number(p.stock_qty) <= Number(p.moq)
      );

      // Last 7 days chart
      const byDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        byDay[d.toISOString().slice(0, 10)] = 0;
      }
      invoices.forEach((r) => {
        const k = r.created_at.slice(0, 10);
        if (k in byDay) byDay[k] += Number(r.grand_total);
      });
      const chart = Object.entries(byDay).map(([d, v]) => ({ d: d.slice(5), v: Math.round(v) }));

      const pendingServices = store.service_tickets.filter((s) => s.status !== "Delivered").length;
      const totalScrapPayout = store.scrap_entries.reduce((s, e) => s + Number(e.total_payout), 0);

      return {
        productCount: store.inventory.length,
        customerCount: store.customers.length,
        invoiceCount: invoices.length,
        totalSales,
        chart,
        lowStock,
        pendingServices,
        totalScrapPayout,
        recentInvoices: invoices.slice(0, 5),
      };
    },
  });

  const data = stats.data;
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Offline Store Terminal Dashboard"
        subtitle="Ponmani Agencies Hardware & Electronics — Real-time On-Premise Metrics"
        action={
          <Link
            to="/pos"
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1 hover:accent-glow transition"
          >
            Open POS Terminal <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI label="Total Sales Revenue" value={inr(data?.totalSales)} icon={Receipt} accent />
        <KPI label="Invoices Issued" value={qty(data?.invoiceCount)} icon={Receipt} />
        <KPI label="Active Catalog Items" value={qty(data?.productCount)} icon={Package} />
        <KPI label="Registered Customers" value={qty(data?.customerCount)} icon={Users} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface p-4 border-l-4 border-l-amber-500">
          <div className="text-xs text-muted-foreground mb-1">Low Stock Alerts</div>
          <div className="text-xl font-bold font-mono text-amber-400">{data?.lowStock.length ?? 0} Products</div>
        </div>
        <div className="card-surface p-4 border-l-4 border-l-blue-500">
          <div className="text-xs text-muted-foreground mb-1">Active Service Tickets</div>
          <div className="text-xl font-bold font-mono text-blue-400">{data?.pendingServices ?? 0} Tickets</div>
        </div>
        <div className="card-surface p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs text-muted-foreground mb-1">Scrap Buying Payout</div>
          <div className="text-xl font-bold font-mono text-emerald-400">{inr(data?.totalScrapPayout)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-surface p-4 lg:col-span-2">
          <div className="text-sm font-medium mb-3 flex items-center justify-between">
            <span>Daily Sales Trend (Last 7 Days)</span>
            <span className="text-xs text-muted-foreground font-mono">100% Offline DB</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.chart ?? []}>
                <CartesianGrid stroke="oklch(0.28 0.012 240)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.65 0.015 240)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0.015 240)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.20 0.012 240)",
                    border: "1px solid oklch(0.28 0.012 240)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(val: any) => [`₹${val}`, 'Revenue']}
                />
                <Bar dataKey="v" fill="oklch(0.72 0.16 160)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-3 text-amber-400">
            <AlertTriangle className="h-4 w-4" /> Low Stock & MOQ Alerts ({data?.lowStock.length ?? 0})
          </div>
          <div className="space-y-2 max-h-64 overflow-auto pr-1">
            {(data?.lowStock ?? []).map((p) => (
              <div key={p.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border last:border-0">
                <div className="min-w-0 pr-2">
                  <div className="truncate font-medium text-foreground">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{p.category}</div>
                </div>
                <span className="font-mono text-amber-400 font-semibold shrink-0">
                  {qty(p.stock_qty)} / {qty(p.moq)}
                </span>
              </div>
            ))}
            {data && data.lowStock.length === 0 && (
              <div className="text-xs text-muted-foreground py-10 text-center">All inventory stock levels optimal.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function KPI({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent?: boolean }) {
  return (
    <div className={`card-surface p-4 ${accent ? "accent-glow border-primary/40" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className={`mt-2 text-2xl font-mono font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}