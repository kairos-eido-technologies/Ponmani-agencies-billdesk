import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { db } from "@/lib/db/db";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  Search,
  Plus,
  Grid2X2,
  ShieldCheck,
  Languages,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import { useLang, useT } from "@/lib/lang/lang-context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = useAuth.getState().user;
    if (!user) throw redirect({ to: "/auth" });
    if (
      user.role?.toLowerCase() === "cashier" &&
      !location.pathname.startsWith("/pos") &&
      !location.pathname.startsWith("/service")
    ) {
      throw redirect({ to: "/pos" });
    }
    return { userId: user.id, username: user.username, role: user.role };
  },
  component: Shell,
});

function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const queryClient = useQueryClient();
  const { lang, setLang } = useLang();
  const t = useT();

  const isCashier = user?.role?.toLowerCase() === "cashier";

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
      <header className="h-14 border-b border-border bg-card/60 backdrop-blur flex items-center justify-between gap-3 px-4 shrink-0 sticky top-0 z-30 shadow-xs print:hidden">
        {/* Left: Brand & Home/Apps Button */}
        <div className="flex items-center gap-3">
          <Link to={isCashier ? "/pos" : "/apps"} className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-white/90 border border-primary/30 p-1 grid place-items-center group-hover:bg-white transition shadow-xs overflow-hidden shrink-0">
              <img src="/ponmani-logo-icon.png" alt="Ponmani Logo" className="h-full w-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-black text-foreground group-hover:text-primary transition tracking-tight">
                {db.getSettings()?.shop_name || t("header.brand")}
              </div>
              <div className="text-[9px] text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" /> {t("header.since")}
              </div>
            </div>
          </Link>

          {isCashier ? (
            <div className="flex items-center gap-1.5 ml-1 sm:ml-2">
              <Link
                to="/pos"
                className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs ${
                  location.pathname.startsWith("/pos")
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary border border-border text-foreground hover:bg-muted"
                }`}
                title="POS Billing"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>{t("nav.pos", "POS Billing")}</span>
              </Link>
              <Link
                to="/service"
                className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs ${
                  location.pathname.startsWith("/service")
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary border border-border text-foreground hover:bg-muted"
                }`}
                title="Service Desk"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>{t("nav.service", "Service Desk")}</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="h-4 w-[1px] bg-border mx-0.5 hidden sm:block" />

              {/* All Apps Launcher Button (Admins only) */}
              <Link
                to="/apps"
                className="h-8 px-3 rounded-lg bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                title="Return to Apps Launcher"
              >
                <Grid2X2 className="h-3.5 w-3.5" />
                <span>{t("header.apps")}</span>
              </Link>
            </>
          )}
        </div>

        {/* Center: Search */}
        <div className="relative flex-1 max-w-md mx-2">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="global-search"
            placeholder={t("header.searchPlaceholder")}
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

        {/* Right: Language Toggle + Quick POS + User Profile & Sign Out */}
        <div className="flex items-center gap-2">
          {/* Language Toggle Pill */}
          <button
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            title={lang === "en" ? "Switch to Tamil / தமிழுக்கு மாற்று" : "Switch to English"}
            className="h-8 px-2.5 rounded-lg border border-border bg-secondary hover:bg-muted text-xs font-bold flex items-center gap-1.5 transition text-foreground"
          >
            <Languages className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="hidden sm:inline font-mono">
              {lang === "en" ? "TA" : "EN"}
            </span>
          </button>

          <Link
            to="/pos"
            className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:accent-glow transition shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("header.newSale")}</span>
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
              title={t("header.signOut")}
              className="text-muted-foreground hover:text-destructive p-1 transition ml-0.5"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-auto bg-background print:overflow-visible print:h-auto">
        <Outlet />
      </main>
    </div>
  );
}
