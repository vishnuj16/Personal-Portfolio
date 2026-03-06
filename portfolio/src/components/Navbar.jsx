import { useState, useEffect } from 'react'

const navLinks = [
  { label: 'home', href: '#hero' },
  { label: 'projects', href: '#projects' },
  { label: 'skills', href: '#skills' },
  { label: 'experience', href: '#experience' },
  { label: 'education', href: '#education' },
  { label: 'contact', href: '#contact' },
]

export default function Navbar({ adminOffset }) {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('home')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
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
        height: '60px'
      }}>
        <a href="#hero" style={{
          fontFamily: 'var(--font-mono)', color: 'var(--cyan)',
          fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
          letterSpacing: '-0.02em'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>~/</span>vishnu
          <span style={{ animation: 'blink 1s infinite', color: 'var(--cyan)' }}>_</span>
        </a>
        <div style={{ display: 'flex', gap: '28px' }}>
          {navLinks.map(link => (
            <a key={link.label} href={link.href} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
              color: active === link.label ? 'var(--cyan)' : 'var(--text-muted)',
              textDecoration: 'none', transition: 'color 0.2s',
              letterSpacing: '0.05em'
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
  )
}
