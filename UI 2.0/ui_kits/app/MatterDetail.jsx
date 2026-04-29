// MatterDetail.jsx — Per-matter view with Research, Vault, Strategy, etc.

const TABS = [
  { id: 'research',  label: 'Research'   },
  { id: 'vault',     label: 'Vault'      },
  { id: 'strategy',  label: 'Strategy'   },
  { id: 'judge',     label: 'Judge Intel' },
  { id: 'deadlines', label: 'Deadlines'  },
  { id: 'timeline',  label: 'Timeline'   },
  { id: 'shield',    label: 'Shield'     },
  { id: 'draft',     label: 'Draft'      },
  { id: 'evidence',  label: 'Evidence'   },
  { id: 'conflict',  label: 'Conflict'   },
];

const CITATIONS = [
  { id: 'c1', text: 'Brown v. Board of Education, 347 U.S. 483 (1954)', kind: 'verified',     tag: '[DB]' },
  { id: 'c2', text: 'Miranda v. Arizona, 384 U.S. 436 (1966)',           kind: 'verified',     tag: '[DB]' },
  { id: 'c3', text: 'Roe v. Wade, 410 U.S. 113 (1973)',                  kind: 'unconfirmed',  tag: '[WEB]' },
  { id: 'c4', text: 'Nocturne LLC v. Cipher Corp., N.D. Cal. 2024',      kind: 'notfound',     tag: '[MEM]' },
];

const CITE_STYLE = {
  verified:    { color: 'var(--verdict-neon)',    bg: 'rgba(0,255,195,0.06)',   border: 'rgba(0,255,195,0.25)'  },
  unconfirmed: { color: 'var(--verdict-amber)',   bg: 'rgba(255,184,0,0.06)',   border: 'rgba(255,184,0,0.30)'  },
  notfound:    { color: 'var(--verdict-crimson)', bg: 'rgba(255,51,85,0.06)',   border: 'rgba(255,51,85,0.25)'  },
};

// ── Research Panel ──────────────────────────────────────────────────────────
const ResearchPanel = () => {
  const [messages, setMessages] = React.useState([
    { role: 'assistant', content: 'ARES is ready. Submit a research query — databases have been pre-fetched and indexed against this matter.', ts: '14:31 PDT' },
    { role: 'user',      content: 'What is the standard for proving breach of fiduciary duty in a data breach case under SDNY precedent?', ts: '14:32 PDT' },
    { role: 'assistant', content: 'Under SDNY precedent, breach of fiduciary duty in a data-breach context requires establishing four elements: (1) the existence of a fiduciary relationship; (2) breach of the duty arising from that relationship; (3) damages; and (4) causation. See Pension Committee of University of Montreal Pension Plan v. Banc of America Securities, 591 F.Supp.2d 586 (S.D.N.Y. 2008).', ts: '14:32 PDT', citations: [CITATIONS[0], CITATIONS[1]] },
  ]);
  const [input, setInput] = React.useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages(m => [...m, { role: 'user', content: input, ts: '14:33 PDT' }]);
    setInput('');
    setTimeout(() => setMessages(m => [...m, { role: 'assistant', content: 'Retrieving relevant authorities from CourtListener, GovInfo, and eCFR…', ts: '14:33 PDT', loading: true }]), 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* RAG status bar */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 20px', borderBottom: '0.5px solid rgba(224,224,224,0.08)', flexShrink: 0, flexWrap: 'wrap' }}>
        {['CourtListener', 'GovInfo', 'eCFR', 'EDGAR', 'USPTO'].map(db => (
          <span key={db} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: 'rgba(0,255,195,0.06)', border: '0.5px solid rgba(0,255,195,0.20)', color: 'var(--verdict-neon)' }}>
            ✓ {db}
          </span>
        ))}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-quaternary)', marginLeft: 'auto', alignSelf: 'center' }}>Hallucination Shield · Active</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {msg.role === 'assistant' && <MicroLabel neon>ARES</MicroLabel>}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-quaternary)' }}>{msg.ts}</span>
              {msg.role === 'user' && <MicroLabel>You</MicroLabel>}
            </div>
            <div style={{
              maxWidth: '78%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '6px 6px 2px 6px' : '6px 6px 6px 2px',
              background: msg.role === 'user' ? 'rgba(0,255,195,0.08)' : 'var(--bg-raised)',
              border: `0.5px solid ${msg.role === 'user' ? 'rgba(0,255,195,0.25)' : 'rgba(224,224,224,0.08)'}`,
              fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.65, color: 'var(--fg-secondary)',
            }}>
              {msg.loading ? <span style={{ color: 'var(--verdict-neon)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Retrieving…▌</span> : msg.content}
            </div>
            {msg.citations && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '78%' }}>
                {msg.citations.map(c => {
                  const cs = CITE_STYLE[c.kind];
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 6px', borderRadius: 2, background: cs.bg, border: `0.5px solid ${cs.border}`, color: cs.color }}>{c.tag} {c.kind.toUpperCase()}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-tertiary)' }}>{c.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Compose */}
      <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(224,224,224,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Research query — Enter to submit, Shift+Enter for new line"
            rows={2} style={{
              flex: 1, resize: 'none', padding: '10px 12px',
              background: 'rgba(17,17,20,0.7)', border: '0.5px solid rgba(224,224,224,0.10)',
              borderRadius: 4, color: 'var(--fg-primary)', outline: 'none',
              fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.55,
            }} />
          <LexBtn variant="primary" onClick={send} icon={<LexIcon name="send" size={13} color="currentColor" />}>
            Submit
          </LexBtn>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {['CourtListener', 'EDGAR', 'USPTO'].map(db => (
            <span key={db} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 2, background: 'rgba(224,224,224,0.03)', border: '0.5px solid rgba(224,224,224,0.08)', color: 'var(--fg-quaternary)', cursor: 'pointer' }}>{db}</span>
          ))}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-quaternary)', marginLeft: 'auto', alignSelf: 'center' }}>⌘K — command palette</span>
        </div>
      </div>
    </div>
  );
};

