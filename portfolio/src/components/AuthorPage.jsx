import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getBooks, getProfile, updateProfile, deleteBook, imgUrl, uploadFile, setFeaturedBooks, setNewRelease } from '../api'
import AuthorNavbar from './AuthorNavbar'
import AuthorAdminBanner from './AuthorAdminBanner'
import BookEditModal from './BookEditModal'
import LoginModal from './LoginModal'
import BookPage from './BookPage'
import FeaturedBooksModal from './FeaturedBooksModal'
import NewReleaseModal from './NewReleaseModal'
import { stripToPlain } from './RichText'

// ─── Google Fonts (injected once) ────────────────────────────────────────────
function injectFonts() {
  if (document.getElementById('author-fonts')) return
  const link = document.createElement('link')
  link.id = 'author-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap'
  document.head.appendChild(link)
}

// ─── Colour helpers ───────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = (hex || '#c9a84c').replace('#', '')
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }
}
function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex)
  const d = v => Math.max(0, Math.floor(v * (1 - amt)))
  return `rgb(${d(r)},${d(g)},${d(b)})`
}
function isLight(hex) {
  const { r, g, b } = hexToRgb(hex)
  return (r*299 + g*587 + b*114) / 1000 > 128
}

// ─── Decorative ornament ──────────────────────────────────────────────────────
const Ornament = ({ color = '#c9a84c', size = 24 }) => (
  <svg width={size} height={size * 0.4} viewBox="0 0 60 20" fill="none">
    <path d="M0 10 Q15 0 30 10 Q45 20 60 10" stroke={color} strokeWidth="1" fill="none" opacity="0.6"/>
    <circle cx="30" cy="10" r="2.5" fill={color} opacity="0.8"/>
    <circle cx="8" cy="10" r="1.5" fill={color} opacity="0.5"/>
    <circle cx="52" cy="10" r="1.5" fill={color} opacity="0.5"/>
  </svg>
)

const Divider = ({ color = 'rgba(201,168,76,0.25)' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '0 auto', maxWidth: 200 }}>
    <div style={{ flex: 1, height: 1, background: color }} />
    <Ornament color="#c9a84c" size={32} />
    <div style={{ flex: 1, height: 1, background: color }} />
  </div>
)

