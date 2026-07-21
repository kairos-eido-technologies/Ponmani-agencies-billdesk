import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-store";
import {
  LayoutDashboard,
  ScanBarcode,
  Package,
  Users,
  Receipt,
  ShoppingBag,
  Wrench,
  Recycle,
  FileText,
  LineChart,
  Warehouse,
  Settings,
  LogOut,
  Search,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Store,
  WifiOff,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = useAuth.getState().user;
    if (!user) throw redirect({ to: "/auth" });
    return { userId: user.id, username: user.username, role: user.role };
  },
  component: Shell,
});

const NAV: { group: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    group: "Operations",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/pos", label: "New Sale (POS)", icon: ScanBarcode },
      { to: "/invoices", label: "Invoices & Returns", icon: Receipt },
      { to: "/billing", label: "Billing Hub", icon: FileText },
    ],
  },
  {
    group: "Catalog & Vendors",
    items: [
      { to: "/inventory", label: "Inventory", icon: Package },
      { to: "/purchase", label: "Purchase & POs", icon: ShoppingBag },
      { to: "/godown", label: "Godown Transfers", icon: Warehouse },
      { to: "/customers", label: "Customers & Loyalty", icon: Users },
    ],
  },
  {
    group: "Services & Taxes",
    items: [
      { to: "/service", label: "Service Department", icon: Wrench },
      { to: "/scrap", label: "Scrap Buying", icon: Recycle },
      { to: "/gst", label: "GST Center", icon: FileText },
      { to: "/reports", label: "Reports & Analytics", icon: LineChart },
      { to: "/settings", label: "Settings & Backups", icon: Settings },
    ],
  },
];

function Shell() {
  const collapsed = useCart((s) => s.sidebarCollapsed);
  const toggle = useCart((s) => s.toggleSidebar);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleSignOut() {
    logout();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside
        className={`${collapsed ? "w-14" : "w-60"} shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col transition-all`}
      >
        <div className="h-14 flex items-center gap-2 px-3 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/30 grid place-items-center shrink-0">
            <Store className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">Ponmani Agencies</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <WifiOff className="h-2.5 w-2.5 text-emerald-400" /> Offline ERP
              </div>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((g) => (
            <div key={g.group} className="mb-4">
              {!collapsed && (
                <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {g.group}
                </div>
              )}
              <ul>
                {g.items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  const Icon = item.icon;
                  const inner = (
                    <>
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                      {!collapsed && <span className="truncate font-medium">{item.label}</span>}
                    </>
                  );
                  const cls = `mx-2 my-0.5 flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] group transition ${
                    active
                      ? "bg-primary/15 text-primary border border-primary/30 font-semibold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent"
                  }`;
                  return (
                    <li key={item.to}>
                      <Link to={item.to as any} className={cls}>
                        {inner}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="mx-2 mb-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <div className="truncate">Local DB Active (100% Offline)</div>
          </div>
        )}

        <button
          onClick={toggle}
          className="h-10 mx-2 mb-2 rounded-md text-xs text-muted-foreground hover:bg-sidebar-accent flex items-center justify-center gap-2"
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" /> Collapse Sidebar
            </>
          )}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card/40 backdrop-blur flex items-center gap-3 px-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="global-search"
              placeholder="Search products or scan barcode… (press /)"
              className="w-full h-9 pl-9 pr-14 rounded-md bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate({ to: "/pos" });
                }
              }}
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground font-mono">
              /
            </kbd>
          </div>

          <Link
            to="/pos"
            className="h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 hover:accent-glow transition"
          >
            <Plus className="h-4 w-4" /> New Sale (POS)
          </Link>

          <div className="h-9 pl-3 pr-2 rounded-md border border-border flex items-center gap-2 text-xs bg-card">
            <div className="h-6 w-6 rounded-full bg-primary/20 border border-primary/40 grid place-items-center text-[10px] font-bold font-mono text-primary">
              {user?.username?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground leading-none">{user?.username ?? "admin"}</span>
              <span className="text-[9px] text-muted-foreground uppercase leading-tight">{user?.role ?? "Admin"}</span>
            </div>
            <button onClick={handleSignOut} title="Lock / Lock Terminal" className="text-muted-foreground hover:text-destructive p-1 transition ml-1">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}