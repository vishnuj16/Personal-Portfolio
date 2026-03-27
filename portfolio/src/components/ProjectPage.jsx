import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { imgUrl } from '../api'

const CYAN   = '#00e5ff'
const GREEN  = '#00ff87'
const BORDER = 'rgba(0,229,255,0.1)'
const MONO   = "'JetBrains Mono', 'Fira Code', monospace"

export default function ProjectPage({ project, onBack, onEdit }) {
  const { isEditMode } = useAuth()
  const cover  = project.cover_url ? imgUrl(project.cover_url) : null
  const skills = project.skills || []

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #030712)',
      color: 'var(--text-primary, rgba(255,255,255,0.93))',
      fontFamily: MONO,
    }}>

      {/* ── Scroll progress bar ─────────────────────────────────────────── */}
      <ScrollBar />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(3,7,18,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
        padding: '0 40px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: `1px solid ${BORDER}`,
            borderRadius: 6, padding: '5px 14px',
            color: 'var(--text-muted)', fontFamily: MONO, fontSize: '0.72rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(0,229,255,0.4)`; e.currentTarget.style.color = CYAN }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          ← cd ..
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* macOS dots */}
          {['#ff5f57','#febc2e','#28c840'].map((c,i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
          ))}
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 6 }}>
            ~/projects/<span style={{ color: CYAN }}>{project.slug || project.title?.toLowerCase().replace(/\s+/g, '-')}</span>
          </span>
        </div>

        {isEditMode && onEdit && (
          <button
            onClick={() => onEdit(project)}
            style={{
              background: 'rgba(0,229,255,0.06)', border: `1px solid rgba(0,229,255,0.25)`,
              borderRadius: 6, padding: '5px 14px',
              color: CYAN, fontFamily: MONO, fontSize: '0.72rem', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,255,0.06)'}
          >
            ✎ edit
          </button>
        )}
        {!isEditMode && <div style={{ width: 80 }} />}
      </div>

      {/* ── Hero section ────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Cover image as full-width banner */}
        {cover && (
          <div style={{ position: 'relative', height: 380, overflow: 'hidden' }}>
            <img
              src={cover}
              alt={project.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.35) saturate(0.8)' }}
            />
            {/* Scanline overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
              pointerEvents: 'none',
            }} />
            {/* Bottom fade */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
              background: 'linear-gradient(to bottom, transparent, var(--bg-primary, #030712))',
            }} />
            {/* Cyan left glow */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 15% 50%, rgba(0,229,255,0.08) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
          </div>
        )}

        {/* Title block — overlaps the cover or sits at top if no cover */}
        <div style={{
          position: cover ? 'absolute' : 'relative',
          bottom: cover ? 0 : 'auto',
          left: 0, right: 0,
          padding: cover ? '0 60px 40px' : '60px 60px 0',
          maxWidth: 1100,
        }}>
          {/* Terminal prompt */}
          <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: `rgba(0,229,255,0.5)`, marginBottom: 10 }}>
            <span style={{ color: GREEN }}>vishnu@portfolio</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>:</span>
            <span style={{ color: CYAN }}>~/projects</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>$ </span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>cat README.md</span>
          </div>

          <h1 style={{
            fontFamily: MONO,
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 12px',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            textShadow: `0 0 40px rgba(0,229,255,0.2)`,
          }}>
            {project.title}
          </h1>

          {/* Tags row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {project.status && (
              <StatusBadge status={project.status} />
            )}
            {project.start_date && (
              <span style={{ fontFamily: MONO, fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                {project.start_date}{project.end_date ? ` → ${project.end_date}` : ' → present'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 60px 100px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 48, minWidth: 0 }}>

        {/* Left: description */}
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          {/* Corner brackets */}
          <div style={{ position: 'relative', padding: '28px 28px 28px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 32 }}>
            <CornerBracket pos="tl" />
            <CornerBracket pos="tr" />
            <CornerBracket pos="bl" />
            <CornerBracket pos="br" />
            <div style={{ fontFamily: MONO, fontSize: '0.6rem', color: `rgba(0,229,255,0.4)`, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
              // description
            </div>
            {project.description ? (
              <div style={{
                fontSize: '0.9rem', lineHeight: 1.8,
                color: 'rgba(255,255,255,0.75)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                fontFamily: 'system-ui, sans-serif',
                minWidth: 0,
              }}>
                {project.description}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No description added yet.
              </div>
            )}
          </div>

          {/* Skills used */}
          {skills.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: MONO, fontSize: '0.6rem', color: `rgba(0,229,255,0.4)`, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
                // stack
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {skills.map(s => (
                  <span key={s.id} style={{
                    fontFamily: MONO, fontSize: '0.72rem',
                    color: CYAN, background: 'rgba(0,229,255,0.06)',
                    border: `1px solid rgba(0,229,255,0.2)`,
                    padding: '4px 12px', borderRadius: 4,
                  }}>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <aside>
          {/* Links */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '20px 22px', marginBottom: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: '0.6rem', color: `rgba(0,229,255,0.4)`, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
              // links
            </div>
            {project.live_url ? (
              <LinkRow href={project.live_url} label="Live Demo" icon="🌐" accent={GREEN} />
            ) : (
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', marginBottom: 8 }}>No live demo</div>
            )}
            {project.repo_url ? (
              <LinkRow href={project.repo_url} label="Source Code" icon="⌥" accent={CYAN} />
            ) : (
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No repository link</div>
            )}
          </div>

          {/* Meta */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontFamily: MONO, fontSize: '0.6rem', color: `rgba(0,229,255,0.4)`, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
              // meta
            </div>
            {project.sort_order != null && <MetaRow label="sort_order" value={project.sort_order} />}
            {project.status && <MetaRow label="status" value={project.status} valueColor={project.status === 'active' ? GREEN : 'rgba(255,255,255,0.5)'} />}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScrollBar() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      setPct((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100 || 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 9999, background: 'rgba(0,229,255,0.08)' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(to right, ${CYAN}, ${GREEN})`, transition: 'width 0.1s' }} />
    </div>
  )
}

function CornerBracket({ pos }) {
  const t = pos.includes('t') ? 0 : 'auto'
  const b = pos.includes('b') ? 0 : 'auto'
  const l = pos.includes('l') ? 0 : 'auto'
  const r = pos.includes('r') ? 0 : 'auto'
  return (
    <div style={{ position: 'absolute', top: t, bottom: b, left: l, right: r, width: 12, height: 12, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: pos.includes('t') ? 0 : 'auto', bottom: pos.includes('b') ? 0 : 'auto', left: pos.includes('l') ? 0 : 'auto', right: pos.includes('r') ? 0 : 'auto', width: '100%', height: 2, background: CYAN, opacity: 0.5 }} />
      <div style={{ position: 'absolute', top: pos.includes('t') ? 0 : 'auto', bottom: pos.includes('b') ? 0 : 'auto', left: pos.includes('l') ? 0 : 'auto', right: pos.includes('r') ? 0 : 'auto', width: 2, height: '100%', background: CYAN, opacity: 0.5 }} />
    </div>
  )
}

function StatusBadge({ status }) {
  const colours = { active: GREEN, completed: CYAN, archived: 'rgba(255,255,255,0.3)', wip: '#febc2e' }
  const c = colours[status?.toLowerCase()] || 'rgba(255,255,255,0.4)'
  return (
    <span style={{
      fontFamily: MONO, fontSize: '0.62rem',
      color: c, background: `${c}15`,
      border: `1px solid ${c}40`,
      padding: '3px 10px', borderRadius: 3,
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      {status}
    </span>
  )
}

function LinkRow({ href, label, icon, accent }) {
  const [hov, setHov] = useState(false)
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 7, marginBottom: 8,
        background: hov ? `${accent}10` : 'transparent',
        border: `1px solid ${hov ? `${accent}40` : BORDER}`,
        color: hov ? accent : 'rgba(255,255,255,0.6)',
        textDecoration: 'none', transition: 'all 0.2s',
        fontFamily: MONO, fontSize: '0.75rem',
      }}
    >
      <span>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>↗</span>
    </a>
  )
}

function MetaRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.72rem' }}>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: MONO }}>{label}</span>
      <span style={{ color: valueColor || 'rgba(255,255,255,0.6)', fontFamily: MONO }}>{String(value)}</span>
    </div>
  )
}