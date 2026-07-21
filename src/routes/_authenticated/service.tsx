import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, ServiceTicket } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr } from "@/lib/format";
import { Plus, Wrench, Printer, FileSpreadsheet, X, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/service")({ component: ServicePage });

function ServicePage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editTicket, setEditTicket] = useState<ServiceTicket | null>(null);

  const tickets = useQuery({
    queryKey: ["local-service-tickets"],
    queryFn: async () => db.getServiceTickets(),
  });

  function exportServiceExcel() {
    const data = (tickets.data || []).map((t) => ({
      'Ticket Number': t.ticket_number,
      'Customer Name': t.customer_name,
      'Customer Mobile': t.customer_mobile,
      'Device Name': t.device_name,
      'Serial Number': t.serial_number,
      'Issue Description': t.issue_description,
      'Estimated Cost (₹)': t.estimated_cost,
      'Final Cost (₹)': t.final_cost,
      'Status': t.status,
      'Intake Date': t.created_at.split('T')[0],
    }));
    ExcelEngine.exportToExcel(data, `Ponmani_Service_Tickets_${new Date().toISOString().split('T')[0]}`);
    toast.success("Service tickets exported to Excel");
  }

  function updateStatus(ticket: ServiceTicket, newStatus: ServiceTicket['status']) {
    db.saveServiceTicket({ ...ticket, status: newStatus });
    toast.success(`Ticket ${ticket.ticket_number} updated to: ${newStatus}`);
    qc.invalidateQueries({ queryKey: ["local-service-tickets"] });
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Hardware Service & Repair Department"
        subtitle="Device intake, status tracking pipeline, and printable service receipts"
        action={
          <div className="flex gap-2">
            <button
              onClick={exportServiceExcel}
              className="h-9 px-3 rounded-md bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-400" /> Export Excel
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:accent-glow transition"
            >
              <Plus className="h-4 w-4" /> New Service Intake
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(["Intake", "In Progress", "Ready", "Delivered"] as const).map((st) => {
          const count = (tickets.data || []).filter((t) => t.status === st).length;
          return (
            <div key={st} className="card-surface p-3 flex justify-between items-center">
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">{st} Tickets</div>
                <div className="text-xl font-bold font-mono text-foreground mt-0.5">{count}</div>
              </div>
              <Wrench
                className={`h-5 w-5 ${
                  st === "Delivered" ? "text-emerald-400" : st === "Ready" ? "text-blue-400" : "text-amber-400"
                }`}
              />
            </div>
          );
        })}
      </div>

      <div className="card-surface overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase text-muted-foreground tracking-wider bg-card border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5">Ticket #</th>
              <th className="text-left px-4 py-2.5">Customer</th>
              <th className="text-left px-4 py-2.5">Device & Serial</th>
              <th className="text-left px-4 py-2.5">Reported Issue</th>
              <th className="text-center px-4 py-2.5">Status</th>
              <th className="text-right px-4 py-2.5">Est / Final Cost</th>
              <th className="text-right px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.data?.map((t) => (
              <tr key={t.id} className="hover:bg-secondary/40 transition">
                <td className="px-4 py-2.5 font-mono font-bold text-primary">{t.ticket_number}</td>
                <td className="px-4 py-2.5 text-xs">
                  <div className="font-semibold text-foreground">{t.customer_name}</div>
                  <div className="font-mono text-muted-foreground">{t.customer_mobile || "No Mobile"}</div>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  <div className="font-medium text-foreground">{t.device_name}</div>
                  <div className="font-mono text-muted-foreground text-[10px]">S/N: {t.serial_number || "N/A"}</div>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">{t.issue_description}</td>
                <td className="px-4 py-2.5 text-center">
                  <select
                    value={t.status}
                    onChange={(e) => updateStatus(t, e.target.value as any)}
                    className="h-7 rounded text-[11px] font-bold px-2 bg-input border border-border"
                  >
                    <option value="Intake">Intake</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Ready">Ready for Pickup</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">
                  {inr(t.final_cost || t.estimated_cost)}
                </td>
                <td className="px-4 py-2.5 text-right space-x-1">
                  <button
                    onClick={() => setEditTicket(t)}
                    className="h-7 px-2.5 rounded bg-secondary hover:bg-muted text-xs font-semibold border border-border inline-flex items-center gap-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="h-7 px-2 rounded bg-primary/15 text-primary text-xs font-semibold border border-primary/30 inline-flex items-center"
                  >
                    <Printer className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
            {tickets.data?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                  No hardware service tickets logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(showModal || editTicket) && (
        <ServiceTicketModal
          ticket={editTicket}
          onClose={() => {
            setShowModal(false);
            setEditTicket(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["local-service-tickets"] });
            setShowModal(false);
            setEditTicket(null);
          }}
        />
      )}
    </div>
  );
}

