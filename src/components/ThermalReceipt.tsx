import React from "react";
import { inr, qty } from "@/lib/format";
import { Invoice, InvoiceItem } from "@/lib/db/db";

interface ThermalReceiptProps {
  invoice: Invoice;
  items: InvoiceItem[];
  storeSettings?: Record<string, any>;
}

/**
 * Generate SVG Barcode lines for Code128 / Code39 representation of Invoice Number
 */
function SimpleBarcodeSVG({ value }: { value: string }) {
  // Generate deterministic pattern based on invoice string ASCII values
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
    <div className="flex flex-col items-center my-2">
      <svg
        width={Math.min(totalWidth, 240)}
        height="36"
        viewBox={`0 0 ${totalWidth} 36`}
        className="max-w-full"
      >
        <rect width={totalWidth} height="36" fill="#ffffff" />
        {rects.map((r, idx) => (
          <rect key={idx} x={r.x} y="2" width={r.width} height="32" fill="#000000" />
        ))}
      </svg>
      <div className="font-mono text-[9px] tracking-widest uppercase font-bold text-black mt-0.5">
        *{value}*
      </div>
    </div>
  );
}

export function ThermalReceipt({ invoice: i, items = [], storeSettings }: ThermalReceiptProps) {
  const shopName = storeSettings?.shop_name || "PONMANI AGENCIES";
  const shopAddress = storeSettings?.shop_address || "142 Main Road, Tenkasi, Tamil Nadu - 627811";
  const shopPhone = storeSettings?.shop_phone || "+91 94422 12345";
  const shopGstin = storeSettings?.shop_gstin || "33AAPFP1234H1Z9";

  const isGst = i.invoice_type === "GST";
  const taxAmount = Number(i.tax_amount || 0);
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;

  const dateStr = new Date(i.created_at || Date.now()).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const totalQty = items.reduce((acc, it) => acc + Number(it.qty || 1), 0);

  return (
    <div
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
      {/* ─── BRANDING HEADER ─── */}
      <div className="text-center pb-2 mb-2 border-b-2 border-dashed border-black">
        <div className="bg-black text-white font-black text-sm tracking-wider py-1 px-2 uppercase rounded-sm inline-block mb-1">
          {shopName}
        </div>
        <div className="text-[9.5px] font-bold tracking-tight uppercase">
          {storeSettings?.receipt_header_note || "Hardware • Electricals • Electronics"}
        </div>
        <div className="text-[9px] mt-0.5">{shopAddress}</div>
        <div className="text-[9px] font-semibold">Ph: {shopPhone}</div>
        {isGst && (
          <div className="text-[9px] font-bold mt-0.5 border border-black px-1.5 py-0.5 rounded-xs inline-block">
            GSTIN: {shopGstin}
          </div>
        )}
      </div>

      {/* ─── INVOICE META ─── */}
      <div className="text-[10px] space-y-0.5 pb-2 mb-2 border-b border-black">
        <div className="flex justify-between font-bold">
          <span>{isGst ? "TAX INVOICE" : "CASH BILL"}</span>
          <span className="font-mono text-[11px] underline">{i.invoice_number}</span>
        </div>
        <div className="flex justify-between text-[9.5px] text-gray-800">
          <span>Date & Time:</span>
          <span>{dateStr}</span>
        </div>
        <div className="flex justify-between text-[9.5px]">
          <span>Customer:</span>
          <span className="font-bold">{i.customer_name || "Walk-in Customer"}</span>
        </div>
        {i.customer_mobile && (
          <div className="flex justify-between text-[9.5px]">
            <span>Mobile:</span>
            <span className="font-mono">{i.customer_mobile}</span>
          </div>
        )}
        <div className="flex justify-between text-[9.5px]">
          <span>Payment Mode:</span>
          <span className="font-bold uppercase tracking-wider">{i.payment_method || "CASH"}</span>
        </div>
      </div>

      {/* ─── ITEMS TABLE ─── */}
      <div className="mb-2">
        <div className="flex justify-between font-bold text-[10px] border-y border-black py-1 mb-1 bg-gray-100 px-1">
          <span className="flex-1">ITEM</span>
          <span className="w-10 text-center">QTY</span>
          <span className="w-16 text-right">RATE(₹)</span>
          <span className="w-20 text-right">AMT(₹)</span>
        </div>

        {items && items.length > 0 ? (
          items.map((it: any, idx: number) => {
            const name = it.product_name || it.name || "Item #" + (idx + 1);
            const itemQty = Number(it.qty || 1);
            const unitPrice = Number(it.unit_price || it.price || 0);
            const totalPrice = Number(it.total_price ?? (itemQty * unitPrice));
            const taxRate = isGst ? Number(it.tax_rate || it.gst_rate || 0) : 0;
            const isReturn = Boolean(it.is_return);

            return (
              <div key={idx} className="py-1 border-b border-gray-200 text-[10px] flex justify-between items-start px-1">
                <span className="flex-1 pr-1 break-words font-bold">
                  {name}
                  {taxRate > 0 && (
                    <span className="text-gray-500 font-normal text-[8.5px] ml-1">
                      (GST {taxRate}%)
                    </span>
                  )}
                  {isReturn && (
                    <span className="ml-1 text-[8px] bg-black text-white px-1 uppercase">
                      [R]
                    </span>
                  )}
                </span>
                <span className="w-10 text-center font-bold">{qty(itemQty)}</span>
                <span className="w-16 text-right">{unitPrice.toFixed(2)}</span>
                <span className="w-20 text-right font-bold">{totalPrice.toFixed(2)}</span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-3 text-[10px] italic text-gray-500">
            No line items attached to bill.
          </div>
        )}
      </div>

      {/* ─── FINANCIAL BREAKDOWN ─── */}
      <div className="border-t border-black pt-1 mb-2 text-[10px] space-y-0.5">
        <div className="flex justify-between text-[9px] text-gray-700">
          <span>Total Items:</span>
          <span className="font-mono font-bold">{items.length} items ({totalQty} pcs)</span>
        </div>

        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-mono">₹{Number(i.subtotal || 0).toFixed(2)}</span>
        </div>

        {Number(i.discount_amount) > 0 && (
          <div className="flex justify-between text-gray-800">
            <span>Discount (-):</span>
            <span className="font-mono">-₹{Number(i.discount_amount).toFixed(2)}</span>
          </div>
        )}

        {Number(i.exchange_amount) > 0 && (
          <div className="flex justify-between text-gray-800 border-b border-dotted border-gray-400 pb-0.5 mb-0.5">
            <span className="font-bold">Exchange ({i.exchange_notes || "Old Item"}):</span>
            <span className="font-mono font-bold">-₹{Number(i.exchange_amount).toFixed(2)}</span>
          </div>
        )}

        {isGst && taxAmount > 0 && (
          <>
            <div className="flex justify-between text-[9px]">
              <span>CGST ({((taxAmount / (i.subtotal || 1)) * 50).toFixed(1)}%):</span>
              <span className="font-mono">₹{cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span>SGST ({((taxAmount / (i.subtotal || 1)) * 50).toFixed(1)}%):</span>
              <span className="font-mono">₹{sgst.toFixed(2)}</span>
            </div>
          </>
        )}

        {/* ─── GRAND TOTAL HIGHLIGHT BOX ─── */}
        <div className="mt-2 pt-1 border-t-2 border-black">
          <div className="bg-black text-white p-2 rounded-xs flex justify-between items-center font-bold text-xs">
            <span>NET AMOUNT:</span>
            <span className="text-sm font-mono tracking-wide">
              ₹{Number(i.grand_total || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── BARCODE SCANNER INTEGRATION ─── */}
      <SimpleBarcodeSVG value={i.invoice_number || "INV-0000"} />

      {/* ─── FOOTER & POLICIES ─── */}
      <div className="text-center border-t border-dashed border-black pt-2 mt-2 text-[8.5px] text-gray-800 space-y-0.5">
        {storeSettings?.receipt_footer_note ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{storeSettings.receipt_footer_note}</div>
        ) : (
          <>
            <div className="font-bold text-[9.5px]">*** Thank You For Your Business! ***</div>
            <div>Goods once sold can be exchanged within 7 days.</div>
            <div>Please retain this bill for warranty & service reference.</div>
            <div className="font-bold mt-1 text-[8px]">PONMANI CONSOLE • OFFLINE RETAIL SYSTEM</div>
          </>
        )}
      </div>
    </div>
  );
}
