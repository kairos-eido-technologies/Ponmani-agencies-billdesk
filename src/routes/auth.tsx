import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";
import { Store, ShieldCheck, KeyRound } from "lucide-react";
import { PonmaniLogo } from "@/components/PonmaniLogo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const loginWithPin = useAuth((s) => s.loginWithPin);
  const [username, setUsername] = useState("admin");
  const [pin, setPin] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const success = loginWithPin(username, pin);
    if (success) {
      toast.success(`Logged in as ${username.toUpperCase()}`);
      navigate({ to: "/apps", replace: true });
    } else {
      toast.error("Invalid Username or PIN. Default Admin PIN is 1234");
    }
  }

  function handleKeyPad(num: string) {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md card-surface p-6">
        <div className="flex flex-col items-center text-center mb-6 pb-4 border-b border-border">
          <div className="bg-white p-3 rounded-2xl shadow-lg border border-border mb-3">
            <PonmaniLogo variant="color" className="h-20 w-auto" />
          </div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SINCE 1998 • Retail & Service Console
          </div>
        </div>

        <h1 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> Staff PIN Authentication
        </h1>
        <p className="text-xs text-muted-foreground mb-5">
          Select role and enter your security PIN to access POS & Terminal.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Select Staff Account</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setUsername("admin"); setPin(""); }}
                className={`h-10 rounded-md text-xs font-semibold border transition ${
                  username === "admin"
                    ? "bg-primary/20 text-primary border-primary"
                    : "bg-input border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Admin (PIN: 1234)
              </button>
              <button
                type="button"
                onClick={() => { setUsername("cashier"); setPin(""); }}
                className={`h-10 rounded-md text-xs font-semibold border transition ${
                  username === "cashier"
                    ? "bg-primary/20 text-primary border-primary"
                    : "bg-input border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Cashier (PIN: 0000)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Enter PIN</label>
            <input
              type="password"
              value={pin}
              readOnly
              placeholder="••••"
              className="w-full h-12 text-center text-2xl tracking-[0.5em] font-mono rounded-md bg-input border border-border text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Quick On-Screen PIN Pad */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPad(num)}
                className="h-11 rounded-md bg-secondary hover:bg-muted text-foreground font-mono text-lg font-bold border border-border active:scale-95 transition"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin("")}
              className="h-11 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 text-xs font-semibold border border-destructive/30 active:scale-95 transition"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => handleKeyPad("0")}
              className="h-11 rounded-md bg-secondary hover:bg-muted text-foreground font-mono text-lg font-bold border border-border active:scale-95 transition"
            >
              0
            </button>
            <button
              type="submit"
              className="h-11 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:accent-glow active:scale-95 transition"
            >
              ENTER
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}