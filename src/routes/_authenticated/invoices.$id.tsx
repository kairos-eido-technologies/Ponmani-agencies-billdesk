import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { db } from "@/lib/db/db";
import { inr, qty } from "@/lib/format";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices/$id")({ component: InvoiceDetail });

function InvoiceDetail() {
  const { id } = Route.useParams();
  const inv = useQuery({
    queryKey: ["local-invoice-detail", id],
    queryFn: async () => {
      const all = db.getInvoices();
      const found = all.find((item) => item.invoice.id === id || item.invoice.invoice_number === id);
      return found || null;
    },
  });

  const i = inv.data?.invoice;
  const items = inv.data?.items ?? [];

  useEffect(() => {
    if (i) {
      const timer = setTimeout(() => { window.print(); }, 500);
      return () => clearTimeout(timer);
    }
  }, [i]);

  if (!i) return <div className="p-6 text-sm text-muted-foreground">Invoice not found...</div>;

  function handlePrint() {
    window.print();
  }

  function handleWhatsAppShare() {
    const text = encodeURIComponent(
      `*Ponmani Agencies Tax Invoice*\nInvoice: ${i?.invoice_number}\nCustomer: ${i?.customer_name}\nAmount: ₹${i?.grand_total}\nThank you!`
    );
    window.open(`https://wa.me/91${i?.customer_mobile || ''}?text=${text}`, "_blank");
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/invoices" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
        </Link>
        <div className="flex gap-2">
          <button onClick={handleWhatsAppShare} className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted">
            <Share2 className="h-3.5 w-3.5 text-emerald-400" /> Share WhatsApp
          </button>
          <button onClick={handlePrint} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:accent-glow">
            <Printer className="h-4 w-4" /> Print Thermal Receipt
          </button>
        </div>
      </div>

      <div className="card-surface p-6 print:border-0 print:bg-white print:text-black">
        <div className="flex justify-between items-start pb-4 border-b border-border">
          <div>
            <div className="text-xl font-bold tracking-tight">Ponmani Agencies</div>
            <div className="text-xs text-muted-foreground">Hardware, Electricals & Electronics</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">GSTIN: 33AAPFP1234H1Z9 | Tenkasi, TN</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-bold text-primary">{i.invoice_number}</div>
            <div className="text-xs text-muted-foreground font-mono">{new Date(i.created_at).toLocaleString()}</div>
            <div className="text-[10px] uppercase font-bold text-emerald-400 mt-0.5">{i.invoice_type} SALE</div>
          </div>
        </div>

        <div className="py-3 text-xs border-b border-border flex justify-between">
          <div>
            <span className="text-muted-foreground">Customer: </span>
            <span className="font-semibold">{i.customer_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Phone: </span>
            <span className="font-mono">{i.customer_mobile || "Walk-in"}</span>
          </div>
        </div>

        <table className="w-full text-xs mt-3">
          <thead className="text-[10px] uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left py-2">Item Description</th>
              <th className="text-center py-2">Qty</th>
              <th className="text-right py-2">Rate</th>
              <th className="text-right py-2">GST %</th>
              <th className="text-right py-2">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="py-2.5 font-medium">{it.product_name}</td>
                <td className="text-center py-2.5 font-mono">{qty(it.qty)}</td>
                <td className="text-right py-2.5 font-mono">{inr(it.unit_price)}</td>
                <td className="text-right py-2.5 font-mono text-muted-foreground">{it.tax_rate}%</td>
                <td className="text-right py-2.5 font-mono font-semibold">{inr(it.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pt-4 flex justify-end">
          <div className="w-64 space-y-1.5 text-xs">
            <Row l="Subtotal" v={inr(i.subtotal)} />
            <Row l="Discount" v={inr(i.discount_amount)} />
            <Row l="Tax Amount (GST)" v={inr(i.tax_amount)} />
            <div className="flex justify-between pt-2 border-t border-border text-base font-bold">
              <span>Grand Total</span>
              <span className="font-mono text-primary">{inr(i.grand_total)}</span>
            </div>
            <div className="text-[10px] text-muted-foreground pt-2 border-t border-border flex justify-between">
              <span>Payment Method:</span>
              <span className="font-mono font-semibold text-foreground">{i.payment_method}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{l}</span>
      <span className="font-mono font-medium">{v}</span>
    </div>
  );
}