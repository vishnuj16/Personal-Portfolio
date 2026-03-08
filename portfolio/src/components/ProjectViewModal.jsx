import { useEffect } from 'react'
import { imgUrl } from '../api'

// Utility: render a metadata row
function MetaRow({ label, value, accent }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', gap: 0, flexDirection: 'column', marginBottom: 2 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: accent ? 'var(--cyan)' : 'var(--text-primary)', marginTop: 2 }}>{value}</span>
    </div>
  )
}

function LinkPill({ href, label, color }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
      color: color || 'var(--cyan)',
      background: color === 'var(--green)' ? 'rgba(0,255,135,0.08)' : 'rgba(0,229,255,0.08)',
      border: `1px solid ${color === 'var(--green)' ? 'rgba(0,255,135,0.3)' : 'rgba(0,229,255,0.3)'}`,
      padding: '6px 14px', borderRadius: '6px', textDecoration: 'none',
      transition: 'all 0.2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = color === 'var(--green)' ? 'rgba(0,255,135,0.14)' : 'rgba(0,229,255,0.14)' }}
    onMouseLeave={e => { e.currentTarget.style.background = color === 'var(--green)' ? 'rgba(0,255,135,0.08)' : 'rgba(0,229,255,0.08)' }}
    >{label} ↗</a>
  )
}

const STATUS_COLORS = {
  'completed':   '#00ff87',
  'in-progress': '#00e5ff',
  'archived':    '#6b7280',
}

export default function ProjectViewModal({ project, onClose, onEdit, isEditMode }) {
  const coverSrc = project.cover_url ? imgUrl(project.cover_url) : null
  const skills = project.skills || []
  const statusColor = STATUS_COLORS[project.status] || '#00e5ff'

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [])

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9997,
        background: 'rgba(3,7,18,0.92)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '680px', maxHeight: '90vh',
        background: '#080d18',
        border: '1px solid rgba(0,229,255,0.15)',
        borderRadius: '16px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,229,255,0.08), inset 0 1px 0 rgba(0,229,255,0.06)',
      }}>

        {/* ── Hero image or gradient header ── */}
        <div style={{ position: 'relative', height: coverSrc ? '220px' : '100px', flexShrink: 0, overflow: 'hidden' }}>
          {coverSrc ? (
            <img src={coverSrc} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.55) saturate(0.9)' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.06) 0%, transparent 60%)',
            }}>
              {/* Decorative scan lines */}
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${i * 14}%`, height: '1px', background: 'rgba(0,229,255,0.04)' }} />
              ))}
            </div>
          )}

          {/* Gradient fade to body */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, #080d18 100%)' }} />

          {/* Status + featured badges top-left */}
          <div style={{ position: 'absolute', top: 16, left: 20, display: 'flex', gap: 6 }}>
            {project.featured && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#febc2e', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(254,188,46,0.4)', padding: '3px 10px', borderRadius: '4px', backdropFilter: 'blur(8px)' }}>★ FEATURED</span>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: statusColor, background: 'rgba(0,0,0,0.6)', border: `1px solid ${statusColor}44`, padding: '3px 10px', borderRadius: '4px', backdropFilter: 'blur(8px)' }}>
              <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: statusColor, marginRight: 5, boxShadow: `0 0 6px ${statusColor}` }} />
              {project.status}
            </span>
          </div>

          {/* Close button */}
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: '0.8rem', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ overflowY: 'auto', padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Title block */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(0,229,255,0.5)', letterSpacing: '0.12em', marginBottom: 6 }}>
              ~/projects/{project.slug}
            </div>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 0 }}>
              {project.title}
            </h2>
          </div>

          {/* Metadata grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: '1px', background: 'rgba(0,229,255,0.08)',
            borderRadius: '8px', overflow: 'hidden',
            border: '1px solid rgba(0,229,255,0.08)',
          }}>
            {[
              { label: 'started', value: project.started_at || '—' },
              { label: 'ended', value: project.ended_at || (project.status === 'in-progress' ? 'present' : '—') },
              { label: 'status', value: project.status, accent: true },
            ].map(({ label, value, accent }) => (
              <div key={label} style={{ background: 'rgba(8,13,24,0.95)', padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 5 }}>{label.toUpperCase()}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: accent ? statusColor : 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {project.summary && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(0,229,255,0.4)', letterSpacing: '0.1em', marginBottom: 8 }}>// SUMMARY</div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>{project.summary}</p>
            </div>
          )}
          {project.description && project.description !== project.summary && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(0,229,255,0.4)', letterSpacing: '0.1em', marginBottom: 8 }}>// DESCRIPTION</div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>{project.description}</p>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(0,229,255,0.4)', letterSpacing: '0.1em', marginBottom: 10 }}>// STACK</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.map(skill => (
                  <span key={skill.id} style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                    color: 'var(--cyan)', background: 'rgba(0,229,255,0.06)',
                    border: '1px solid rgba(0,229,255,0.2)',
                    padding: '4px 12px', borderRadius: '4px',
                  }}>{skill.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {(project.repo_url || project.live_url) && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(0,229,255,0.4)', letterSpacing: '0.1em', marginBottom: 10 }}>// LINKS</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <LinkPill href={project.repo_url} label="⌥ repository" />
                <LinkPill href={project.live_url} label="◉ live demo" color="var(--green)" />
              </div>
            </div>
          )}

          {/* Edit button */}
          {isEditMode && (
            <div style={{ borderTop: '1px solid rgba(0,229,255,0.08)', paddingTop: 20 }}>
              <button onClick={() => { onClose(); onEdit(project) }} style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)',
                color: 'var(--cyan)', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer',
              }}>✎ edit this project</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}