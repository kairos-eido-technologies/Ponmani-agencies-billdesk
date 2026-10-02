import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PonmaniLogo } from "@/components/PonmaniLogo";
import {
  LayoutDashboard,
  ScanBarcode,
  Receipt,
  FileText,
  Package,
  ShoppingBag,
  Warehouse,
  Users,
  Wrench,
  Recycle,
  LineChart,
  Settings,
  Search,
  ClipboardList,
} from "lucide-react";
import { useT } from "@/lib/lang/lang-context";

export const Route = createFileRoute("/_authenticated/apps")({
  component: AppsPage,
});

export type SingleApp = {
  id: string;
  name: string;
  category: string;
  desc: string;
  to: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
};

export const INDIVIDUAL_APPS: SingleApp[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    category: "Analytics",
    desc: "Overview",
    to: "/dashboard",
    icon: LayoutDashboard,
    color: "text-sky-400",
    bgColor: "from-sky-500/25 to-blue-600/15",
    borderColor: "border-sky-500/40",
  },
  {
    id: "pos",
    name: "POS Billing",
    category: "Sales",
    desc: "POS",
    to: "/pos",
    icon: ScanBarcode,
    color: "text-emerald-400",
    bgColor: "from-emerald-500/30 to-teal-600/15",
    borderColor: "border-emerald-500/40",
  },
  {
    id: "invoices",
    name: "Invoices",
    category: "Sales",
    desc: "Invoices",
    to: "/invoices",
    icon: Receipt,
    color: "text-teal-400",
    bgColor: "from-teal-500/25 to-emerald-600/15",
    borderColor: "border-teal-500/40",
  },
  {
    id: "billing",
    name: "Billing Hub",
    category: "Sales",
    desc: "Billing",
    to: "/billing",
    icon: FileText,
    color: "text-cyan-400",
    bgColor: "from-cyan-500/25 to-blue-600/15",
    borderColor: "border-cyan-500/40",
  },
  {
    id: "inventory",
    name: "Inventory",
    category: "Stock",
    desc: "Inventory",
    to: "/inventory",
    icon: Package,
    color: "text-blue-400",
    bgColor: "from-blue-500/30 to-indigo-600/15",
    borderColor: "border-blue-500/40",
  },
  {
    id: "purchase",
    name: "Purchases",
    category: "Stock",
    desc: "Purchases",
    to: "/purchase",
    icon: ShoppingBag,
    color: "text-indigo-400",
    bgColor: "from-indigo-500/25 to-violet-600/15",
    borderColor: "border-indigo-500/40",
  },
  {
    id: "shopping-list",
    name: "Shopping List",
    category: "Stock",
    desc: "Restock & Buying",
    to: "/shopping-list",
    icon: ClipboardList,
    color: "text-rose-400",
    bgColor: "from-rose-500/30 to-pink-600/15",
    borderColor: "border-rose-500/40",
  },
  {
    id: "godown",
    name: "Godown",
    category: "Stock",
    desc: "Godown",
    to: "/godown",
    icon: Warehouse,
    color: "text-violet-400",
    bgColor: "from-violet-500/25 to-purple-600/15",
    borderColor: "border-violet-500/40",
  },
  {
    id: "customers",
    name: "Customers",
    category: "People",
    desc: "Customers",
    to: "/customers",
    icon: Users,
    color: "text-purple-400",
    bgColor: "from-purple-500/25 to-pink-600/15",
    borderColor: "border-purple-500/40",
  },
  {
    id: "service",
    name: "Service Desk",
    category: "Repairs",
    desc: "Service",
    to: "/service",
    icon: Wrench,
    color: "text-amber-400",
    bgColor: "from-amber-500/30 to-orange-600/15",
    borderColor: "border-amber-500/40",
  },
  {
    id: "scrap",
    name: "Scrap Buying",
    category: "Repairs",
    desc: "Scrap",
    to: "/scrap",
    icon: Recycle,
    color: "text-orange-400",
    bgColor: "from-orange-500/25 to-amber-600/15",
    borderColor: "border-orange-500/40",
  },
  {
    id: "gst",
    name: "GST Center",
    category: "Tax",
    desc: "GST",
    to: "/gst",
    icon: FileText,
    color: "text-emerald-400",
    bgColor: "from-emerald-500/25 to-green-600/15",
    borderColor: "border-emerald-500/40",
  },
  {
    id: "reports",
    name: "Reports",
    category: "Analytics",
    desc: "Reports",
    to: "/reports",
    icon: LineChart,
    color: "text-pink-400",
    bgColor: "from-pink-500/25 to-rose-600/15",
    borderColor: "border-pink-500/40",
  },
  {
    id: "settings",
    name: "Settings",
    category: "System",
    desc: "Settings",
    to: "/settings",
    icon: Settings,
    color: "text-slate-400",
    bgColor: "from-slate-500/25 to-zinc-600/15",
    borderColor: "border-slate-500/40",
  },
];

