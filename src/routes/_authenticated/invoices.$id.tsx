import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { db } from "@/lib/db/db";
import { inr, qty } from "@/lib/format";
import { ArrowLeft, Printer } from "lucide-react";
import { ThermalReceipt } from "@/components/ThermalReceipt";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  component: InvoiceDetail,
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode as string) || "thermal",
    printer: (s.printer as string) || "",
  }),
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const { mode, printer } = Route.useSearch();
  const isA4 = mode === "a4";
  const hasPrinted = useRef(false);

  const inv = useQuery({
    queryKey: ["local-invoice-detail", id],
    queryFn: async () => {
      await db.loadPromise;
      return db.getInvoice(id);
    },
  });

  const i = inv.data?.invoice;
  const items = inv.data?.items ?? [];

  // Auto-print once when data is ready
  useEffect(() => {
    if (i && !hasPrinted.current) {
      hasPrinted.current = true;
      const timer = setTimeout(() => { window.print(); }, 600);
      return () => clearTimeout(timer);
    }
  }, [i]);

  function handlePrint() { window.print(); }

  if (inv.isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-sm text-muted-foreground animate-pulse">Loading invoice...</div>
      </div>
    );
  }

  if (!i) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Invoice not found.{" "}
        <Link to="/billing" className="text-primary underline">Back to Billing Hub</Link>
      </div>
    );
  }

  const isGst = i.invoice_type === "GST";
  const cgst = i.tax_amount / 2;
  const sgst = i.tax_amount / 2;
  const dateStr = new Date(i.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Screen-only toolbar ─── */}
      <div className="print:hidden px-6 py-3 border-b border-border flex items-center justify-between bg-card">
        <Link to="/billing" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Billing Hub
        </Link>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-muted-foreground font-mono border border-border rounded px-2 py-0.5">
            {isA4
              ? "📄 Save as PDF (A4)"
              : printer
              ? `🖨️ ${printer}`
              : "🖨️ Thermal 80mm"}
          </span>
          <button
            onClick={handlePrint}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition"
          >
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* ─── Receipt preview ─── */}
      <div className={`print:block flex justify-center items-start py-6 px-4 print:py-0 print:px-0 ${isA4 ? 'bg-gray-100' : ''}`}>
        {isA4 ? (
          /* ── A4 Layout ── */
          <div
            className="thermal-receipt bg-white text-black"
            style={{ width: "210mm", padding: "15mm", fontFamily: "Arial, sans-serif", fontSize: "12px", lineHeight: "1.6", boxShadow: "0 2px 20px rgba(0,0,0,0.15)" }}
          >
            {/* A4 Header */}
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>PONMANI AGENCIES</div>
                <div style={{ fontSize: "11px", color: "#444" }}>Hardware, Electricals & Electronics</div>
                <div style={{ fontSize: "11px", color: "#444" }}>Tenkasi, Tamil Nadu — 627811</div>
                {isGst && <div style={{ fontSize: "11px", color: "#444" }}>GSTIN: 33AAPFP1234H1Z9</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "16px", fontWeight: "bold" }}>{isGst ? "TAX INVOICE" : "SALE BILL"}</div>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1a56db" }}>{i.invoice_number}</div>
                <div style={{ fontSize: "11px" }}>Date: {dateStr}</div>
                <div style={{ fontSize: "11px" }}>Payment: {i.payment_method}</div>
              </div>
            </div>

            {/* Customer */}
            <div style={{ marginBottom: "12px", padding: "8px", background: "#f5f5f5", borderRadius: "4px" }}>
              <div style={{ fontWeight: "bold" }}>Bill To:</div>
              <div>{i.customer_name}</div>
              {i.customer_mobile && <div>Mobile: {i.customer_mobile}</div>}
            </div>

            {/* Items table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
              <thead>
                <tr style={{ background: "#222", color: "#fff" }}>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>Item</th>
                  <th style={{ padding: "6px 8px", textAlign: "center" }}>Qty</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Rate (₹)</th>
                  {isGst && <th style={{ padding: "6px 8px", textAlign: "right" }}>GST%</th>}
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #ddd", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "6px 8px" }}>
                      <div style={{ fontWeight: "bold" }}>{it.product_name}</div>
                      {it.barcode && <div style={{ fontSize: "10px", color: "#777" }}>{it.barcode}</div>}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>{qty(it.qty)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>{Number(it.unit_price).toFixed(2)}</td>
                    {isGst && <td style={{ padding: "6px 8px", textAlign: "right", fontSize: "11px", color: "#555" }}>{it.tax_rate}%</td>}
                    <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>{Number(it.total_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: "260px" }}>
                <A4Row l="Subtotal" v={`₹ ${Number(i.subtotal).toFixed(2)}`} />
                {i.discount_amount > 0 && <A4Row l="Discount (-)" v={`₹ ${Number(i.discount_amount).toFixed(2)}`} />}
                {isGst && i.tax_amount > 0 && (
                  <>
                    <A4Row l="CGST" v={`₹ ${cgst.toFixed(2)}`} />
                    <A4Row l="SGST" v={`₹ ${sgst.toFixed(2)}`} />
                  </>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "15px", borderTop: "2px solid #000", marginTop: "6px", paddingTop: "6px" }}>
                  <span>GRAND TOTAL</span>
                  <span>₹ {Number(i.grand_total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: "20px", borderTop: "1px solid #ccc", paddingTop: "10px", fontSize: "10px", color: "#666", textAlign: "center" }}>
              Thank you for shopping at Ponmani Agencies! | Ph: +91 98765 43210 | Tenkasi
            </div>
          </div>
        ) : (
          <div className="shadow-2xl rounded overflow-hidden">
            <ThermalReceipt invoice={i} items={items} />
          </div>
        )}
      </div>
    </div>
  );
}

function ThermalRow({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", fontWeight: bold ? "bold" : "normal" }}>
      <span>{l}:</span>
      <span style={{ textAlign: "right", maxWidth: "55%" }}>{v}</span>
    </div>
  );
}

function A4Row({ l, v }: { l: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #eee" }}>
      <span style={{ color: "#555" }}>{l}</span>
      <span style={{ fontFamily: "monospace" }}>{v}</span>
    </div>
  );
}