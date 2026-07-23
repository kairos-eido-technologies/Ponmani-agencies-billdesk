import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { db, Invoice, InvoiceItem } from "@/lib/db/db";
import { ThermalReceipt } from "./ThermalReceipt";
import { Printer, Download, X, FileText, Receipt, Check, Share2, Phone, MessageSquare, Clipboard, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface BillViewerModalProps {
  invoiceId?: string;
  invoiceData?: { invoice: Invoice; items: InvoiceItem[] } | null;
  initialMode?: "thermal" | "a4";
  onClose: () => void;
  autoPrintOnMount?: boolean;
}

// Generate formatted WhatsApp text receipt
function generateWhatsAppText(i: Invoice, items: InvoiceItem[], storeSettings: any) {
  const shopName = storeSettings?.shop_name || "PONMANI AGENCIES";
  const shopPhone = storeSettings?.shop_phone || "+91 94422 12345";
  const shopAddress = storeSettings?.shop_address || "Tenkasi, TN";

  let t = `*${shopName}*\n`;
  t += `_${storeSettings?.receipt_header_note || "Hardware • Electricals • Electronics"}_\n`;
  t += `${shopAddress}\n`;
  t += `Ph: ${shopPhone}\n`;
  t += `-----------------------------\n`;
  t += `*Invoice #:* ${i.invoice_number}\n`;
  t += `*Date:* ${new Date(i.created_at).toLocaleString('en-IN')}\n`;
  t += `*Customer:* ${i.customer_name}\n`;
  if (i.customer_mobile) t += `*Mobile:* ${i.customer_mobile}\n`;
  t += `*Payment:* ${i.payment_method}\n`;
  t += `-----------------------------\n`;
  t += `*ITEMS:*\n`;

  items.forEach((it, idx) => {
    const name = it.product_name || "Item #" + (idx + 1);
    const qtyStr = it.qty.toString();
    const rateStr = Number(it.unit_price).toFixed(2);
    const amtStr = Number(it.total_price || it.qty * it.unit_price).toFixed(2);
    t += `${idx + 1}. *${name}* — ${qtyStr} x ₹${rateStr} = *₹${amtStr}*\n`;
  });

  t += `-----------------------------\n`;
  t += `*Subtotal:* ₹${Number(i.subtotal).toFixed(2)}\n`;
  if (i.discount_amount > 0) t += `*Discount (-):* ₹${Number(i.discount_amount).toFixed(2)}\n`;
  if (i.exchange_amount && i.exchange_amount > 0) {
    t += `*Exchange (-):* ₹${Number(i.exchange_amount).toFixed(2)} (${i.exchange_notes || "Old Item"})\n`;
  }
  if (i.tax_amount > 0) t += `*Tax (GST):* ₹${Number(i.tax_amount).toFixed(2)}\n`;
  t += `*GRAND TOTAL: ₹${Number(i.grand_total).toFixed(2)}*\n`;
  t += `-----------------------------\n`;
  t += `_${storeSettings?.receipt_footer_note || "Thank you for shopping!"}_`;
  return t;
}

// Convert DOM element to PNG and copy to Clipboard
async function copyReceiptAsImage(receiptElement: HTMLElement): Promise<boolean> {
  try {
    const width = receiptElement.offsetWidth || 300;
    const height = receiptElement.offsetHeight || 500;

    const clonedHtml = receiptElement.innerHTML;

    // Self-contained static CSS styles for the thermal receipt layout
    const styles = `
      .flex { display: flex; }
      .justify-between { justify-content: space-between; }
      .items-center { align-items: center; }
      .items-start { align-items: flex-start; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
      .font-mono { font-family: monospace; }
      .font-black { font-weight: 900; }
      .bg-black { background-color: #000; }
      .bg-gray-100 { background-color: #f3f4f6; }
      .bg-white { background-color: #fff; }
      .text-white { color: #fff; }
      .text-black { color: #000; }
      .border-t { border-top: 1px solid #000; }
      .border-b { border-bottom: 1px solid #000; }
      .border-y { border-top: 1px solid #000; border-bottom: 1px solid #000; }
      .border-t-2 { border-top: 2px solid #000; }
      .border-b-2 { border-bottom: 2px solid #000; }
      .border-dashed { border-style: dashed; }
      .py-1 { padding-top: 4px; padding-bottom: 4px; }
      .py-2 { padding-top: 8px; padding-bottom: 8px; }
      .px-1 { padding-left: 4px; padding-right: 4px; }
      .px-2 { padding-left: 8px; padding-right: 8px; }
      .pb-2 { padding-bottom: 8px; }
      .mb-2 { margin-bottom: 8px; }
      .mt-2 { margin-top: 8px; }
      .mt-0.5 { margin-top: 2px; }
      .inline-block { display: inline-block; }
      .w-10 { width: 40px; }
      .w-16 { width: 64px; }
      .w-20 { width: 80px; }
      .flex-1 { flex: 1; }
      .uppercase { text-transform: uppercase; }
      .underline { text-decoration: underline; }
      .text-sm { font-size: 14px; }
      .text-xs { font-size: 12px; }
      .text-\\[10px\\] { font-size: 10px; }
      .text-\\[9\\.5px\\] { font-size: 9.5px; }
      .text-\\[9px\\] { font-size: 9px; }
      .text-\\[8\\.5px\\] { font-size: 8.5px; }
      .text-\\[8px\\] { font-size: 8px; }
      .tracking-wider { letter-spacing: 0.05em; }
    `;

    // Create standalone SVG with embedded foreignObject and cloned markup
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <style>
          ${styles}
        </style>
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: inherit; background: white; color: black; padding: 12px; height: 100%; box-sizing: border-box;">
            ${clonedHtml}
          </div>
        </foreignObject>
      </svg>
    `;

    const base64Svg = window.btoa(unescape(encodeURIComponent(svgString)));
    const dataURL = `data:image/svg+xml;base64,${base64Svg}`;

    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (context) {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0);

          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                // Try writing to clipboard
                const item = new ClipboardItem({ "image/png": blob });
                await navigator.clipboard.write([item]);
                resolve(true);
              } catch (err) {
                console.error("Clipboard API write failed, attempting download fallback:", err);
                try {
                  const link = document.createElement("a");
                  link.href = canvas.toDataURL("image/png");
                  link.download = `receipt_${Date.now()}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  resolve(true); // Treat as success since image is downloaded
                } catch (dlErr) {
                  console.error("Download fallback failed:", dlErr);
                  resolve(false);
                }
              }
            } else {
              resolve(false);
            }
          }, "image/png");
        } else {
          resolve(false);
        }
      };
      image.onerror = () => {
        resolve(false);
      };
      image.src = dataURL;
    });
  } catch (e) {
    console.error(e);
    return false;
  }
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

  // Auto-print option if requested (e.g. from POS checkout)
  useEffect(() => {
    if (autoPrintOnMount && invoiceObj && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      const t = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [autoPrintOnMount, invoiceObj]);

  useEffect(() => {
    if (invoiceObj?.customer_mobile) {
      setWhatsappPhone(invoiceObj.customer_mobile);
    }
  }, [invoiceObj]);

  function handlePrint() {
    window.print();
  }

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
          className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
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
          <div className="p-6 overflow-y-auto flex-1 flex justify-center bg-zinc-900/50">
            {query.isLoading && !invoiceObj ? (
              <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                Loading bill data...
              </div>
            ) : !invoiceObj ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Bill details not found.
              </div>
            ) : mode === "thermal" ? (
              <div ref={receiptRef} className="shadow-2xl rounded overflow-hidden border border-gray-300">
                <ThermalReceipt invoice={invoiceObj} items={items} storeSettings={storeSettings} />
              </div>
            ) : (
              /* A4 Bill Layout */
              <div
                className="bg-white text-black rounded shadow-2xl p-6"
                style={{ width: "190mm", minHeight: "250mm", fontFamily: "Arial, sans-serif", fontSize: "11px", lineHeight: "1.5" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: "bold" }}>{storeSettings?.shop_name || "PONMANI AGENCIES"}</div>
                    <div style={{ fontSize: "10px", color: "#444" }}>Hardware, Electricals & Electronics</div>
                    <div style={{ fontSize: "10px", color: "#444" }}>{storeSettings?.shop_address || "Tenkasi, Tamil Nadu — 627811"}</div>
                    {isGst && <div style={{ fontSize: "10px", color: "#444" }}>GSTIN: {storeSettings?.shop_gstin || "33AAPFP1234H1Z9"}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "15px", fontWeight: "bold" }}>{isGst ? "TAX INVOICE" : "SALE BILL"}</div>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1a56db" }}>{invoiceObj.invoice_number}</div>
                    <div style={{ fontSize: "10px" }}>Date: {dateStr}</div>
                    <div style={{ fontSize: "10px" }}>Payment: {invoiceObj.payment_method}</div>
                  </div>
                </div>

                <div style={{ marginBottom: "12px", padding: "8px", background: "#f8f9fa", borderRadius: "4px", border: "1px solid #e9ecef" }}>
                  <div style={{ fontWeight: "bold" }}>Customer Details:</div>
                  <div style={{ fontSize: "12px", fontWeight: "bold" }}>{invoiceObj.customer_name}</div>
                  {invoiceObj.customer_mobile && <div>Mobile: {invoiceObj.customer_mobile}</div>}
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
                  <thead>
                    <tr style={{ background: "#1e293b", color: "#fff" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left" }}>Item Description</th>
                      <th style={{ padding: "6px 8px", textAlign: "center" }}>Qty</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Rate (₹)</th>
                      {isGst && <th style={{ padding: "6px 8px", textAlign: "right" }}>GST%</th>}
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it: any, idx: number) => {
                      const name = it.product_name || it.name || "Item #" + (idx + 1);
                      const qtyVal = Number(it.qty || 1);
                      const rateVal = Number(it.unit_price || it.price || 0);
                      const totalVal = Number(it.total_price ?? (qtyVal * rateVal));
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <td style={{ padding: "6px 8px" }}>
                            <div style={{ fontWeight: "bold" }}>{name}</div>
                            {it.barcode && <div style={{ fontSize: "9px", color: "#64748b" }}>{it.barcode}</div>}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>{qtyVal}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>{rateVal.toFixed(2)}</td>
                          {isGst && <td style={{ padding: "6px 8px", textAlign: "right", fontSize: "10px" }}>{it.tax_rate || 0}%</td>}
                          <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>{totalVal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ width: "250px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span>Subtotal:</span><span>₹{Number(invoiceObj.subtotal).toFixed(2)}</span></div>
                    {invoiceObj.discount_amount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", color: "#dc2626" }}><span>Discount (-):</span><span>-₹{Number(invoiceObj.discount_amount).toFixed(2)}</span></div>}
                    {isGst && invoiceObj.tax_amount > 0 && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "10px" }}><span>CGST:</span><span>₹{cgst.toFixed(2)}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "10px" }}><span>SGST:</span><span>₹{sgst.toFixed(2)}</span></div>
                      </>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px", borderTop: "2px solid #000", marginTop: "6px", paddingTop: "6px" }}>
                      <span>GRAND TOTAL:</span>
                      <span>₹{Number(invoiceObj.grand_total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
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
                      
                      const desktopUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(rawText)}`;
                      
                      // Copy text first as convenience
                      await navigator.clipboard.writeText(rawText);
                      toast.success("Bill text copied to clipboard!");

                      // Open WhatsApp Desktop directly
                      window.location.href = desktopUrl;
                      
                      setShowWhatsAppDialog(false);
                    } catch (e: any) {
                      toast.error("Failed sending text: " + e.message);
                    } finally {
                      setCopyingTxt(false);
                    }
                  }}
                  className="w-full p-3 bg-secondary hover:bg-muted border border-border rounded-lg flex items-start gap-3 text-left transition"
                >
                  <MessageSquare className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-foreground">Option A: Send Text Invoice</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Sends fully formatted receipt text with item descriptions, prices, totals directly to WhatsApp.
                    </div>
                  </div>
                </button>

                {/* Image format (JPG copy paste) */}
                <button
                  disabled={copyingImg || mode !== "thermal"}
                  onClick={async () => {
                    if (!receiptRef.current) {
                      toast.error("Please select Thermal Receipt view to copy receipt image");
                      return;
                    }
                    setCopyingImg(true);
                    try {
                      const ok = await copyReceiptAsImage(receiptRef.current);
                      if (ok) {
                        toast.success("Receipt image copied!");
                        let cleanPhone = whatsappPhone.replace(/\D/g, "");
                        if (cleanPhone.length === 10) {
                          cleanPhone = "91" + cleanPhone;
                        }
                        
                        // Open WhatsApp Desktop directly
                        window.location.href = `whatsapp://send?phone=${cleanPhone}`;

                        toast.info("WhatsApp Desktop opened. Press Ctrl + V in the message box to paste and send receipt!");
                        setShowWhatsAppDialog(false);
                      } else {
                        toast.error("Failed converting receipt to image. Try Option A.");
                      }
                    } catch (e: any) {
                      toast.error("Error generating receipt image: " + e.message);
                    } finally {
                      setCopyingImg(false);
                    }
                  }}
                  className={`w-full p-3 bg-secondary hover:bg-muted border border-border rounded-lg flex items-start gap-3 text-left transition ${
                    mode !== "thermal" ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <ImageIcon className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      Option B: Copy Receipt JPG & Open WhatsApp
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {mode !== "thermal"
                        ? "Only available in Thermal 80mm view mode."
                        : "Generates beautiful 80mm image, copies to clipboard. Open chat and press Ctrl + V to paste."}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRINT ONLY CONTAINER ─── */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999]">
        {invoiceObj && (
          mode === "thermal" ? (
            <ThermalReceipt invoice={invoiceObj} items={items} storeSettings={storeSettings} />
          ) : (
            <div
              className="bg-white text-black p-4 mx-auto"
              style={{ width: "210mm", padding: "10mm", fontFamily: "Arial, sans-serif", fontSize: "11px", lineHeight: "1.5" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: "bold" }}>{storeSettings?.shop_name || "PONMANI AGENCIES"}</div>
                  <div style={{ fontSize: "11px", color: "#444" }}>Hardware, Electricals & Electronics</div>
                  <div style={{ fontSize: "11px", color: "#444" }}>{storeSettings?.shop_address || "Tenkasi, Tamil Nadu — 627811"}</div>
                  {isGst && <div style={{ fontSize: "11px", color: "#444" }}>GSTIN: {storeSettings?.shop_gstin || "33AAPFP1234H1Z9"}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "16px", fontWeight: "bold" }}>{isGst ? "TAX INVOICE" : "SALE BILL"}</div>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1a56db" }}>{invoiceObj.invoice_number}</div>
                  <div style={{ fontSize: "11px" }}>Date: {dateStr}</div>
                  <div style={{ fontSize: "11px" }}>Payment: {invoiceObj.payment_method}</div>
                </div>
              </div>

              <div style={{ marginBottom: "12px", padding: "8px", background: "#f8f9fa", borderRadius: "4px" }}>
                <div style={{ fontWeight: "bold" }}>Customer Details:</div>
                <div style={{ fontSize: "13px", fontWeight: "bold" }}>{invoiceObj.customer_name}</div>
                {invoiceObj.customer_mobile && <div>Mobile: {invoiceObj.customer_mobile}</div>}
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
                <thead>
                  <tr style={{ background: "#1e293b", color: "#fff" }}>
                    <th style={{ padding: "6px 8px", textAlign: "left" }}>Item Description</th>
                    <th style={{ padding: "6px 8px", textAlign: "center" }}>Qty</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Rate (₹)</th>
                    {isGst && <th style={{ padding: "6px 8px", textAlign: "right" }}>GST%</th>}
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any, idx: number) => {
                    const name = it.product_name || it.name || "Item #" + (idx + 1);
                    const qtyVal = Number(it.qty || 1);
                    const rateVal = Number(it.unit_price || it.price || 0);
                    const totalVal = Number(it.total_price ?? (qtyVal * rateVal));
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 8px" }}>
                          <div style={{ fontWeight: "bold" }}>{name}</div>
                          {it.barcode && <div style={{ fontSize: "9px", color: "#64748b" }}>{it.barcode}</div>}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center" }}>{qtyVal}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>{rateVal.toFixed(2)}</td>
                        {isGst && <td style={{ padding: "6px 8px", textAlign: "right", fontSize: "10px" }}>{it.tax_rate || 0}%</td>}
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>{totalVal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: "250px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span>Subtotal:</span><span>₹{Number(invoiceObj.subtotal).toFixed(2)}</span></div>
                  {invoiceObj.discount_amount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span>Discount (-):</span><span>-₹{Number(invoiceObj.discount_amount).toFixed(2)}</span></div>}
                  {isGst && invoiceObj.tax_amount > 0 && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "10px" }}><span>CGST:</span><span>₹{cgst.toFixed(2)}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "10px" }}><span>SGST:</span><span>₹{sgst.toFixed(2)}</span></div>
                    </>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px", borderTop: "2px solid #000", marginTop: "6px", paddingTop: "6px" }}>
                    <span>GRAND TOTAL:</span>
                    <span>₹{Number(invoiceObj.grand_total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}
