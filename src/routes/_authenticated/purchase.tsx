import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, Vendor, PurchaseOrder, PurchaseItem, InventoryItem } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr } from "@/lib/format";
import {
  Plus,
  Truck,
  ShoppingBag,
  FileSpreadsheet,
  X,
  Printer,
  MessageSquare,
  Edit2,
  Trash2,
  Search,
  Eye,
  CheckCircle,
  Clock,
  PackageCheck
} from "lucide-react";
import { POViewerModal } from "@/components/POViewerModal";
import { POReceiveModal } from "@/components/POReceiveModal";
import { useT } from "@/lib/lang/lang-context";

export const Route = createFileRoute("/_authenticated/purchase")({ component: PurchasePage });

function PurchasePage() {
  const t = useT();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"orders" | "vendors">("orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [selectedPOIdForView, setSelectedPOIdForView] = useState<string | null>(null);
  const [receivingPOId, setReceivingPOId] = useState<string | null>(null);
  const [showPOModal, setShowPOModal] = useState(false);
  const [editingPOData, setEditingPOData] = useState<{ order: PurchaseOrder; items: PurchaseItem[] } | null>(null);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const vendors = useQuery({
    queryKey: ["local-vendors"],
    staleTime: 60_000,
    queryFn: async () => db.getVendors(),
  });

  const purchaseOrders = useQuery({
    queryKey: ["local-purchase-orders"],
    staleTime: 60_000,
    queryFn: async () => db.getPurchaseOrders(),
  });

  function handleCreatePO() {
    setEditingPOData(null);
    setShowPOModal(true);
  }

  function handleEditPO(poId: string) {
    const poData = db.getPurchaseOrder(poId);
    if (poData) {
      setEditingPOData(poData);
      setShowPOModal(true);
    }
  }

  function handleDeletePO(poId: string, poNumber: string) {
    if (window.confirm(`Are you sure you want to delete Purchase Order ${poNumber}? This will revert any stock/balance adjustments.`)) {
      db.deletePurchaseOrder(poId);
      qc.invalidateQueries({ queryKey: ["local-purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["local-inventory-products"] });
      qc.invalidateQueries({ queryKey: ["local-vendors"] });
      toast.success(`Purchase Order ${poNumber} deleted.`);
    }
  }

  function handleCreateVendor() {
    setEditingVendor(null);
    setShowVendorModal(true);
  }

  function handleEditVendor(vendor: Vendor) {
    setEditingVendor(vendor);
    setShowVendorModal(true);
  }

  function handleDeleteVendor(vendorId: string, name: string) {
    if (window.confirm(`Are you sure you want to delete supplier "${name}"?`)) {
      db.deleteVendor(vendorId);
      qc.invalidateQueries({ queryKey: ["local-vendors"] });
      toast.success(`Supplier "${name}" deleted.`);
    }
  }

  function exportVendorsExcel() {
    const data = (vendors.data || []).map((v) => ({
      "Supplier Name": v.name,
      "Company Name": v.company_name,
      "Phone": v.phone,
      "Email": v.email,
      "GSTIN": v.gst_number,
      "Address": v.address,
      "Balance Due (₹)": v.balance_due,
    }));
    ExcelEngine.exportToExcel(data, `Ponmani_Suppliers_${new Date().toISOString().split("T")[0]}`);
    toast.success("Suppliers exported to Excel");
  }

  function exportPOsExcel() {
    const data = (purchaseOrders.data || []).map(({ order, items }) => ({
      "PO Number": order.po_number,
      "Supplier": order.vendor_name,
      "Status": order.status,
      "Total Amount (₹)": order.total_amount,
      "Paid Amount (₹)": order.paid_amount,
      "Balance (₹)": order.total_amount - order.paid_amount,
      "Items Count": items.length,
      "Notes": order.notes || "",
      "Date": order.created_at.split("T")[0],
    }));
    ExcelEngine.exportToExcel(data, `Ponmani_Purchase_Orders_${new Date().toISOString().split("T")[0]}`);
    toast.success("Purchase orders exported to Excel");
  }

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, activeTab]);

  // Filter Purchase Orders
  const filteredPOs = (purchaseOrders.data || []).filter((item) => {
    if (!item || !item.order) return false;
    const { order } = item;
    const poNum = order.po_number || "";
    const vendorName = order.vendor_name || "";
    const matchesSearch =
      poNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPOsCount = filteredPOs.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalPOsCount / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const displayedPOs = pageSize === -1 ? filteredPOs : filteredPOs.slice((activePage - 1) * pageSize, activePage * pageSize);

  // Filter Vendors
  const filteredVendors = (vendors.data || []).filter(
    (v) =>
      v.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.gst_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={t("purchase.title")}
        subtitle={t("purchase.subtitle")}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => (activeTab === "vendors" ? exportVendorsExcel() : exportPOsExcel())}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-400" /> {t("purchase.exportExcel")}
            </button>

            {activeTab === "vendors" ? (
              <button
                onClick={handleCreateVendor}
                className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
              >
                <Plus className="h-4 w-4" /> {t("purchase.form.supplier")}
              </button>
            ) : (
              <button
                onClick={handleCreatePO}
                className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
              >
                <Plus className="h-4 w-4" /> {t("purchase.createPO")}
              </button>
            )}
          </div>
        }
      />

      {/* Tabs & Filters Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-3">
        <div className="flex border-b border-border sm:border-b-0 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-2 sm:pb-0 transition flex items-center gap-2 ${
              activeTab === "orders" ? "border-b-2 border-primary text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="h-4 w-4" /> {t("purchase.title")} ({purchaseOrders.data?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("vendors")}
            className={`pb-2 sm:pb-0 transition flex items-center gap-2 ${
              activeTab === "vendors" ? "border-b-2 border-primary text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Truck className="h-4 w-4" /> {t("purchase.form.supplier")} ({vendors.data?.length ?? 0})
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("purchase.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-card border border-border rounded text-xs focus:outline-none focus:border-primary"
            />
          </div>

          {activeTab === "orders" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 bg-card border border-border rounded text-xs px-2 focus:outline-none focus:border-primary font-semibold"
            >
              <option value="ALL">{t("purchase.status.all")}</option>
              <option value="Draft">{t("purchase.status.draft")}</option>
              <option value="Ordered">{t("purchase.status.ordered")}</option>
              <option value="Received">{t("purchase.status.received")}</option>
            </select>
          )}
        </div>
      </div>

      {activeTab === "orders" ? (
        <div className="card-surface">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-muted-foreground tracking-wider bg-card border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5">{t("purchase.col.po")}</th>
                  <th className="text-left px-4 py-2.5">{t("purchase.col.supplier")}</th>
                  <th className="text-center px-4 py-2.5">{t("purchase.col.status")}</th>
                  <th className="text-center px-4 py-2.5">{t("purchase.col.items")}</th>
                  <th className="text-right px-4 py-2.5">{t("purchase.col.total")}</th>
                  <th className="text-right px-4 py-2.5">{t("billing.col.subtotal")}</th>
                  <th className="text-right px-4 py-2.5">{t("common.total")}</th>
                  <th className="text-center px-4 py-2.5">{t("purchase.col.date")}</th>
                  <th className="text-right px-4 py-2.5">{t("purchase.col.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedPOs.map(({ order, items }) => {
                  const due = order.total_amount - order.paid_amount;
                  return (
                    <tr key={order.id} className="hover:bg-secondary/40 transition">
                      <td className="px-4 py-2.5">
                        <div className="font-mono font-bold text-primary flex items-center gap-1.5">
                          {order.po_number}
                        </div>
                        {order.notes && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={order.notes}>
                            📝 {order.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{order.vendor_name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <select
                          value={order.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as "Draft" | "Ordered" | "Received";
                            if (newStatus === "Received" && order.status !== "Received") {
                              setReceivingPOId(order.id);
                            } else if (newStatus !== order.status) {
                              db.updatePOStatus(order.id, newStatus);
                              qc.invalidateQueries({ queryKey: ["local-purchase-orders"] });
                              qc.invalidateQueries({ queryKey: ["local-inventory-products"] });
                              qc.invalidateQueries({ queryKey: ["local-vendors"] });
                              toast.success(`PO ${order.po_number} status updated to ${newStatus.toUpperCase()}`);
                            }
                          }}
                          className={`text-[10px] uppercase px-2 py-1 rounded font-bold cursor-pointer outline-none border transition ${
                            order.status === "Received"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
                              : order.status === "Ordered"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30"
                          }`}
                        >
                          <option value="Draft" className="bg-card text-foreground font-semibold">Draft</option>
                          <option value="Ordered" className="bg-card text-foreground font-semibold">Ordered</option>
                          <option value="Received" className="bg-card text-foreground font-semibold">Received</option>
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-xs">{items.length}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">{inr(order.total_amount)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{inr(order.paid_amount)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${due > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                        {inr(due)}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-xs text-muted-foreground">
                        {(order.created_at || "").split("T")[0] || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          {order.status !== "Received" && (
                            <button
                              onClick={() => setReceivingPOId(order.id)}
                              title="Receive Stock & Set Selling Price / Godown Split"
                              className="h-7 px-2 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-emerald-500/30"
                            >
                              <PackageCheck className="h-3.5 w-3.5" /> Receive Stock
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedPOIdForView(order.id)}
                            title="View PO, Print A4 & WhatsApp Share"
                            className="h-7 px-2 rounded bg-secondary hover:bg-muted text-primary text-xs font-semibold flex items-center gap-1 border border-border"
                          >
                            <Eye className="h-3.5 w-3.5" /> View / Print
                          </button>
                          <button
                            onClick={() => handleEditPO(order.id)}
                            title="Edit Purchase Order & Info"
                            className="h-7 px-2 rounded bg-secondary hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1 border border-border"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-amber-400" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeletePO(order.id, order.po_number)}
                            title="Delete Purchase Order"
                            className="h-7 w-7 rounded bg-secondary hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 flex items-center justify-center border border-border"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPOs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-sm text-muted-foreground">
                      No Purchase Orders found matching search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {totalPOsCount > 0 && (
            <div className="p-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-muted-foreground">
                Showing{" "}
                <span className="font-mono font-bold text-foreground">
                  {pageSize === -1 ? 1 : Math.min((activePage - 1) * pageSize + 1, totalPOsCount)}
                </span>{" "}
                to{" "}
                <span className="font-mono font-bold text-foreground">
                  {pageSize === -1 ? totalPOsCount : Math.min(activePage * pageSize, totalPOsCount)}
                </span>{" "}
                of <span className="font-mono font-bold text-foreground">{totalPOsCount}</span> purchase orders
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-secondary border border-border rounded text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={-1}>All ({totalPOsCount})</option>
                  </select>
                </div>
                {pageSize !== -1 && (
                  <div className="flex items-center gap-1 font-mono">
                    <button
                      disabled={activePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 bg-secondary border border-border rounded disabled:opacity-40 hover:bg-muted font-bold transition"
                    >
                      Prev
                    </button>
                    <span className="px-2 font-bold text-primary">
                      {activePage} / {totalPages}
                    </span>
                    <button
                      disabled={activePage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 bg-secondary border border-border rounded disabled:opacity-40 hover:bg-muted font-bold transition"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card-surface">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-muted-foreground tracking-wider bg-card border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5">Supplier / Company</th>
                  <th className="text-left px-4 py-2.5">Contact Person</th>
                  <th className="text-left px-4 py-2.5">Contact Phone</th>
                  <th className="text-left px-4 py-2.5">GSTIN</th>
                  <th className="text-left px-4 py-2.5">Address</th>
                  <th className="text-right px-4 py-2.5">Balance Payable</th>
                  <th className="text-right px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVendors.map((v) => (
                  <tr key={v.id} className="hover:bg-secondary/40 transition">
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-foreground">{v.company_name}</div>
                      <div className="text-xs text-muted-foreground">{v.email}</div>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{v.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{v.phone || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{v.gst_number || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-xs">{v.address || "—"}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${v.balance_due > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      {inr(v.balance_due)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEditVendor(v)}
                          className="h-7 px-2 rounded bg-secondary hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1 border border-border"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-amber-400" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(v.id, v.company_name || v.name)}
                          className="h-7 w-7 rounded bg-secondary hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 flex items-center justify-center border border-border"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVendors.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                      No registered suppliers found matching query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier Create / Edit Modal */}
      {showVendorModal && (
        <VendorModal
          editingVendor={editingVendor}
          onClose={() => setShowVendorModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["local-vendors"] });
            setShowVendorModal(false);
          }}
        />
      )}

      {/* Purchase Order Create / Edit Modal */}
      {showPOModal && (
        <POFormModal
          editingPOData={editingPOData}
          onClose={() => setShowPOModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["local-purchase-orders"] });
            qc.invalidateQueries({ queryKey: ["local-inventory-products"] });
            qc.invalidateQueries({ queryKey: ["local-vendors"] });
            setShowPOModal(false);
          }}
        />
      )}

      {/* PO View, Print & WhatsApp Modal */}
      {selectedPOIdForView && (
        <POViewerModal
          poId={selectedPOIdForView}
          onClose={() => setSelectedPOIdForView(null)}
          onUpdated={() => {
            qc.invalidateQueries({ queryKey: ["local-purchase-orders"] });
          }}
        />
      )}

      {/* PO Receive Stock & Inventory Allocation Modal */}
      {receivingPOId && (
        <POReceiveModal
          poId={receivingPOId}
          onClose={() => setReceivingPOId(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["local-purchase-orders"] });
            qc.invalidateQueries({ queryKey: ["local-inventory-products"] });
            qc.invalidateQueries({ queryKey: ["local-vendors"] });
          }}
        />
      )}
    </div>
  );
}