// ─── Book card (theme-coloured, clickable) ────────────────────────────────────
function BookCard({ book, isEditMode, onEdit, onDelete, onView, featured = false }) {
  const [hovered, setHovered] = useState(false)
  const coverUrl = book.cover_url ? imgUrl(book.cover_url) : null
  const accent = book.theme_color || '#c9a84c'
  const light = isLight(accent)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isEditMode && onView(book)}
      style={{
        background: hovered ? '#fffdf7' : '#fdf8f0',
        border: `1px solid ${hovered ? rgba(accent, 0.55) : rgba(accent, 0.18)}`,
        borderRadius: featured ? 16 : 12,
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        boxShadow: hovered
          ? `0 12px 48px ${rgba(accent, 0.18)}, 0 2px 8px rgba(61,46,26,0.06)`
          : '0 2px 12px rgba(61,46,26,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        position: 'relative',
        cursor: isEditMode ? 'default' : 'pointer',
      }}
    >
      {/* Accent top bar */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${accent}, ${rgba(accent, 0.3)})`,
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.25s',
      }} />

      {/* Cover */}
      <div style={{
        height: featured ? 280 : 220,
        background: coverUrl ? 'transparent' : `linear-gradient(135deg, ${rgba(accent, 0.15)} 0%, ${rgba(accent, 0.05)} 100%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {coverUrl ? (
          <img src={coverUrl} alt={book.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease',
              transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
        ) : (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: featured ? '2.5rem' : '2rem', marginBottom: 12, opacity: 0.35 }}>📖</div>
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: featured ? '1rem' : '0.85rem',
              color: accent, fontStyle: 'italic', lineHeight: 1.4,
            }}>{book.title}</div>
          </div>
        )}

        {/* Hover overlay with "View book" cue */}
        {!isEditMode && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to top, ${rgba(accent, hovered ? 0.3 : 0)} 0%, transparent 60%)`,
            transition: 'all 0.3s',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 16,
          }}>
            {hovered && (
              <span style={{
                fontFamily: "'Lora', serif", fontSize: '0.72rem', fontStyle: 'italic',
                color: light ? '#1a1410' : '#f5f0e8',
                background: rgba(accent, 0.9), padding: '4px 14px', borderRadius: 20,
                animation: 'fadeInUp 0.15s ease',
              }}>View book →</span>
            )}
          </div>
        )}

        {/* Badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {book.new_release && (
            <span style={{
              background: accent, color: light ? '#1a1410' : '#f5f0e8',
              padding: '3px 8px', borderRadius: 999, fontSize: '0.6rem',
              fontFamily: "'Lora', serif", fontWeight: 700,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>New</span>
          )}
          {book.featured && !book.new_release && (
            <span style={{
              background: 'rgba(245,240,232,0.92)', color: accent, padding: '3px 8px',
              borderRadius: 999, fontSize: '0.6rem', fontFamily: "'Lora', serif",
              border: `1px solid ${rgba(accent, 0.4)}`,
            }}>Featured</span>
          )}
        </div>

        {/* Edit controls */}
        {isEditMode && (
          <div style={{
            position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6,
            opacity: hovered ? 1 : 0, transition: 'opacity 0.2s',
          }}>
            <button onClick={e => { e.stopPropagation(); onEdit(book) }} style={{
              background: 'rgba(245,240,232,0.95)', border: `1px solid ${rgba(accent, 0.4)}`,
              borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
              fontFamily: "'Lora', serif", fontSize: '0.7rem', color: '#6b5c45',
            }}>✎</button>
            <button onClick={e => { e.stopPropagation(); onDelete(book) }} style={{
              background: 'rgba(245,240,232,0.95)', border: '1px solid rgba(200,60,40,0.3)',
              borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
              fontFamily: "'Lora', serif", fontSize: '0.7rem', color: '#b43c28',
            }}>✕</button>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: featured ? '20px 22px' : '16px 18px' }}>
        <div style={{
          fontFamily: "'Lora', Georgia, serif", fontSize: '0.65rem',
          color: accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
        }}>
          {book.book_type}{book.genre ? ` · ${book.genre}` : ''}
        </div>
        <h3 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: featured ? '1.15rem' : '1rem',
          color: '#3d2e1a', margin: '0 0 6px', lineHeight: 1.3, fontWeight: 700,
        }}>{book.title}</h3>
        {book.subtitle && (
          <div style={{
            fontFamily: "'Lora', serif", fontSize: '0.78rem', fontStyle: 'italic',
            color: '#9a8060', marginBottom: 8,
          }}>{book.subtitle}</div>
        )}
        {book.description && (
          <p style={{
            fontFamily: "'Lora', Georgia, serif", fontSize: '0.8rem',
            color: '#6b5c45', lineHeight: 1.6, margin: '0 0 14px',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{book.description}</p>
        )}
        {!isEditMode && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {book.amazon_url && <BuyLink href={book.amazon_url} accent={accent}>Amazon</BuyLink>}
            {book.goodreads_url && <BuyLink href={book.goodreads_url} accent={accent} secondary>Goodreads</BuyLink>}
            {book.other_buy_url && <BuyLink href={book.other_buy_url} accent={accent} secondary>Buy Direct</BuyLink>}
          </div>
        )}
      </div>
    </div>
  )
}

function BuyLink({ href, children, secondary, accent }) {
  const [hovered, setHovered] = useState(false)
  const light = isLight(accent)
  return (
    <a href={href} target="_blank" rel="noreferrer"
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: "'Lora', Georgia, serif", fontSize: '0.72rem',
        padding: '5px 12px', borderRadius: 6,
        background: secondary
          ? (hovered ? rgba(accent, 0.1) : 'transparent')
          : (hovered ? darken(accent, 0.08) : accent),
        border: secondary ? `1px solid ${rgba(accent, 0.3)}` : 'none',
        color: secondary ? accent : (light ? '#1a1410' : '#f5f0e8'),
        textDecoration: 'none', transition: 'all 0.2s',
      }}>
      {children}
    </a>
  )
}

// ─── Section headers ──────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 52 }}>
      <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.72rem', color: '#c9a84c', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12, fontStyle: 'italic' }}>{eyebrow}</div>
      <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 700, color: '#3d2e1a', margin: '0 0 14px', lineHeight: 1.2 }}>{title}</h2>
      {subtitle && <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: '0.95rem', color: '#9a8060', maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.7 }}>{subtitle}</p>}
      <Divider />
    </div>
  )
}
function SectionHeaderDark({ eyebrow, title }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '0.72rem', color: '#c9a84c', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12, fontStyle: 'italic' }}>{eyebrow}</div>
      <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 700, color: '#f5f0e8', margin: '0 0 20px', lineHeight: 1.2 }}>{title}</h2>
      <Divider color="rgba(201,168,76,0.2)" />
    </div>
  )
}

// ─── AuthorTaglineEditor ──────────────────────────────────────────────────────
function AuthorTaglineEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const save = async () => { setSaving(true); await onSave(draft); setSaving(false); setEditing(false) }
  if (!editing) return (
    <button onClick={() => { setDraft(value); setEditing(true) }} style={{
      background: 'transparent', border: '1px dashed rgba(201,168,76,0.35)', borderRadius: 7, padding: '5px 14px',
      fontFamily: "'Lora', serif", fontSize: '0.7rem', fontStyle: 'italic',
      color: 'rgba(201,168,76,0.6)', cursor: 'pointer', marginBottom: 24,
    }}>✎ {value ? 'edit tagline' : 'add author tagline'}</button>
  )
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
      <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus placeholder="Your author tagline…"
        style={{ padding: '8px 16px', borderRadius: 8, minWidth: 280, background: 'rgba(245,240,232,0.1)', border: '1px solid rgba(201,168,76,0.5)', fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '0.9rem', color: '#f5f0e8', outline: 'none' }}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }} />
      <button onClick={save} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#1a1410', fontFamily: "'Playfair Display', serif", fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>{saving ? '…' : 'Save'}</button>
      <button onClick={() => setEditing(false)} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(245,240,232,0.15)', color: 'rgba(245,240,232,0.4)', fontFamily: "'Lora', serif", fontSize: '0.8rem', cursor: 'pointer' }}>×</button>
    </div>
  )
}

// ─── Main AuthorPage ──────────────────────────────────────────────────────────
export default function AuthorPage({ onModeChange }) {
  const { isAdmin, isEditMode } = useAuth()
  const [books, setBooks] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingBook, setEditingBook] = useState(null)
  const [showBookModal, setShowBookModal] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterGenre, setFilterGenre] = useState('')
  const [viewingBook, setViewingBook] = useState(null)   // book detail navigation
  const [showFeaturedModal, setShowFeaturedModal] = useState(false)
  const [showNewReleaseModal, setShowNewReleaseModal] = useState(false)
  const adminOffset = isAdmin ? 37 : 0

  useEffect(() => { injectFonts() }, [])

  useEffect(() => {
    Promise.all([getBooks(), getProfile()])
      .then(([b, p]) => { setBooks(b || []); setProfile(p) })
      .finally(() => setLoading(false))
  }, [])

  const reload = () => getBooks().then(setBooks)
  const handleSave = () => reload()
  const handleDelete = async (book) => {
    if (!confirm(`Delete "${book.title}"?`)) return
    try { await deleteBook(book.id); reload() } catch (e) { alert(e.message) }
  }
  const handleSetFeatured = async (ids) => {
    await setFeaturedBooks(ids)
    reload()
  }
  const handleSetNewRelease = async (id) => {
    await setNewRelease(id ?? 0)
    reload()
  }

  const newRelease = books.find(b => b.new_release)
  const featured    = books.filter(b => b.featured)           // all featured books, shown in slideshow
  const comingSoon  = books.filter(b => b.coming_soon)
  const allTypes    = [...new Set(books.filter(b => !b.coming_soon).map(b => b.book_type).filter(Boolean))]
  const allGenres   = [...new Set(books.map(b => b.genre).filter(Boolean))]
  const filtered    = books.filter(b => {
    if (b.coming_soon) return false  // don't show coming soon in All Works
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !(b.description || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterType && b.book_type !== filterType) return false
    if (filterGenre && b.genre !== filterGenre) return false
    return true
  })

  // ── Book detail page ────────────────────────────────────────────────────────
  if (viewingBook) {
    return (
      <BookPage
        book={viewingBook}
        onBack={() => { setViewingBook(null); setTimeout(() => window.scrollTo(0,0), 50) }}
      />
    )
  }

  // ── Hero accent derived from new release theme colour ───────────────────────
  const heroAccent     = newRelease?.theme_color || '#c9a84c'
  const heroAccentLight = isLight(heroAccent)
  const heroBg = newRelease?.theme_color
    ? `linear-gradient(160deg, ${darken(heroAccent, 0.72)} 0%, ${darken(heroAccent, 0.52)} 50%, #1a1410 100%)`
    : 'linear-gradient(160deg, #2c1f0e 0%, #3d2b18 45%, #4a3520 100%)'

  const sectionPadding = { padding: '96px 48px' }
  const innerMax = { maxWidth: 1080, margin: '0 auto' }

  return (
    <div style={{ fontFamily: "'Lora', Georgia, serif", background: '#f5f0e8', minHeight: '100vh', color: '#3d2e1a' }}>
      <AuthorAdminBanner />
      <AuthorNavbar adminOffset={adminOffset} currentMode="author" onModeChange={onModeChange} authorName={profile?.name} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section id="author-hero" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', background: heroBg }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23f5f0e8'/%3E%3Crect width='1' height='1' fill='%23c9a84c'/%3E%3C/svg%3E")` }} />
        <div style={{ position: 'absolute', top: '40%', left: '30%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: `radial-gradient(circle, ${rgba(heroAccent, 0.18)} 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-5%', right: '8%', width: 400, height: 400, background: `radial-gradient(circle, ${rgba(heroAccent, 0.1)} 0%, transparent 65%)`, pointerEvents: 'none' }} />

        {/* Celebratory corner borders — animated, theme-coloured */}
        {newRelease && (<>
          {/* Top-left corner */}
          <div style={{ position: 'absolute', top: 20, left: 20, width: 70, height: 70, pointerEvents: 'none', zIndex: 5 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 2, background: `linear-gradient(to right, ${heroAccent}, transparent)`, animation: 'borderGlow 3s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: 2, height: '100%', background: `linear-gradient(to bottom, ${heroAccent}, transparent)`, animation: 'borderGlow 3s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', top: 3, left: 3, width: 6, height: 6, borderRadius: '50%', background: heroAccent, boxShadow: `0 0 8px ${rgba(heroAccent, 0.8)}`, animation: 'gemPulse 2.5s ease-in-out infinite' }} />
          </div>
          {/* Top-right corner */}
          <div style={{ position: 'absolute', top: 20, right: 20, width: 70, height: 70, pointerEvents: 'none', zIndex: 5 }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: 2, background: `linear-gradient(to left, ${heroAccent}, transparent)`, animation: 'borderGlow 3s ease-in-out infinite 0.5s' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 2, height: '100%', background: `linear-gradient(to bottom, ${heroAccent}, transparent)`, animation: 'borderGlow 3s ease-in-out infinite 0.5s' }} />
            <div style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: heroAccent, boxShadow: `0 0 8px ${rgba(heroAccent, 0.8)}`, animation: 'gemPulse 2.5s ease-in-out infinite 0.5s' }} />
          </div>
          {/* Bottom-left corner */}
          <div style={{ position: 'absolute', bottom: 20, left: 20, width: 70, height: 70, pointerEvents: 'none', zIndex: 5 }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 2, background: `linear-gradient(to right, ${heroAccent}, transparent)`, animation: 'borderGlow 3s ease-in-out infinite 1s' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 2, height: '100%', background: `linear-gradient(to top, ${heroAccent}, transparent)`, animation: 'borderGlow 3s ease-in-out infinite 1s' }} />
            <div style={{ position: 'absolute', bottom: 3, left: 3, width: 6, height: 6, borderRadius: '50%', background: heroAccent, boxShadow: `0 0 8px ${rgba(heroAccent, 0.8)}`, animation: 'gemPulse 2.5s ease-in-out infinite 1s' }} />
          </div>
          {/* Bottom-right corner */}
          <div style={{ position: 'absolute', bottom: 20, right: 20, width: 70, height: 70, pointerEvents: 'none', zIndex: 5 }}>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '100%', height: 2, background: `linear-gradient(to left, ${heroAccent}, transparent)`, animation: 'borderGlow 3s ease-in-out infinite 1.5s' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 2, height: '100%', background: `linear-gradient(to top, ${heroAccent}, transparent)`, animation: 'borderGlow 3s ease-in-out infinite 1.5s' }} />
            <div style={{ position: 'absolute', bottom: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: heroAccent, boxShadow: `0 0 8px ${rgba(heroAccent, 0.8)}`, animation: 'gemPulse 2.5s ease-in-out infinite 1.5s' }} />
          </div>
          {/* Mid-edge accent marks */}
          <div style={{ position: 'absolute', top: '50%', left: 20, transform: 'translateY(-50%)', width: 2, height: 40, background: `linear-gradient(to bottom, transparent, ${rgba(heroAccent, 0.6)}, transparent)`, animation: 'borderGlow 4s ease-in-out infinite 0.3s', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)', width: 2, height: 40, background: `linear-gradient(to bottom, transparent, ${rgba(heroAccent, 0.6)}, transparent)`, animation: 'borderGlow 4s ease-in-out infinite 0.8s', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', height: 2, width: 40, background: `linear-gradient(to right, transparent, ${rgba(heroAccent, 0.6)}, transparent)`, animation: 'borderGlow 4s ease-in-out infinite 0.6s', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', height: 2, width: 40, background: `linear-gradient(to right, transparent, ${rgba(heroAccent, 0.6)}, transparent)`, animation: 'borderGlow 4s ease-in-out infinite 1.1s', pointerEvents: 'none' }} />
        </>)}

        <div style={{ ...innerMax, position: 'relative', width: '100%', padding: '140px 48px 100px' }}>
          {newRelease ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
              <div style={{ animation: 'fadeInUp 0.8s ease' }}>
                {/* Author pen name */}
                <div style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1rem', fontWeight: 700,
                  color: '#f5f0e8',
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  marginBottom: 14,
                  opacity: 0.9,
                  textShadow: `0 0 20px ${rgba(heroAccent, 0.4)}`,
                }}>
                  {profile?.name || 'Vishnu Vyas'}
                </div>
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.72rem', color: heroAccent, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 32, height: 1, background: heroAccent, opacity: 0.7, display: 'inline-block' }} />
                  Now Available
                </div>
                <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', color: '#f5f0e8', fontWeight: 900, lineHeight: 1.08, margin: '0 0 16px', textShadow: `0 2px 30px ${rgba(heroAccent, 0.25)}` }}>
                  {newRelease.title}
                </h1>
                {newRelease.subtitle && <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: '1.05rem', color: 'rgba(245,240,232,0.6)', marginBottom: 24, lineHeight: 1.5 }}>{newRelease.subtitle}</div>}
                {newRelease.description && <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.95rem', color: 'rgba(245,240,232,0.7)', lineHeight: 1.8, marginBottom: 36, maxWidth: 440 }}>{stripToPlain(newRelease.description).slice(0, 220)}{stripToPlain(newRelease.description).length > 220 ? '…' : ''}</p>}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
                  <button onClick={() => setViewingBook(newRelease)} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.9rem', fontWeight: 600, padding: '13px 32px', borderRadius: 8, background: heroAccent, color: heroAccentLight ? '#1a1410' : '#f5f0e8', border: 'none', cursor: 'pointer', boxShadow: `0 4px 20px ${rgba(heroAccent, 0.4)}`, transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 32px ${rgba(heroAccent, 0.6)}` }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 4px 20px ${rgba(heroAccent, 0.4)}` }}>
                    Discover the Book
                  </button>
                  {newRelease.amazon_url && (
                    <a href={newRelease.amazon_url} target="_blank" rel="noreferrer" style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.88rem', padding: '13px 24px', borderRadius: 8, border: `1px solid ${rgba(heroAccent, 0.4)}`, color: 'rgba(245,240,232,0.75)', textDecoration: 'none', transition: 'all 0.2s', background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = rgba(heroAccent, 0.8); e.currentTarget.style.color = '#f5f0e8' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = rgba(heroAccent, 0.4); e.currentTarget.style.color = 'rgba(245,240,232,0.75)' }}>
                      Get Your Copy ↗
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {newRelease.book_type && <StatChip label="format" value={newRelease.book_type} accent={heroAccent} />}
                  {newRelease.genre && <StatChip label="genre" value={newRelease.genre} accent={heroAccent} />}
                  {newRelease.pages && <StatChip label="pages" value={newRelease.pages} accent={heroAccent} />}
                  {newRelease.published_at && <StatChip label="published" value={newRelease.published_at.slice(0,7)} accent={heroAccent} />}
                </div>
                {isEditMode && (
                  <button onClick={() => { setEditingBook(newRelease); setShowBookModal(true) }} style={{ marginTop: 20, background: 'transparent', border: `1px dashed ${rgba(heroAccent, 0.4)}`, borderRadius: 7, padding: '6px 16px', fontFamily: "'Lora', serif", fontSize: '0.72rem', color: rgba(heroAccent, 0.7), cursor: 'pointer' }}>✎ edit this release</button>
                )}
              </div>

              {/* Cover — clickable */}
              <div onClick={() => setViewingBook(newRelease)} style={{ display: 'flex', justifyContent: 'center', animation: 'fadeInUp 0.8s ease 0.15s both', cursor: 'pointer' }}>
                {newRelease.cover_url ? (
                  <div style={{ position: 'relative', filter: `drop-shadow(0 24px 60px rgba(0,0,0,0.5)) drop-shadow(0 4px 16px ${rgba(heroAccent, 0.3)})` }}>
                    <img src={imgUrl(newRelease.cover_url)} alt={newRelease.title}
                      style={{ maxHeight: 440, maxWidth: 320, borderRadius: 6, display: 'block', transform: 'perspective(700px) rotateY(-3deg)', transition: 'transform 0.4s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'perspective(700px) rotateY(0deg) scale(1.02)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'perspective(700px) rotateY(-3deg)' }} />
                    <div style={{ position: 'absolute', inset: -2, borderRadius: 8, pointerEvents: 'none', background: `linear-gradient(135deg, ${rgba(heroAccent, 0.4)} 0%, transparent 50%, ${rgba(heroAccent, 0.2)} 100%)` }} />
                  </div>
                ) : (
                  <NoBookCover title={newRelease.title} large accent={heroAccent} />
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', animation: 'fadeInUp 0.8s ease' }}>
              <div style={{ fontFamily: "'Lora', serif", fontSize: '0.8rem', color: '#c9a84c', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Author</div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2.8rem, 7vw, 5rem)', color: '#f5f0e8', fontWeight: 900, margin: '0 0 20px', lineHeight: 1.05, textShadow: '0 4px 40px rgba(201,168,76,0.2)' }}>
                {profile?.name || 'Vishnu Vyas'}
              </h1>
              <div style={{ width: 80, height: 1, background: 'rgba(201,168,76,0.4)', margin: '0 auto 24px' }} />
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: '1.1rem', color: 'rgba(245,240,232,0.6)', maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.8 }}>
                {profile?.author_tagline || profile?.tagline || 'Writer of stories that matter.'}
              </p>
              {isEditMode && <AuthorTaglineEditor value={profile?.author_tagline || ''} onSave={async val => { await updateProfile({ author_tagline: val }); setProfile(p => ({ ...p, author_tagline: val })) }} />}
              {isEditMode && <button onClick={() => { setEditingBook({}); setShowBookModal(true) }} style={{ padding: '12px 28px', background: '#c9a84c', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Playfair Display', serif", fontSize: '0.9rem', fontWeight: 600, color: '#1a1410' }}>+ Add First Book</button>}
            </div>
          )}
        </div>

        <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, animation: 'fadeInUp 1s ease 1s both' }}>
          <div style={{ fontFamily: "'Lora', serif", fontSize: '0.65rem', letterSpacing: '0.15em', color: rgba(heroAccent, 0.45), textTransform: 'uppercase' }}>scroll</div>
          <div style={{ width: 1, height: 36, background: `linear-gradient(to bottom, ${rgba(heroAccent, 0.5)}, transparent)` }} />
        </div>

        {/* ── "Set New Release" admin button — floats bottom-right of hero ── */}
        {isEditMode && (
          <button
            onClick={() => setShowNewReleaseModal(true)}
            style={{
              position: 'absolute', bottom: 28, right: 36,
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 8,
              background: 'rgba(26,20,16,0.7)', backdropFilter: 'blur(8px)',
              border: `1px solid ${rgba(heroAccent, 0.4)}`,
              fontFamily: "'Lora', Georgia, serif", fontSize: '0.75rem',
              color: heroAccent, cursor: 'pointer',
              transition: 'all 0.2s', zIndex: 10,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,20,16,0.9)'; e.currentTarget.style.borderColor = rgba(heroAccent, 0.8) }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(26,20,16,0.7)'; e.currentTarget.style.borderColor = rgba(heroAccent, 0.4) }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Set New Release
          </button>
        )}
      </section>

      {/* ── FEATURED — full-screen editorial slideshow ───────────────────── */}
      <FeaturedSlideshow
        books={featured}
        isEditMode={isEditMode}
        onManage={() => setShowFeaturedModal(true)}
        onView={setViewingBook}
      />

      {/* ── ALL BOOKS ─────────────────────────────────────────────────────── */}
      <section id="author-all-books" style={{ ...sectionPadding, background: '#f5f0e8' }}>
        <div style={innerMax}>
          <SectionHeader eyebrow="The Complete Catalogue" title="All Works" />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b5c45" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles, descriptions…"
                style={{ width: '100%', padding: '10px 14px 10px 38px', background: '#fdf8f0', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, fontFamily: "'Lora', serif", fontSize: '0.85rem', color: '#3d2e1a', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'} />
            </div>
            {allTypes.length > 1 && (
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '10px 14px', background: '#fdf8f0', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, fontFamily: "'Lora', serif", fontSize: '0.82rem', color: '#6b5c45', cursor: 'pointer', outline: 'none' }}>
                <option value="">All types</option>
                {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {allGenres.length > 1 && (
              <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)} style={{ padding: '10px 14px', background: '#fdf8f0', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, fontFamily: "'Lora', serif", fontSize: '0.82rem', color: '#6b5c45', cursor: 'pointer', outline: 'none' }}>
                <option value="">All genres</option>
                {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
            {(search || filterType || filterGenre) && (
              <button onClick={() => { setSearch(''); setFilterType(''); setFilterGenre('') }} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontFamily: "'Lora', serif", fontSize: '0.75rem', color: '#9a8060' }}>Clear</button>
            )}
            {isEditMode && (
              <button onClick={() => { setEditingBook({}); setShowBookModal(true) }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 8, border: 'none',
                background: '#c9a84c', cursor: 'pointer',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '0.82rem', fontWeight: 600, color: '#1a1410',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>+ Add Book</button>
            )}
          </div>
          {filtered.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
              {filtered.map(book => (
                <BookCard key={book.id} book={book} isEditMode={isEditMode}
                  onEdit={b => { setEditingBook(b); setShowBookModal(true) }}
                  onDelete={handleDelete} onView={setViewingBook} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.4 }}>📚</div>
              <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', color: '#9a8060' }}>
                {books.length === 0 ? 'No books added yet.' : 'No results found.'}
              </div>
              {isEditMode && books.length === 0 && (
                <button onClick={() => { setEditingBook({}); setShowBookModal(true) }} style={{ marginTop: 16, padding: '10px 24px', background: '#c9a84c', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Playfair Display', serif", fontSize: '0.88rem', fontWeight: 600, color: '#1a1410' }}>+ Add Your First Book</button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── AUTHOR BIO ────────────────────────────────────────────────────── */}
      <AuthorBioSection profile={profile} isEditMode={isEditMode} onUpdate={async (patch) => { await updateProfile(patch); setProfile(p => ({ ...p, ...patch })) }} />

      {/* ── COMING SOON ───────────────────────────────────────────────────── */}
      <ComingSoonSection books={comingSoon} isEditMode={isEditMode} onAdd={() => { setEditingBook({ coming_soon: true }); setShowBookModal(true) }} onEdit={b => { setEditingBook(b); setShowBookModal(true) }} onDelete={handleDelete} onView={setViewingBook} />

      {/* ── CONTACT ───────────────────────────────────────────────────────── */}
      <section id="author-contact" style={{ ...sectionPadding, background: '#fdf8f0' }}>
        <div style={{ ...innerMax, maxWidth: 640, textAlign: 'center' }}>
          <SectionHeader eyebrow="Get in Touch" title="Letters Welcome" subtitle="For rights enquiries, readings, collaborations, or just to say hello — the door is always open." />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 8 }}>
            {profile?.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <a href={`mailto:${profile.email}`} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.05rem', fontWeight: 600, color: '#c9a84c', textDecoration: 'none', borderBottom: '1px solid rgba(201,168,76,0.25)', paddingBottom: 2, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'}>{profile.email}</a>
              </div>
            )}
            {profile?.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.4a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.58 16l.34.9z"/></svg>
                </div>
                <a href={`tel:${profile.phone}`} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.05rem', fontWeight: 600, color: '#c9a84c', textDecoration: 'none', borderBottom: '1px solid rgba(201,168,76,0.25)', paddingBottom: 2, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'}>{profile.phone}</a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(201,168,76,0.15)', padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: '#1a1410' }}>
        <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.75rem', color: 'rgba(245,240,232,0.3)', fontStyle: 'italic' }}>
          © {new Date().getFullYear()} {profile?.name || 'Vishnu Vyas'} — All rights reserved
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {!isAdmin && (
            <button onClick={() => setShowLogin(true)} style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.72rem', fontStyle: 'italic', background: 'transparent', border: '1px solid rgba(201,168,76,0.1)', color: 'rgba(245,240,232,0.2)', padding: '5px 14px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)'; e.currentTarget.style.color = 'rgba(201,168,76,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)'; e.currentTarget.style.color = 'rgba(245,240,232,0.2)' }}>Author's desk</button>
          )}
          {isAdmin && (
            <div style={{ fontFamily: "'Lora', serif", fontSize: '0.72rem', fontStyle: 'italic', color: '#c9a84c', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c9a84c' }} />
              at the desk
            </div>
          )}
        </div>
      </footer>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showBookModal && (
        <BookEditModal
          book={editingBook?.id ? editingBook : null}
          onSave={handleSave}
          onClose={() => { setShowBookModal(false); setEditingBook(null) }}
        />
      )}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} theme="author" />}
      {showFeaturedModal && (
        <FeaturedBooksModal
          books={books}
          onSave={handleSetFeatured}
          onClose={() => setShowFeaturedModal(false)}
        />
      )}
      {showNewReleaseModal && (
        <NewReleaseModal
          books={books}
          currentNewReleaseId={newRelease?.id ?? null}
          onSave={handleSetNewRelease}
          onClose={() => setShowNewReleaseModal(false)}
        />
      )}

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes borderGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; filter: drop-shadow(0 0 4px currentColor); }
        }
        @keyframes gemPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        @keyframes inkReveal {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0% 0 0); }
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}

// ─── Small helpers ─────────────────────────────────────────────────────────────
function StatChip({ label, value, accent = '#c9a84c' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${rgba(accent, 0.35)}`, paddingLeft: 12 }}>
      <span style={{ fontFamily: "'Lora', serif", fontSize: '0.58rem', color: rgba(accent, 0.65), letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: "'Lora', serif", fontSize: '0.8rem', color: 'rgba(245,240,232,0.8)', fontStyle: 'italic' }}>{value}</span>
    </div>
  )
}
function NoBookCover({ title, large, accent = '#c9a84c' }) {
  return (
    <div style={{ width: large ? 280 : 200, height: large ? 380 : 280, background: `linear-gradient(135deg, ${darken(accent, 0.5)}, ${darken(accent, 0.7)})`, border: `1px solid ${rgba(accent, 0.25)}`, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
      <div style={{ fontSize: large ? '2.5rem' : '1.8rem', opacity: 0.3, marginBottom: 12 }}>📖</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: large ? '1rem' : '0.82rem', color: 'rgba(245,240,232,0.5)', lineHeight: 1.4 }}>{title}</div>
    </div>
  )
}
const darkLinkStyle = { fontFamily: "'Lora', Georgia, serif", fontSize: '0.85rem', color: 'rgba(245,240,232,0.5)', textDecoration: 'none', border: '1px solid rgba(245,240,232,0.1)', borderRadius: 6, padding: '8px 18px', transition: 'all 0.2s' }

// ── FeaturedSlideshow ─────────────────────────────────────────────────────────
// Light parchment background, horizontal catalogue layout — distinct from the dark hero
function FeaturedSlideshow({ books, isEditMode, onManage, onView }) {
  const [idx, setIdx]           = useState(0)
  const [phase, setPhase]       = useState('in')   // 'in' | 'out'
  const [descOpen, setDescOpen] = useState(false)
  const intervalRef             = useRef(null)

  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (books.length <= 1) return
    intervalRef.current = setInterval(() => {
      setPhase('out')
      setDescOpen(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % books.length)
        setPhase('in')
      }, 400)
    }, 5500)
  }, [books.length])

  const goTo = useCallback((next) => {
    if (phase === 'out' || next === idx) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setPhase('out')
    setDescOpen(false)
    setTimeout(() => {
      setIdx(next)
      setPhase('in')
      startTimer()
    }, 400)
  }, [phase, idx, startTimer])

  useEffect(() => {
    setIdx(0); setPhase('in'); setDescOpen(false)
    startTimer()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [books.length])

  // Empty state
  if (books.length === 0) {
    return (
      <section id="author-featured" style={{
        background: 'linear-gradient(160deg, #fdf8f0 0%, #f5ede0 100%)',
        padding: '80px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, borderTop: '1px solid rgba(201,168,76,0.15)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
      }}>
        <div style={{ fontFamily: "'Lora', serif", fontSize: '0.68rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.22em', textTransform: 'uppercase', fontStyle: 'italic' }}>Featured Titles</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: 'rgba(61,46,26,0.2)', fontWeight: 700 }}>No featured books yet</div>
        {isEditMode && (
          <button onClick={onManage} style={{ marginTop: 8, padding: '10px 24px', borderRadius: 8, background: '#c9a84c', border: 'none', fontFamily: "'Playfair Display', serif", fontSize: '0.85rem', fontWeight: 600, color: '#1a1410', cursor: 'pointer' }}>⭐ Choose Featured Books</button>
        )}
      </section>
    )
  }

  const book   = books[idx] || books[0]
  const accent    = book.theme_color || '#c9a84c'
  const cover     = book.cover_url ? imgUrl(book.cover_url) : null
  const desc      = book.description || ''
  const plainDesc = stripToPlain(desc)
  const shortDesc = plainDesc.split(' ').slice(0, 36).join(' ') + (plainDesc.split(' ').length > 36 ? '…' : '')

  return (
    <section id="author-featured" style={{
      position: 'relative',
      background: 'linear-gradient(180deg, #fdf8f0 0%, #f5ede0 100%)',
      padding: '0',
      overflow: 'hidden',
      borderTop: '1px solid rgba(201,168,76,0.18)',
    }}>
      {/* Decorative top rule */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '44px 48px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.3))' }} />
        <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(201,168,76,0.4)', display: 'block' }} />
          <span style={{ fontFamily: "'Lora', serif", fontSize: '0.62rem', color: '#c9a84c', letterSpacing: '0.24em', textTransform: 'uppercase', fontStyle: 'italic' }}>Selected Works</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(201,168,76,0.4)', display: 'block' }} />
        </div>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.3))' }} />
      </div>

      {/* Section title */}
      <div style={{ textAlign: 'center', padding: '20px 48px 0' }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 900, color: '#3d2e1a', margin: 0, letterSpacing: '-0.01em' }}>Featured Titles</h2>
        <div style={{ width: 40, height: 2, background: '#c9a84c', margin: '12px auto 0', borderRadius: 1 }} />
      </div>

      {/* Manage button (edit mode) */}
      {isEditMode && (
        <div style={{ position: 'absolute', top: 40, right: 40, zIndex: 10 }}>
          <button onClick={onManage} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 7,
            background: 'rgba(245,240,232,0.9)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(201,168,76,0.3)',
            fontFamily: "'Lora', serif", fontSize: '0.7rem', color: '#9a8060',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Manage Featured
          </button>
        </div>
      )}

      {/* Main content */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '48px 48px 64px',
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: 64, alignItems: 'start',
        opacity: phase === 'out' ? 0 : 1,
        transform: phase === 'out' ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}>
        {/* Cover column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div
            onClick={() => onView(book)}
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            {/* Decorative coloured shadow-block behind cover */}
            <div style={{
              position: 'absolute', top: 12, left: 12, right: -12, bottom: -12,
              background: rgba(accent, 0.18),
              borderRadius: 8,
              border: `1px solid ${rgba(accent, 0.25)}`,
            }} />
            {cover ? (
              <img src={cover} alt={book.title} style={{
                width: 220, height: 300, objectFit: 'cover',
                borderRadius: 6, display: 'block', position: 'relative',
                boxShadow: `0 12px 40px rgba(61,46,26,0.25), 0 2px 8px ${rgba(accent, 0.2)}`,
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02) translateY(-3px)'; e.currentTarget.style.boxShadow = `0 20px 56px rgba(61,46,26,0.3), 0 4px 16px ${rgba(accent, 0.3)}` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; e.currentTarget.style.boxShadow = `0 12px 40px rgba(61,46,26,0.25), 0 2px 8px ${rgba(accent, 0.2)}` }}
              />
            ) : (
              <div style={{ width: 220, height: 300, background: `linear-gradient(135deg, ${rgba(accent, 0.25)}, ${rgba(accent, 0.08)})`, border: `1px solid ${rgba(accent, 0.25)}`, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, position: 'relative' }}>
                <div style={{ fontSize: '2rem', opacity: 0.3 }}>📖</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '0.85rem', color: '#6b5c45', lineHeight: 1.4, textAlign: 'center', padding: '0 16px' }}>{book.title}</div>
              </div>
            )}
          </div>

          {/* Dot nav */}
          {books.length > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              {books.map((b, i) => (
                <button key={i} onClick={() => goTo(i)} style={{ padding: 0, border: 'none', cursor: 'pointer', background: 'none' }}>
                  <div style={{
                    width: i === idx ? 22 : 7, height: 7, borderRadius: 4,
                    background: i === idx ? accent : 'rgba(201,168,76,0.25)',
                    transition: 'all 0.35s ease',
                  }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text column */}
        <div style={{ paddingTop: 12 }}>
          {/* Index + meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <span style={{
              fontFamily: 'Georgia, serif', fontSize: '3rem', fontWeight: 900, lineHeight: 1,
              color: rgba(accent, 0.2), letterSpacing: '-0.03em', userSelect: 'none',
            }}>{String(idx + 1).padStart(2, '0')}</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${rgba(accent, 0.4)}, transparent)` }} />
            <span style={{ fontFamily: "'Lora', serif", fontSize: '0.65rem', color: '#b09070', letterSpacing: '0.12em', textTransform: 'uppercase', fontStyle: 'italic' }}>
              {book.book_type}{book.genre ? ` · ${book.genre}` : ''}
            </span>
          </div>

          {/* Title */}
          <h3
            onClick={() => onView(book)}
            onMouseEnter={e => e.currentTarget.style.color = darken(accent, 0.3)}
            onMouseLeave={e => e.currentTarget.style.color = '#3d2e1a'}
            style={{ cursor: 'pointer', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, color: '#3d2e1a', lineHeight: 1.1, margin: '0 0 10px', transition: 'color 0.2s' }}
          >{book.title}</h3>

          {book.subtitle && (
            <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '1rem', color: '#9a8060', marginBottom: 18, lineHeight: 1.5 }}>{book.subtitle}</div>
          )}

          {/* Ornamental rule */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <div style={{ width: 32, height: 2, background: accent, borderRadius: 1 }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', border: `2px solid ${rgba(accent, 0.5)}` }} />
            <div style={{ width: 16, height: 2, background: rgba(accent, 0.3), borderRadius: 1 }} />
          </div>

          {/* Description */}
          {desc && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '0.95rem', color: '#6b5c45', lineHeight: 1.9, margin: 0, fontStyle: 'italic' }}>
                {descOpen ? plainDesc : shortDesc}
              </p>
              {plainDesc.split(' ').length > 36 && (
                <button onClick={() => setDescOpen(v => !v)} style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, fontFamily: "'Lora', serif", fontSize: '0.75rem', fontStyle: 'italic', color: rgba(accent, 0.8), cursor: 'pointer', borderBottom: `1px solid ${rgba(accent, 0.3)}` }}>
                  {descOpen ? 'show less' : 'read more'}
                </button>
              )}
            </div>
          )}

          {/* Meta chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
            {[
              book.published_at && { label: 'Published', val: book.published_at.slice(0,7) },
              book.pages && { label: 'Pages', val: book.pages },
              book.publisher && { label: 'Publisher', val: book.publisher },
              book.self_published && { label: 'Publisher', val: 'Self-Published' },
            ].filter(Boolean).map((m, i) => (
              <div key={i} style={{ padding: '5px 12px', borderRadius: 20, background: rgba(accent, 0.08), border: `1px solid ${rgba(accent, 0.2)}`, fontFamily: "'Lora', serif", fontSize: '0.72rem', color: '#9a8060' }}>
                <span style={{ color: accent, fontStyle: 'italic', marginRight: 4 }}>{m.label}:</span>{m.val}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => onView(book)} style={{
              padding: '11px 26px', borderRadius: 8, border: 'none',
              background: accent, color: isLight(accent) ? '#1a1410' : '#f5f0e8',
              fontFamily: "'Playfair Display', serif", fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: `0 4px 16px ${rgba(accent, 0.35)}`,
            }}>Read More</button>
            {book.amazon_url && (
              <a href={book.amazon_url} target="_blank" rel="noreferrer" style={{
                padding: '11px 20px', borderRadius: 8,
                border: `1px solid ${rgba(accent, 0.4)}`,
                color: '#9a8060', textDecoration: 'none',
                fontFamily: "'Lora', serif", fontSize: '0.82rem',
                transition: 'all 0.2s',
              }}>Get Copy ↗</a>
            )}
          </div>
        </div>
      </div>

      {/* Prev/Next arrows */}
      {books.length > 1 && (
        <>
          <button onClick={() => goTo((idx - 1 + books.length) % books.length)} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(245,240,232,0.9)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', color: '#9a8060', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button onClick={() => goTo((idx + 1) % books.length)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(245,240,232,0.9)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', color: '#9a8060', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </>
      )}

      {/* Decorative bottom rule */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 48px 44px' }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2))' }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(201,168,76,0.3)', margin: '0 16px' }} />
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.2))' }} />
      </div>
    </section>
  )
}

