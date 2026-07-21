import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, Vendor, PurchaseOrder } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr, qty } from "@/lib/format";
import { Plus, Truck, ShoppingBag, FileSpreadsheet, X, CheckCircle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/purchase")({ component: PurchasePage });

function PurchasePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"orders" | "vendors">("orders");
  const [showPOModal, setShowPOModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);

  const vendors = useQuery({
    queryKey: ["local-vendors"],
    queryFn: async () => db.getVendors(),
  });

  const purchaseOrders = useQuery({
    queryKey: ["local-purchase-orders"],
    queryFn: async () => db.getPurchaseOrders(),
  });

  function exportVendorsExcel() {
    const data = (vendors.data || []).map((v) => ({
      'Supplier Name': v.name,
      'Company Name': v.company_name,
      'Phone': v.phone,
      'Email': v.email,
      'GSTIN': v.gst_number,
      'Address': v.address,
      'Balance Due (₹)': v.balance_due,
    }));
    ExcelEngine.exportToExcel(data, `Ponmani_Suppliers_${new Date().toISOString().split('T')[0]}`);
    toast.success("Suppliers exported to Excel");
  }

  function exportPOsExcel() {
    const data = (purchaseOrders.data || []).map(({ order }) => ({
      'PO Number': order.po_number,
      'Supplier': order.vendor_name,
      'Status': order.status,
      'Total Amount (₹)': order.total_amount,
      'Paid Amount (₹)': order.paid_amount,
      'Balance (₹)': order.total_amount - order.paid_amount,
      'Date': order.created_at.split('T')[0],
    }));
    ExcelEngine.exportToExcel(data, `Ponmani_Purchase_Orders_${new Date().toISOString().split('T')[0]}`);
    toast.success("Purchase orders exported to Excel");
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Purchase & Supplier Management"
        subtitle="Vendor onboarding, Purchase Orders, MOQ stock replenishment, and payment tracking"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => (activeTab === "vendors" ? exportVendorsExcel() : exportPOsExcel())}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-400" /> Export {activeTab === "vendors" ? "Suppliers" : "POs"}
            </button>

            {activeTab === "vendors" ? (
              <button
                onClick={() => setShowVendorModal(true)}
                className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
              >
                <Plus className="h-4 w-4" /> Onboard Supplier
              </button>
            ) : (
              <button
                onClick={() => setShowPOModal(true)}
                className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
              >
                <Plus className="h-4 w-4" /> Create PO
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-border gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-2 border-b-2 transition flex items-center gap-2 ${
            activeTab === "orders" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingBag className="h-4 w-4" /> Purchase Orders ({purchaseOrders.data?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("vendors")}
          className={`pb-2 border-b-2 transition flex items-center gap-2 ${
            activeTab === "vendors" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Truck className="h-4 w-4" /> Suppliers & Wholesalers ({vendors.data?.length ?? 0})
        </button>
      </div>

      {activeTab === "orders" ? (
        <div className="card-surface">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-muted-foreground tracking-wider bg-card border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5">PO Number</th>
                  <th className="text-left px-4 py-2.5">Supplier Name</th>
                  <th className="text-center px-4 py-2.5">Status</th>
                  <th className="text-right px-4 py-2.5">Total Amount</th>
                  <th className="text-right px-4 py-2.5">Paid</th>
                  <th className="text-right px-4 py-2.5">Due Balance</th>
                  <th className="text-right px-4 py-2.5">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchaseOrders.data?.map(({ order }) => {
                  const due = order.total_amount - order.paid_amount;
                  return (
                    <tr key={order.id} className="hover:bg-secondary/40 transition">
                      <td className="px-4 py-2.5 font-mono font-bold text-primary">{order.po_number}</td>
                      <td className="px-4 py-2.5 font-medium">{order.vendor_name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${
                            order.status === "Received" || order.status === "Paid"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">{inr(order.total_amount)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{inr(order.paid_amount)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${due > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                        {inr(due)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                        {order.created_at.split("T")[0]}
                      </td>
                    </tr>
                  );
                })}
                {purchaseOrders.data?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                      No Purchase Orders created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card-surface">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-muted-foreground tracking-wider bg-card border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5">Supplier / Business</th>
                  <th className="text-left px-4 py-2.5">Contact Phone</th>
                  <th className="text-left px-4 py-2.5">GSTIN</th>
                  <th className="text-left px-4 py-2.5">Address</th>
                  <th className="text-right px-4 py-2.5">Balance Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vendors.data?.map((v) => (
                  <tr key={v.id} className="hover:bg-secondary/40 transition">
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-foreground">{v.company_name}</div>
                      <div className="text-xs text-muted-foreground">{v.name}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{v.phone || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{v.gst_number || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-xs">{v.address || "—"}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${v.balance_due > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      {inr(v.balance_due)}
                    </td>
                  </tr>
                ))}
                {vendors.data?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                      No registered suppliers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showVendorModal && (
        <VendorModal
          onClose={() => setShowVendorModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["local-vendors"] });
            setShowVendorModal(false);
          }}
        />
      )}

      {showPOModal && (
        <CreatePOModal
          onClose={() => setShowPOModal(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["local-purchase-orders"] });
            qc.invalidateQueries({ queryKey: ["local-inventory-products"] });
            setShowPOModal(false);
          }}
        />
      )}
    </div>
  );
}

function VendorModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", company_name: "", phone: "", email: "", gst_number: "", address: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) { toast.error("Supplier name required"); return; }
    db.saveVendor(f);
    toast.success("Supplier onboarded");
    onSaved();
  }

  const ic = "w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono focus:outline-none focus:border-primary";
  const L = ({ label, children }: any) => <label className="block"><div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{label}</div>{children}</label>;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md card-surface p-5 border-l-4 border-l-primary">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground">Onboard New Supplier</div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <L label="Contact Person Name *">
            <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={ic} autoFocus />
          </L>
          <L label="Company / Firm Name">
            <input value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} className={ic} />
          </L>
          <div className="grid grid-cols-2 gap-2">
            <L label="Phone Number">
              <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={ic} />
            </L>
            <L label="GSTIN">
              <input value={f.gst_number} onChange={(e) => setF({ ...f, gst_number: e.target.value })} className={ic} />
            </L>
          </div>
          <L label="Address">
            <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={ic} />
          </L>
          <button type="submit" className="w-full h-10 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:accent-glow transition">
            Save Supplier
          </button>
        </form>
      </div>
    </div>
  );
}

function CreatePOModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const vendors = db.getVendors();
  const inventory = db.getInventory();

  const [vendorId, setVendorId] = useState(vendors[0]?.id || "");
  const [status, setStatus] = useState<"Draft" | "Sent" | "Received" | "Paid">("Received");
  const [paidAmount, setPaidAmount] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState(inventory[0]?.id || "");
  const [qtyInput, setQtyInput] = useState(10);
  const [items, setItems] = useState<{ product_id: string; product_name: string; qty: number; cost_price: number }[]>([]);

  function addItem() {
    const prod = inventory.find((p) => p.id === selectedProductId);
    if (!prod) return;
    setItems((prev) => [
      ...prev,
      {
        product_id: prod.id,
        product_name: prod.name,
        qty: qtyInput,
        cost_price: prod.cost_price,
      },
    ]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId) { toast.error("Select a supplier"); return; }
    if (items.length === 0) { toast.error("Add at least one item to PO"); return; }

    db.createPurchaseOrder({ vendor_id: vendorId, status, paid_amount: paidAmount }, items);
    toast.success("Purchase Order created & stock updated!");
    onCreated();
  }

  const total = items.reduce((s, i) => s + i.qty * i.cost_price, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl card-surface p-5 border-l-4 border-l-primary">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground">Create Purchase Order (PO)</div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Supplier</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full h-9 rounded bg-input border border-border px-3 text-xs"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.company_name || v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">PO Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 rounded bg-input border border-border px-3 text-xs"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent to Vendor</option>
                <option value="Received">Received (Increases Stock)</option>
                <option value="Paid">Fully Paid & Received</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-card rounded border border-border space-y-2">
            <div className="text-xs font-semibold text-foreground">Add Product Line Item</div>
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 h-9 rounded bg-input border border-border px-2 text-xs"
              >
                {inventory.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (Cost: ₹{p.cost_price})</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={qtyInput}
                onChange={(e) => setQtyInput(parseInt(e.target.value) || 1)}
                className="w-20 h-9 rounded bg-input border border-border px-2 text-center font-mono text-xs"
              />
              <button
                type="button"
                onClick={addItem}
                className="h-9 px-3 rounded bg-secondary text-foreground text-xs font-semibold border border-border hover:bg-muted"
              >
                + Add Item
              </button>
            </div>
          </div>

          {/* Items List */}
          <div className="max-h-40 overflow-auto border border-border rounded">
            <table className="w-full text-xs">
              <thead className="bg-card text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-1.5 text-left">Product</th>
                  <th className="px-3 py-1.5 text-center">Qty</th>
                  <th className="px-3 py-1.5 text-right">Cost Price</th>
                  <th className="px-3 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-medium">{it.product_name}</td>
                    <td className="px-3 py-1.5 text-center font-mono">{it.qty}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{inr(it.cost_price)}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold text-primary">{inr(it.qty * it.cost_price)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No line items added yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border items-center">
            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Advance Paid (₹)</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono"
              />
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-muted-foreground">PO Total</div>
              <div className="text-xl font-bold font-mono text-primary">{inr(total)}</div>
            </div>
          </div>

          <button type="submit" className="w-full h-10 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:accent-glow transition">
            Issue Purchase Order
          </button>
        </form>
      </div>
    </div>
  );
}
