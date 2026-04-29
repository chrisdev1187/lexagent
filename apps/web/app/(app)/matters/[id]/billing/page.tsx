"use client";

import { useState } from "react";
import { Receipt, Clock, Plus, Trash2, FileText } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { useParams } from "next/navigation";
import { useMatters } from "@/providers/matters-provider";
import { PanelShell } from "@/components/panels/PanelShell";

interface TimeEntry {
  id: string;
  description: string;
  minutes: number;
  rate: number;
  date: string;
}

export default function BillingPage() {
  const { id } = useParams<{ id: string }>();
  const { getMatter, updateMatter } = useMatters();
  const matter = getMatter(id);

  const [showAdd, setShowAdd] = useState(false);
  const [desc, setDesc] = useState("");
  const [minutes, setMinutes] = useState("");
  const [rate, setRate] = useState("350");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  if (!matter) return null;

  const entries = (matter.timeEntries as TimeEntry[]) ?? [];
  const totalMins = entries.reduce((acc, e) => acc + e.minutes, 0);
  const totalBilled = entries.reduce((acc, e) => acc + (e.minutes / 60) * e.rate, 0);

  const addEntry = () => {
    const mins = parseInt(minutes, 10);
    const rateNum = parseFloat(rate);
    if (!desc.trim() || isNaN(mins) || mins <= 0 || isNaN(rateNum)) return;
    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      description: desc.trim(),
      minutes: mins,
      rate: rateNum,
      date,
    };
    updateMatter(m => m.id === id
      ? { ...m, timeEntries: [...(m.timeEntries as TimeEntry[]), entry], totalMinsBilled: (m.totalMinsBilled ?? 0) + mins }
      : m
    );
    setDesc("");
    setMinutes("");
    setShowAdd(false);
  };

  const removeEntry = (entryId: string) => {
    updateMatter(m => {
      if (m.id !== id) return m;
      const next = (m.timeEntries as TimeEntry[]).filter(e => e.id !== entryId);
      return { ...m, timeEntries: next, totalMinsBilled: next.reduce((a, e) => a + e.minutes, 0) };
    });
  };

  const generateInvoice = () => {
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoiceNum}</title><style>
body{font-family:Georgia,serif;max-width:800px;margin:40px auto;color:#111}
h1{font-size:28px;margin-bottom:4px}
.meta{color:#555;font-size:13px;margin-bottom:32px;line-height:1.8}
table{width:100%;border-collapse:collapse;margin-top:24px}
th{text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid #000}
td{padding:10px 12px;font-size:13px;border-bottom:1px solid #eee}
.right{text-align:right}.bold{font-weight:bold;font-size:15px}
@media print{body{margin:20px}}
</style></head><body>
<h1>Invoice</h1>
<div class="meta">
  <strong>Matter:</strong> ${matter.title}<br>
  ${matter.client ? `<strong>Client:</strong> ${matter.client}<br>` : ""}
  <strong>Invoice #:</strong> ${invoiceNum}<br>
  <strong>Date:</strong> ${today}
</div>
<table>
<thead><tr><th>Date</th><th>Description</th><th>Time</th><th>Rate</th><th class="right">Amount</th></tr></thead>
<tbody>${entries.map(e => `<tr>
  <td>${new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
  <td>${e.description}</td>
  <td>${e.minutes >= 60 ? `${(e.minutes / 60).toFixed(1)}h` : `${e.minutes}m`}</td>
  <td>$${e.rate}/hr</td>
  <td class="right">$${((e.minutes / 60) * e.rate).toFixed(2)}</td>
</tr>`).join("")}</tbody>
<tfoot><tr><td colspan="3"></td><td class="bold">Total</td><td class="right bold">$${totalBilled.toFixed(2)}</td></tr></tfoot>
</table></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const inputCls = "w-full px-3 py-2 rounded text-[13px] font-mono lex-focus";
  const inputStyle = {
    background: "rgba(255,255,255,0.03)",
    color: "var(--fg-primary)",
    border: "0.5px solid rgba(224,224,224,0.10)",
    outline: "none",
  };

  return (
    <PanelShell
      icon={Receipt}
      title="Time &amp; Billing"
      description="Track billable hours and generate fee summaries"
      actions={
        <div className="flex gap-2">
          <ExportButton
            content={["Date,Description,Minutes,Rate,Amount", ...entries.map(e => `${e.date},"${e.description}",${e.minutes},${e.rate},${((e.minutes / 60) * e.rate).toFixed(2)}`)].join("\n")}
            filename={`billing-${matter.title}`}
            format="csv"
            label="Export CSV"
          />
          <button
            onClick={generateInvoice}
            disabled={entries.length === 0}
            className="lex-btn lex-btn--primary"
          >
            <FileText size={13} />
            Invoice PDF
          </button>
        </div>
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Hours", value: `${(totalMins / 60).toFixed(1)}h`, color: "var(--verdict-amber)" },
          { label: "Time Entries", value: entries.length, color: "var(--verdict-neon)" },
          { label: "Est. Fees", value: `$${totalBilled.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "var(--verdict-violet)" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded p-4"
            style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)" }}
          >
            <div className="font-serif text-2xl font-semibold mb-1" style={{ color }}>{value}</div>
            <div className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: "var(--fg-quaternary)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Add entry */}
      <div className="mb-5">
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} className="lex-btn lex-btn--primary">
            <Plus size={13} />
            Log Time
          </button>
        ) : (
          <div
            className="rounded p-4 space-y-3"
            style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(0,255,195,0.20)" }}
          >
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
              New Time Entry
            </p>
            <div>
              <label className="block font-mono text-[9px] tracking-[0.14em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>Description</label>
              <input
                type="text"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="e.g. Drafted motion to dismiss…"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[9px] tracking-[0.14em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>Minutes</label>
                <input
                  type="number"
                  min="1"
                  value={minutes}
                  onChange={e => setMinutes(e.target.value)}
                  placeholder="60"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block font-mono text-[9px] tracking-[0.14em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>Rate ($/hr)</label>
                <input
                  type="number"
                  min="0"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  placeholder="350"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block font-mono text-[9px] tracking-[0.14em] uppercase mb-1" style={{ color: "var(--fg-quaternary)" }}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addEntry} className="lex-btn lex-btn--primary">
                <Clock size={13} />
                Save Entry
              </button>
              <button onClick={() => setShowAdd(false)} className="lex-btn lex-btn--ghost">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Entries table */}
      {entries.length === 0 ? (
        <div className="lex-empty">
          <div
            className="w-14 h-14 rounded flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.22)" }}
          >
            <Clock size={24} style={{ color: "var(--verdict-neon)" }} />
          </div>
          <p className="lex-empty__label">No time logged yet</p>
          <p className="lex-empty__body">Use the button above to log your first billable entry.</p>
        </div>
      ) : (
        <div
          className="rounded overflow-hidden"
          style={{ border: "0.5px solid rgba(224,224,224,0.09)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                {["Date", "Description", "Time", "Rate", "Amount", ""].map(h => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left font-mono text-[9px] tracking-[0.14em] uppercase"
                    style={{ color: "var(--fg-quaternary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr
                  key={entry.id}
                  style={{
                    borderTop: "0.5px solid rgba(224,224,224,0.06)",
                    color: "var(--fg-secondary)",
                  }}
                >
                  <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
                    {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5 text-[13px]">{entry.description}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px]">
                    {entry.minutes >= 60
                      ? `${(entry.minutes / 60).toFixed(1)}h`
                      : `${entry.minutes}m`}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: "var(--fg-tertiary)" }}>
                    ${entry.rate}/hr
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: "var(--verdict-neon)" }}>
                    ${((entry.minutes / 60) * entry.rate).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="lex-btn lex-btn--icon"
                      style={{ color: "var(--verdict-crimson)" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "0.5px solid rgba(224,224,224,0.10)", background: "rgba(255,255,255,0.02)" }}>
                <td colSpan={2} className="px-4 py-2.5 font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: "var(--fg-quaternary)" }}>
                  Total
                </td>
                <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: "var(--fg-primary)" }}>
                  {(totalMins / 60).toFixed(1)}h
                </td>
                <td />
                <td className="px-4 py-2.5 font-mono text-[11px] font-semibold" style={{ color: "var(--verdict-amber)" }}>
                  ${totalBilled.toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PanelShell>
  );
}
