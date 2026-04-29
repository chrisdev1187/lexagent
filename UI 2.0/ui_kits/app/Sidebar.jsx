// Sidebar.jsx — Collapsible matter sidebar for Lex Protocol Console

const LexSidebar = ({ activeMatter, onSelect, view, onView }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const filtered = LEX_MATTERS.filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.client.toLowerCase().includes(search.toLowerCase())
  );

  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'clients',   icon: 'users',     label: 'Clients' },
    { id: 'admin',     icon: 'settings',  label: 'Administration' },
  ];

  return (
    <aside style={{
      width: collapsed ? 52 : 240, minWidth: collapsed ? 52 : 240,
      background: 'var(--midnight-deep)',
      borderRight: '0.5px solid rgba(224,224,224,0.08)',
      display: 'flex', flexDirection: 'column', height: '100%',
      transition: 'width 0.22s cubic-bezier(0.16,1,0.3,1)',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 12px', borderBottom: '0.5px solid rgba(224,224,224,0.08)', flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 4, background: 'rgba(0,255,195,0.06)', border: '0.5px solid rgba(0,255,195,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LexIcon name="scale" size={14} color="var(--verdict-neon)" />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 500, color: 'var(--fg-primary)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>LEX PROTOCOL</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-quaternary)', marginTop: 2 }}>ARES v5</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ id, icon, label }) => {
          const active = view === id;
          return (
            <button key={id} onClick={() => onView(id)} title={collapsed ? label : undefined} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 4, cursor: 'pointer',
              background: active ? 'rgba(0,255,195,0.06)' : 'transparent',
              borderLeft: `2px solid ${active ? 'var(--verdict-neon)' : 'transparent'}`,
              paddingLeft: active ? 8 : 10,
              color: active ? 'var(--verdict-neon)' : 'var(--fg-tertiary)',
              border: 'none', borderLeft: `2px solid ${active ? 'var(--verdict-neon)' : 'transparent'}`,
              width: '100%', textAlign: 'left', transition: 'all 160ms',
            }}>
              <LexIcon name={icon} size={15} color="currentColor" style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, whiteSpace: 'nowrap' }}>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* New Matter */}
      {!collapsed && (
        <div style={{ padding: '0 8px 8px' }}>
          <button onClick={() => onView('dashboard')} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 4,
            background: 'rgba(0,255,195,0.04)', border: '0.5px dashed rgba(0,255,195,0.28)',
            color: 'var(--verdict-neon)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            <LexIcon name="plus" size={12} color="currentColor" /> New Matter
          </button>
        </div>
      )}

      {/* Search */}
      {!collapsed && (
        <div style={{ padding: '0 8px 6px', position: 'relative' }}>
          <LexIcon name="search" size={12} color="var(--fg-quaternary)" style={{ position: 'absolute', left: 18, top: 9 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter matters" style={{
            width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 28px',
            background: 'var(--bg-raised)', border: '0.5px solid rgba(224,224,224,0.08)',
            borderRadius: 4, color: 'var(--fg-primary)', outline: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 11,
          }} />
        </div>
      )}

      {/* Matters section label */}
      {!collapsed && (
        <div style={{ padding: '4px 18px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <MicroLabel style={{ fontSize: 9 }}>Matters · {LEX_MATTERS.length}</MicroLabel>
        </div>
      )}

      {/* Matter list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map(m => {
          const isSel = activeMatter === m.id;
          const dotColor = STATUS_DOT[m.status] || 'var(--fg-tertiary)';
          return (
            <button key={m.id} onClick={() => { onSelect(m.id); onView('matter'); }} title={collapsed ? m.title : undefined} style={{
              textAlign: 'left', cursor: 'pointer', padding: '9px 10px',
              background: isSel ? 'rgba(0,255,195,0.05)' : 'transparent',
              border: '0.5px solid', borderColor: isSel ? 'rgba(0,255,195,0.28)' : 'transparent',
              borderLeft: `2px solid ${isSel ? 'var(--verdict-neon)' : 'transparent'}`,
              borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 3,
              position: 'relative', transition: 'all 160ms', width: '100%',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: dotColor, flexShrink: 0, boxShadow: m.status === 'Active' ? `0 0 5px ${dotColor}` : 'none' }} />
                {!collapsed && (
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 12, color: isSel ? 'var(--fg-primary)' : 'var(--fg-secondary)', letterSpacing: '-0.01em', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                    {m.title}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 11 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-quaternary)' }}>{m.status}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: '0.5px solid rgba(224,224,224,0.08)', flexShrink: 0 }}>
        {/* Timer row */}
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <LexIcon name="play" size={10} color="var(--verdict-neon)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-quaternary)' }}>00:00:00</span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--verdict-neon)', background: 'rgba(0,255,195,0.06)', border: '0.5px solid rgba(0,255,195,0.25)', padding: '2px 6px', borderRadius: 2 }}>FREE</span>
          </div>
        )}

        {/* User row */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setUserMenuOpen(p => !p)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', background: userMenuOpen ? 'rgba(0,255,195,0.05)' : 'transparent',
            border: 'none', cursor: 'pointer',
          }}>
            <div style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,rgba(0,255,195,0.15),rgba(106,0,255,0.15))', border: '0.5px solid rgba(0,255,195,0.2)' }}>
              <LexIcon name="user" size={12} color="var(--verdict-neon)" />
            </div>
            {!collapsed && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>attorney</span>}
          </button>
          {userMenuOpen && !collapsed && (
            <div style={{ position: 'absolute', bottom: '100%', left: 12, right: 12, background: 'var(--midnight-deep)', border: '0.5px solid rgba(0,255,195,0.22)', borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 10 }}>
              {[{ icon: 'user', label: 'Profile & Usage' }, { icon: 'creditCard', label: 'Billing & Plan' }, { icon: 'key', label: 'API Keys' }].map(({ icon, label }) => (
                <div key={label} onClick={() => setUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', color: 'var(--fg-secondary)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                  <LexIcon name={icon} size={12} color="var(--verdict-neon)" /> {label}
                </div>
              ))}
              <Divider />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', color: 'var(--verdict-crimson)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                <LexIcon name="logout" size={12} color="var(--verdict-crimson)" /> Sign out
              </div>
            </div>
          )}
        </div>

        {/* Version pill */}
        {!collapsed && (
          <div style={{ padding: '4px 12px 6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-quaternary)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>v0.3.0</span>
          </div>
        )}

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: 'none', border: 'none', borderTop: '0.5px solid rgba(224,224,224,0.06)', cursor: 'pointer', color: 'var(--fg-quaternary)' }}>
          <LexIcon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={13} color="currentColor" />
        </button>
      </div>
    </aside>
  );
};

window.LexSidebar = LexSidebar;
