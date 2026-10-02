import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, ScrapEntry } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr } from "@/lib/format";
import { Plus, Recycle, FileSpreadsheet, X, Scale } from "lucide-react";
import { useT } from "@/lib/lang/lang-context";

export const Route = createFileRoute("/_authenticated/scrap")({ component: ScrapPage });

function ScrapPage() {
  const t = useT();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const scrapEntries = useQuery({
    queryKey: ["local-scrap-entries"],
    staleTime: 60_000,
    queryFn: async () => db.getScrapEntries(),
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const allScrap = scrapEntries.data || [];
  const totalScrapCount = allScrap.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalScrapCount / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const displayedScrap = pageSize === -1 ? allScrap : allScrap.slice((activePage - 1) * pageSize, activePage * pageSize);

  const totalWeight = allScrap.reduce((s, e) => s + Number(e.weight_kg), 0);
  const totalPayout = allScrap.reduce((s, e) => s + Number(e.total_payout), 0);

  function exportScrapExcel() {
    const data = allScrap.map((s) => ({
      'Seller Name': s.customer_name,
      'Seller Mobile': s.customer_mobile,
      'Scrap Item Type': s.item_type,
      'Weight (Kg)': s.weight_kg,
      'Rate per Kg (₹)': s.price_per_kg,
      'Total Payout (₹)': s.total_payout,
      'Notes': s.notes,
      'Date': s.created_at.split('T')[0],
    }));
    ExcelEngine.exportToExcel(data, `Ponmani_Scrap_Buying_${new Date().toISOString().split('T')[0]}`);
    toast.success("Scrap buying log exported to Excel");
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={t("scrap.title")}
        subtitle={t("scrap.subtitle")}
        action={
          <div className="flex gap-2">
            <button
              onClick={exportScrapExcel}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> {t("scrap.exportExcel")}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
            >
              <Plus className="h-4 w-4" /> {t("scrap.newEntry")}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs text-muted-foreground mb-1">{t("scrap.col.weight")}</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{totalWeight.toFixed(2)} Kg</div>
        </div>
        <div className="card-surface p-4 border-l-4 border-l-primary">
          <div className="text-xs text-muted-foreground mb-1">{t("scrap.col.payout")}</div>
          <div className="text-2xl font-bold font-mono text-primary">{inr(totalPayout)}</div>
        </div>
        <div className="card-surface p-4 border-l-4 border-l-blue-500">
          <div className="text-xs text-muted-foreground mb-1">{t("dashboard.scrapPayout")}</div>
          <div className="text-2xl font-bold font-mono text-blue-400">{totalScrapCount}</div>
        </div>
      </div>

      <div className="card-surface overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase text-muted-foreground tracking-wider bg-card border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5">{t("scrap.col.date")}</th>
              <th className="text-left px-4 py-2.5">{t("scrap.col.customer")}</th>
              <th className="text-left px-4 py-2.5">{t("scrap.col.category")}</th>
              <th className="text-left px-4 py-2.5">{t("scrap.col.notes")}</th>
              <th className="text-right px-4 py-2.5">{t("scrap.col.weight")}</th>
              <th className="text-right px-4 py-2.5">{t("scrap.col.rate")}</th>
              <th className="text-right px-4 py-2.5">{t("scrap.col.payout")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayedScrap.map((s) => {
              const isEx = s.is_exchange || s.notes?.includes("From POS Bill") || s.notes?.includes("Auto-logged");
              return (
                <tr key={s.id} className="hover:bg-secondary/40 transition">
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <div className="font-semibold text-foreground">{s.customer_name}</div>
                    <div className="font-mono text-muted-foreground">{s.customer_mobile || "Walk-in Seller"}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
                      {isEx ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          🔄 POS Exchange
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          📦 Scrap Purchase
                        </span>
                      )}
                      <span className="text-foreground font-semibold">{s.item_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                    {s.notes || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">
                    {s.weight_kg} kg
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                    {inr(s.price_per_kg)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">
                    {inr(s.total_payout)}
                  </td>
                </tr>
              );
            })}
            {allScrap.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                  No scrap buying or exchange records logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {totalScrapCount > 0 && (
          <div className="p-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-muted-foreground">
              Showing{" "}
              <span className="font-mono font-bold text-foreground">
                {pageSize === -1 ? 1 : Math.min((activePage - 1) * pageSize + 1, totalScrapCount)}
              </span>{" "}
              to{" "}
              <span className="font-mono font-bold text-foreground">
                {pageSize === -1 ? totalScrapCount : Math.min(activePage * pageSize, totalScrapCount)}
              </span>{" "}
              of <span className="font-mono font-bold text-foreground">{totalScrapCount}</span> scrap entries
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-secondary border border-border rounded text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={-1}>All ({totalScrapCount})</option>
                </select>
              </div>
              {pageSize !== -1 && (
                <div className="flex items-center gap-1 font-mono">
                  <button
                    disabled={activePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-secondary border border-border rounded disabled:opacity-40 hover:bg-muted font-bold transition"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-bold text-primary">
                    {activePage} / {totalPages}
                  </span>
                  <button
                    disabled={activePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 bg-secondary border border-border rounded disabled:opacity-40 hover:bg-muted font-bold transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <ScrapEntryModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["local-scrap-entries"] });
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

const L = ({ label, children }: any) => (
  <label className="block">
    <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{label}</div>
    {children}
  </label>
);

function ScrapEntryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    customer_name: "",
    customer_mobile: "",
    item_type: "Copper Wire Scrap",
    weight_kg: 5,
    price_per_kg: 580,
    notes: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.item_type.trim() || f.weight_kg <= 0 || f.price_per_kg <= 0) {
      toast.error("Valid scrap type, weight, and rate required");
      return;
    }
    db.saveScrapEntry(f);
    toast.success("Scrap purchase recorded & payout calculated!");
    onSaved();
  }

  const calculatedPayout = f.weight_kg * f.price_per_kg;

  const ic = "w-full h-9 rounded bg-input border border-border px-3 text-xs focus:outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md card-surface p-5 border-l-4 border-l-emerald-500">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground flex items-center gap-2">
            <Recycle className="h-5 w-5 text-emerald-400" /> Record Scrap Purchase
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <L label="Scrap Category / Item *">
            <select
              value={f.item_type}
              onChange={(e) => setF({ ...f, item_type: e.target.value })}
              className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-semibold"
            >
              <option value="Copper Wire Scrap">Copper Winding Wire Scrap</option>
              <option value="Brass / Plumbing Fittings">Brass / Plumbing Fittings</option>
              <option value="Aluminum Wire / Frames">Aluminum Wire / Cable Scrap</option>
              <option value="Iron / Heavy Steel">Iron / Heavy Machinery Steel</option>
              <option value="Old Motor / Pump Core">Old Motor / Pump Core Dismantled</option>
              <option value="E-Waste Circuit Boards">E-Waste & Old Inverter Batteries</option>
            </select>
          </L>

          <div className="grid grid-cols-2 gap-2">
            <L label="Weight (Kg) *">
              <input
                type="number"
                step="0.1"
                min={0.1}
                value={f.weight_kg}
                onChange={(e) => setF({ ...f, weight_kg: parseFloat(e.target.value) || 0 })}
                className={`${ic} font-mono font-bold text-center`}
              />
            </L>
            <L label="Rate per Kg (₹) *">
              <input
                type="number"
                min={1}
                value={f.price_per_kg}
                onChange={(e) => setF({ ...f, price_per_kg: parseFloat(e.target.value) || 0 })}
                className={`${ic} font-mono font-bold text-right`}
              />
            </L>
          </div>

          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded flex justify-between items-center">
            <span className="text-xs uppercase font-bold text-emerald-400">Total Seller Payout</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{inr(calculatedPayout)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <L label="Seller Name">
              <input value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} placeholder="Walk-in Seller" className={ic} />
            </L>
            <L label="Seller Phone">
              <input value={f.customer_mobile} onChange={(e) => setF({ ...f, customer_mobile: e.target.value })} placeholder="Mobile" className={`${ic} font-mono`} />
            </L>
          </div>

          <L label="Notes / Identity Proof">
            <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Aadhaar / Vehicle No..." className={ic} />
          </L>

          <button type="submit" className="w-full h-10 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">
            Confirm Payout & Record Scrap
          </button>
        </form>
      </div>
    </div>
  );
}
