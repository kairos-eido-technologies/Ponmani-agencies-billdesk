import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db/db";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { ThermalReceipt } from "@/components/ThermalReceipt";
import { A4Receipt } from "@/components/A4Receipt";
import { BillViewerModal } from "@/components/BillViewerModal";

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
  const [showShareModal, setShowShareModal] = useState(false);

  const inv = useQuery({
    queryKey: ["local-invoice-detail", id],
    queryFn: async () => {
      await db.loadPromise;
      return db.getInvoice(id);
    },
  });

  const i = inv.data?.invoice;
  const items = inv.data?.items ?? [];
  const storeSettings = db.getSettings();

  // Auto-print once when data is ready
  useEffect(() => {
    if (i && !hasPrinted.current) {
      hasPrinted.current = true;
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [i]);

  function handlePrint() {
    window.print();
  }

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
        <Link to="/billing" className="text-primary underline">
          Back to Billing Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Screen-only toolbar ─── */}
      <div className="print:hidden px-6 py-3 border-b border-border flex items-center justify-between bg-card">
        <Link to="/billing" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Billing Hub
        </Link>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-muted-foreground font-mono border border-border rounded px-2 py-0.5">
            {isA4 ? "📄 Save as PDF (A4)" : printer ? `🖨️ ${printer}` : "🖨️ Thermal 80mm"}
          </span>

          <button
            onClick={() => setShowShareModal(true)}
            className="h-9 px-4 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Share2 className="h-4 w-4" /> Share WhatsApp
          </button>

          <button
            onClick={handlePrint}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition"
          >
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* ─── DYNAMIC PRINT PAGE STYLES ─── */}
      {!isA4 ? (
        <style>{`
          @media print {
            @page {
              size: 76mm auto !important;
              margin: 0mm !important;
            }
            html, body {
              width: 76mm !important;
              max-width: 76mm !important;
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
              width: 76mm !important;
              max-width: 76mm !important;
              margin: 0 auto !important;
              padding: 1.5mm 1.5mm 0mm 1.5mm !important;
              height: auto !important;
              min-height: 0 !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
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

      {/* ─── Receipt preview ─── */}
      <div className={`print:block flex justify-center items-start py-6 px-4 print:py-0 print:px-0 overflow-x-auto w-full ${isA4 ? "bg-gray-100" : ""}`}>
        {isA4 ? (
          <div className="shadow-2xl rounded overflow-hidden max-w-full print:shadow-none print:rounded-none">
            <A4Receipt invoice={i} items={items} storeSettings={storeSettings} />
          </div>
        ) : (
          <div className="shadow-2xl rounded overflow-hidden">
            <ThermalReceipt invoice={i} items={items} storeSettings={storeSettings} />
          </div>
        )}
      </div>

      {/* ─── Share Modal Overlay ─── */}
      {showShareModal && (
        <BillViewerModal
          invoiceId={id}
          invoiceData={{ invoice: i, items }}
          initialMode={isA4 ? "a4" : "thermal"}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}