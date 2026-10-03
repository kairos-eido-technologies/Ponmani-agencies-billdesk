import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { db, Invoice, InvoiceItem } from "@/lib/db/db";
import { ThermalReceipt } from "./ThermalReceipt";
import { A4Receipt } from "./A4Receipt";
import { Printer, Download, X, FileText, Receipt, Check, Share2, Phone, MessageSquare, Clipboard, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { captureReceiptAsImage } from "@/lib/capture-receipt-image";
import { printIsolatedReceipt } from "@/lib/print-isolated-receipt";

interface BillViewerModalProps {
  invoiceId?: string;
  invoiceData?: { invoice: Invoice; items: InvoiceItem[] } | null;
  initialMode?: "thermal" | "a4";
  onClose: () => void;
  autoPrintOnMount?: boolean;
}

// Generate formatted WhatsApp text receipt
function generateWhatsAppText(i: Invoice, items: InvoiceItem[], storeSettings: any) {
  let t = `*BILL RECEIPT: ${i.invoice_number}*\n`;
  t += `*${(storeSettings?.shop_name || "PONMANI AGENCIES").toUpperCase()}*\n`;
  t += `${storeSettings?.shop_address || "Tenkasi, Tamil Nadu"}\n`;
  t += `Ph: ${storeSettings?.shop_phone || "+91 94422 12345"}\n`;
  t += `-----------------------------\n`;
  t += `*Customer:* ${i.customer_name || "Walk-in Customer"}\n`;
  if (i.customer_mobile) t += `*Mobile:* ${i.customer_mobile}\n`;
  t += `*Date:* ${new Date(i.created_at).toLocaleString("en-IN")}\n`;
  t += `-----------------------------\n`;
  t += `*ITEMS PURCHASED:*\n`;

  let totalMrp = 0;
  let totalSelling = 0;

  items.forEach((it: any, idx: number) => {
    const name = it.product_name || it.name || "Item #" + (idx + 1);
    const itemQty = Number(it.qty || 1);
    const qtyStr = `${itemQty} Pcs`;
    const unitPrice = Number(it.unit_price || it.price || 0);
    const rateStr = unitPrice.toFixed(2);
    const amtStr = Number(it.total_price || itemQty * unitPrice).toFixed(2);

    const prod = it.product_id ? db.getProductById(it.product_id) : (it.barcode ? db.getProductByBarcode(it.barcode) : null);
    const itemMrp = Number(it.mrp && it.mrp > 0 ? it.mrp : (prod?.mrp && prod.mrp > 0 ? prod.mrp : (prod?.selling_price || unitPrice)));
    totalMrp += itemMrp * itemQty;
    totalSelling += unitPrice * itemQty;

    const mrpInfo = itemMrp > unitPrice ? ` (MRP: ₹${itemMrp.toFixed(2)})` : "";
    t += `${idx + 1}. *${name}* — ${qtyStr} x ₹${rateStr}${mrpInfo} = *₹${amtStr}*\n`;
  });

  const totalSaved = Math.max(0, (totalMrp - totalSelling) + Number(i.discount_amount || 0));

  t += `-----------------------------\n`;
  t += `*Subtotal:* ₹${Number(i.subtotal).toFixed(2)}\n`;
  if (i.discount_amount > 0) t += `*Discount (-):* ₹${Number(i.discount_amount).toFixed(2)}\n`;
  if (i.exchange_amount && i.exchange_amount > 0) {
    t += `*Exchange (-):* ₹${Number(i.exchange_amount).toFixed(2)} (${i.exchange_notes || "Old Item"})\n`;
  }
  if (i.tax_amount > 0) t += `*Tax (GST):* ₹${Number(i.tax_amount).toFixed(2)}\n`;
  if (totalSaved > 0) {
    t += `*🎉 YOU SAVED: ₹${totalSaved.toFixed(2)} TODAY!* \n`;
  }
  t += `*GRAND TOTAL: ₹${Number(i.grand_total).toFixed(2)}*\n`;
  t += `-----------------------------\n`;
  t += `_${storeSettings?.receipt_footer_note || "Thank you for shopping!"}_`;
  return t;
}

export function BillViewerModal({
  invoiceId,
  invoiceData: initialData,
  initialMode = "thermal",
  onClose,
  autoPrintOnMount = false,
}: BillViewerModalProps) {
  const [mode, setMode] = useState<"thermal" | "a4">(initialMode);
  const [downloaded, setDownloaded] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [copyingImg, setCopyingImg] = useState(false);
  const [copyingTxt, setCopyingTxt] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const a4ReceiptRef = useRef<HTMLDivElement>(null);
  const hasAutoPrinted = useRef(false);

  // Fetch invoice details if ID is provided
  const query = useQuery({
    queryKey: ["bill-modal-detail", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      await db.loadPromise;
      return db.getInvoice(invoiceId);
    },
    enabled: Boolean(invoiceId && !initialData),
  });

  const invoiceObj = initialData?.invoice || query.data?.invoice;
  const items = initialData?.items || query.data?.items || [];
  const storeSettings = db.getSettings();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handlePrint() {
    if (mode === "thermal") {
      const el = (receiptRef.current?.querySelector(".thermal-receipt") as HTMLElement) || receiptRef.current;
      if (el) {
        printIsolatedReceipt(el, "thermal");
        return;
      }
    } else {
      const el = (a4ReceiptRef.current?.querySelector(".a4-sheet") as HTMLElement) || a4ReceiptRef.current;
      if (el) {
        printIsolatedReceipt(el, "a4");
        return;
      }
    }
    window.print();
  }

  // Auto-print option if requested (e.g. from POS checkout)
  useEffect(() => {
    if (autoPrintOnMount && invoiceObj && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      const t = setTimeout(() => {
        handlePrint();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [autoPrintOnMount, invoiceObj]);

  useEffect(() => {
    if (invoiceObj?.customer_mobile) {
      setWhatsappPhone(invoiceObj.customer_mobile);
    }
  }, [invoiceObj]);

  function handleDownload() {
    if (!invoiceObj) return;

    // Generate formatted printable HTML file blob
    const isA4 = mode === "a4";
    const dateStr = new Date(invoiceObj.created_at).toLocaleString();

    let contentHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Invoice_${invoiceObj.invoice_number}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #000; background: #fff; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .title { font-size: 22px; font-weight: bold; }
          .subtitle { font-size: 12px; color: #444; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .right { text-align: right; }
          .center { text-align: center; }
          .total-box { font-size: 16px; font-weight: bold; text-align: right; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${storeSettings?.shop_name || "PONMANI AGENCIES"}</div>
          <div class="subtitle">Hardware, Electricals & Electronics | Tenkasi</div>
          <div class="subtitle">GSTIN: ${storeSettings?.shop_gstin || "33AAPFP1234H1Z9"}</div>
        </div>
        <div class="meta">
          <div>
            <strong>Bill To:</strong> ${invoiceObj.customer_name}<br/>
            <strong>Mobile:</strong> ${invoiceObj.customer_mobile || "N/A"}
          </div>
          <div style="text-align: right;">
            <strong>Invoice #:</strong> ${invoiceObj.invoice_number}<br/>
            <strong>Date:</strong> ${dateStr}<br/>
            <strong>Payment:</strong> ${invoiceObj.payment_method}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="center">Qty</th>
              <th class="right">Rate (₹)</th>
              <th class="right">GST %</th>
              <th class="right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (it: any) => `
              <tr>
                <td><strong>${it.product_name || it.name}</strong></td>
                <td class="center">${it.qty}</td>
                <td class="right">${Number(it.unit_price || it.price || 0).toFixed(2)}</td>
                <td class="right">${it.tax_rate || 0}%</td>
                <td class="right">${Number(it.total_price || it.qty * (it.unit_price || 0)).toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <div class="total-box">
          Subtotal: ₹${Number(invoiceObj.subtotal).toFixed(2)}<br/>
          ${invoiceObj.tax_amount > 0 ? `Tax (GST): ₹${Number(invoiceObj.tax_amount).toFixed(2)}<br/>` : ""}
          ${invoiceObj.discount_amount > 0 ? `Discount: -₹${Number(invoiceObj.discount_amount).toFixed(2)}<br/>` : ""}
          <span style="font-size: 20px; color: #000;">Grand Total: ₹${Number(invoiceObj.grand_total).toFixed(2)}</span>
        </div>
        <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #666;">
          Thank you for shopping at Ponmani Agencies!
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([contentHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoiceObj.invoice_number}_Bill.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    toast.success(`Downloaded Bill: ${invoiceObj.invoice_number}`);
    setTimeout(() => setDownloaded(false), 3000);
  }

  const isGst = invoiceObj?.invoice_type === "GST";
  const cgst = Number(invoiceObj?.tax_amount || 0) / 2;
  const sgst = Number(invoiceObj?.tax_amount || 0) / 2;
  const dateStr = invoiceObj ? new Date(invoiceObj.created_at).toLocaleString("en-IN") : "";

  return (
    <>
      {/* ─── SCREEN MODAL BACKDROP ─── */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4 print:hidden"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-all ${
            mode === "a4" ? "max-w-5xl" : "max-w-3xl"
          }`}
        >
          {/* Header */}
          <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  Invoice {invoiceObj?.invoice_number || invoiceId || "Preview"}
                  {invoiceObj && (
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                      {invoiceObj.invoice_type}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {invoiceObj ? `${invoiceObj.customer_name} • ${dateStr}` : "Loading bill..."}
                </p>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center gap-2 bg-secondary p-1 rounded-lg border border-border">
              <button
                onClick={() => setMode("thermal")}
                className={`h-7 px-3 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                  mode === "thermal"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Receipt className="h-3.5 w-3.5" /> Thermal 80mm
              </button>
              <button
                onClick={() => setMode("a4")}
                className={`h-7 px-3 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                  mode === "a4"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> A4 Tax Invoice
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body Preview Content */}
          <div className="p-4 sm:p-8 pb-16 sm:pb-20 overflow-y-auto overflow-x-auto flex-1 flex justify-center bg-slate-100 w-full">
            {query.isLoading && !invoiceObj ? (
              <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                Loading bill data...
              </div>
            ) : !invoiceObj ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Bill details not found.
              </div>
            ) : mode === "thermal" ? (
              <div ref={receiptRef} className="shadow-2xl rounded overflow-visible border border-gray-300 bg-white mb-8 pb-4">
                <ThermalReceipt invoice={invoiceObj} items={items} storeSettings={storeSettings} />
              </div>
            ) : (
              <div ref={a4ReceiptRef} className="shadow-2xl rounded overflow-visible max-w-full bg-white mb-8 pb-4">
                <A4Receipt invoice={invoiceObj} items={items} storeSettings={storeSettings} />
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
                {downloaded ? "Downloaded!" : "Download Bill"}
              </button>
              <button
                onClick={handlePrint}
                className="h-9 px-5 rounded-lg bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Printer className="h-4 w-4" /> Print Bill
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── WHATSAPP SHARE DIALOG OVERLAY ─── */}
      {showWhatsAppDialog && invoiceObj && (
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
                <Share2 className="h-4 w-4 text-emerald-400" /> Share via WhatsApp
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
                  <Phone className="h-3 w-3 text-emerald-400" /> Customer Phone Number
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
                    const rawEl = mode === "a4" ? a4ReceiptRef.current : receiptRef.current;
                    const targetEl = (rawEl?.querySelector(".a4-sheet") as HTMLElement) || (rawEl?.querySelector(".thermal-receipt") as HTMLElement) || rawEl;
                    if (!targetEl) {
                      toast.error("Receipt preview unavailable to capture image");
                      return;
                    }
                    setCopyingImg(true);
                    try {
                      const filename = `Bill_Receipt_${invoiceObj?.invoice_number || 'INV'}.png`;
                      const ok = await captureReceiptAsImage(targetEl, filename);
                      if (ok) {
                        let cleanPhone = whatsappPhone.replace(/\D/g, "");
                        if (cleanPhone.length === 10) {
                          cleanPhone = "91" + cleanPhone;
                        }

                        // wa.me is the correct universal WhatsApp link format
                        const waUrl = cleanPhone
                          ? `https://wa.me/${cleanPhone}`
                          : `https://web.whatsapp.com`;

                        window.open(waUrl, "_blank");
                        toast.success("Image copied! WhatsApp opened — press Ctrl+V to paste and send.");
                        setShowWhatsAppDialog(false);
                      } else {
                        toast.error("Failed converting receipt to image.");
                      }
                    } catch (e: any) {
                      toast.error("Error generating receipt image: " + e.message);
                    } finally {
                      setCopyingImg(false);
                    }
                  }}
                  className="w-full p-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg flex items-start gap-3 text-left transition"
                >
                  <ImageIcon className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-emerald-400">
                      Send Receipt as Image (Recommended)
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Generates PNG receipt image, downloads & copies to clipboard, and opens WhatsApp.
                    </div>
                  </div>
                </button>

                {/* Text format */}
                <button
                  disabled={copyingTxt}
                  onClick={async () => {
                    setCopyingTxt(true);
                    try {
                      const rawText = generateWhatsAppText(invoiceObj, items, storeSettings);
                      let cleanPhone = whatsappPhone.replace(/\D/g, "");
                      if (cleanPhone.length === 10) {
                        cleanPhone = "91" + cleanPhone;
                      }
                      
                      const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(rawText)}`;
                      
                      await navigator.clipboard.writeText(rawText);
                      toast.success("Bill text copied to clipboard!");
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
                      Sends structured plain text receipt to WhatsApp.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── DYNAMIC PRINT PAGE STYLES ─── */}
      {mode === "thermal" ? (
        <style>{`
          @media print {
            @page {
              size: 72mm auto !important;
              margin: 0mm !important;
            }
            html, body {
              width: 70mm !important;
              max-width: 70mm !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              overflow: visible !important;
            }
            #root, main, .min-h-screen {
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
            }
            .thermal-receipt {
              width: 70mm !important;
              max-width: 70mm !important;
              margin: 0 auto !important;
              padding: 1.5mm 1mm 0mm 1mm !important;
              height: auto !important;
              min-height: 0 !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            .thermal-receipt,
            .thermal-receipt * {
              color: #000000 !important;
              font-weight: 700 !important;
              border-color: #000000 !important;
              -webkit-text-stroke: 0.2px #000000 !important;
            }
          }
        `}</style>
      ) : (
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
      )}

      {/* ─── PRINT ONLY CONTAINER ─── */}
      <div className={`hidden print:block print:bg-white ${
        mode === "thermal"
          ? "print:static print:w-[70mm] print:h-auto print:m-0 print:p-0 print:overflow-visible"
          : "print:fixed print:inset-0 print:z-[9999]"
      }`}>
        {invoiceObj && (
          mode === "thermal" ? (
            <ThermalReceipt invoice={invoiceObj} items={items} storeSettings={storeSettings} />
          ) : (
            <A4Receipt invoice={invoiceObj} items={items} storeSettings={storeSettings} />
          )
        )}
      </div>
    </>
  );
}
