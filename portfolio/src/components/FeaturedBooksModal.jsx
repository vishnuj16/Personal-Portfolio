import { useState, useEffect } from 'react'
import { imgUrl } from '../api'

const MAX_FEATURED = 5

function hexToRgb(hex) {
  const h = (hex || '#c9a84c').replace('#', '')
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }
}
function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
function isLight(hex) {
  const { r, g, b } = hexToRgb(hex)
  return (r*299 + g*587 + b*114) / 1000 > 128
}

export default function FeaturedBooksModal({ books, onSave, onClose }) {
  // Start with currently featured books selected
  const [selected, setSelected] = useState(() =>
    new Set(books.filter(b => b.featured && !b.new_release).map(b => b.id))
  )
  const [saving, setSaving] = useState(false)

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= MAX_FEATURED) return prev  // cap at 5
        next.add(id)
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave([...selected])
    setSaving(false)
    onClose()
  }

  // All books are eligible to be featured (new_release books can appear in both hero + featured)
  const eligible = books
  const atCap = selected.size >= MAX_FEATURED

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        background: 'rgba(26,20,16,0.75)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 20px',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 680,
        background: '#fdf8f0',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 20,
        boxShadow: '0 40px 100px rgba(26,20,16,0.5)',
        overflow: 'hidden',
        animation: 'slideUp 0.2s ease',
        display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100vh - 64px)',
      }}>

        {/* Header */}
        <div style={{
          padding: '26px 32px 20px',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{
                fontFamily: "'Lora', Georgia, serif", fontSize: '0.65rem',
                color: '#c9a84c', letterSpacing: '0.18em', textTransform: 'uppercase',
                marginBottom: 6, fontStyle: 'italic',
              }}>Curate Your Shelf</div>
              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.35rem', color: '#3d2e1a', margin: 0, fontWeight: 700,
              }}>Featured Titles</h2>
              <p style={{
                fontFamily: "'Lora', serif", fontSize: '0.8rem', color: '#9a8060',
                margin: '6px 0 0', fontStyle: 'italic',
              }}>
                Select up to {MAX_FEATURED} books to showcase in your featured section.
              </p>
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: '50%', width: 34, height: 34, cursor: 'pointer',
              color: '#9a8060', fontSize: '1rem', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          </div>

          {/* Pill counter */}
          <div style={{
            marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {[...Array(MAX_FEATURED)].map((_, i) => (
              <div key={i} style={{
                height: 4, flex: 1, borderRadius: 2,
                background: i < selected.size ? '#c9a84c' : 'rgba(201,168,76,0.15)',
                transition: 'background 0.2s',
              }} />
            ))}
            <span style={{
              fontFamily: "'Lora', serif", fontSize: '0.72rem', color: '#9a8060',
              marginLeft: 6, whiteSpace: 'nowrap',
            }}>
              {selected.size} / {MAX_FEATURED}
            </span>
          </div>
        </div>

        {/* Book list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 32px' }}>
          {eligible.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 0',
              fontFamily: "'Lora', serif", fontStyle: 'italic', color: '#9a8060',
            }}>
              No books available to feature yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {eligible.map(book => {
                const isSelected = selected.has(book.id)
                const accent = book.theme_color || '#c9a84c'
                const light = isLight(accent)
                const coverSrc = book.cover_url ? imgUrl(book.cover_url) : null
                const disabled = !isSelected && atCap

                return (
                  <div
                    key={book.id}
                    onClick={() => !disabled && toggle(book.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '12px 16px', borderRadius: 12,
                      border: `1px solid ${isSelected ? rgba(accent, 0.5) : 'rgba(201,168,76,0.12)'}`,
                      background: isSelected ? rgba(accent, 0.06) : '#fff9f2',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.45 : 1,
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? `0 2px 12px ${rgba(accent, 0.12)}` : 'none',
                    }}
                  >
                    {/* Cover thumbnail */}
                    <div style={{
                      width: 44, height: 60, borderRadius: 5, overflow: 'hidden', flexShrink: 0,
                      background: coverSrc ? 'transparent' : `linear-gradient(135deg, ${rgba(accent, 0.25)}, ${rgba(accent, 0.1)})`,
                      border: `1px solid ${rgba(accent, 0.2)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {coverSrc
                        ? <img src={coverSrc} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '1.2rem', opacity: 0.4 }}>📖</span>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: '0.95rem', fontWeight: 700,
                        color: '#3d2e1a', lineHeight: 1.3,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{book.title}</div>
                      <div style={{
                        fontFamily: "'Lora', serif", fontSize: '0.68rem',
                        color: accent, letterSpacing: '0.08em',
                        textTransform: 'uppercase', marginTop: 3,
                      }}>
                        {book.book_type}{book.genre ? ` · ${book.genre}` : ''}
                      </div>
                      {book.subtitle && (
                        <div style={{
                          fontFamily: "'Lora', serif", fontSize: '0.75rem',
                          fontStyle: 'italic', color: '#9a8060', marginTop: 2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{book.subtitle}</div>
                      )}
                    </div>

                    {/* Theme colour swatch */}
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: accent, flexShrink: 0, opacity: 0.7,
                    }} />

                    {/* Checkbox */}
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${isSelected ? accent : 'rgba(201,168,76,0.3)'}`,
                      background: isSelected ? accent : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? `0 0 8px ${rgba(accent, 0.35)}` : 'none',
                    }}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke={light ? '#1a1410' : '#fff'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '18px 32px',
          borderTop: '1px solid rgba(201,168,76,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          background: '#fdf8f0',
        }}>
          <div style={{
            fontFamily: "'Lora', serif", fontSize: '0.75rem',
            color: '#9a8060', fontStyle: 'italic',
          }}>
            {selected.size === 0
              ? 'No books selected — section will be hidden'
              : `${selected.size} book${selected.size > 1 ? 's' : ''} will be featured`}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              padding: '9px 20px', borderRadius: 8,
              background: 'transparent', border: '1px solid rgba(201,168,76,0.25)',
              fontFamily: "'Lora', Georgia, serif", fontSize: '0.82rem', color: '#9a8060',
              cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '9px 24px', borderRadius: 8, border: 'none',
              background: saving ? 'rgba(201,168,76,0.5)' : '#c9a84c',
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '0.85rem', fontWeight: 600, color: '#1a1410',
              cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s',
            }}>
              {saving ? 'Saving…' : 'Save Featured'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}