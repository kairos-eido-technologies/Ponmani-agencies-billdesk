import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-store";
import { db, User } from "@/lib/db/db";
import { toast } from "sonner";
import { ShieldCheck, KeyRound, User as UserIcon, Lock, Search, ChevronRight } from "lucide-react";
import { PonmaniLogo } from "@/components/PonmaniLogo";
import { useT, useLang } from "@/lib/lang/lang-context";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const loginWithPin = useAuth((s) => s.loginWithPin);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useT();
  const { lang, setLang } = useLang();

  useEffect(() => {
    // Load registered users from local DB
    const users = db.getUsers();
    if (users && users.length > 0) {
      setAllUsers(users);
    }
  }, []);

  // Filter users matching search query
  const matchingUsers = allUsers.filter((u) =>
    u.username.toLowerCase().includes(username.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectUser(u: User) {
    setUsername(u.username);
    setShowSuggestions(false);
    pinInputRef.current?.focus();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      toast.error(t("auth.username") + " is required");
      return;
    }
    if (!pin) {
      toast.error(t("auth.enterPin"));
      return;
    }
    
    const loggedUser = loginWithPin(cleanUser, pin);
    if (loggedUser) {
      toast.success(`${t("auth.loggedIn")} ${loggedUser.username.toUpperCase()} (${loggedUser.role})`);
      if (loggedUser.role?.toLowerCase() === "cashier") {
        navigate({ to: "/pos", replace: true });
      } else {
        navigate({ to: "/apps", replace: true });
      }
    } else {
      toast.error(t("auth.invalidPin"));
      setPin("");
    }
  }

  function handleKeyPad(num: string) {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm card-surface p-6 space-y-4 shadow-2xl">
        <div className="flex flex-col items-center text-center pb-3 border-b border-border">
          <div className="bg-white p-3 rounded-2xl shadow-lg border border-border mb-3">
            <PonmaniLogo variant="color" className="h-16 w-auto" />
          </div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SINCE 1998 • Retail &amp; Service Console
          </div>
          {/* Language toggle on auth page */}
          <button
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="mt-2.5 h-7 px-3 rounded-full border border-border bg-secondary hover:bg-muted text-xs font-bold transition text-foreground"
          >
            {lang === "en" ? "தமிழில் காட்டு" : "Show in English"}
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-base font-bold mb-0.5 flex items-center justify-center gap-2 text-foreground">
            <KeyRound className="h-4 w-4 text-primary" /> {t("auth.title")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("auth.desc")}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          {/* Username Input Field with Live Search Autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <label className="text-xs text-muted-foreground font-semibold mb-1 flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5 text-primary" /> {t("auth.username")}
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                required
                value={username}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder={t("auth.usernamePlaceholder")}
                className="w-full h-11 pl-9 pr-3 rounded-lg bg-input border border-border text-foreground font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition"
              />
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Live Search Suggestions Dropdown */}
            {showSuggestions && matchingUsers.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-card border border-border rounded-lg shadow-xl overflow-hidden divide-y divide-border animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground uppercase bg-secondary/50 flex justify-between">
                  <span>Matching Staff ({matchingUsers.length})</span>
                  <span>Click to select</span>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {matchingUsers.map((u) => {
                    const isCashier = u.role?.toLowerCase() === "cashier";
                    return (
                      <button
                        key={u.id || u.username}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className="w-full px-3 py-2 text-left hover:bg-secondary/70 flex items-center justify-between group transition text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded bg-secondary group-hover:bg-primary/20 text-primary grid place-items-center font-bold text-[10px]">
                            {u.username[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-foreground capitalize group-hover:text-primary transition">
                              {u.username}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                            isCashier
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                          }`}>
                            {u.role}
                          </span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* PIN Input Field */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" /> {t("auth.enterPin")}
              </label>
              <span className="text-[10px] font-mono text-muted-foreground">
                {pin.length}/6 digits
              </span>
            </div>
            <input
              ref={pinInputRef}
              type="password"
              required
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full h-11 text-center text-xl tracking-[0.4em] font-mono rounded-lg bg-input border border-border focus:border-primary text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
          </div>

          {/* On-Screen PIN Pad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPad(num)}
                className="h-10 rounded-lg bg-secondary hover:bg-muted text-foreground font-mono text-base font-bold border border-border active:scale-95 transition shadow-xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin("")}
              className="h-10 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 text-xs font-semibold border border-destructive/30 active:scale-95 transition"
            >
              {t("auth.clear")}
            </button>
            <button
              type="button"
              onClick={() => handleKeyPad("0")}
              className="h-10 rounded-lg bg-secondary hover:bg-muted text-foreground font-mono text-base font-bold border border-border active:scale-95 transition shadow-xs"
            >
              0
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:accent-glow active:scale-95 transition shadow-md shadow-primary/20"
            >
              {t("auth.enter")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}