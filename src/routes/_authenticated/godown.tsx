import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { qty } from "@/lib/format";
import { Warehouse, ArrowLeftRight, FileSpreadsheet, Plus, X, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/godown")({ component: GodownPage });

function GodownPage() {
  const qc = useQueryClient();
  const [showTransferModal, setShowTransferModal] = useState(false);

  const inventory = useQuery({
    queryKey: ["local-godown-inventory"],
    queryFn: async () => db.getInventory(),
  });

  const transfers = useQuery({
    queryKey: ["local-godown-transfers"],
    queryFn: async () => db.getGodownTransfers(),
  });

  function exportGodownExcel() {
    const data = (inventory.data || []).map((p) => ({
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
        title="Godown & Dual-Location Stock Management"
        subtitle="Stock distribution between Main Godown Warehouse and Shop Counter"
        action={
          <div className="flex gap-2">
            <button
              onClick={exportGodownExcel}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-400" /> Export Godown Report
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
            >
              <ArrowLeftRight className="h-4 w-4" /> Transfer Stock
            </button>
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface p-4 border-l-4 border-l-primary">
          <div className="text-xs text-muted-foreground mb-1">Shop Floor Stock</div>
          <div className="text-2xl font-bold font-mono text-primary">
            {qty((inventory.data || []).reduce((s, p) => s + p.stock_qty, 0))} Units
          </div>
        </div>
        <div className="card-surface p-4 border-l-4 border-l-blue-500">
          <div className="text-xs text-muted-foreground mb-1">Main Godown Reserve</div>
          <div className="text-2xl font-bold font-mono text-blue-400">
            {qty((inventory.data || []).reduce((s, p) => s + p.godown_qty, 0))} Units
          </div>
        </div>
        <div className="card-surface p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs text-muted-foreground mb-1">Total Warehouse Asset Stock</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {qty((inventory.data || []).reduce((s, p) => s + p.stock_qty + p.godown_qty, 0))} Units
          </div>
        </div>
      </div>

      {/* Stock Grid Table */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <div className="card-surface p-4 space-y-3">
          <div className="text-sm font-bold text-foreground pb-2 border-b border-border">
            Location-wise Stock Distribution
          </div>
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-muted-foreground bg-card border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-right px-3 py-2">Shop Floor</th>
                  <th className="text-right px-3 py-2">Main Godown</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inventory.data?.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/40 transition">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-foreground">{p.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{p.barcode}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-primary">{qty(p.stock_qty)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-blue-400">{qty(p.godown_qty)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                      {qty(p.stock_qty + p.godown_qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

function TransferModal({ onClose, onTransferred }: { onClose: () => void; onTransferred: () => void }) {
  const inventory = db.getInventory();
  const [productId, setProductId] = useState(inventory[0]?.id || "");
  const [transferType, setTransferType] = useState<"GODOWN_TO_SHOP" | "SHOP_TO_GODOWN">("GODOWN_TO_SHOP");
  const [qtyInput, setQtyInput] = useState(5);
  const [notes, setNotes] = useState("");

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
  const L = ({ label, children }: any) => <label className="block"><div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{label}</div>{children}</label>;

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
          <L label="Select Product *">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-semibold"
            >
              {inventory.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Shop: {p.stock_qty} | Godown: {p.godown_qty})
                </option>
              ))}
            </select>
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
