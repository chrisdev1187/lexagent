"use client";

import { useState } from "react";
import {
  Building2, Palette, Key, Cpu, ShieldCheck, FileText, Activity, Users,
  CreditCard, UsersRound, ClipboardList, BarChart3, Brain, Radio, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AdminBillingTab } from "@/components/admin/AdminBillingTab";
import { useSettings } from "@/providers/settings-provider";
import { SectionHeading, Field } from "@/components/shared/AdminSettingsShared";
import { UserManagementTab } from "@/components/admin/UserManagementTab";
import { AuditLogTab } from "@/components/admin/AuditLogTab";
import { QuotaTab } from "@/components/admin/QuotaTab";
import { TelemetryTab } from "@/components/admin/TelemetryTab";
import { AresTab } from "@/components/admin/AresTab";
import { LiveFeedTab } from "@/components/admin/LiveFeedTab";
import { FeedbackAdminTab } from "@/components/admin/FeedbackAdminTab";
import { AdminUiTab } from "@/components/admin/AdminUiTab";
import { AdminApiKeysTab } from "@/components/admin/AdminApiKeysTab";
import { AdminModelTab } from "@/components/admin/AdminModelTab";
import { AdminShieldTab } from "@/components/admin/AdminShieldTab";
import { AdminPromptTab } from "@/components/admin/AdminPromptTab";

type TabKey = "firm" | "ui" | "apikeys" | "model" | "shield" | "prompt" | "telemetry" | "users" | "billing" | "teams" | "auditlog" | "quota" | "ares" | "livefeed" | "feedback";

const ADMIN_TABS: { id: TabKey; icon: React.ElementType; label: string }[] = [
  { id: "firm",      icon: Building2,   label: "Firm Profile"    },
  { id: "billing",   icon: CreditCard,  label: "Billing & Plan"  },
  { id: "ui",        icon: Palette,     label: "UI Preferences"  },
  { id: "apikeys",   icon: Key,         label: "API Keys"        },
  { id: "model",     icon: Cpu,         label: "Model & AI"      },
  { id: "shield",    icon: ShieldCheck, label: "Hallucination Shield" },
  { id: "prompt",    icon: FileText,    label: "System Prompt"   },
  { id: "telemetry", icon: Activity,    label: "Telemetry"       },
  { id: "ares",      icon: Brain,        label: "ARES Inspector" },
  { id: "livefeed",  icon: Radio,       label: "Live Feed"       },
  { id: "teams",     icon: UsersRound,  label: "Teams"           },
  { id: "users",     icon: Users,       label: "User Management" },
  { id: "auditlog",  icon: ClipboardList, label: "Audit Log"     },
  { id: "quota",     icon: BarChart3,    label: "Quota & Usage"  },
  { id: "feedback",  icon: MessageSquare, label: "Feedback"      },
];

const ADMIN_ONLY_TABS: TabKey[] = ["apikeys", "prompt", "telemetry", "ares", "livefeed", "users", "teams", "auditlog", "feedback"];

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const { settings, saveSettings } = useSettings();
  const [tab, setTab] = useState<TabKey>("firm");
  const [saved, setSaved] = useState(false);
  const save = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderTab = () => {
    switch (tab) {
      case "firm":
        return (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <Building2 size={32} style={{ color: "var(--verdict-neon)", opacity: 0.6 }} />
            <div>
              <p className="font-mono text-[11px] tracking-widest mb-2" style={{ color: "var(--fg-tertiary)" }}>MOVED</p>
              <p className="text-sm mb-4" style={{ color: "var(--fg-secondary)" }}>
                Firm Profile has moved to <strong style={{ color: "var(--fg-primary)" }}>Settings → Firm Profile</strong>.
              </p>
              <a href="/settings?tab=firm" className="lex-btn lex-btn--primary text-xs">
                Go to Firm Profile
              </a>
            </div>
          </div>
        );

      case "ui":
        return <AdminUiTab />;

      case "apikeys":
        return <AdminApiKeysTab />;

      case "model":
        return <AdminModelTab />;

      case "shield":
        return <AdminShieldTab />;

      case "prompt":
        return <AdminPromptTab />;

      case "billing":
        return <AdminBillingTab />;

      case "teams":
        return (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <UsersRound size={32} style={{ color: "var(--verdict-neon)", opacity: 0.6 }} />
            <div>
              <p className="font-mono text-[11px] tracking-widest mb-2" style={{ color: "var(--fg-tertiary)" }}>MOVED</p>
              <p className="text-sm mb-4" style={{ color: "var(--fg-secondary)" }}>
                Teams management has moved to <strong style={{ color: "var(--fg-primary)" }}>Settings → Teams</strong>.
              </p>
              <a href="/settings?tab=teams" className="lex-btn lex-btn--primary text-xs">
                Go to Teams
              </a>
            </div>
          </div>
        );

      case "users":
        return <UserManagementTab />;

      case "auditlog":
        return <AuditLogTab />;

      case "quota":
        return <QuotaTab />;

      case "telemetry":
        return <TelemetryTab />;

      case "ares":
        return <AresTab />;

      case "livefeed":
        return <LiveFeedTab />;

      case "feedback":
        return <FeedbackAdminTab />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="fade-in mb-10">
        <p className="lex-page-eyebrow">Administration</p>
        <h1 className="lex-page-title">Firm Settings</h1>
        <p className="lex-page-subtitle">Firm profile, API keys, and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="fade-in-d1 w-48 flex-shrink-0 space-y-0.5">
          {ADMIN_TABS.filter(t => isAdmin || !ADMIN_ONLY_TABS.includes(t.id)).map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`lex-nav-item${active ? " is-active" : ""}`}
              >
                <Icon size={14} className="lex-nav-item__icon" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="fade-in-d2 flex-1 min-w-0">
          <div
            className="rounded-xl"
            style={{ background: "rgba(17,17,20,0.7)", border: "0.5px solid rgba(224,224,224,0.09)", padding: 28 }}
          >
            {renderTab()}

            <div className="flex justify-end mt-6 pt-4" style={{ borderTop: "0.5px solid rgba(224,224,224,0.08)" }}>
              <button
                onClick={save}
                className={`lex-btn ${saved ? "lex-btn--secondary" : "lex-btn--primary"}`}
              >
                {saved ? "Saved" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
