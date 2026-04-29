// Atoms.jsx — Shared primitive components for Lex Protocol Console UI Kit
// Exports to window for cross-script use.

const MicroLabel = ({ children, neon, violet, amber, style, ...props }) => (
  <span {...props} style={{
    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '0.18em',
    color: neon ? 'var(--verdict-neon)' : violet ? 'var(--verdict-violet)' : amber ? 'var(--verdict-amber)' : 'var(--fg-tertiary)',
    textShadow: neon ? '0 0 8px rgba(0,255,195,0.35)' : violet ? '0 0 8px rgba(106,0,255,0.35)' : 'none',
    ...style,
  }}>{children}</span>
);

const StatusChip = ({ kind = 'neutral', dot, children }) => {
  const map = {
    neutral: { c: 'var(--fg-secondary)',    b: 'rgba(224,224,224,0.14)', bg: 'rgba(224,224,224,0.03)' },
    neon:    { c: 'var(--verdict-neon)',    b: 'rgba(0,255,195,0.45)',   bg: 'rgba(0,255,195,0.06)'   },
    violet:  { c: 'var(--verdict-violet)',  b: 'rgba(106,0,255,0.45)',   bg: 'rgba(106,0,255,0.06)'   },
    amber:   { c: 'var(--verdict-amber)',   b: 'rgba(255,184,0,0.45)',   bg: 'rgba(255,184,0,0.06)'   },
    crimson: { c: 'var(--verdict-crimson)', b: 'rgba(255,51,85,0.45)',   bg: 'rgba(255,51,85,0.06)'   },
  };
  const s = map[kind] || map.neutral;
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em',
      textTransform: 'uppercase', fontWeight: 500,
      color: s.c, border: `0.5px solid ${s.b}`, background: s.bg,
      padding: '3px 8px', borderRadius: 999,
      display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: 999, background: s.c, flexShrink: 0,
        boxShadow: (kind === 'neon' || kind === 'violet') ? `0 0 6px ${s.c}` : 'none' }} />}
      {children}
    </span>
  );
};

const LexBtn = ({ variant = 'primary', children, icon, onClick, style, disabled, small }) => {
  const sz = small ? { padding: '5px 10px', fontSize: 11 } : { padding: '8px 16px', fontSize: 13 };
  const vs = {
    primary: { background: 'var(--verdict-neon)', color: 'var(--midnight-court)', border: '0.5px solid var(--verdict-neon)', boxShadow: '0 0 14px rgba(0,255,195,0.40)', fontWeight: 600 },
    secondary: { background: 'transparent', color: 'var(--fg-primary)', border: '0.5px solid rgba(0,255,195,0.35)' },
    ghost: { background: 'transparent', color: 'var(--fg-secondary)', border: '0.5px solid transparent' },
    danger: { background: 'transparent', color: 'var(--verdict-crimson)', border: '0.5px solid rgba(255,51,85,0.4)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: 'var(--font-sans)', fontWeight: 500, borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 7,
      transition: 'all 160ms cubic-bezier(0.16,1,0.3,1)',
      opacity: disabled ? 0.4 : 1,
      letterSpacing: 0, ...sz, ...vs[variant], ...style,
    }}>
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};

const LexIcon = ({ name, size = 16, color = 'currentColor', style }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    scale: <><line x1="12" y1="3" x2="12" y2="21"/><line x1="6" y1="21" x2="18" y2="21"/><line x1="4" y1="7" x2="20" y2="7"/><path d="M4 7c0 0-2 2.5-2 5s2 4 2 4"/><path d="M20 7c0 0 2 2.5 2 5s-2 4-2 4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>,
    circle: <circle cx="12" cy="12" r="10"/>,
    send: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    messageSquare: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    play: <polygon points="5 3 19 12 5 21 5 3"/>,
    stop: <rect x="3" y="3" width="18" height="18" rx="2"/>,
    key: <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
    creditCard: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    cmd: <><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] || null}
    </svg>
  );
};

const Divider = ({ style }) => (
  <div style={{ height: '0.5px', background: 'rgba(224,224,224,0.08)', ...style }} />
);

// Shared fake data
const LEX_MATTERS = [
  { id: '4488-V-KT2', title: 'In re: Nocturne Data Breach',   client: 'Meridian Partners',    status: 'Active',   caseType: 'Litigation',    jurisdiction: 'SDNY', verified: 12, hours: 4.5, deadlines: 2 },
  { id: '4492-X-ND9', title: 'Ashford v. Cipher Holdings',     client: 'Kestrel & Sons',       status: 'Active',   caseType: 'IP Litigation', jurisdiction: '9th Cir', verified: 7, hours: 2.1, deadlines: 1 },
  { id: '4471-P-BG1', title: 'Meridian Trust Estate',          client: 'Meridian Family',      status: 'Pending',  caseType: 'Estate',        jurisdiction: 'Probate', verified: 3, hours: 1.2, deadlines: 0 },
  { id: '4462-C-LL4', title: 'Kestrel Labs v. OmniCore',       client: 'Kestrel Labs Inc.',    status: 'Urgent',   caseType: 'Patent',        jurisdiction: 'EDTX', verified: 0, hours: 0.5, deadlines: 3 },
  { id: '4449-B-XX8', title: 'Delphi Industries — M&A',        client: 'Delphi Industries',    status: 'Active',   caseType: 'Transactional', jurisdiction: 'SDNY', verified: 21, hours: 18.3, deadlines: 1 },
  { id: '4422-A-RR5', title: 'State v. Voss',                  client: 'Pro Bono',             status: 'Closed',   caseType: 'Criminal',      jurisdiction: '7th Cir', verified: 45, hours: 62.0, deadlines: 0 },
];

const STATUS_KIND = { Active: 'neon', Pending: 'amber', Urgent: 'crimson', Closed: 'neutral', Sealed: 'violet' };
const STATUS_DOT  = { Active: 'var(--verdict-neon)', Pending: 'var(--verdict-amber)', Urgent: 'var(--verdict-crimson)', Closed: 'var(--fg-tertiary)', Sealed: 'var(--verdict-violet)' };

Object.assign(window, { MicroLabel, StatusChip, LexBtn, LexIcon, Divider, LEX_MATTERS, STATUS_KIND, STATUS_DOT });
