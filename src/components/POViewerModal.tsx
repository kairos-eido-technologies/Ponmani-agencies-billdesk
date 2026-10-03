import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { db, PurchaseOrder, PurchaseItem, Vendor } from "@/lib/db/db";
import { A4PurchaseOrder } from "./A4PurchaseOrder";
import { Printer, Download, X, FileText, Check, Share2, Phone, MessageSquare, Clipboard, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { captureReceiptAsImage } from "@/lib/capture-receipt-image";

interface POViewerModalProps {
  poId?: string;
  poData?: { order: PurchaseOrder; items: PurchaseItem[] } | null;
  onClose: () => void;
  onUpdated?: () => void;
  autoPrintOnMount?: boolean;
}

// Generate formatted WhatsApp text for Purchase Order
function generateWhatsAppPOText(
  order: PurchaseOrder,
  items: PurchaseItem[],
  vendor: Vendor | undefined,
  storeSettings: any,
  notes: string
): string {
  const shopName = storeSettings?.shop_name || "PONMANI AGENCIES";
  const shopPhone = storeSettings?.shop_phone || "+91 94422 12345";
  const shopAddress = storeSettings?.shop_address || "Tenkasi, Tamil Nadu";

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.cost_price), 0);
  const tax = Number(order.tax_amount || 0);
  const discount = Number(order.discount_amount || 0);
  const grandTotal = Number(order.total_amount || 0);
  const paid = Number(order.paid_amount || 0);
  const due = grandTotal - paid;

  let t = `*PURCHASE ORDER: ${order.po_number}*\n`;
  t += `*${shopName.toUpperCase()}*\n`;
  t += `${shopAddress}\n`;
  t += `Ph: ${shopPhone}\n`;
  t += `-------------------------------\n`;
  t += `*Supplier:* ${vendor?.company_name || order.vendor_name}\n`;
  if (vendor?.name && vendor?.name !== vendor?.company_name) t += `*Contact:* ${vendor.name}\n`;
  if (vendor?.phone) t += `*Phone:* ${vendor.phone}\n`;
  t += `*PO Date:* ${(order.created_at || '').split("T")[0]}\n`;
  if (order.expected_date) t += `*Expected Delivery:* ${order.expected_date.split("T")[0]}\n`;
  t += `*Status:* ${order.status}\n`;
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
  if (paid > 0) t += `*Advance Paid:* ₹${paid.toFixed(2)}\n`;
  t += `*Balance Payable:* ₹${due.toFixed(2)}\n`;

  if (notes.trim()) {
    t += `-------------------------------\n`;
    t += `*CUSTOM INSTRUCTIONS / NOTES:*\n_${notes.trim()}_\n`;
  }

  t += `-------------------------------\n`;
  t += `_${storeSettings?.po_footer_terms || "Please acknowledge receipt of this Purchase Order."}_`;
  return t;
}

