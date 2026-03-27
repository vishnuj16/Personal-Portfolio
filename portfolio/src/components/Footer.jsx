import { useState } from 'react'
import LoginModal from './LoginModal'
import { useAuth } from '../context/AuthContext'

// ─── Copy-to-clipboard hook ───────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return [copied, copy]
}

// ─── Contact card ─────────────────────────────────────────────────────────────
function ContactCard({ icon, label, value, href, copyValue, accent = 'var(--cyan)' }) {
  const [copied, copy] = useCopy()
  const [hovered, setHovered] = useState(false)

  const accentAlpha = (a) => {
    if (accent === 'var(--cyan)') return `rgba(0,229,255,${a})`
    if (accent === '#0a66c2')     return `rgba(10,102,194,${a})`
    if (accent === '#e6edf3)')    return `rgba(230,237,243,${a})`
    return `rgba(0,229,255,${a})`
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? accentAlpha(0.06) : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? accentAlpha(0.35) : 'var(--card-border)'}`,
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        transition: 'all 0.22s ease',
        boxShadow: hovered ? `0 0 24px ${accentAlpha(0.08)}` : 'none',
        width: '260px',
        flexShrink: 0,
        flexGrow: 0,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
        background: accentAlpha(0.08),
        border: `1px solid ${accentAlpha(0.2)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent, transition: 'all 0.22s',
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
          color: 'var(--text-muted)', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 4,
        }}>
          {label}
        </div>
        {href ? (
          <a href={href} target={href.startsWith('mailto') || href.startsWith('tel') ? undefined : '_blank'}
            rel="noreferrer"
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
              color: hovered ? accent : 'var(--text-primary)',
              textDecoration: 'none', transition: 'color 0.2s',
              display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {value}
          </a>
        ) : (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
            color: hovered ? accent : 'var(--text-primary)',
            transition: 'color 0.2s',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {value}
          </div>
        )}
      </div>

      {/* Copy button */}
      {copyValue && (
        <button
          onClick={() => copy(copyValue)}
          title={copied ? 'Copied!' : 'Copy'}
          style={{
            flexShrink: 0,
            background: copied ? accentAlpha(0.12) : 'transparent',
            border: `1px solid ${copied ? accentAlpha(0.4) : 'transparent'}`,
            borderRadius: '7px',
            padding: '6px 8px',
            color: copied ? accent : 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.18s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor = accentAlpha(0.3); e.currentTarget.style.color = accent } }}
          onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
        >
          {copied ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              copied
            </>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          )}
        </button>
      )}
    </div>
  )
}

// ─── Main Footer ──────────────────────────────────────────────────────────────
export default function Footer({ profile }) {
  const { isAdmin } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const year = new Date().getFullYear()

  const available = profile?.available

  return (
    <>
      {/* ── Contact Section ─────────────────────────────────────────────── */}
      <section id="contact" style={{
        padding: '100px 40px 80px',
        background: 'var(--black-alt)',
        borderTop: '1px solid var(--card-border)',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
              color: 'var(--cyan)', letterSpacing: '0.15em', marginBottom: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span style={{ width: 28, height: 1, background: 'var(--cyan)', opacity: 0.5, display: 'inline-block' }} />
              $ contact --init
              <span style={{ width: 28, height: 1, background: 'var(--cyan)', opacity: 0.5, display: 'inline-block' }} />
            </div>

            <h2 style={{
              fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', fontWeight: 700,
              fontFamily: 'var(--font-sans)', marginBottom: '16px', lineHeight: 1.15,
            }}>
              Let's build something{' '}
              <span style={{ color: 'var(--cyan)', textShadow: '0 0 30px rgba(0,229,255,0.3)' }}>remarkable</span>
              <span style={{ color: 'var(--cyan)' }}>.</span>
            </h2>

            <p style={{
              color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.75,
              maxWidth: '520px', margin: '0 auto 24px',
            }}>
              Whether you have a product idea, need a technical collaborator, want to talk architecture —
              or just want to connect — I'm always up for a good conversation.
            </p>

            {/* Availability badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: '999px',
              background: available ? 'rgba(0,255,135,0.07)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${available ? 'rgba(0,255,135,0.25)' : 'rgba(255,255,255,0.1)'}`,
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: available ? 'var(--green)' : 'var(--text-muted)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: available ? 'var(--green)' : '#6b7280',
                boxShadow: available ? '0 0 6px var(--green)' : 'none',
                animation: available ? 'glow-pulse 2s ease-in-out infinite' : 'none',
              }} />
              {available
                ? 'Available for new projects · typically replies within 24h'
                : 'Currently heads-down on projects · will reply when free'}
            </div>
          </div>

          {/* Contact cards grid */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '48px',
            justifyContent: 'center',
          }}>

            {profile?.email && (
              <ContactCard
                label="email"
                value={profile.email}
                href={`mailto:${profile.email}`}
                copyValue={profile.email}
                accent="var(--cyan)"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                }
              />
            )}

            {profile?.phone && (
              <ContactCard
                label="phone / whatsapp"
                value={profile.phone}
                copyValue={profile.phone}
                accent="var(--cyan)"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.1 2.18 2 2 0 012.1 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                }
              />
            )}

            {profile?.linkedin_url && (
              <ContactCard
                label="linkedin"
                value={profile.linkedin_url.replace('https://www.linkedin.com/in/', '').replace('https://linkedin.com/in/', '').replace(/\/$/, '')}
                href={profile.linkedin_url}
                accent="#0a66c2"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                }
              />
            )}

            {profile?.github_url && (
              <ContactCard
                label="github"
                value={profile.github_url.replace('https://github.com/', '').replace(/\/$/, '')}
                href={profile.github_url}
                accent="var(--cyan)"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                }
              />
            )}
          </div>

          {/* Bottom note */}
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'var(--text-muted)', lineHeight: 1.7,
            }}>
              <span style={{ color: 'var(--cyan)', opacity: 0.6 }}>//</span>{' '}
              Prefer async? Email is best.{' '}
              <span style={{ color: 'var(--cyan)', opacity: 0.6 }}>//</span>{' '}
              Need quick answers? Ping on LinkedIn or WhatsApp.
            </p>
          </div>

        </div>
      </section>

      {/* ── Footer bar ───────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--card-border)',
        padding: '20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px',
        background: 'var(--black)',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--cyan)', opacity: 0.6 }}>©</span> {year} {profile?.name || 'Vishnu'} — built with{' '}
          <span style={{ color: 'var(--cyan)' }}>Go + React</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            v1.0.0 · {new Date().toISOString().slice(0, 10)}
          </div>

          {!isAdmin && (
            <button
              onClick={() => setShowLogin(true)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.25)', padding: '5px 12px', borderRadius: '6px',
                cursor: 'pointer', transition: 'all 0.3s', letterSpacing: '0.02em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'
                e.currentTarget.style.color = 'rgba(0,229,255,0.7)'
                e.currentTarget.style.background = 'rgba(0,229,255,0.04)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.25)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Hey, Me!
            </button>
          )}

          {isAdmin && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
              color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              admin active
            </div>
          )}
        </div>
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}