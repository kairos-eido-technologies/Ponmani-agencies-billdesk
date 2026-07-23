import React, { useState, useEffect, useRef } from "react";
import { db, Invoice, InvoiceItem, InventoryItem } from "@/lib/db/db";
import { X, Plus, Trash2, Search, Save, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { qty } from "@/lib/format";

interface EditInvoiceModalProps {
  invoice: Invoice;
  items: InvoiceItem[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditInvoiceModal({
  invoice,
  items: initialItems,
  onClose,
  onSaved,
}: EditInvoiceModalProps) {
  const [customerName, setCustomerName] = useState(invoice.customer_name);
  const [customerMobile, setCustomerMobile] = useState(invoice.customer_mobile);
  const [invoiceType, setInvoiceType] = useState<"GST" | "NON_GST" | "MIXED">(invoice.invoice_type);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "CREDIT">(invoice.payment_method);
  const [discountAmount, setDiscountAmount] = useState(invoice.discount_amount);
  const [exchangeAmount, setExchangeAmount] = useState(invoice.exchange_amount || 0);
  const [exchangeNotes, setExchangeNotes] = useState(invoice.exchange_notes || "");
  
  // Custom items list in edit state
  const [editLines, setEditLines] = useState<any[]>(
    initialItems.map((it) => ({
      id: it.id,
      product_id: it.product_id,
      barcode: it.barcode,
      product_name: it.product_name,
      qty: it.qty,
      unit_price: it.unit_price,
      tax_rate: it.tax_rate,
      total_price: it.total_price,
    }))
  );

  // Search & Catalog Add fields
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const all = db.getInventory() || [];
    const clean = searchQuery.toLowerCase();
    const filtered = all.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(clean) ||
        (p.barcode || "").includes(clean) ||
        (p.category || "").toLowerCase().includes(clean)
    ).slice(0, 5);
    setSearchResults(filtered);
  }, [searchQuery]);

  // Handle adding an item from the catalog search
  function handleAddProduct(p: InventoryItem) {
    const existing = editLines.find((l) => l.product_id === p.id);
    if (existing) {
      setEditLines(
        editLines.map((l) =>
          l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l
        )
      );
    } else {
      setEditLines([
        ...editLines,
        {
          product_id: p.id,
          barcode: p.barcode || "",
          product_name: p.name,
          qty: 1,
          unit_price: Number(p.selling_price),
          tax_rate: Number(p.gst_rate),
          total_price: Number(p.selling_price),
        },
      ]);
    }
    setSearchQuery("");
    setSearchResults([]);
    toast.success(`Added: ${p.name}`);
  }

  // Handle line edits
  function updateLineQty(productId: string, newQty: number) {
    setEditLines(
      editLines.map((l) =>
        l.product_id === productId
          ? { ...l, qty: Math.max(1, newQty) }
          : l
      )
    );
  }

  function updateLinePrice(productId: string, newPrice: number) {
    setEditLines(
      editLines.map((l) =>
        l.product_id === productId
          ? { ...l, unit_price: Math.max(0, newPrice) }
          : l
      )
    );
  }

  function removeLine(productId: string) {
    setEditLines(editLines.filter((l) => l.product_id !== productId));
  }

  // Calculate totals live in the dialog
  let liveSubtotal = 0;
  let liveTax = 0;
  editLines.forEach((l) => {
    const gross = l.qty * l.unit_price;
    liveSubtotal += gross;
    if (invoiceType === "GST") {
      liveTax += (gross * l.tax_rate) / 100;
    }
  });
  const liveGrandTotal = Math.max(0, liveSubtotal + liveTax - discountAmount - exchangeAmount);

  async function handleSave() {
    if (editLines.length === 0) {
      toast.error("Invoice must have at least 1 item");
      return;
    }
    setIsSaving(true);
    try {
      await db.updateInvoice(invoice.id, {
        customer_name: customerName || "Walk-in Customer",
        customer_mobile: customerMobile,
        invoice_type: invoiceType,
        discount_amount: Number(discountAmount) || 0,
        exchange_amount: Number(exchangeAmount) || 0,
        exchange_notes: exchangeNotes,
        payment_method: paymentMethod,
        items: editLines.map((l) => ({
          id: l.id,
          product_id: l.product_id,
          barcode: l.barcode,
          product_name: l.product_name,
          qty: Number(l.qty),
          unit_price: Number(l.unit_price),
          tax_rate: Number(l.tax_rate),
        })),
      });
      toast.success(`Invoice ${invoice.invoice_number} successfully updated!`);
      onSaved();
    } catch (err: any) {
      toast.error("Failed to update invoice: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                Edit Bill: {invoice.invoice_number}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Original Date: {new Date(invoice.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content Split Layout */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-12 gap-5">
          {/* LEFT: Items List Editor */}
          <div className="col-span-8 space-y-4">
            {/* Search and Add to Bill */}
            <div className="relative">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search and add products to this bill…"
                  className="w-full h-10 pl-9 pr-3 rounded bg-input border border-border text-xs focus:outline-none focus:border-primary"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-11 left-0 right-0 z-30 bg-card border border-border rounded-lg shadow-xl divide-y divide-border">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      className="w-full p-2.5 hover:bg-secondary flex justify-between items-center text-left text-xs transition"
                    >
                      <div>
                        <div className="font-bold">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Stock: {p.stock_qty} | Barcode: {p.barcode}
                        </div>
                      </div>
                      <div className="text-primary font-bold">
                        ₹{Number(p.selling_price).toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Invoice Line Items */}
            <div className="border border-border rounded-lg max-h-[380px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground tracking-wider border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2">Item Description</th>
                    <th className="text-center px-3 py-2 w-24">Qty</th>
                    <th className="text-right px-3 py-2 w-28">Rate (₹)</th>
                    <th className="text-right px-3 py-2 w-28">Amount</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono bg-card">
                  {editLines.map((l) => (
                    <tr key={l.product_id} className="hover:bg-secondary/20 transition">
                      <td className="px-3 py-2 font-sans">
                        <div className="font-bold text-foreground">{l.product_name}</div>
                        {l.barcode && (
                          <div className="text-[9px] text-muted-foreground font-mono">
                            {l.barcode} {l.tax_rate > 0 && `(GST ${l.tax_rate}%)`}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          value={l.qty}
                          onChange={(e) =>
                            updateLineQty(l.product_id, parseInt(e.target.value) || 1)
                          }
                          className="w-16 h-7 rounded border border-border bg-input text-center text-xs font-bold text-foreground"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={l.unit_price}
                          onChange={(e) =>
                            updateLinePrice(l.product_id, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 h-7 rounded border border-border bg-input text-right text-xs font-bold text-foreground px-1.5"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-foreground">
                        ₹{(l.qty * l.unit_price).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(l.product_id)}
                          className="h-6 w-6 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Invoice Meta & Summary */}
          <div className="col-span-4 space-y-4 border-l border-border pl-5">
            <div className="text-xs uppercase font-bold text-muted-foreground border-b border-border pb-1">
              Customer Info
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Customer Name
                </label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-9 rounded bg-input border border-border px-3 text-xs text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Mobile Number
                </label>
                <input
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full h-9 rounded bg-input border border-border px-3 text-xs text-foreground font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                    Invoice Type
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value as any)}
                    className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-semibold"
                  >
                    <option value="GST">GST Tax</option>
                    <option value="NON_GST">Non-GST</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-semibold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                    Invoice Discount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 rounded bg-input border border-border px-3 text-xs text-foreground font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-amber-500 block mb-1">
                    Exchange Value (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={exchangeAmount || ""}
                    onChange={(e) => setExchangeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 rounded bg-input border border-border px-3 text-xs text-amber-500 font-mono font-bold"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                    Exchange Notes
                  </label>
                  <input
                    type="text"
                    value={exchangeNotes}
                    onChange={(e) => setExchangeNotes(e.target.value)}
                    className="w-full h-9 rounded bg-input border border-border px-3 text-xs text-foreground"
                    placeholder="e.g. Old Prestige Cooker"
                  />
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-400 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Updating an old bill will automatically calculate stock differences and restore/deduct items from the local Shop stock catalog.
              </div>
            </div>

            {/* Live Totals Box */}
            <div className="bg-secondary/40 border border-border rounded-lg p-4 font-mono space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-foreground">₹{liveSubtotal.toFixed(2)}</span>
              </div>
              {invoiceType === "GST" && (
                <div className="flex justify-between">
                  <span>GST Tax:</span>
                  <span className="text-foreground">₹{liveTax.toFixed(2)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Discount:</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {exchangeAmount > 0 && (
                <div className="flex justify-between text-amber-500">
                  <span>Exchange ({exchangeNotes || "Old Item"}):</span>
                  <span>-₹{exchangeAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-primary">
                <span>Grand Total:</span>
                <span>₹{liveGrandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-border bg-card flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-secondary hover:bg-muted border border-border text-foreground text-xs font-bold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 px-6 rounded-lg bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Invoice Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
