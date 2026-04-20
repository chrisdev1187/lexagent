"use client";

import { useState } from "react";
import { Receipt, Trash2, Printer, DollarSign, Clock, Plus, Download } from "lucide-react";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { useSettings } from "@/providers/settings-provider";
import { PanelShell } from "@/components/panels/PanelShell";

interface TimeEntry {
  id: string;
  durationMins: number;
  startedAt: number;
  stoppedAt: number;
  description?: string;
}

export default function BillingPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const { settings } = useSettings();
  const matter = getMatter(id);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");

  // Manual entry form
  const [showForm, setShowForm] = useState(false);
  const [manualMins, setManualMins] = useState("");
  const [manualDesc, setManualDesc] = useState("");

  const entries = ((matter?.timeEntries ?? []) as TimeEntry[]).sort((a, b) => b.startedAt - a.startedAt);
  const totalMins = (matter?.totalMinsBilled as number) ?? 0;
  const totalHours = totalMins / 60;
  const rate = settings.hourlyRate ?? 350;
  const totalBilled = (totalHours * rate).toFixed(2);

  const deleteEntry = async (entry: TimeEntry) => {
    if (!matter) return;
    const remaining = entries.filter(e => e.id !== entry.id);
    await updateMatter({
      ...matter,
      timeEntries: remaining,
      totalMinsBilled: Math.max(0, totalMins - entry.durationMins),
    });
  };

  const saveDescription = async (entryId: string, desc: string) => {
    if (!matter) return;
    await updateMatter({
      ...matter,
      timeEntries: entries.map(e => e.id === entryId ? { ...e, description: desc } : e),
    });
    setEditingId(null);
  };

  const addManualEntry = async () => {
    const mins = parseInt(manualMins, 10);
    if (!mins || mins <= 0 || !matter) return;
    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      durationMins: mins,
      startedAt: Date.now(),
      stoppedAt: Date.now(),
      description: manualDesc.trim() || undefined,
    };
    await updateMatter({
      ...matter,
      timeEntries: [entry, ...entries],
      totalMinsBilled: totalMins + mins,
    });
    setManualMins("");
    setManualDesc("");
    setShowForm(false);
  };

  const downloadCsv = () => {
    const rows = [
      ["Date", "Description", "Hours", "Amount"],
      ...entries.map(e => [
        new Date(e.startedAt).toLocaleDateString(),
        e.description || "Legal services",
        (e.durationMins / 60).toFixed(2),
        `$${((e.durationMins / 60) * rate).toFixed(2)}`,
      ]),
      ["", "Total", totalHours.toFixed(2), `$${totalBilled}`],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${matter?.title ?? "billing"}-time-entries.csv`;
    a.click();
  };

  const printInvoice = () => {
    const firm = settings.firmName || "Law Firm";
    const addr = [settings.firmAddress, settings.firmCity, settings.firmState, settings.firmZip].filter(Boolean).join(", ");
    const rows = entries.map(e => {
      const hrs = (e.durationMins / 60).toFixed(2);
      const amt = ((e.durationMins / 60) * rate).toFixed(2);
      const date = new Date(e.startedAt).toLocaleDateString();
      const desc = e.description || "Legal services";
      return `<tr><td>${date}</td><td>${desc}</td><td style="text-align:center">${hrs}</td><td style="text-align:right">$${amt}</td></tr>`;
    }).join("");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice — ${matter?.title}</title><style>
      body{font-family:"Times New Roman",serif;font-size:12pt;color:#000;margin:0}
      @page{margin:1in}
      h1{font-size:18pt;margin:0 0 4px}
      h2{font-size:13pt;margin:24px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f0f0f0;font-size:10pt;padding:6px 8px;text-align:left;border:1px solid #ccc}
      td{padding:6px 8px;border:1px solid #eee;font-size:11pt;vertical-align:top}
      .total{font-weight:bold;font-size:13pt;text-align:right;margin-top:16px}
      .meta{font-size:10pt;color:#555;margin:4px 0}
    </style></head><body>
    <h1>${firm}</h1>
    ${addr ? `<p class="meta">${addr}</p>` : ""}
    ${settings.firmPhone ? `<p class="meta">${settings.firmPhone}</p>` : ""}
    ${settings.firmEmail ? `<p class="meta">${settings.firmEmail}</p>` : ""}
    <h2>Invoice</h2>
    <p class="meta"><strong>Matter:</strong> ${matter?.title}</p>
    ${matter?.client ? `<p class="meta"><strong>Client:</strong> ${matter.client}</p>` : ""}
    <p class="meta"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    <p class="meta"><strong>Rate:</strong> $${rate.toFixed(2)}/hr</p>
    <h2>Time Entries</h2>
    <table>
      <thead><tr><th>Date</th><th>Description</th><th style="text-align:center">Hours</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="total">Total: $${totalBilled}</p>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 300);
  };

  const inputStyle = {
    background: "var(--panel2)",
    color: "var(--text)",
    border: "0.5px solid rgba(224,224,224,0.09)",
    borderRadius: "8px",
    outline: "none",
    fontSize: "0.75rem",
    padding: "6px 12px",
  };

  return (
    <PanelShell
      icon={Receipt}
      title="Billing & Time"
      description="Billable hours log and invoice generator"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{ background: "var(--panel2)", color: "var(--text-muted)", border: "0.5px solid rgba(224,224,224,0.09)", cursor: "pointer" }}
          >
            <Plus size={12} />
            Manual Entry
          </button>
          {entries.length > 0 && (
            <button
              onClick={downloadCsv}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: "var(--panel2)", color: "var(--text-muted)", border: "0.5px solid rgba(224,224,224,0.09)", cursor: "pointer" }}
            >
              <Download size={12} />
              Export CSV
            </button>
          )}
          {entries.length > 0 && (
            <button
              onClick={printInvoice}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{
                background: "var(--verdict-neon)",
                color: "var(--midnight-court)",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Printer size={12} />
              Print Invoice
            </button>
          )}
        </div>
      }
    >
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded p-4 text-center" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <div className="flex items-center justify-center mb-1">
            <Clock size={14} style={{ color: "var(--verdict-amber)" }} />
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--text)" }}>{totalHours.toFixed(1)}h</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Hours</p>
        </div>
        <div className="rounded p-4 text-center" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <div className="flex items-center justify-center mb-1">
            <DollarSign size={14} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--text)" }}>${totalBilled}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Billed @ ${rate}/hr</p>
        </div>
        <div className="rounded p-4 text-center" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <div className="flex items-center justify-center mb-1">
            <Receipt size={14} style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--text)" }}>{entries.length}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Time Entries</p>
        </div>
      </div>

      {/* Manual entry form */}
      {showForm && (
        <div className="rounded p-4 mb-5" style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(0,255,195,0.14)" }}>
          <p className="text-xs font-mono tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>MANUAL TIME ENTRY</p>
          <div className="flex gap-3 mb-3">
            <div style={{ flex: "0 0 120px" }}>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Minutes *</label>
              <input
                type="number"
                value={manualMins}
                onChange={e => setManualMins(e.target.value)}
                placeholder="60"
                min="1"
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
            <div style={{ flex: "1 1 auto" }}>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Description (optional)</label>
              <input
                type="text"
                value={manualDesc}
                onChange={e => setManualDesc(e.target.value)}
                placeholder="Client call, document review…"
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--panel2)", color: "var(--text-muted)", border: "0.5px solid rgba(224,224,224,0.09)", cursor: "pointer" }}>
              Cancel
            </button>
            <button
              onClick={addManualEntry}
              disabled={!manualMins || parseInt(manualMins) <= 0}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{
                background: manualMins && parseInt(manualMins) > 0 ? "var(--verdict-neon)" : "var(--panel2)",
                color: manualMins && parseInt(manualMins) > 0 ? "var(--midnight-court)" : "var(--text-muted)",
                border: "none",
                cursor: manualMins && parseInt(manualMins) > 0 ? "pointer" : "default",
              }}
            >
              <Plus size={12} />
              Add Entry
            </button>
          </div>
        </div>
      )}

      {/* Entries table */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded flex items-center justify-center mb-3" style={{ background: "rgba(0,255,195,0.06)", border: "1px solid rgba(0,255,195,0.28)" }}>
            <Clock size={20} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>No time entries yet</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Use the sidebar timer or add a manual entry above</p>
        </div>
      ) : (
        <div className="rounded overflow-hidden" style={{ border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "rgba(17,17,20,0.7)", borderBottom: "0.5px solid rgba(224,224,224,0.08)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-mono tracking-wider" style={{ color: "var(--text-muted)" }}>DATE</th>
                <th className="text-left px-4 py-2.5 text-xs font-mono tracking-wider" style={{ color: "var(--text-muted)" }}>DESCRIPTION</th>
                <th className="text-center px-4 py-2.5 text-xs font-mono tracking-wider" style={{ color: "var(--text-muted)" }}>HOURS</th>
                <th className="text-right px-4 py-2.5 text-xs font-mono tracking-wider" style={{ color: "var(--text-muted)" }}>AMOUNT</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const hrs = (entry.durationMins / 60).toFixed(2);
                const amt = ((entry.durationMins / 60) * rate).toFixed(2);
                const date = new Date(entry.startedAt).toLocaleDateString();
                const isEditing = editingId === entry.id;
                return (
                  <tr
                    key={entry.id}
                    style={{
                      background: i % 2 === 0 ? "var(--panel2)" : "transparent",
                      borderBottom: "0.5px solid rgba(224,224,224,0.08)",
                    }}
                  >
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>{date}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text)" }}>
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={entry.description ?? ""}
                          onBlur={e => saveDescription(entry.id, e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveDescription(entry.id, (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingId(null); }}
                          style={{ ...inputStyle, width: "100%", padding: "3px 8px" }}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => { setEditingId(entry.id); setEditDesc(entry.description ?? ""); }}
                          title="Click to edit description"
                          style={{ color: entry.description ? "var(--text)" : "var(--text-muted)" }}
                        >
                          {entry.description || "Legal services — click to add description"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-center font-mono" style={{ color: "var(--text)" }}>{hrs}</td>
                    <td className="px-4 py-3 text-xs text-right font-mono" style={{ color: "var(--verdict-neon)" }}>${amt}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteEntry(entry)} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "rgba(17,17,20,0.7)", borderTop: "2px solid var(--border)" }}>
                <td colSpan={2} className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--text)" }}>Total</td>
                <td className="px-4 py-3 text-xs text-center font-mono font-semibold" style={{ color: "var(--text)" }}>{totalHours.toFixed(2)}</td>
                <td className="px-4 py-3 text-xs text-right font-mono font-bold" style={{ color: "var(--verdict-neon)" }}>${totalBilled}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PanelShell>
  );
}
