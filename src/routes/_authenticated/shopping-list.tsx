import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db, InventoryItem } from "@/lib/db/db";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Printer,
  Sparkles,
  ShoppingBag,
  Package,
  X,
  Search,
  CheckCircle2,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/shopping-list")({
  component: ShoppingListPage,
});

interface SimpleRestockItem {
  id: string;
  product_id: string;
  name: string;
  image_path?: string;
  unit: string;
  restock_qty: number;
}

const STORAGE_KEY = "ponmani_simple_shopping_list_v2";

function loadSavedList(): SimpleRestockItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveListToStorage(items: SimpleRestockItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {}
}

function ShoppingListPage() {
  const [restockList, setRestockList] = useState<SimpleRestockItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScreenPreview, setShowScreenPreview] = useState(false);
  const [searchCatalogQuery, setSearchCatalogQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Load Inventory Products from offline DB
  const productsQuery = useQuery({
    queryKey: ["local-inventory-products"],
    staleTime: 60_000,
    queryFn: async () => {
      await db.loadPromise;
      return db.getInventory();
    },
  });

  const allProducts = productsQuery.data || [];
  const storeSettings = db.getSettings();

  // Load saved list on mount
  useEffect(() => {
    setRestockList(loadSavedList());
    setIsHydrated(true);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (isHydrated) {
      saveListToStorage(restockList);
    }
  }, [restockList, isHydrated]);

  // Unique categories from catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [allProducts]);

  // Items currently low or out of stock
  const lowStockCandidates = useMemo(() => {
    return allProducts.filter((p) => {
      const totalStock = Number(p.stock_qty || 0) + Number(p.godown_qty || 0);
      const minAlert = Number(p.min_stock_alert) || 5;
      return totalStock <= minAlert || Number(p.stock_qty || 0) <= 0;
    });
  }, [allProducts]);

  // Auto add all low stock items with 1-click
  function handleAddAllLowStock() {
    if (lowStockCandidates.length === 0) {
      toast.info("No low stock items in inventory.");
      return;
    }

    let addedCount = 0;
    setRestockList((prev) => {
      const existingProductIds = new Set(prev.map((i) => i.product_id));
      const newItems: SimpleRestockItem[] = [];

      lowStockCandidates.forEach((p) => {
        if (!existingProductIds.has(p.id)) {
          const defaultQty = Number(p.moq) > 0 ? Number(p.moq) : 5;
          newItems.push({
            id: "item-" + p.id + "-" + Date.now(),
            product_id: p.id,
            name: p.name,
            image_path: p.image_path,
            unit: p.unit || "Pcs",
            restock_qty: defaultQty,
          });
          addedCount++;
        }
      });

      return [...prev, ...newItems];
    });

    if (addedCount > 0) {
      toast.success(`⚡ Added ${addedCount} items to your shopping list!`);
    } else {
      toast.info("All low stock items are already in your list.");
    }
  }

  // Add individual product from catalog
  function handleAddProduct(p: InventoryItem) {
    const existing = restockList.find((i) => i.product_id === p.id);
    if (existing) {
      updateQty(existing.id, existing.restock_qty + (p.moq || 5));
      toast.success(`Updated quantity for ${p.name}`);
      return;
    }

    const defaultQty = Number(p.moq) > 0 ? Number(p.moq) : 5;
    const newItem: SimpleRestockItem = {
      id: "item-" + p.id + "-" + Date.now(),
      product_id: p.id,
      name: p.name,
      image_path: p.image_path,
      unit: p.unit || "Pcs",
      restock_qty: defaultQty,
    };

    setRestockList((prev) => [newItem, ...prev]);
    toast.success(`Added ${p.name} to shopping list`);
  }

  // Update item quantity
  function updateQty(id: string, newQty: number) {
    const valid = Math.max(1, Math.round(newQty));
    setRestockList((prev) =>
      prev.map((it) => (it.id === id ? { ...it, restock_qty: valid } : it))
    );
  }

  // Remove single item
  function removeItem(id: string) {
    setRestockList((prev) => prev.filter((it) => it.id !== id));
    toast.success("Item removed");
  }

  // Clear list
  function clearAll() {
    if (restockList.length === 0) return;
    if (window.confirm("Are you sure you want to clear your shopping list?")) {
      setRestockList([]);
      toast.success("Shopping list cleared");
    }
  }

  // Trigger browser print (PDF)
  function handlePrint() {
    if (restockList.length === 0) {
      toast.error("Please add at least one product before printing");
      return;
    }
    window.print();
  }

  // Group items into pairs of 2 for PDF printing (2 products per A4 page)
  const printPages = useMemo(() => {
    const pages: SimpleRestockItem[][] = [];
    for (let i = 0; i < restockList.length; i += 2) {
      pages.push(restockList.slice(i, i + 2));
    }
    return pages;
  }, [restockList]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          BULLETPROOF PRINT STYLES
          Hides all surrounding UI with visibility:hidden and isolates
          the exact 2-items-per-page A4 print container at top: 0
      ────────────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #shopping-list-print-root,
          #shopping-list-print-root * {
            visibility: visible !important;
          }
          #shopping-list-print-root {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            z-index: 99999 !important;
          }
          .a4-print-page {
            page-break-after: always !important;
            break-after: page !important;
            height: 268mm !important;
            max-height: 268mm !important;
            min-height: 268mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 4mm 2mm !important;
          }
          .a4-print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* ─────────────────────────────────────────────────────────────
          SCREEN UI: HEADER & TOP ACTION BUTTONS
      ────────────────────────────────────────────────────────────── */}
      <div className="print:hidden pb-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Shopping List
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Wholesale buying list with big pictures • 2 products per page PDF download
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddAllLowStock}
            className="h-9 px-3.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Auto-Add Low Stock ({lowStockCandidates.length})</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Pick Products</span>
          </button>

          {restockList.length > 0 && (
            <button
              onClick={() => setShowScreenPreview((v) => !v)}
              className="h-9 px-3.5 rounded-lg bg-secondary border border-border text-foreground hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Eye className="h-4 w-4 text-blue-400" />
              <span>{showScreenPreview ? "Hide Preview" : "Preview PDF Layout"}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            disabled={restockList.length === 0}
            className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-40"
          >
            <Printer className="h-4 w-4" />
            <span>Download / Print PDF</span>
          </button>

          {restockList.length > 0 && (
            <button
              onClick={clearAll}
              className="h-9 px-3 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Clear shopping list"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          OPTIONAL ON-SCREEN PREVIEW OF THE EXACT A4 PRINT PAGES
      ────────────────────────────────────────────────────────────── */}
      {showScreenPreview && restockList.length > 0 && (
        <div className="p-4 bg-muted/40 rounded-2xl border border-primary/30 space-y-4 print:hidden">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Live PDF Layout Preview (2 Products Per Page)
            </span>
            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-bold flex items-center gap-1"
            >
              <Printer className="h-3.5 w-3.5" /> Print Now
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            This is exactly how your pages will look when printed or saved as PDF.
          </p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SCREEN UI: SHOPPING LIST ITEMS (BIG IMAGE + PRODUCT NAME)
      ────────────────────────────────────────────────────────────── */}
      {restockList.length === 0 ? (
        <div className="text-center py-20 card-surface rounded-2xl border border-dashed border-border p-8 print:hidden">
          <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 text-primary mx-auto grid place-items-center mb-4">
            <ShoppingBag className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Your Shopping List is Empty</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
            Click <strong>"Pick Products"</strong> to add items like <em>"test 2"</em> and <em>"test plates"</em> with big pictures.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Browse Catalog & Pick Items</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 print:hidden">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>{restockList.length} products on list</span>
            <span>PDF Output: <strong>2 products per page</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restockList.map((item, idx) => (
              <div
                key={item.id}
                className="card-surface rounded-2xl border border-border p-4 flex gap-4 items-center justify-between shadow-xs hover:border-primary/50 transition"
              >
                {/* BIG PRODUCT IMAGE */}
                <div className="h-28 w-28 rounded-xl bg-muted/60 border border-border shrink-0 overflow-hidden grid place-items-center relative">
                  {item.image_path ? (
                    <img
                      src={item.image_path}
                      alt={item.name}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Package className="h-10 w-10 text-muted-foreground/60" />
                  )}
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white font-bold">
                    #{idx + 1}
                  </span>
                </div>

                {/* PRODUCT NAME & QUANTITY */}
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-base font-black text-foreground leading-snug line-clamp-2" title={item.name}>
                    {item.name}
                  </h4>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Qty to Buy:</span>
                    <div className="flex items-center gap-1 font-mono">
                      <button
                        onClick={() => updateQty(item.id, item.restock_qty - 1)}
                        className="h-7 w-7 rounded bg-secondary hover:bg-muted border border-border text-foreground text-xs font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.restock_qty}
                        onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-7 rounded bg-input border border-border text-center text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => updateQty(item.id, item.restock_qty + 1)}
                        className="h-7 w-7 rounded bg-secondary hover:bg-muted border border-border text-foreground text-xs font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                      <span className="text-xs font-bold text-muted-foreground ml-1">{item.unit}</span>
                    </div>
                  </div>
                </div>

                {/* REMOVE BUTTON */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/15 flex items-center justify-center transition cursor-pointer shrink-0"
                  title="Remove from list"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STANDALONE PRINT ROOT FOR A4 PDF
          VISIBLE IN PRINT & WHEN PREVIEW TOGGLE IS ACTIVE
          EXACTLY 2 PRODUCTS PER PAGE WITH MASSIVE PHOTOS & PRODUCT NAME
      ────────────────────────────────────────────────────────────── */}
      <div
        id="shopping-list-print-root"
        className={showScreenPreview ? "block mt-8 border-t border-border pt-6" : "hidden print:block"}
        style={{
          fontFamily: "Arial, sans-serif",
          color: "#000000",
          backgroundColor: "#ffffff",
        }}
      >
        {printPages.map((pageItems, pageIdx) => (
          <div
            key={pageIdx}
            className="a4-print-page"
            style={{
              pageBreakAfter: pageIdx === printPages.length - 1 ? "auto" : "always",
              breakAfter: pageIdx === printPages.length - 1 ? "auto" : "page",
              boxSizing: "border-box",
              width: "100%",
              maxWidth: "210mm",
              margin: "0 auto",
              padding: "16px 12px",
              backgroundColor: "#ffffff",
            }}
          >
            {/* Top Sheet Header */}
            <div style={{ borderBottom: "2.5px solid #000000", paddingBottom: "8px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <h1 style={{ fontSize: "22px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "-0.5px", margin: 0, color: "#000000" }}>
                    {storeSettings?.shop_name || "PONMANI AGENCIES"}
                  </h1>
                  <p style={{ fontSize: "11px", fontWeight: "bold", color: "#475569", margin: "2px 0 0 0" }}>
                    Shopping List • Wholesale Market Buying Sheet
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ display: "inline-block", padding: "3px 8px", backgroundColor: "#000000", color: "#ffffff", fontSize: "11px", fontWeight: "900", textTransform: "uppercase", borderRadius: "4px" }}>
                    Restock Sheet
                  </span>
                  <div style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: "bold", color: "#334155", marginTop: "4px" }}>
                    Date: {new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })} | Page {pageIdx + 1} of {printPages.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Exactly 2 Products Showcase Container */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px", margin: "4px 0" }}>
              {pageItems.map((item, itemIdx) => {
                const globalIdx = pageIdx * 2 + itemIdx + 1;

                return (
                  <div
                    key={item.id}
                    style={{
                      border: "2.5px solid #000000",
                      borderRadius: "16px",
                      padding: "16px",
                      backgroundColor: "#ffffff",
                      display: "flex",
                      gap: "24px",
                      alignItems: "center",
                      height: "114mm",
                      boxSizing: "border-box",
                      position: "relative",
                    }}
                  >
                    {/* BIG PRODUCT PICTURE */}
                    <div
                      style={{
                        width: "100mm",
                        height: "100%",
                        borderRadius: "12px",
                        border: "2px solid #cbd5e1",
                        backgroundColor: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flexShrink: 0,
                        position: "relative",
                      }}
                    >
                      {item.image_path ? (
                        <img
                          src={item.image_path}
                          alt={item.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            padding: "8px",
                          }}
                        />
                      ) : (
                        <div style={{ textAlign: "center", color: "#94a3b8", fontWeight: "bold", padding: "12px" }}>
                          <Package style={{ width: "64px", height: "64px", margin: "0 auto 8px", color: "#cbd5e1" }} />
                          <span style={{ fontSize: "12px", textTransform: "uppercase" }}>No Image</span>
                        </div>
                      )}

                      {/* Item Number Badge */}
                      <div
                        style={{
                          position: "absolute",
                          top: "8px",
                          left: "8px",
                          padding: "4px 10px",
                          backgroundColor: "#000000",
                          color: "#ffffff",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontFamily: "monospace",
                          fontWeight: "900",
                        }}
                      >
                        #{globalIdx}
                      </div>

                      {/* Physical Tick Box */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: "8px",
                          left: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          backgroundColor: "rgba(255, 255, 255, 0.96)",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          border: "2px solid #000000",
                        }}
                      >
                        <div
                          style={{
                            width: "16px",
                            height: "16px",
                            border: "2px solid #000000",
                            borderRadius: "3px",
                            backgroundColor: "#ffffff",
                          }}
                        />
                        <span style={{ fontSize: "11px", fontWeight: "900", color: "#000000" }}>BUY</span>
                      </div>
                    </div>

                    {/* PRODUCT NAME & QUANTITY TO BUY */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: "18px",
                        minWidth: 0,
                        paddingRight: "8px",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                            textTransform: "uppercase",
                            fontWeight: "bold",
                            color: "#64748b",
                            letterSpacing: "1px",
                          }}
                        >
                          PRODUCT NAME:
                        </span>
                        <h2
                          style={{
                            fontSize: "26px",
                            fontWeight: "900",
                            color: "#000000",
                            lineHeight: "1.25",
                            marginTop: "6px",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.name}
                        </h2>
                      </div>

                      {/* QUANTITY TO BUY IN PROMINENT BOX */}
                      <div
                        style={{
                          backgroundColor: "#f1f5f9",
                          border: "2.5px solid #000000",
                          padding: "14px 18px",
                          borderRadius: "12px",
                          display: "inline-block",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            textTransform: "uppercase",
                            fontWeight: "900",
                            letterSpacing: "1px",
                            color: "#475569",
                            display: "block",
                          }}
                        >
                          QUANTITY TO BUY:
                        </span>
                        <div
                          style={{
                            fontSize: "32px",
                            fontWeight: "900",
                            fontFamily: "monospace",
                            color: "#000000",
                            marginTop: "4px",
                          }}
                        >
                          {item.restock_qty} <span style={{ fontSize: "18px", fontWeight: "bold", color: "#334155" }}>{item.unit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* If page has only 1 product (odd count), render second card as clean market notes */}
              {pageItems.length === 1 && (
                <div
                  style={{
                    border: "2px dashed #cbd5e1",
                    borderRadius: "16px",
                    padding: "24px",
                    backgroundColor: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    height: "114mm",
                    boxSizing: "border-box",
                  }}
                >
                  <h4 style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#64748b", margin: 0 }}>
                    Handwritten Notes / Extra Market Items
                  </h4>
                  <p style={{ fontSize: "11px", color: "#94a3b8", maxWidth: "340px", marginTop: "4px", marginBottom: "16px" }}>
                    Blank space for owner to write down additional items at the wholesale market.
                  </p>
                  <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ borderBottom: "1.5px solid #cbd5e1", height: "18px" }}></div>
                    <div style={{ borderBottom: "1.5px solid #cbd5e1", height: "18px" }}></div>
                    <div style={{ borderBottom: "1.5px solid #cbd5e1", height: "18px" }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer */}
            <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", fontFamily: "monospace", color: "#64748b" }}>
              <span>Prepared for Wholesale Procurement • Ponmani Stores</span>
              <span>Page {pageIdx + 1} of {printPages.length}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PRODUCT PICKER MODAL (Browse Inventory with Big Images)
      ────────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs grid place-items-center p-4 print:hidden"
          onClick={() => setShowAddModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl card-surface rounded-2xl border-l-4 border-l-primary p-5 space-y-4 max-h-[85vh] flex flex-col shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" /> Pick Products for Shopping List
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Search products (e.g. test 2, test plates) and click to add to your list.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search + Category Filter Bar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  value={searchCatalogQuery}
                  onChange={(e) => setSearchCatalogQuery(e.target.value)}
                  placeholder="Search by product name (e.g. test 2, test plates)..."
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`h-7 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid with Big Photos */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {allProducts
                  .filter((p) => {
                    const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory;
                    const cleanQ = searchCatalogQuery.toLowerCase().trim();
                    const matchesSearch =
                      !cleanQ ||
                      p.name.toLowerCase().includes(cleanQ) ||
                      (p.barcode && p.barcode.toLowerCase().includes(cleanQ)) ||
                      (p.sku_code && p.sku_code.toLowerCase().includes(cleanQ));
                    return matchesCategory && matchesSearch;
                  })
                  .slice(0, 48)
                  .map((p) => {
                    const isAlreadyInList = restockList.some((it) => it.product_id === p.id);

                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-xl border transition flex gap-3 items-center text-left ${
                          isAlreadyInList
                            ? "bg-primary/10 border-primary/40"
                            : "bg-card hover:bg-secondary/50 border-border hover:border-primary/40"
                        }`}
                      >
                        {/* Big Photo Thumbnail */}
                        <div className="h-16 w-16 rounded-lg bg-muted border border-border overflow-hidden grid place-items-center shrink-0">
                          {p.image_path ? (
                            <img src={p.image_path} alt={p.name} className="h-full w-full object-contain" />
                          ) : (
                            <Package className="h-7 w-7 text-muted-foreground/60" />
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-foreground truncate" title={p.name}>
                            {p.name}
                          </h5>
                          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            Unit: {p.unit || "Pcs"}
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[100px]">
                              {p.category}
                            </span>
                            <button
                              onClick={() => handleAddProduct(p)}
                              className={`h-6 px-2.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                                isAlreadyInList
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground"
                              }`}
                            >
                              {isAlreadyInList ? <CheckCircle2 className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                              <span>{isAlreadyInList ? "Added" : "Add"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Bottom Close */}
            <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-mono">
                {restockList.length} items in shopping list
              </span>
              <button
                onClick={() => setShowAddModal(false)}
                className="h-9 px-5 rounded-lg bg-secondary border border-border text-foreground hover:bg-muted font-bold transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