const L = ({ label, children }: any) => (
  <label className="block">
    <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{label}</div>
    {children}
  </label>
);

function VendorModal({
  editingVendor,
  onClose,
  onSaved,
}: {
  editingVendor: Vendor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    id: editingVendor?.id || "",
    name: editingVendor?.name || "",
    company_name: editingVendor?.company_name || "",
    phone: editingVendor?.phone || "",
    email: editingVendor?.email || "",
    gst_number: editingVendor?.gst_number || "",
    address: editingVendor?.address || "",
    balance_due: editingVendor?.balance_due || 0,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) {
      toast.error("Contact person name required");
      return;
    }
    db.saveVendor(f);
    toast.success(editingVendor ? "Supplier updated successfully" : "New supplier onboarded");
    onSaved();
  }

  const ic = "w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono focus:outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md card-surface p-5 border-l-4 border-l-primary">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground">
            {editingVendor ? `Edit Supplier: ${editingVendor.company_name}` : "Onboard New Supplier"}
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <L label="Contact Person Name *">
            <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={ic} autoFocus />
          </L>
          <L label="Company / Business Name">
            <input value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} className={ic} />
          </L>
          <div className="grid grid-cols-2 gap-2">
            <L label="Phone Number">
              <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={ic} />
            </L>
            <L label="GSTIN">
              <input value={f.gst_number} onChange={(e) => setF({ ...f, gst_number: e.target.value })} className={ic} />
            </L>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <L label="Email Address">
              <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={ic} />
            </L>
            <L label="Current Balance Due (₹)">
              <input
                type="number"
                value={f.balance_due}
                onChange={(e) => setF({ ...f, balance_due: parseFloat(e.target.value) || 0 })}
                className={ic}
              />
            </L>
          </div>
          <L label="Address">
            <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={ic} />
          </L>
          <button type="submit" className="w-full h-10 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:accent-glow transition">
            {editingVendor ? "Update Supplier Info" : "Save Supplier"}
          </button>
        </form>
      </div>
    </div>
  );
}

