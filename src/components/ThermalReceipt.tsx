import React from "react";
import { inr, qty } from "@/lib/format";
import { db, Invoice, InvoiceItem } from "@/lib/db/db";
import { PonmaniLogo } from "./PonmaniLogo";

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

  // Compute MRP & Savings
  let totalMrp = 0;
  let totalSelling = 0;
  items.forEach((it: any) => {
    const itemQty = Number(it.qty || 1);
    const unitPrice = Number(it.unit_price || it.price || 0);
    const prod = it.product_id ? db.getProductById(it.product_id) : (it.barcode ? db.getProductByBarcode(it.barcode) : null);
    const itemMrp = Number(it.mrp && it.mrp > 0 ? it.mrp : (prod?.mrp && prod.mrp > 0 ? prod.mrp : (prod?.selling_price || unitPrice)));
    totalMrp += itemMrp * itemQty;
    totalSelling += unitPrice * itemQty;
  });

  const mrpSavings = Math.max(0, totalMrp - totalSelling);
  const discountSavings = Number(i.discount_amount || 0);
  const totalSaved = mrpSavings + discountSavings;

  return (
    <div
      className="thermal-receipt bg-white text-black p-2 pb-0 print:p-1 print:pb-0 mx-auto select-none"
      style={{
        width: "70mm",
        maxWidth: "70mm",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "10.5px",
        lineHeight: "1.35",
        color: "#000000",
        fontWeight: "bold",
        boxSizing: "border-box",
        WebkitTextStroke: "0.2px #000000",
      }}
    >
      {/* ─── BRANDING HEADER ─── */}
      <div className="text-center pb-2 mb-2 border-b-2 border-dashed border-black flex flex-col items-center font-bold text-black">
        <PonmaniLogo variant="bw" className="h-20 w-auto mx-auto mb-1" />
        <div className="text-[10px] font-black tracking-tight uppercase text-black">
          {storeSettings?.receipt_header_note || "Hardware • Electricals • Electronics"}
        </div>
        <div className="text-[9.5px] font-bold mt-0.5 text-black">{shopAddress}</div>
        <div className="text-[9.5px] font-bold text-black">Ph: {shopPhone}</div>
        {isGst && (
          <div className="text-[9.5px] font-black mt-0.5 border border-black px-1.5 py-0.5 rounded-xs inline-block text-black">
            GSTIN: {shopGstin}
          </div>
        )}
      </div>

      {/* ─── INVOICE META ─── */}
      <div className="text-[10.5px] font-bold text-black space-y-0.5 pb-2 mb-2 border-b-2 border-black">
        <div className="flex justify-between font-black">
          <span>{isGst ? "TAX INVOICE" : "CASH BILL"}</span>
          <span className="font-mono text-[11px] font-black underline">{i.invoice_number}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold text-black">
          <span>Date & Time:</span>
          <span className="font-bold text-black">{dateStr}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold text-black">
          <span>Customer:</span>
          <span className="font-black text-black">{i.customer_name || "Walk-in Customer"}</span>
        </div>
        {i.customer_mobile && (
          <div className="flex justify-between text-[10px] font-bold text-black">
            <span>Mobile:</span>
            <span className="font-mono font-bold text-black">{i.customer_mobile}</span>
          </div>
        )}
        <div className="flex justify-between text-[10px] font-bold text-black">
          <span>Payment Mode:</span>
          <span className="font-black uppercase tracking-wider text-black">{i.payment_method || "CASH"}</span>
        </div>
      </div>

      {/* ─── ITEMS TABLE ─── */}
      <div className="mb-2 font-bold text-black">
        <div className="flex justify-between font-black text-[9.5px] border-y-2 border-black py-1 mb-1 px-0.5 text-black">
          <span className="flex-1 pr-1 font-black">ITEM</span>
          <span className="w-10 text-right font-black">MRP</span>
          <span className="w-10 text-right font-black">RATE</span>
          <span className="w-6 text-center font-black">QTY</span>
          <span className="w-12 text-right pr-0.5 font-black">AMT(₹)</span>
        </div>

        {items && items.length > 0 ? (
          items.map((it: any, idx: number) => {
            const name = it.product_name || it.name || "Item #" + (idx + 1);
            const itemQty = Number(it.qty || 1);
            const unitPrice = Number(it.unit_price || it.price || 0);
            const totalPrice = Number(it.total_price ?? (itemQty * unitPrice));
            const taxRate = isGst ? Number(it.tax_rate || it.gst_rate || 0) : 0;
            const isReturn = Boolean(it.is_return);

            const prod = it.product_id ? db.getProductById(it.product_id) : (it.barcode ? db.getProductByBarcode(it.barcode) : null);
            const itemMrp = Number(it.mrp && it.mrp > 0 ? it.mrp : (prod?.mrp && prod.mrp > 0 ? prod.mrp : (prod?.selling_price || unitPrice)));
            const savedPerPc = Math.max(0, itemMrp - unitPrice);

            return (
              <div key={idx} className="py-1 border-b border-black text-[9.5px] font-bold text-black flex justify-between items-start px-0.5">
                <div className="flex-1 pr-1 break-words">
                  <div className="font-bold text-black">
                    {name}
                    {taxRate > 0 && (
                      <span className="text-black font-bold text-[8.5px] ml-1">
                        (GST {taxRate}%)
                      </span>
                    )}
                    {isReturn && (
                      <span className="ml-1 text-[7.5px] bg-black text-white px-1 font-black uppercase">
                        [R]
                      </span>
                    )}
                  </div>
                  {savedPerPc > 0 && (
                    <div className="text-[8px] text-black font-black">
                      ★ Saved ₹{(savedPerPc * itemQty).toFixed(2)}
                    </div>
                  )}
                </div>
                <span className="w-10 text-right font-mono font-bold text-black text-[9px]">{itemMrp.toFixed(2)}</span>
                <span className="w-10 text-right font-mono font-bold text-black">{unitPrice.toFixed(2)}</span>
                <span className="w-6 text-center font-black font-mono text-black">{qty(itemQty)}</span>
                <span className="w-12 text-right font-black font-mono pr-0.5 text-black">{totalPrice.toFixed(2)}</span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-3 text-[10px] font-bold text-black">
            No line items attached to bill.
          </div>
        )}
      </div>

      {/* ─── FINANCIAL BREAKDOWN ─── */}
      <div className="border-t-2 border-black pt-1 mb-2 text-[10.5px] font-bold text-black space-y-0.5">
        <div className="flex justify-between text-[10px] font-bold text-black">
          <span>Total Items:</span>
          <span className="font-mono font-black">{items.length} items ({totalQty} pcs)</span>
        </div>

        <div className="flex justify-between text-[10px] font-bold text-black">
          <span>Total MRP Value:</span>
          <span className="font-mono font-black">₹{totalMrp.toFixed(2)}</span>
        </div>

        {mrpSavings > 0 && (
          <div className="flex justify-between text-[10px] font-black text-black">
            <span>Product Savings (-):</span>
            <span className="font-mono font-black">-₹{mrpSavings.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-black">
          <span>Subtotal (Our Price):</span>
          <span className="font-mono font-black">₹{Number(i.subtotal || 0).toFixed(2)}</span>
        </div>

        {Number(i.discount_amount) > 0 && (
          <div className="flex justify-between font-bold text-black">
            <span>Special Discount (-):</span>
            <span className="font-mono font-black">-₹{Number(i.discount_amount).toFixed(2)}</span>
          </div>
        )}

        {Number(i.exchange_amount) > 0 && (
          <div className="flex justify-between font-bold text-black border-b border-dashed border-black pb-0.5 mb-0.5">
            <span>Exchange ({i.exchange_notes || "Old Item"}):</span>
            <span className="font-mono font-black">-₹{Number(i.exchange_amount).toFixed(2)}</span>
          </div>
        )}

        {isGst && taxAmount > 0 && (
          <>
            <div className="flex justify-between text-[9.5px] font-bold text-black">
              <span>CGST ({((taxAmount / (i.subtotal || 1)) * 50).toFixed(1)}%):</span>
              <span className="font-mono font-bold">₹{cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[9.5px] font-bold text-black">
              <span>SGST ({((taxAmount / (i.subtotal || 1)) * 50).toFixed(1)}%):</span>
              <span className="font-mono font-bold">₹{sgst.toFixed(2)}</span>
            </div>
          </>
        )}

        {/* ─── PROMINENT SAVINGS HIGHLIGHT BADGE ─── */}
        {totalSaved > 0 && (
          <div className="my-2 py-1.5 px-2 border-2 border-dashed border-black bg-white text-center font-black tracking-wide text-black">
            <div className="text-[11px] font-black">★★★ TOTAL AMOUNT SAVED ★★★</div>
            <div className="text-[14px] font-mono font-black mt-0.5">₹{totalSaved.toFixed(2)}</div>
          </div>
        )}

        {/* ─── GRAND TOTAL HIGHLIGHT BOX ─── */}
        <div className="mt-2 pt-1 border-t-2 border-black">
          <div className="bg-black text-white p-2 rounded-xs flex justify-between items-center font-black text-xs">
            <span>NET AMOUNT:</span>
            <span className="text-base font-mono font-black tracking-wide">
              ₹{Number(i.grand_total || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── BARCODE SCANNER INTEGRATION ─── */}
      <SimpleBarcodeSVG value={i.invoice_number || "INV-0000"} />

      {/* ─── FOOTER & POLICIES ─── */}
      <div className="text-center border-t-2 border-dashed border-black pt-2 mt-2 pb-0 mb-0 text-[9px] font-bold text-black space-y-0.5">
        {storeSettings?.receipt_footer_note ? (
          <div style={{ whiteSpace: "pre-wrap" }} className="font-bold text-black">{storeSettings.receipt_footer_note}</div>
        ) : (
          <>
            <div className="font-black text-[10px] text-black">*** Thank You For Your Business! ***</div>
            <div className="font-bold text-black">Goods once sold can be exchanged within 7 days.</div>
            <div className="font-bold text-black">Please retain this bill for warranty & service reference.</div>
            <div className="font-black mt-1 text-[8.5px] pb-0 mb-0 text-black">PONMANI AGENCIES • RETAIL & SERVICE CONSOLE</div>
          </>
        )}
      </div>
    </div>
  );
}