function ServiceTicketModal({
  ticket,
  onClose,
  onSaved,
}: {
  ticket: ServiceTicket | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<ServiceTicket>>({
    customer_name: ticket?.customer_name ?? "",
    customer_mobile: ticket?.customer_mobile ?? "",
    device_name: ticket?.device_name ?? "",
    serial_number: ticket?.serial_number ?? "",
    issue_description: ticket?.issue_description ?? "",
    estimated_cost: ticket?.estimated_cost ?? 0,
    final_cost: ticket?.final_cost ?? 0,
    status: ticket?.status ?? "Intake",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.customer_name?.trim() || !f.device_name?.trim()) {
      toast.error("Customer name and device name required");
      return;
    }
    db.saveServiceTicket({ ...f, id: ticket?.id } as any);
    toast.success(ticket ? "Service ticket updated" : "Service ticket created");
    onSaved();
  }

  const ic = "w-full h-9 rounded bg-input border border-border px-3 text-xs focus:outline-none focus:border-primary";
  const L = ({ label, children }: any) => <label className="block"><div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{label}</div>{children}</label>;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg card-surface p-5 border-l-4 border-l-primary">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground">
            {ticket ? `Edit Ticket ${ticket.ticket_number}` : "Hardware Service Intake"}
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <L label="Customer Name *">
              <input required value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} className={ic} autoFocus />
            </L>
            <L label="Customer Mobile">
              <input value={f.customer_mobile} onChange={(e) => setF({ ...f, customer_mobile: e.target.value })} className={`${ic} font-mono`} />
            </L>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <L label="Device Name / Model *">
              <input required value={f.device_name} onChange={(e) => setF({ ...f, device_name: e.target.value })} placeholder="e.g. Havells Inverter 1050VA" className={ic} />
            </L>
            <L label="Serial Number">
              <input value={f.serial_number} onChange={(e) => setF({ ...f, serial_number: e.target.value })} className={`${ic} font-mono`} />
            </L>
          </div>

          <L label="Fault / Issue Description">
            <textarea
              rows={3}
              value={f.issue_description}
              onChange={(e) => setF({ ...f, issue_description: e.target.value })}
              placeholder="Describe symptoms, error codes, damaged components..."
              className="w-full rounded bg-input border border-border p-2 text-xs focus:outline-none focus:border-primary"
            />
          </L>

          <div className="grid grid-cols-3 gap-2">
            <L label="Estimated Cost (₹)">
              <input type="number" value={f.estimated_cost} onChange={(e) => setF({ ...f, estimated_cost: parseFloat(e.target.value) || 0 })} className={`${ic} font-mono`} />
            </L>
            <L label="Final Repair Charge (₹)">
              <input type="number" value={f.final_cost} onChange={(e) => setF({ ...f, final_cost: parseFloat(e.target.value) || 0 })} className={`${ic} font-mono`} />
            </L>
            <L label="Current Status">
              <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as any })} className="w-full h-9 rounded bg-input border border-border px-2 text-xs font-bold">
                <option value="Intake">Intake</option>
                <option value="In Progress">In Progress</option>
                <option value="Ready">Ready</option>
                <option value="Delivered">Delivered</option>
              </select>
            </L>
          </div>

          <button type="submit" className="w-full h-10 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:accent-glow transition">
            Save Ticket & Issue Receipt
          </button>
        </form>
      </div>
    </div>
  );
}
