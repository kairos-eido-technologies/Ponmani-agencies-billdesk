import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, User } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { Settings as SettingsIcon, Printer, Database, Key, ScanBarcode, ShieldCheck, Download, Upload, RefreshCw, CheckCircle, AlertTriangle, Trash2, Languages, UserPlus, Edit3, X, User as UserIcon, Lock, Store, RotateCcw, AlertOctagon, CheckSquare, Square } from "lucide-react";
import { useLang, useT } from "@/lib/lang/lang-context";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const t = useT();
  const { lang, setLang } = useLang();
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

  // Sync form when query loads
  useEffect(() => {
    if (settingsQuery.data) {
      setSettingsForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  // Store Provisioning & Factory Reset State
  const [showClearTxModal, setShowClearTxModal] = useState(false);
  const [showFactoryResetModal, setShowFactoryResetModal] = useState(false);
  const [isProcessingReset, setIsProcessingReset] = useState(false);
  const [factoryResetForm, setFactoryResetForm] = useState({
    shop_name: "",
    shop_address: "",
    shop_phone: "",
    shop_gstin: "",
    receipt_header_note: "",
    receipt_footer_note: "",
    keepProducts: true,
    confirmText: "",
  });

  // Staff Account Management State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<User | null>(null);
  const [staffForm, setStaffForm] = useState<{ id?: string; username: string; role: "Admin" | "Cashier"; pin: string }>({
    username: "",
    role: "Cashier",
    pin: "",
  });

  function handleOpenAddStaff() {
    setStaffForm({
      username: "",
      role: "Cashier",
      pin: "",
    });
    setShowStaffModal(true);
  }

  function handleOpenEditStaff(u: User) {
    setStaffForm({
      id: u.id,
      username: u.username,
      role: u.role,
      pin: u.pin,
    });
    setShowStaffModal(true);
  }

  function handleSaveStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!staffForm.username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!staffForm.pin.trim() || staffForm.pin.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }
    db.saveUser({
      id: staffForm.id,
      username: staffForm.username.trim().toLowerCase(),
      role: staffForm.role,
      pin: staffForm.pin.trim(),
    });
    toast.success(staffForm.id ? "Staff account updated!" : "New staff account created!");
    qc.invalidateQueries({ queryKey: ["local-users"] });
    setShowStaffModal(false);
  }

  function handleDeleteStaff(u: User) {
    const allUsers = users.data || [];
    const adminCount = allUsers.filter((x) => x.role === "Admin").length;
    if (u.role === "Admin" && adminCount <= 1) {
      toast.error(t("settings.staff.cannotDeleteAdmin"));
      return;
    }
    setStaffToDelete(u);
  }

  function executeDeleteStaff() {
    if (!staffToDelete) return;
    const allUsers = users.data || [];
    const adminCount = allUsers.filter((x) => x.role === "Admin").length;
    if (staffToDelete.role === "Admin" && adminCount <= 1) {
      toast.error(t("settings.staff.cannotDeleteAdmin"));
      setStaffToDelete(null);
      return;
    }
    db.deleteUser(staffToDelete.id || staffToDelete.username);
    toast.success(`Staff account '${staffToDelete.username}' deleted.`);
    qc.invalidateQueries({ queryKey: ["local-users"] });
    setStaffToDelete(null);
  }

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

  async function handleClearTransactions() {
    setIsProcessingReset(true);
    try {
      try {
        ExcelEngine.exportFullBackup();
        toast.info("Pre-reset backup snapshot generated automatically!");
      } catch (e) {
        console.warn("Snapshot backup before clear failed:", e);
      }

      await db.clearTransactionsOnly();
      toast.success("Past transactions cleared! Billing restarted from Bill #0001.");
      qc.invalidateQueries();
      setShowClearTxModal(false);
    } catch (err: any) {
      toast.error("Failed to clear transactions: " + (err.message || String(err)));
    } finally {
      setIsProcessingReset(false);
    }
  }

  async function handleFactoryReset(e: React.FormEvent) {
    e.preventDefault();
    if (factoryResetForm.confirmText.trim().toUpperCase() !== "RESET") {
      toast.error("Please type 'RESET' in the confirmation box to proceed.");
      return;
    }
    if (!factoryResetForm.shop_name.trim()) {
      toast.error("Store Name is required.");
      return;
    }

    setIsProcessingReset(true);
    try {
      try {
        ExcelEngine.exportFullBackup();
        toast.info("Pre-reset backup snapshot generated automatically!");
      } catch (e) {
        console.warn("Snapshot backup before factory reset failed:", e);
      }

      await db.factoryResetStore({
        shop_name: factoryResetForm.shop_name.trim(),
        shop_address: factoryResetForm.shop_address.trim(),
        shop_phone: factoryResetForm.shop_phone.trim(),
        shop_gstin: factoryResetForm.shop_gstin.trim(),
        receipt_header_note: factoryResetForm.receipt_header_note.trim(),
        receipt_footer_note: factoryResetForm.receipt_footer_note.trim(),
        keepProducts: factoryResetForm.keepProducts,
      });

      toast.success(`Factory reset complete! Initialized for "${factoryResetForm.shop_name.trim()}". Admin PIN: 1234.`);
      setShowFactoryResetModal(false);

      qc.invalidateQueries();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      toast.error("Factory reset failed: " + (err.message || String(err)));
      setIsProcessingReset(false);
    }
  }


  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language Switcher Card */}
        <div className="card-surface p-5 border-l-4 border-l-primary/50 space-y-4">
          <div className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
            <Languages className="h-4 w-4 text-primary" /> {t("settings.language")}
          </div>
          <p className="text-xs text-muted-foreground">{t("settings.language.desc")}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setLang("en")}
              className={`flex-1 h-10 rounded-lg border text-sm font-bold transition ${
                lang === "en"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              🇬🇧 {t("settings.language.english")}
            </button>
            <button
              onClick={() => setLang("ta")}
              className={`flex-1 h-10 rounded-lg border text-sm font-bold transition ${
                lang === "ta"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              🇮🇳 {t("settings.language.tamil")}
            </button>
          </div>
        </div>

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
            <L label="Sales Receipt Custom Footer / Terms">
              <textarea
                value={settingsForm.receipt_footer_note || ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, receipt_footer_note: e.target.value })}
                placeholder="e.g. Goods once sold can be exchanged within 7 days..."
                className="w-full min-h-[50px] rounded bg-input border border-border p-2 text-xs focus:outline-none focus:border-primary font-mono"
              />
            </L>
            <L label="Service Intake Token Disclaimer & Terms">
              <textarea
                value={settingsForm.service_ticket_terms || ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, service_ticket_terms: e.target.value })}
                placeholder="e.g. Present this receipt token during device collection. Unclaimed items after 30 days are subject to shop terms."
                className="w-full min-h-[50px] rounded bg-input border border-border p-2 text-xs focus:outline-none focus:border-primary font-mono"
              />
            </L>
            <L label="Purchase Order Default Terms / Note">
              <textarea
                value={settingsForm.po_footer_terms || ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, po_footer_terms: e.target.value })}
                placeholder="e.g. Please acknowledge receipt of this Purchase Order."
                className="w-full min-h-[50px] rounded bg-input border border-border p-2 text-xs focus:outline-none focus:border-primary font-mono"
              />
            </L>
            <button type="submit" className="h-9 px-4 rounded bg-primary text-primary-foreground font-bold text-xs hover:accent-glow transition">
              Save Store Profile & Receipt Texts
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
          <div className="flex justify-between items-center border-b border-border pb-2">
            <div className="text-sm font-bold text-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-400" /> {t("settings.staffPIN")}
            </div>
            <button
              onClick={handleOpenAddStaff}
              className="h-7 px-2.5 rounded bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" /> {t("settings.staff.add")}
            </button>
          </div>

          <div className="space-y-2">
            {users.data?.map((u) => (
              <div key={u.id} className="p-3 bg-card border border-border rounded-lg flex justify-between items-center text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-secondary grid place-items-center text-primary font-bold">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground capitalize flex items-center gap-1.5">
                      <span>{u.username}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                        u.role === "Admin"
                          ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {u.role === "Cashier" ? "Direct POS Billing & WhatsApp only" : "Full access to all 12 modules"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono bg-secondary px-2.5 py-1 rounded text-amber-400 font-bold text-xs border border-border">
                    PIN: {u.pin}
                  </span>
                  <button
                    onClick={() => handleOpenEditStaff(u)}
                    title={t("settings.staff.edit")}
                    className="h-7 w-7 rounded bg-secondary hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground transition border border-border"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(u)}
                    title={t("settings.staff.delete")}
                    className="h-7 w-7 rounded bg-destructive/15 hover:bg-destructive/25 grid place-items-center text-destructive transition border border-destructive/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
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

      {/* Store Provisioning & Factory Reset Section */}
      <div className="card-surface p-6 border-l-4 border-l-rose-500 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="text-base font-bold text-foreground flex items-center gap-2">
              <Store className="h-5 w-5 text-rose-400" /> Store Provisioning & Factory Reset
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Configure this desktop application for a new store client or reset test billing data before handing over to the shop owner.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowClearTxModal(true)}
              className="h-9 px-3.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-500/25 transition shadow-xs"
            >
              <RotateCcw className="h-4 w-4" /> Clear Past Transactions
            </button>
            <button
              type="button"
              onClick={() => {
                setFactoryResetForm({
                  shop_name: settingsForm.shop_name || "Ponmani Agencies",
                  shop_address: settingsForm.shop_address || "",
                  shop_phone: settingsForm.shop_phone || "",
                  shop_gstin: settingsForm.shop_gstin || "",
                  receipt_header_note: settingsForm.receipt_header_note || "",
                  receipt_footer_note: settingsForm.receipt_footer_note || "",
                  keepProducts: true,
                  confirmText: "",
                });
                setShowFactoryResetModal(true);
              }}
              className="h-9 px-4 rounded bg-rose-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-rose-500 transition shadow-lg shadow-rose-950/40"
            >
              <AlertOctagon className="h-4 w-4" /> Complete Factory Reset (New Store)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Option 1: Clear Transactions Only (Start from Bill #0001)
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Clears all demo sales, invoices, customer credit ledgers, service tickets, and expense logs.
              <strong className="text-foreground"> Preserves</strong> your complete product catalog, categories, pricing, suppliers, customers, and shop branding.
              Billing counters restart at <span className="font-mono text-amber-300 font-bold">INV-0001</span>.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-2">
            <div className="font-bold text-rose-300 flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" /> Option 2: Full Factory Reset & New Store Onboarding
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Deploys the desktop application for a brand new store client. Sets up their Store Name, Address, Phone, and GSTIN, resets Admin PIN to <span className="font-mono text-rose-300 font-bold">1234</span>, clears all past transactions, and allows choosing whether to retain or wipe product inventory.
            </p>
          </div>
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

      {/* Create / Edit Staff Account Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setShowStaffModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md card-surface p-6 border-l-4 border-l-primary space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div className="font-bold text-base flex items-center gap-2 text-foreground">
                <UserPlus className="h-4 w-4 text-primary" />
                {staffForm.id ? t("settings.staff.edit") : t("settings.staff.add")}
              </div>
              <button onClick={() => setShowStaffModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">
                  {t("settings.staff.username")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cashier1, ravi, manager"
                  value={staffForm.username}
                  onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                  className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">
                  {t("settings.staff.role")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffForm({ ...staffForm, role: "Cashier" })}
                    className={`p-3 rounded-lg border text-left transition ${
                      staffForm.role === "Cashier"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold"
                        : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <div className="text-xs font-bold">Cashier</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      Direct POS Billing & WhatsApp only
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffForm({ ...staffForm, role: "Admin" })}
                    className={`p-3 rounded-lg border text-left transition ${
                      staffForm.role === "Admin"
                        ? "bg-purple-500/15 border-purple-500/40 text-purple-300 font-bold"
                        : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <div className="text-xs font-bold">Admin</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      Full access to all 12 modules
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">
                  {t("settings.staff.pin")}
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="e.g. 1234"
                  value={staffForm.pin}
                  onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value.replace(/\D/g, "") })}
                  className="w-full h-10 rounded bg-input border border-border px-3 text-center text-lg font-mono font-bold tracking-[0.3em] text-foreground focus:outline-none focus:border-primary"
                />
                <div className="text-[10px] text-muted-foreground mt-1">
                  Enter 4 to 6 numeric digits used to log in at the staff login screen.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="h-9 px-4 rounded bg-secondary border border-border text-xs font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded bg-primary text-primary-foreground font-bold text-xs hover:accent-glow transition"
                >
                  {t("settings.staff.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setStaffToDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md card-surface p-6 border-l-4 border-l-destructive space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <div className="h-10 w-10 rounded-full bg-destructive/15 text-destructive grid place-items-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-base text-foreground">
                  {t("settings.staff.deleteConfirm")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Staff Member: <span className="font-bold text-foreground capitalize font-mono">{staffToDelete.username}</span> ({staffToDelete.role})
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-red-300">
              This staff member will immediately lose access to POS billing and cannot sign in using this account.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="h-9 px-4 rounded bg-secondary border border-border text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteStaff}
                className="h-9 px-5 rounded bg-destructive text-destructive-foreground font-bold text-xs hover:opacity-90 transition"
              >
                {t("settings.staff.delete")} Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Past Transactions Confirmation Modal */}
      {showClearTxModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => !isProcessingReset && setShowClearTxModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md card-surface p-6 border-l-4 border-l-amber-500 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <div className="h-10 w-10 rounded-full bg-amber-500/15 text-amber-400 grid place-items-center shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-base text-foreground">
                  Clear Past Transactions Only
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Start fresh billing from Invoice #0001
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground">
              <p>
                This action will permanently delete all sales invoices, POS billing transactions, service repair tickets, and customer debt balances.
              </p>
              <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" /> What will be kept:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>All products, barcodes, stock levels & categories</li>
                  <li>Store profile, tax settings & print templates</li>
                  <li>Customer & supplier address books</li>
                  <li>Staff accounts and login PINs</li>
                </ul>
              </div>
              <p className="text-[11px] text-amber-300/80">
                An automatic pre-reset backup workbook will be created before wiping transactions.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                disabled={isProcessingReset}
                onClick={() => setShowClearTxModal(false)}
                className="h-9 px-4 rounded bg-secondary border border-border text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingReset}
                onClick={handleClearTransactions}
                className="h-9 px-5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 transition"
              >
                {isProcessingReset && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {isProcessingReset ? "Clearing..." : "Confirm & Clear Transactions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Factory Reset & New Store Onboarding Modal */}
      {showFactoryResetModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" onClick={() => !isProcessingReset && setShowFactoryResetModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg card-surface p-6 border-l-4 border-l-rose-500 space-y-4 shadow-2xl my-8">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div className="font-bold text-base flex items-center gap-2 text-foreground">
                <Store className="h-5 w-5 text-rose-400" />
                New Store Setup & Factory Reset
              </div>
              {!isProcessingReset && (
                <button onClick={() => setShowFactoryResetModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleFactoryReset} className="space-y-4">
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4 shrink-0" />
                  Warning: Complete Store Re-provisioning
                </div>
                <p className="text-[11px] text-muted-foreground">
                  This wipes all past sales, invoices, customer debts, and service records. The admin login credentials will reset to:
                  <span className="font-mono text-rose-200 font-bold ml-1">admin / PIN: 1234</span>.
                </p>
              </div>

              <div className="space-y-3">
                <L label="New Store / Business Name *">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ponmani Electricals & Hardware"
                    value={factoryResetForm.shop_name}
                    onChange={(e) => setFactoryResetForm({ ...factoryResetForm, shop_name: e.target.value })}
                    className={ic}
                  />
                </L>

                <L label="Store Address">
                  <input
                    type="text"
                    placeholder="e.g. 12/4 Main Road, Tenkasi"
                    value={factoryResetForm.shop_address}
                    onChange={(e) => setFactoryResetForm({ ...factoryResetForm, shop_address: e.target.value })}
                    className={ic}
                  />
                </L>

                <div className="grid grid-cols-2 gap-2">
                  <L label="Phone Number">
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={factoryResetForm.shop_phone}
                      onChange={(e) => setFactoryResetForm({ ...factoryResetForm, shop_phone: e.target.value })}
                      className={ic}
                    />
                  </L>
                  <L label="GSTIN (Tax ID)">
                    <input
                      type="text"
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      value={factoryResetForm.shop_gstin}
                      onChange={(e) => setFactoryResetForm({ ...factoryResetForm, shop_gstin: e.target.value })}
                      className={`${ic} font-mono`}
                    />
                  </L>
                </div>

                <div className="pt-2">
                  <div
                    onClick={() => setFactoryResetForm({ ...factoryResetForm, keepProducts: !factoryResetForm.keepProducts })}
                    className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-secondary/40 cursor-pointer hover:bg-secondary transition"
                  >
                    <div className="mt-0.5 text-primary">
                      {factoryResetForm.keepProducts ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-foreground">Retain product inventory catalog & categories</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {factoryResetForm.keepProducts
                          ? "Products and prices will be retained so the new store doesn't have to re-enter items."
                          : "Inventory catalog will be completely cleared for a 100% empty blank slate."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="text-[10px] uppercase font-bold text-rose-400 mb-1 block">
                    Type "RESET" to confirm:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Type RESET in capital letters"
                    value={factoryResetForm.confirmText}
                    onChange={(e) => setFactoryResetForm({ ...factoryResetForm, confirmText: e.target.value })}
                    className="w-full h-10 rounded bg-input border border-rose-500/50 px-3 text-sm font-mono font-bold tracking-widest text-foreground focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  disabled={isProcessingReset}
                  onClick={() => setShowFactoryResetModal(false)}
                  className="h-9 px-4 rounded bg-secondary border border-border text-xs font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingReset || factoryResetForm.confirmText.trim().toUpperCase() !== "RESET"}
                  className="h-9 px-5 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition"
                >
                  {isProcessingReset && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {isProcessingReset ? "Initializing Store..." : "Execute Factory Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const ic = "w-full h-9 rounded bg-input border border-border px-3 text-xs focus:outline-none focus:border-primary font-mono";
const L = ({ label, children }: any) => <label className="block"><div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{label}</div>{children}</label>;
