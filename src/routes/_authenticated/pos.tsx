import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, InventoryItem } from "@/lib/db/db";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCart, computeTotals, type PaymentSplit } from "@/lib/cart-store";
import { inr, qty } from "@/lib/format";
import { Trash2, ScanBarcode, UserPlus, Search, Printer, Share2, CheckCircle2, Percent, AlertTriangle, Store, Warehouse } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pos")({ component: POSPage });

function POSPage() {
  const cart = useCart();
  const totals = computeTotals(cart as any);
  const [scan, setScan] = useState("");
  const [search, setSearch] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { scanRef.current?.focus(); }, []);

  const products = useQuery({
    queryKey: ["pos-local-products", search],
    queryFn: async () => {
      const all = db.getInventory();
      if (!search.trim()) return all.slice(0, 30);
      const clean = search.toLowerCase();
      return all.filter(
        (p) => p.name.toLowerCase().includes(clean) || p.barcode.includes(clean) || p.category.toLowerCase().includes(clean)
      ).slice(0, 30);
    },
  });

  function handleScan(code: string) {
    if (!code.trim()) return;
    const item = db.getProductByBarcode(code.trim());
    if (!item) {
      toast.error("Barcode not found in local catalog: " + code);
      setScan("");
      return;
    }

    const shopQty = Number(item.stock_qty || 0);
    const godownQty = Number(item.godown_qty || 0);

    if (shopQty <= 0) {
      if (godownQty > 0) {
        toast.error(`Stock is in Godown (${godownQty} ${item.unit || 'pcs'} available). Transfer to Shop Stock before billing!`);
      } else {
        toast.error(`Out of stock in Shop & Godown for: ${item.name}`);
      }
      setScan("");
      return;
    }

    const existingLine = cart.lines.find((l) => l.product_id === item.id);
    const currentCartQty = existingLine ? existingLine.qty : 0;
    if (currentCartQty + 1 > shopQty) {
      toast.error(`Cannot add more! Only ${shopQty} ${item.unit || 'pcs'} available in Shop Stock. Transfer from Godown to bill more!`);
      setScan("");
      return;
    }

    cart.addOrIncrement({
      product_id: item.id,
      name: item.name,
      barcode: item.barcode,
      price: Number(item.selling_price),
      gst_rate: Number(item.gst_rate),
      stock_qty: shopQty,
    });
    toast.success(`Scanned: ${item.name} (${item.gst_rate}% GST)`);
    setScan("");
  }

  function handleProductClick(p: InventoryItem) {
    const shopQty = Number(p.stock_qty || 0);
    const godownQty = Number(p.godown_qty || 0);

    if (shopQty <= 0) {
      if (godownQty > 0) {
        toast.error(`Cannot bill ${p.name}! Stock is currently in Godown (${godownQty} ${p.unit || 'pcs'}). Transfer to Shop Stock first!`);
      } else {
        toast.error(`${p.name} is currently out of stock!`);
      }
      return;
    }

    const existingLine = cart.lines.find((l) => l.product_id === p.id);
    const currentQtyInCart = existingLine ? existingLine.qty : 0;

    if (currentQtyInCart + 1 > shopQty) {
      toast.error(`Cannot add more! Only ${shopQty} ${p.unit || 'pcs'} in Shop Stock. Transfer remaining from Godown to bill more!`);
      return;
    }

    cart.addOrIncrement({
      product_id: p.id,
      name: p.name,
      barcode: p.barcode,
      price: Number(p.selling_price),
      gst_rate: Number(p.gst_rate),
      stock_qty: shopQty,
    });
  }

  function lookupCustomer(mobile: string) {
    if (!mobile.trim()) return;
    const cust = db.getCustomerByMobile(mobile);
    if (cust) {
      cart.setCustomer({ id: cust.id, mobile: cust.mobile, name: cust.name, loyalty: Number(cust.loyalty_points) });
      toast.success(`Found Customer: ${cust.name} (${cust.loyalty_points} Loyalty Pts)`);
    } else {
      cart.setCustomer({ id: null, mobile, name: "", loyalty: 0 });
    }
  }

  const checkout = useMutation({
    mutationFn: async () => {
      if (cart.lines.length === 0) throw new Error("Cart is empty");

      const saleData = {
        customer_id: cart.customerId || undefined,
        customer_name: cart.customerName || "Walk-in Customer",
        customer_mobile: cart.customerMobile || "",
        invoice_type: (cart.gstEnabled ? "GST" : "NON_GST") as any,
        discount_amount: cart.invoiceDiscount,
        payment_method: (cart.payments[0]?.method?.toUpperCase() || "CASH") as any,
        loyalty_points_redeemed: cart.loyaltyRedeem,
        items: cart.lines.map((l) => ({
          product_id: l.product_id,
          barcode: l.barcode || '',
          product_name: l.name,
          qty: l.qty,
          unit_price: l.price,
          tax_rate: l.gst_rate,
        })),
      };

      const createdInvoice = db.createInvoice(saleData);
      return createdInvoice;
    },
    onSuccess: (inv) => {
      toast.success(`Invoice ${inv.invoice_number} saved & ready in Billing Hub!`);
      cart.clear();
      qc.invalidateQueries();
      navigate({ to: "/invoices/$id", params: { id: inv.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const payTotal = cart.payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="p-4 grid grid-cols-12 gap-4 min-h-[calc(100vh-4rem)]">
      {/* LEFT: Billing POS Station */}
      <div className="col-span-8 space-y-3 flex flex-col">
        {/* Top Barcode & Search Controls */}
        <div className="card-surface p-3 grid grid-cols-2 gap-3">
          <div className="relative">
            <ScanBarcode className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
            <input
              ref={scanRef}
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan(scan)}
              placeholder="Scan Barcode (Prefix PMA...) + Press Enter"
              className="w-full h-9 pl-9 pr-3 rounded bg-input border border-border text-xs font-mono focus:border-primary text-foreground"
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, category, SKU…"
              className="w-full h-9 pl-9 pr-3 rounded bg-input border border-border text-xs font-mono text-foreground"
            />
          </div>
        </div>

        {/* Cart Line Items Table */}
        <div className="card-surface flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border flex justify-between items-center bg-card">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Current POS Sale Cart ({cart.lines.length} Line Items)
            </span>
            <button onClick={() => cart.clear()} className="text-xs text-muted-foreground hover:text-destructive transition">
              Clear Cart
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-card text-[10px] uppercase text-muted-foreground sticky top-0 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2.5">Item Description</th>
                  <th className="text-right px-3 py-2.5 w-24">Price (₹)</th>
                  <th className="text-center px-3 py-2.5 w-20">GST %</th>
                  <th className="text-center px-3 py-2.5 w-20">Qty</th>
                  <th className="text-right px-3 py-2.5 w-20">Discount</th>
                  <th className="text-right px-3 py-2.5">Subtotal</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cart.lines.map((l) => (
                  <tr key={l.product_id} className="hover:bg-secondary/40 transition">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-foreground">{l.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
                        <span>Barcode: {l.barcode || 'N/A'}</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                          {l.gst_rate}% GST
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{inr(l.price)}</td>
                    <td className="px-3 py-2 text-center">
                      <select
                        value={l.gst_rate}
                        onChange={(e) => cart.setLineGstRate(l.product_id, parseFloat(e.target.value) || 0)}
                        className="h-8 rounded bg-input border border-border text-center font-mono text-xs px-1 font-bold text-foreground"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min={1}
                        max={l.stock_qty}
                        value={l.qty}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (val > l.stock_qty) {
                            toast.error(`Cannot set higher than Shop Stock (${l.stock_qty} available)!`);
                            cart.setQty(l.product_id, l.stock_qty);
                          } else {
                            cart.setQty(l.product_id, val);
                          }
                        }}
                        className="w-16 h-8 rounded bg-input border border-border text-center font-mono text-sm focus:border-primary text-foreground"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        value={l.discount}
                        onChange={(e) => cart.setLineDiscount(l.product_id, parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 rounded bg-input border border-border text-right font-mono text-sm px-2 focus:border-primary text-foreground"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-primary">
                      {inr(l.price * l.qty - l.discount)}
                    </td>
                    <td className="px-2 text-center">
                      <button onClick={() => cart.remove(l.product_id)} className="p-1 hover:text-destructive text-muted-foreground">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.lines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-sm text-muted-foreground">
                      <ScanBarcode className="h-8 w-8 mx-auto mb-2 opacity-30 text-primary" />
                      Scan barcode or click items below to populate sale items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Add Catalog Grid */}
        <div className="card-surface p-3">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-2 tracking-wider flex justify-between">
            <span>Quick Add Products (Shop Stock Billable Only)</span>
            <span className="text-amber-400 font-mono">* Godown Stock requires Transfer before Billing</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {products.data?.map((p) => {
              const shopQty = Number(p.stock_qty || 0);
              const godownQty = Number(p.godown_qty || 0);
              const isShopOutOfStock = shopQty <= 0;

              return (
                <button
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className={`text-left p-2.5 rounded-md border transition group relative ${
                    isShopOutOfStock
                      ? "bg-secondary/20 border-amber-500/40 opacity-75 cursor-not-allowed"
                      : "border-border hover:border-primary/50 hover:bg-secondary/60"
                  }`}
                >
                  <div className="text-xs font-semibold truncate group-hover:text-primary flex justify-between items-center">
                    <span className="truncate">{p.name}</span>
                    {isShopOutOfStock && godownQty > 0 ? (
                      <span className="text-[9px] px-1 bg-amber-500/20 text-amber-400 font-bold rounded border border-amber-500/40">
                        Transfer Req
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground flex justify-between items-center mt-1">
                    <span className={isShopOutOfStock ? "text-amber-400 font-bold" : "text-foreground"}>
                      Shop: {qty(shopQty)}
                    </span>
                    <span className="text-muted-foreground">Godown: {qty(godownQty)}</span>
                    <span className="text-primary font-bold">{inr(p.selling_price)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Customer & Payment Sidebar */}
      <div className="col-span-4 space-y-3 flex flex-col">
        {/* Customer Selector Card */}
        <div className="card-surface p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <UserPlus className="h-4 w-4 text-primary" /> Customer Account Selection
          </div>

          <div className="flex gap-2">
            <input
              value={cart.customerMobile}
              onChange={(e) => cart.setCustomer({ id: cart.customerId, mobile: e.target.value, name: cart.customerName, loyalty: cart.customerLoyalty })}
              onBlur={(e) => lookupCustomer(e.target.value)}
              placeholder="Customer Mobile (10 digits)"
              className="flex-1 h-9 px-3 rounded bg-input border border-border text-xs font-mono focus:border-primary text-foreground"
            />
          </div>

          <input
            value={cart.customerName}
            onChange={(e) => cart.setCustomer({ id: cart.customerId, mobile: cart.customerMobile, name: e.target.value, loyalty: cart.customerLoyalty })}
            placeholder="Customer Name (Walk-in Customer)"
            className="w-full h-9 px-3 rounded bg-input border border-border text-xs font-mono text-foreground"
          />

          {cart.customerLoyalty > 0 && (
            <div className="p-2.5 bg-primary/10 border border-primary/30 rounded flex justify-between items-center text-xs">
              <span className="font-semibold text-primary">Loyalty Points Available: {cart.customerLoyalty}</span>
              <button
                type="button"
                onClick={() => cart.setLoyaltyRedeem(Math.min(cart.customerLoyalty, totals.grandTotal))}
                className="px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-bold"
              >
                Redeem
              </button>
            </div>
          )}
        </div>

        {/* GST Billing Toggle */}
        <div className="card-surface p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-emerald-400" /> GST Invoice Mode
            </div>
            <div className="text-[10px] text-muted-foreground">Includes SGST & CGST Breakdown</div>
          </div>
          <button
            onClick={() => cart.setGstEnabled(!cart.gstEnabled)}
            className={`h-7 px-3 rounded-full text-xs font-bold transition border ${
              cart.gstEnabled ? "bg-emerald-500 text-white border-emerald-400" : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {cart.gstEnabled ? "GST Invoice ON" : "NON-GST Invoice"}
          </button>
        </div>

        {/* Payment Summary */}
        <div className="card-surface p-4 flex-1 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
              Sale Financial Breakdown
            </div>

            <div className="flex justify-between text-xs font-mono">
              <span className="text-muted-foreground">Subtotal Items:</span>
              <span className="font-semibold text-foreground">{inr(totals.subtotal)}</span>
            </div>

            {cart.gstEnabled && (
              <>
                <div className="flex justify-between text-xs font-mono text-emerald-400">
                  <span>CGST (Output Tax):</span>
                  <span>{inr(totals.cgst)}</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-emerald-400">
                  <span>SGST (Output Tax):</span>
                  <span>{inr(totals.sgst)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center text-xs font-mono pt-1">
              <span className="text-muted-foreground">Bill Discount (₹):</span>
              <input
                type="number"
                value={cart.invoiceDiscount || ""}
                onChange={(e) => cart.setInvoiceDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-20 h-7 rounded bg-input border border-border text-right px-2 font-bold text-foreground"
              />
            </div>

            {cart.loyaltyRedeem > 0 && (
              <div className="flex justify-between text-xs font-mono text-primary">
                <span>Loyalty Discount:</span>
                <span>-{inr(cart.loyaltyRedeem)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-border flex justify-between items-center">
              <span className="text-sm font-bold text-foreground">Grand Total:</span>
              <span className="text-2xl font-black font-mono text-primary">{inr(totals.grandTotal)}</span>
            </div>
          </div>

          <button
            disabled={cart.lines.length === 0 || checkout.isPending}
            onClick={() => checkout.mutate()}
            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-black text-sm uppercase tracking-wider hover:accent-glow transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Printer className="h-5 w-5" />
            {checkout.isPending ? "Processing Invoice..." : "Save & Print Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}