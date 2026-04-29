export default function DesignShowcase() {
  return (
    <div className="doc" style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 32px 80px", position: "relative", zIndex: 1 }}>

      {/* HERO */}
      <div className="doc-hero" style={{
        padding: 28, marginBottom: 28,
        border: "0.5px solid var(--border-hair)",
        borderRadius: "var(--radius-lg)",
        background: "linear-gradient(135deg, rgba(0,255,195,0.06), rgba(106,0,255,0.06) 60%, var(--bg-raised))",
        position: "relative", overflow: "hidden",
      }}>
        <span className="lex-micro lex-micro--neon">◆ COMPONENTS.CSS · v0.1.0 · 42 CLASSES</span>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 40, fontWeight: 400, letterSpacing: "-0.02em", margin: "8px 0 4px", color: "var(--fg-primary)" }}>
          LexAgent — live component showcase
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--fg-secondary)", maxWidth: 640, margin: "8px 0 0" }}>
          Every class in <span style={{ fontFamily: "var(--font-mono)", color: "var(--verdict-neon)" }}>components.css</span> rendered with real markup.
          Import <span style={{ fontFamily: "var(--font-mono)" }}>colors_and_type.css</span> first, then this file.
        </p>
      </div>

      {/* BUTTONS */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Buttons
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-tertiary)", margin: "0 0 20px" }}>Four variants. Primary glows. Press scales to 0.985. No bounces.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <button className="lex-btn lex-btn--primary">File motion <span className="lex-btn__kbd">⌘⏎</span></button>
          <button className="lex-btn lex-btn--secondary">Open matter</button>
          <button className="lex-btn lex-btn--ghost">Cancel</button>
          <button className="lex-btn lex-btn--danger">Revoke seal</button>
          <button className="lex-btn lex-btn--secondary" disabled>Disabled</button>
        </div>
      </section>

      {/* CHIPS */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Status chips
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-tertiary)", margin: "0 0 20px" }}>Capsule shape, 0.5px same-color border, 6% fill. Dot is optional.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <span className="lex-chip lex-chip--neon"><span className="lex-chip__dot"></span>FILED</span>
          <span className="lex-chip lex-chip--violet"><span className="lex-chip__dot"></span>SEALED</span>
          <span className="lex-chip lex-chip--amber"><span className="lex-chip__dot"></span>PENDING</span>
          <span className="lex-chip lex-chip--crimson"><span className="lex-chip__dot"></span>BREACH</span>
          <span className="lex-chip lex-chip--neutral">DRAFT</span>
        </div>
      </section>

      {/* MICRO LABELS */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Micro labels
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-tertiary)", margin: "0 0 20px" }}>10px JetBrains Mono, uppercase, 0.18em tracking. The signature detail.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <span className="lex-micro">CASE ID · 4492-X</span>
          <span className="lex-micro lex-micro--neon">◆ LIVE · SYNCED</span>
          <span className="lex-micro lex-micro--violet">◆ PRIVILEGED</span>
          <span className="lex-micro lex-micro--amber">⏱ 4 DAYS</span>
          <span className="lex-micro lex-micro--crimson">⚠ OVERDUE</span>
        </div>
      </section>

      {/* FIELDS */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Form fields
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-tertiary)", margin: "0 0 20px" }}>Floating uppercase mono label, neon caret, glow-on-focus.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div className="lex-field">
              <span className="lex-field__label">CASE ID</span>
              <input defaultValue="4488-V-KT2" />
            </div>
          </div>
          <div>
            <div className="lex-field lex-field--error">
              <span className="lex-field__label">OPPOSING COUNSEL</span>
              <input defaultValue="" placeholder="Required" />
            </div>
            <div className="lex-field__hint lex-field__hint--error">Required field.</div>
          </div>
        </div>
      </section>

      {/* CARDS */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Cards
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-tertiary)", margin: "0 0 20px" }}>Every card carries a blueprint overlay (top-right) + noise texture.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <div className="lex-card">
            <div className="lex-card__head"><span className="lex-micro">BASE · RAISED</span></div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, letterSpacing: "-0.01em" }}>Standard card</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-tertiary)", margin: "4px 0 0" }}>Default bento unit.</p>
          </div>
          <div className="lex-card lex-card--active">
            <div className="lex-card__head"><span className="lex-micro lex-micro--neon">◆ ACTIVE</span></div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, letterSpacing: "-0.01em" }}>Selected card</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-tertiary)", margin: "4px 0 0" }}>Neon border + halo.</p>
          </div>
          <div className="lex-card lex-card--sealed">
            <div className="lex-card__head"><span className="lex-micro lex-micro--violet">◆ SEALED</span></div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, letterSpacing: "-0.01em" }}>Privileged</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-tertiary)", margin: "4px 0 0" }}>Violet gradient top.</p>
          </div>
        </div>
      </section>

      {/* STAT */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Stat value
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-tertiary)", margin: "0 0 20px" }}>Big mono numbers. Progress uses violet→neon gradient.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <div className="lex-card">
            <div className="lex-stat__label">BILLABLE · APR</div>
            <div className="lex-stat__value">86:42<span className="lex-stat__unit">h</span></div>
            <div className="lex-stat__delta lex-stat__delta--up">▲ 12.4% VS MAR</div>
          </div>
          <div className="lex-card">
            <div className="lex-stat__label">RETAINER</div>
            <div className="lex-stat__value lex-stat__value--neon">$42,210</div>
            <div className="lex-progress"><div className="lex-progress__bar" style={{ width: "68%" }}></div></div>
          </div>
          <div className="lex-card">
            <div className="lex-stat__label">DEADLINES · 14D</div>
            <div className="lex-stat__value" style={{ color: "var(--verdict-amber)" }}>3</div>
            <div className="lex-stat__delta lex-stat__delta--warn">⏱ NEXT IN 4 DAYS</div>
          </div>
        </div>
      </section>

      {/* DEADLINE LIST */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Deadline list
        </h2>
        <div className="lex-card">
          <div className="lex-deadline-list">
            <div className="lex-deadline-item">
              <div className="lex-deadline-item__count lex-deadline-item__count--urgent">-2D</div>
              <div className="lex-deadline-item__line lex-deadline-item__line--urgent"></div>
              <div className="lex-deadline-item__body">
                <div className="lex-deadline-item__label">Motion to compel — response due</div>
                <div className="lex-deadline-item__date">2026-04-22 · 17:00 PDT · CASE 4488-V-KT2</div>
              </div>
              <span className="lex-chip lex-chip--crimson">OVERDUE</span>
            </div>
            <div className="lex-deadline-item">
              <div className="lex-deadline-item__count lex-deadline-item__count--warn">4D</div>
              <div className="lex-deadline-item__line lex-deadline-item__line--warn"></div>
              <div className="lex-deadline-item__body">
                <div className="lex-deadline-item__label">Deposition schedule — client signature</div>
                <div className="lex-deadline-item__date">2026-04-24 · CASE 4488-V-KT2</div>
              </div>
              <span className="lex-chip lex-chip--amber">DUE</span>
            </div>
            <div className="lex-deadline-item">
              <div className="lex-deadline-item__count lex-deadline-item__count--ok">11D</div>
              <div className="lex-deadline-item__line"></div>
              <div className="lex-deadline-item__body">
                <div className="lex-deadline-item__label">Expert witness disclosure</div>
                <div className="lex-deadline-item__date">2026-05-01 · CASE 4481-C-R9</div>
              </div>
              <span className="lex-chip lex-chip--neutral">OK</span>
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Case timeline
        </h2>
        <div className="lex-card">
          <div className="lex-timeline">
            <div className="lex-timeline-node lex-timeline-node--closed">
              <div className="lex-timeline-node__when">2026-03-04 · 09:12</div>
              <div>
                <div className="lex-timeline-node__what">Complaint filed · 9th Circuit</div>
                <div className="lex-timeline-node__meta">DKT 001 · CLERK: R. OKONKWO</div>
              </div>
            </div>
            <div className="lex-timeline-node lex-timeline-node--active">
              <div className="lex-timeline-node__when">2026-04-18 · 14:32</div>
              <div>
                <div className="lex-timeline-node__what">Opposing response received</div>
                <div className="lex-timeline-node__meta">DKT 024 · 12 PAGES · UNDER REVIEW</div>
              </div>
            </div>
            <div className="lex-timeline-node lex-timeline-node--pending">
              <div className="lex-timeline-node__when">2026-04-22 · DUE</div>
              <div>
                <div className="lex-timeline-node__what">Reply brief · draft</div>
                <div className="lex-timeline-node__meta">ASSIGNED: M. ARONOFSKY</div>
              </div>
            </div>
            <div className="lex-timeline-node lex-timeline-node--future">
              <div className="lex-timeline-node__when">2026-05-14 · 10:00</div>
              <div>
                <div className="lex-timeline-node__what">Deposition · P. Nocturne</div>
                <div className="lex-timeline-node__meta">COURTROOM 3C</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMAND PALETTE */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Command palette
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-tertiary)", margin: "0 0 20px" }}>Static preview (overlay backdrop not shown).</p>
        <div className="lex-palette" style={{ margin: "0 auto" }}>
          <div className="lex-palette__input-row">
            <span className="lex-palette__prompt">▸</span>
            <input className="lex-palette__input" defaultValue="file motion" readOnly />
            <span className="lex-palette__count">4 RESULTS</span>
            <button className="lex-palette__esc">ESC</button>
          </div>
          <div className="lex-palette__body">
            <div className="lex-palette__section">ACTIONS</div>
            <div className="lex-palette__item is-selected">
              <span>File new motion…</span>
              <span className="lex-palette__item-hint">⌘ M</span>
            </div>
            <div className="lex-palette__item">
              <span>File response to motion</span>
              <span className="lex-palette__item-hint">⌘ ⇧ M</span>
            </div>
            <div className="lex-palette__section">MATTERS</div>
            <div className="lex-palette__item">
              <span>4488-V-KT2 · In re: Nocturne</span>
              <span className="lex-palette__item-hint">GO →</span>
            </div>
          </div>
          <div className="lex-palette__footer">
            <span>↑↓ NAVIGATE</span><span>⏎ RUN</span><span>TAB · COMPLETE</span>
          </div>
        </div>
      </section>

      {/* MESSAGES */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Messages &amp; compose
        </h2>
        <div className="lex-card">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="lex-bubble lex-bubble--them">Opposing counsel responded. No surprises. I will draft our reply by Thursday — no action from you.</div>
            <div className="lex-bubble lex-bubble--me">Thanks. Anything I should prepare for the deposition?</div>
            <div className="lex-bubble lex-bubble--them">I will send a one-page prep sheet by end of day. Keep answers short. Do not volunteer.</div>
          </div>
          <div className="lex-compose" style={{ marginTop: 16 }}>
            <input placeholder="Message M. Aronofsky…" />
            <button className="lex-btn lex-btn--primary">Send <span className="lex-btn__kbd">⏎</span></button>
          </div>
        </div>
      </section>

      {/* VAULT */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Vault hero (scanning)
        </h2>
        <div className="lex-vault-hero">
          <div className="lex-micro lex-micro--violet">◆ SEALED WORKSPACE · TLS 1.3</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 26, letterSpacing: "-0.02em", marginTop: 6 }}>Chain of custody · verifying</div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-secondary)", margin: "6px 0 16px" }}>Every file touch is logged. Your bar number and session key are attached to this audit row.</p>
          <div className="lex-vault-scan"><div className="lex-vault-scan__bar"></div></div>
        </div>
      </section>

      {/* TOASTS + EMPTY */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 20px" }}>
          Toasts &amp; empty state
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="lex-toast">
              <div className="lex-toast__bar lex-toast__bar--neon"></div>
              <div>
                <div className="lex-toast__title">Motion filed</div>
                <div className="lex-toast__body">Docket 4488-V-KT2 · DKT 025 · accepted by clerk.</div>
                <div className="lex-toast__time">14:32 PDT</div>
              </div>
            </div>
            <div className="lex-toast">
              <div className="lex-toast__bar lex-toast__bar--amber"></div>
              <div>
                <div className="lex-toast__title">Signature required</div>
                <div className="lex-toast__body">Deposition schedule — D. Ashford must sign before 2026-04-22.</div>
                <div className="lex-toast__time">11:08 PDT</div>
              </div>
            </div>
            <div className="lex-toast">
              <div className="lex-toast__bar lex-toast__bar--crimson"></div>
              <div>
                <div className="lex-toast__title">Audit trail diverged</div>
                <div className="lex-toast__body">Document hash mismatch on EXH-114. Opening chain-of-custody review.</div>
                <div className="lex-toast__time">09:41 UTC</div>
              </div>
            </div>
          </div>
          <div className="lex-card" style={{ padding: 0 }}>
            <div className="lex-empty">
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--fg-tertiary)" }}>NO OPEN MATTERS</div>
              <div className="lex-empty__label">When a case is opened, it appears here.</div>
              <div className="lex-empty__body">Filings, depositions, and deadlines populate automatically from court e-filing feeds.</div>
              <button className="lex-btn lex-btn--primary" style={{ marginTop: 8 }}>Open matter <span className="lex-btn__kbd">⌘ N</span></button>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE TRACK */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 4px" }}>
          Phase progress track
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg-tertiary)", margin: "0 0 20px" }}>7-step case phase indicator. Active step glows.</p>
        <div className="lex-card">
          <div className="lex-micro">CURRENT PHASE · 3 OF 7 · PRE-TRIAL DISCOVERY</div>
          <div className="lex-phase-track" style={{ marginTop: 12 }}>
            <div className="lex-phase-track__step lex-phase-track__step--done"></div>
            <div className="lex-phase-track__step lex-phase-track__step--done"></div>
            <div className="lex-phase-track__step lex-phase-track__step--active"></div>
            <div className="lex-phase-track__step"></div>
            <div className="lex-phase-track__step"></div>
            <div className="lex-phase-track__step"></div>
            <div className="lex-phase-track__step"></div>
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--border-hair)" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--verdict-neon)", textShadow: "0 0 6px rgba(0,255,195,0.35)", margin: "0 0 20px" }}>
          Ledger table
        </h2>
        <div className="lex-card">
          <table className="lex-table">
            <thead>
              <tr>
                <th>DATE</th><th>INVOICE</th><th>HOURS</th>
                <th style={{ textAlign: "right" }}>AMOUNT</th>
                <th style={{ textAlign: "right" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2026-04-01</td>
                <td style={{ color: "var(--fg-primary)" }}>INV-0188</td>
                <td>72:14</td>
                <td style={{ textAlign: "right", color: "var(--fg-primary)" }}>$41,541</td>
                <td style={{ textAlign: "right" }}><span className="lex-chip lex-chip--neon">PAID</span></td>
              </tr>
              <tr>
                <td>2026-03-01</td>
                <td style={{ color: "var(--fg-primary)" }}>INV-0172</td>
                <td>68:40</td>
                <td style={{ textAlign: "right", color: "var(--fg-primary)" }}>$39,517</td>
                <td style={{ textAlign: "right" }}><span className="lex-chip lex-chip--neon">PAID</span></td>
              </tr>
              <tr>
                <td>2026-02-01</td>
                <td style={{ color: "var(--fg-primary)" }}>INV-0154</td>
                <td>54:22</td>
                <td style={{ textAlign: "right", color: "var(--fg-primary)" }}>$31,261</td>
                <td style={{ textAlign: "right" }}><span className="lex-chip lex-chip--neutral">SENT</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
