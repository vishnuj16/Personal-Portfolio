import { useState, useEffect } from 'react'
import { imgUrl } from '../api'

function hexToRgb(hex) {
  const h = (hex || '#c9a84c').replace('#', '')
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }
}
function rgba(hex, a) { const { r, g, b } = hexToRgb(hex); return `rgba(${r},${g},${b},${a})` }
function isLight(hex) { const { r, g, b } = hexToRgb(hex); return (r*299 + g*587 + b*114) / 1000 > 128 }

export default function NewReleaseModal({ books, currentNewReleaseId, onSave, onClose }) {
  const [selected, setSelected] = useState(currentNewReleaseId || null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await onSave(selected)   // null = clear new release
    setSaving(false)
    onClose()
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        background: 'rgba(26,20,16,0.8)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 20px', animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 620,
        background: '#fdf8f0',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 20,
        boxShadow: '0 40px 100px rgba(26,20,16,0.55)',
        overflow: 'hidden', animation: 'slideUp 0.2s ease',
        display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100vh - 64px)',
      }}>

        {/* Header */}
        <div style={{ padding: '26px 32px 18px', borderBottom: '1px solid rgba(201,168,76,0.12)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'Lora', serif", fontSize: '0.65rem', color: '#c9a84c', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 5, fontStyle: 'italic' }}>
                Main Page
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.3rem', color: '#3d2e1a', margin: 0, fontWeight: 700 }}>
                Set New Release
              </h2>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '0.78rem', color: '#9a8060', margin: '6px 0 0', fontStyle: 'italic' }}>
                The selected book is shown full-screen on the main hero. You can change this anytime.
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', color: '#9a8060', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
          </div>
        </div>

        {/* Book list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '18px 32px' }}>
          {/* "None" option */}
          <div
            onClick={() => setSelected(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px', borderRadius: 10, marginBottom: 8,
              border: `1px solid ${selected === null ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.1)'}`,
              background: selected === null ? 'rgba(201,168,76,0.06)' : '#fff9f2',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ width: 44, height: 60, borderRadius: 5, background: 'rgba(201,168,76,0.1)', border: '1px dashed rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '1.1rem', opacity: 0.4 }}>✕</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.9rem', fontWeight: 600, color: '#6b5c45' }}>No new release</div>
              <div style={{ fontFamily: "'Lora', serif", fontSize: '0.72rem', fontStyle: 'italic', color: '#9a8060', marginTop: 2 }}>Show author introduction instead</div>
            </div>
            <Checkbox active={selected === null} accent="#c9a84c" />
          </div>

          {/* Books */}
          {books.filter(b => !b.coming_soon).map(book => {
            const accent = book.theme_color || '#c9a84c'
            const coverSrc = book.cover_url ? imgUrl(book.cover_url) : null
            const isSelected = selected === book.id
            const light = isLight(accent)

            return (
              <div
                key={book.id}
                onClick={() => setSelected(book.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 10, marginBottom: 8,
                  border: `1px solid ${isSelected ? rgba(accent, 0.55) : 'rgba(201,168,76,0.1)'}`,
                  background: isSelected ? rgba(accent, 0.07) : '#fff9f2',
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: isSelected ? `0 2px 12px ${rgba(accent, 0.15)}` : 'none',
                }}
              >
                {/* Cover thumbnail */}
                <div style={{ width: 44, height: 60, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: coverSrc ? 'transparent' : rgba(accent, 0.12), border: `1px solid ${rgba(accent, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {coverSrc
                    ? <img src={coverSrc} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '1.2rem', opacity: 0.35 }}>📖</span>}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: '#3d2e1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</div>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: '0.68rem', color: accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>
                    {book.book_type}{book.genre ? ` · ${book.genre}` : ''}
                  </div>
                  {book.published_at && (
                    <div style={{ fontFamily: "'Lora', serif", fontSize: '0.7rem', color: '#9a8060', fontStyle: 'italic', marginTop: 2 }}>{book.published_at.slice(0,7)}</div>
                  )}
                </div>

                {/* Colour swatch */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: accent, opacity: 0.7, flexShrink: 0 }} />

                <Checkbox active={isSelected} accent={accent} />
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 32px', borderTop: '1px solid rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fdf8f0' }}>
          <div style={{ fontFamily: "'Lora', serif", fontSize: '0.75rem', color: '#9a8060', fontStyle: 'italic' }}>
            {selected ? `"${books.find(b => b.id === selected)?.title}" will be the hero` : 'No hero book selected'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', fontFamily: "'Lora', serif", fontSize: '0.82rem', color: '#9a8060', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: saving ? 'rgba(201,168,76,0.5)' : '#c9a84c', fontFamily: "'Playfair Display', serif", fontSize: '0.85rem', fontWeight: 600, color: '#1a1410', cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
              {saving ? 'Saving…' : 'Set as Hero'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Checkbox({ active, accent }) {
  const light = isLight(accent)
  return (
    <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: `2px solid ${active ? accent : 'rgba(201,168,76,0.3)'}`, background: active ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', boxShadow: active ? `0 0 8px ${rgba(accent, 0.35)}` : 'none' }}>
      {active && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="3" fill={light ? '#1a1410' : '#fff'}/></svg>}
    </div>
  )
}