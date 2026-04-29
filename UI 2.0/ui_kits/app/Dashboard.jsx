// Dashboard.jsx — Matter grid dashboard for Lex Protocol Console

const Dashboard = ({ onSelectMatter }) => {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('All');
  const [showModal, setShowModal] = React.useState(false);

  const filters = ['All', 'Active', 'Pending', 'Urgent', 'Closed'];

  const filtered = LEX_MATTERS.filter(m => {
    const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.client.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || m.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = [
    { icon: 'briefcase', label: 'Total Matters',      value: LEX_MATTERS.length,                                            color: 'var(--fg-secondary)' },
    { icon: 'shield',    label: 'Citations Verified',  value: LEX_MATTERS.reduce((a, m) => a + m.verified, 0),              color: 'var(--verdict-neon)' },
    { icon: 'alert',     label: 'Citations Flagged',   value: 0,                                                             color: 'var(--fg-quaternary)' },
    { icon: 'clock',     label: 'Billable Hours',      value: `${LEX_MATTERS.reduce((a,m)=>a+m.hours,0).toFixed(1)}h`,    color: 'var(--verdict-amber)' },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 40px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--verdict-neon)', textShadow: '0 0 8px rgba(0,255,195,0.35)' }}>▸</span>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--fg-primary)', letterSpacing: '-0.01em', margin: 0 }}>Dashboard</h1>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-quaternary)', margin: 0 }}>
              {LEX_MATTERS.length} matters · All active files
            </p>
          </div>
          <LexBtn variant="primary" icon={<LexIcon name="plus" size={14} color="currentColor" />} onClick={() => setShowModal(true)}>
            NEW MATTER
          </LexBtn>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {stats.map(({ icon, label, value, color }) => (
            <div key={label} style={{ background: 'rgba(20,20,26,0.6)', border: '0.5px solid rgba(224,224,224,0.09)', borderRadius: 6, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 4, background: `${color}14`, border: `0.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LexIcon name={icon} size={15} color={color} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600, color: 'var(--fg-primary)', lineHeight: 1, marginBottom: 4 }}>{value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-quaternary)' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <LexIcon name="search" size={13} color="var(--fg-quaternary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search matters…" style={{
              width: '100%', boxSizing: 'border-box', paddingLeft: 36, paddingRight: 16, paddingTop: 9, paddingBottom: 9,
              background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(224,224,224,0.10)',
              borderRadius: 4, color: 'var(--fg-primary)', outline: 'none',
              fontFamily: 'var(--font-sans)', fontSize: 13,
            }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '7px 12px', borderRadius: 4, cursor: 'pointer',
                background: filter === f ? 'rgba(0,255,195,0.08)' : 'rgba(255,255,255,0.02)',
                border: `0.5px solid ${filter === f ? 'rgba(0,255,195,0.28)' : 'rgba(224,224,224,0.08)'}`,
                color: filter === f ? 'var(--verdict-neon)' : 'var(--fg-tertiary)',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Matter grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {filtered.map(m => <MatterCard key={m.id} matter={m} onClick={() => onSelectMatter(m.id)} />)}
        </div>

        {filtered.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <LexIcon name="search" size={28} color="var(--fg-quaternary)" />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-quaternary)', marginTop: 12 }}>No matters match</p>
          </div>
        )}
      </div>

      {/* New matter modal */}
      {showModal && <NewMatterModal onClose={() => setShowModal(false)} />}
    </div>
  );
};

const MatterCard = ({ matter, onClick }) => {
  const [hovered, setHovered] = React.useState(false);
  const kind = STATUS_KIND[matter.status] || 'neutral';
  const dotColor = STATUS_DOT[matter.status] || 'var(--fg-tertiary)';

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      background: 'rgba(17,17,20,0.7)', border: `0.5px solid ${hovered ? 'rgba(0,255,195,0.25)' : 'rgba(224,224,224,0.09)'}`,
      borderRadius: 6, padding: 16, cursor: 'pointer',
      transition: 'all 160ms cubic-bezier(0.16,1,0.3,1)',
      transform: hovered ? 'translateY(-1px)' : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--fg-primary)', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{matter.title}</h3>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-quaternary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{matter.client}</p>
        </div>
        <StatusChip kind={kind} dot>{matter.status}</StatusChip>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {matter.caseType && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 999, background: 'rgba(224,224,224,0.04)', border: '0.5px solid rgba(224,224,224,0.10)', color: 'var(--fg-tertiary)' }}>{matter.caseType}</span>
        )}
        {matter.jurisdiction && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 999, background: 'rgba(224,224,224,0.04)', border: '0.5px solid rgba(224,224,224,0.10)', color: 'var(--fg-tertiary)' }}>{matter.jurisdiction}</span>
        )}
      </div>

      {/* Stats footer */}
      <div style={{ display: 'flex', gap: 14, paddingTop: 10, borderTop: '0.5px solid rgba(224,224,224,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <LexIcon name="shield" size={11} color="var(--verdict-neon)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-tertiary)' }}>{matter.verified}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <LexIcon name="clock" size={11} color="var(--fg-quaternary)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-tertiary)' }}>{matter.hours}h</span>
        </div>
        {matter.deadlines > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <LexIcon name="calendar" size={11} color="var(--verdict-amber)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-tertiary)' }}>{matter.deadlines}</span>
          </div>
        )}
        <div style={{ marginLeft: 'auto', opacity: hovered ? 1 : 0, transition: 'opacity 160ms', display: 'flex', alignItems: 'center' }}>
          <LexIcon name="chevronRight" size={13} color="var(--verdict-neon)" />
        </div>
      </div>
    </div>
  );
};

const NewMatterModal = ({ onClose }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
    <div style={{
      position: 'relative', width: 480, background: 'var(--midnight-deep)',
      border: '0.5px solid rgba(0,255,195,0.22)', borderRadius: 10,
      boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(0,255,195,0.10)',
      padding: '28px 28px 24px', zIndex: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <MicroLabel neon style={{ display: 'block', marginBottom: 6 }}>New Matter</MicroLabel>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--fg-primary)', margin: 0, letterSpacing: '-0.01em' }}>Open matter</h2>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-quaternary)', display: 'flex' }}>
          <LexIcon name="x" size={16} color="currentColor" />
        </button>
      </div>
      {[{ label: 'Matter title', placeholder: 'In re: Nocturne Data Breach' }, { label: 'Client name', placeholder: 'Meridian Partners LLC' }, { label: 'Case number', placeholder: '4492-X-ND9' }].map(({ label, placeholder }) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-quaternary)', marginBottom: 6 }}>{label}</label>
          <input placeholder={placeholder} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'rgba(17,17,20,0.7)', border: '0.5px solid rgba(224,224,224,0.10)', borderRadius: 4, color: 'var(--fg-primary)', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 13 }} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
        <LexBtn variant="ghost" onClick={onClose}>Cancel</LexBtn>
        <LexBtn variant="primary" onClick={onClose}>Open matter</LexBtn>
      </div>
    </div>
  </div>
);

window.Dashboard = Dashboard;
window.MatterCard = MatterCard;
window.NewMatterModal = NewMatterModal;