// ── AuthorBioSection ──────────────────────────────────────────────────────────
function AuthorBioSection({ profile, isEditMode, onUpdate }) {
  const [editing, setEditing]     = useState(false)
  const [bioVal, setBioVal]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [photoUp, setPhotoUp]     = useState(false)
  const [photoDrag, setPhotoDrag] = useState(false)

  const startEdit = () => { setBioVal(profile?.author_bio || profile?.bio || ''); setEditing(true) }
  const cancel    = () => setEditing(false)

  const saveBio = async () => {
    setSaving(true)
    await onUpdate({ author_bio: bioVal })
    setSaving(false)
    setEditing(false)
  }

  const handlePhoto = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setPhotoUp(true)
    try {
      const res = await uploadFile(file, 'profile')
      await onUpdate({ avatar_url: res.url })
    } catch(e) { alert('Photo upload failed: ' + e.message) }
    finally { setPhotoUp(false) }
  }

  const [photoHover, setPhotoHover] = useState(false)
  const bio    = profile?.author_bio || profile?.bio || 'Writer. Storyteller. Builder of worlds.'
  const name   = profile?.name || 'Vishnu Vyas'
  const avatar = profile?.avatar_url

  return (
    <section id="author-about" style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, #1e1508 0%, #2c1f0e 50%, #1a1006 100%)',
      padding: '100px 48px',
    }}>
      {/* Decorative background pattern */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='30' cy='30' r='1.5' fill='%23c9a84c'/%3E%3C/svg%3E")`, backgroundSize: '60px 60px', pointerEvents: 'none' }} />
      {/* Gold glow */}
      <div style={{ position: 'absolute', top: '-10%', right: '10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
            <div style={{ flex: 1, maxWidth: 100, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.4))' }} />
            <span style={{ fontFamily: "'Lora', serif", fontSize: '0.65rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.22em', textTransform: 'uppercase', fontStyle: 'italic' }}>The Author</span>
            <div style={{ flex: 1, maxWidth: 100, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.4))' }} />
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#f5f0e8', margin: 0, textShadow: '0 2px 30px rgba(201,168,76,0.15)' }}>{name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
            <div style={{ width: 20, height: 1, background: 'rgba(201,168,76,0.35)' }} />
            <div style={{ width: 5, height: 5, borderRadius: '50%', border: '1.5px solid rgba(201,168,76,0.5)' }} />
            <div style={{ width: 40, height: 1, background: 'rgba(201,168,76,0.35)' }} />
            <div style={{ width: 5, height: 5, borderRadius: '50%', border: '1.5px solid rgba(201,168,76,0.5)' }} />
            <div style={{ width: 20, height: 1, background: 'rgba(201,168,76,0.35)' }} />
          </div>
        </div>

        {/* Layout: photo + bio */}
        <div style={{ display: 'grid', gridTemplateColumns: avatar || isEditMode ? '280px 1fr' : '1fr', gap: 64, alignItems: 'start' }}>

          {/* Photo column */}
          {(avatar || isEditMode) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {/* Photo frame */}
              <div style={{ position: 'relative' }}>
                {/* Outer ornamental frame */}
                <div style={{
                  position: 'absolute', inset: -12,
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: 16,
                  background: 'rgba(201,168,76,0.04)',
                }} />
                {/* Corner dots */}
                {[[-8,-8],[-8,'auto'],['auto',-8],['auto','auto']].map(([t,l,b,r], i) => {
                  const pos = [
                    { top: -16, left: -16 }, { top: -16, right: -16 },
                    { bottom: -16, left: -16 }, { bottom: -16, right: -16 },
                  ][i]
                  return <div key={i} style={{ position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: 'rgba(201,168,76,0.35)', ...pos }} />
                })}

                {/* Photo */}
                <div
                  onDragOver={isEditMode ? (e => { e.preventDefault(); setPhotoDrag(true) }) : undefined}
                  onDragLeave={isEditMode ? (() => setPhotoDrag(false)) : undefined}
                  onDrop={isEditMode ? (e => { e.preventDefault(); setPhotoDrag(false); handlePhoto(e.dataTransfer.files?.[0]) }) : undefined}
                  onClick={isEditMode && !avatar ? (() => document.getElementById('author-photo-input')?.click()) : undefined}
                  style={{
                    width: 240, height: 300,
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                    border: `2px solid rgba(201,168,76,${photoDrag ? '0.7' : '0.2'})`,
                    cursor: isEditMode && !avatar ? 'pointer' : 'default',
                    transition: 'border-color 0.2s',
                    background: '#1a1006',
                  }}
                >
                  {avatar ? (
                    <>
                      <img src={imgUrl(avatar)}
                        alt={name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {/* Subtle vignette overlay */}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,16,6,0.5) 0%, transparent 50%)', pointerEvents: 'none' }} />
                    </>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <div style={{ fontSize: '2.5rem', opacity: 0.25 }}>📷</div>
                      <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '0.75rem', color: 'rgba(245,240,232,0.3)', textAlign: 'center', padding: '0 16px' }}>
                        {photoUp ? 'Uploading…' : 'Click to add author photo'}
                      </div>
                    </div>
                  )}
                {isEditMode && avatar && (
                    <div
                      onMouseEnter={() => setPhotoHover(true)}
                      onMouseLeave={() => setPhotoHover(false)}
                      style={{
                        position: 'absolute', inset: 0,
                        background: photoHover ? 'rgba(26,16,6,0.55)' : 'rgba(26,16,6,0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s', cursor: 'pointer',
                      }}
                      onClick={() => document.getElementById('author-photo-input')?.click()}
                    >
                      <span style={{ opacity: photoHover ? 1 : 0, transition: 'opacity 0.2s', fontFamily: "'Lora', serif", fontSize: '0.72rem', color: '#c9a84c', textAlign: 'center', pointerEvents: 'none' }}>
                        Change photo
                      </span>
                    </div>
                  )}
                </div>
                <input id="author-photo-input" type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => handlePhoto(e.target.files?.[0])} />
              </div>

              {/* Social links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 240 }}>
                {profile?.goodreads_url && (
                  <a href={profile.goodreads_url} target="_blank" rel="noreferrer" style={{ fontFamily: "'Lora', serif", fontSize: '0.75rem', color: 'rgba(245,240,232,0.45)', textDecoration: 'none', textAlign: 'center', padding: '7px 14px', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 6, transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = 'rgba(201,168,76,0.8)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'; e.currentTarget.style.color = 'rgba(245,240,232,0.45)' }}>
                    Goodreads ↗
                  </a>
                )}
                {profile?.twitter_url && (
                  <a href={profile.twitter_url} target="_blank" rel="noreferrer" style={{ fontFamily: "'Lora', serif", fontSize: '0.75rem', color: 'rgba(245,240,232,0.45)', textDecoration: 'none', textAlign: 'center', padding: '7px 14px', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 6, transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = 'rgba(201,168,76,0.8)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'; e.currentTarget.style.color = 'rgba(245,240,232,0.45)' }}>
                    Twitter / X ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Bio column */}
          <div>
            {/* Opening quote mark */}
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '5rem', color: 'rgba(201,168,76,0.15)', lineHeight: 0.8, marginBottom: 16, marginLeft: -8, userSelect: 'none' }}>"</div>

            {!editing ? (
              <>
                <p style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: '1.05rem', color: 'rgba(245,240,232,0.72)',
                  lineHeight: 2, margin: 0, fontStyle: 'italic',
                  whiteSpace: 'pre-wrap',
                }}>{bio}</p>

                {/* Closing rule */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
                  <div style={{ width: 32, height: 1, background: 'rgba(201,168,76,0.35)' }} />
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(201,168,76,0.4)' }} />
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: 'rgba(201,168,76,0.15)', lineHeight: 1 }}>"</div>
                </div>

                {isEditMode && (
                  <button onClick={startEdit} style={{
                    marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '8px 18px', borderRadius: 8,
                    background: 'transparent', border: '1px solid rgba(201,168,76,0.2)',
                    fontFamily: "'Lora', serif", fontSize: '0.75rem', color: 'rgba(201,168,76,0.6)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.color = '#c9a84c' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'; e.currentTarget.style.color = 'rgba(201,168,76,0.6)' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit Bio
                  </button>
                )}
              </>
            ) : (
              <div>
                <textarea
                  value={bioVal}
                  onChange={e => setBioVal(e.target.value)}
                  rows={8}
                  placeholder="Write your author bio here…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '14px 16px',
                    background: 'rgba(245,240,232,0.06)',
                    border: '1px solid rgba(201,168,76,0.3)',
                    borderRadius: 10, outline: 'none', resize: 'vertical',
                    fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic',
                    fontSize: '0.95rem', color: 'rgba(245,240,232,0.8)',
                    lineHeight: 1.9,
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.65)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.3)'}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button onClick={cancel} style={{ padding: '8px 20px', borderRadius: 7, background: 'transparent', border: '1px solid rgba(245,240,232,0.15)', fontFamily: "'Lora', serif", fontSize: '0.8rem', color: 'rgba(245,240,232,0.4)', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveBio} disabled={saving} style={{ padding: '8px 22px', borderRadius: 7, background: '#c9a84c', border: 'none', fontFamily: "'Playfair Display', serif", fontSize: '0.82rem', fontWeight: 600, color: '#1a1410', cursor: saving ? 'wait' : 'pointer' }}>
                    {saving ? 'Saving…' : 'Save Bio'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}