export function POViewerModal({
  poId,
  poData: initialData,
  onClose,
  onUpdated,
  autoPrintOnMount = false,
}: POViewerModalProps) {
  // Query PO data if poId is provided
  const query = useQuery({
    queryKey: ["local-po-detail", poId],
    queryFn: async () => {
      if (!poId) return null;
      await db.loadPromise;
      return db.getPurchaseOrder(poId);
    },
    enabled: Boolean(poId && !initialData),
  });

  const rawPOData = initialData || query.data || (poId ? db.getPurchaseOrder(poId) : null);
  const storeSettings = db.getSettings();
  const vendors = db.getVendors();

  const [order, setOrder] = useState<PurchaseOrder | null>(rawPOData?.order || null);
  const [items, setItems] = useState<PurchaseItem[]>(rawPOData?.items || []);
  const [notes, setNotes] = useState<string>(rawPOData?.order?.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [copyingImg, setCopyingImg] = useState(false);
  const [copyingTxt, setCopyingTxt] = useState(false);
  const poDocumentRef = useRef<HTMLDivElement>(null);
  const hasAutoPrinted = useRef(false);

  useEffect(() => {
    if (rawPOData?.order) {
      setOrder(rawPOData.order);
      setItems(rawPOData.items || []);
      setNotes(rawPOData.order.notes || "");
    }
  }, [rawPOData]);

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

  // Auto-print option if requested
  useEffect(() => {
    if (autoPrintOnMount && order && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      const t = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [autoPrintOnMount, order]);

  function handleSaveNotes(newNotes: string) {
    if (!order) return;
    db.savePurchaseOrder(
      { ...order, notes: newNotes },
      items.map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        qty: it.qty,
        unit: it.unit,
        cost_price: it.cost_price,
        gst_rate: it.gst_rate,
      }))
    );
    setOrder({ ...order, notes: newNotes });
    setNotes(newNotes);
    setIsEditingNotes(false);
    toast.success("Custom order notes updated!");
    if (onUpdated) onUpdated();
  }

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    if (!order) return;

    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.cost_price), 0);
    const tax = Number(order.tax_amount || 0);
    const discount = Number(order.discount_amount || 0);
    const grandTotal = Number(order.total_amount || 0);
    const paid = Number(order.paid_amount || 0);
    const due = grandTotal - paid;
    const dateStr = (order.created_at || new Date().toISOString()).split("T")[0];

    const contentHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Purchase_Order_${order.po_number}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; color: #000; background: #fff; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: bold; }
          .subtitle { font-size: 11px; color: #444; }
          .po-box { text-align: right; }
          .po-title { font-size: 18px; font-weight: 900; }
          .po-num { font-size: 14px; font-weight: bold; color: #1d4ed8; font-family: monospace; }
          .vendor-box { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 16px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 11px; text-align: left; }
          th { background-color: #0f172a; color: #fff; font-weight: bold; }
          .right { text-align: right; }
          .center { text-align: center; }
          .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 16px; }
          .totals-box { width: 280px; font-size: 11px; }
          .total-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f1f5f9; }
          .grand-total { border-top: 2px solid #000; font-size: 14px; font-weight: bold; color: #000; padding-top: 6px; margin-top: 4px; }
          .notes-box { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px; margin-bottom: 16px; }
          .footer { text-align: center; font-size: 10px; color: #64748b; margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">${storeSettings?.shop_name || "PONMANI AGENCIES"}</div>
            <div class="subtitle">${storeSettings?.receipt_header_note || "Hardware • Electricals • Electronics"}</div>
            <div class="subtitle">${storeSettings?.shop_address || "142 Main Road, Tenkasi, Tamil Nadu - 627811"}</div>
            <div class="subtitle">Ph: ${storeSettings?.shop_phone || "+91 94422 12345"} | GSTIN: ${storeSettings?.shop_gstin || "33AAPFP1234H1Z9"}</div>
          </div>
          <div class="po-box">
            <div class="po-title">PURCHASE ORDER</div>
            <div class="po-num">${order.po_number}</div>
            <div class="subtitle">Date: ${dateStr}</div>
            ${order.expected_date ? `<div class="subtitle">Exp. Delivery: ${order.expected_date.split("T")[0]}</div>` : ''}
            <div class="subtitle" style="font-weight:bold; margin-top: 4px;">Status: ${order.status}</div>
          </div>
        </div>

        <div class="vendor-box">
          <div>
            <strong style="color: #64748b; text-transform: uppercase; font-size: 10px;">Supplier / Vendor:</strong><br/>
            <strong>${vendor?.company_name || order.vendor_name}</strong><br/>
            ${vendor?.name && vendor.name !== vendor.company_name ? `Attn: ${vendor.name}<br/>` : ''}
            ${vendor?.phone ? `Phone: ${vendor.phone}<br/>` : ''}
            ${vendor?.gst_number ? `GSTIN: ${vendor.gst_number}<br/>` : ''}
            ${vendor?.address ? `${vendor.address}<br/>` : ''}
          </div>
          <div style="text-align: right;">
            <strong style="color: #64748b; text-transform: uppercase; font-size: 10px;">Payment & Balance:</strong><br/>
            Advance Paid: ₹${paid.toFixed(2)}<br/>
            Balance Payable: <strong style="color: ${due > 0 ? '#b91c1c' : '#15803d'}">₹${due.toFixed(2)}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="center" style="width: 40px;">#</th>
              <th>Item Description</th>
              <th class="center" style="width: 80px;">Qty</th>
              <th class="right" style="width: 100px;">Unit Cost (₹)</th>
              <th class="right" style="width: 70px;">GST %</th>
              <th class="right" style="width: 120px;">Total Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (it, idx) => `
              <tr>
                <td class="center">${idx + 1}</td>
                <td><strong>${it.product_name}</strong></td>
                <td class="center">${it.qty} ${it.unit || 'PCS'}</td>
                <td class="right">${it.cost_price.toFixed(2)}</td>
                <td class="right">${it.gst_rate ? `${it.gst_rate}%` : '—'}</td>
                <td class="right"><strong>${(it.qty * it.cost_price).toFixed(2)}</strong></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="totals-wrap">
          <div class="totals-box">
            <div class="total-row"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
            ${tax > 0 ? `<div class="total-row"><span>Tax (GST):</span><span>+₹${tax.toFixed(2)}</span></div>` : ''}
            ${discount > 0 ? `<div class="total-row"><span>Discount:</span><span>-₹${discount.toFixed(2)}</span></div>` : ''}
            <div class="total-row grand-total"><span>TOTAL AMOUNT:</span><span>₹${grandTotal.toFixed(2)}</span></div>
            <div class="total-row"><span>Advance Paid:</span><span>₹${paid.toFixed(2)}</span></div>
            <div class="total-row" style="font-weight: bold; color: ${due > 0 ? '#b91c1c' : '#15803d'}"><span>BALANCE PAYABLE:</span><span>₹${due.toFixed(2)}</span></div>
          </div>
        </div>

        ${notes.trim() ? `
          <div class="notes-box">
            <strong style="color: #64748b; text-transform: uppercase; font-size: 10px;">Custom Instructions & Terms:</strong><br/>
            <div>${notes}</div>
          </div>
        ` : ''}

        <div class="footer">
          ${storeSettings?.po_footer_terms || "Please acknowledge receipt of this Purchase Order."}<br/>
          <strong>PONMANI AGENCIES • PURCHASE MANAGEMENT SYSTEM</strong>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([contentHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Purchase_Order_${order.po_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    toast.success(`Downloaded Purchase Order: ${order.po_number}`);
    setTimeout(() => setDownloaded(false), 3000);
  }

  return (
    <>
      {/* ─── SCREEN MODAL BACKDROP ─── */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4 print:hidden"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden max-w-5xl animate-in fade-in zoom-in-95 duration-150 transition-all"
        >
          {/* Header */}
          <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  Purchase Order {order?.po_number || poId || "Preview"}
                  {order && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                      order.status === "Received"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : order.status === "Ordered"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}>
                      {order.status}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {order ? `${vendor?.company_name || order.vendor_name} • Date: ${(order.created_at || '').split("T")[0]}` : "Loading Purchase Order..."}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body Preview Content — Scrollable matching BillViewerModal A4 view */}
          <div className="p-4 sm:p-8 pb-16 sm:pb-20 overflow-y-auto overflow-x-auto flex-1 flex justify-center bg-slate-100 w-full">
            {query.isLoading && !order ? (
              <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                Loading Purchase Order details...
              </div>
            ) : !order ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Purchase Order details not found.
              </div>
            ) : (
              <div ref={poDocumentRef} className="shadow-2xl rounded overflow-visible max-w-full bg-white mb-8 pb-4">
                <A4PurchaseOrder
                  order={order}
                  items={items}
                  vendor={vendor}
                  storeSettings={storeSettings}
                  notes={notes}
                  isEditingNotes={isEditingNotes}
                  onStartEditNotes={() => setIsEditingNotes(true)}
                  onCancelEditNotes={() => setIsEditingNotes(false)}
                  onSaveNotes={handleSaveNotes}
                  onChangeNotes={(val) => setNotes(val)}
                />
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="px-5 py-3 border-t border-border bg-card flex items-center justify-between">
            <div className="text-xs text-muted-foreground font-mono">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">ESC</kbd> to close modal
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowWhatsAppDialog(true)}
                className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Share2 className="h-4 w-4" /> Share WhatsApp
              </button>
              <button
                onClick={handleDownload}
                className="h-9 px-4 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 border border-border transition"
              >
                {downloaded ? <Check className="h-4 w-4 text-emerald-400" /> : <Download className="h-4 w-4" />}
                {downloaded ? "Downloaded!" : "Download PO"}
              </button>
              <button
                onClick={handlePrint}
                className="h-9 px-5 rounded-lg bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Printer className="h-4 w-4" /> Print PO (A4)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── WHATSAPP SHARE DIALOG OVERLAY ─── */}
      {showWhatsAppDialog && order && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-4 print:hidden"
          onClick={() => setShowWhatsAppDialog(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Share2 className="h-4 w-4 text-emerald-400" /> Share Purchase Order via WhatsApp
              </h3>
              <button
                onClick={() => setShowWhatsAppDialog(false)}
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Phone className="h-3 w-3 text-emerald-400" /> Supplier WhatsApp Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="w-full h-9 rounded bg-input border border-border px-3 text-xs text-foreground font-mono"
                />
                <span className="text-[9px] text-muted-foreground block mt-1">
                  10-digit Indian numbers will automatically be prepended with 91.
                </span>
              </div>

              {/* Format Options */}
              <div className="space-y-2 pt-2">
                {/* Image format (Primary) */}
                <button
                  disabled={copyingImg}
                  onClick={async () => {
                    const rawEl = poDocumentRef.current;
                    const targetEl = (rawEl?.querySelector(".a4-sheet") as HTMLElement) || rawEl;
                    if (!targetEl) {
                      toast.error("PO document preview unavailable to capture image");
                      return;
                    }
                    setCopyingImg(true);
                    try {
                      const filename = `Purchase_Order_${order.po_number || 'PO'}.png`;
                      const ok = await captureReceiptAsImage(targetEl, filename);
                      if (ok) {
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
                        toast.success("PO Image copied! WhatsApp opened — press Ctrl+V to paste and send.");
                        setShowWhatsAppDialog(false);
                      } else {
                        toast.error("Failed converting Purchase Order to image.");
                      }
                    } catch (e: any) {
                      toast.error("Error generating PO image: " + e.message);
                    } finally {
                      setCopyingImg(false);
                    }
                  }}
                  className="w-full p-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg flex items-start gap-3 text-left transition"
                >
                  <ImageIcon className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-emerald-400">
                      Send PO as Image (Recommended)
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Generates PNG A4 PO image, copies to clipboard, and opens WhatsApp for easy pasting.
                    </div>
                  </div>
                </button>

                {/* Text format */}
                <button
                  disabled={copyingTxt}
                  onClick={async () => {
                    setCopyingTxt(true);
                    try {
                      const rawText = generateWhatsAppPOText(order, items, vendor, storeSettings, notes);
                      let cleanPhone = whatsappPhone.replace(/\D/g, "");
                      if (!cleanPhone && vendor?.phone) {
                        cleanPhone = vendor.phone.replace(/\D/g, "");
                      }
                      if (cleanPhone.length === 10) {
                        cleanPhone = "91" + cleanPhone;
                      }

                      const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(rawText)}`;

                      await navigator.clipboard.writeText(rawText);
                      toast.success("Purchase order text copied to clipboard!");
                      window.open(waUrl, "_blank");
                      setShowWhatsAppDialog(false);
                    } catch (e: any) {
                      toast.error("Failed sending text: " + e.message);
                    } finally {
                      setCopyingTxt(false);
                    }
                  }}
                  className="w-full p-3 bg-secondary hover:bg-muted border border-border rounded-lg flex items-start gap-3 text-left transition"
                >
                  <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-foreground">Send Text Format Only</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Sends structured plain text Purchase Order to WhatsApp.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── DYNAMIC PRINT PAGE STYLES ─── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 8mm 8mm 8mm 8mm !important;
          }
          html, body {
            width: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* ─── PRINT ONLY CONTAINER ─── */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999]">
        {order && (
          <A4PurchaseOrder
            order={order}
            items={items}
            vendor={vendor}
            storeSettings={storeSettings}
            notes={notes}
          />
        )}
      </div>
    </>
  );
}
