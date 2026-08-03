import React, { useRef } from "react";
import { PonmaniLogo } from "./PonmaniLogo";

interface GSTReportData {
  // Period
  periodLabel: string;
  periodType: "month" | "fy";
  generatedAt: string;

  // Store
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopGstin: string;
  shopTagline: string;

  // Summary
  totalInvoices: number;
  gstInvoices: number;
  b2bCount: number;
  b2cCount: number;

  // Totals
  totalTaxable: number;
  totalOutputGST: number;
  cgstOutput: number;
  sgstOutput: number;
  itcInput: number;
  netTaxPayable: number;

  // B2B rows
  b2bRows: {
    gstin: string;
    name: string;
    invoiceNo: string;
    date: string;
    taxable: number;
    cgst: number;
    sgst: number;
    total: number;
  }[];

  // B2C rows
  b2cRows: {
    invoiceNo: string;
    date: string;
    customer: string;
    taxable: number;
    cgst: number;
    sgst: number;
    total: number;
  }[];

  // HSN rows
  hsnRows: {
    hsn: string;
    description: string;
    qty: number;
    rate: number;
    taxable: number;
    cgst: number;
    sgst: number;
  }[];

  // Tax rate breakup
  rateBreakup: {
    rate: number;
    taxable: number;
    cgst: number;
    sgst: number;
  }[];

  // ITC rows
  itcRows: {
    poNo: string;
    vendor: string;
    date: string;
    total: number;
    taxAmt: number;
  }[];
}

interface GSTReportDocumentProps {
  data: GSTReportData;
}