// ── ComingSoonSection ─────────────────────────────────────────────────────────
function ComingSoonSection({ books, isEditMode, onAdd, onEdit, onDelete, onView }) {
  if (books.length === 0 && !isEditMode) return null

  return (
    <section id="author-coming-soon" style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(180deg, #1a1006 0%, #22160a 50%, #1a1006 100%)',
      padding: '100px 48px',
    }}>
      {/* Subtle dot-grid background */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='1' fill='%23c9a84c'/%3E%3C/svg%3E")`, backgroundSize: '48px 48px', pointerEvents: 'none' }} />
      {/* Gold glow orb */}
      <div style={{ position: 'absolute', bottom: '-15%', left: '20%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', marginBottom: 64 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div style={{ width: 28, height: 1, background: 'rgba(201,168,76,0.4)' }} />
              <span style={{ fontFamily: "'Lora', serif", fontSize: '0.63rem', color: '#c9a84c', letterSpacing: '0.24em', textTransform: 'uppercase', fontStyle: 'italic' }}>On the Horizon</span>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 900, color: '#f5f0e8', margin: '0 0 10px', letterSpacing: '-0.01em', textShadow: '0 2px 20px rgba(201,168,76,0.1)' }}>Coming Soon</h2>
            <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', color: 'rgba(245,240,232,0.4)', fontSize: '0.88rem', margin: 0 }}>
              Stories taking shape — watch this space.
            </p>
          </div>
          {isEditMode && (
            <button onClick={onAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 8, background: '#c9a84c', border: 'none', fontFamily: "'Playfair Display', serif", fontSize: '0.82rem', fontWeight: 600, color: '#1a1410', cursor: 'pointer' }}>
              + Add Upcoming
            </button>
          )}
        </div>

        {books.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed rgba(201,168,76,0.12)', borderRadius: 16 }}>
            <div style={{ fontSize: '2rem', opacity: 0.2, marginBottom: 10 }}>✍️</div>
            <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', color: 'rgba(245,240,232,0.25)', fontSize: '0.9rem' }}>No upcoming works listed yet.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {books.map((book, i) => (
              <ComingSoonCard key={book.id} book={book} index={i} isEditMode={isEditMode} onView={onView} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        )}

        {/* Bottom ornament */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 64 }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2))' }} />
          {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: `rgba(201,168,76,${0.15 + i * 0.1})` }} />)}
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.2))' }} />
        </div>
      </div>
    </section>
  )
}

