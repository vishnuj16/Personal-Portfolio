import { useState, useEffect } from 'react'
import ModeSelector from './ModeSelector'
import useMediaQuery from '../hooks/useMediaQuery'
import storiesLogo from '../static/StoriesByVyasLogoWhite.png'

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useMediaQuery(820)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false)
  }, [isMobile])

  return (
    <>
      <nav style={{
        position: 'fixed', top: adminOffset, left: 0, right: 0, zIndex: 999,
        transition: 'all 0.3s',
        background: scrolled ? 'rgba(3,7,18,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--card-border)' : 'none',
        padding: isMobile ? '0 16px' : '0 40px',
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
            {currentMode === 'author' ? (
              <img
                src={{storiesLogo}}
                alt="Stories by Vyas"
                style={{
                  height: 38,
                  width: 'auto',
                  opacity: logoHovered ? 0.75 : 1,
                  transition: 'opacity 0.2s',
                }}
              />
            ) : (
              <>
                <span style={{
                  fontFamily: 'var(--font-mono)', color: 'var(--cyan)',
                  fontWeight: 700, fontSize: '1rem',
                  letterSpacing: '-0.02em', transition: 'opacity 0.2s',
                  opacity: logoHovered ? 0.7 : 1,
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>~/</span>
                  developer
                  <span style={{ animation: 'blink 1s infinite', color: 'var(--cyan)' }}>_</span>
                </span>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--cyan)',
                  opacity: 0.7,
                  boxShadow: '0 0 6px var(--cyan)',
                }} />
              </>
)}
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
          {isMobile ? (
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              style={{
                background: 'transparent',
                border: '1px solid var(--card-border)',
                color: 'var(--cyan)',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: '0.7rem',
                letterSpacing: '0.08em',
              }}
            >
              {mobileMenuOpen ? 'close' : 'menu'}
            </button>
          ) : (
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
          )}
        </div>

        {isMobile && mobileMenuOpen && (
          <div style={{
            position: 'fixed',
            top: `calc(60px + ${adminOffset}px)`,
            left: 0,
            right: 0,
            zIndex: 998,
            padding: '8px 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: 'rgba(3,7,18,0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => {
                  setActive(link.label)
                  setMobileMenuOpen(false)
                }}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.76rem',
                  color: active === link.label ? 'var(--cyan)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  letterSpacing: '0.05em',
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
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
