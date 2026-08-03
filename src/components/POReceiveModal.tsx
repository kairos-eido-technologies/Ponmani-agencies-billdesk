import React, { useState } from "react";
import { db } from "@/lib/db/db";
import { inr } from "@/lib/format";
import { X, CheckCircle, PackageCheck, Store, Warehouse, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface POReceiveModalProps {
  poId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function POReceiveModal({ poId, onClose, onSuccess }: POReceiveModalProps) {
  const poData = db.getPurchaseOrder(poId);
  const inventory = db.getInventory();

  if (!poData) return null;

  const { order, items } = poData;

  // Initialize allocation items state
  const [allocations, setAllocations] = useState(() => {
    return items.map((pi) => {
      const inv = pi.product_id ? inventory.find((i) => i.id === pi.product_id) : undefined;
      const currentSellingPrice = inv ? inv.selling_price : pi.cost_price * 1.25;

      return {
        product_id: pi.product_id || "",
        product_name: pi.product_name,
        qty: pi.qty,
        cost_price: pi.cost_price,
        selling_price: Math.round(currentSellingPrice * 100) / 100,
        shop_qty: pi.qty,
        godown_qty: 0,
        existing_shop: inv ? inv.stock_qty : 0,
        existing_godown: inv ? inv.godown_qty : 0,
      };
    });
  });

  function updateItem(index: number, fields: Partial<(typeof allocations)[0]>) {
    setAllocations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...fields };
      return next;
    });
  }

  function handleQuickDistribute(index: number, mode: "all_shop" | "all_godown" | "split") {
    const item = allocations[index];
    if (mode === "all_shop") {
      updateItem(index, { shop_qty: item.qty, godown_qty: 0 });
    } else if (mode === "all_godown") {
      updateItem(index, { shop_qty: 0, godown_qty: item.qty });
    } else if (mode === "split") {
      const half = Math.floor(item.qty / 2);
      updateItem(index, { shop_qty: half, godown_qty: item.qty - half });
    }
  }

  function handleConfirm() {
    db.receivePOWithAllocation(order.id, allocations);
    toast.success(`Purchase Order ${order.po_number} Received! Inventory & prices updated.`);
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-secondary/80 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 grid place-items-center text-emerald-400">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Receive Stock & Allocate Inventory
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                  {order.po_number}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Set selling price and split received stock between Main Shop Counter & Godown.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="p-3 bg-secondary/50 rounded-lg border border-border text-xs flex flex-wrap justify-between items-center gap-2 font-mono">
            <div>
              <span className="text-muted-foreground">Supplier: </span>
              <span className="font-bold text-foreground">{order.vendor_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Items: </span>
              <span className="font-bold text-primary">{items.length} Product(s)</span>
            </div>
            <div>
              <span className="text-muted-foreground">PO Total: </span>
              <span className="font-bold text-emerald-400">{inr(order.total_amount)}</span>
            </div>
          </div>

          <div className="space-y-4">
            {allocations.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-border/60">
                  <div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span>{item.product_name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                        Recv Qty: {item.qty}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-3 mt-0.5">
                      <span>Cost: {inr(item.cost_price)}</span>
                      <span>Current Shop: {item.existing_shop}</span>
                      <span>Current Godown: {item.existing_godown}</span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickDistribute(idx, "all_shop")}
                      className="px-2 py-1 rounded bg-secondary hover:bg-muted text-[10px] font-bold text-foreground border border-border"
                    >
                      🏬 All to Shop
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDistribute(idx, "all_godown")}
                      className="px-2 py-1 rounded bg-secondary hover:bg-muted text-[10px] font-bold text-foreground border border-border"
                    >
                      🏭 All to Godown
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDistribute(idx, "split")}
                      className="px-2 py-1 rounded bg-secondary hover:bg-muted text-[10px] font-bold text-foreground border border-border"
                    >
                      ⚖️ Split 50/50
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  {/* Selling Price Field */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                      <DollarSign className="h-3 w-3 text-emerald-400" /> Selling Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.selling_price}
                      onChange={(e) => updateItem(idx, { selling_price: parseFloat(e.target.value) || 0 })}
                      className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono font-bold text-foreground focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Main Shop Stock Qty Field */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                      <Store className="h-3 w-3 text-blue-400" /> Add to Main Shop Qty
                    </label>
                    <input
                      type="number"
                      value={item.shop_qty}
                      onChange={(e) => updateItem(idx, { shop_qty: parseInt(e.target.value) || 0 })}
                      className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono font-bold text-blue-400 focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Godown Stock Qty Field */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                      <Warehouse className="h-3 w-3 text-purple-400" /> Add to Godown Qty
                    </label>
                    <input
                      type="number"
                      value={item.godown_qty}
                      onChange={(e) => updateItem(idx, { godown_qty: parseInt(e.target.value) || 0 })}
                      className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono font-bold text-purple-400 focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-secondary/80 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-card hover:bg-muted text-xs font-semibold text-foreground border border-border transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md"
          >
            <CheckCircle className="h-4 w-4" /> Confirm Receive & Update Inventory
          </button>
        </div>
      </div>
    </div>
  );
}