const INR = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const S = {
  page: {
    width: "210mm",
    minHeight: "297mm",
    background: "#fff",
    color: "#000",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "11px",
    lineHeight: "1.5",
    padding: "12mm 14mm",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "3px solid #1e293b",
    paddingBottom: "10px",
    marginBottom: "12px",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: "10px",
    fontWeight: "bold" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#1e293b",
    background: "#f1f5f9",
    padding: "5px 10px",
    borderLeft: "4px solid #1e293b",
    marginBottom: "6px",
    marginTop: "14px",
  } as React.CSSProperties,
  th: {
    background: "#1e293b",
    color: "#fff",
    padding: "5px 8px",
    fontSize: "9px",
    fontWeight: "bold" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    border: "1px solid #1e293b",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
  td: {
    padding: "4px 8px",
    fontSize: "9.5px",
    border: "1px solid #e2e8f0",
    verticalAlign: "top" as const,
  } as React.CSSProperties,
  tdMono: {
    padding: "4px 8px",
    fontSize: "9.5px",
    border: "1px solid #e2e8f0",
    fontFamily: "monospace",
    textAlign: "right" as const,
    verticalAlign: "top" as const,
  } as React.CSSProperties,
  foot: {
    background: "#f8fafc",
    fontWeight: "bold" as const,
    fontSize: "9.5px",
    padding: "5px 8px",
    border: "1px solid #cbd5e1",
    fontFamily: "monospace",
    textAlign: "right" as const,
  } as React.CSSProperties,
  kpiBox: {
    flex: 1,
    border: "1px solid #e2e8f0",
    borderRadius: "4px",
    padding: "8px 10px",
    background: "#f8fafc",
  } as React.CSSProperties,
  kpiLabel: {
    fontSize: "8.5px",
    textTransform: "uppercase" as const,
    color: "#64748b",
    fontWeight: "bold" as const,
    letterSpacing: "0.05em",
  } as React.CSSProperties,
  kpiValue: {
    fontSize: "13px",
    fontWeight: "900" as const,
    fontFamily: "monospace",
    color: "#0f172a",
    marginTop: "2px",
  } as React.CSSProperties,
};

export function GSTReportDocument({ data }: GSTReportDocumentProps) {
  return (
    <div
      className="a4-gst-report bg-white shadow-2xl border border-gray-300 shrink-0"
      style={S.page}
    >
      {/* ══ PAGE 1 ══════════════════════════════════════════════════════════ */}

      {/* ─── Header ─── */}
      <div style={S.headerRow}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <PonmaniLogo variant="color" style={{ height: "72px", width: "auto" }} />
          <div style={{ marginTop: "4px" }}>
            <div style={{ fontSize: "9.5px", color: "#475569", fontWeight: "bold", textTransform: "uppercase" }}>
              {data.shopTagline}
            </div>
            <div style={{ fontSize: "10px", color: "#334155", marginTop: "2px" }}>{data.shopAddress}</div>
            <div style={{ fontSize: "10px", fontWeight: "600", marginTop: "2px" }}>Ph: {data.shopPhone}</div>
            <div style={{ fontSize: "10px", fontWeight: "bold", marginTop: "1px", letterSpacing: "0.02em" }}>
              GSTIN: <span style={{ color: "#1d4ed8" }}>{data.shopGstin}</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "18px", fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase", color: "#0f172a" }}>
            GST COMPLIANCE
          </div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1d4ed8", marginTop: "2px", letterSpacing: "0.5px" }}>
            GSTR-1 REPORT
          </div>
          <div style={{ marginTop: "6px", background: "#0f172a", color: "#fff", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", display: "inline-block" }}>
            {data.periodLabel}
          </div>
          <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px" }}>
            Generated: {data.generatedAt}
          </div>
          <div style={{ fontSize: "9px", color: "#475569", marginTop: "1px" }}>
            State: Tamil Nadu (Code 33)
          </div>
        </div>
      </div>

      {/* ─── Declaration Box ─── */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", padding: "6px 10px", background: "#f8fafc", marginBottom: "12px", fontSize: "9px", color: "#475569" }}>
        <strong style={{ color: "#0f172a" }}>DECLARATION:</strong>{" "}
        This GST Compliance Report is auto-generated by Ponmani Agencies Retail Console for the period{" "}
        <strong>{data.periodLabel}</strong>. It covers outward supplies (GSTR-1), input tax credit (GSTR-2A),
        and net tax liability summary (GSTR-3B) as per the GST Act, 2017. All amounts are in Indian Rupees (₹).
        Place of Supply: <strong>Tamil Nadu (33)</strong>. Filing Type: <strong>CGST + SGST (Intrastate)</strong>.
      </div>

      {/* ─── KPI Summary Grid ─── */}
      <div style={S.sectionTitle}>Section 1 — Tax Summary at a Glance</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
        {[
          { label: "Total Invoices", value: String(data.totalInvoices), sub: `${data.gstInvoices} GST taxable` },
          { label: "B2B (Registered)", value: String(data.b2bCount), sub: "GSTIN holders" },
          { label: "B2C (Consumer)", value: String(data.b2cCount), sub: "unregistered buyers" },
          { label: "Taxable Turnover", value: INR(data.totalTaxable), sub: "excl. GST", color: "#065f46" },
          { label: "Output GST", value: INR(data.totalOutputGST), sub: "CGST + SGST", color: "#1e40af" },
          { label: "ITC Available", value: INR(data.itcInput), sub: "from purchases", color: "#92400e" },
          { label: "Net Tax Payable", value: INR(data.netTaxPayable), sub: "to Govt.", color: data.netTaxPayable > 0 ? "#991b1b" : "#065f46" },
        ].map((k) => (
          <div key={k.label} style={{ ...S.kpiBox, minWidth: "90px", flex: "1 1 90px" }}>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={{ ...S.kpiValue, color: k.color || "#0f172a" }}>{k.value}</div>
            <div style={{ fontSize: "8px", color: "#94a3b8", marginTop: "2px" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ─── Tax Liability Statement ─── */}
      <div style={S.sectionTitle}>Section 2 — Tax Liability Statement (GSTR-3B Summary)</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
        <thead>
          <tr>
            {["Description", "Taxable Value (₹)", "IGST (₹)", "CGST (₹)", "SGST (₹)", "Total Tax (₹)"].map((h) => (
              <th key={h} style={{ ...S.th, textAlign: h === "Description" ? "left" : "right" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            {
              desc: "3.1(a) Outward Taxable Supplies (B2B + B2C)",
              taxable: data.totalTaxable,
              igst: 0,
              cgst: data.cgstOutput,
              sgst: data.sgstOutput,
              highlight: false,
            },
            {
              desc: "3.1(c) Nil / Exempt / Non-GST Sales",
              taxable: 0, igst: 0, cgst: 0, sgst: 0,
              highlight: false,
            },
            {
              desc: "4A(i) ITC — Input Tax Credit (Purchases Received)",
              taxable: 0,
              igst: 0,
              cgst: -(data.itcInput / 2),
              sgst: -(data.itcInput / 2),
              highlight: false,
              deduct: true,
            },
            {
              desc: "5.1 Net Output Tax Liability (after ITC set-off)",
              taxable: data.totalTaxable,
              igst: 0,
              cgst: data.netTaxPayable / 2,
              sgst: data.netTaxPayable / 2,
              highlight: true,
            },
          ].map((row, i) => (
            <tr key={i} style={{ background: row.highlight ? "#f0f9ff" : i % 2 === 0 ? "#fff" : "#f8fafc" }}>
              <td style={{ ...S.td, fontWeight: row.highlight ? "bold" : "normal", color: row.highlight ? "#1e3a5f" : "#374151" }}>
                {row.desc}
              </td>
              <td style={{ ...S.tdMono }}>{row.taxable > 0 ? INR(row.taxable) : "—"}</td>
              <td style={{ ...S.tdMono, color: "#64748b" }}>₹0.00</td>
              <td style={{ ...S.tdMono, color: row.deduct ? "#b45309" : row.highlight ? "#1d4ed8" : "#374151", fontWeight: row.highlight ? "bold" : "normal" }}>
                {row.cgst !== 0 ? (row.cgst < 0 ? `(${INR(Math.abs(row.cgst))})` : INR(row.cgst)) : "—"}
              </td>
              <td style={{ ...S.tdMono, color: row.deduct ? "#b45309" : row.highlight ? "#7c3aed" : "#374151", fontWeight: row.highlight ? "bold" : "normal" }}>
                {row.sgst !== 0 ? (row.sgst < 0 ? `(${INR(Math.abs(row.sgst))})` : INR(row.sgst)) : "—"}
              </td>
              <td style={{ ...S.tdMono, fontWeight: "bold", color: row.highlight ? (data.netTaxPayable > 0 ? "#991b1b" : "#065f46") : "#374151" }}>
                {row.igst + Math.abs(row.cgst) + Math.abs(row.sgst) > 0
                  ? INR(row.igst + Math.abs(row.cgst) + Math.abs(row.sgst))
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Net payable highlight */}
      <div style={{
        padding: "8px 12px", borderRadius: "4px", marginBottom: "4px",
        background: data.netTaxPayable > 0 ? "#fef2f2" : "#f0fdf4",
        border: `1px solid ${data.netTaxPayable > 0 ? "#fecaca" : "#bbf7d0"}`,
        fontSize: "10px", fontWeight: "bold",
        color: data.netTaxPayable > 0 ? "#991b1b" : "#065f46",
      }}>
        {data.netTaxPayable > 0
          ? `⚠ NET TAX PAYABLE TO GOVERNMENT: ${INR(data.netTaxPayable)}  (CGST: ${INR(data.netTaxPayable / 2)}  +  SGST: ${INR(data.netTaxPayable / 2)})`
          : `✓ NO NET TAX PAYABLE — Input Tax Credit (ITC) covers output tax liability for this period.`
        }
      </div>

      {/* ─── Tax Rate Breakup ─── */}
      {data.rateBreakup.length > 0 && (
        <>
          <div style={S.sectionTitle}>Section 3 — Rate-wise Tax Breakup (for HSN Filing)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
            <thead>
              <tr>
                {["GST Rate", "Taxable Value (₹)", "CGST (₹)", "SGST (₹)", "Total GST (₹)"].map((h) => (
                  <th key={h} style={{ ...S.th, textAlign: h === "GST Rate" ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rateBreakup.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ ...S.td, fontWeight: "bold", color: "#1d4ed8" }}>{row.rate}%</td>
                  <td style={S.tdMono}>{INR(row.taxable)}</td>
                  <td style={{ ...S.tdMono, color: "#1d4ed8" }}>{INR(row.cgst)}</td>
                  <td style={{ ...S.tdMono, color: "#7c3aed" }}>{INR(row.sgst)}</td>
                  <td style={{ ...S.tdMono, fontWeight: "bold" }}>{INR(row.cgst + row.sgst)}</td>
                </tr>
              ))}
              <tr style={{ background: "#f1f5f9" }}>
                <td style={{ ...S.td, fontWeight: "bold" }}>TOTAL</td>
                <td style={{ ...S.foot }}>{INR(data.rateBreakup.reduce((s, r) => s + r.taxable, 0))}</td>
                <td style={{ ...S.foot, color: "#1d4ed8" }}>{INR(data.cgstOutput)}</td>
                <td style={{ ...S.foot, color: "#7c3aed" }}>{INR(data.sgstOutput)}</td>
                <td style={{ ...S.foot }}>{INR(data.totalOutputGST)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* ══ PAGE BREAK ══ */}
      <div style={{ pageBreakBefore: "always", paddingTop: "8mm" }} />

      {/* ─── B2B Invoices ─── */}
      <div style={{ ...S.sectionTitle, marginTop: "0" }}>
        Section 4A — B2B Registered Dealer Invoices ({data.b2bCount} invoices) — GSTR-1 Table 4
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
        <thead>
          <tr>
            {["#", "GSTIN of Recipient", "Receiver Name", "Invoice No.", "Date", "Taxable Value (₹)", "CGST (₹)", "SGST (₹)", "Invoice Total (₹)"].map((h) => (
              <th key={h} style={{ ...S.th, textAlign: ["Taxable Value (₹)", "CGST (₹)", "SGST (₹)", "Invoice Total (₹)"].includes(h) ? "right" : "left" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.b2bRows.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ ...S.td, textAlign: "center", color: "#64748b", fontStyle: "italic", padding: "16px" }}>
                No B2B invoices recorded for this period. All current sales are B2C consumer.
              </td>
            </tr>
          ) : (
            <>
              {data.b2bRows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ ...S.td, color: "#94a3b8", fontSize: "9px" }}>{i + 1}</td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: "9px", fontWeight: "bold", color: "#065f46" }}>{row.gstin}</td>
                  <td style={{ ...S.td, fontWeight: "600" }}>{row.name}</td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontWeight: "bold", color: "#1d4ed8" }}>{row.invoiceNo}</td>
                  <td style={{ ...S.td, fontFamily: "monospace", color: "#475569" }}>{row.date}</td>
                  <td style={S.tdMono}>{INR(row.taxable)}</td>
                  <td style={{ ...S.tdMono, color: "#1d4ed8" }}>{INR(row.cgst)}</td>
                  <td style={{ ...S.tdMono, color: "#7c3aed" }}>{INR(row.sgst)}</td>
                  <td style={{ ...S.tdMono, fontWeight: "bold" }}>{INR(row.total)}</td>
                </tr>
              ))}
              <tr style={{ background: "#f1f5f9" }}>
                <td colSpan={5} style={{ ...S.td, fontWeight: "bold", textAlign: "right" }}>B2B Totals →</td>
                <td style={S.foot}>{INR(data.b2bRows.reduce((s, r) => s + r.taxable, 0))}</td>
                <td style={{ ...S.foot, color: "#1d4ed8" }}>{INR(data.b2bRows.reduce((s, r) => s + r.cgst, 0))}</td>
                <td style={{ ...S.foot, color: "#7c3aed" }}>{INR(data.b2bRows.reduce((s, r) => s + r.sgst, 0))}</td>
                <td style={S.foot}>{INR(data.b2bRows.reduce((s, r) => s + r.total, 0))}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {/* ─── B2C Invoices (GSTR-1 Table 7 Rate-Wise Summary + Audit List) ─── */}
      <div style={S.sectionTitle}>
        Section 4B — B2C Consumer Sales Summary ({data.b2cCount} invoices) — GSTR-1 Table 7 (B2C Small)
      </div>
      <p style={{ fontSize: "9px", color: "#64748b", margin: "0 0 6px 0" }}>
        As per GST filing rules, B2C consumer sales are filed as aggregated summaries by Place of Supply (33-Tamil Nadu) and Tax Rate.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
        <thead>
          <tr>
            {["Place of Supply", "Tax Rate", "Taxable Value (₹)", "IGST (₹)", "CGST (₹)", "SGST (₹)", "Total Tax (₹)"].map((h) => (
              <th key={h} style={{ ...S.th, textAlign: ["Place of Supply", "Tax Rate"].includes(h) ? "left" : "right" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rateBreakup.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#64748b", fontStyle: "italic", padding: "12px" }}>
                No B2C GST sales in this period.
              </td>
            </tr>
          ) : (
            <>
              {data.rateBreakup.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ ...S.td, fontWeight: "600" }}>33-Tamil Nadu (Intrastate)</td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontWeight: "bold", color: "#1d4ed8" }}>{r.rate}% GST</td>
                  <td style={S.tdMono}>{INR(r.taxable)}</td>
                  <td style={{ ...S.tdMono, color: "#64748b" }}>₹0.00</td>
                  <td style={{ ...S.tdMono, color: "#1d4ed8" }}>{INR(r.cgst)}</td>
                  <td style={{ ...S.tdMono, color: "#7c3aed" }}>{INR(r.sgst)}</td>
                  <td style={{ ...S.tdMono, fontWeight: "bold" }}>{INR(r.cgst + r.sgst)}</td>
                </tr>
              ))}
              <tr style={{ background: "#f1f5f9" }}>
                <td colSpan={2} style={{ ...S.td, fontWeight: "bold", textAlign: "right" }}>B2C Total Summary →</td>
                <td style={S.foot}>{INR(data.b2cRows.reduce((s, r) => s + r.taxable, 0))}</td>
                <td style={{ ...S.foot, color: "#64748b" }}>₹0.00</td>
                <td style={{ ...S.foot, color: "#1d4ed8" }}>{INR(data.b2cRows.reduce((s, r) => s + r.cgst, 0))}</td>
                <td style={{ ...S.foot, color: "#7c3aed" }}>{INR(data.b2cRows.reduce((s, r) => s + r.sgst, 0))}</td>
                <td style={S.foot}>{INR(data.b2cRows.reduce((s, r) => s + r.cgst + r.sgst, 0))}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {/* B2C Audit Trail (capped at 25 for printable report) */}
      {data.b2cRows.length > 0 && (
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "9px", fontWeight: "bold", color: "#334155", marginBottom: "4px" }}>
            Audit Log — Recent B2C Consumer Transactions (Showing top {Math.min(data.b2cRows.length, 25)} of {data.b2cRows.length} bills):
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Invoice No.", "Date", "Customer Name", "Taxable Value (₹)", "CGST (₹)", "SGST (₹)", "Total (₹)"].map((h) => (
                  <th key={h} style={{ ...S.th, fontSize: "8.5px", padding: "3px 6px", textAlign: ["Taxable Value (₹)", "CGST (₹)", "SGST (₹)", "Total (₹)"].includes(h) ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.b2cRows.slice(0, 25).map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ ...S.td, fontSize: "8.5px", padding: "3px 6px", color: "#94a3b8" }}>{i + 1}</td>
                  <td style={{ ...S.td, fontSize: "8.5px", padding: "3px 6px", fontFamily: "monospace", fontWeight: "bold", color: "#1d4ed8" }}>{row.invoiceNo}</td>
                  <td style={{ ...S.td, fontSize: "8.5px", padding: "3px 6px", fontFamily: "monospace", color: "#475569" }}>{row.date}</td>
                  <td style={{ ...S.td, fontSize: "8.5px", padding: "3px 6px" }}>{row.customer}</td>
                  <td style={{ ...S.tdMono, fontSize: "8.5px", padding: "3px 6px" }}>{INR(row.taxable)}</td>
                  <td style={{ ...S.tdMono, fontSize: "8.5px", padding: "3px 6px", color: "#1d4ed8" }}>{INR(row.cgst)}</td>
                  <td style={{ ...S.tdMono, fontSize: "8.5px", padding: "3px 6px", color: "#7c3aed" }}>{INR(row.sgst)}</td>
                  <td style={{ ...S.tdMono, fontSize: "8.5px", padding: "3px 6px", fontWeight: "bold" }}>{INR(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.b2cRows.length > 25 && (
            <div style={{ fontSize: "8.5px", color: "#64748b", fontStyle: "italic", marginTop: "3px", textAlign: "right" }}>
              * {data.b2cRows.length - 25} additional B2C invoices omitted from print preview. Full list included in Excel Export.
            </div>
          )}
        </div>
      )}

      {/* ─── HSN Summary ─── */}
      <div style={S.sectionTitle}>
        Section 5 — HSN-wise Summary — GSTR-1 Table 12
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
        <thead>
          <tr>
            {["#", "HSN / SKU Code", "Description", "UQC", "Qty", "Rate %", "Taxable Value (₹)", "IGST (₹)", "CGST (₹)", "SGST (₹)"].map((h) => (
              <th key={h} style={{ ...S.th, textAlign: ["Qty", "Rate %", "Taxable Value (₹)", "IGST (₹)", "CGST (₹)", "SGST (₹)"].includes(h) ? "right" : "left" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.hsnRows.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ ...S.td, textAlign: "center", color: "#64748b", fontStyle: "italic", padding: "16px" }}>
                No HSN data available for this period.
              </td>
            </tr>
          ) : (
            <>
              {data.hsnRows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ ...S.td, color: "#94a3b8", fontSize: "9px" }}>{i + 1}</td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontWeight: "bold", color: "#1d4ed8" }}>{row.hsn}</td>
                  <td style={{ ...S.td, color: "#374151" }}>{row.description}</td>
                  <td style={{ ...S.td, textAlign: "center", color: "#64748b" }}>NOS</td>
                  <td style={{ ...S.tdMono }}>{row.qty.toFixed(2)}</td>
                  <td style={{ ...S.tdMono, color: "#92400e", fontWeight: "bold" }}>{row.rate}%</td>
                  <td style={S.tdMono}>{INR(row.taxable)}</td>
                  <td style={{ ...S.tdMono, color: "#64748b" }}>₹0.00</td>
                  <td style={{ ...S.tdMono, color: "#1d4ed8" }}>{INR(row.cgst)}</td>
                  <td style={{ ...S.tdMono, color: "#7c3aed" }}>{INR(row.sgst)}</td>
                </tr>
              ))}
              <tr style={{ background: "#f1f5f9" }}>
                <td colSpan={6} style={{ ...S.td, fontWeight: "bold", textAlign: "right" }}>HSN Grand Totals →</td>
                <td style={S.foot}>{INR(data.hsnRows.reduce((s, r) => s + r.taxable, 0))}</td>
                <td style={{ ...S.foot, color: "#64748b" }}>₹0.00</td>
                <td style={{ ...S.foot, color: "#1d4ed8" }}>{INR(data.hsnRows.reduce((s, r) => s + r.cgst, 0))}</td>
                <td style={{ ...S.foot, color: "#7c3aed" }}>{INR(data.hsnRows.reduce((s, r) => s + r.sgst, 0))}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {/* ─── ITC / Purchases ─── */}
      {data.itcRows.length > 0 && (
        <>
          <div style={S.sectionTitle}>
            Section 6 — Input Tax Credit (ITC) — Received Purchase Orders
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
            <thead>
              <tr>
                {["#", "PO Number", "Supplier / Vendor", "Date", "PO Value (₹)", "ITC Claimable (₹)", "CGST ITC (₹)", "SGST ITC (₹)"].map((h) => (
                  <th key={h} style={{ ...S.th, textAlign: ["PO Value (₹)", "ITC Claimable (₹)", "CGST ITC (₹)", "SGST ITC (₹)"].includes(h) ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.itcRows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ ...S.td, color: "#94a3b8", fontSize: "9px" }}>{i + 1}</td>
                  <td style={{ ...S.td, fontFamily: "monospace", fontWeight: "bold", color: "#1d4ed8" }}>{row.poNo}</td>
                  <td style={{ ...S.td, fontWeight: "500" }}>{row.vendor}</td>
                  <td style={{ ...S.td, fontFamily: "monospace", color: "#475569" }}>{row.date}</td>
                  <td style={S.tdMono}>{INR(row.total)}</td>
                  <td style={{ ...S.tdMono, color: "#92400e", fontWeight: "bold" }}>{INR(row.taxAmt)}</td>
                  <td style={{ ...S.tdMono, color: "#1d4ed8" }}>{INR(row.taxAmt / 2)}</td>
                  <td style={{ ...S.tdMono, color: "#7c3aed" }}>{INR(row.taxAmt / 2)}</td>
                </tr>
              ))}
              <tr style={{ background: "#f1f5f9" }}>
                <td colSpan={4} style={{ ...S.td, fontWeight: "bold", textAlign: "right" }}>ITC Totals →</td>
                <td style={S.foot}>{INR(data.itcRows.reduce((s, r) => s + r.total, 0))}</td>
                <td style={{ ...S.foot, color: "#92400e" }}>{INR(data.itcInput)}</td>
                <td style={{ ...S.foot, color: "#1d4ed8" }}>{INR(data.itcInput / 2)}</td>
                <td style={{ ...S.foot, color: "#7c3aed" }}>{INR(data.itcInput / 2)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* ─── Footer ─── */}
      <div style={{ marginTop: "16px", paddingTop: "10px", borderTop: "2px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: "8.5px", color: "#475569", lineHeight: "1.6" }}>
          <div style={{ fontWeight: "bold", color: "#0f172a", fontSize: "9px" }}>HOW TO FILE:</div>
          <div>1. Share this report with your Chartered Accountant (CA).</div>
          <div>2. Use the Excel export to upload to <strong>gst.gov.in → Returns → GSTR-1 → Upload via Excel</strong>.</div>
          <div>3. File GSTR-3B separately using the Net Tax Payable figure above.</div>
          <div style={{ marginTop: "4px", color: "#94a3b8" }}>
            Auto-generated by Ponmani Agencies Retail &amp; Service Console • Offline Edition
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "8.5px", color: "#64748b" }}>
          <div style={{ fontWeight: "bold", color: "#0f172a", fontSize: "10px" }}>AUTHORISED SIGNATORY</div>
          <div style={{ marginTop: "28px", borderTop: "1px solid #94a3b8", paddingTop: "4px", minWidth: "140px" }}>
            {data.shopName}
          </div>
          <div>{data.shopGstin}</div>
        </div>
      </div>
    </div>
  );
}
