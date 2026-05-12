"use client";

import { useState } from "react";
import { Building2, Users, Target, ArrowRight, CheckCircle2, Upload, Scale } from "lucide-react";
import { useSettings } from "@/providers/settings-provider";
import { PRACTICE_AREAS } from "@/lib/settings";

interface FirmOnboardingProps {
  onComplete: () => void;
}

export function FirmOnboarding({ onComplete }: FirmOnboardingProps) {
  const { settings, updateSettings } = useSettings();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const update = (patch: any) => {
    updateSettings(patch);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[var(--midnight-deep)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">

        {/* Progress Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--verdict-neon)]/10 border border-[var(--verdict-neon)]/20 flex items-center justify-center">
              <Building2 size={20} className="text-[var(--verdict-neon)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--fg-primary)]">Firm Setup</h2>
              <p className="text-xs text-[var(--fg-quaternary)] font-mono uppercase tracking-widest">Step {step} of 3</p>
            </div>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1 w-8 rounded-full transition-all ${i <= step ? "bg-[var(--verdict-neon)]" : "bg-white/10"}`} />
            ))}
          </div>
        </div>

        <div className="p-10 flex-1">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <h3 className="text-xl font-serif italic text-[var(--fg-primary)]">Identify your practice</h3>
                <p className="text-sm text-[var(--fg-tertiary)]">Your firm name and logo will appear on AI-generated drafts and engagement letters.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--verdict-neon)]/40 transition-all group relative overflow-hidden">
                    {settings.firmLogo ? (
                      <img src={settings.firmLogo} className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <Upload size={20} className="text-[var(--fg-quaternary)] group-hover:text-[var(--verdict-neon)] mb-2" />
                        <span className="text-[9px] font-mono text-[var(--fg-quaternary)] uppercase">Logo</span>
                      </>
                    )}
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => update({ firmLogo: reader.result as string });
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-[var(--fg-quaternary)]">Firm Name</label>
                      <input
                        className="lex-input w-full"
                        placeholder="Acme Law Group"
                        value={settings.firmName}
                        onChange={e => update({ firmName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-[var(--fg-quaternary)]">Bar Jurisdiction</label>
                      <input
                        className="lex-input w-full"
                        placeholder="State Bar of California"
                        value={settings.barJurisdiction}
                        onChange={e => update({ barJurisdiction: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="space-y-2">
                <h3 className="text-xl font-serif italic text-[var(--fg-primary)]">Select expertise</h3>
                <p className="text-sm text-[var(--fg-tertiary)]">This helps ARES calibrate its research models for your specific areas of law.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRACTICE_AREAS.map(area => {
                  const selected = (settings.practiceAreas || []).includes(area);
                  return (
                    <button
                      key={area}
                      onClick={() => {
                        const next = selected
                          ? settings.practiceAreas.filter(a => a !== area)
                          : [...(settings.practiceAreas || []), area];
                        update({ practiceAreas: next });
                      }}
                      className={`px-4 py-2.5 rounded-xl border text-[11px] font-mono text-left transition-all ${selected ? "bg-[var(--verdict-neon)]/10 border-[var(--verdict-neon)] text-[var(--verdict-neon)] shadow-[0_0_15px_rgba(0,255,195,0.1)]" : "bg-white/5 border-white/10 text-[var(--fg-tertiary)] hover:border-white/20"}`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300 text-center py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[var(--verdict-neon)]/10 border border-[var(--verdict-neon)]/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,195,0.2)]">
                  <CheckCircle2 size={32} className="text-[var(--verdict-neon)]" />
                </div>
                <h3 className="text-2xl font-serif italic text-[var(--fg-primary)]">Workspace Ready</h3>
                <p className="text-sm text-[var(--fg-tertiary)] max-w-md mx-auto">
                  Your firm profile is configured. You can now invite your team and begin managing your first legal matter.
                </p>
              </div>

              <div className="max-w-sm mx-auto p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Users size={14} className="text-[var(--fg-quaternary)]" /></div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--fg-primary)]">Invite Colleagues</p>
                    <p className="text-[10px] text-[var(--fg-quaternary)]">Add attorneys or paralegals</p>
                  </div>
                  <button className="lex-btn lex-btn--ghost ml-auto text-[9px] py-1">INVITE</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/5 flex items-center justify-between bg-black/20">
          {step > 1 ? (
            <button onClick={back} className="lex-btn lex-btn--ghost px-6">Back</button>
          ) : <div />}

          <button
            onClick={step === 3 ? onComplete : next}
            disabled={step === 1 && !settings.firmName}
            className="lex-btn lex-btn--primary px-8 min-w-[140px] justify-center"
          >
            {step === 3 ? "Enter Workspace" : "Continue"}
            <ArrowRight size={14} className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
