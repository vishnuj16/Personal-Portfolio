import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getBooks, getProfile, updateProfile, deleteBook, imgUrl, setFeaturedBooks, setNewRelease } from '../api'
import AuthorNavbar from './AuthorNavbar'
import AuthorAdminBanner from './AuthorAdminBanner'
import BookEditModal from './BookEditModal'
import LoginModal from './LoginModal'
import BookPage from './BookPage'
import FeaturedBooksModal from './FeaturedBooksModal'
import NewReleaseModal from './NewReleaseModal'

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
  const featured   = books.filter(b => b.featured && !b.new_release)
  const allTypes   = [...new Set(books.map(b => b.book_type).filter(Boolean))]
  const allGenres  = [...new Set(books.map(b => b.genre).filter(Boolean))]
  const filtered   = books.filter(b => {
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

        <div style={{ ...innerMax, position: 'relative', width: '100%', padding: '140px 48px 100px' }}>
          {newRelease ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
              <div style={{ animation: 'fadeInUp 0.8s ease' }}>
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.72rem', color: heroAccent, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 32, height: 1, background: heroAccent, opacity: 0.7, display: 'inline-block' }} />
                  Now Available
                </div>
                <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', color: '#f5f0e8', fontWeight: 900, lineHeight: 1.08, margin: '0 0 16px', textShadow: `0 2px 30px ${rgba(heroAccent, 0.25)}` }}>
                  {newRelease.title}
                </h1>
                {newRelease.subtitle && <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: '1.05rem', color: 'rgba(245,240,232,0.6)', marginBottom: 24, lineHeight: 1.5 }}>{newRelease.subtitle}</div>}
                {newRelease.description && <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.95rem', color: 'rgba(245,240,232,0.7)', lineHeight: 1.8, marginBottom: 36, maxWidth: 440 }}>{newRelease.description.slice(0, 220)}{newRelease.description.length > 220 ? '…' : ''}</p>}
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
                {profile?.name || 'The Author'}
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

      {/* ── ABOUT ─────────────────────────────────────────────────────────── */}
      <section id="author-about" style={{ ...sectionPadding, background: '#2c1f0e' }}>
        <div style={{ ...innerMax, maxWidth: 720, textAlign: 'center' }}>
          <SectionHeaderDark eyebrow="The Author" title={profile?.name || 'Vishnu'} />
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: '1.05rem', color: 'rgba(245,240,232,0.65)', lineHeight: 1.9 }}>
            {profile?.bio || 'Writer. Storyteller. Builder of worlds.'}
          </p>
          <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {profile?.goodreads_url && <a href={profile.goodreads_url} target="_blank" rel="noreferrer" style={darkLinkStyle}>Goodreads Profile ↗</a>}
            {profile?.twitter_url && <a href={profile.twitter_url} target="_blank" rel="noreferrer" style={darkLinkStyle}>Twitter / X ↗</a>}
          </div>
        </div>
      </section>

      {/* ── CONTACT ───────────────────────────────────────────────────────── */}
      <section id="author-contact" style={{ ...sectionPadding, background: '#fdf8f0' }}>
        <div style={{ ...innerMax, maxWidth: 600, textAlign: 'center' }}>
          <SectionHeader eyebrow="Get in Touch" title="Letters Welcome" subtitle="For rights enquiries, readings, collaborations, or just to say hello — the door is always open." />
          {profile?.email && (
            <a href={`mailto:${profile.email}`} style={{ display: 'inline-block', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.1rem', fontWeight: 600, color: '#c9a84c', textDecoration: 'none', borderBottom: '1px solid rgba(201,168,76,0.3)', paddingBottom: 3, transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a84c'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'}>{profile.email}</a>
          )}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(201,168,76,0.15)', padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: '#1a1410' }}>
        <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.75rem', color: 'rgba(245,240,232,0.3)', fontStyle: 'italic' }}>
          © {new Date().getFullYear()} {profile?.name || 'Vishnu'} — All rights reserved
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
function FeaturedSlideshow({ books, isEditMode, onManage, onView }) {
  const [idx, setIdx] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [descOpen, setDescOpen] = useState(false)
  const timerRef = useState(null)

  const goTo = (next, userInitiated = false) => {
    if (transitioning || next === idx) return
    setTransitioning(true)
    setDescOpen(false)
    setTimeout(() => {
      setIdx(next)
      setTransitioning(false)
    }, 550)
  }

  // Auto-advance every 5s
  useEffect(() => {
    if (books.length <= 1) return
    const t = setInterval(() => {
      setIdx(i => {
        const next = (i + 1) % books.length
        setTransitioning(true)
        setDescOpen(false)
        setTimeout(() => setTransitioning(false), 550)
        return next
      })
    }, 5000)
    return () => clearInterval(t)
  }, [books.length])

  // Reset idx if books change
  useEffect(() => { setIdx(0); setDescOpen(false) }, [books.length])

  // Empty state
  if (books.length === 0) {
    return (
      <section style={{
        background: '#1a1410', minHeight: 320,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20, padding: '64px 48px',
      }}>
        <div style={{ fontFamily: "'Lora', serif", fontSize: '0.72rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', fontStyle: 'italic' }}>Selected Works</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: 'rgba(245,240,232,0.2)', fontWeight: 700 }}>Featured Titles</div>
        <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', color: 'rgba(245,240,232,0.25)', fontSize: '0.9rem' }}>
          No books are featured right now.
        </div>
        {isEditMode && (
          <button onClick={onManage} style={{
            marginTop: 8, padding: '10px 24px', borderRadius: 8,
            background: '#c9a84c', border: 'none',
            fontFamily: "'Playfair Display', serif", fontSize: '0.85rem', fontWeight: 600,
            color: '#1a1410', cursor: 'pointer',
          }}>⭐ Choose Featured Books</button>
        )}
      </section>
    )
  }

  const book   = books[idx]
  const accent = book.theme_color || '#c9a84c'
  const light  = isLight(accent)
  const cover  = book.cover_url ? imgUrl(book.cover_url) : null

  const desc = book.description || ''
  const shortDesc = desc.split(' ').slice(0, 40).join(' ') + (desc.split(' ').length > 40 ? '…' : '')

  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      minHeight: '100vh',
      background: darken(accent, 0.78),
    }}>
      {/* Animated bg gradient that shifts with each book */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 70% 60% at 60% 50%, ${rgba(accent, 0.22)} 0%, transparent 70%)`,
        transition: 'all 0.8s ease',
        pointerEvents: 'none',
      }} />
      {/* Noise grain */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.035,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
        pointerEvents: 'none',
      }} />

      {/* Section label + manage button */}
      <div style={{
        position: 'absolute', top: 36, left: 48, right: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 1, background: rgba(accent, 0.6) }} />
          <span style={{ fontFamily: "'Lora', serif", fontSize: '0.65rem', color: rgba(accent, 0.7), letterSpacing: '0.2em', textTransform: 'uppercase', fontStyle: 'italic' }}>
            Selected Works
          </span>
        </div>
        {isEditMode && (
          <button onClick={onManage} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 7,
            background: 'rgba(26,20,16,0.6)', backdropFilter: 'blur(6px)',
            border: `1px solid ${rgba(accent, 0.35)}`,
            fontFamily: "'Lora', serif", fontSize: '0.7rem', color: rgba(accent, 0.8),
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Manage Featured
          </button>
        )}
      </div>

      {/* Main layout */}
      <div style={{
        maxWidth: 1140, margin: '0 auto',
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: 0, alignItems: 'stretch',
        position: 'relative', zIndex: 2,
        padding: '120px 48px 80px',
      }}>
        {/* Left — text */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          paddingRight: 60,
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateY(16px)' : 'translateY(0)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          {/* Book index label */}
          <div style={{
            fontFamily: "'Lora', serif", fontSize: '0.62rem',
            color: rgba(accent, 0.55), letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: rgba(accent, 0.4) }}>
              {String(idx + 1).padStart(2, '0')} / {String(books.length).padStart(2, '0')}
            </span>
            <span style={{ flex: 1, height: 1, background: rgba(accent, 0.2), maxWidth: 60 }} />
            {book.book_type}{book.genre ? ` · ${book.genre}` : ''}
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)',
            fontWeight: 900, color: '#f5f0e8',
            lineHeight: 1.06, margin: '0 0 12px',
            textShadow: `0 4px 40px ${rgba(accent, 0.3)}`,
          }}>{book.title}</h2>

          {book.subtitle && (
            <div style={{
              fontFamily: "'Lora', serif", fontStyle: 'italic',
              fontSize: '1.05rem', color: 'rgba(245,240,232,0.5)',
              marginBottom: 24, lineHeight: 1.5,
            }}>{book.subtitle}</div>
          )}

          {/* Accent rule */}
          <div style={{ width: 48, height: 2, background: accent, marginBottom: 24, borderRadius: 1 }} />

          {/* Description */}
          {desc && (
            <div style={{ marginBottom: 32 }}>
              <p style={{
                fontFamily: "'Lora', serif", fontSize: '0.95rem',
                color: 'rgba(245,240,232,0.6)', lineHeight: 1.85,
                margin: 0, maxWidth: 480,
              }}>
                {descOpen ? desc : shortDesc}
              </p>
              {desc.split(' ').length > 40 && (
                <button onClick={() => setDescOpen(v => !v)} style={{
                  marginTop: 8, background: 'none', border: 'none', padding: 0,
                  fontFamily: "'Lora', serif", fontSize: '0.75rem', fontStyle: 'italic',
                  color: rgba(accent, 0.7), cursor: 'pointer',
                  borderBottom: `1px solid ${rgba(accent, 0.3)}`,
                }}>{descOpen ? 'show less' : 'read more'}</button>
              )}
            </div>
          )}

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
            <button onClick={() => onView(book)} style={{
              padding: '12px 28px', borderRadius: 8, border: 'none',
              background: accent, color: light ? '#1a1410' : '#f5f0e8',
              fontFamily: "'Playfair Display', serif", fontSize: '0.88rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: `0 4px 20px ${rgba(accent, 0.4)}`,
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 8px 32px ${rgba(accent, 0.6)}`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = `0 4px 20px ${rgba(accent, 0.4)}`}
            >Explore Book</button>
            {book.amazon_url && (
              <a href={book.amazon_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                style={{
                  padding: '12px 22px', borderRadius: 8,
                  border: `1px solid ${rgba(accent, 0.35)}`,
                  color: 'rgba(245,240,232,0.7)', textDecoration: 'none',
                  fontFamily: "'Lora', serif", fontSize: '0.85rem',
                  transition: 'all 0.2s', background: 'transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = rgba(accent, 0.7); e.currentTarget.style.color = '#f5f0e8' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = rgba(accent, 0.35); e.currentTarget.style.color = 'rgba(245,240,232,0.7)' }}
              >Get Copy ↗</a>
            )}
          </div>

          {/* Dot navigation */}
          {books.length > 1 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {books.map((b, i) => (
                <button key={i} onClick={() => goTo(i, true)} style={{
                  padding: 0, border: 'none', cursor: 'pointer', background: 'none',
                  display: 'flex', alignItems: 'center',
                }}>
                  <div style={{
                    width: i === idx ? 28 : 7, height: 7,
                    borderRadius: 4,
                    background: i === idx ? accent : rgba(accent, 0.25),
                    transition: 'all 0.35s ease',
                  }} />
                </button>
              ))}
              {/* Progress bar for current slide */}
              <div style={{ flex: 1, maxWidth: 100, height: 2, background: rgba(accent, 0.15), borderRadius: 1, overflow: 'hidden', marginLeft: 6 }}>
                <div style={{
                  height: '100%', background: rgba(accent, 0.5),
                  borderRadius: 1,
                  animation: books.length > 1 ? 'slideProgress 5s linear infinite' : 'none',
                  animationPlayState: transitioning ? 'paused' : 'running',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Right — cover */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'scale(0.96) translateY(12px)' : 'scale(1) translateY(0)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          cursor: 'pointer',
        }}
        onClick={() => onView(book)}
        >
          {cover ? (
            <div style={{
              position: 'relative',
              filter: `drop-shadow(0 32px 72px rgba(0,0,0,0.65)) drop-shadow(0 4px 20px ${rgba(accent, 0.35)})`,
            }}>
              <div style={{
                position: 'absolute', inset: -24,
                background: `radial-gradient(ellipse, ${rgba(accent, 0.3)} 0%, transparent 70%)`,
                filter: 'blur(16px)', pointerEvents: 'none',
              }} />
              <img src={cover} alt={book.title} style={{
                maxHeight: 480, maxWidth: 320, borderRadius: 6,
                display: 'block', position: 'relative',
                transform: 'perspective(800px) rotateY(-3deg)',
                transition: 'transform 0.4s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'perspective(800px) rotateY(0deg) scale(1.02)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'perspective(800px) rotateY(-3deg)' }}
              />
              <div style={{
                position: 'absolute', inset: -1, borderRadius: 8, pointerEvents: 'none',
                background: `linear-gradient(135deg, ${rgba(accent, 0.45)} 0%, transparent 45%, ${rgba(accent, 0.2)} 100%)`,
              }} />
            </div>
          ) : (
            <div style={{
              width: 260, height: 360,
              background: `linear-gradient(135deg, ${darken(accent, 0.4)}, ${darken(accent, 0.65)})`,
              border: `1px solid ${rgba(accent, 0.25)}`, borderRadius: 6,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: 24, textAlign: 'center',
              boxShadow: `0 24px 60px rgba(0,0,0,0.5)`,
            }}>
              <div style={{ fontSize: '2rem', opacity: 0.25, marginBottom: 14 }}>📖</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '0.95rem', color: 'rgba(245,240,232,0.4)', lineHeight: 1.4 }}>{book.title}</div>
            </div>
          )}
        </div>
      </div>

      {/* Prev/Next arrow nav */}
      {books.length > 1 && (
        <>
          <button onClick={() => goTo((idx - 1 + books.length) % books.length, true)} style={{
            position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(26,20,16,0.5)', backdropFilter: 'blur(6px)',
            border: `1px solid ${rgba(accent, 0.2)}`, borderRadius: '50%',
            width: 42, height: 42, cursor: 'pointer', color: rgba(accent, 0.7),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', zIndex: 10,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = rgba(accent, 0.6); e.currentTarget.style.color = accent }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = rgba(accent, 0.2); e.currentTarget.style.color = rgba(accent, 0.7) }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button onClick={() => goTo((idx + 1) % books.length, true)} style={{
            position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(26,20,16,0.5)', backdropFilter: 'blur(6px)',
            border: `1px solid ${rgba(accent, 0.2)}`, borderRadius: '50%',
            width: 42, height: 42, cursor: 'pointer', color: rgba(accent, 0.7),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', zIndex: 10,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = rgba(accent, 0.6); e.currentTarget.style.color = accent }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = rgba(accent, 0.2); e.currentTarget.style.color = rgba(accent, 0.7) }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </>
      )}

      <style>{`
        @keyframes slideProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </section>
  )
}