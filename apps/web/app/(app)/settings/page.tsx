"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/providers/settings-provider";
import { supabase } from "@/lib/supabase";
import { FirmProfileTab } from "@/components/settings/FirmProfileTab";
import { TeamsTab } from "@/components/settings/TeamsTab";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { SettingsBillingTab } from "@/components/settings/SettingsBillingTab";
import { ApiKeyTab } from "@/components/settings/ApiKeyTab";
import { UiTab } from "@/components/settings/UiTab";
import { ModelTab } from "@/components/settings/ModelTab";
import { ShieldTab } from "@/components/settings/ShieldTab";
import { PromptTab } from "@/components/settings/PromptTab";
import { PacerTab } from "@/components/settings/PacerTab";
import { SecurityTab } from "@/components/settings/SecurityTab";
import {
  CreditCard, User, Palette, Cpu, ShieldCheck, FileText, Key, Building2, UsersRound, Lock, Scale,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface UserRole { plan_id: string; byok_active: boolean; byok_key?: string | null; }
interface Plan { id: string; name: string; usd_budget: number; }
interface UsageEvent { tool_name: string; model: string; usd_cost: number; created_at: string; }

type Tab = "profile" | "billing" | "api-key" | "ui" | "model" | "shield" | "prompt" | "firm" | "teams" | "security" | "pacer";

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "profile",  icon: User,        label: "Profile & Usage"     },
  { id: "billing",  icon: CreditCard,  label: "Billing & Plan"      },
  { id: "firm",     icon: Building2,   label: "Firm Profile"        },
  { id: "teams",    icon: UsersRound,  label: "Teams"               },
  { id: "api-key",  icon: Key,         label: "API Key (BYOK)"      },
  { id: "prompt",   icon: FileText,    label: "System Prompt"       },
  { id: "security", icon: Lock,        label: "Security"            },
  { id: "pacer",    icon: Scale,       label: "PACER"               },
  { id: "ui",       icon: Palette,     label: "UI Preferences"      },
  { id: "model",    icon: Cpu,         label: "Model & AI"          },
  { id: "shield",   icon: ShieldCheck, label: "Hallucination Shield" },
];

const ADMIN_ONLY_TABS: Tab[] = ["api-key", "prompt", "teams"];

/* ── Inner component ────────────────────────────────────────────────────── */
function SettingsInner() {
  const { user, isAdmin } = useAuth();
  const { settings, saveSettings } = useSettings();
  const searchParams = useSearchParams();

  const visibleTabs = TABS.filter(t => isAdmin || !ADMIN_ONLY_TABS.includes(t.id));
  const initialTabParam = (searchParams.get("tab") as Tab | null) ?? "profile";
  const initialTab: Tab = (!isAdmin && ADMIN_ONLY_TABS.includes(initialTabParam)) ? "profile" : initialTabParam;

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [role, setRole] = useState<UserRole | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase.from("user_roles").select("plan_id, byok_active, byok_key").eq("user_id", user.id).single(),
      supabase.from("usage_events").select("tool_name, model, usd_cost, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]).then(([roleRes, usageRes]) => {
      if (roleRes.data) {
        setRole(roleRes.data as UserRole);
        supabase.from("plans").select("id, name, usd_budget, credits_monthly").eq("id", roleRes.data.plan_id).single().then(p => {
          if (p.data) setPlan(p.data as any);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
      if (usageRes.data) setEvents(usageRes.data as UsageEvent[]);
    });
  }, [user]);

  const onSave = async () => {
    await saveSettings(settings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const userInitials = user?.email?.split("@")[0].slice(0, 2).toUpperCase() ?? "??";

  const renderContent = () => {
    if (!user) return null;
    switch (activeTab) {
      case "profile":  return <ProfileTab user={user as any} role={role} events={events} loading={loading} />;
      case "billing":  return <SettingsBillingTab role={role} plan={plan} loading={loading} />;
      case "firm":     return <FirmProfileTab isAdmin={isAdmin} />;
      case "teams":    return <TeamsTab isAdmin={isAdmin} />;
      case "api-key":  return <ApiKeyTab user={user as any} loading={loading} />;
      case "security": return user?.id ? <SecurityTab userId={user.id} /> : null;
      case "ui":       return <UiTab />;
      case "model":    return <ModelTab />;
      case "shield":   return <ShieldTab />;
      case "pacer":    return user?.id ? <PacerTab userId={user.id} /> : null;
      case "prompt":   return isAdmin ? <PromptTab /> : null;
    }
  };

  const needsSave = ["ui", "model", "shield", "prompt"].includes(activeTab);

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: "32px 32px 48px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Page header */}
        <div className="fade-in flex items-start gap-5 mb-10">
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(0,255,195,0.18), rgba(106,0,255,0.18))",
              border: "0.5px solid rgba(0,255,195,0.3)",
              boxShadow: "0 0 20px rgba(0,255,195,0.1)",
              fontFamily: "var(--font-serif)",
              fontSize: 22, fontWeight: 400,
              color: "var(--verdict-neon)",
            }}
          >
            {userInitials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="lex-page-eyebrow">Configuration</p>
            <h1 className="lex-page-title">Settings</h1>
            <p className="lex-page-subtitle" style={{ marginTop: 6 }}>
              {user?.email}
              {role?.byok_active && (
                <span className="inline-flex items-center ml-3 font-mono text-[9px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(0,255,195,0.08)", border: "0.5px solid rgba(0,255,195,0.3)", color: "var(--verdict-neon)", verticalAlign: "middle" }}>
                  BYOK
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-8">
          <nav className="flex-shrink-0 fade-in-d1" style={{ width: 200 }}>
            <div className="space-y-0.5">
              {visibleTabs.map(({ id, icon: Icon, label }, i) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`lex-nav-item${activeTab === id ? " is-active" : ""}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <Icon size={14} className="lex-nav-item__icon" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="flex-1 min-w-0 fade-in-d2">
            <div className="rounded-xl" style={{ background: "rgba(14,14,18,0.85)", border: "0.5px solid rgba(224,224,224,0.09)", padding: "28px 28px 24px" }}>
              {renderContent()}

              {needsSave && (
                <div className="flex justify-end mt-8 pt-5" style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
                  <button onClick={onSave} className={`lex-btn ${settingsSaved ? "lex-btn--secondary" : "lex-btn--primary"}`}>
                    {settingsSaved ? "Saved ✓" : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}
