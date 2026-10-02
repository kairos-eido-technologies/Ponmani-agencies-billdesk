import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { qty } from "@/lib/format";
import { Warehouse, ArrowLeftRight, FileSpreadsheet, Plus, X, ArrowRight, Search } from "lucide-react";
import { useT } from "@/lib/lang/lang-context";

export const Route = createFileRoute("/_authenticated/godown")({ component: GodownPage });

function GodownPage() {
  const t = useT();
  const qc = useQueryClient();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "GODOWN_ONLY" | "LOW_STOCK">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMode]);

  const inventory = useQuery({
    queryKey: ["local-godown-inventory"],
    staleTime: 60_000,
    queryFn: async () => db.getInventory(),
  });

  const transfers = useQuery({
    queryKey: ["local-godown-transfers"],
    staleTime: 60_000,
    queryFn: async () => db.getGodownTransfers(),
  });

  const allItems = inventory.data || [];

  const filteredItems = allItems.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.sku_code && p.sku_code.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filterMode === "GODOWN_ONLY") return p.godown_qty > 0;
    if (filterMode === "LOW_STOCK") return p.stock_qty <= p.moq || p.godown_qty <= p.moq;
    return true;
  });

  const totalItemsCount = filteredItems.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalItemsCount / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const displayedItems = pageSize === -1 ? filteredItems : filteredItems.slice((activePage - 1) * pageSize, activePage * pageSize);

  function exportGodownExcel() {
    const data = allItems.map((p) => ({
      Barcode: p.barcode,
      'Product Name': p.name,
      Category: p.category,
      'Shop Floor Stock': p.stock_qty,
      'Main Godown Stock': p.godown_qty,
      'Total Inventory': p.stock_qty + p.godown_qty,
      'MOQ Alert': p.moq,
    }));
    ExcelEngine.exportToExcel(data, `Ponmani_Godown_Stock_${new Date().toISOString().split('T')[0]}`);
    toast.success("Godown stock report exported to Excel");
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={t("godown.title")}
        subtitle={t("godown.subtitle")}
        action={
          <div className="flex gap-2">
            <button
              onClick={exportGodownExcel}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-400" /> {t("godown.exportExcel")}
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
            >
              <ArrowLeftRight className="h-4 w-4" /> {t("godown.transferToShop")}
            </button>
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface p-4 border-l-4 border-l-primary">
          <div className="text-xs text-muted-foreground mb-1">{t("godown.kpi.inShop")}</div>
          <div className="text-2xl font-bold font-mono text-primary">
            {qty(allItems.reduce((s, p) => s + p.stock_qty, 0))} Units
          </div>
        </div>
        <div className="card-surface p-4 border-l-4 border-l-blue-500">
          <div className="text-xs text-muted-foreground mb-1">{t("godown.kpi.inGodown")}</div>
          <div className="text-2xl font-bold font-mono text-blue-400">
            {qty(allItems.reduce((s, p) => s + p.godown_qty, 0))} Units
          </div>
        </div>
        <div className="card-surface p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs text-muted-foreground mb-1">{t("godown.kpi.totalItems")}</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {qty(allItems.reduce((s, p) => s + p.stock_qty + p.godown_qty, 0))} Units
          </div>
        </div>
      </div>

      {/* Stock Grid Table */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <div className="card-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
            <div className="text-sm font-bold text-foreground">
              {t("godown.title")} ({filteredItems.length})
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <button
                onClick={() => setFilterMode("ALL")}
                className={`px-2 py-1 rounded transition ${filterMode === "ALL" ? "bg-primary text-primary-foreground font-bold" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {t("inventory.filter.all")}
              </button>
              <button
                onClick={() => setFilterMode("GODOWN_ONLY")}
                className={`px-2 py-1 rounded transition ${filterMode === "GODOWN_ONLY" ? "bg-blue-500 text-white font-bold" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {t("inventory.filter.inGodown")}
              </button>
              <button
                onClick={() => setFilterMode("LOW_STOCK")}
                className={`px-2 py-1 rounded transition ${filterMode === "LOW_STOCK" ? "bg-amber-500 text-black font-bold" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {t("inventory.filter.low")}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("godown.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-input border border-border rounded text-xs focus:outline-none focus:border-primary font-medium"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-muted-foreground bg-card border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2">{t("godown.col.product")}</th>
                  <th className="text-right px-3 py-2">{t("godown.col.shopQty")}</th>
                  <th className="text-right px-3 py-2">{t("godown.col.godownQty")}</th>
                  <th className="text-right px-3 py-2">{t("common.total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedItems.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/40 transition">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-foreground">{p.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground flex gap-2">
                        <span>{t("pos.barcode")}: {p.barcode}</span>
                        {p.category && <span className="text-primary/70">[{p.category}]</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-primary">{qty(p.stock_qty)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-blue-400">{qty(p.godown_qty)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                      {qty(p.stock_qty + p.godown_qty)}
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                      {t("godown.noResults")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* High Performance Pagination Controls */}
          {totalItemsCount > 0 && (
            <div className="p-3 border-t border-border bg-card/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-muted-foreground font-mono text-[11px]">
                Showing <span className="font-bold text-foreground">{(activePage - 1) * (pageSize === -1 ? totalItemsCount : pageSize) + 1}</span> to{" "}
                <span className="font-bold text-foreground">{Math.min(activePage * (pageSize === -1 ? totalItemsCount : pageSize), totalItemsCount)}</span> of{" "}
                <span className="font-bold text-foreground">{totalItemsCount}</span> items
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-[11px]">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 px-2 rounded bg-input border border-border text-xs font-mono font-semibold text-foreground cursor-pointer"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={-1}>All ({totalItemsCount})</option>
                  </select>
                </div>

                {pageSize !== -1 && totalPages > 1 && (
                  <div className="flex items-center gap-1 font-mono">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={activePage === 1}
                      className="h-8 px-2 rounded border border-border bg-secondary hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={activePage === 1}
                      className="h-8 px-2.5 rounded border border-border bg-secondary hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition"
                    >
                      ‹ Prev
                    </button>

                    <span className="px-2.5 py-1 text-xs font-bold text-primary bg-primary/10 rounded border border-primary/20">
                      {activePage} / {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={activePage >= totalPages}
                      className="h-8 px-2.5 rounded border border-border bg-secondary hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition"
                    >
                      Next ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={activePage >= totalPages}
                      className="h-8 px-2 rounded border border-border bg-secondary hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition"
                    >
                      »
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Transfer History Log */}
        <div className="card-surface p-4 space-y-3">
          <div className="text-sm font-bold text-foreground pb-2 border-b border-border">
            Stock Transfer History Log
          </div>
          <div className="space-y-2 max-h-[500px] overflow-auto pr-1">
            {transfers.data?.map((t) => (
              <div key={t.id} className="p-3 bg-card border border-border rounded text-xs space-y-1">
                <div className="flex justify-between items-center font-bold text-foreground">
                  <span>{t.product_name}</span>
                  <span className="font-mono text-primary">+{t.qty} Units</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    {t.transfer_type === "GODOWN_TO_SHOP" ? "Godown → Shop Floor" : "Shop Floor → Godown"}
                  </span>
                  <span>{new Date(t.created_at).toLocaleString()}</span>
                </div>
                {t.notes && <div className="text-[10px] text-muted-foreground italic">Note: {t.notes}</div>}
              </div>
            ))}
            {transfers.data?.length === 0 && (
              <div className="text-xs text-muted-foreground py-12 text-center">No transfers logged yet.</div>
            )}
          </div>
        </div>
      </div>

      {showTransferModal && (
        <TransferModal
          onClose={() => setShowTransferModal(false)}
          onTransferred={() => {
            qc.invalidateQueries({ queryKey: ["local-godown-inventory"] });
            qc.invalidateQueries({ queryKey: ["local-godown-transfers"] });
            setShowTransferModal(false);
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

function TransferModal({ onClose, onTransferred }: { onClose: () => void; onTransferred: () => void }) {
  const inventory = db.getInventory();
  const [modalSearch, setModalSearch] = useState("");
  const [productId, setProductId] = useState(inventory[0]?.id || "");
  const [transferType, setTransferType] = useState<"GODOWN_TO_SHOP" | "SHOP_TO_GODOWN">("GODOWN_TO_SHOP");
  const [qtyInput, setQtyInput] = useState(5);
  const [notes, setNotes] = useState("");

  const filteredModalProds = inventory.filter((p) => {
    if (!modalSearch.trim()) return true;
    const q = modalSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      (p.sku_code && p.sku_code.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const selectedProd = inventory.find((p) => p.id === productId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || qtyInput <= 0) {
      toast.error("Select product and valid quantity");
      return;
    }
    const res = db.createGodownTransfer({
      product_id: productId,
      transfer_type: transferType,
      qty: qtyInput,
      notes,
    });

    if (!res.success) {
      toast.error(res.message);
    } else {
      toast.success(res.message);
      onTransferred();
    }
  }

  const ic = "w-full h-9 rounded bg-input border border-border px-3 text-xs focus:outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md card-surface p-5 border-l-4 border-l-primary">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" /> Stock Transfer Wizard
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <L label="Search & Select Product *">
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter product by name or barcode..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 bg-input border border-border rounded text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-semibold"
                size={filteredModalProds.length > 5 ? 4 : undefined}
              >
                {filteredModalProds.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Shop: {p.stock_qty} | Godown: {p.godown_qty})
                  </option>
                ))}
                {filteredModalProds.length === 0 && (
                  <option disabled>No products matching search</option>
                )}
              </select>
            </div>
          </L>

          <L label="Transfer Direction *">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransferType("GODOWN_TO_SHOP")}
                className={`h-9 rounded text-xs font-bold border transition ${
                  transferType === "GODOWN_TO_SHOP"
                    ? "bg-primary/20 text-primary border-primary"
                    : "bg-input border-border text-muted-foreground"
                }`}
              >
                Godown → Shop Floor
              </button>
              <button
                type="button"
                onClick={() => setTransferType("SHOP_TO_GODOWN")}
                className={`h-9 rounded text-xs font-bold border transition ${
                  transferType === "SHOP_TO_GODOWN"
                    ? "bg-primary/20 text-primary border-primary"
                    : "bg-input border-border text-muted-foreground"
                }`}
              >
                Shop Floor → Godown
              </button>
            </div>
          </L>

          <L label="Transfer Quantity *">
            <input
              type="number"
              min={1}
              value={qtyInput}
              onChange={(e) => setQtyInput(parseInt(e.target.value) || 1)}
              className={`${ic} font-mono font-bold text-center text-sm`}
            />
          </L>

          {selectedProd && (
            <div className="p-3 bg-secondary rounded border border-border text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Current Shop Stock:</span>
                <span className="font-mono font-bold text-foreground">{selectedProd.stock_qty}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Current Godown Reserve:</span>
                <span className="font-mono font-bold text-foreground">{selectedProd.godown_qty}</span>
              </div>
            </div>
          )}

          <L label="Transfer Reason / Notes">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Refilling shop display..." className={ic} />
          </L>

          <button type="submit" className="w-full h-10 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:accent-glow transition">
            Execute Stock Transfer
          </button>
        </form>
      </div>
    </div>
  );
}
