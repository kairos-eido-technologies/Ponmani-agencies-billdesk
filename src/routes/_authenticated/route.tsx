import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { db } from "@/lib/db/db";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  Search,
  Plus,
  Store,
  Grid2X2,
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

function Shell() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const queryClient = useQueryClient();

  // Poll local SQLite database server for changes every 3 seconds
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      if (!db.isLoaded) return;
      const oldStoreStr = JSON.stringify(db.getStore());
      await db.pullServerUpdates();
      const newStoreStr = JSON.stringify(db.getStore());

      if (active && oldStoreStr !== newStoreStr) {
        queryClient.invalidateQueries();
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [queryClient]);

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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* TOP HEADER / APP BAR */}
      <header className="h-14 border-b border-border bg-card/60 backdrop-blur flex items-center justify-between gap-3 px-4 shrink-0 sticky top-0 z-30 shadow-xs">
        {/* Left: Brand & Home/Apps Button */}
        <div className="flex items-center gap-3">
          <Link to="/apps" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-white/90 border border-primary/30 p-1 grid place-items-center group-hover:bg-white transition shadow-xs overflow-hidden shrink-0">
              <img src="/ponmani-logo-icon.png" alt="Ponmani Logo" className="h-full w-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-black text-foreground group-hover:text-primary transition tracking-tight">
                PONMANI AGENCIES
              </div>
              <div className="text-[9px] text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" /> SINCE 1998
              </div>
            </div>
          </Link>

          <div className="h-4 w-[1px] bg-border mx-0.5 hidden sm:block" />

          {/* All Apps Launcher Button */}
          <Link
            to="/apps"
            className="h-8 px-3 rounded-lg bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            title="Return to Apps Launcher"
          >
            <Grid2X2 className="h-3.5 w-3.5" />
            <span>Apps</span>
          </Link>
        </div>

        {/* Center: Search */}
        <div className="relative flex-1 max-w-md mx-2">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="global-search"
            placeholder="Search products or scan barcode… (press /)"
            className="w-full h-8 pl-9 pr-8 rounded-lg bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate({ to: "/pos" });
              }
            }}
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground font-mono">
            /
          </kbd>
        </div>

        {/* Right: Quick POS + User Profile & Sign Out */}
        <div className="flex items-center gap-2">
          <Link
            to="/pos"
            className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:accent-glow transition shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">New Sale</span>
          </Link>

          <div className="h-8 pl-2.5 pr-2 rounded-lg border border-border flex items-center gap-2 text-xs bg-card">
            <div className="h-5 w-5 rounded-full bg-primary/20 border border-primary/40 grid place-items-center text-[9px] font-bold font-mono text-primary">
              {user?.username?.[0]?.toUpperCase() ?? "A"}
            </div>
            <span className="font-semibold text-foreground hidden sm:inline text-xs">
              {user?.username ?? "admin"}
            </span>
            <button
              onClick={handleSignOut}
              title="Lock / Sign Out"
              className="text-muted-foreground hover:text-destructive p-1 transition ml-0.5"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}