interface EditablePOItem {
  product_id?: string;
  product_name: string;
  qty: number;
  unit: string;
  cost_price: number;
  gst_rate: number;
  update_inventory_cost?: boolean;
}

function POFormModal({
  editingPOData,
  onClose,
  onSaved,
}: {
  editingPOData: { order: PurchaseOrder; items: PurchaseItem[] } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const vendors = db.getVendors();
  const inventory = db.getInventory();

  const isEdit = Boolean(editingPOData);

  const [vendorId, setVendorId] = useState(editingPOData?.order.vendor_id || vendors[0]?.id || "");
  const [status, setStatus] = useState<"Draft" | "Ordered" | "Received">(editingPOData?.order.status || "Ordered");
  const [paidAmount, setPaidAmount] = useState(editingPOData?.order.paid_amount || 0);
  const [taxAmount, setTaxAmount] = useState(editingPOData?.order.tax_amount || 0);
  const [discountAmount, setDiscountAmount] = useState(editingPOData?.order.discount_amount || 0);
  const [notes, setNotes] = useState(editingPOData?.order.notes || "");
  const [expectedDate, setExpectedDate] = useState(editingPOData?.order.expected_date || "");

  // Items state
  const [items, setItems] = useState<EditablePOItem[]>(
    editingPOData?.items.map((it) => ({
      product_id: it.product_id || "",
      product_name: it.product_name,
      qty: it.qty,
      unit: it.unit || "Pcs",
      cost_price: it.cost_price,
      gst_rate: it.gst_rate || 0,
      update_inventory_cost: false,
    })) || []
  );

  // Add Item Tab: Catalog vs Custom
  const [itemMode, setItemMode] = useState<"catalog" | "custom">("catalog");

  // Catalog item fields
  const [poProdSearch, setPoProdSearch] = useState("");
  const [selectedProdId, setSelectedProdId] = useState(inventory[0]?.id || "");
  const [catQty, setCatQty] = useState(10);
  const [catCost, setCatCost] = useState(inventory[0]?.cost_price || 0);
  const [catUpdateMasterCost, setCatUpdateMasterCost] = useState(false);

  // Custom item fields
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState(1);
  const [customUnit, setCustomUnit] = useState("Pcs");
  const [customCost, setCustomCost] = useState(0);
  const [customGst, setCustomGst] = useState(18);

  function handleSelectCatalogProduct(prodId: string) {
    setSelectedProdId(prodId);
    const prod = inventory.find((p) => p.id === prodId);
    if (prod) {
      setCatCost(prod.cost_price);
    }
  }

  function addCatalogItem() {
    const prod = inventory.find((p) => p.id === selectedProdId);
    if (!prod) return;
    setItems((prev) => [
      ...prev,
      {
        product_id: prod.id,
        product_name: prod.name,
        qty: catQty,
        unit: prod.unit || "Pcs",
        cost_price: catCost,
        gst_rate: prod.gst_rate || 18,
        update_inventory_cost: catUpdateMasterCost,
      },
    ]);
    toast.success(`Added ${prod.name} to order`);
  }

  function addCustomItem() {
    if (!customName.trim()) {
      toast.error("Type product/service name for custom item");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        product_id: "",
        product_name: customName.trim(),
        qty: customQty,
        unit: customUnit,
        cost_price: customCost,
        gst_rate: customGst,
      },
    ]);
    setCustomName("");
    setCustomCost(0);
    toast.success(`Added custom item "${customName}"`);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItemRow(index: number, fields: Partial<EditablePOItem>) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...fields };
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId) {
      toast.error("Select a supplier");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one product/item to Purchase Order");
      return;
    }

    db.savePurchaseOrder(
      {
        id: editingPOData?.order.id,
        po_number: editingPOData?.order.po_number,
        vendor_id: vendorId,
        status,
        paid_amount: paidAmount,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        notes,
        expected_date: expectedDate,
      },
      items
    );

    toast.success(isEdit ? "Purchase Order updated!" : "Purchase Order created & issued!");
    onSaved();
  }

  const subtotal = items.reduce((s, i) => s + i.qty * i.cost_price, 0);
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);
  const due = grandTotal - paidAmount;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl card-surface p-5 border-l-4 border-l-primary my-8">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div>
            <div className="text-base font-bold text-foreground">
              {isEdit ? `Edit Purchase Order (${editingPOData?.order.po_number || ""})` : "Create & Issue Purchase Order (PO)"}
            </div>
            <div className="text-xs text-muted-foreground">Add products, custom items, cost prices, order notes, and payment info</div>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Supplier / Vendor *</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full h-9 rounded bg-input border border-border px-3 text-xs"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.company_name || v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">PO Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-semibold"
              >
                <option value="Draft">Draft</option>
                <option value="Ordered">Ordered</option>
                <option value="Received">Received (Increases Inventory Stock)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Expected Delivery Date</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full h-9 rounded bg-input border border-border px-3 text-xs font-mono"
              />
            </div>
          </div>

          {/* Add Product Line Item Box */}
          <div className="p-3.5 bg-card rounded-lg border border-border space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <div className="text-xs font-bold text-foreground">Add Line Items to Order</div>
              <div className="flex bg-secondary rounded p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setItemMode("catalog")}
                  className={`px-2.5 py-0.5 rounded transition ${itemMode === "catalog" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}
                >
                  Catalog Product
                </button>
                <button
                  type="button"
                  onClick={() => setItemMode("custom")}
                  className={`px-2.5 py-0.5 rounded transition ${itemMode === "custom" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}
                >
                  Custom Order Item
                </button>
              </div>
            </div>

            {itemMode === "catalog" ? (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground block">Search & Select Inventory Product</label>
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Type product name, barcode, SKU, category..."
                      value={poProdSearch}
                      onChange={(e) => setPoProdSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 bg-input border border-border rounded text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <select
                    value={selectedProdId}
                    onChange={(e) => handleSelectCatalogProduct(e.target.value)}
                    className="w-full h-9 rounded bg-input border border-border px-2 text-xs font-medium"
                  >
                    {inventory
                      .filter((p) => {
                        if (!poProdSearch.trim()) return true;
                        const q = poProdSearch.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          p.barcode.toLowerCase().includes(q) ||
                          (p.sku_code && p.sku_code.toLowerCase().includes(q)) ||
                          p.category.toLowerCase().includes(q)
                        );
                      })
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — [Shop Stock: {p.stock_qty} | Godown Reserve: {p.godown_qty}] — Cost: ₹{p.cost_price}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={catQty}
                      onChange={(e) => setCatQty(parseInt(e.target.value) || 1)}
                      className="w-full h-9 rounded bg-input border border-border px-2 text-center font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Cost Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={catCost}
                      onChange={(e) => setCatCost(parseFloat(e.target.value) || 0)}
                      className="w-full h-9 rounded bg-input border border-border px-2 text-right font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catUpdateMasterCost}
                      onChange={(e) => setCatUpdateMasterCost(e.target.checked)}
                      className="rounded border-border bg-input"
                    />
                    Update master product cost in inventory if cost changed
                  </label>

                  <button
                    type="button"
                    onClick={addCatalogItem}
                    className="h-8 px-3 rounded bg-secondary text-foreground text-xs font-semibold border border-border hover:bg-muted flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add Catalog Item
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-muted-foreground mb-1 block">Custom Product/Service Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Copper Winding Cable 100m"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full h-9 rounded bg-input border border-border px-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Qty & Unit</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={1}
                      value={customQty}
                      onChange={(e) => setCustomQty(parseInt(e.target.value) || 1)}
                      className="w-14 h-9 rounded bg-input border border-border px-1 text-center font-mono text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Pcs"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="w-14 h-9 rounded bg-input border border-border px-1 text-center text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customCost}
                    onChange={(e) => setCustomCost(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 rounded bg-input border border-border px-2 text-right font-mono text-xs"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={addCustomItem}
                    className="w-full h-9 rounded bg-secondary text-foreground text-xs font-semibold border border-border hover:bg-muted flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" /> Add Item
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="max-h-48 overflow-auto border border-border rounded-lg bg-card">
            <table className="w-full text-xs">
              <thead className="bg-secondary/60 text-[10px] uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left">Product / Description</th>
                  <th className="px-3 py-2 text-center w-24">Qty</th>
                  <th className="px-3 py-2 text-right w-28">Unit Cost (₹)</th>
                  <th className="px-3 py-2 text-right w-28">Total (₹)</th>
                  <th className="px-2 py-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-secondary/20">
                    <td className="px-3 py-1.5 font-medium">
                      <div className="flex items-center gap-1.5">
                        {it.product_name}
                        {!it.product_id && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">Custom</span>}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="number"
                        min={1}
                        value={it.qty}
                        onChange={(e) => updateItemRow(idx, { qty: parseInt(e.target.value) || 1 })}
                        className="w-16 h-7 rounded bg-input border border-border text-center font-mono text-xs"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={it.cost_price}
                        onChange={(e) => updateItemRow(idx, { cost_price: parseFloat(e.target.value) || 0 })}
                        className="w-20 h-7 rounded bg-input border border-border text-right font-mono text-xs"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold text-primary">
                      {inr(it.qty * it.cost_price)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-muted-foreground hover:text-rose-400 p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-muted-foreground">
                      No line items added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Customized Order Instructions / Notes */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">
              Customized Order Notes / Instructions / Delivery Specs
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type any customized instructions (e.g. Deliver before 5 PM, pack with bubble wrap, payment terms)..."
              className="w-full p-2.5 rounded bg-input border border-border text-xs focus:outline-none focus:border-primary"
            />
          </div>

          {/* Financial Breakdown Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-secondary/40 rounded-lg border border-border items-center">
            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Advance Paid (₹)</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full h-8 rounded bg-input border border-border px-3 text-xs font-mono"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">GST Tax (+₹)</label>
                <input
                  type="number"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 rounded bg-input border border-border px-2 text-xs font-mono"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase font-semibold text-muted-foreground mb-1 block">Discount (-₹)</label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 rounded bg-input border border-border px-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase text-muted-foreground">Net Grand Total</div>
              <div className="text-xl font-bold font-mono text-primary">{inr(grandTotal)}</div>
              <div className="text-[10px] text-muted-foreground font-mono">Due: {inr(due)}</div>
            </div>
          </div>

          <button type="submit" className="w-full h-10 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:accent-glow transition">
            {isEdit ? "Save Purchase Order Changes" : "Issue Purchase Order"}
          </button>
        </form>
      </div>
    </div>
  );
}
