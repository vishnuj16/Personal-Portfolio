import { useState } from 'react'
import LoginModal from './LoginModal'
import { useAuth } from '../context/AuthContext'

export default function Footer({ profile }) {
  const { isAdmin } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  const year = new Date().getFullYear()

  return (
    <>
      {/* Contact Section */}
      <section id="contact" style={{
        padding: '100px 40px',
        background: 'var(--black-alt)',
        borderTop: '1px solid var(--card-border)'
      }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)', letterSpacing: '0.15em', marginBottom: '12px' }}>
            $ contact
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 700, fontFamily: 'var(--font-sans)', marginBottom: '16px' }}>
            Let's build something<span style={{ color: 'var(--cyan)' }}>.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '36px', maxWidth: '500px', margin: '0 auto 36px' }}>
            I'm currently open to new opportunities. Whether you have a project in mind, a question, or just want to say hi — my inbox is always open.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {profile?.email && (
              <a href={`mailto:${profile.email}`} style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
                color: 'var(--cyan)', border: '1px solid var(--cyan)',
                padding: '12px 28px', borderRadius: '8px',
                background: 'rgba(0,229,255,0.05)', transition: 'all 0.25s',
                display: 'inline-block', textDecoration: 'none'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.15)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.05)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                ✉ say hello
              </a>
            )}
            {profile?.github_url && (
              <a href={profile.github_url} target="_blank" rel="noreferrer" style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
                color: 'var(--text-secondary)', border: '1px solid var(--card-border)',
                padding: '12px 28px', borderRadius: '8px',
                background: 'transparent', transition: 'all 0.25s',
                display: 'inline-block', textDecoration: 'none'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--card-border)' }}
              >
                ⌥ GitHub
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer bar */}
      <footer style={{
        borderTop: '1px solid var(--card-border)',
        padding: '20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px',
        background: 'var(--black)'
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
                cursor: 'pointer', transition: 'all 0.3s',
                letterSpacing: '0.02em'
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
              color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '6px'
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