// ── Shield Panel ────────────────────────────────────────────────────────────
const ShieldPanel = () => (
  <div style={{ padding: '20px 20px', overflowY: 'auto' }}>
    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <MicroLabel neon style={{ display: 'block', marginBottom: 4 }}>Hallucination Shield</MicroLabel>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-tertiary)', margin: 0 }}>Every citation verified against CourtListener in real-time.</p>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <StatusChip kind="neon">2 Verified</StatusChip>
        <StatusChip kind="amber">1 Unconfirmed</StatusChip>
        <StatusChip kind="crimson">1 Not Found</StatusChip>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {CITATIONS.map(c => {
        const cs = CITE_STYLE[c.kind];
        return (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-raised)', border: `0.5px solid rgba(224,224,224,0.08)`, borderRadius: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 7px', borderRadius: 2, background: cs.bg, border: `0.5px solid ${cs.border}`, color: cs.color, flexShrink: 0 }}>{c.tag} {c.kind.toUpperCase()}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-secondary)', flex: 1 }}>{c.text}</span>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Deadlines Panel ─────────────────────────────────────────────────────────
const DeadlinesPanel = () => {
  const deadlines = [
    { id: 'd1', label: 'Motion to Compel — Response due',   date: '2026-04-28', kind: 'crimson', days: 4  },
    { id: 'd2', label: 'Discovery cutoff',                  date: '2026-05-12', kind: 'amber',   days: 18 },
    { id: 'd3', label: 'Pre-trial conference',              date: '2026-06-01', kind: 'neutral',  days: 38 },
    { id: 'd4', label: 'Trial date',                        date: '2026-07-15', kind: 'neutral',  days: 82 },
  ];
  return (
    <div style={{ padding: '20px', overflowY: 'auto' }}>
      <MicroLabel neon style={{ display: 'block', marginBottom: 14 }}>Upcoming Deadlines</MicroLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {deadlines.map(d => {
          const kindMap = { crimson: 'var(--verdict-crimson)', amber: 'var(--verdict-amber)', neutral: 'var(--fg-tertiary)' };
          const color = kindMap[d.kind];
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-raised)', border: `0.5px solid rgba(224,224,224,0.08)`, borderRadius: 4 }}>
              <div style={{ width: 3, height: 32, borderRadius: 2, background: color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-primary)', marginBottom: 2 }}>{d.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-quaternary)' }}>{d.date}</div>
              </div>
              <StatusChip kind={d.kind === 'neutral' ? 'neutral' : d.kind === 'amber' ? 'amber' : 'crimson'}>{d.days}d</StatusChip>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Placeholder Panel ───────────────────────────────────────────────────────
const PlaceholderPanel = ({ label }) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 40 }}>
    <div style={{ width: 48, height: 48, borderRadius: 6, background: 'rgba(0,255,195,0.06)', border: '0.5px solid rgba(0,255,195,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LexIcon name="file" size={20} color="var(--verdict-neon)" />
    </div>
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-quaternary)', margin: 0 }}>{label} — No data</p>
    <LexBtn variant="secondary" small>Add entry</LexBtn>
  </div>
);

// ── Matter Detail ───────────────────────────────────────────────────────────
const MatterDetail = ({ matterId, onBack }) => {
  const [activeTab, setActiveTab] = React.useState('research');
  const matter = LEX_MATTERS.find(m => m.id === matterId) || LEX_MATTERS[0];

  const renderPanel = () => {
    switch (activeTab) {
      case 'research':  return <ResearchPanel />;
      case 'shield':    return <ShieldPanel />;
      case 'deadlines': return <DeadlinesPanel />;
      default:          return <PlaceholderPanel label={TABS.find(t => t.id === activeTab)?.label || activeTab} />;
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {/* Matter header */}
      <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(224,224,224,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-quaternary)', display: 'flex', padding: 0 }}>
          <LexIcon name="chevronLeft" size={16} color="currentColor" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <MicroLabel>{matter.id}</MicroLabel>
            <StatusChip kind={STATUS_KIND[matter.status] || 'neutral'} dot>{matter.status}</StatusChip>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontStyle: 'italic', color: 'var(--fg-primary)', margin: 0, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{matter.title}</h2>
        </div>
        <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><LexIcon name="shield" size={13} color="var(--verdict-neon)" /><span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-tertiary)' }}>{matter.verified} verified</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><LexIcon name="clock" size={13} color="var(--fg-quaternary)" /><span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-tertiary)' }}>{matter.hours}h</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(224,224,224,0.08)', flexShrink: 0, overflowX: 'auto', padding: '0 8px' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: activeTab === tab.id ? 500 : 400,
            color: activeTab === tab.id ? 'var(--verdict-neon)' : 'var(--fg-tertiary)',
            borderBottom: `1.5px solid ${activeTab === tab.id ? 'var(--verdict-neon)' : 'transparent'}`,
            marginBottom: -0.5,
            transition: 'all 160ms',
            textShadow: activeTab === tab.id ? '0 0 8px rgba(0,255,195,0.3)' : 'none',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Panel */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {renderPanel()}
      </div>
    </div>
  );
};

window.MatterDetail = MatterDetail;
