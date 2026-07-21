import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, InventoryItem } from "@/lib/db/db";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCart, computeTotals, type PaymentSplit } from "@/lib/cart-store";
import { inr, qty } from "@/lib/format";
import { Trash2, ScanBarcode, UserPlus, Search, Printer, Share2, CheckCircle2, Percent } from "lucide-react";

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
    cart.addOrIncrement({
      product_id: item.id,
      name: item.name,
      barcode: item.barcode,
      price: Number(item.selling_price),
      gst_rate: Number(item.gst_rate),
      stock_qty: Number(item.stock_qty),
    });
    toast.success(`Scanned: ${item.name} (${item.gst_rate}% GST)`);
    setScan("");
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
  const balance = totals.total - payTotal;

  function shareWhatsAppBill() {
    if (cart.lines.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    const mobile = cart.customerMobile || "919999999999";
    const text = encodeURIComponent(
      `*Ponmani Agencies Receipt*\nCustomer: ${cart.customerName || "Valued Customer"}\nTotal: ₹${totals.total}\nThank you for shopping with us!`
    );
    window.open(`https://wa.me/91${mobile}?text=${text}`, "_blank");
  }

  return (
    <div className="p-4 grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 h-full">
      <div className="space-y-3 min-w-0 flex flex-col">
        {/* Barcode & Search Controls */}
        <div className="card-surface p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <ScanBarcode className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
            <input
              ref={scanRef}
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleScan(scan); }}
              placeholder="Scan Barcode or type EAN… (press Enter)"
              className="w-full h-11 pl-10 pr-3 rounded-md bg-input border border-primary/40 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product catalog…"
              className="w-full h-11 pl-10 pr-3 rounded-md bg-input border border-border text-sm"
            />
          </div>
        </div>

        {/* Cart Table */}
        <div className="card-surface flex-1 overflow-auto min-h-[300px]">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-muted-foreground sticky top-0 bg-card border-b border-border">
              <tr>
                <th className="text-left px-3 py-2.5">Item & Barcode</th>
                <th className="text-right px-3 py-2.5">Unit Price</th>
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
                      className="h-8 rounded bg-input border border-border text-center font-mono text-xs px-1 font-bold"
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
                      value={l.qty}
                      onChange={(e) => cart.setQty(l.product_id, parseFloat(e.target.value) || 0)}
                      className="w-16 h-8 rounded bg-input border border-border text-center font-mono text-sm focus:border-primary"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      value={l.discount}
                      onChange={(e) => cart.setLineDiscount(l.product_id, parseFloat(e.target.value) || 0)}
                      className="w-16 h-8 rounded bg-input border border-border text-right font-mono text-sm px-2 focus:border-primary"
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

        {/* Quick Add Grid */}
        <div className="card-surface p-3">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-2 tracking-wider">
            Quick Add Products (Top Inventory)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {products.data?.map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  cart.addOrIncrement({
                    product_id: p.id,
                    name: p.name,
                    barcode: p.barcode,
                    price: Number(p.selling_price),
                    gst_rate: Number(p.gst_rate),
                    stock_qty: Number(p.stock_qty),
                  })
                }
                className="text-left p-2.5 rounded-md border border-border hover:border-primary/50 hover:bg-secondary/60 transition group"
              >
                <div className="text-xs font-semibold truncate group-hover:text-primary">{p.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground flex justify-between items-center mt-1">
                  <span>Stock: {qty(p.stock_qty)}</span>
                  <span className="text-emerald-400 font-bold">{p.gst_rate}% GST</span>
                  <span className="text-primary font-bold">{inr(p.selling_price)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Checkout Sidebar */}
      <aside className="card-surface p-4 flex flex-col gap-3 h-fit sticky top-4 border-l-2 border-l-primary/40">
        <div>
          <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5 tracking-wider flex items-center gap-1">
            <UserPlus className="h-3.5 w-3.5 text-primary" /> Customer Info
          </div>
          <div className="flex gap-2">
            <input
              value={cart.customerMobile}
              onChange={(e) => cart.setCustomer({ id: null, mobile: e.target.value, name: cart.customerName, loyalty: 0 })}
              onBlur={(e) => lookupCustomer(e.target.value)}
              placeholder="Mobile Number"
              className="flex-1 h-9 px-3 rounded bg-input border border-border font-mono text-sm focus:border-primary"
            />
          </div>
          <input
            value={cart.customerName}
            onChange={(e) => cart.setCustomer({ id: cart.customerId, mobile: cart.customerMobile, name: e.target.value, loyalty: cart.loyaltyAvailable })}
            placeholder="Customer Name (optional)"
            className="w-full h-9 px-3 mt-2 rounded bg-input border border-border text-sm focus:border-primary"
          />
          {cart.loyaltyAvailable > 0 && (
            <div className="text-[11px] mt-1.5 text-emerald-400 font-mono font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Available Loyalty: {qty(cart.loyaltyAvailable)} Pts
            </div>
          )}
        </div>

        <div className="space-y-2 pt-3 border-t border-border text-sm">
          <Row label="Cart Subtotal" value={inr(totals.subtotal)} />
          <Row
            label="Invoice Discount (₹)"
            input={
              <input
                type="number"
                min={0}
                value={cart.invoiceDiscount}
                onChange={(e) => cart.setInvoiceDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 h-7 rounded bg-input border border-border text-right font-mono text-xs px-2"
              />
            }
          />
          <Row
            label="Redeem Loyalty Pts"
            input={
              <input
                type="number"
                min={0}
                max={cart.loyaltyAvailable}
                value={cart.loyaltyRedeem}
                onChange={(e) => cart.setLoyaltyRedeem(parseFloat(e.target.value) || 0)}
                className="w-24 h-7 rounded bg-input border border-border text-right font-mono text-xs px-2"
              />
            }
          />
          <Row
            label={
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={cart.gstEnabled}
                  onChange={() => cart.toggleGst()}
                  className="rounded border-border accent-primary"
                />
                Apply GST Tax (Itemized %)
              </label>
            }
            value={inr(totals.gstAmount)}
          />
        </div>

        <div className="pt-3 border-t border-border flex justify-between items-baseline">
          <span className="text-xs uppercase font-bold text-muted-foreground">Grand Total</span>
          <span className="text-2xl font-mono font-bold text-primary">{inr(totals.total)}</span>
        </div>

        {/* Payment Split */}
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Payment Breakdown</div>
          {cart.payments.map((p, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={p.method}
                onChange={(e) => {
                  const np = [...cart.payments];
                  np[i] = { ...p, method: e.target.value as PaymentSplit["method"] };
                  cart.setPayments(np);
                }}
                className="h-9 rounded bg-input border border-border text-xs px-2 font-medium"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Credit">Store Credit</option>
              </select>
              <input
                type="number"
                value={p.amount}
                onChange={(e) => {
                  const np = [...cart.payments];
                  np[i] = { ...p, amount: parseFloat(e.target.value) || 0 };
                  cart.setPayments(np);
                }}
                className="flex-1 h-9 px-2 rounded bg-input border border-border text-right font-mono text-sm font-semibold"
              />
            </div>
          ))}
          <div className={`text-xs font-mono text-right font-semibold ${Math.abs(balance) < 0.01 ? "text-emerald-400" : "text-amber-400"}`}>
            Unpaid Balance: {inr(balance)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={shareWhatsAppBill}
            className="h-10 rounded-md bg-secondary text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 border border-border hover:bg-muted transition"
          >
            <Share2 className="h-3.5 w-3.5 text-emerald-400" /> WhatsApp
          </button>

          <button
            disabled={checkout.isPending || cart.lines.length === 0}
            onClick={() => checkout.mutate()}
            className="h-10 rounded-md bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1 hover:accent-glow disabled:opacity-50 transition"
          >
            <Printer className="h-3.5 w-3.5" /> {checkout.isPending ? "Saving..." : "Checkout & Print"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, input }: { label: any; value?: string; input?: any }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground">{label}</span>
      {input ?? <span className="font-mono font-medium">{value}</span>}
    </div>
  );
}