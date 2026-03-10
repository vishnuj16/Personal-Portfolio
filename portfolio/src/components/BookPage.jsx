import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getBook, imgUrl } from '../api'
import { renderRichText, stripToPlain } from './RichText'

// ── Colour utilities ───────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = (hex || '#c9a84c').replace('#', '')
  return {
    r: parseInt(h.slice(0,2),16),
    g: parseInt(h.slice(2,4),16),
    b: parseInt(h.slice(4,6),16),
  }
}
function isLight(hex) {
  const { r, g, b } = hexToRgb(hex)
  return (r*299 + g*587 + b*114) / 1000 > 128
}
function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
// Darken by percent (0–1)
function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex)
  const d = v => Math.max(0, Math.floor(v * (1 - amt)))
  return `rgb(${d(r)},${d(g)},${d(b)})`
}
// Lighten
function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex)
  const l = v => Math.min(255, Math.floor(v + (255 - v) * amt))
  return `rgb(${l(r)},${l(g)},${l(b)})`
}

// ── Inject fonts once ──────────────────────────────────────────────────────────
function injectFonts() {
  if (document.getElementById('author-fonts')) return
  const link = document.createElement('link')
  link.id = 'author-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap'
  document.head.appendChild(link)
}

// ── Buy button ─────────────────────────────────────────────────────────────────
function BuyButton({ href, label, primary, accent }) {
  const [hov, setHov] = useState(false)
  if (!href) return null
  const light = isLight(accent)
  return (
    <a href={href} target="_blank" rel="noreferrer"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '13px 28px', borderRadius: 8, textDecoration: 'none',
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '0.88rem', fontWeight: 600,
        transition: 'all 0.22s ease',
        ...(primary ? {
          background: hov ? darken(accent, 0.1) : accent,
          color: light ? '#1a1410' : '#fff',
          boxShadow: hov ? `0 8px 28px ${rgba(accent, 0.45)}` : `0 4px 14px ${rgba(accent, 0.25)}`,
        } : {
          background: hov ? rgba(accent, 0.08) : 'transparent',
          color: accent,
          border: `1px solid ${rgba(accent, hov ? 0.6 : 0.3)}`,
        }),
      }}
    >
      {label}
      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>↗</span>
    </a>
  )
}

// ── Stat pill ──────────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }) {
  if (!value) return null
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      borderLeft: `2px solid ${rgba(accent, 0.4)}`, paddingLeft: 14,
    }}>
      <span style={{
        fontFamily: "'Lora', serif", fontSize: '0.58rem',
        color: rgba(accent, 0.7), letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>{label}</span>
      <span style={{
        fontFamily: "'Lora', serif", fontSize: '0.82rem',
        color: '#f5f0e8', fontStyle: 'italic',
      }}>{value}</span>
    </div>
  )
}

// ── Back button ────────────────────────────────────────────────────────────────
function BackButton({ onBack, accent }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onBack}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'transparent',
        border: `1px solid ${rgba(accent, hov ? 0.5 : 0.2)}`,
        borderRadius: 8, padding: '9px 18px',
        fontFamily: "'Lora', Georgia, serif", fontSize: '0.8rem',
        color: rgba(accent, hov ? 1 : 0.6),
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      ← Back
    </button>
  )
}

// ── Scroll progress bar ────────────────────────────────────────────────────────
function ScrollProgress({ accent }) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const handler = () => {
      const el = document.documentElement
      setPct(el.scrollTop / (el.scrollHeight - el.clientHeight) * 100)
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999,
      background: rgba(accent, 0.15),
    }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: accent,
        transition: 'width 0.1s linear',
        boxShadow: `0 0 8px ${rgba(accent, 0.6)}`,
      }} />
    </div>
  )
}

