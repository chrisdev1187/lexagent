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
    background: "var(--bg-raised)",
    color: "var(--fg-primary)",
    border: "0.5px solid var(--border-hair)",
    borderRadius: "var(--radius-md)",
    outline: "none",
    fontSize: "0.75rem",
    padding: "6px 12px",
  };

  return (
    <PanelShell
      icon={Receipt}
      title="Billing & time"
      description="Billable hours log and invoice generator"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(v => !v)}
            className="lex-btn lex-btn--secondary"
          >
            <Plus size={12} />
            Manual entry
          </button>
          {entries.length > 0 && (
            <button
              onClick={downloadCsv}
              className="lex-btn lex-btn--secondary"
            >
              <Download size={12} />
              Export CSV
            </button>
          )}
          {entries.length > 0 && (
            <button
              onClick={printInvoice}
              className="lex-btn lex-btn--primary"
            >
              <Printer size={12} />
              Print invoice
            </button>
          )}
        </div>
      }
    >
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="lex-card text-center">
          <p className="lex-micro lex-micro--amber mb-2">Total hours</p>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock size={14} style={{ color: "var(--verdict-amber)" }} />
            <span className="font-serif text-xl font-semibold" style={{ color: "var(--fg-primary)" }}>{totalHours.toFixed(1)}h</span>
          </div>
        </div>
        <div className="lex-card text-center">
          <p className="lex-micro lex-micro--neon mb-2">Total billed</p>
          <div className="flex items-center justify-center gap-2 mb-1">
            <DollarSign size={14} style={{ color: "var(--verdict-neon)" }} />
            <span className="font-serif text-xl font-semibold" style={{ color: "var(--fg-primary)" }}>${totalBilled}</span>
          </div>
          <p className="font-mono text-[10px]" style={{ color: "var(--fg-quaternary)" }}>@ ${rate}/hr</p>
        </div>
        <div className="lex-card text-center">
          <p className="lex-micro mb-2">Time entries</p>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Receipt size={14} style={{ color: "var(--fg-tertiary)" }} />
            <span className="font-serif text-xl font-semibold" style={{ color: "var(--fg-primary)" }}>{entries.length}</span>
          </div>
        </div>
      </div>

      {/* Manual entry form */}
      {showForm && (
        <div className="lex-card mb-5" style={{ borderColor: "var(--border-neon)" }}>
          <p className="lex-micro lex-micro--neon mb-3">Manual time entry</p>
          <div className="flex gap-3 mb-3">
            <div style={{ flex: "0 0 120px" }}>
              <label className="text-xs mb-1 block" style={{ color: "var(--fg-tertiary)" }}>Minutes *</label>
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
              <label className="text-xs mb-1 block" style={{ color: "var(--fg-tertiary)" }}>Description (optional)</label>
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
            <button onClick={() => setShowForm(false)} className="lex-btn lex-btn--ghost">
              Cancel
            </button>
            <button
              onClick={addManualEntry}
              disabled={!manualMins || parseInt(manualMins) <= 0}
              className="lex-btn lex-btn--primary"
            >
              <Plus size={12} />
              Add entry
            </button>
          </div>
        </div>
      )}

      {/* Entries table */}
      {entries.length === 0 ? (
        <div className="lex-empty">
          <div className="lex-empty__icon">
            <Clock size={20} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="lex-empty__title">No time entries yet</p>
          <p className="lex-empty__body">Use the sidebar timer or add a manual entry above</p>
        </div>
      ) : (
        <div className="lex-table-wrap">
          <table className="lex-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th style={{ textAlign: "center" }}>Hours</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const hrs = (entry.durationMins / 60).toFixed(2);
                const amt = ((entry.durationMins / 60) * rate).toFixed(2);
                const date = new Date(entry.startedAt).toLocaleDateString();
                const isEditing = editingId === entry.id;
                return (
                  <tr key={entry.id}>
                    <td style={{ color: "var(--fg-tertiary)", whiteSpace: "nowrap" }}>{date}</td>
                    <td>
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={entry.description ?? ""}
                          onBlur={e => saveDescription(entry.id, e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") saveDescription(entry.id, (e.target as HTMLInputElement).value);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          style={{ ...inputStyle, width: "100%", padding: "3px 8px" }}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => { setEditingId(entry.id); setEditDesc(entry.description ?? ""); }}
                          title="Click to edit description"
                          style={{ color: entry.description ? "var(--fg-primary)" : "var(--fg-tertiary)" }}
                        >
                          {entry.description || "Legal services — click to add description"}
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-center" style={{ color: "var(--fg-primary)" }}>{hrs}</td>
                    <td className="font-mono text-right" style={{ color: "var(--verdict-neon)" }}>${amt}</td>
                    <td>
                      <button
                        onClick={() => deleteEntry(entry)}
                        className="lex-btn lex-btn--icon lex-btn--ghost"
                        style={{ padding: 4 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "0.5px solid var(--border-line)" }}>
                <td colSpan={2} className="font-semibold" style={{ color: "var(--fg-primary)" }}>Total</td>
                <td className="font-mono font-semibold text-center" style={{ color: "var(--fg-primary)" }}>{totalHours.toFixed(2)}</td>
                <td className="font-mono font-bold text-right" style={{ color: "var(--verdict-neon)" }}>${totalBilled}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PanelShell>
  );
}
