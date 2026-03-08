import { useEffect } from 'react'
import { imgUrl } from '../api'

export default function ExperienceViewModal({ exp, onClose, onEdit, isEditMode }) {
  const logoSrc = exp.logo_url ? imgUrl(exp.logo_url) : null

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [])

  const duration = (() => {
    if (!exp.started_at) return null
    const start = new Date(exp.started_at + '-01')
    const end = exp.ended_at ? new Date(exp.ended_at + '-01') : new Date()
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    const yrs = Math.floor(months / 12)
    const mos = months % 12
    return [yrs && `${yrs}y`, mos && `${mos}mo`].filter(Boolean).join(' ') || '< 1mo'
  })()

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9997,
        background: 'rgba(3,7,18,0.92)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '580px', maxHeight: '88vh',
        background: '#080d18', border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: '16px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,229,255,0.06)',
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 28px 24px',
          background: 'linear-gradient(135deg, rgba(0,229,255,0.04) 0%, transparent 60%)',
          borderBottom: '1px solid rgba(0,229,255,0.08)',
          position: 'relative',
          flexShrink: 0,
        }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            {/* Logo */}
            {logoSrc ? (
              <div style={{ width: 56, height: 56, flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoSrc} alt={exp.company} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
              </div>
            ) : (
              <div style={{ width: 56, height: 56, flexShrink: 0, background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', opacity: 0.4 }}>🏢</div>
            )}

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(0,229,255,0.45)', letterSpacing: '0.1em', marginBottom: 4 }}>
                $ git log --author="{exp.company}"
              </div>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.01em' }}>
                {exp.role}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {exp.company_url ? (
                  <a href={exp.company_url} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--cyan)', textDecoration: 'none' }}>{exp.company} ↗</a>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--cyan)' }}>{exp.company}</span>
                )}
                {exp.current && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--cyan)', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', padding: '2px 8px', borderRadius: '3px' }}>CURRENT</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Timeline metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: 'rgba(0,229,255,0.07)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,229,255,0.07)' }}>
            {[
              { label: 'from', value: exp.started_at || '—' },
              { label: 'to', value: exp.ended_at || (exp.current ? 'present' : '—') },
              { label: 'duration', value: duration || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(8,13,24,0.95)', padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 5 }}>{label.toUpperCase()}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {exp.description && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(0,229,255,0.4)', letterSpacing: '0.1em', marginBottom: 10 }}>// RESPONSIBILITIES</div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>
                {exp.description}
              </p>
            </div>
          )}

          {isEditMode && (
            <div style={{ borderTop: '1px solid rgba(0,229,255,0.08)', paddingTop: 18 }}>
              <button onClick={() => { onClose(); onEdit(exp) }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', color: 'var(--cyan)', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer' }}>✎ edit this entry</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}