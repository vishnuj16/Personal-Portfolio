import { useEffect } from 'react'
import { imgUrl } from '../api'

export default function EducationViewModal({ edu, onClose, onEdit, isEditMode }) {
  const logoSrc = edu.logo_url ? imgUrl(edu.logo_url) : null

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [])

  const duration = (() => {
    if (!edu.started_at) return null
    const start = new Date(edu.started_at + '-01')
    const end = edu.ended_at ? new Date(edu.ended_at + '-01') : new Date()
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    const yrs = Math.floor(months / 12)
    return yrs ? `${yrs} year${yrs > 1 ? 's' : ''}` : `${months} months`
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
        width: '100%', maxWidth: '520px',
        background: '#080d18', border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: '16px', overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,229,255,0.06)',
      }}>
        {/* Header */}
        <div style={{
          padding: '28px',
          background: 'linear-gradient(135deg, rgba(0,229,255,0.04) 0%, transparent 70%)',
          borderBottom: '1px solid rgba(0,229,255,0.08)',
          position: 'relative',
        }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {logoSrc ? (
              <div style={{ width: 60, height: 60, flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoSrc} alt={edu.institution} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
              </div>
            ) : (
              <div style={{ width: 60, height: 60, flexShrink: 0, background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', opacity: 0.35 }}>🎓</div>
            )}
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'rgba(0,229,255,0.4)', letterSpacing: '0.1em', marginBottom: 4 }}>$ cat ~/.education</div>
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 4 }}>{edu.institution}</h2>
              {(edu.degree || edu.field) && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--cyan)' }}>
                  {[edu.degree, edu.field].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: 'rgba(0,229,255,0.07)' }}>
          {[
            { label: 'enrolled', value: edu.started_at || '—' },
            { label: 'graduated', value: edu.ended_at || 'present' },
            { label: 'duration', value: duration || '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#080d18', padding: '16px 18px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 5 }}>{label.toUpperCase()}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        {isEditMode && (
          <div style={{ padding: '18px 24px', borderTop: '1px solid rgba(0,229,255,0.08)' }}>
            <button onClick={() => { onClose(); onEdit(edu) }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', color: 'var(--cyan)', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer' }}>✎ edit this entry</button>
          </div>
        )}
      </div>
    </div>
  )
}