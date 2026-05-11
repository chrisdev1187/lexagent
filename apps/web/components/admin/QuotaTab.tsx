"use client";

import { useQuota } from "@/hooks/useQuota";
import { useMyTokenUsage, useAdminTokenUsage } from "@/hooks/useTokenUsage";
import { useAuth } from "@/lib/auth";
import { storagePercent, aiPercent, matterPercent } from "@/lib/quota";
import { SectionHeading } from "@/components/shared/AdminSettingsShared";

function QuotaBar({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  const color = pct >= 100 ? "var(--verdict-crimson)" : pct >= 80 ? "var(--verdict-amber)" : "var(--verdict-neon)";
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: "var(--fg-primary)" }}>{label}</span>
        <span className="text-xs font-mono" style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-raised)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--fg-tertiary)" }}>{detail}</p>
    </div>
  );
}

function TokenBarSimple({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-xs w-24 flex-shrink-0" style={{ color: "var(--fg-tertiary)" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-raised)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-16 text-right" style={{ color: "var(--fg-secondary)" }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

export function QuotaTab() {
  const { quota, loading: quotaLoading } = useQuota();
  const { data: myUsage, loading: usageLoading, total, memTotal, efficiency } = useMyTokenUsage();
  const { isAdmin } = useAuth();
  const { users: adminUsers, trend, loading: adminLoading, grandTotal, avgEfficiency } = useAdminTokenUsage();

  if (quotaLoading) return <p style={{ color: "var(--fg-tertiary)" }}>Loading…</p>;
  if (!quota) return <p style={{ color: "var(--fg-tertiary)" }}>Unable to load quota data.</p>;

  const storageMB = (quota.storage_bytes / (1024 * 1024)).toFixed(1);
  const storageLimitMB = quota.storage_limit_mb ? `${quota.storage_limit_mb} MB` : "Unlimited";
  const tabMax = myUsage.length > 0 ? Math.max(...myUsage.map(r => r.input_tok + r.output_tok)) : 1;

  return (
    <div className="space-y-6">
      {/* Plan quota */}
      <div>
        <SectionHeading>PLAN QUOTA</SectionHeading>
        <div className="rounded p-5" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          <QuotaBar label="Matters" pct={matterPercent(quota)} detail={`${quota.matter_count} / ${quota.matter_limit ?? "Unlimited"} matters`} />
          <QuotaBar label="AI Budget" pct={aiPercent(quota)} detail={`$${quota.ai_spent.toFixed(4)} spent of $${quota.ai_budget} · ${quota.ai_requests} requests this month`} />
          <QuotaBar label="Storage" pct={storagePercent(quota)} detail={`${storageMB} MB used of ${storageLimitMB}`} />
        </div>
        <div className="rounded p-3 mt-2 text-xs font-mono" style={{ background: "var(--bg-raised)", color: "var(--fg-tertiary)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
          Plan: <span style={{ color: "var(--verdict-neon)" }}>{quota.plan_id}</span>
        </div>
      </div>

      {/* My token usage this month */}
      <div>
        <SectionHeading>MY TOKEN USAGE (THIS MONTH)</SectionHeading>
        {usageLoading ? (
          <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
        ) : (
          <div className="rounded p-5" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <p className="text-lg font-mono font-semibold" style={{ color: "var(--verdict-neon)" }}>{total.toLocaleString()}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>Total tokens</p>
              </div>
              <div>
                <p className="text-lg font-mono font-semibold" style={{ color: "var(--verdict-amber)" }}>{memTotal.toLocaleString()}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>LexMemory injected</p>
              </div>
              <div>
                <p className="text-lg font-mono font-semibold" style={{ color: efficiency > 15 ? "var(--verdict-neon)" : "var(--fg-secondary)" }}>{efficiency}%</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fg-tertiary)" }}>Memory efficiency</p>
              </div>
            </div>
            {myUsage.length > 0 && (
              <div className="pt-3" style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                <p className="text-xs mb-2 font-mono tracking-wide" style={{ color: "var(--fg-tertiary)" }}>TOKENS BY TAB</p>
                {myUsage.map(r => (
                  <TokenBarSimple
                    key={r.tab}
                    label={r.tab}
                    value={r.input_tok + r.output_tok}
                    max={tabMax}
                    color="var(--verdict-neon)"
                  />
                ))}
              </div>
            )}
            {myUsage.length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: "var(--fg-quaternary)" }}>No AI calls logged this month yet</p>
            )}
          </div>
        )}
      </div>

      {/* Admin section */}
      {isAdmin && (
        <div>
          <SectionHeading>ADMIN — ALL USERS (THIS MONTH)</SectionHeading>
          {adminLoading ? (
            <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Loading…</p>
          ) : (
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="rounded p-4 grid grid-cols-2 gap-4" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                <div>
                  <p className="text-sm font-mono font-semibold" style={{ color: "var(--verdict-neon)" }}>{grandTotal.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Platform total tokens</p>
                </div>
                <div>
                  <p className="text-sm font-mono font-semibold" style={{ color: "var(--verdict-amber)" }}>{avgEfficiency}%</p>
                  <p className="text-xs" style={{ color: "var(--fg-tertiary)" }}>Avg LexMemory efficiency</p>
                </div>
              </div>

              {/* Top users table */}
              {adminUsers.length > 0 && (
                <div className="rounded overflow-hidden" style={{ border: "0.5px solid rgba(224,224,224,0.09)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "var(--bg-raised)" }}>
                        {["User", "Input", "Output", "Mem%", "Calls"].map(h => (
                          <th key={h} className="text-left px-3 py-2 font-mono tracking-wide" style={{ color: "var(--fg-tertiary)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.user_id} style={{ borderTop: "0.5px solid rgba(224,224,224,0.06)" }}>
                          <td className="px-3 py-2 truncate max-w-[140px]" style={{ color: "var(--fg-secondary)" }}>{u.email}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--fg-primary)" }}>{u.input_tok.toLocaleString()}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--fg-primary)" }}>{u.output_tok.toLocaleString()}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: u.efficiency > 15 ? "var(--verdict-neon)" : "var(--fg-tertiary)" }}>{u.efficiency}%</td>
                          <td className="px-3 py-2 font-mono" style={{ color: "var(--fg-tertiary)" }}>{u.calls}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Daily trend */}
              {trend.length > 0 && (
                <div className="rounded p-4" style={{ background: "var(--bg-raised)", border: "0.5px solid rgba(224,224,224,0.09)" }}>
                  <p className="text-xs mb-3 font-mono tracking-wide" style={{ color: "var(--fg-tertiary)" }}>DAILY TREND (7 DAYS)</p>
                  <div className="flex items-end gap-1 h-12">
                    {(() => {
                      const maxVal = Math.max(...trend.map(d => d.input_tok + d.output_tok), 1);
                      return trend.map(d => {
                        const total = d.input_tok + d.output_tok;
                        const pct = Math.max(4, Math.round((total / maxVal) * 100));
                        return (
                          <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${total.toLocaleString()} tokens`}>
                            <div className="w-full rounded-t" style={{ height: `${pct}%`, background: "var(--verdict-neon)", opacity: 0.7 }} />
                            <span className="text-[9px] font-mono" style={{ color: "var(--fg-quaternary)" }}>{d.day.slice(5)}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {adminUsers.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: "var(--fg-quaternary)" }}>No AI usage logged this month yet</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