// ── ComingSoonCard ─────────────────────────────────────────────────────────────
// Horizontal cinematic card: full-height cover on left, rich info on right
function ComingSoonCard({ book, index, isEditMode, onView, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const accent = book.theme_color || '#c9a84c'
  const cover  = book.cover_url ? imgUrl(book.cover_url) : null

  return (
    <div
      onClick={() => onView(book)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: cover ? '200px 1fr' : '1fr',
        minHeight: 280,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        background: `linear-gradient(135deg, ${rgba(accent, 0.08)} 0%, rgba(26,16,6,0.6) 100%)`,
        border: `1px solid ${hovered ? rgba(accent, 0.45) : rgba(accent, 0.15)}`,
        marginBottom: 24,
        transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
        boxShadow: hovered
          ? `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${rgba(accent, 0.2)}, inset 0 1px 0 ${rgba(accent, 0.1)}`
          : '0 4px 20px rgba(0,0,0,0.3)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      {/* Left: Full cover */}
      {cover && (
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <img
            src={cover} alt={book.title}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transition: 'transform 0.5s ease, filter 0.4s ease',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
              filter: hovered ? 'brightness(0.95) saturate(1.1)' : 'brightness(0.75) saturate(0.85)',
            }}
          />
          {/* Right fade into card */}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, transparent 40%, rgba(26,16,6,0.85))`, pointerEvents: 'none' }} />
          {/* Accent tint overlay */}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${rgba(accent, 0.2)} 0%, transparent 60%)`, pointerEvents: 'none' }} />
          {/* Index watermark */}
          <div style={{ position: 'absolute', bottom: 16, left: 14, fontFamily: 'Georgia, serif', fontSize: '4rem', fontWeight: 900, color: rgba(accent, 0.2), lineHeight: 1, userSelect: 'none' }}>
            {String(index + 1).padStart(2, '0')}
          </div>
        </div>
      )}

      {/* Right: content */}
      <div style={{ padding: cover ? '36px 40px 32px' : '36px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
        {/* Corner accent */}
        <div style={{ position: 'absolute', top: 18, right: 20, width: 18, height: 18, borderTop: `1.5px solid ${rgba(accent, hovered ? 0.7 : 0.25)}`, borderRight: `1.5px solid ${rgba(accent, hovered ? 0.7 : 0.25)}`, transition: 'border-color 0.3s' }} />

        <div>
          {/* Badge + genre row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: rgba(accent, 0.12), border: `1px solid ${rgba(accent, 0.3)}` }}>
              <span style={{ fontSize: '0.7rem' }}>✍️</span>
              <span style={{ fontFamily: "'Lora', serif", fontSize: '0.6rem', color: accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>In Progress</span>
            </div>
            {book.genre && (
              <span style={{ fontFamily: "'Lora', serif", fontSize: '0.65rem', color: 'rgba(245,240,232,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', fontStyle: 'italic' }}>{book.genre}</span>
            )}
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 900,
            color: hovered ? '#f5f0e8' : 'rgba(245,240,232,0.88)',
            margin: '0 0 8px', lineHeight: 1.15,
            transition: 'color 0.25s',
          }}>{book.title}</h3>

          {/* Ornamental rule */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div style={{ width: 28, height: 1.5, background: accent, borderRadius: 1 }} />
            <div style={{ width: 5, height: 5, borderRadius: '50%', border: `1.5px solid ${rgba(accent, 0.6)}` }} />
            <div style={{ width: 14, height: 1.5, background: rgba(accent, 0.35), borderRadius: 1 }} />
          </div>

          {/* Description */}
          {book.description && (
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.9rem', color: 'rgba(245,240,232,0.55)', lineHeight: 1.85, margin: '0 0 22px', fontStyle: 'italic', maxWidth: 540 }}>
              {stripToPlain(book.description).slice(0, 200)}{stripToPlain(book.description).length > 200 ? '…' : ''}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Estimated release */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {book.estimated_release && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 14, height: 1, background: rgba(accent, 0.5) }} />
                <span style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '0.78rem', color: 'rgba(245,240,232,0.45)' }}>
                  Expected: <span style={{ color: accent, fontWeight: 600 }}>{book.estimated_release}</span>
                </span>
              </div>
            )}
          </div>

          {/* Read more + edit row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'Lora', serif", fontSize: '0.72rem', fontStyle: 'italic', color: rgba(accent, hovered ? 0.9 : 0.45), transition: 'color 0.25s', letterSpacing: '0.04em' }}>
              Learn more →
            </span>
            {isEditMode && (
              <>
                <button onClick={e => { e.stopPropagation(); onEdit(book) }} style={{ padding: '5px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${rgba(accent, 0.25)}`, fontFamily: "'Lora', serif", fontSize: '0.68rem', color: 'rgba(245,240,232,0.4)', cursor: 'pointer' }}>✎ Edit</button>
                <button onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${book.title}"?`)) onDelete(book) }} style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(200,80,60,0.25)', fontFamily: "'Lora', serif", fontSize: '0.68rem', color: 'rgba(200,80,60,0.5)', cursor: 'pointer' }}>✕</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}