import React, { useRef, useState } from "react";
import { db, ServiceTicket } from "@/lib/db/db";
import { inr } from "@/lib/format";
import { Printer, X, Share2, Phone, Image as ImageIcon, Send, Clipboard, Check } from "lucide-react";
import { toast } from "sonner";
import { captureReceiptAsImage } from "@/lib/capture-receipt-image";
import { PonmaniLogo } from "./PonmaniLogo";

interface ServiceReceiptModalProps {
  ticket: ServiceTicket;
  onClose: () => void;
}

export function ServiceReceiptModal({ ticket, onClose }: ServiceReceiptModalProps) {
  const storeSettings = db.getSettings();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState(ticket.customer_mobile || "");
  const [copiedTxt, setCopiedTxt] = useState(false);

  const shopName = storeSettings?.shop_name || "PONMANI AGENCIES";
  const shopPhone = storeSettings?.shop_phone || "+91 94422 12345";
  const shopAddress = storeSettings?.shop_address || "142 Main Road, Tenkasi, Tamil Nadu";
  const shopGst = storeSettings?.shop_gstin || "";
  const headerTagline = storeSettings?.receipt_header_note || "Hardware • Electricals • Electronics";
  const ticketTerms =
    storeSettings?.service_ticket_terms ||
    "* Present this receipt token when collecting item.\n* Items left over 30 days are subject to shop terms.\n*** THANK YOU FOR YOUR BUSINESS ***";

  function generateWhatsAppText(): string {
    let t = `*SERVICE RECEIPT & QUEUE TOKEN*\n`;
    t += `*${shopName.toUpperCase()}*\n`;
    t += `${shopAddress}\nPh: ${shopPhone}\n`;
    t += `-------------------------------\n`;
    t += `Token: *${ticket.queue_number || "TOKEN"}* | Ticket: *${ticket.ticket_number}*\n`;
    t += `*Customer:* ${ticket.customer_name}\n`;
    if (ticket.customer_mobile) t += `*Mobile:* ${ticket.customer_mobile}\n`;
    t += `*Intake:* ${new Date(ticket.created_at).toLocaleString("en-IN")}\n`;
    t += `-------------------------------\n`;
    t += `*Device:* ${ticket.device_name}\n`;
    if (ticket.serial_number) t += `*S/N:* ${ticket.serial_number}\n`;
    t += `*Issue:* ${ticket.issue_description || "General Repair"}\n`;
    t += `-------------------------------\n`;
    t += `*Est. Cost:* ₹${ticket.estimated_cost?.toFixed(2) || "0.00"}\n`;
    if (ticket.final_cost > 0) t += `*Final Amount:* ₹${ticket.final_cost.toFixed(2)}\n`;
    t += `*Status:* ${ticket.status}\n`;
    t += `-------------------------------\n`;
    t += `_Please present this token when collecting your item._`;
    return t;
  }

  function handleCopyText() {
    navigator.clipboard.writeText(generateWhatsAppText());
    setCopiedTxt(true);
    toast.success("Receipt text copied to clipboard!");
    setTimeout(() => setCopiedTxt(false), 2000);
  }

  function handleSendText() {
    let cleanPhone = whatsappPhone.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
    const encoded = encodeURIComponent(generateWhatsAppText());
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, "_blank");
  }

  async function handleShareImage() {
    if (!receiptRef.current) { toast.error("Receipt element unavailable"); return; }
    try {
      setIsExporting(true);
      toast.info("Generating service receipt image...");
      const filename = `Service_Token_${ticket.ticket_number}.png`;
      const ok = await captureReceiptAsImage(receiptRef.current, filename);
      if (ok) {
        let cleanPhone = whatsappPhone.replace(/\D/g, "");
        if (!cleanPhone && ticket.customer_mobile) cleanPhone = ticket.customer_mobile.replace(/\D/g, "");
        if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
        const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : `https://web.whatsapp.com`;
        window.open(waUrl, "_blank");
        toast.success("Receipt image copied! WhatsApp opened — press Ctrl+V to paste and send!");
      } else {
        toast.error("Failed to generate receipt image");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate receipt image");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      {/* ─── PRINT STYLES ─── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #thermal-service-receipt, #thermal-service-receipt * { visibility: visible; }
          #thermal-service-receipt {
            position: absolute; left: 0; top: 0;
            width: 80mm !important; max-width: 80mm !important;
            padding: 2mm !important; margin: 0 !important;
            font-size: 11px !important; color: #000 !important; background: #fff !important;
          }
        }
      `}</style>

      {/* ─── MODAL BACKDROP ─── */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4 print:hidden"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* ─── Header ─── */}
          <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/30">
                {ticket.queue_number || ticket.ticket_number}
              </span>
              <span className="font-bold text-sm text-foreground">Service Token Receipt</span>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ─── Scrollable Receipt Body ─── */}
          <div className="p-4 sm:p-6 pb-6 overflow-y-auto flex-1 flex justify-center bg-zinc-900/50">
            <div ref={receiptRef} className="shadow-2xl rounded overflow-visible border border-gray-300 bg-white mb-4 pb-2">
              {/* This is the actual 80mm thermal receipt */}
              <div
                id="thermal-service-receipt"
                className="thermal-receipt bg-white text-black p-3 mx-auto select-none"
                style={{
                  width: "80mm",
                  maxWidth: "100%",
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: "11px",
                  lineHeight: "1.35",
                  color: "#000",
                }}
              >
                {/* ─── Branding Header ─── */}
                <div className="text-center pb-2 mb-2 border-b-2 border-dashed border-black flex flex-col items-center">
                  <PonmaniLogo variant="bw" className="h-20 w-auto mx-auto mb-1" />
                  <div className="text-[9.5px] font-bold tracking-tight uppercase">{headerTagline}</div>
                  <div className="text-[9px] mt-0.5">{shopAddress}</div>
                  <div className="text-[9px] font-semibold">Ph: {shopPhone}</div>
                  {shopGst && (
                    <div className="text-[9px] font-bold mt-0.5 border border-black px-1.5 py-0.5 inline-block">
                      GSTIN: {shopGst}
                    </div>
                  )}
                </div>

                {/* ─── Queue Token Block ─── */}
                <div className="bg-black text-white p-2 rounded text-center mb-2">
                  <div className="text-[8px] uppercase tracking-widest text-gray-400 mb-0.5">SERVICE QUEUE TOKEN</div>
                  <div className="text-3xl font-black tracking-wider" style={{ fontFamily: "Arial, sans-serif" }}>
                    {ticket.queue_number || "TOKEN #01"}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-yellow-300 mt-0.5">
                    TICKET #: {ticket.ticket_number}
                  </div>
                </div>

                {/* ─── Customer & Intake ─── */}
                <div className="text-[10px] space-y-0.5 pb-2 mb-2 border-b border-dashed border-gray-500">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Intake Time:</span>
                    <span className="font-bold">
                      {new Date(ticket.created_at).toLocaleDateString("en-IN")}{" "}
                      {new Date(ticket.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-bold">{ticket.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mobile:</span>
                    <span className="font-bold font-mono">{ticket.customer_mobile || "N/A"}</span>
                  </div>
                </div>

                {/* ─── Device & Serial ─── */}
                <div className="bg-gray-100 p-2 rounded border border-gray-300 text-[10px] mb-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600 font-bold">Device / Model:</span>
                    <span className="font-black text-black text-right max-w-[55%] break-words">{ticket.device_name}</span>
                  </div>
                  <div className="flex justify-between bg-yellow-100 px-1 py-0.5 rounded font-mono">
                    <span className="text-gray-800 font-bold">Serial No (S/N):</span>
                    <span className="font-black text-black">{ticket.serial_number || "N/A"}</span>
                  </div>
                </div>

                {/* ─── Reported Issue ─── */}
                <div className="text-[10px] pb-2 mb-2 border-b border-dashed border-gray-500">
                  <div className="text-[8.5px] uppercase font-bold text-gray-600 mb-1">Reported Issue / Symptoms:</div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-1.5 font-semibold" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {ticket.issue_description || "General Service & Repair Checkup"}
                  </div>
                </div>

                {/* ─── Cost & Status ─── */}
                <div className="text-[10px] space-y-1 pb-2 mb-2 border-b border-dashed border-gray-500">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Est. Repair Cost:</span>
                    <span className="font-bold font-mono">{inr(ticket.estimated_cost)}</span>
                  </div>
                  {ticket.final_cost > 0 && (
                    <div className="flex justify-between font-bold border-t border-gray-300 pt-1">
                      <span>Final Amount:</span>
                      <span className="font-mono font-black">{inr(ticket.final_cost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[9px] uppercase border-t border-dashed border-gray-400 pt-1">
                    <span>Status:</span>
                    <span className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded">{ticket.status}</span>
                  </div>
                </div>

                {/* ─── Footer Terms ─── */}
                <div className="text-center border-t-2 border-dashed border-black pt-2 text-[8.5px] text-gray-700 space-y-0.5 leading-tight whitespace-pre-line">
                  {ticketTerms}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Action Toolbar ─── */}
          <div className="px-5 py-3 border-t border-border bg-card flex items-center justify-between">
            <div className="text-xs text-muted-foreground font-mono">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">ESC</kbd> to close
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowWhatsAppDialog(true)}
                className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Share2 className="h-4 w-4" /> Share WhatsApp
              </button>
              <button
                onClick={() => window.print()}
                className="h-9 px-4 rounded-lg bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── WHATSAPP SHARE DIALOG OVERLAY ─── */}
      {showWhatsAppDialog && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm grid place-items-center p-4 print:hidden"
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

              <div className="space-y-2 pt-1">
                {/* Image (Recommended) */}
                <button
                  disabled={isExporting}
                  onClick={handleShareImage}
                  className="w-full p-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg flex items-start gap-3 text-left transition"
                >
                  <ImageIcon className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-emerald-400">Send as Image (Recommended)</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Copies receipt image to clipboard and opens WhatsApp — press Ctrl+V to paste & send.
                    </div>
                  </div>
                </button>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleSendText}
                    className="h-9 px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Send className="h-3.5 w-3.5" /> Send Text Message
                  </button>
                  <button
                    onClick={handleCopyText}
                    className="h-9 px-3 rounded bg-secondary border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-muted"
                  >
                    {copiedTxt ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Clipboard className="h-3.5 w-3.5" />}
                    {copiedTxt ? "Copied!" : "Copy Text"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
