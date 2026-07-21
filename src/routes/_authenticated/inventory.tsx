import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, InventoryItem } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr, qty } from "@/lib/format";
import { Plus, X, Pencil, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Printer, Image, RefreshCw, Barcode } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inventory")({ component: InventoryPage });

function InventoryPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<InventoryItem | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [printLabelProduct, setPrintLabelProduct] = useState<InventoryItem | null>(null);

  const products = useQuery({
    queryKey: ["local-inventory-products", q],
    queryFn: async () => {
      const all = db.getInventory();
      if (!q.trim()) return all;
      const clean = q.toLowerCase();
      return all.filter((p) =>
        p.name.toLowerCase().includes(clean) ||
        p.barcode.toLowerCase().includes(clean) ||
        (p.sku_code && p.sku_code.toLowerCase().includes(clean)) ||
        p.category.toLowerCase().includes(clean)
      );
    },
  });

  function exportCatalog() {
    const data = (products.data || []).map((p) => ({
      Barcode: p.barcode,
      Name: p.name,
      Category: p.category,
      Unit: p.unit,
      'Cost Price (₹)': p.cost_price,
      'Selling Price (₹)': p.selling_price,
      'Shop Stock': p.stock_qty,
      'Godown Stock': p.godown_qty,
      'MOQ Alert': p.moq,
      'Min Stock Alert': p.min_stock_alert,
      'SKU Code': p.sku_code || p.barcode,
      'GST Rate (%)': p.gst_rate,
    }));
    ExcelEngine.exportToExcel(data, `Ponmani_Inventory_Catalog_${new Date().toISOString().split('T')[0]}`);
    toast.success("Inventory catalog exported to Excel");
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Inventory & Stock Catalog"
        subtitle={`${products.data?.length ?? 0} active products in local database`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => ExcelEngine.downloadTemplate('products')}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition"
            >
              <Download className="h-3.5 w-3.5" /> Template
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition text-emerald-400"
            >
              <Upload className="h-3.5 w-3.5" /> Import Excel
            </button>
            <button
              onClick={exportCatalog}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-400" /> Export Excel
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
            >
              <Plus className="h-4 w-4" /> Add Product
            </button>
          </div>
        }
      />

      <div className="card-surface">
        <div className="p-3 border-b border-border">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by product name, barcode, SKU, or category…"
            className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm font-mono"
          />
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-muted-foreground tracking-wider bg-card border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5">Product Name</th>
                <th className="text-left px-4 py-2.5">Barcode / SKU</th>
                <th className="text-left px-4 py-2.5">Category</th>
                <th className="text-right px-4 py-2.5">Cost</th>
                <th className="text-right px-4 py-2.5">Selling Price</th>
                <th className="text-right px-4 py-2.5">Shop Stock</th>
                <th className="text-right px-4 py-2.5">Godown Stock</th>
                <th className="text-right px-4 py-2.5">GST</th>
                <th className="text-right px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.data?.map((p) => {
                const low = Number(p.stock_qty) <= Number(p.min_stock_alert) || Number(p.stock_qty) <= Number(p.moq);
                return (
                  <tr key={p.id} className="hover:bg-secondary/40 transition">
                    <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                      {p.image_path ? (
                        <img src={p.image_path} alt={p.name} className="h-7 w-7 rounded object-cover border border-border" />
                      ) : null}
                      <span>{p.name}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      <div className="text-primary font-bold">{p.barcode}</div>
                      <div className="text-[10px] text-muted-foreground">SKU: {p.sku_code || p.barcode}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{inr(p.cost_price)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-primary">{inr(p.selling_price)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${low ? "text-amber-400" : "text-foreground"}`}>
                      {qty(p.stock_qty)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{qty(p.godown_qty)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{p.gst_rate}%</td>
                    <td className="px-4 py-2.5 text-right space-x-1.5">
                      <button
                        onClick={() => setPrintLabelProduct(p)}
                        title="Print Barcode Sticker Label"
                        className="h-7 px-2 rounded bg-secondary hover:bg-muted text-xs font-semibold border border-border inline-flex items-center gap-1 text-primary"
                      >
                        <Printer className="h-3 w-3" /> Label
                      </button>
                      <button
                        onClick={() => setEdit(p)}
                        title="Edit Product"
                        className="h-7 w-7 rounded bg-secondary hover:bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-foreground border border-border"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.data?.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm text-muted-foreground">
                    No matching products in local database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(showNew || edit) && (
        <ProductModal
          product={edit}
          onClose={() => { setShowNew(false); setEdit(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["local-inventory-products"] }); setShowNew(false); setEdit(null); }}
        />
      )}

      {showImportModal && (
        <ExcelImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { qc.invalidateQueries({ queryKey: ["local-inventory-products"] }); setShowImportModal(false); }}
        />
      )}

      {printLabelProduct && (
        <BarcodePrintModal
          product={printLabelProduct}
          onClose={() => setPrintLabelProduct(null)}
        />
      )}
    </div>
  );
}

