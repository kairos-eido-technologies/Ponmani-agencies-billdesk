import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, InventoryItem } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr, qty } from "@/lib/format";
import { Plus, X, Pencil, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Printer, Image, RefreshCw, Barcode, TrendingUp, TrendingDown, DollarSign, Store, Warehouse, Scale, Trash2, Calculator, Tag, Scissors } from "lucide-react";
import { useT } from "@/lib/lang/lang-context";
import { printIsolatedLabels } from "@/lib/print-isolated-receipt";

export const Route = createFileRoute("/_authenticated/inventory")({ component: InventoryPage });

const UNIT_OPTIONS = [
  "Piece (Pcs)",
  "Kilogram (Kg)",
  "Gram (g)",
  "Litre (Ltr)",
  "Millilitre (ml)",
  "Meter (Mtr)",
  "Box",
  "Set",
  "Bundle",
  "Packet",
  "Ton",
];

function InventoryPage() {
  const t = useT();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [locationFilter, setLocationFilter] = useState<"ALL" | "SHOP" | "GODOWN" | "LOW_STOCK">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [edit, setEdit] = useState<InventoryItem | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [printLabelProduct, setPrintLabelProduct] = useState<InventoryItem | null>(null);
  const [pnlDetailProduct, setPnlDetailProduct] = useState<InventoryItem | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, locationFilter]);

  const products = useQuery({
    queryKey: ["local-inventory-products", q, locationFilter],
    staleTime: 60_000,
    queryFn: async () => {
      const all = db.getInventory();
      return all.filter((p) => {
        if (q.trim()) {
          const clean = q.toLowerCase();
          const match =
            p.name.toLowerCase().includes(clean) ||
            p.barcode.toLowerCase().includes(clean) ||
            (p.sku_code && p.sku_code.toLowerCase().includes(clean)) ||
            p.category.toLowerCase().includes(clean);
          if (!match) return false;
        }

        if (locationFilter === "SHOP") return (p.stock_qty || 0) > 0;
        if (locationFilter === "GODOWN") return (p.godown_qty || 0) > 0;
        if (locationFilter === "LOW_STOCK") return (p.stock_qty || 0) <= (p.moq || 5) || (p.godown_qty || 0) <= (p.moq || 5);

        return true;
      });
    },
  });

  const invoicesData = useQuery({
    queryKey: ["local-invoices-for-pnl"],
    staleTime: 60_000,
    queryFn: async () => db.getInvoices(),
  });

  // Pre-calculate sales metrics for all products in O(M) time once per invoice query update
  const productSalesMap = useMemo(() => {
    const map = new Map<string, { unitsSold: number; totalRevenue: number }>();
    if (!invoicesData.data) return map;
    for (const inv of invoicesData.data) {
      if (!inv.items) continue;
      for (const it of inv.items) {
        if (!it.product_id) continue;
        const existing = map.get(it.product_id) || { unitsSold: 0, totalRevenue: 0 };
        existing.unitsSold += Number(it.qty || 0);
        existing.totalRevenue += Number(it.total_price || 0);
        map.set(it.product_id, existing);
      }
    }
    return map;
  }, [invoicesData.data]);

  const allProds = products.data || [];
  const totalProductsCount = allProds.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalProductsCount / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const displayedProducts = pageSize === -1 ? allProds : allProds.slice((activePage - 1) * pageSize, activePage * pageSize);

  // Calculate Overall Inventory Metrics
  let totalShopAsset = 0;
  let totalGodownAsset = 0;
  let totalPotentialProfit = 0;

  allProds.forEach((p) => {
    const cp = Number(p.cost_price || 0);
    const sp = Number(p.selling_price || 0);
    const shopQty = Number(p.stock_qty || 0);
    const godownQty = Number(p.godown_qty || 0);

    totalShopAsset += shopQty * cp;
    totalGodownAsset += godownQty * cp;
    totalPotentialProfit += (shopQty + godownQty) * (sp - cp);
  });

  function handleDeleteProduct(p: InventoryItem) {
    if (window.confirm(`Are you sure you want to delete product "${p.name}"?`)) {
      db.deleteInventoryItem(p.id);
      qc.invalidateQueries({ queryKey: ["local-inventory-products"] });
      toast.success(`Deleted "${p.name}" from inventory catalog.`);
    }
  }

  function exportCatalog() {
    const data = (products.data || []).map((p) => {
      const unitPnl = p.selling_price - p.cost_price;
      const margin = p.selling_price > 0 ? (unitPnl / p.selling_price) * 100 : 0;
      const totalStock = (p.stock_qty || 0) + (p.godown_qty || 0);
      const totalCost = totalStock * p.cost_price;
      const totalSellingVal = totalStock * p.selling_price;
      const totalProfitVal = totalSellingVal - totalCost;

      return {
        Barcode: p.barcode,
        Name: p.name,
        Category: p.category,
        Unit: p.unit || 'Piece (Pcs)',
        'Cost Price (₹)': p.cost_price,
        'MRP (₹)': p.mrp || p.selling_price,
        'Selling Price (₹)': p.selling_price,
        'Unit Profit/Loss (₹)': unitPnl,
        'Margin (%)': Math.round(margin),
        'Shop Stock': p.stock_qty,
        'Godown Stock': p.godown_qty,
        'Total Stock': totalStock,
        'Total Stock Cost (₹)': totalCost,
        'Total Stock Selling Value (₹)': totalSellingVal,
        'Total Stock Potential Profit (₹)': totalProfitVal,
        'MOQ Alert': p.moq,
        'Min Stock Alert': p.min_stock_alert,
        'SKU Code': p.sku_code || p.barcode,
        'GST Rate (%)': p.gst_rate,
      };
    });
    ExcelEngine.exportToExcel(data, `Ponmani_Inventory_Catalog_PNL_${new Date().toISOString().split('T')[0]}`);
    toast.success("Inventory catalog exported to Excel");
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={t("inventory.title")}
        subtitle={`${products.data?.length ?? 0} ${t("inventory.subtitle")}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => ExcelEngine.downloadTemplate('products')}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition text-foreground"
            >
              <Download className="h-3.5 w-3.5" /> {t("inventory.template")}
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition text-emerald-400"
            >
              <Upload className="h-3.5 w-3.5" /> {t("inventory.importExcel")}
            </button>
            <button
              onClick={exportCatalog}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition text-foreground"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-400" /> {t("inventory.exportExcel")}
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
            >
              <Plus className="h-4 w-4" /> {t("inventory.addProduct")}
            </button>
          </div>
        }
      />

      {/* KPI Overview Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-surface p-3 border-l-4 border-l-primary flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <Store className="h-3.5 w-3.5 text-primary" /> {t("inventory.kpi.shopValuation")}
            </div>
            <div className="text-base font-bold font-mono text-foreground mt-0.5">{inr(totalShopAsset)}</div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">{t("inventory.kpi.billable")}</div>
        </div>

        <div className="card-surface p-3 border-l-4 border-l-blue-500 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <Warehouse className="h-3.5 w-3.5 text-blue-400" /> {t("inventory.kpi.godownValuation")}
            </div>
            <div className="text-base font-bold font-mono text-foreground mt-0.5">{inr(totalGodownAsset)}</div>
          </div>
          <div className="text-[10px] font-mono text-amber-400 font-semibold">{t("inventory.kpi.reqTransfer")}</div>
        </div>

        <div className="card-surface p-3 border-l-4 border-l-emerald-500 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> {t("inventory.kpi.profit")}
            </div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">+{inr(totalPotentialProfit)}</div>
          </div>
          <div className="text-[10px] font-mono text-emerald-400">{t("inventory.kpi.margin")}</div>
        </div>
      </div>

      <div className="card-surface">
        <div className="p-3 border-b border-border flex flex-col sm:flex-row gap-2 items-center justify-between">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("inventory.search")}
            className="w-full sm:flex-1 h-9 px-3 rounded-md bg-input border border-border text-sm font-mono text-foreground"
          />

          <div className="flex items-center gap-1 text-xs font-semibold shrink-0">
            <button
              onClick={() => setLocationFilter("ALL")}
              className={`h-8 px-2.5 rounded border transition ${locationFilter === "ALL" ? "bg-primary text-primary-foreground border-primary font-bold" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
            >
              {t("inventory.filter.all")}
            </button>
            <button
              onClick={() => setLocationFilter("SHOP")}
              className={`h-8 px-2.5 rounded border transition ${locationFilter === "SHOP" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
            >
              {t("inventory.filter.inShop")}
            </button>
            <button
              onClick={() => setLocationFilter("GODOWN")}
              className={`h-8 px-2.5 rounded border transition ${locationFilter === "GODOWN" ? "bg-blue-500/20 text-blue-400 border-blue-500/40 font-bold" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
            >
              {t("inventory.filter.inGodown")}
            </button>
            <button
              onClick={() => setLocationFilter("LOW_STOCK")}
              className={`h-8 px-2.5 rounded border transition ${locationFilter === "LOW_STOCK" ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
            >
              {t("inventory.filter.low")}
            </button>
          </div>
        </div>

        {/* Seamless No-Scroll Window Layout */}
        <div className="w-full overflow-hidden">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground tracking-tight bg-card border-b border-border">
              <tr>
                <th className="text-left px-2.5 py-2.5">{t("inventory.col.product")}</th>
                <th className="text-left px-2 py-2.5">{t("inventory.col.barcode")}</th>
                <th className="text-left px-2 py-2.5">{t("inventory.col.category")}</th>
                <th className="text-right px-2 py-2.5">{t("inventory.col.costPrice")}</th>
                <th className="text-right px-2 py-2.5">{t("inventory.col.sellPrice")}</th>
                <th className="text-right px-2 py-2.5 font-bold text-blue-400">{t("inventory.col.profitMargin")}</th>
                <th className="text-right px-2 py-2.5">{t("inventory.col.shopStock")}</th>
                <th className="text-right px-2 py-2.5">{t("inventory.col.godownStock")}</th>
                <th className="text-right px-2 py-2.5">{t("common.total")}</th>
                <th className="text-right px-2.5 py-2.5">{t("inventory.col.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayedProducts.map((p) => {
                const shopQty = Number(p.stock_qty || 0);
                const godownQty = Number(p.godown_qty || 0);
                const totalStock = shopQty + godownQty;
                const low = shopQty <= Number(p.min_stock_alert) || shopQty <= Number(p.moq);
                const unitPnl = p.selling_price - p.cost_price;
                const marginPct = p.selling_price > 0 ? (unitPnl / p.selling_price) * 100 : 0;
                const unitLabel = p.unit ? p.unit.split(' ')[0] : 'Pcs';

                // O(1) hash map lookup instead of 165 Million nested loop iterations
                const sales = productSalesMap.get(p.id) || { unitsSold: 0, totalRevenue: 0 };
                const unitsSold = sales.unitsSold;
                const totalRevenue = sales.totalRevenue;
                const totalCogs = unitsSold * p.cost_price;
                const netRealizedProfit = totalRevenue - totalCogs;
                
                // Investment recovery cash flow calculations
                const totalPurchasedQty = totalStock + unitsSold;
                const totalInvestment = totalPurchasedQty * p.cost_price;
                const cashFlowPnl = totalRevenue - totalInvestment;
                const isRecovered = cashFlowPnl >= 0;

                return (
                  <tr key={p.id} className="hover:bg-secondary/40 transition">
                    <td className="px-2.5 py-2 font-medium">
                      <div className="flex items-center gap-2">
                        {p.image_path ? (
                          <img src={p.image_path} alt={p.name} className="h-6 w-6 rounded object-cover border border-border shrink-0" />
                        ) : null}
                        <div className="truncate">
                          <div className="text-foreground font-semibold truncate max-w-[140px]" title={p.name}>{p.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate">Unit: {unitLabel}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 font-mono text-[11px]">
                      <div className="text-primary font-bold">{p.barcode}</div>
                      <div className="text-[10px] text-muted-foreground">SKU: {p.sku_code || p.barcode}</div>
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground truncate max-w-[90px]">{p.category}</td>
                    <td className="px-2 py-2 text-right font-mono text-muted-foreground">{inr(p.cost_price)}</td>
                    <td className="px-2 py-2 text-right font-mono">
                      <div className="font-semibold text-primary">{inr(p.selling_price)}</div>
                      {p.mrp && p.mrp > 0 && p.mrp > p.selling_price ? (
                        <div className="text-[10px] text-muted-foreground/80 line-through">
                          MRP: {inr(p.mrp)}
                        </div>
                      ) : null}
                      <div className="text-[10px] text-muted-foreground">
                        {marginPct.toFixed(0)}% margin
                      </div>
                    </td>

                    {/* Current realized profit/loss and total units sold column */}
                    <td className="px-2 py-2 text-right font-mono">
                      <div className={`font-bold text-xs flex items-center justify-end gap-0.5 ${
                        unitsSold === 0
                          ? "text-muted-foreground"
                          : isRecovered
                            ? "text-emerald-400"
                            : "text-amber-500"
                      }`}>
                        {unitsSold > 0 ? (
                          <>
                            {isRecovered ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {isRecovered ? `+${inr(cashFlowPnl)}` : inr(cashFlowPnl)}
                          </>
                        ) : (
                          `-${inr(totalInvestment)}`
                        )}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {unitsSold > 0 ? (
                          <span className="text-emerald-400/80">
                            Markup: +{inr(netRealizedProfit)} ({qty(unitsSold)} sold)
                          </span>
                        ) : (
                          "0 pcs sold"
                        )}
                      </div>
                    </td>

                    <td className={`px-2 py-2 text-right font-mono ${shopQty === 0 ? "text-destructive font-bold" : low ? "text-amber-400 font-bold" : "text-foreground font-bold"}`}>
                      {qty(shopQty)} <span className="text-[10px] font-normal text-muted-foreground">{unitLabel}</span>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                      {qty(godownQty)} <span className="text-[10px] text-muted-foreground">{unitLabel}</span>
                    </td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-blue-400">
                      {qty(totalStock)} <span className="text-[10px] text-blue-300 font-normal">{unitLabel}</span>
                    </td>

                    {/* Compact Fits-In-Window Action Buttons with Delete Option */}
                    <td className="px-2.5 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPnlDetailProduct(p)}
                          title="View Product P&L Breakdown"
                          className="h-7 px-1.5 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[11px] font-bold border border-emerald-500/30 inline-flex items-center gap-0.5 transition"
                        >
                          <DollarSign className="h-3 w-3" /> P&L
                        </button>
                        <button
                          onClick={() => setPrintLabelProduct(p)}
                          title="Print Barcode Sticker Label"
                          className="h-7 px-1.5 rounded bg-secondary hover:bg-muted text-[11px] font-semibold border border-border inline-flex items-center gap-0.5 text-primary transition"
                        >
                          <Printer className="h-3 w-3" /> Label
                        </button>
                        <button
                          onClick={() => setEdit(p)}
                          title="Edit Product"
                          className="h-7 w-7 rounded bg-secondary hover:bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-foreground border border-border transition shrink-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          title="Delete Product"
                          className="h-7 w-7 rounded bg-destructive/15 hover:bg-destructive/30 inline-flex items-center justify-center text-destructive border border-destructive/30 transition shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.data?.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-sm text-muted-foreground">
                    No matching products in local database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* High Performance Pagination Controls */}
        {totalProductsCount > 0 && (
          <div className="p-3 border-t border-border bg-card/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-muted-foreground font-mono text-[11px]">
              Showing <span className="font-bold text-foreground">{(activePage - 1) * (pageSize === -1 ? totalProductsCount : pageSize) + 1}</span> to{" "}
              <span className="font-bold text-foreground">{Math.min(activePage * (pageSize === -1 ? totalProductsCount : pageSize), totalProductsCount)}</span> of{" "}
              <span className="font-bold text-foreground">{totalProductsCount}</span> products
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
                  <option value={-1}>All ({totalProductsCount})</option>
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

      {(showNew || edit) && (
        <ProductModal
          product={edit}
          onClose={() => { setShowNew(false); setEdit(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["local-inventory-products"] }); setShowNew(false); setEdit(null); }}
        />
      )}

      {showImportModal && (
        <ExcelImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { qc.invalidateQueries({ queryKey: ["local-inventory-products"] }); setShowImportModal(false); }}
        />
      )}

      {printLabelProduct && (
        <BarcodePrintModal
          product={printLabelProduct}
          onClose={() => setPrintLabelProduct(null)}
        />
      )}

      {pnlDetailProduct && (
        <ProductPnlModal
          product={pnlDetailProduct}
          invoices={invoicesData.data || []}
          onClose={() => setPnlDetailProduct(null)}
        />
      )}
    </div>
  );
}

function ProductPnlModal({ product, invoices, onClose }: { product: InventoryItem; invoices: any[]; onClose: () => void }) {
  let unitsSold = 0;
  let totalRevenue = 0;

  invoices.forEach(({ items }) => {
    items.forEach((it: any) => {
      if (it.product_id === product.id) {
        unitsSold += Number(it.qty || 0);
        totalRevenue += Number(it.total_price || 0);
      }
    });
  });

  const shopQty = Number(product.stock_qty || 0);
  const godownQty = Number(product.godown_qty || 0);
  const totalStock = shopQty + godownQty;
  const unitPnl = product.selling_price - product.cost_price;
  const marginPct = product.selling_price > 0 ? (unitPnl / product.selling_price) * 100 : 0;

  const totalStockCostValuation = totalStock * product.cost_price;
  const totalStockSellingValuation = totalStock * product.selling_price;
  const totalStockPotentialProfit = totalStockSellingValuation - totalStockCostValuation;

  const totalCogs = unitsSold * product.cost_price;
  const netRealizedProfit = totalRevenue - totalCogs;
  
  // Investment recovery cash flow calculations
  const totalPurchasedQty = totalStock + unitsSold;
  const totalInvestment = totalPurchasedQty * product.cost_price;
  const cashFlowPnl = totalRevenue - totalInvestment;
  const isCashFlowProfitable = cashFlowPnl >= 0;
  
  const breakEvenQty = product.selling_price > 0 ? Math.ceil(totalInvestment / product.selling_price) : 0;
  const remainingToBreakEven = Math.max(0, breakEvenQty - unitsSold);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg card-surface p-5 border-l-4 border-l-emerald-500 space-y-5 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" /> Product P&L & Sales Analysis
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <div>
          <div className="text-lg font-bold text-foreground">{product.name}</div>
          <div className="text-xs font-mono text-muted-foreground flex gap-3 mt-0.5">
            <span>Unit: {product.unit || 'Piece (Pcs)'}</span>
            <span>Barcode: {product.barcode}</span>
            <span>SKU: {product.sku_code || product.barcode}</span>
          </div>
        </div>

        {/* CURRENT SALES & P&L STATUS (PRIMARY FOCUS) */}
        <div className={`p-4 rounded border-2 space-y-3 ${
          unitsSold === 0
            ? "bg-secondary/20 border-border"
            : isCashFlowProfitable
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-amber-500/10 border-amber-500/30"
        }`}>
          <div className="flex justify-between items-center">
            <span className="font-bold text-[10px] uppercase tracking-wider font-sans text-foreground">Cash Flow (Investment Recovery):</span>
            {unitsSold === 0 ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-secondary text-muted-foreground border border-border">
                NO SALES (UNRECOVERED)
              </span>
            ) : isCashFlowProfitable ? (
              <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold bg-emerald-500 text-black border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                INVESTMENT RECOVERED
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded text-xs font-bold bg-amber-500 text-black border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                STILL IN BATCH LOSS
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-1">
            <div className="p-3 bg-card rounded border border-border space-y-1">
              <div className="text-[10px] uppercase text-muted-foreground font-bold">Total Batch Cost (CP * Total Supplied)</div>
              <div className="text-base font-bold text-foreground">{inr(totalInvestment)}</div>
              <div className="text-[9px] text-muted-foreground font-sans">
                Supplied: {qty(totalPurchasedQty)} {product.unit || 'pcs'}
              </div>
            </div>
            <div className="p-3 bg-card rounded border border-border space-y-1">
              <div className="text-[10px] uppercase text-muted-foreground font-bold font-sans">Net Cash Flow P&L</div>
              <div className={`text-base font-bold ${
                unitsSold === 0
                  ? "text-muted-foreground"
                  : isCashFlowProfitable
                    ? "text-emerald-400"
                    : "text-amber-400"
              }`}>
                {unitsSold > 0 ? (isCashFlowProfitable ? `+${inr(cashFlowPnl)}` : inr(cashFlowPnl)) : `-${inr(totalInvestment)}`}
              </div>
              <div className="text-[9px] text-muted-foreground font-sans">
                {isCashFlowProfitable ? "Fully Break Even!" : `Unrecovered: ${inr(Math.abs(cashFlowPnl))}`}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs font-mono pt-2 border-t border-border">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-sans">Realized Revenue ({qty(unitsSold)} sold):</span>
              <span className="font-semibold text-foreground">{inr(totalRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-sans">Realized COGS Cost:</span>
              <span className="font-semibold text-muted-foreground">-{inr(totalCogs)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-sans">Sales Markup Profit (Net Margin):</span>
              <span className={`font-semibold ${netRealizedProfit >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                {netRealizedProfit >= 0 ? `+${inr(netRealizedProfit)}` : inr(netRealizedProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* BATCH BREAK-EVEN METRICS */}
        {unitsSold > 0 && !isCashFlowProfitable && (
          <div className="p-4 rounded border border-blue-500/20 bg-blue-500/5 space-y-2">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              Batch Break-Even Target Analysis
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="space-y-0.5">
                <div className="text-[9px] text-muted-foreground uppercase font-sans">Break-Even Sales Target</div>
                <div className="font-bold text-foreground">{qty(breakEvenQty)} {product.unit || 'pcs'}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[9px] text-muted-foreground uppercase font-sans">Remaining Pcs to Sell</div>
                <div className="font-bold text-blue-400">{qty(remainingToBreakEven)} {product.unit || 'pcs'}</div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic mt-1 font-sans">
              To fully recover the initial batch cost of {inr(totalInvestment)}, you must sell at least {qty(remainingToBreakEven)} more units.
            </p>
          </div>
        )}

        {/* STOCK VALUATION & PROJECTIONS (SECONDARY SEGMENT) */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Stock Valuation & Projection Analysis
          </div>

          {/* Stock Breakdown */}
          <div className="p-3 bg-card rounded border border-border grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground font-sans font-bold">Shop Stock</div>
              <div className="font-bold text-foreground mt-0.5">{qty(shopQty)} {product.unit || 'pcs'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground font-sans font-bold">Godown Stock</div>
              <div className="font-bold text-muted-foreground mt-0.5">{qty(godownQty)} {product.unit || 'pcs'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-blue-400 font-sans font-bold">Total Stock</div>
              <div className="font-bold text-blue-400 mt-0.5">{qty(totalStock)} {product.unit || 'pcs'}</div>
            </div>
          </div>

          {/* Unit & Total Stock Financial Matrix */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-secondary/30 rounded border border-border space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Unit Cost (CP)</div>
              <div className="text-sm font-bold font-mono text-foreground">{inr(product.cost_price)}</div>
            </div>
            <div className="p-3 bg-secondary/30 rounded border border-border space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Unit Selling (SP)</div>
              <div className="text-sm font-bold font-mono text-primary">{inr(product.selling_price)}</div>
            </div>
            <div className="p-3 bg-secondary/30 rounded border border-border space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Stock Cost</div>
              <div className="text-sm font-bold font-mono text-foreground">{inr(totalStockCostValuation)}</div>
            </div>
            <div className="p-3 bg-secondary/30 rounded border border-border space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Stock Selling</div>
              <div className="text-sm font-bold font-mono text-primary">{inr(totalStockSellingValuation)}</div>
            </div>
          </div>

          {/* Projected margin (If All Sold) */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded flex justify-between items-center text-xs font-mono">
            <span className="font-bold text-emerald-400 font-sans text-[11px]">Projected Stock Profit (If All Sold):</span>
            <span className={`font-bold text-sm ${totalStockPotentialProfit >= 0 ? "text-emerald-400" : "text-destructive"}`}>
              {totalStockPotentialProfit >= 0 ? `+${inr(totalStockPotentialProfit)}` : inr(totalStockPotentialProfit)} ({marginPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        <button onClick={onClose} className="w-full h-9 rounded bg-secondary border border-border text-xs font-bold hover:bg-muted transition text-foreground">
          Close P&L Analysis
        </button>
      </div>
    </div>
  );
}

function generatePmaBarcode() {
  return "PMA" + Math.floor(100000 + Math.random() * 900000);
}

function ProductModal({ product, onClose, onSaved }: { product: InventoryItem | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<InventoryItem>>({
    name: product?.name ?? "",
    barcode: product?.barcode ?? generatePmaBarcode(),
    category: product?.category ?? "",
    unit: product?.unit ?? "Piece (Pcs)",
    cost_price: product?.cost_price,
    selling_price: product?.selling_price,
    mrp: product?.mrp,
    stock_qty: product?.stock_qty,
    godown_qty: product?.godown_qty,
    moq: product?.moq,
    min_stock_alert: product?.min_stock_alert,
    sku_code: product?.sku_code ?? product?.barcode ?? "",
    gst_rate: product?.gst_rate,
    image_path: product?.image_path ?? "",
  });

  const shopQtyNum = Number(f.stock_qty || 0);
  const godownQtyNum = Number(f.godown_qty || 0);
  const totalStockNum = shopQtyNum + godownQtyNum;

  const unitShort = f.unit ? (f.unit.match(/\((.*?)\)/)?.[1] || f.unit) : "Pcs";

  const cpNum = Number(f.cost_price || 0);
  const spNum = Number(f.selling_price || 0);

  // Total Stock Cost & Selling Amounts State for 2-Way Sync
  const [totalCostAmount, setTotalCostAmount] = useState<string>(
    product?.cost_price && totalStockNum > 0 ? (product.cost_price * totalStockNum).toString() : ""
  );

  const [totalSellingAmount, setTotalSellingAmount] = useState<string>(
    product?.selling_price && totalStockNum > 0 ? (product.selling_price * totalStockNum).toString() : ""
  );

  // 2-Way Auto-Calculations
  function handleCostPriceChange(val: string) {
    const cp = val === "" ? undefined : parseFloat(val);
    setF((prev) => ({ ...prev, cost_price: cp }));
    if (cp !== undefined && totalStockNum > 0) {
      setTotalCostAmount((cp * totalStockNum).toString());
    } else if (val === "") {
      setTotalCostAmount("");
    }
  }

  function handleTotalCostAmountChange(val: string) {
    setTotalCostAmount(val);
    const parsedTotal = parseFloat(val);
    if (!isNaN(parsedTotal) && parsedTotal >= 0 && totalStockNum > 0) {
      const calculatedUnitCost = Number((parsedTotal / totalStockNum).toFixed(2));
      setF((prev) => ({ ...prev, cost_price: calculatedUnitCost }));
    } else if (val === "") {
      setF((prev) => ({ ...prev, cost_price: undefined }));
    }
  }

  function handleSellingPriceChange(val: string) {
    const sp = val === "" ? undefined : parseFloat(val);
    setF((prev) => ({ ...prev, selling_price: sp }));
    if (sp !== undefined && totalStockNum > 0) {
      setTotalSellingAmount((sp * totalStockNum).toString());
    } else if (val === "") {
      setTotalSellingAmount("");
    }
  }

  function handleTotalSellingAmountChange(val: string) {
    setTotalSellingAmount(val);
    const parsedTotal = parseFloat(val);
    if (!isNaN(parsedTotal) && parsedTotal >= 0 && totalStockNum > 0) {
      const calculatedUnitSelling = Number((parsedTotal / totalStockNum).toFixed(2));
      setF((prev) => ({ ...prev, selling_price: calculatedUnitSelling }));
    } else if (val === "") {
      setF((prev) => ({ ...prev, selling_price: undefined }));
    }
  }

  // Handle Qty change auto-updates Total Amounts
  function handleStockQtyChange(shopQtyVal?: number, godownQtyVal?: number) {
    const sq = shopQtyVal !== undefined ? shopQtyVal : shopQtyNum;
    const gq = godownQtyVal !== undefined ? godownQtyVal : godownQtyNum;
    const tot = sq + gq;

    if (f.cost_price !== undefined && tot > 0) {
      setTotalCostAmount((f.cost_price * tot).toString());
    }
    if (f.selling_price !== undefined && tot > 0) {
      setTotalSellingAmount((f.selling_price * tot).toString());
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name?.trim()) { toast.error("Product name required"); return; }
    db.saveInventoryItem({
      ...f,
      unit: f.unit || "Piece (Pcs)",
      cost_price: f.cost_price ?? 0,
      selling_price: f.selling_price ?? 0,
      mrp: f.mrp !== undefined && f.mrp !== null && !isNaN(Number(f.mrp)) ? Number(f.mrp) : 0,
      stock_qty: f.stock_qty ?? 0,
      godown_qty: f.godown_qty ?? 0,
      moq: f.moq ?? 5,
      min_stock_alert: f.min_stock_alert ?? 10,
      gst_rate: f.gst_rate ?? 18,
      id: product?.id,
      barcode: f.barcode || generatePmaBarcode(),
      sku_code: f.sku_code || f.barcode || generatePmaBarcode(),
    } as any);
    toast.success(product ? "Product updated" : "Product created with PMA Barcode");
    onSaved();
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setF((prev) => ({ ...prev, image_path: evt.target?.result as string }));
        toast.success("Product image uploaded successfully");
      }
    };
    reader.readAsDataURL(file);
  }

  const ic = "w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono focus:outline-none focus:border-primary text-foreground";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl card-surface p-6 border-l-4 border-l-primary space-y-4 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground">{product ? "Edit Inventory Product" : "New Inventory Product Entry"}</div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Product Name *</div>
                <input
                  required
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  placeholder="e.g. Steel plates / Copper wire"
                  className={ic}
                  autoFocus
                />
              </label>
            </div>

            <div>
              <label className="block">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 flex justify-between">
                  <span>Barcode / EAN</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newCode = generatePmaBarcode();
                      setF({ ...f, barcode: newCode, sku_code: f.sku_code || newCode });
                    }}
                    className="text-primary hover:underline text-[9px]"
                  >
                    Gen PMA
                  </button>
                </div>
                <input
                  value={f.barcode}
                  onChange={(e) => setF({ ...f, barcode: e.target.value })}
                  placeholder="PMA100001"
                  className={ic}
                />
              </label>
            </div>

            <div>
              <label className="block">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Category</div>
                <input
                  value={f.category}
                  onChange={(e) => setF({ ...f, category: e.target.value })}
                  placeholder="e.g. Vessals / Hardware"
                  className={ic}
                />
              </label>
            </div>

            {/* Measurement Unit Choice (Kg, Pcs, Ltr, Mtr, etc.) */}
            <div>
              <label className="block">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <Scale className="h-3 w-3 text-primary" /> Measurement Unit (Kg / Pcs)
                </div>
                <select
                  value={f.unit || "Piece (Pcs)"}
                  onChange={(e) => setF({ ...f, unit: e.target.value })}
                  className={ic}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="block">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">SKU Code</div>
                <input
                  value={f.sku_code}
                  onChange={(e) => setF({ ...f, sku_code: e.target.value })}
                  placeholder="Auto-generated SKU"
                  className={ic}
                />
              </label>
            </div>
          </div>

          {/* Stock Allocation & Quantities Section */}
          <div className="p-3 bg-card rounded border border-border space-y-2">
            <div className="text-xs font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Store className="h-3.5 w-3.5 text-primary" /> Stock Allocation & Quantities ({unitShort})</span>
              <span className="text-xs font-mono font-bold text-blue-400">Total Stock: {qty(totalStockNum)} {unitShort}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Shop Stock Qty ({unitShort})</div>
                  <input
                    type="number"
                    step="0.01"
                    value={f.stock_qty ?? ""}
                    onChange={(e) => {
                      const sq = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      setF({ ...f, stock_qty: sq });
                      handleStockQtyChange(sq, godownQtyNum);
                    }}
                    placeholder={`e.g. 28 (${unitShort})`}
                    className={ic}
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Godown Stock Qty ({unitShort})</div>
                  <input
                    type="number"
                    step="0.01"
                    value={f.godown_qty ?? ""}
                    onChange={(e) => {
                      const gq = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      setF({ ...f, godown_qty: gq });
                      handleStockQtyChange(shopQtyNum, gq);
                    }}
                    placeholder={`e.g. 0 (${unitShort})`}
                    className={ic}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Unit & Total Pricing Matrix (Bi-directional Auto Sync) */}
          <div className="p-3 bg-card rounded border border-border space-y-2.5">
            <div className="text-xs font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Unit & Total Stock Pricing (Bi-directional Sync)</span>
              <span className="text-xs font-mono text-emerald-400">Total Cost: {inr(totalStockNum * cpNum)}</span>
            </div>

            {/* Row 1: Unit Pricing (3 columns: Cost, MRP, Selling) */}
            <div className="grid grid-cols-3 gap-3">
              {/* Cost Input */}
              <div>
                <label className="block">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 min-h-[26px] flex flex-col justify-end">
                    <span>Cost Price / {unitShort} (₹)</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={f.cost_price ?? ""}
                    onChange={(e) => handleCostPriceChange(e.target.value)}
                    placeholder="0.00"
                    className={ic}
                  />
                </label>
              </div>

              {/* MRP Input */}
              <div>
                <label className="block">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 min-h-[26px] flex items-end justify-between">
                    <span>MRP (₹)</span>
                    <span className="text-[9px] text-muted-foreground font-normal">Max Retail</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={f.mrp ?? ""}
                    onChange={(e) => setF({ ...f, mrp: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                    placeholder="0.00"
                    className={ic}
                  />
                </label>
              </div>

              {/* Selling Input */}
              <div>
                <label className="block">
                  <div className="text-[10px] uppercase font-bold text-primary mb-1 min-h-[26px] flex flex-col justify-end">
                    <span>Selling Price / {unitShort} (₹) *</span>
                  </div>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={f.selling_price ?? ""}
                    onChange={(e) => handleSellingPriceChange(e.target.value)}
                    placeholder="0.00"
                    className={`${ic} border-primary/50 font-bold`}
                  />
                </label>
              </div>
            </div>

            {/* Row 2: Total Stock Amounts (2 equal balanced columns) */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40">
              <div>
                <label className="block">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 min-h-[18px] flex items-end">
                    <span>Total Stock Cost Amount (₹)</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={totalCostAmount}
                    onChange={(e) => handleTotalCostAmountChange(e.target.value)}
                    placeholder="e.g. 2900"
                    className={ic}
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 min-h-[18px] flex items-end">
                    <span>Total Stock Selling Amount (₹)</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={totalSellingAmount}
                    onChange={(e) => handleTotalSellingAmountChange(e.target.value)}
                    placeholder="e.g. 3480"
                    className={ic}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">MOQ Reorder Alert</div>
                <input
                  type="number"
                  value={f.moq ?? ""}
                  onChange={(e) => setF({ ...f, moq: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                  placeholder="5"
                  className={ic}
                />
              </label>
            </div>

            <div>
              <label className="block">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Min Stock Alert</div>
                <input
                  type="number"
                  value={f.min_stock_alert ?? ""}
                  onChange={(e) => setF({ ...f, min_stock_alert: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                  placeholder="10"
                  className={ic}
                />
              </label>
            </div>

            <div>
              <label className="block">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">GST Rate (%)</div>
                <input
                  type="number"
                  value={f.gst_rate ?? ""}
                  onChange={(e) => setF({ ...f, gst_rate: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                  placeholder="18"
                  className={ic}
                />
              </label>
            </div>
          </div>

          {/* Product Image Upload */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">Product Image (Optional Upload)</div>
            <div className="flex gap-2 items-center">
              {f.image_path ? (
                <img src={f.image_path} alt="Preview" className="h-10 w-10 rounded object-cover border border-primary shrink-0" />
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                id="product-image-upload"
                className="hidden"
              />
              <label
                htmlFor="product-image-upload"
                className="h-9 px-3 rounded bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-muted transition text-foreground"
              >
                <Image className="h-3.5 w-3.5 text-primary" /> Upload Image File
              </label>
              <input
                value={f.image_path}
                onChange={(e) => setF({ ...f, image_path: e.target.value })}
                placeholder="Or paste image URL / local path…"
                className={`flex-1 ${ic}`}
              />
            </div>
          </div>

          <button type="submit" className="w-full h-10 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:accent-glow transition mt-2">
            Save Product Record
          </button>
        </form>
      </div>
    </div>
  );
}

function generateBarcodeSvg(code: string, height: number = 20, maxW: string = "140px"): string {
  const clean = (code || "PMA000").toUpperCase();
  const bars: boolean[] = [];
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    bars.push(true, (charCode % 2 === 0), false, true, (charCode % 3 === 0), true, false);
  }
  const rects = bars.map((b, idx) =>
    b ? `<rect x="${(idx * (160 / bars.length)).toFixed(2)}" y="1" width="${((160 / bars.length) * 0.9).toFixed(2)}" height="28" fill="black" />` : ''
  ).join('');

  return `<svg style="width: 100%; height: ${height}px; max-width: ${maxW};" viewBox="0 0 160 30" preserveAspectRatio="none"><rect width="160" height="30" fill="white" />${rects}</svg>`;
}

type LabelFormat = "50x25" | "34x20";

function BarcodePrintModal({ product, onClose }: { product: InventoryItem; onClose: () => void }) {
  const [labelFormat, setLabelFormat] = useState<LabelFormat>("50x25");
  const [sheetCount, setSheetCount] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  const barcodeCode = product.barcode || product.sku_code || generatePmaBarcode();
  const skuCode = product.sku_code || product.barcode || barcodeCode;
  const mrpVal = product.mrp && product.mrp > 0 ? product.mrp : product.selling_price;
  const stickersPerRow = labelFormat === "34x20" ? 3 : 2;
  const totalStickers = sheetCount * stickersPerRow;

  function renderSingle50x25Label(isPrint: boolean = false) {
    return (
      <div
        className={`flex flex-col justify-between items-center text-center p-1 box-border overflow-hidden bg-white text-black font-sans ${
          isPrint ? "h-[25mm] max-h-[25mm] w-[50mm]" : "h-full w-full"
        }`}
        style={{ color: "#000000", WebkitTextStroke: "0.15px #000000" }}
      >
        <div className="w-full">
          <div className="text-[7.5px] font-black uppercase tracking-wider text-black leading-none">
            PONMANI AGENCIES
          </div>
          <div className="text-[8.5px] font-black truncate leading-tight text-black mt-0.5" title={product.name}>
            {product.name}
          </div>
        </div>

        {/* MRP & SP (Symmetrically Aligned on the exact same baseline) */}
        <div className="w-full flex items-baseline justify-center gap-3 font-mono text-[8.5px] font-black py-0.5 text-black leading-none">
          <span>MRP: ₹{mrpVal.toFixed(0)}</span>
          <span>SP: ₹{product.selling_price.toFixed(0)}</span>
        </div>

        {/* Barcode Lines */}
        <div className="w-full flex justify-center py-0.5">
          <BarcodeVisual code={barcodeCode} height={18} maxW="130px" />
        </div>

        {/* SKU Code at bottom (direct SKU code without prefix) */}
        <div className="text-[7.5px] font-mono font-black tracking-wider text-black leading-none">
          {skuCode}
        </div>
      </div>
    );
  }

  function renderSingle34x20Label() {
    return (
      <div
        className="flex flex-col justify-between items-center text-center p-0.5 box-border overflow-hidden bg-white text-black font-sans h-full w-full"
        style={{ color: "#000000", WebkitTextStroke: "0.1px #000000" }}
      >
        <div className="w-full">
          <div className="text-[6.8px] font-black uppercase tracking-tight text-black leading-none">
            PONMANI AGENCIES
          </div>
          <div className="text-[7.2px] font-black truncate leading-tight text-black mt-0.5" title={product.name}>
            {product.name}
          </div>
        </div>

        {/* MRP & SP (Symmetrically Aligned on the exact same baseline) */}
        <div className="w-full flex items-baseline justify-center gap-2 font-mono text-[7px] font-black py-0.5 text-black leading-none">
          <span>MRP: ₹{mrpVal.toFixed(0)}</span>
          <span>SP: ₹{product.selling_price.toFixed(0)}</span>
        </div>

        {/* Barcode Lines */}
        <div className="w-full flex justify-center py-0.5">
          <BarcodeVisual code={barcodeCode} height={13} maxW="90px" />
        </div>

        {/* SKU Code at bottom (direct SKU code without prefix) */}
        <div className="text-[6.5px] font-mono font-black tracking-wider text-black leading-none truncate max-w-[32mm]">
          {skuCode}
        </div>
      </div>
    );
  }

  function handlePrintLabel() {
    if (isPrinting) return;
    setIsPrinting(true);

    try {
      if (labelFormat === "34x20") {
        const miniBarcodeSvg = generateBarcodeSvg(barcodeCode, 13, "90px");

        const singleMiniHtml = `
          <div style="width: 34mm; height: 100%; max-height: 20mm; box-sizing: border-box; padding: 0.8mm 1mm; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; background: #ffffff; color: #000000; overflow: hidden; font-family: Arial, Helvetica, sans-serif;">
            <div style="width: 100%; line-height: 1;">
              <div style="font-size: 6.8px; font-weight: 900; letter-spacing: 0.04em; text-transform: uppercase; color: #000000; -webkit-text-stroke: 0.1px #000;">PONMANI AGENCIES</div>
              <div style="font-size: 7.2px; font-weight: 900; line-height: 1; max-width: 32mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #000000; margin-top: 0.5px; -webkit-text-stroke: 0.1px #000;">${product.name}</div>
            </div>
            <div style="width: 100%; display: flex; justify-content: center; align-items: baseline; gap: 6px; font-family: monospace; font-size: 7px; font-weight: 900; color: #000000; line-height: 1; -webkit-text-stroke: 0.1px #000;">
              <span>MRP: ₹${mrpVal.toFixed(0)}</span>
              <span>SP: ₹${product.selling_price.toFixed(0)}</span>
            </div>
            <div style="width: 100%; display: flex; justify-content: center; align-items: center;">
              ${miniBarcodeSvg}
            </div>
            <div style="font-family: monospace; font-size: 6.5px; font-weight: 900; letter-spacing: 0.05em; color: #000000; line-height: 1; max-width: 32mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${skuCode}</div>
          </div>
        `.trim();

        const sheetsList: string[] = [];
        for (let s = 0; s < sheetCount; s++) {
          sheetsList.push(
            `<div class="label-sheet" style="width: 102mm; height: 20mm; max-height: 20mm; display: grid; grid-template-columns: 34mm 34mm 34mm; grid-template-rows: 20mm; box-sizing: border-box; background: #ffffff; color: #000000; overflow: hidden;"><div style="width: 34mm; height: 20mm; max-height: 20mm; box-sizing: border-box; overflow: hidden; display: flex;">${singleMiniHtml}</div><div style="width: 34mm; height: 20mm; max-height: 20mm; box-sizing: border-box; overflow: hidden; display: flex;">${singleMiniHtml}</div><div style="width: 34mm; height: 20mm; max-height: 20mm; box-sizing: border-box; overflow: hidden; display: flex;">${singleMiniHtml}</div></div>`
          );
        }

        printIsolatedLabels(sheetsList.join(""), 102, 20);
      } else {
        const miniBarcodeSvg = generateBarcodeSvg(barcodeCode, 18, "130px");

        const singleMiniHtml = `
          <div style="width: 50mm; height: 100%; max-height: 25mm; box-sizing: border-box; padding: 1mm 1.5mm; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; background: #ffffff; color: #000000; overflow: hidden; font-family: Arial, Helvetica, sans-serif;">
            <div style="width: 100%; line-height: 1.1;">
              <div style="font-size: 7.5px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: #000000; -webkit-text-stroke: 0.15px #000;">PONMANI AGENCIES</div>
              <div style="font-size: 8.5px; font-weight: 900; line-height: 1.1; max-width: 48mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #000000; margin-top: 1px; -webkit-text-stroke: 0.15px #000;">${product.name}</div>
            </div>
            <div style="width: 100%; display: flex; justify-content: center; align-items: baseline; gap: 10px; font-family: monospace; font-size: 8.5px; font-weight: 900; color: #000000; line-height: 1; -webkit-text-stroke: 0.15px #000;">
              <span>MRP: ₹${mrpVal.toFixed(0)}</span>
              <span>SP: ₹${product.selling_price.toFixed(0)}</span>
            </div>
            <div style="width: 100%; display: flex; justify-content: center; align-items: center;">
              ${miniBarcodeSvg}
            </div>
            <div style="font-family: monospace; font-size: 7.5px; font-weight: 900; letter-spacing: 0.08em; color: #000000; line-height: 1;">${skuCode}</div>
          </div>
        `.trim();

        const sheetsList: string[] = [];
        for (let s = 0; s < sheetCount; s++) {
          sheetsList.push(
            `<div class="label-sheet" style="width: 100mm; height: 25mm; max-height: 25mm; display: grid; grid-template-columns: 50mm 50mm; grid-template-rows: 25mm; box-sizing: border-box; background: #ffffff; color: #000000; overflow: hidden;"><div style="width: 50mm; height: 25mm; max-height: 25mm; box-sizing: border-box; overflow: hidden; display: flex;">${singleMiniHtml}</div><div style="width: 50mm; height: 25mm; max-height: 25mm; box-sizing: border-box; overflow: hidden; display: flex;">${singleMiniHtml}</div></div>`
          );
        }

        printIsolatedLabels(sheetsList.join(""), 100, 25);
      }
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
      }, 1500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-3 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg card-surface p-5 border-l-4 border-l-primary space-y-4 shadow-2xl rounded-xl">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground flex items-center gap-2">
            <Barcode className="h-5 w-5 text-primary" /> Barcode Sticker Printer
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Product Details Header */}
        <div className="bg-secondary/40 p-2.5 rounded-lg border border-border flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-xs font-bold text-foreground truncate">{product.name}</div>
            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>SKU: <strong className="text-foreground">{skuCode}</strong></span>
              <span>•</span>
              <span>Barcode: <strong className="text-foreground">{barcodeCode}</strong></span>
              <span>•</span>
              <span>MRP: ₹{mrpVal.toFixed(0)}</span>
              <span>•</span>
              <span className="text-primary font-bold">SP: ₹{product.selling_price.toFixed(0)}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              {labelFormat === "34x20" ? "3 Per Row (34×20 mm)" : "2 Per Row (50×25 mm)"}
            </span>
          </div>
        </div>

        {/* Format Selector: 2 per row (50x25mm) vs 3 per row (34x20mm) */}
        <div className="bg-secondary/50 p-2.5 rounded-lg border border-border space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Select Label Size / Roll Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLabelFormat("50x25")}
              className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                labelFormat === "50x25"
                  ? "bg-primary text-primary-foreground border-primary shadow"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              <div>
                <div className="text-xs font-bold">2 Per Row (50 × 25 mm)</div>
                <div className={`text-[10px] mt-0.5 ${labelFormat === "50x25" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  4" × 1" Roll (2-across)
                </div>
              </div>
              <span className="font-mono text-xs font-extrabold px-1.5 py-0.5 rounded bg-black/20">
                2/row
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLabelFormat("34x20")}
              className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                labelFormat === "34x20"
                  ? "bg-primary text-primary-foreground border-primary shadow"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              <div>
                <div className="text-xs font-bold">3 Per Row (34 × 20 mm)</div>
                <div className={`text-[10px] mt-0.5 ${labelFormat === "34x20" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  102mm × 20mm Roll (3-across)
                </div>
              </div>
              <span className="font-mono text-xs font-extrabold px-1.5 py-0.5 rounded bg-black/20">
                3/row
              </span>
            </button>
          </div>
        </div>

        {/* Visual Preview Frame */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
            <span>
              {labelFormat === "34x20" ? 'Roll: 102mm × 20mm (~4" × 0.8")' : 'Roll: 100mm × 25mm (4" × 1")'}
            </span>
            <span className="text-primary font-bold">
              {labelFormat === "34x20"
                ? "3 Stickers Per Row (34mm × 20mm each)"
                : "2 Stickers Per Row (50mm × 25mm each)"}
            </span>
          </div>

          <div className="bg-slate-200 dark:bg-zinc-800 p-3 rounded-lg border border-border flex justify-center">
            {labelFormat === "34x20" ? (
              <div className="w-[360px] h-[72px] bg-white rounded border-2 border-black shadow-md grid grid-cols-3 relative overflow-hidden">
                <div className="border-r border-dashed border-gray-400 overflow-hidden">
                  {renderSingle34x20Label()}
                </div>
                <div className="border-r border-dashed border-gray-400 overflow-hidden">
                  {renderSingle34x20Label()}
                </div>
                <div className="overflow-hidden">
                  {renderSingle34x20Label()}
                </div>
              </div>
            ) : (
              <div className="w-[360px] h-[90px] bg-white rounded border-2 border-black shadow-md grid grid-cols-2 relative overflow-hidden">
                <div className="border-r border-dashed border-gray-400 overflow-hidden">
                  {renderSingle50x25Label()}
                </div>
                <div className="overflow-hidden">
                  {renderSingle50x25Label()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="bg-secondary/50 p-3 rounded-lg border border-border space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Quantity to Print
            </label>
            <span className="font-mono text-xs font-bold text-primary">
              {totalStickers} stickers ({sheetCount} {sheetCount === 1 ? "row" : "rows"})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSheetCount(Math.max(1, sheetCount - 1))}
              className="h-8 w-9 rounded-lg bg-background hover:bg-muted border border-border font-bold flex items-center justify-center text-base"
            >
              -
            </button>
            <div className="flex-1 flex items-center justify-center gap-1 bg-background px-3 py-1.5 rounded-lg border border-border">
              <input
                type="number"
                min="1"
                max="500"
                value={sheetCount}
                onChange={(e) => setSheetCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-center font-mono font-bold text-sm bg-transparent outline-none text-foreground"
              />
              <span className="text-xs text-muted-foreground font-medium">
                {sheetCount === 1 ? `Row (${stickersPerRow} pcs)` : `Rows (${totalStickers} pcs)`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSheetCount(sheetCount + 1)}
              className="h-8 w-9 rounded-lg bg-background hover:bg-muted border border-border font-bold flex items-center justify-center text-base"
            >
              +
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] text-muted-foreground mr-1">Quick:</span>
            {[1, 2, 5, 10, 25].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setSheetCount(count)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                  sheetCount === count
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {count * stickersPerRow} pcs ({count}r)
              </button>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-[11px] text-muted-foreground font-mono">
            Target: <strong className="text-foreground">{labelFormat === "34x20" ? '34×20 mm (3/row)' : '50×25 mm (2/row)'}</strong>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-9 px-3 rounded-lg bg-secondary border border-border text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              onClick={handlePrintLabel}
              disabled={isPrinting}
              className={`h-9 px-4 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow transition ${
                isPrinting ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
              }`}
            >
              <Printer className="h-4 w-4" /> {isPrinting ? "Printing..." : `Print ${totalStickers} Labels`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarcodeVisual({ code, height = 22, maxW = "160px" }: { code: string; height?: number; maxW?: string }) {
  const clean = code.toUpperCase();
  const bars: boolean[] = [];
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    bars.push(true, (charCode % 2 === 0), false, true, (charCode % 3 === 0), true, false);
  }

  return (
    <svg className="w-full" style={{ height: `${height}px`, maxWidth: maxW }} viewBox="0 0 160 30" preserveAspectRatio="none">
      <rect width="160" height="30" fill="white" />
      {bars.map((b, idx) =>
        b ? (
          <rect
            key={idx}
            x={idx * (160 / bars.length)}
            y="1"
            width={(160 / bars.length) * 0.9}
            height="28"
            fill="black"
          />
        ) : null
      )}
    </svg>
  );
}

function ExcelImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [errorList, setErrorList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const rows = await ExcelEngine.parseExcelFile(file);
      const mapped = rows.map((r: any) => ({
        name: r['Name'] || r['name'] || '',
        barcode: r['Barcode'] || r['barcode'] || generatePmaBarcode(),
        category: r['Category'] || r['category'] || 'General',
        unit: r['Unit'] || r['unit'] || 'Piece (Pcs)',
        cost_price: Number(r['Cost Price'] || r['cost_price']) || 0,
        mrp: Number(r['MRP'] || r['mrp'] || r['Max Retail Price']) || undefined,
        selling_price: Number(r['Selling Price'] || r['selling_price']) || 0,
        stock_qty: Number(r['Stock Qty'] || r['stock_qty']) || 0,
        godown_qty: Number(r['Godown Qty'] || r['godown_qty']) || 0,
        moq: Number(r['MOQ'] || r['moq']) || 5,
        min_stock_alert: Number(r['Min Stock Alert'] || r['min_stock_alert']) || 10,
        sku_code: r['SKU Code'] || r['sku_code'] || generatePmaBarcode(),
        gst_rate: Number(r['GST Rate (%)'] || r['gst_rate']) || 18,
      }));
      setParsedRows(mapped);
    } catch (err: any) {
      toast.error("Failed to parse Excel file: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function commitImport() {
    const res = db.bulkImportInventory(parsedRows);
    if (!res.success) {
      setErrorList(res.errors);
      toast.error(`Import failed with ${res.errors.length} validation errors.`);
    } else {
      toast.success(`Successfully imported ${res.count} products into local database!`);
      onImported();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl card-surface p-5 border-l-4 border-l-emerald-500">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground flex items-center gap-2">
            <Upload className="h-5 w-5 text-emerald-400" /> Bulk Excel Product Importer
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        {parsedRows.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-border rounded-lg bg-card">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-emerald-400 mb-3" />
            <div className="text-sm font-semibold text-foreground mb-1">Select Excel (.xlsx) Template File</div>
            <p className="text-xs text-muted-foreground mb-4">
              Ensure column headers match our standard import template format.
            </p>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" id="excel-file-input" />
            <label
              htmlFor="excel-file-input"
              className="inline-flex h-9 px-4 rounded bg-primary text-primary-foreground text-xs font-bold items-center gap-2 cursor-pointer hover:accent-glow"
            >
              {loading ? "Parsing File..." : "Browse Excel File"}
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Parsed {parsedRows.length} Rows Ready for Preview
              </span>
              <button onClick={() => setParsedRows([])} className="text-muted-foreground hover:underline">Change File</button>
            </div>

            {errorList.length > 0 && (
              <div className="p-3 bg-destructive/15 border border-destructive/30 rounded text-xs text-destructive max-h-32 overflow-auto space-y-1">
                <div className="font-bold flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Validation Errors (Transaction Rolled Back):</div>
                {errorList.map((err, idx) => (
                  <div key={idx}>• {err}</div>
                ))}
              </div>
            )}

            <div className="max-h-60 overflow-auto border border-border rounded">
              <table className="w-full text-xs">
                <thead className="bg-card text-[10px] uppercase text-muted-foreground sticky top-0">
                  <tr className="border-b border-border">
                    <th className="px-2 py-1.5 text-left">Barcode</th>
                    <th className="px-2 py-1.5 text-left">Name</th>
                    <th className="px-2 py-1.5 text-right">Cost</th>
                    <th className="px-2 py-1.5 text-right">MRP</th>
                    <th className="px-2 py-1.5 text-right">Selling Price</th>
                    <th className="px-2 py-1.5 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{r.barcode || 'Auto'}</td>
                      <td className="px-2 py-1.5 font-medium">{r.name}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{inr(r.cost_price)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{inr(r.mrp || r.selling_price)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold text-primary">{inr(r.selling_price)}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{r.stock_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={commitImport}
              className="w-full h-10 rounded-md bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/40"
            >
              Commit Import into Local Database
            </button>
          </div>
        )}
      </div>
    </div>
  );
}