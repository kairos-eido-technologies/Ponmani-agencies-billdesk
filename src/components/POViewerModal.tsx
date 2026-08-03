import React, { useState, useEffect, useRef } from "react";
import { db, PurchaseOrder, PurchaseItem, Vendor } from "@/lib/db/db";
import { inr } from "@/lib/format";
import { Printer, X, MessageSquare, Clipboard, Check, Edit3, Send, Save, Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { captureReceiptAsImage } from "@/lib/capture-receipt-image";
import { PonmaniLogo } from "./PonmaniLogo";

interface POViewerModalProps {
  poId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export function POViewerModal({ poId, onClose, onUpdated }: POViewerModalProps) {
  const poData = db.getPurchaseOrder(poId);
  const storeSettings = db.getSettings();
  const vendors = db.getVendors();

  const [order, setOrder] = useState<PurchaseOrder | null>(poData?.order || null);
  const [items, setItems] = useState<PurchaseItem[]>(poData?.items || []);
  const [notes, setNotes] = useState<string>(poData?.order.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [copiedTxt, setCopiedTxt] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const poDocumentRef = useRef<HTMLDivElement>(null);

  const vendor: Vendor | undefined = vendors.find((v) => v.id === order?.vendor_id);

  useEffect(() => {
    if (vendor?.phone) {
      setWhatsappPhone(vendor.phone);
    }
  }, [vendor]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!order) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
        <div className="card-surface p-6 max-w-sm text-center">
          <p className="text-sm text-muted-foreground">Purchase Order not found.</p>
          <button onClick={onClose} className="mt-4 px-4 py-1.5 bg-primary text-xs font-bold rounded">Close</button>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.cost_price), 0);
  const tax = order.tax_amount || 0;
  const discount = order.discount_amount || 0;
  const grandTotal = order.total_amount;
  const due = grandTotal - order.paid_amount;

  function handleSaveNotes() {
    if (!order) return;
    db.savePurchaseOrder(
      { ...order, notes },
      items.map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        qty: it.qty,
        unit: it.unit,
        cost_price: it.cost_price,
        gst_rate: it.gst_rate,
      }))
    );
    setOrder({ ...order, notes });
    setIsEditingNotes(false);
    toast.success("Custom order notes updated!");
    if (onUpdated) onUpdated();
  }

  async function handleExportPOImage(openWhatsApp: boolean = false) {
    if (!poDocumentRef.current) {
      toast.error("Purchase Order document element unavailable");
      return;
    }
    try {
      setIsExportingImage(true);
      toast.info("Generating Purchase Order PNG image...");

      const filename = `Purchase_Order_${order?.po_number || 'PO'}.png`;
      const ok = await captureReceiptAsImage(poDocumentRef.current, filename);

      if (ok) {
        if (openWhatsApp) {
          let cleanPhone = whatsappPhone.replace(/\D/g, "");
          if (!cleanPhone && vendor?.phone) {
            cleanPhone = vendor.phone.replace(/\D/g, "");
          }
          if (cleanPhone.length === 10) {
            cleanPhone = "91" + cleanPhone;
          }
          const waUrl = cleanPhone
            ? `https://wa.me/${cleanPhone}`
            : `https://web.whatsapp.com`;

          window.open(waUrl, "_blank");
          toast.success("PO Image copied! WhatsApp opened — press Ctrl+V to paste and send!");
        } else {
          toast.success("Purchase Order PNG image generated & downloaded!");
        }
      } else {
        toast.error("Failed to generate Purchase Order image");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Purchase Order image");
    } finally {
      setIsExportingImage(false);
    }
  }

  function generateWhatsAppText(): string {
    const shopName = storeSettings?.shop_name || "PONMANI AGENCIES";
    const shopPhone = storeSettings?.shop_phone || "+91 94422 12345";
    const shopAddress = storeSettings?.shop_address || "Tenkasi, Tamil Nadu";
    const shopGst = storeSettings?.shop_gstin || "";

    let t = `*PURCHASE ORDER: ${order?.po_number}*\n`;
    t += `*${shopName.toUpperCase()}*\n`;
    t += `${shopAddress}\n`;
    t += `Ph: ${shopPhone}\n`;
    t += `-------------------------------\n`;
    t += `*Supplier:* ${vendor?.company_name || order?.vendor_name}\n`;
    if (vendor?.name && vendor?.name !== vendor?.company_name) t += `*Contact:* ${vendor.name}\n`;
    if (vendor?.phone) t += `*Phone:* ${vendor.phone}\n`;
    t += `*PO Date:* ${order?.created_at.split("T")[0]}\n`;
    if (order?.expected_date) t += `*Expected Delivery:* ${order.expected_date}\n`;
    t += `*Status:* ${order?.status}\n`;
    t += `-------------------------------\n`;
    t += `*ORDERED ITEMS:*\n`;

    items.forEach((it, idx) => {
      const name = it.product_name || "Item #" + (idx + 1);
      const qtyStr = `${it.qty} ${it.unit || "Pcs"}`;
      const rateStr = it.cost_price.toFixed(2);
      const lineTot = (it.qty * it.cost_price).toFixed(2);
      t += `${idx + 1}. *${name}* — ${qtyStr} @ ₹${rateStr} = *₹${lineTot}*\n`;
    });

    t += `-------------------------------\n`;
    t += `*Subtotal:* ₹${subtotal.toFixed(2)}\n`;
    if (tax > 0) t += `*Tax (+):* ₹${tax.toFixed(2)}\n`;
    if (discount > 0) t += `*Discount (-):* ₹${discount.toFixed(2)}\n`;
    t += `*GRAND TOTAL: ₹${grandTotal.toFixed(2)}*\n`;
    if (order?.paid_amount && order.paid_amount > 0) t += `*Advance Paid:* ₹${order.paid_amount.toFixed(2)}\n`;
    t += `*Balance Due:* ₹${due.toFixed(2)}\n`;

    if (notes.trim()) {
      t += `-------------------------------\n`;
      t += `*CUSTOM INSTRUCTIONS / NOTES:*\n_${notes.trim()}_\n`;
    }

    t += `-------------------------------\n`;
    t += `_Please acknowledge receipt of this Purchase Order._`;
    return t;
  }

  function handleCopyWhatsAppText() {
    const rawText = generateWhatsAppText();
    navigator.clipboard.writeText(rawText);
    setCopiedTxt(true);
    toast.success("WhatsApp order text copied to clipboard!");
    setTimeout(() => setCopiedTxt(false), 2000);
  }

  function handleSendWhatsApp() {
    let cleanPhone = whatsappPhone.replace(/\D/g, "");
    if (!cleanPhone && vendor?.phone) {
      cleanPhone = vendor.phone.replace(/\D/g, "");
    }
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }
    const rawText = generateWhatsAppText();
    const encoded = encodeURIComponent(rawText);
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* Modal Top Bar - Hidden in Print */}
        <div className="px-5 py-3.5 bg-secondary/80 border-b border-border flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm text-primary bg-primary/10 px-2.5 py-1 rounded border border-primary/20">
              {order.po_number}
            </span>
            <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
              order.status === "Received"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : order.status === "Ordered"
                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}>
              {order.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportPOImage(false)}
              disabled={isExportingImage}
              title="Download PO as PNG image"
              className="h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ImageIcon className="h-3.5 w-3.5" /> PO Image
            </button>

            <button
              onClick={() => setShowWhatsAppDialog(!showWhatsAppDialog)}
              className="h-8 px-3 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-600/30 transition"
            >
              <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Order
            </button>

            <button
              onClick={() => window.print()}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
            >
              <Printer className="h-3.5 w-3.5" /> Print PO (A4)
            </button>

            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* WhatsApp Quick Options Panel — floating overlay, doesn't push PO content */}
        {showWhatsAppDialog && (
          <div className="absolute inset-x-0 top-[52px] z-20 print:hidden">
            <div className="mx-4 mt-1 bg-emerald-950/95 border border-emerald-800/60 rounded-xl shadow-2xl p-4 space-y-3 backdrop-blur-sm animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                <span className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4" /> Share Order via WhatsApp</span>
                <button onClick={() => setShowWhatsAppDialog(false)} className="text-muted-foreground hover:text-foreground text-base leading-none">✕</button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Supplier WhatsApp Number</label>
                  <input
                    type="text"
                    placeholder="Vendor WhatsApp Phone (e.g. 9876543210)"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    className="w-full h-9 rounded bg-card border border-border px-3 text-xs font-mono"
                  />
                </div>

                {/* Image Format Option (Recommended) */}
                <button
                  disabled={isExportingImage}
                  onClick={() => handleExportPOImage(true)}
                  className="w-full p-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg flex items-start gap-3 text-left transition"
                >
                  <ImageIcon className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-emerald-400">
                      Send PO as Image to Supplier (Recommended)
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Copies PO image to clipboard and opens WhatsApp — just Ctrl+V to paste and send.
                    </div>
                  </div>
                </button>

                <div className="flex flex-wrap gap-2 items-center pt-1">
                  <button
                    onClick={handleSendWhatsApp}
                    className="h-9 px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Send className="h-3.5 w-3.5" /> Send Text Message
                  </button>
                  <button
                    onClick={() => handleExportPOImage(false)}
                    disabled={isExportingImage}
                    className="h-9 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Download className="h-3.5 w-3.5" /> Download PNG Only
                  </button>
                  <button
                    onClick={handleCopyWhatsAppText}
                    className="h-9 px-3 rounded bg-secondary border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-muted"
                  >
                    {copiedTxt ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Clipboard className="h-3.5 w-3.5" />}
                    {copiedTxt ? "Copied Text!" : "Copy Text"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printable PO Voucher Document Body */}
        <div className="p-4 sm:p-6 pb-4 overflow-y-auto flex-1 bg-zinc-900/50 flex justify-center print:p-0 print:bg-white print:overflow-visible" ref={(el) => { if (el) el.scrollTop = 0; }}>
          <div ref={poDocumentRef} className="bg-white p-6 sm:p-8 text-black font-sans shadow-2xl rounded border border-gray-200 w-full max-w-2xl overflow-hidden">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div className="flex items-start gap-4">
              <PonmaniLogo variant="color" className="h-16 w-auto object-contain" />
              <div>
                <p className="text-xs text-gray-600 mt-1 max-w-sm">
                  {storeSettings?.shop_address || "142 Main Road, Tenkasi, Tamil Nadu - 627811"}
                </p>
                <div className="text-xs font-mono text-gray-700 mt-1">
                  <span>Ph: {storeSettings?.shop_phone || "+91 94422 12345"}</span>
                  {storeSettings?.shop_gstin && <span className="ml-3">GSTIN: {storeSettings.shop_gstin}</span>}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-black text-white text-xs font-bold uppercase tracking-wider mb-2">
                PURCHASE ORDER
              </div>
              <div className="font-mono font-bold text-lg text-black">{order.po_number}</div>
              <div className="text-xs text-gray-600">Date: {order.created_at.split("T")[0]}</div>
              {order.expected_date && (
                <div className="text-xs font-semibold text-gray-800">Exp. Delivery: {order.expected_date}</div>
              )}
            </div>
          </div>

          {/* Supplier Info & PO Details Box */}
          <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 rounded border border-gray-200">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">VENDOR / SUPPLIER</div>
              <div className="font-bold text-sm text-black">{vendor?.company_name || order.vendor_name}</div>
              {vendor?.name && vendor.name !== vendor.company_name && (
                <div className="text-xs text-gray-700">Attn: {vendor.name}</div>
              )}
              {vendor?.phone && <div className="text-xs font-mono text-gray-600">Phone: {vendor.phone}</div>}
              {vendor?.address && <div className="text-xs text-gray-600 mt-0.5">{vendor.address}</div>}
            </div>

            <div className="text-right space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">ORDER STATUS</div>
              <div className="text-xs font-bold uppercase tracking-wider text-black">{order.status}</div>
              <div className="text-xs text-gray-600 mt-2">
                <span>Advance Paid: </span>
                <span className="font-mono font-bold">{inr(order.paid_amount)}</span>
              </div>
              <div className="text-xs text-gray-600">
                <span>Balance Due: </span>
                <span className="font-mono font-bold text-black">{inr(due)}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr className="border-y-2 border-black bg-gray-100 font-bold uppercase text-[10px] text-gray-700">
                <th className="py-2 px-2 text-left w-8">#</th>
                <th className="py-2 px-2 text-left">Item Description</th>
                <th className="py-2 px-2 text-center w-20">Qty</th>
                <th className="py-2 px-2 text-right w-24">Unit Cost (₹)</th>
                <th className="py-2 px-2 text-right w-24">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td className="py-2 px-2 font-mono text-gray-500">{idx + 1}</td>
                  <td className="py-2 px-2 font-semibold text-black">
                    {it.product_name}
                  </td>
                  <td className="py-2 px-2 text-center font-mono">{it.qty} {it.unit || "Pcs"}</td>
                  <td className="py-2 px-2 text-right font-mono">{it.cost_price.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-black">
                    {(it.qty * it.cost_price).toFixed(2)}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">No items listed.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Summary Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono">{inr(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax (+):</span>
                  <span className="font-mono">{inr(tax)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount (-):</span>
                  <span className="font-mono">{inr(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t-2 border-black pt-1.5 text-black">
                <span>Total Amount:</span>
                <span className="font-mono">{inr(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Advance Paid:</span>
                <span className="font-mono">{inr(order.paid_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs border-t border-gray-300 pt-1 text-black">
                <span>Balance Payable:</span>
                <span className="font-mono">{inr(due)}</span>
              </div>
            </div>
          </div>

          {/* Customized Order Instructions & Notes Block — hidden during image capture */}
          <div
            className="p-4 bg-gray-50 rounded border border-gray-200 mb-4"
            data-capture-hide="true"
          >
            <div className="flex justify-between items-center mb-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                <Edit3 className="h-3 w-3 print:hidden" /> Customized Order Instructions &amp; Terms
              </div>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-[10px] font-bold text-blue-600 hover:underline print:hidden"
                >
                  Edit Notes
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2 print:hidden">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type customized order instructions, packing requests, payment terms, or delivery specs..."
                  className="w-full p-2 text-xs border border-gray-300 rounded font-sans text-black focus:outline-none focus:border-black"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingNotes(false)}
                    className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    className="px-3 py-1 text-xs bg-black text-white rounded font-bold flex items-center gap-1"
                  >
                    <Save className="h-3 w-3" /> Save Notes
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="text-xs text-gray-800 font-sans"
                style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word" }}
              >
                {notes.trim() ? notes : (storeSettings?.po_footer_terms || "Please acknowledge receipt of this Purchase Order and confirm delivery schedule.")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