function generatePmaBarcode() {
  return "PMA" + Math.floor(100000 + Math.random() * 900000);
}

function ProductModal({ product, onClose, onSaved }: { product: InventoryItem | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<InventoryItem>>({
    name: product?.name ?? "",
    barcode: product?.barcode ?? generatePmaBarcode(),
    category: product?.category ?? "",
    unit: product?.unit ?? "Piece",
    cost_price: product?.cost_price,
    selling_price: product?.selling_price,
    stock_qty: product?.stock_qty,
    godown_qty: product?.godown_qty,
    moq: product?.moq,
    min_stock_alert: product?.min_stock_alert,
    sku_code: product?.sku_code ?? product?.barcode ?? "",
    gst_rate: product?.gst_rate,
    image_path: product?.image_path ?? "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name?.trim()) { toast.error("Product name required"); return; }
    db.saveInventoryItem({
      ...f,
      cost_price: f.cost_price ?? 0,
      selling_price: f.selling_price ?? 0,
      stock_qty: f.stock_qty ?? 0,
      godown_qty: f.godown_qty ?? 0,
      moq: f.moq ?? 5,
      min_stock_alert: f.min_stock_alert ?? 10,
      gst_rate: f.gst_rate ?? 18,
      id: product?.id,
      barcode: f.barcode || generatePmaBarcode(),
      sku_code: f.sku_code || f.barcode || generatePmaBarcode(),
    } as any);
    toast.success(product ? "Product updated" : "Product created with PMA Barcode");
    onSaved();
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setF((prev) => ({ ...prev, image_path: evt.target?.result as string }));
        toast.success("Product image uploaded successfully");
      }
    };
    reader.readAsDataURL(file);
  }

  const ic = "w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono focus:outline-none focus:border-primary text-foreground";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg card-surface p-5 border-l-4 border-l-primary">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground">{product ? "Edit Product" : "New Inventory Product"}</div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Product Name *</div>
              <input
                required
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
                placeholder="e.g. Steel plates / Copper wire"
                className={ic}
                autoFocus
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 flex justify-between">
                <span>Barcode / EAN</span>
                <button
                  type="button"
                  onClick={() => {
                    const newCode = generatePmaBarcode();
                    setF({ ...f, barcode: newCode, sku_code: f.sku_code || newCode });
                  }}
                  className="text-primary hover:underline text-[9px]"
                >
                  Gen PMA
                </button>
              </div>
              <input
                value={f.barcode}
                onChange={(e) => setF({ ...f, barcode: e.target.value })}
                placeholder="PMA100001"
                className={ic}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Category</div>
              <input
                value={f.category}
                onChange={(e) => setF({ ...f, category: e.target.value })}
                placeholder="e.g. Vessals / Electricals"
                className={ic}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Cost Price (₹)</div>
              <input
                type="number"
                step="0.01"
                value={f.cost_price ?? ""}
                onChange={(e) => setF({ ...f, cost_price: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="0.00"
                className={ic}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Selling Price (₹) *</div>
              <input
                required
                type="number"
                step="0.01"
                value={f.selling_price ?? ""}
                onChange={(e) => setF({ ...f, selling_price: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="0.00"
                className={ic}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Shop Stock Qty</div>
              <input
                type="number"
                value={f.stock_qty ?? ""}
                onChange={(e) => setF({ ...f, stock_qty: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="0"
                className={ic}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Godown Stock Qty</div>
              <input
                type="number"
                value={f.godown_qty ?? ""}
                onChange={(e) => setF({ ...f, godown_qty: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="0"
                className={ic}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">MOQ Reorder Alert</div>
              <input
                type="number"
                value={f.moq ?? ""}
                onChange={(e) => setF({ ...f, moq: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="5"
                className={ic}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Min Stock Alert</div>
              <input
                type="number"
                value={f.min_stock_alert ?? ""}
                onChange={(e) => setF({ ...f, min_stock_alert: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="10"
                className={ic}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">SKU Code</div>
              <input
                value={f.sku_code}
                onChange={(e) => setF({ ...f, sku_code: e.target.value })}
                placeholder="Auto-generated SKU"
                className={ic}
              />
            </label>
          </div>

          <div>
            <label className="block">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">GST Rate (%)</div>
              <input
                type="number"
                value={f.gst_rate ?? ""}
                onChange={(e) => setF({ ...f, gst_rate: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="18"
                className={ic}
              />
            </label>
          </div>

          {/* Product Image Upload */}
          <div className="col-span-2 space-y-1.5">
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">Product Image (Optional Upload)</div>
            <div className="flex gap-2 items-center">
              {f.image_path ? (
                <img src={f.image_path} alt="Preview" className="h-10 w-10 rounded object-cover border border-primary" />
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                id="product-image-upload"
                className="hidden"
              />
              <label
                htmlFor="product-image-upload"
                className="h-9 px-3 rounded bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-muted transition text-foreground"
              >
                <Image className="h-3.5 w-3.5 text-primary" /> Upload Image File
              </label>
              <input
                value={f.image_path}
                onChange={(e) => setF({ ...f, image_path: e.target.value })}
                placeholder="Or paste image URL / local path…"
                className={`flex-1 ${ic}`}
              />
            </div>
          </div>

          <button type="submit" className="col-span-2 h-10 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:accent-glow transition mt-1">
            Save Product Record
          </button>
        </form>
      </div>
    </div>
  );
}

function BarcodePrintModal({ product, onClose }: { product: InventoryItem; onClose: () => void }) {
  function handlePrintLabel() {
    window.print();
  }

  const barcodeCode = product.barcode || product.sku_code || generatePmaBarcode();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm card-surface p-5 border-l-4 border-l-primary space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground flex items-center gap-2">
            <Barcode className="h-5 w-5 text-primary" /> Thermal Barcode Label
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        {/* 50mm x 25mm Thermal Label Sticker Preview */}
        <div className="p-4 bg-white text-black rounded border border-gray-300 shadow-md text-center space-y-1 print:border-0 print:p-2 print:shadow-none font-sans">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700">Ponmani Agencies</div>
          <div className="text-sm font-black truncate leading-tight text-gray-900">{product.name}</div>
          <div className="text-lg font-extrabold text-black font-mono">₹ {product.selling_price.toFixed(2)}</div>

          {/* Visual Barcode SVG */}
          <div className="py-1 flex justify-center">
            <BarcodeVisual code={barcodeCode} />
          </div>

          <div className="text-[10px] font-mono font-bold text-gray-800 flex justify-between px-2">
            <span>BARCODE: {barcodeCode}</span>
            <span>SKU: {product.sku_code || barcodeCode}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="h-9 px-3 rounded bg-secondary border border-border text-xs font-semibold">
            Cancel
          </button>
          <button onClick={handlePrintLabel} className="h-9 px-4 rounded bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 hover:accent-glow">
            <Printer className="h-3.5 w-3.5" /> Print Thermal Sticker
          </button>
        </div>
      </div>
    </div>
  );
}

function BarcodeVisual({ code }: { code: string }) {
  const clean = code.toUpperCase();
  const bars: boolean[] = [];
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    bars.push(true, (charCode % 2 === 0), false, true, (charCode % 3 === 0), true, false);
  }

  return (
    <svg className="w-full h-10 max-w-[220px]" viewBox="0 0 200 40">
      <rect width="200" height="40" fill="white" />
      {bars.map((b, idx) =>
        b ? (
          <rect
            key={idx}
            x={idx * (200 / bars.length)}
            y="2"
            width={(200 / bars.length) * 0.85}
            height="36"
            fill="black"
          />
        ) : null
      )}
    </svg>
  );
}

function ExcelImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [errorList, setErrorList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const rows = await ExcelEngine.parseExcelFile(file);
      const mapped = rows.map((r: any) => ({
        name: r['Name'] || r['name'] || '',
        barcode: r['Barcode'] || r['barcode'] || generatePmaBarcode(),
        category: r['Category'] || r['category'] || 'General',
        unit: r['Unit'] || r['unit'] || 'Piece',
        cost_price: Number(r['Cost Price'] || r['cost_price']) || 0,
        selling_price: Number(r['Selling Price'] || r['selling_price']) || 0,
        stock_qty: Number(r['Stock Qty'] || r['stock_qty']) || 0,
        godown_qty: Number(r['Godown Qty'] || r['godown_qty']) || 0,
        moq: Number(r['MOQ'] || r['moq']) || 5,
        min_stock_alert: Number(r['Min Stock Alert'] || r['min_stock_alert']) || 10,
        sku_code: r['SKU Code'] || r['sku_code'] || r['HSN Code'] || generatePmaBarcode(),
        gst_rate: Number(r['GST Rate (%)'] || r['gst_rate']) || 18,
      }));
      setParsedRows(mapped);
    } catch (err: any) {
      toast.error("Failed to parse Excel file: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function commitImport() {
    const res = db.bulkImportInventory(parsedRows);
    if (!res.success) {
      setErrorList(res.errors);
      toast.error(`Import failed with ${res.errors.length} validation errors.`);
    } else {
      toast.success(`Successfully imported ${res.count} products into local database!`);
      onImported();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl card-surface p-5 border-l-4 border-l-emerald-500">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground flex items-center gap-2">
            <Upload className="h-5 w-5 text-emerald-400" /> Bulk Excel Product Importer
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        {parsedRows.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-border rounded-lg bg-card">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-emerald-400 mb-3" />
            <div className="text-sm font-semibold text-foreground mb-1">Select Excel (.xlsx) Template File</div>
            <p className="text-xs text-muted-foreground mb-4">
              Ensure column headers match our standard import template format.
            </p>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" id="excel-file-input" />
            <label
              htmlFor="excel-file-input"
              className="inline-flex h-9 px-4 rounded bg-primary text-primary-foreground text-xs font-bold items-center gap-2 cursor-pointer hover:accent-glow"
            >
              {loading ? "Parsing File..." : "Browse Excel File"}
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Parsed {parsedRows.length} Rows Ready for Preview
              </span>
              <button onClick={() => setParsedRows([])} className="text-muted-foreground hover:underline">Change File</button>
            </div>

            {errorList.length > 0 && (
              <div className="p-3 bg-destructive/15 border border-destructive/30 rounded text-xs text-destructive max-h-32 overflow-auto space-y-1">
                <div className="font-bold flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Validation Errors (Transaction Rolled Back):</div>
                {errorList.map((err, idx) => (
                  <div key={idx}>• {err}</div>
                ))}
              </div>
            )}

            <div className="max-h-60 overflow-auto border border-border rounded">
              <table className="w-full text-xs">
                <thead className="bg-card text-[10px] uppercase text-muted-foreground sticky top-0">
                  <tr className="border-b border-border">
                    <th className="px-2 py-1.5 text-left">Barcode</th>
                    <th className="px-2 py-1.5 text-left">Name</th>
                    <th className="px-2 py-1.5 text-right">Cost</th>
                    <th className="px-2 py-1.5 text-right">Selling Price</th>
                    <th className="px-2 py-1.5 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{r.barcode || 'Auto'}</td>
                      <td className="px-2 py-1.5 font-medium">{r.name}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{inr(r.cost_price)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold text-primary">{inr(r.selling_price)}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{r.stock_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={commitImport}
              className="w-full h-10 rounded-md bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/40"
            >
              Commit Import into Local Database
            </button>
          </div>
        )}
      </div>
    </div>
  );
}