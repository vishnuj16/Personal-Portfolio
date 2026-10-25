import { useEffect, useState } from 'react'
import { rgba } from '../utils/color'

// ── Library catalogue card ─────────────────────────────────────────────────────
// Book metadata (format, genre, pages, date, imprint, ISBN) typed onto an old
// library card, taped beside the blurb. Straightens up on hover.

const CALL_CODE = {
  'novel': 'FIC', 'novella': 'FIC', 'short story': 'SS', 'collection': 'SS',
  'non-fiction': 'NF', 'poetry': 'POE',
}

const TYPE = "'Courier Prime', 'Courier New', Courier, monospace"
const RULE = 26          // ruled-line spacing; text rows sit on these lines
const INK  = '#2c2a33'

function injectTypewriterFont() {
  if (document.getElementById('catalog-font')) return
  const link = document.createElement('link')
  link.id = 'catalog-font'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap'
  document.head.appendChild(link)
}

export default function CatalogCard({ book, accent, isMobile }) {
  const [hov, setHov] = useState(false)
  useEffect(() => { injectTypewriterFont() }, [])

  const published = book.published_at
    ? new Date(book.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })
    : null
  const rows = [
    ['Format',    book.book_type],
    ['Genre',     book.genre],
    ['Extent',    book.pages ? `${book.pages} p.` : null],
    ['Published', published],
    ['Imprint',   book.publisher || (book.self_published ? 'Self-published' : null)],
    ['ISBN',      book.isbn],
  ].filter(([, v]) => v)
  if (!rows.length) return null

  const year = book.published_at?.slice(0, 4)
  const callNo = [CALL_CODE[book.book_type] || 'FIC', 'VYA', year].filter(Boolean)
  const stamp = book.new_release ? 'New Release' : 'In Print'
  const rest = isMobile ? -1.5 : -2.5

  return (
    <div style={{ position: 'relative', maxWidth: isMobile ? 340 : 300, margin: isMobile ? '0 auto' : 0, paddingTop: 14 }}>
      {/* Tape */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: '50%', zIndex: 2,
        width: 92, height: 26, transform: `translateX(-50%) rotate(${hov ? 0 : 3}deg)`,
        background: 'rgba(250,244,228,0.55)', backdropFilter: 'blur(1px)',
        boxShadow: '0 1px 3px rgba(61,46,26,0.15)',
        transition: 'transform 0.4s ease',
      }} />

      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        role="group" aria-label="Book details"
        style={{
          position: 'relative', overflow: 'hidden',
          background: '#f7f0dc',
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${RULE - 1}px, rgba(70,110,170,0.16) ${RULE - 1}px ${RULE}px)`,
          backgroundPosition: `0 ${58 - RULE}px`,
          borderRadius: 3,
          boxShadow: hov
            ? '0 22px 44px rgba(61,46,26,0.22), 0 2px 6px rgba(61,46,26,0.12)'
            : '0 10px 26px rgba(61,46,26,0.16), 0 1px 3px rgba(61,46,26,0.1)',
          transform: hov ? 'rotate(0deg) translateY(-4px)' : `rotate(${rest}deg)`,
          transition: 'transform 0.45s cubic-bezier(.2,.8,.2,1), box-shadow 0.45s ease',
          fontFamily: TYPE, color: INK,
          padding: '0 0 64px',   // empty ruled space at the bottom for the stamp
        }}
      >
        {/* Header with the red rule */}
        <div style={{
          height: 58, boxSizing: 'border-box', padding: '20px 18px 0 18px',
          borderBottom: '2px solid rgba(178,52,52,0.55)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          fontSize: '0.62rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: rgba('#2c2a33', 0.6),
        }}>
          <span>Stories by Vyas</span>
          <span>No. {String(book.id).padStart(4, '0')}</span>
        </div>

        <div style={{ display: 'flex' }}>
          {/* Call number column, split by the red margin line */}
          <div style={{
            width: 58, flexShrink: 0, boxSizing: 'border-box', padding: '0 10px 0 14px',
            borderRight: '1px solid rgba(178,52,52,0.35)',
            fontSize: '0.74rem', fontWeight: 700, lineHeight: `${RULE}px`,
          }}>
            {callNo.map(c => <div key={c}>{c}</div>)}
          </div>

          <div style={{ flex: 1, minWidth: 0, padding: '0 16px 0 12px', lineHeight: `${RULE}px` }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{book.title}.</div>
            {rows.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 8, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                <span style={{ color: rgba('#2c2a33', 0.5), flexShrink: 0 }}>{label}</span>
                <span aria-hidden style={{ flex: 1, minWidth: 8, borderBottom: '1px dotted rgba(44,42,51,0.25)', marginBottom: 8 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', textTransform: label === 'Format' || label === 'Genre' ? 'capitalize' : 'none' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ink stamp */}
        <div aria-hidden style={{
          position: 'absolute', right: 14, bottom: 26,
          transform: `rotate(${hov ? -8 : -14}deg)`,
          transition: 'transform 0.45s ease',
          padding: '4px 10px',
          border: `2px solid ${rgba(accent, 0.7)}`, outline: `1px solid ${rgba(accent, 0.45)}`, outlineOffset: 2,
          borderRadius: 3, color: rgba(accent, 0.8),
          fontFamily: TYPE, fontWeight: 700, fontSize: '0.64rem', letterSpacing: '0.18em', textTransform: 'uppercase',
          mixBlendMode: 'multiply', opacity: 0.85,
        }}>{stamp}</div>

        {/* Punched hole */}
        <div aria-hidden style={{
          position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: '#fdf8f0', boxShadow: 'inset 0 1px 3px rgba(61,46,26,0.35)',
        }} />
      </div>
    </div>
  )
}
