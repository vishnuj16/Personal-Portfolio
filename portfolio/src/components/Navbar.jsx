import { useState, useEffect } from 'react'
import ModeSelector from './ModeSelector'

const navLinks = [
  { label: 'home',       href: '#hero' },
  { label: 'projects',   href: '#projects' },
  { label: 'skills',     href: '#skills' },
  { label: 'experience', href: '#experience' },
  { label: 'education',  href: '#education' },
  { label: 'contact',    href: '#contact' },
]

// currentMode: 'dev' | 'author'
// onModeChange(mode): called when user switches mode
export default function Navbar({ adminOffset, currentMode = 'dev', onModeChange }) {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('home')
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [logoHovered, setLogoHovered] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav style={{
        position: 'fixed', top: adminOffset, left: 0, right: 0, zIndex: 999,
        transition: 'all 0.3s',
        background: scrolled ? 'rgba(3,7,18,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--card-border)' : 'none',
        padding: '0 40px',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '60px',
        }}>

          {/* ── Logo — clickable mode switcher ── */}
          <button
            onClick={() => setShowModeSelector(true)}
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
            title="Switch mode"
            style={{
              background: 'transparent', border: 'none', padding: 0,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              position: 'relative',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)', color: 'var(--cyan)',
              fontWeight: 700, fontSize: '1rem',
              letterSpacing: '-0.02em', transition: 'opacity 0.2s',
              opacity: logoHovered ? 0.7 : 1,
            }}>
              <span style={{ color: 'var(--text-muted)' }}>~/</span>
              {currentMode === 'author' ? 'author' : 'developer'}
              <span style={{ animation: 'blink 1s infinite', color: 'var(--cyan)' }}>_</span>
            </span>
            {/* Mode indicator dot */}
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: currentMode === 'author' ? '#c9a84c' : 'var(--cyan)',
              opacity: 0.7, transition: 'background 0.3s',
              boxShadow: currentMode === 'author' ? '0 0 6px #c9a84c' : '0 0 6px var(--cyan)',
            }} />
            {/* Hover hint */}
            {logoHovered && (
              <span style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 6,
                fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                color: 'var(--text-muted)', whiteSpace: 'nowrap',
                background: 'rgba(3,7,18,0.9)', border: '1px solid var(--card-border)',
                padding: '3px 8px', borderRadius: 4,
                pointerEvents: 'none',
              }}>
                switch mode
              </span>
            )}
          </button>

          {/* ── Nav links ── */}
          <div style={{ display: 'flex', gap: '28px' }}>
            {navLinks.map(link => (
              <a key={link.label} href={link.href} style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                color: active === link.label ? 'var(--cyan)' : 'var(--text-muted)',
                textDecoration: 'none', transition: 'color 0.2s',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={e => e.target.style.color = 'var(--cyan)'}
              onMouseLeave={e => e.target.style.color = active === link.label ? 'var(--cyan)' : 'var(--text-muted)'}
              onClick={() => setActive(link.label)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {showModeSelector && (
        <ModeSelector
          currentMode={currentMode}
          onSelect={onModeChange}
          onClose={() => setShowModeSelector(false)}
        />
      )}
    </>
  )
}