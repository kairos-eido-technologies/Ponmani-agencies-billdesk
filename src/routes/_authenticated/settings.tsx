import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { Settings as SettingsIcon, Printer, Database, Key, ScanBarcode, ShieldCheck, Download, Upload, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["local-settings"],
    queryFn: async () => db.getSettings(),
  });

  const backupsLog = useQuery({
    queryKey: ["local-backups-log"],
    queryFn: async () => db.getBackupsLog(),
  });

  const users = useQuery({
    queryKey: ["local-users"],
    queryFn: async () => db.getUsers(),
  });

  const [settingsForm, setSettingsForm] = useState(settingsQuery.data || db.getSettings());
  const [scannerTestInput, setScannerTestInput] = useState("");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    db.updateSettings(settingsForm);
    toast.success("Local settings updated!");
    qc.invalidateQueries({ queryKey: ["local-settings"] });
  }

  function handleExportBackup() {
    try {
      const res = ExcelEngine.exportFullBackup();
      toast.success(`Full backup generated: ${res.filename} (${res.sizeKb} KB)`);
      qc.invalidateQueries({ queryKey: ["local-backups-log"] });
    } catch (err: any) {
      toast.error("Backup failed: " + err.message);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setShowRestoreConfirm(true);
  }

  async function executeRestore() {
    if (!restoreFile) return;
    try {
      // Automatic pre-action snapshot
      ExcelEngine.exportFullBackup();
      toast.info("Automatic pre-restore backup snapshot created!");

      const ok = await ExcelEngine.restoreFromBackupFile(restoreFile);
      if (ok) {
        toast.success("Database restored successfully from backup workbook!");
        qc.invalidateQueries();
        setShowRestoreConfirm(false);
      }
    } catch (err: any) {
      toast.error("Restore failed: " + err.message);
    }
  }

  function handleTestPrint() {
    toast.success("Sending raw ESC/POS test receipt to local thermal printer driver...");
    window.print();
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Settings, Printers & Data Management"
        subtitle="Local hardware drivers, staff PIN security, ESC/POS thermal printing, and file-based backups"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store Profile Settings */}
        <div className="card-surface p-5 border-l-4 border-l-primary space-y-4">
          <div className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
            <SettingsIcon className="h-4 w-4 text-primary" /> Store Profile & Tax Info
          </div>
          <form onSubmit={handleSaveSettings} className="space-y-3">
            <L label="Store Name">
              <input
                value={settingsForm.shop_name || ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, shop_name: e.target.value })}
                className={ic}
              />
            </L>
            <L label="Store Address">
              <input
                value={settingsForm.shop_address || ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, shop_address: e.target.value })}
                className={ic}
              />
            </L>
            <div className="grid grid-cols-2 gap-2">
              <L label="Phone">
                <input
                  value={settingsForm.shop_phone || ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shop_phone: e.target.value })}
                  className={ic}
                />
              </L>
              <L label="GSTIN">
                <input
                  value={settingsForm.shop_gstin || ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shop_gstin: e.target.value })}
                  className={`${ic} font-mono`}
                />
              </L>
            </div>
            <L label="Receipt Custom Header (Sub-Header)">
              <input
                value={settingsForm.receipt_header_note || ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, receipt_header_note: e.target.value })}
                placeholder="e.g. Hardware • Electricals • Electronics"
                className={ic}
              />
            </L>
            <L label="Receipt Custom Footer Note / Terms">
              <textarea
                value={settingsForm.receipt_footer_note || ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, receipt_footer_note: e.target.value })}
                placeholder="e.g. Goods once sold can be exchanged within 7 days..."
                className="w-full min-h-[60px] rounded bg-input border border-border p-2 text-xs focus:outline-none focus:border-primary font-mono"
              />
            </L>
            <button type="submit" className="h-9 px-4 rounded bg-primary text-primary-foreground font-bold text-xs hover:accent-glow transition">
              Save Store Profile
            </button>
          </form>
        </div>

        {/* Thermal Printer Driver Settings */}
        <div className="card-surface p-5 border-l-4 border-l-blue-500 space-y-4">
          <div className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
            <Printer className="h-4 w-4 text-blue-400" /> ESC/POS Thermal Printer Setup
          </div>
          <div className="space-y-3">
            <L label="Printer Protocol / Driver">
              <select
                value={settingsForm.printer_type || "Thermal ESC/POS 80mm"}
                onChange={(e) => setSettingsForm({ ...settingsForm, printer_type: e.target.value })}
                className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-semibold"
              >
                <option value="Thermal ESC/POS 80mm">Thermal ESC/POS 80mm (Standard)</option>
                <option value="Thermal ESC/POS 58mm">Thermal ESC/POS 58mm (Small)</option>
                <option value="Windows Spooler PDF">Windows Spooler / System Printer</option>
              </select>
            </L>
            <L label="Printer Device Name">
              <input
                value={settingsForm.printer_name || "POS-80 Series"}
                onChange={(e) => setSettingsForm({ ...settingsForm, printer_name: e.target.value })}
                className={ic}
              />
            </L>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestPrint}
                className="h-9 px-4 rounded bg-secondary text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition"
              >
                <Printer className="h-3.5 w-3.5 text-primary" /> Send Test Receipt Command
              </button>
            </div>
          </div>
        </div>

        {/* Barcode Scanner Wedge Test */}
        <div className="card-surface p-5 border-l-4 border-l-purple-500 space-y-4">
          <div className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
            <ScanBarcode className="h-4 w-4 text-purple-400" /> USB Keyboard-Wedge Scanner Setup
          </div>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Hardware USB barcode scanners operate in keyboard-wedge mode. Test scanner input below:
            </p>
            <L label="Scan Test Box">
              <input
                value={scannerTestInput}
                onChange={(e) => setScannerTestInput(e.target.value)}
                placeholder="Scan barcode with scanner device here…"
                className={`${ic} font-mono text-sm border-purple-500/50`}
              />
            </L>
            {scannerTestInput && (
              <div className="p-2 bg-purple-500/15 border border-purple-500/30 rounded text-xs font-mono text-purple-300">
                Scanned Code: {scannerTestInput}
              </div>
            )}
          </div>
        </div>

        {/* Staff PIN & Access Control */}
        <div className="card-surface p-5 border-l-4 border-l-amber-500 space-y-4">
          <div className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
            <Key className="h-4 w-4 text-amber-400" /> Local Staff PIN Security
          </div>
          <div className="space-y-2">
            {users.data?.map((u) => (
              <div key={u.id} className="p-2.5 bg-card border border-border rounded flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-foreground capitalize">{u.username}</span>
                  <span className="text-muted-foreground font-mono ml-2">({u.role})</span>
                </div>
                <span className="font-mono bg-secondary px-2 py-0.5 rounded text-amber-400 font-bold">PIN: {u.pin}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Database Backup & Restore Section */}
      <div className="card-surface p-6 border-l-4 border-l-emerald-500 space-y-4">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <div className="text-base font-bold text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-400" /> Local File Backup & Transactional Restore
          </div>
          <div className="flex gap-2">
            <input type="file" accept=".xlsx" onChange={handleFileSelected} className="hidden" id="restore-file-input" />
            <label
              htmlFor="restore-file-input"
              className="h-9 px-3 rounded bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-muted transition text-amber-400"
            >
              <Upload className="h-3.5 w-3.5" /> Restore from Backup
            </label>
            <button
              onClick={handleExportBackup}
              className="h-9 px-4 rounded bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/40"
            >
              <Download className="h-4 w-4" /> Export Full System Backup (.xlsx)
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Local backup engine produces multi-sheet Excel workbooks containing all 11 business module tables. Automated scheduled backups retain last 30 daily copies locally in the AppData directory.
        </div>

        {/* Backups Log Table */}
        <div className="max-h-48 overflow-auto border border-border rounded">
          <table className="w-full text-xs">
            <thead className="bg-card text-[10px] uppercase text-muted-foreground sticky top-0">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left">Backup Filename</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Size</th>
                <th className="px-3 py-2 text-right">Timestamp</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {backupsLog.data?.map((b) => (
                <tr key={b.id}>
                  <td className="px-3 py-2 font-sans font-medium text-foreground">{b.filename}</td>
                  <td className="px-3 py-2 text-muted-foreground">{b.type}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{b.size_kb} KB</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{new Date(b.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setShowRestoreConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md card-surface p-5 border-l-4 border-l-destructive space-y-4">
            <div className="flex items-center gap-2 text-destructive font-bold text-base">
              <AlertTriangle className="h-5 w-5" /> Confirm Database State Restore
            </div>
            <p className="text-xs text-muted-foreground">
              You are about to overwrite current database state with file: <span className="font-mono text-foreground font-bold">{restoreFile?.name}</span>. An automatic pre-action backup snapshot will be saved first.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRestoreConfirm(false)}
                className="h-9 px-3 rounded bg-secondary border border-border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={executeRestore}
                className="h-9 px-4 rounded bg-destructive text-destructive-foreground font-bold text-xs hover:opacity-90"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ic = "w-full h-9 rounded bg-input border border-border px-3 text-xs focus:outline-none focus:border-primary font-mono";
const L = ({ label, children }: any) => <label className="block"><div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{label}</div>{children}</label>;
