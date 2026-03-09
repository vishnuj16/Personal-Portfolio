import { useState, useEffect } from 'react'
import ModeSelector from './ModeSelector'

const authorNavLinks = [
  { label: 'Books',     href: '#author-books' },
  { label: 'Featured',  href: '#author-featured' },
  { label: 'About',     href: '#author-about' },
  { label: 'Contact',   href: '#author-contact' },
]

export default function AuthorNavbar({ adminOffset, currentMode = 'author', onModeChange, authorName }) {
  const [scrolled, setScrolled] = useState(false)
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [logoHovered, setLogoHovered] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav style={{
        position: 'fixed', top: adminOffset, left: 0, right: 0, zIndex: 999,
        transition: 'all 0.4s ease',
        background: scrolled ? 'rgba(245,240,232,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(201,168,76,0.2)' : 'none',
        boxShadow: scrolled ? '0 1px 24px rgba(61,46,26,0.08)' : 'none',
        padding: '0 48px',
      }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '68px',
        }}>

          {/* ── Logo ── */}
          <button
            onClick={() => setShowModeSelector(true)}
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
            style={{
              background: 'transparent', border: 'none', padding: 0,
              cursor: 'pointer', position: 'relative',
            }}
          >
            <span style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '1.15rem', fontWeight: 700,
              color: scrolled ? '#3d2e1a' : '#f5f0e8',
              letterSpacing: '0.02em',
              transition: 'all 0.3s',
              opacity: logoHovered ? 0.7 : 1,
              textShadow: scrolled ? 'none' : '0 2px 12px rgba(0,0,0,0.3)',
            }}>
              Author
            </span>
            {logoHovered && (
              <span style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 8,
                fontFamily: "'Lora', Georgia, serif",
                fontSize: '0.65rem', fontStyle: 'italic',
                color: '#9a8060', whiteSpace: 'nowrap',
                background: 'rgba(245,240,232,0.98)',
                border: '1px solid rgba(201,168,76,0.2)',
                padding: '4px 10px', borderRadius: 4,
                boxShadow: '0 4px 16px rgba(61,46,26,0.1)',
                pointerEvents: 'none',
              }}>
                switch to developer
              </span>
            )}
          </button>

          {/* ── Nav links ── */}
          <div style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
            {authorNavLinks.map(link => (
              <a key={link.label} href={link.href} style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: '0.88rem',
                color: scrolled ? '#6b5c45' : 'rgba(245,240,232,0.8)',
                textDecoration: 'none',
                transition: 'color 0.2s',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => e.target.style.color = scrolled ? '#c9a84c' : '#f5f0e8'}
              onMouseLeave={e => e.target.style.color = scrolled ? '#6b5c45' : 'rgba(245,240,232,0.8)'}
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