function AppsPage() {
  const t = useT();
  const [search, setSearch] = useState("");

  // Translate app names dynamically based on current language
  const apps = INDIVIDUAL_APPS.map((app) => ({
    ...app,
    name: t(`apps.${app.id}`, app.name),
  }));

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-background overflow-hidden">

      {/* ── Watermark: text only, fixed center of screen ── */}
      <div
        className="pointer-events-none select-none fixed inset-0 flex flex-col items-center justify-center z-0"
        aria-hidden="true"
      >
        <div className="text-center flex flex-col items-center gap-1 opacity-[0.08]">
          <div
            className="font-black uppercase text-foreground"
            style={{ fontSize: "clamp(36px, 7vw, 72px)", letterSpacing: "0.35em" }}
          >
            PONMANI
          </div>
          <div
            className="font-bold uppercase text-foreground"
            style={{ fontSize: "clamp(14px, 2.8vw, 30px)", letterSpacing: "0.55em" }}
          >
            AGENCIES
          </div>
          <div
            className="font-semibold uppercase text-foreground mt-1"
            style={{ fontSize: "clamp(9px, 1.2vw, 14px)", letterSpacing: "0.4em" }}
          >
            SINCE 1998
          </div>
        </div>
      </div>

      {/* ── Foreground content ── */}
      <div className="relative z-10 flex flex-col items-center p-6 md:p-10">

        {/* Search Input */}
        <div className="w-full max-w-md mb-10 mt-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("apps.searchPlaceholder")}
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition shadow-xs"
            />
          </div>
        </div>

        {/* Mobile OS Style App Grid (Icon + Name Only) */}
        <div className="w-full max-w-5xl grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-8 gap-x-6 justify-items-center">
          {filteredApps.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                to={app.to as any}
                className="group flex flex-col items-center gap-3 p-2 rounded-2xl transition-all duration-200 active:scale-95 hover:scale-105 cursor-pointer focus:outline-none"
              >
                {/* Mobile App Icon Squircle */}
                <div
                  className={`relative h-20 w-20 sm:h-24 sm:w-24 rounded-[24px] bg-gradient-to-br ${app.bgColor} border ${app.borderColor} grid place-items-center shadow-md group-hover:shadow-xl group-hover:border-primary/60 transition-all duration-200`}
                >
                  <Icon className={`h-9 w-9 sm:h-11 sm:w-11 ${app.color} drop-shadow-xs`} />
                </div>

                {/* App Name Only */}
                <span className="text-xs sm:text-sm font-semibold text-center text-foreground group-hover:text-primary transition-colors max-w-[96px] sm:max-w-[110px] leading-tight line-clamp-2">
                  {app.name}
                </span>
              </Link>
            );
          })}
        </div>

        {filteredApps.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border p-6 max-w-sm w-full">
            <p className="text-sm text-muted-foreground">{t("apps.noResults")} "{search}"</p>
            <button
              onClick={() => setSearch("")}
              className="mt-3 text-xs font-semibold text-primary underline"
            >
              {t("apps.clearFilter")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
