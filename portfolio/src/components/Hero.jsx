import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProfile, updateProfile, imgUrl } from '../api'
import TerminalTyper from './TerminalTyper'
import EditModal from './EditModal'

const PROFILE_FIELDS = [
  { key: 'name', label: 'name', required: true },
  { key: 'tagline', label: 'tagline' },
  { key: 'bio', label: 'bio', type: 'textarea' },
  { key: 'email', label: 'email' },
  { key: 'location', label: 'location' },
  { key: 'github_url', label: 'github_url' },
  { key: 'linkedin_url', label: 'linkedin_url' },
  { key: 'twitter_url', label: 'twitter_url' },
  { key: 'resume_url', label: 'resume_url' },
  { key: 'available', label: 'available for work', type: 'checkbox', placeholder: 'Currently available' },
]

export default function Hero() {
  const { isEditMode } = useAuth()
  const [profile, setProfile] = useState(null)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile({
      name: 'Vishnu', tagline: 'Full Stack Developer',
      bio: 'I build things for the web.', location: 'Chennai, India', available: true
    }))
  }, [])

  const handleSave = async (values) => {
    await updateProfile(values)
    setProfile(p => ({ ...p, ...values }))
  }

  const termLines = profile ? [
    `whoami → ${profile.name || 'Vishnu'}`,
    `role → ${profile.tagline || 'Developer'}`,
    `location → ${profile.location || 'Earth'}`,
    `status → ${profile.available ? 'open_to_work=true' : 'open_to_work=false'}`,
    `skills → [go, react, linux, bash, docker, ...]`,
  ] : []

  if (!profile) return (
    <section id="hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontSize: '0.85rem' }}>
        <span style={{ animation: 'blink 1s infinite' }}>█</span> loading...
      </div>
    </section>
  )

  return (
    <section id="hero" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      position: 'relative', overflow: 'hidden',
      padding: '120px 40px 80px',
    }}>
      {/* Grid bg */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
          {/* Left: text */}
          <div style={{ animation: 'fadeInUp 0.8s ease' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
              color: 'var(--cyan)', marginBottom: '16px', letterSpacing: '0.15em',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ width: 32, height: 1, background: 'var(--cyan)', display: 'inline-block' }} />
              HELLO, WORLD
            </div>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 700,
              lineHeight: 1.1, marginBottom: '16px',
              fontFamily: 'var(--font-sans)',
            }}>
              I'm{' '}
              <span style={{
                color: 'var(--cyan)',
                textShadow: '0 0 30px rgba(0,229,255,0.4)',
              }}>
                {profile.name || 'Vishnu'}
              </span>
            </h1>

            <div style={{
              fontSize: 'clamp(1rem, 2vw, 1.3rem)', color: 'var(--text-secondary)',
              marginBottom: '24px', fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ color: 'var(--cyan)', opacity: 0.6 }}>$</span>
              {profile.tagline || 'Full Stack Developer'}
            </div>

            {profile.bio && (
              <p style={{
                color: 'var(--text-secondary)', lineHeight: 1.7,
                maxWidth: '480px', marginBottom: '32px', fontSize: '0.95rem'
              }}>
                {profile.bio}
              </p>
            )}

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
              {profile.available && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.3)',
                  padding: '6px 14px', borderRadius: '20px',
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--green)'
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'glow-pulse 2s infinite' }} />
                  available for work
                </div>
              )}
              {profile.location && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)'
                }}>
                  📍 {profile.location}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noreferrer" style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
                  color: 'var(--cyan)', border: '1px solid var(--cyan)',
                  padding: '10px 20px', borderRadius: '6px',
                  background: 'rgba(0,229,255,0.05)', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.15)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.05)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  ⌥ GitHub
                </a>
              )}
              {profile.resume_url && (
                <a href={imgUrl(profile.resume_url)} target="_blank" rel="noreferrer" style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
                  color: 'var(--text-secondary)', border: '1px solid var(--card-border)',
                  padding: '10px 20px', borderRadius: '6px',
                  background: 'transparent', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cyan)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
                >
                  ↓ Resume
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
                  color: 'var(--text-muted)', border: '1px solid var(--card-border)',
                  padding: '10px 20px', borderRadius: '6px', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  in LinkedIn
                </a>
              )}
            </div>

            {isEditMode && (
              <button onClick={() => setShowEdit(true)} style={{
                marginTop: '20px', fontFamily: 'var(--font-mono)',
                background: 'rgba(0,229,255,0.05)', border: '1px dashed var(--cyan)',
                color: 'var(--cyan)', padding: '8px 16px', borderRadius: '6px', fontSize: '0.78rem'
              }}>
                ✎ edit profile
              </button>
            )}
          </div>

          {/* Right: terminal */}
          <div style={{ animation: 'fadeInUp 0.8s ease 0.2s both' }}>
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: '10px', overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,229,255,0.05)',
            }}>
              <div style={{
                background: '#111827', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '8px',
                borderBottom: '1px solid var(--card-border)'
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  zsh — vishnu@portfolio
                </span>
              </div>
              <div style={{ padding: '24px', minHeight: '200px' }}>
                {termLines.length > 0 && <TerminalTyper lines={termLines} speed={40} />}
              </div>
            </div>

            {/* Social links floating */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
              {profile.email && (
                <a href={`mailto:${profile.email}`} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', border: '1px solid var(--card-border)', borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.borderColor = 'var(--cyan)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--card-border)' }}
                >
                  ✉ {profile.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditModal
          title="edit profile"
          fields={PROFILE_FIELDS}
          initialValues={profile}
          onSave={handleSave}
          onClose={() => setShowEdit(false)}
        />
      )}
    </section>
  )
}
