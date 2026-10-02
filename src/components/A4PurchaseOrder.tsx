import React, { useRef, useState, useEffect } from "react";
import { PurchaseOrder, PurchaseItem, Vendor } from "@/lib/db/db";
import { inr, qty } from "@/lib/format";
import { PonmaniLogo } from "./PonmaniLogo";
import { Edit3, Save } from "lucide-react";

interface A4PurchaseOrderProps {
  order: PurchaseOrder;
  items: PurchaseItem[];
  vendor?: Vendor;
  storeSettings?: Record<string, any>;
  notes?: string;
  isEditingNotes?: boolean;
  onStartEditNotes?: () => void;
  onCancelEditNotes?: () => void;
  onSaveNotes?: (notes: string) => void;
  onChangeNotes?: (notes: string) => void;
}

/**
 * Generate SVG Barcode lines for Code128 representation of PO Number
 */
function SimpleBarcodeSVG({ value }: { value: string }) {
  const lines: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    lines.push((code % 3) + 1, ((code * 7) % 3) + 1, ((code * 13) % 2) + 1);
  }

  let currentX = 10;
  const rects: { x: number; width: number }[] = [];

  lines.forEach((w) => {
    rects.push({ x: currentX, width: w });
    currentX += w + ((w % 2) + 1);
  });

  const totalWidth = currentX + 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>
      <svg
        width={Math.min(totalWidth, 260)}
        height="36"
        viewBox={`0 0 ${totalWidth} 36`}
        style={{ maxWidth: "100%" }}
      >
        <rect width={totalWidth} height="36" fill="#ffffff" />
        {rects.map((r, idx) => (
          <rect key={idx} x={r.x} y="2" width={r.width} height="32" fill="#000000" />
        ))}
      </svg>
      <div style={{ fontFamily: "monospace", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "bold", color: "#000", marginTop: "2px" }}>
        *{value}*
      </div>
    </div>
  );
}

