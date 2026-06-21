import { useState, useEffect, useRef } from 'react'
import ModeSelector from './ModeSelector'
import useMediaQuery from '../hooks/useMediaQuery'

const authorNavLinks = [
  { label: 'Featured',      href: '#author-featured' },
  { label: 'Books',         href: '#author-all-books' },
  { label: 'Upcoming',      href: '#author-coming-soon' },
  { label: 'Announcements', href: '#author-announcements' },
  { label: 'About',         href: '#author-about' },
  { label: 'Contact',       href: '#author-contact' },
]

export default function AuthorNavbar({ adminOffset, currentMode = 'author', onModeChange, authorName, latestAnnouncement, onAnnouncementClick }) {
  const [scrolled, setScrolled] = useState(false)
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [logoHovered, setLogoHovered] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useMediaQuery(900)
  const displayName = authorName?.trim() === 'Vishnu' ? 'Vishnu Vyas' : (authorName || 'Vishnu Vyas')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
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
        transition: 'all 0.4s ease',
        background: scrolled ? 'rgba(245,240,232,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(201,168,76,0.2)' : 'none',
        boxShadow: scrolled ? '0 1px 24px rgba(61,46,26,0.08)' : 'none',
        padding: isMobile ? '0 16px' : '0 48px',
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
              {displayName}
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
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {latestAnnouncement && (
                <AnnouncementBell
                  announcement={latestAnnouncement}
                  scrolled={scrolled}
                  onClick={onAnnouncementClick}
                />
              )}
              <button
                onClick={() => setMobileMenuOpen(v => !v)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(201,168,76,0.25)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: scrolled ? '#6b5c45' : '#f5f0e8',
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: '0.78rem',
                }}
              >
                {mobileMenuOpen ? 'Close' : 'Menu'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
              {authorNavLinks.map(link => (
                <button key={link.label}
                  onClick={() => {
                    const id = link.href.replace('#', '')
                    const el = document.getElementById(id)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '0.88rem',
                    color: scrolled ? '#6b5c45' : 'rgba(245,240,232,0.8)',
                    textDecoration: 'none',
                    background: 'none', border: 'none', padding: 0,
                    transition: 'color 0.2s',
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.target.style.color = scrolled ? '#c9a84c' : '#f5f0e8'}
                  onMouseLeave={e => e.target.style.color = scrolled ? '#6b5c45' : 'rgba(245,240,232,0.8)'}
                >
                  {link.label}
                </button>
              ))}

              {latestAnnouncement && (
                <AnnouncementBell
                  announcement={latestAnnouncement}
                  scrolled={scrolled}
                  onClick={onAnnouncementClick}
                />
              )}
            </div>
          )}
        </div>

        {isMobile && mobileMenuOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 0 14px' }}>
            {authorNavLinks.map(link => (
              <button
                key={link.label}
                onClick={() => {
                  const id = link.href.replace('#', '')
                  const el = document.getElementById(id)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  setMobileMenuOpen(false)
                }}
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: '0.86rem',
                  color: scrolled ? '#6b5c45' : '#f5f0e8',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(201,168,76,0.15)',
                  textAlign: 'left',
                  padding: '8px 0',
                }}
              >
                {link.label}
              </button>
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


// ── Announcement Bell ─────────────────────────────────────────────────────────
function AnnouncementBell({ announcement, scrolled, onClick }) {
  const [open, setOpen] = useState(false)
  const [seen, setSeen]  = useState(() => {
    const s = localStorage.getItem('last_seen_ann')
    return s && Number(s) >= announcement.id
  })
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleOpen = () => {
    setOpen(o => !o)
    if (!seen) { setSeen(true); localStorage.setItem('last_seen_ann', announcement.id) }
  }

  const handleView = () => {
    setOpen(false)
    if (onClick) onClick(announcement)
  }

  const amber = '#e8a030'
  const textCol = scrolled ? '#3d2e1a' : '#f5f0e8'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        title="Latest announcement"
        style={{
          background: open ? 'rgba(232,160,48,0.12)' : 'transparent',
          border: `1px solid ${open ? 'rgba(232,160,48,0.5)' : 'rgba(232,160,48,0.25)'}`,
          borderRadius: '50%', width: 34, height: 34,
          cursor: 'pointer', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,160,48,0.12)'; e.currentTarget.style.borderColor = 'rgba(232,160,48,0.5)' }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(232,160,48,0.25)' } }}
      >
        <BellIcon size={16} color={amber} />
        {!seen && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 7, height: 7, borderRadius: '50%',
            background: amber, boxShadow: `0 0 6px ${amber}`,
            animation: 'bellPulse 2s infinite',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 12px)', right: 0,
          width: 280, zIndex: 9999,
          background: '#1a1208',
          border: '1px solid rgba(232,160,48,0.35)',
          borderRadius: 10,
          boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(232,160,48,0.08)',
          animation: 'fadeInUp 0.18s ease',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 14px 8px',
            background: 'rgba(232,160,48,0.07)',
            borderBottom: '1px solid rgba(232,160,48,0.15)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <BellIcon size={12} color={amber} />
            <span style={{ fontFamily: "'Lora', serif", fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: amber }}>
              Latest Announcement
            </span>
          </div>
          {/* Content */}
          <div style={{ padding: '14px' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.92rem', fontWeight: 700, color: '#f5f0e8', marginBottom: 8, lineHeight: 1.3 }}>
              {announcement.title}
            </div>
            <div style={{ fontFamily: "'Lora', serif", fontSize: '0.72rem', color: 'rgba(245,240,232,0.45)', fontStyle: 'italic', marginBottom: 14 }}>
              {new Date(announcement.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              {announcement.pinned && <span style={{ marginLeft: 8 }}>📌</span>}
            </div>
            <button
              onClick={handleView}
              style={{
                width: '100%', padding: '8px', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(232,160,48,0.12)', border: '1px solid rgba(232,160,48,0.35)',
                color: amber, fontFamily: "'Lora', serif", fontSize: '0.78rem',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,160,48,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,160,48,0.12)'}
            >
              Read announcement →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function BellIcon({ size = 18, color = '#e8a030' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2a1 1 0 0 1 1 1v.5A6.5 6.5 0 0 1 18.5 10v4l1.5 2.5H4L5.5 14v-4A6.5 6.5 0 0 1 11 3.5V3a1 1 0 0 1 1-1z" stroke={color} strokeWidth="1.4" fill={`${color}18`} strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
