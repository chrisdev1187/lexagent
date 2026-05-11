"use client";

import { useSettings } from "@/providers/settings-provider";
import { PRACTICE_AREAS } from "@/lib/settings";
import { Letterhead } from "@/components/shared/Letterhead";
import { SectionHeading, Field } from "@/components/shared/AdminSettingsShared";

const inputCls = "w-full rounded px-3.5 py-2.5 text-sm lex-focus transition-all";
const inputStyle = {
  background: "var(--bg-raised)",
  border: "0.5px solid rgba(224,224,224,0.09)",
  color: "var(--fg-primary)",
  outline: "none",
};

export function FirmProfileTab({ isAdmin }: { isAdmin: boolean }) {
  const { settings, updateSettings } = useSettings();
  const set = (k: string, v: unknown) => updateSettings({ [k]: v });

  if (!isAdmin) {
    return (
      <div>
        <SectionHeading variant="settings">FIRM LOGO</SectionHeading>
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid var(--border-hair)" }}
          >
            {settings.firmLogo
              ? <img src={settings.firmLogo} alt="Firm logo" className="w-full h-full object-contain" />
              : <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--fg-quaternary)" }}>Logo</span>
            }
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--fg-primary)" }}>{settings.firmName || "—"}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>{settings.firmAddress || ""}{settings.firmCity ? `, ${settings.firmCity}` : ""}</p>
          </div>
        </div>

        <SectionHeading variant="settings">FIRM INFORMATION</SectionHeading>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          {[
            ["Email", settings.firmEmail],
            ["Phone", settings.firmPhone],
            ["Website", settings.firmWebsite],
            ["Bar Number", settings.barNumber],
            ["Jurisdiction", settings.barJurisdiction],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="font-mono text-[10px] tracking-wider mb-0.5" style={{ color: "var(--fg-tertiary)" }}>{label}</p>
              <p style={{ color: val ? "var(--fg-primary)" : "var(--fg-quaternary)" }}>{val || "—"}</p>
            </div>
          ))}
        </div>

        {(settings.practiceAreas ?? []).length > 0 && (
          <>
            <SectionHeading variant="settings">PRACTICE AREAS</SectionHeading>
            <div className="flex flex-wrap gap-2">
              {(settings.practiceAreas ?? []).map((area: string) => (
                <span key={area} className="px-3 py-1.5 rounded text-xs font-mono tracking-wide"
                  style={{ background: "rgba(0,255,195,0.06)", border: "0.5px solid rgba(0,255,195,0.28)", color: "var(--verdict-neon)" }}>
                  {area}
                </span>
              ))}
            </div>
          </>
        )}

        <p className="text-xs mt-6" style={{ color: "var(--fg-quaternary)" }}>Contact your firm administrator to update firm profile details.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading variant="settings">FIRM LOGO</SectionHeading>
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-16 h-16 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: "rgba(0,255,195,0.04)", border: "0.5px solid var(--border-hair)" }}
        >
          {settings.firmLogo
            ? <img src={settings.firmLogo} alt="Firm logo" className="w-full h-full object-contain" />
            : <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--fg-quaternary)" }}>Logo</span>
          }
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="lex-btn lex-btn--secondary cursor-pointer text-xs"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => set("firmLogo", reader.result as string);
                reader.readAsDataURL(file);
              }}
            />
            Upload logo
          </label>
          {settings.firmLogo && (
            <>
              <button
                className="lex-btn lex-btn--secondary text-xs"
                onClick={() => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext("2d")!;
                    ctx.drawImage(img, 0, 0);
                    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    for (let i = 0; i < data.data.length; i += 4) {
                      if (data.data[i] > 220 && data.data[i + 1] > 220 && data.data[i + 2] > 220) {
                        data.data[i + 3] = 0;
                      }
                    }
                    ctx.putImageData(data, 0, 0);
                    set("firmLogo", canvas.toDataURL("image/png"));
                  };
                  img.src = settings.firmLogo as string;
                }}
              >
                Remove background
              </button>
              <button className="lex-btn lex-btn--ghost text-xs" onClick={() => set("firmLogo", null)}>
                Remove
              </button>
            </>
          )}
        </div>
      </div>

      <SectionHeading variant="settings">FIRM INFORMATION</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Field variant="settings" label="FIRM NAME">
          <input className={inputCls} style={inputStyle} value={settings.firmName} onChange={e => set("firmName", e.target.value)} placeholder="Acme Law Group" />
        </Field>
        <Field variant="settings" label="FIRM EMAIL">
          <input className={inputCls} style={inputStyle} value={settings.firmEmail} onChange={e => set("firmEmail", e.target.value)} placeholder="info@lawfirm.com" />
        </Field>
        <Field variant="settings" label="PHONE">
          <input className={inputCls} style={inputStyle} value={settings.firmPhone} onChange={e => set("firmPhone", e.target.value)} placeholder="(555) 000-0000" />
        </Field>
        <Field variant="settings" label="WEBSITE">
          <input className={inputCls} style={inputStyle} value={settings.firmWebsite} onChange={e => set("firmWebsite", e.target.value)} placeholder="https://lawfirm.com" />
        </Field>
      </div>
      <Field variant="settings" label="STREET ADDRESS">
        <input className={inputCls} style={inputStyle} value={settings.firmAddress} onChange={e => set("firmAddress", e.target.value)} placeholder="123 Main St, Suite 400" />
      </Field>
      <div className="grid grid-cols-3 gap-x-4">
        <Field variant="settings" label="CITY">
          <input className={inputCls} style={inputStyle} value={settings.firmCity} onChange={e => set("firmCity", e.target.value)} />
        </Field>
        <Field variant="settings" label="STATE">
          <input className={inputCls} style={inputStyle} value={settings.firmState} onChange={e => set("firmState", e.target.value)} placeholder="CA" />
        </Field>
        <Field variant="settings" label="ZIP">
          <input className={inputCls} style={inputStyle} value={settings.firmZip} onChange={e => set("firmZip", e.target.value)} />
        </Field>
      </div>

      <SectionHeading variant="settings">BAR & CREDENTIALS</SectionHeading>
      <div className="grid grid-cols-2 gap-x-4">
        <Field variant="settings" label="BAR NUMBER" tooltip="Your state bar admission number">
          <input className={inputCls} style={inputStyle} value={settings.barNumber} onChange={e => set("barNumber", e.target.value)} />
        </Field>
        <Field variant="settings" label="BAR JURISDICTION">
          <input className={inputCls} style={inputStyle} value={settings.barJurisdiction} onChange={e => set("barJurisdiction", e.target.value)} placeholder="State Bar of California" />
        </Field>
      </div>

      <Field variant="settings" label="PRACTICE AREAS" tooltip="Select all areas your firm practices">
        <div className="flex flex-wrap gap-2 mt-1">
          {PRACTICE_AREAS.map(area => {
            const selected = (settings.practiceAreas ?? []).includes(area);
            return (
              <button
                key={area}
                onClick={() => {
                  const next = selected
                    ? settings.practiceAreas.filter((a: string) => a !== area)
                    : [...settings.practiceAreas, area];
                  set("practiceAreas", next);
                }}
                className="px-3 py-1.5 rounded text-xs font-mono tracking-wide cursor-pointer transition-all duration-150"
                style={{
                  background: selected ? "rgba(0,255,195,0.06)" : "var(--bg-raised)",
                  border: `0.5px solid ${selected ? "rgba(0,255,195,0.28)" : "var(--border-hair)"}`,
                  color: selected ? "var(--verdict-neon)" : "var(--fg-tertiary)",
                }}
              >
                {area}
              </button>
            );
          })}
        </div>
      </Field>

      <Field variant="settings" label="LETTERHEAD TEXT" tooltip="Appears on generated documents">
        <textarea
          className={inputCls}
          style={{ ...inputStyle, resize: "none", minHeight: 80 }}
          value={settings.letterheadText}
          onChange={e => set("letterheadText", e.target.value)}
          placeholder="e.g., Attorneys at Law · Serving Since 1998"
        />
      </Field>

      <Field variant="settings" label="LETTERHEAD LAYOUT" tooltip="Controls how logo and firm info appear on exported documents">
        <div className="flex gap-2 mt-1">
          {(["left", "center", "text"] as const).map(layout => {
            const labels = { left: "Logo Left", center: "Logo Center", text: "Text Only" };
            const active = (settings.letterheadLayout ?? "left") === layout;
            return (
              <button
                key={layout}
                onClick={() => set("letterheadLayout", layout)}
                className="px-3 py-1.5 rounded text-xs font-mono tracking-wide cursor-pointer transition-all duration-150"
                style={{
                  background: active ? "rgba(0,255,195,0.06)" : "var(--bg-raised)",
                  border: `0.5px solid ${active ? "rgba(0,255,195,0.28)" : "var(--border-hair)"}`,
                  color: active ? "var(--verdict-neon)" : "var(--fg-tertiary)",
                }}
              >
                {labels[layout]}
              </button>
            );
          })}
        </div>
      </Field>

      {(settings.firmName || settings.firmLogo) && (
        <div className="mb-4">
          <label className="font-mono text-[11px] tracking-wider mb-2 block" style={{ color: "var(--fg-tertiary)" }}>LETTERHEAD PREVIEW</label>
          <div
            className="rounded p-4"
            style={{ background: "#fff", border: "0.5px solid rgba(224,224,224,0.18)" }}
          >
            <Letterhead settings={settings} />
            <div className="mt-3" style={{ borderTop: "0.5px solid #e5e5e5", paddingTop: 12 }}>
              <div style={{ height: 8, background: "#e5e5e5", borderRadius: 2, width: "60%", marginBottom: 6 }} />
              <div style={{ height: 8, background: "#e5e5e5", borderRadius: 2, width: "80%", marginBottom: 6 }} />
              <div style={{ height: 8, background: "#e5e5e5", borderRadius: 2, width: "45%" }} />
            </div>
          </div>
        </div>
      )}

      <SectionHeading variant="settings">BILLING</SectionHeading>
      <Field variant="settings" label="DEFAULT HOURLY RATE ($)" tooltip="Used to calculate invoice totals in the Billing tab">
        <input
          className={inputCls}
          style={inputStyle}
          type="number"
          min="0"
          step="5"
          value={settings.hourlyRate ?? 350}
          onChange={e => set("hourlyRate", parseFloat(e.target.value) || 0)}
          placeholder="350"
        />
      </Field>
    </div>
  );
}