// ── Main BookPage ──────────────────────────────────────────────────────────────
export default function BookPage({ bookId, book: bookProp, onBack }) {
  const { isAdmin, isEditMode } = useAuth()
  const [book, setBook] = useState(bookProp || null)
  const [loading, setLoading] = useState(!bookProp)
  const [descExpanded, setDescExpanded] = useState(false)
  const heroRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => { injectFonts() }, [])

  useEffect(() => {
    if (bookProp) { setBook(bookProp); return }
    if (!bookId) return
    getBook(bookId)
      .then(setBook)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [bookId, bookProp])

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Scroll to top when page opens
  useEffect(() => { window.scrollTo(0, 0) }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#1a1410', fontFamily: "'Lora', serif", color: 'rgba(245,240,232,0.4)',
      fontStyle: 'italic',
    }}>
      Loading…
    </div>
  )

  if (!book) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      background: '#1a1410', fontFamily: "'Lora', serif",
    }}>
      <div style={{ fontSize: '3rem', opacity: 0.3 }}>📖</div>
      <div style={{ color: 'rgba(245,240,232,0.4)', fontStyle: 'italic' }}>Book not found</div>
      {onBack && <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(245,240,232,0.15)', borderRadius: 8, padding: '8px 20px', color: 'rgba(245,240,232,0.4)', cursor: 'pointer', fontFamily: "'Lora', serif" }}>← Back</button>}
    </div>
  )

  const accent    = book.theme_color || '#c9a84c'
  const coverSrc  = book.cover_url ? imgUrl(book.cover_url) : null
  const lightAccent = isLight(accent)

  // ── Coming Soon / WIP page ─────────────────────────────────────────────────
  if (book.coming_soon) {
    return <ComingSoonBookPage book={book} accent={accent} coverSrc={coverSrc} lightAccent={lightAccent} onBack={onBack} />
  }

  // Hero colours — always dark bg with accent tints
  const heroBg = `linear-gradient(160deg, ${darken(accent, 0.72)} 0%, ${darken(accent, 0.55)} 50%, #1a1410 100%)`

  const descWords = stripToPlain(book.description || '').split(' ')
  const shortDesc = descWords.length > 60 ? descWords.slice(0, 60).join(' ') + '…' : stripToPlain(book.description)
  const isLong = descWords.length > 60

  return (
    <div style={{ fontFamily: "'Lora', Georgia, serif", background: '#0e0b08', color: '#f5f0e8', minHeight: '100vh' }}>
      <ScrollProgress accent={accent} />

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{
        minHeight: '100vh', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center',
        background: heroBg,
      }}>
        {/* Noise texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }} />

        {/* Accent radial bloom */}
        <div style={{
          position: 'absolute', top: '30%', left: '15%',
          width: 700, height: 700,
          background: `radial-gradient(circle, ${rgba(accent, 0.18)} 0%, transparent 60%)`,
          pointerEvents: 'none',
          transform: `translateY(${scrollY * 0.15}px)`,
          transition: 'transform 0.05s linear',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '5%',
          width: 400, height: 400,
          background: `radial-gradient(circle, ${rgba(accent, 0.1)} 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />

        {/* Back button */}
        {onBack && (
          <div style={{ position: 'absolute', top: 28, left: 40, zIndex: 10 }}>
            <BackButton onBack={onBack} accent={accent} />
          </div>
        )}

        {/* Content */}
        <div style={{
          maxWidth: 1100, margin: '0 auto', width: '100%',
          padding: '140px 48px 100px',
          display: 'grid',
          gridTemplateColumns: coverSrc ? '1fr 420px' : '1fr',
          gap: 80, alignItems: 'center',
          position: 'relative', zIndex: 2,
        }}>
          {/* Left — text */}
          <div style={{ animation: 'fadeInUp 0.7s ease both' }}>
            {/* Eyebrow */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22,
              fontFamily: "'Lora', serif", fontSize: '0.7rem',
              color: accent, letterSpacing: '0.22em', textTransform: 'uppercase',
            }}>
              <span style={{ width: 36, height: 1, background: accent, opacity: 0.7, display: 'inline-block' }} />
              {book.book_type}{book.genre ? ` · ${book.genre}` : ''}
              {book.new_release && (
                <span style={{
                  background: accent, color: lightAccent ? '#1a1410' : '#fff',
                  padding: '2px 10px', borderRadius: 999, fontSize: '0.6rem',
                  fontWeight: 700, letterSpacing: '0.08em',
                }}>New Release</span>
              )}
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(2.6rem, 5.5vw, 4.4rem)',
              fontWeight: 900, lineHeight: 1.06,
              color: '#f5f0e8', margin: '0 0 18px',
              textShadow: `0 4px 40px ${rgba(accent, 0.25)}`,
            }}>
              {book.title}
            </h1>

            {/* Subtitle */}
            {book.subtitle && (
              <div style={{
                fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic',
                fontSize: '1.1rem', color: 'rgba(245,240,232,0.55)',
                marginBottom: 28, lineHeight: 1.55,
              }}>{book.subtitle}</div>
            )}

            {/* Description */}
            {book.description && (
              <div style={{ marginBottom: 36 }}>
                <div style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: '0.97rem', color: 'rgba(245,240,232,0.68)',
                  lineHeight: 1.85, maxWidth: 520,
                }}>
                  {descExpanded
                    ? renderRichText(book.description, { color: 'rgba(245,240,232,0.68)', headingColor: 'rgba(245,240,232,0.9)', accentColor: accent, lineHeight: 1.85, fontSize: '0.97rem', fontFamily: "'Lora', Georgia, serif" })
                    : <p style={{ margin: 0, fontFamily: "'Lora', Georgia, serif", fontSize: '0.97rem', color: 'rgba(245,240,232,0.68)', lineHeight: 1.85 }}>{shortDesc}</p>
                  }
                </div>
                {isLong && (
                  <button onClick={() => setDescExpanded(v => !v)} style={{
                    marginTop: 10, background: 'transparent', border: 'none', padding: 0,
                    fontFamily: "'Lora', serif", fontSize: '0.78rem', fontStyle: 'italic',
                    color: rgba(accent, 0.8), cursor: 'pointer',
                    borderBottom: `1px solid ${rgba(accent, 0.3)}`,
                  }}>
                    {descExpanded ? 'show less' : 'read more'}
                  </button>
                )}
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
              <BuyButton href={book.amazon_url} label="Get on Amazon" primary accent={accent} />
              <BuyButton href={book.goodreads_url} label="Goodreads" accent={accent} />
              <BuyButton href={book.other_buy_url} label="Buy Direct" accent={accent} />
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <StatPill label="Format" value={book.book_type} accent={accent} />
              <StatPill label="Genre" value={book.genre} accent={accent} />
              <StatPill label="Pages" value={book.pages} accent={accent} />
              <StatPill label="Published" value={book.published_at ? book.published_at.slice(0,7) : null} accent={accent} />
              {book.publisher && <StatPill label="Publisher" value={book.publisher} accent={accent} />}
              {book.isbn && <StatPill label="ISBN" value={book.isbn} accent={accent} />}
            </div>
          </div>

          {/* Right — cover */}
          {coverSrc && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              animation: 'fadeInUp 0.7s ease 0.15s both',
            }}>
              <div style={{
                position: 'relative',
                filter: `drop-shadow(0 30px 70px rgba(0,0,0,0.65)) drop-shadow(0 8px 20px ${rgba(accent, 0.3)})`,
              }}>
                {/* Glow behind cover */}
                <div style={{
                  position: 'absolute', inset: -30, borderRadius: 20,
                  background: `radial-gradient(ellipse, ${rgba(accent, 0.3)} 0%, transparent 70%)`,
                  filter: 'blur(20px)',
                  pointerEvents: 'none',
                }} />
                <img
                  src={coverSrc}
                  alt={book.title}
                  style={{
                    maxHeight: 500, maxWidth: 360, borderRadius: 8,
                    display: 'block', position: 'relative',
                    transform: `perspective(800px) rotateY(-4deg) rotateX(1deg)`,
                    transition: 'transform 0.4s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1.02)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'perspective(800px) rotateY(-4deg) rotateX(1deg)' }}
                />
                {/* Shimmer edge */}
                <div style={{
                  position: 'absolute', inset: -1, borderRadius: 9,
                  background: `linear-gradient(135deg, ${rgba(accent, 0.5)} 0%, transparent 40%, ${rgba(accent, 0.15)} 100%)`,
                  pointerEvents: 'none',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Scroll cue */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          animation: 'fadeInUp 1s ease 1.2s both',
        }}>
          <div style={{ fontFamily: "'Lora', serif", fontSize: '0.6rem', letterSpacing: '0.18em', color: rgba(accent, 0.4), textTransform: 'uppercase' }}>scroll</div>
          <div style={{ width: 1, height: 36, background: `linear-gradient(to bottom, ${rgba(accent, 0.5)}, transparent)` }} />
        </div>
      </section>

      {/* ── ABOUT THE BOOK ────────────────────────────────────────────────── */}
      <section style={{ background: '#fdf8f0', color: '#3d2e1a', padding: '96px 48px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {/* Chapter ornament */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 52 }}>
            <div style={{ flex: 1, height: 1, background: rgba(accent, 0.2) }} />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <div style={{ flex: 1, height: 1, background: rgba(accent, 0.2) }} />
          </div>

          <div style={{
            fontFamily: "'Lora', serif", fontSize: '0.72rem',
            color: accent, letterSpacing: '0.2em', textTransform: 'uppercase',
            marginBottom: 12, fontStyle: 'italic',
          }}>About the Book</div>

          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
            fontWeight: 700, color: '#3d2e1a', margin: '0 0 28px', lineHeight: 1.22,
          }}>{book.title}</h2>

          {book.description && (
            <div style={{
              fontFamily: "'Lora', Georgia, serif", fontSize: '1.02rem',
              color: '#6b5c45', lineHeight: 1.95,
              borderLeft: `3px solid ${rgba(accent, 0.35)}`, paddingLeft: 28,
            }}>
              {renderRichText(book.description, {
                fontFamily: "'Lora', Georgia, serif", fontSize: '1.02rem',
                color: '#6b5c45', lineHeight: 1.95,
                headingColor: '#3d2e1a', accentColor: accent,
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── BOOK DETAILS ──────────────────────────────────────────────────── */}
      <section style={{
        background: darken(accent, 0.7),
        padding: '80px 48px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            fontFamily: "'Lora', serif", fontSize: '0.7rem',
            color: rgba(accent, 0.7), letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 36, textAlign: 'center',
          }}>Book Details</div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 1,
            border: `1px solid ${rgba(accent, 0.15)}`,
            borderRadius: 12, overflow: 'hidden',
          }}>
            {[
              { label: 'Format',      value: book.book_type },
              { label: 'Genre',       value: book.genre },
              { label: 'Pages',       value: book.pages },
              { label: 'Published',   value: book.published_at ? new Date(book.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' }) : null },
              { label: 'Publisher',   value: book.publisher || (book.self_published ? 'Self-Published' : null) },
              { label: 'ISBN',        value: book.isbn },
            ].filter(d => d.value).map((d, i) => (
              <div key={i} style={{
                padding: '22px 24px',
                background: rgba(accent, 0.06),
                borderRight: `1px solid ${rgba(accent, 0.1)}`,
              }}>
                <div style={{
                  fontFamily: "'Lora', serif", fontSize: '0.6rem',
                  color: rgba(accent, 0.6), letterSpacing: '0.15em',
                  textTransform: 'uppercase', marginBottom: 6,
                }}>{d.label}</div>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontSize: '1rem',
                  color: '#f5f0e8', fontWeight: 600,
                }}>{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GET YOUR COPY ─────────────────────────────────────────────────── */}
      {(book.amazon_url || book.goodreads_url || book.other_buy_url) && (
        <section style={{ background: '#fdf8f0', padding: '96px 48px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Lora', serif", fontSize: '0.72rem',
              color: accent, letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 12, fontStyle: 'italic',
            }}>Available Now</div>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
              fontWeight: 700, color: '#3d2e1a',
              margin: '0 0 14px',
            }}>Get Your Copy</h2>
            <p style={{
              fontFamily: "'Lora', serif", fontStyle: 'italic',
              fontSize: '0.95rem', color: '#9a8060', lineHeight: 1.7,
              maxWidth: 420, margin: '0 auto 36px',
            }}>
              Find {book.title} at your preferred retailer or order direct.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <BuyButton href={book.amazon_url} label="Amazon" primary accent={accent} />
              <BuyButton href={book.goodreads_url} label="Goodreads" accent={accent} />
              <BuyButton href={book.other_buy_url} label="Buy Direct" accent={accent} />
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER BAR ────────────────────────────────────────────────────── */}
      <footer style={{
        background: '#1a1410', borderTop: `1px solid ${rgba(accent, 0.12)}`,
        padding: '20px 48px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{
          fontFamily: "'Lora', serif", fontSize: '0.72rem',
          color: 'rgba(245,240,232,0.25)', fontStyle: 'italic',
        }}>
          {book.title}{book.published_at ? ` · ${book.published_at.slice(0,4)}` : ''}
        </div>
        {onBack && (
          <button onClick={onBack} style={{
            background: 'transparent', border: `1px solid ${rgba(accent, 0.2)}`,
            borderRadius: 6, padding: '6px 16px', cursor: 'pointer',
            fontFamily: "'Lora', serif", fontSize: '0.75rem',
            color: rgba(accent, 0.5), transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = rgba(accent, 0.5); e.currentTarget.style.color = accent }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = rgba(accent, 0.2); e.currentTarget.style.color = rgba(accent, 0.5) }}
          >
            ← Back to Author Page
          </button>
        )}
      </footer>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ── ComingSoonBookPage ─────────────────────────────────────────────────────────
// A beautiful, dark, atmospheric page for upcoming / WIP books.
function ComingSoonBookPage({ book, accent, coverSrc, lightAccent, onBack }) {
  const heroBg = `linear-gradient(160deg, ${darken(accent, 0.78)} 0%, ${darken(accent, 0.62)} 60%, #0e0b06 100%)`

  return (
    <div style={{ fontFamily: "'Lora', Georgia, serif", background: '#0e0b06', color: '#f5f0e8', minHeight: '100vh' }}>

      {/* Back button */}
      {onBack && (
        <button onClick={onBack} style={{
          position: 'fixed', top: 24, left: 28, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 16px', borderRadius: 8,
          background: 'rgba(14,11,6,0.7)', backdropFilter: 'blur(10px)',
          border: `1px solid ${rgba(accent, 0.25)}`,
          fontFamily: "'Lora', serif", fontSize: '0.78rem', fontStyle: 'italic',
          color: rgba(accent, 0.75), cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = rgba(accent, 0.6); e.currentTarget.style.color = accent }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = rgba(accent, 0.25); e.currentTarget.style.color = rgba(accent, 0.75) }}>
          ← Back
        </button>
      )}

      {/* Hero */}
      <section style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', background: heroBg }}>
        {/* Background glow orbs */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.035, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23f5f0e8'/%3E%3Crect width='1' height='1' fill='%23c9a84c'/%3E%3C/svg%3E")`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 700, height: 700, background: `radial-gradient(circle, ${rgba(accent, 0.12)} 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: 500, height: 500, background: `radial-gradient(circle, ${rgba(accent, 0.08)} 0%, transparent 65%)`, pointerEvents: 'none' }} />

        {/* Animated corner decorations */}
        {[
          { top: 24, left: 24 }, { top: 24, right: 24 },
          { bottom: 24, left: 24 }, { bottom: 24, right: 24 },
        ].map((pos, i) => {
          const isRight = 'right' in pos, isBottom = 'bottom' in pos
          return (
            <div key={i} style={{ position: 'absolute', width: 50, height: 50, pointerEvents: 'none', zIndex: 5, ...pos }}>
              <div style={{ position: 'absolute', [isBottom ? 'bottom' : 'top']: 0, [isRight ? 'right' : 'left']: 0, width: '100%', height: 1.5, background: `linear-gradient(${isRight ? 'to left' : 'to right'}, ${accent}, transparent)`, animation: `borderGlow 3.5s ease-in-out infinite ${i * 0.4}s` }} />
              <div style={{ position: 'absolute', [isBottom ? 'bottom' : 'top']: 0, [isRight ? 'right' : 'left']: 0, width: 1.5, height: '100%', background: `linear-gradient(${isBottom ? 'to top' : 'to bottom'}, ${accent}, transparent)`, animation: `borderGlow 3.5s ease-in-out infinite ${i * 0.4}s` }} />
              <div style={{ position: 'absolute', [isBottom ? 'bottom' : 'top']: 3, [isRight ? 'right' : 'left']: 3, width: 5, height: 5, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${rgba(accent, 0.8)}`, animation: `gemPulse 2.5s ease-in-out infinite ${i * 0.5}s` }} />
            </div>
          )
        })}

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '120px 48px 80px', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: coverSrc ? '1fr 1fr' : '1fr', gap: 72, alignItems: 'center' }}>

            {/* Text side */}
            <div style={{ animation: 'fadeInUp 0.8s ease' }}>
              {/* WIP badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 24, background: rgba(accent, 0.12), border: `1px solid ${rgba(accent, 0.35)}`, marginBottom: 24 }}>
                <span style={{ fontSize: '0.8rem' }}>✍️</span>
                <span style={{ fontFamily: "'Lora', serif", fontSize: '0.65rem', color: accent, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Work in Progress</span>
              </div>

              {/* Title */}
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', color: '#f5f0e8', fontWeight: 900, lineHeight: 1.08, margin: '0 0 14px', textShadow: `0 2px 30px ${rgba(accent, 0.25)}` }}>
                {book.title}
              </h1>
              {book.subtitle && (
                <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '1.1rem', color: 'rgba(245,240,232,0.55)', marginBottom: 28, lineHeight: 1.5 }}>{book.subtitle}</div>
              )}

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <div style={{ width: 36, height: 2, background: accent, borderRadius: 1 }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', border: `2px solid ${rgba(accent, 0.6)}` }} />
                <div style={{ width: 18, height: 2, background: rgba(accent, 0.4), borderRadius: 1 }} />
              </div>

              {/* Description */}
              {book.description && (
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1rem', color: 'rgba(245,240,232,0.65)', lineHeight: 1.9, marginBottom: 36, maxWidth: 460 }}>
                  {renderRichText(book.description, {
                    color: 'rgba(245,240,232,0.65)',
                    headingColor: '#f5f0e8',
                    accentColor: accent,
                    lineHeight: 1.9,
                    fontSize: '1rem',
                    fontFamily: "'Lora', Georgia, serif",
                    fontStyle: 'italic',
                  })}
                </div>
              )}

              {/* Genre + estimated chips */}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {book.genre && (
                  <div style={{ borderLeft: `2px solid ${rgba(accent, 0.5)}`, paddingLeft: 12 }}>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: '0.55rem', color: rgba(accent, 0.6), letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>genre</div>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: '0.82rem', color: 'rgba(245,240,232,0.75)', fontStyle: 'italic' }}>{book.genre}</div>
                  </div>
                )}
                {book.estimated_release && (
                  <div style={{ borderLeft: `2px solid ${rgba(accent, 0.5)}`, paddingLeft: 12 }}>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: '0.55rem', color: rgba(accent, 0.6), letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>expected</div>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: '0.82rem', color: accent, fontWeight: 600 }}>{book.estimated_release}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Cover side */}
            {coverSrc && (
              <div style={{ display: 'flex', justifyContent: 'center', animation: 'fadeInUp 0.8s ease 0.15s both' }}>
                <div style={{ position: 'relative' }}>
                  {/* Glow behind cover */}
                  <div style={{ position: 'absolute', inset: -20, background: `radial-gradient(ellipse, ${rgba(accent, 0.25)} 0%, transparent 70%)`, borderRadius: 20, pointerEvents: 'none' }} />
                  <img src={coverSrc} alt={book.title} style={{
                    maxHeight: 480, maxWidth: 340,
                    borderRadius: 10, display: 'block',
                    position: 'relative',
                    boxShadow: `0 28px 80px rgba(0,0,0,0.6), 0 4px 20px ${rgba(accent, 0.3)}`,
                    transform: 'perspective(700px) rotateY(-4deg)',
                    transition: 'transform 0.4s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'perspective(700px) rotateY(0deg) scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'perspective(700px) rotateY(-4deg)'}
                  />
                  {/* WIP stamp overlay */}
                  <div style={{
                    position: 'absolute', bottom: 20, right: -12,
                    background: rgba(accent, 0.92), color: darken(accent, 0.7),
                    fontFamily: "'Playfair Display', serif", fontWeight: 900,
                    fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase',
                    padding: '5px 14px', borderRadius: 4,
                    transform: 'rotate(-2deg)',
                    boxShadow: `0 4px 16px ${rgba(accent, 0.4)}`,
                  }}>Coming Soon</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        {book.description && book.description.length > 200 && (
          <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, animation: 'fadeInUp 1s ease 1s both' }}>
            <div style={{ fontFamily: "'Lora', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: rgba(accent, 0.4), textTransform: 'uppercase' }}>scroll</div>
            <div style={{ width: 1, height: 36, background: `linear-gradient(to bottom, ${rgba(accent, 0.45)}, transparent)` }} />
          </div>
        )}
      </section>

      {/* ── Watch This Space section ───────────────────────────────────────── */}
      <section style={{ padding: '96px 48px', background: 'linear-gradient(180deg, #0e0b06 0%, #1a1208 50%, #0e0b06 100%)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          {/* Ornamental heading */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
            <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(to right, transparent, ${rgba(accent, 0.4)})` }} />
            <span style={{ fontFamily: "'Lora', serif", fontSize: '0.6rem', color: rgba(accent, 0.55), letterSpacing: '0.22em', textTransform: 'uppercase', fontStyle: 'italic' }}>Watch This Space</span>
            <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(to left, transparent, ${rgba(accent, 0.4)})` }} />
          </div>

          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.65rem', color: rgba(accent, 0.3), letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 24 }}>·&nbsp;&nbsp;·&nbsp;&nbsp;·</div>

          <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: '1.05rem', color: 'rgba(245,240,232,0.38)', lineHeight: 2, margin: 0 }}>
            This story is still being written. Check back for updates,
            {book.estimated_release ? ` or look for it ${book.estimated_release}.` : ' or follow along as it takes shape.'}
          </p>

          {/* Decorative dot row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 48 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: rgba(accent, 0.15 + i * 0.06) }} />
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes borderGlow { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        @keyframes gemPulse { 0%,100% { transform:scale(1); opacity:0.6; } 50% { transform:scale(1.6); opacity:1; } }
      `}</style>
    </div>
  )
}