export function A4PurchaseOrder({
  order: o,
  items = [],
  vendor,
  storeSettings,
  notes = "",
  isEditingNotes = false,
  onStartEditNotes,
  onCancelEditNotes,
  onSaveNotes,
  onChangeNotes,
}: A4PurchaseOrderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (wrapperRef.current) {
        // Standard A4 width in pixels at 96DPI is ~794px (210mm)
        const containerWidth = wrapperRef.current.clientWidth;
        const targetWidth = 794;
        if (containerWidth < targetWidth && containerWidth > 0) {
          setScale(containerWidth / targetWidth);
        } else {
          setScale(1);
        }
      }
    }
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const shopName = storeSettings?.shop_name || "PONMANI AGENCIES";
  const shopHeaderNote = storeSettings?.receipt_header_note || "Hardware • Electricals • Electronics";
  const shopAddress = storeSettings?.shop_address || "142 Main Road, Tenkasi, Tamil Nadu - 627811";
  const shopPhone = storeSettings?.shop_phone || "+91 94422 12345";
  const shopGstin = storeSettings?.shop_gstin || "33AAPFP1234H1Z9";

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.cost_price), 0);
  const tax = Number(o.tax_amount || 0);
  const discount = Number(o.discount_amount || 0);
  const grandTotal = Number(o.total_amount || 0);
  const paid = Number(o.paid_amount || 0);
  const due = grandTotal - paid;

  const dateStr = (o.created_at || new Date().toISOString()).split("T")[0];
  const expectedDateStr = o.expected_date ? o.expected_date.split("T")[0] : null;

  return (
    <div ref={wrapperRef} className="w-full flex justify-center items-start print:block print:w-auto">
      {/* ─── EXACT A4 PAPER CONTAINER (210mm x 297mm) ─── */}
      <div
        style={{
          width: "210mm",
          minHeight: "297mm",
          transform: scale < 1 ? `scale(${scale})` : "none",
          transformOrigin: "top center",
          marginBottom: scale < 1 ? `-${(1 - scale) * 1123}px` : "0px",
          boxSizing: "border-box",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          lineHeight: "1.5",
          color: "#000",
        }}
        className="a4-sheet bg-white text-black p-10 shadow-2xl border border-gray-300 rounded-sm print:shadow-none print:border-none print:transform-none print:m-0 print:p-8 shrink-0"
      >
        {/* ─── BRANDING HEADER ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #000", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <PonmaniLogo variant="color" style={{ height: "76px", width: "auto" }} />
            <div>
              <div style={{ fontSize: "15px", fontWeight: "900", textTransform: "uppercase", color: "#000", letterSpacing: "0.5px" }}>
                {shopName}
              </div>
              <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#374151", marginTop: "1px" }}>
                {shopHeaderNote}
              </div>
              <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "2px" }}>
                {shopAddress}
              </div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#111827", marginTop: "2px" }}>
                Ph: {shopPhone}
              </div>
              {shopGstin && (
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#111827", marginTop: "2px" }}>
                  GSTIN: {shopGstin}
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "18px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px", color: "#000" }}>
              PURCHASE ORDER
            </div>
            <div style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "monospace", color: "#1d4ed8", marginTop: "2px" }}>
              {o.po_number}
            </div>
            <div style={{ fontSize: "11px", color: "#374151", marginTop: "4px" }}>
              <strong>PO Date:</strong> {dateStr}
            </div>
            {expectedDateStr && (
              <div style={{ fontSize: "11px", color: "#374151" }}>
                <strong>Exp. Delivery:</strong> {expectedDateStr}
              </div>
            )}
            <div style={{ marginTop: "4px" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  borderRadius: "4px",
                  border: "1px solid #94a3b8",
                  background: o.status === "Received" ? "#ecfdf5" : o.status === "Ordered" ? "#eff6ff" : "#fefce8",
                  color: o.status === "Received" ? "#065f46" : o.status === "Ordered" ? "#1e40af" : "#854d0e",
                }}
              >
                STATUS: {o.status}
              </span>
            </div>
          </div>
        </div>

        {/* ─── VENDOR / SUPPLIER DETAILS ─── */}
        <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Vendor / Supplier:
            </div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a", marginTop: "2px" }}>
              {vendor?.company_name || o.vendor_name}
            </div>
            {vendor?.name && vendor.name !== vendor.company_name && (
              <div style={{ fontSize: "11px", color: "#334155", marginTop: "1px" }}>
                Attn: {vendor.name}
              </div>
            )}
            {vendor?.phone && (
              <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#334155", marginTop: "1px" }}>
                Phone: {vendor.phone}
              </div>
            )}
            {vendor?.gst_number && (
              <div style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: "600", color: "#1e293b", marginTop: "1px" }}>
                GSTIN: {vendor.gst_number}
              </div>
            )}
            {vendor?.address && (
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "1px" }}>
                {vendor.address}
              </div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Payment &amp; Terms:
            </div>
            <div style={{ fontSize: "11px", color: "#334155", marginTop: "4px" }}>
              Advance Paid: <strong style={{ fontFamily: "monospace" }}>₹{paid.toFixed(2)}</strong>
            </div>
            <div style={{ fontSize: "11px", color: "#334155", marginTop: "2px" }}>
              Balance Payable: <strong style={{ fontFamily: "monospace", color: due > 0 ? "#b91c1c" : "#15803d" }}>₹{due.toFixed(2)}</strong>
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
              Billing Unit: PONMANI AGENCIES
            </div>
          </div>
        </div>

        {/* ─── ITEMS TABLE ─── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead>
            <tr style={{ background: "#0f172a", color: "#ffffff" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", width: "40px" }}>#</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>Item Description</th>
              <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", width: "80px" }}>Qty</th>
              <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", width: "110px" }}>Unit Cost (₹)</th>
              <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", width: "70px" }}>GST %</th>
              <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", width: "120px" }}>Total Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((it, idx) => {
                const itemQty = Number(it.qty || 1);
                const costPrice = Number(it.cost_price || 0);
                const lineTotal = itemQty * costPrice;
                const gstRate = it.gst_rate ?? 0;

                return (
                  <tr key={it.id || idx} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    <td style={{ padding: "8px 10px", color: "#64748b", fontFamily: "monospace", fontSize: "11px" }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ fontWeight: "bold", color: "#0f172a" }}>
                        {it.product_name}
                      </div>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: "bold", fontFamily: "monospace" }}>
                      {qty(itemQty)} {it.unit || "PCS"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                      {costPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", color: "#475569" }}>
                      {gstRate ? `${gstRate}%` : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>
                      {lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: "16px", textAlign: "center", fontStyle: "italic", color: "#64748b" }}>
                  No items listed in this purchase order.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ─── FINANCIAL TOTALS ─── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
          <div style={{ width: "300px", fontSize: "11px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#475569" }}>Subtotal:</span>
              <span style={{ fontFamily: "monospace", fontWeight: "600" }}>₹{subtotal.toFixed(2)}</span>
            </div>

            {tax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                <span>Tax (GST):</span>
                <span style={{ fontFamily: "monospace", fontWeight: "600" }}>+₹{tax.toFixed(2)}</span>
              </div>
            )}

            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#dc2626", borderBottom: "1px solid #f1f5f9" }}>
                <span>Discount:</span>
                <span style={{ fontFamily: "monospace", fontWeight: "600" }}>-₹{discount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 4px 0", borderTop: "2px solid #0f172a", marginTop: "6px", fontSize: "14px", fontWeight: "bold", color: "#0f172a" }}>
              <span>TOTAL AMOUNT:</span>
              <span style={{ fontFamily: "monospace", fontSize: "17px", color: "#000" }}>
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
              <span>Advance Paid:</span>
              <span style={{ fontFamily: "monospace", fontWeight: "600" }}>₹{paid.toFixed(2)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 2px 0", fontWeight: "bold", fontSize: "12px", color: due > 0 ? "#b91c1c" : "#15803d" }}>
              <span>BALANCE PAYABLE:</span>
              <span style={{ fontFamily: "monospace", fontSize: "13px" }}>
                ₹{due.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ─── CUSTOMIZED ORDER INSTRUCTIONS & NOTES ─── */}
        <div
          style={{
            padding: "12px 14px",
            background: "#f8fafc",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#475569", letterSpacing: "0.5px" }}>
              Customized Order Instructions &amp; Terms:
            </div>
            {onStartEditNotes && !isEditingNotes && (
              <button
                type="button"
                onClick={onStartEditNotes}
                data-capture-hide="true"
                className="text-[10px] font-bold text-blue-600 hover:underline print:hidden flex items-center gap-1"
              >
                <Edit3 className="h-3 w-3" /> Edit Notes
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-2 print:hidden" data-capture-hide="true">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => onChangeNotes && onChangeNotes(e.target.value)}
                placeholder="Type customized order instructions, packing requests, payment terms, or delivery specs..."
                className="w-full p-2 text-xs border border-gray-300 rounded font-sans text-black focus:outline-none focus:border-black"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelEditNotes}
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onSaveNotes && onSaveNotes(notes)}
                  className="px-3 py-1 text-xs bg-black text-white rounded font-bold flex items-center gap-1"
                >
                  <Save className="h-3 w-3" /> Save Notes
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: "11px",
                color: "#334155",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: "1.5",
              }}
            >
              {notes.trim() ? notes : (storeSettings?.po_footer_terms || "Please acknowledge receipt of this Purchase Order and confirm delivery schedule.")}
            </div>
          )}
        </div>

        {/* ─── AUTHORIZATION & SIGNATURE BOX ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed #cbd5e1" }}>
          <div>
            <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#64748b" }}>
              Supplier Acceptance
            </div>
            <div style={{ marginTop: "36px", borderTop: "1px solid #94a3b8", width: "180px", textAlign: "center", fontSize: "10px", color: "#475569" }}>
              Authorized Signature &amp; Stamp
            </div>
          </div>

          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#64748b" }}>
              For {shopName}
            </div>
            <div style={{ marginTop: "36px", borderTop: "1px solid #94a3b8", width: "180px", textAlign: "center", fontSize: "10px", color: "#475569" }}>
              Authorized Signatory
            </div>
          </div>
        </div>

        {/* ─── BARCODE SCANNER ─── */}
        <SimpleBarcodeSVG value={o.po_number || "PO-0000"} />

        {/* ─── FOOTER ─── */}
        <div style={{ marginTop: "20px", paddingTop: "10px", textAlign: "center", fontSize: "9px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>
          PONMANI AGENCIES • PURCHASE MANAGEMENT SYSTEM
        </div>
      </div>
    </div>
  );
}
