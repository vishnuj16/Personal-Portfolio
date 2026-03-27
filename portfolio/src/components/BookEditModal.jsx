import { useState, useEffect, useRef } from 'react'
import { createBook, updateBook, uploadFile, imgUrl } from '../api'
import { RichTextEditor } from './RichText'

const BOOK_TYPES = ['novel', 'novella', 'short story', 'collection', 'non-fiction', 'poetry']
const GENRES = [
  'literary fiction', 'thriller', 'mystery', 'sci-fi', 'fantasy',
  'horror', 'romance', 'historical fiction', 'biography', 'self-help', 'essay', 'other',
]

function isLight(hex) {
  if (!hex) return false
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16)
  return (r*299 + g*587 + b*114) / 1000 > 140
}

const F = {
  width: '100%', padding: '10px 14px',
  background: '#fdf9f3', border: '1px solid rgba(201,168,76,0.25)',
  borderRadius: '8px', fontFamily: "'Lora', Georgia, serif",
  fontSize: '0.88rem', color: '#3d2e1a',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
}
const focus = e => e.target.style.borderColor = 'rgba(201,168,76,0.65)'
const blur  = e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'

function Label({ children, sub }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <label style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.72rem', color: '#9a8060', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{children}</label>
      {sub && <span style={{ marginLeft: 7, fontSize: '0.67rem', color: 'rgba(107,92,69,0.45)', fontStyle: 'italic' }}>{sub}</span>}
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} type="button" style={{
      padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
      fontFamily: "'Lora', Georgia, serif", fontSize: '0.78rem',
      border: `1px solid ${active ? '#c9a84c' : 'rgba(201,168,76,0.25)'}`,
      background: active ? '#c9a84c' : 'transparent',
      color: active ? '#1a1410' : '#9a8060', transition: 'all 0.15s',
    }}>{children}</button>
  )
}

// ── Gold Date Picker (author-themed month/year picker) ──────────────────────
function GoldDatePicker({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => {
    if (value) { const [y] = value.split('-'); return parseInt(y) || new Date().getFullYear() }
    return new Date().getFullYear()
  })
  const ref = useRef(null)

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const selectedYear  = value ? parseInt(value.split('-')[0]) : null
  const selectedMonth = value ? parseInt(value.split('-')[1]) - 1 : null

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const select = (y, m) => { onChange(`${y}-${String(m + 1).padStart(2, '0')}`); setOpen(false) }
  const clear  = (e)    => { e.stopPropagation(); onChange('') }

  const GOLD       = '#c9a84c'
  const GOLD_DIM   = 'rgba(201,168,76,0.12)'
  const GOLD_BORDER = 'rgba(201,168,76,0.25)'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: '#fdf9f3',
          border: `1px solid ${open ? GOLD : GOLD_BORDER}`,
          color: value ? '#3d2e1a' : '#9a8060',
          padding: '8px 36px 8px 12px', borderRadius: '7px',
          fontSize: '0.82rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
          transition: 'border-color 0.2s', boxSizing: 'border-box',
          fontFamily: "'Lora', Georgia, serif",
          boxShadow: open ? `0 0 0 3px ${GOLD_DIM}` : 'none',
          position: 'relative',
        }}
      >
        <span>{value ? (() => { const [y, m] = value.split('-'); return `${MONTHS[parseInt(m)-1]} ${y}` })() : (placeholder || 'Select date')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'absolute', right: 10 }}>
          {value && (
            <span
              onClick={clear}
              style={{ color: '#9a8060', fontSize: '0.72rem', cursor: 'pointer', lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = '#c9a84c'}
              onMouseLeave={e => e.currentTarget.style.color = '#9a8060'}
            >✕</span>
          )}
          <span style={{ color: GOLD, fontSize: '0.7rem', opacity: open ? 1 : 0.6 }}>▾</span>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 99999,
          background: '#fffdf8',
          border: `1px solid ${GOLD_BORDER}`,
          borderRadius: '10px', padding: '16px',
          boxShadow: '0 16px 48px rgba(61,46,26,0.18), 0 2px 8px rgba(61,46,26,0.08)',
          minWidth: '240px',
          animation: 'fadeInUp 0.18s ease',
        }}>
          {/* Year nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button
              onClick={() => setViewYear(y => y - 1)}
              style={goldNavBtn}
            >◀</button>
            <span style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '1rem', fontWeight: 700,
              color: '#3d2e1a', letterSpacing: '0.02em',
            }}>{viewYear}</span>
            <button
              onClick={() => setViewYear(y => y + 1)}
              style={goldNavBtn}
            >▶</button>
          </div>

          {/* Month grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {MONTHS.map((m, i) => {
              const isSel = selectedYear === viewYear && selectedMonth === i
              const isCur = new Date().getFullYear() === viewYear && new Date().getMonth() === i
              return (
                <button
                  key={m}
                  onClick={() => select(viewYear, i)}
                  style={{
                    padding: '8px 4px', borderRadius: '6px', cursor: 'pointer',
                    fontFamily: "'Lora', Georgia, serif", fontSize: '0.75rem',
                    transition: 'all 0.15s',
                    background: isSel ? GOLD_DIM : 'transparent',
                    border: isSel
                      ? `1px solid ${GOLD}`
                      : isCur
                      ? `1px solid ${GOLD_BORDER}`
                      : '1px solid transparent',
                    color: isSel ? '#3d2e1a' : isCur ? '#9a8060' : '#6b5c45',
                    fontWeight: isSel ? 600 : 400,
                    boxShadow: isSel ? `0 0 0 1px ${GOLD_DIM}` : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isSel) {
                      e.currentTarget.style.background = GOLD_DIM
                      e.currentTarget.style.color = '#3d2e1a'
                      e.currentTarget.style.borderColor = GOLD_BORDER
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSel) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = isCur ? '#9a8060' : '#6b5c45'
                      e.currentTarget.style.borderColor = isCur ? GOLD_BORDER : 'transparent'
                    }
                  }}
                >{m}</button>
              )
            })}
          </div>

          {/* Today shortcut */}
          <div style={{ marginTop: 12, borderTop: `1px solid ${GOLD_BORDER}`, paddingTop: 10, textAlign: 'center' }}>
            <button
              onClick={() => { const n = new Date(); select(n.getFullYear(), n.getMonth()) }}
              style={{
                fontFamily: "'Lora', Georgia, serif", fontSize: '0.68rem',
                color: '#9a8060', background: 'transparent', border: 'none', cursor: 'pointer',
                fontStyle: 'italic',
              }}
              onMouseEnter={e => e.currentTarget.style.color = GOLD}
              onMouseLeave={e => e.currentTarget.style.color = '#9a8060'}
            >⊙ this month</button>
          </div>
        </div>
      )}
    </div>
  )
}

const goldNavBtn = {
  background: 'transparent',
  border: '1px solid rgba(201,168,76,0.25)',
  color: '#c9a84c', width: 28, height: 28, borderRadius: '5px',
  cursor: 'pointer', fontSize: '0.65rem', transition: 'all 0.15s',
}

export default function BookEditModal({ book, onSave, onClose }) {
  const isNew = !book?.id
  const [values, setValues] = useState({
    title: '', subtitle: '', description: '', genre: '',
    book_type: 'novel', published: false, self_published: false,
    publisher: '', published_at: '', amazon_url: '', goodreads_url: '',
    other_buy_url: '', pages: '', isbn: '', featured: false,
    coming_soon: false, estimated_release: '',
    sort_order: 0, cover_url: '', theme_color: '#c9a84c',
    ...(book || {}),
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [coverUp, setCoverUp] = useState(false)
  const [coverDrag, setCoverDrag] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }))

  const handleCoverFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setCoverUp(true)
    try { const res = await uploadFile(file, 'books'); set('cover_url', res.url) }
    catch (e) { setError('Cover upload failed: ' + e.message) }
    finally { setCoverUp(false) }
  }

  const handleSubmit = async () => {
    if (!values.title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...values,
        new_release: book?.new_release ?? false,  // never changed here
        pages: values.pages ? parseInt(values.pages) : null,
        sort_order: parseInt(values.sort_order) || 0,
        publisher: values.self_published ? null : (values.publisher || null),
        estimated_release: values.coming_soon ? (values.estimated_release || null) : null,
      }
      const saved = isNew ? await createBook(payload) : await updateBook(book.id, payload)
      onSave(saved); onClose()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const accent = values.theme_color || '#c9a84c'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'rgba(61,46,26,0.6)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '36px 20px', overflowY: 'auto', animation: 'fadeIn 0.15s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 660, background: '#fdf8f0',
        border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20,
        boxShadow: '0 40px 100px rgba(61,46,26,0.3)',
        overflow: 'hidden', animation: 'slideUp 0.22s ease',
      }}>

        {/* Header */}
        <div style={{ padding: '26px 32px 18px', borderBottom: '1px solid rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Lora', serif", fontSize: '0.65rem', color: '#c9a84c', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>{isNew ? 'New Work' : 'Edit Work'}</div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.35rem', color: '#3d2e1a', margin: 0, fontWeight: 700 }}>
              {isNew ? 'Add a Book' : (values.title || 'Edit Book')}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#9a8060', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '26px 32px 32px' }}>

          {/* Coming Soon toggle — shown first, controls what else appears */}
          <div style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 10, background: values.coming_soon ? 'rgba(107,92,69,0.08)' : 'rgba(201,168,76,0.03)', border: `1px solid ${values.coming_soon ? 'rgba(107,92,69,0.2)' : 'rgba(201,168,76,0.1)'}`, transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Label>Work in Progress / Coming Soon</Label>
                <div style={{ fontFamily: "'Lora', serif", fontSize: '0.7rem', color: '#9a8060', fontStyle: 'italic', marginTop: -4 }}>
                  Hides publishing details — shows in the Coming Soon section
                </div>
              </div>
              <Chip active={values.coming_soon} onClick={() => set('coming_soon', !values.coming_soon)}>
                {values.coming_soon ? '✍️ In Progress' : 'Mark as WIP'}
              </Chip>
            </div>
            {values.coming_soon && (
              <div style={{ marginTop: 14 }}>
                <Label>Estimated Release</Label>
                <input value={values.estimated_release || ''} onChange={e => set('estimated_release', e.target.value)}
                  placeholder="e.g. Late 2025, Q2 2026, TBD…"
                  style={{ ...F }} onFocus={focus} onBlur={blur} />
              </div>
            )}
          </div>

          {/* Cover */}
          <div style={{ marginBottom: 22 }}>
            <Label>Cover Image</Label>
            {values.cover_url ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={imgUrl(values.cover_url)} alt="cover" style={{ height: 170, borderRadius: 8, border: '1px solid rgba(201,168,76,0.2)', objectFit: 'cover', display: 'block' }} />
                <button onClick={() => set('cover_url', '')} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(61,46,26,0.85)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#f5f0e8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setCoverDrag(true) }}
                onDragLeave={() => setCoverDrag(false)}
                onDrop={e => { e.preventDefault(); setCoverDrag(false); handleCoverFile(e.dataTransfer.files?.[0]) }}
                onClick={() => document.getElementById('bk-cover-input')?.click()}
                style={{ border: `2px dashed ${coverDrag ? 'rgba(201,168,76,0.7)' : 'rgba(201,168,76,0.25)'}`, borderRadius: 10, padding: '26px 20px', textAlign: 'center', background: coverDrag ? 'rgba(201,168,76,0.05)' : 'rgba(201,168,76,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>📚</div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: '0.8rem', color: '#9a8060', fontStyle: 'italic' }}>{coverUp ? 'Uploading…' : 'Drop cover image or click to browse'}</div>
              </div>
            )}
            <input id="bk-cover-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleCoverFile(e.target.files?.[0])} />
          </div>

          {/* Theme colour */}
          <div style={{ marginBottom: 22, padding: '14px 16px', background: 'rgba(201,168,76,0.04)', borderRadius: 10, border: '1px solid rgba(201,168,76,0.12)' }}>
            <Label sub="sets the hero background & card accents">Theme Colour</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <input type="color" value={accent} onChange={e => set('theme_color', e.target.value)}
                style={{ width: 46, height: 46, borderRadius: 9, border: '2px solid rgba(201,168,76,0.3)', cursor: 'pointer', padding: 2, background: 'transparent', flexShrink: 0 }} />
              <input value={accent} onChange={e => set('theme_color', e.target.value)} placeholder="#c9a84c"
                style={{ ...F, fontFamily: 'monospace', letterSpacing: '0.06em', flex: 1 }} onFocus={focus} onBlur={blur} />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 180 }}>
                {[
                  '#e63946','#c1121f','#e76f51','#f4a261',
                  '#e9c46a','#c9a84c','#2a9d8f','#52b788',
                  '#457b9d','#264653','#6a4c93','#9b5de5',
                  '#f72585','#b5179e','#6b4226','#8b8000',
                ].map(c => (
                  <button key={c} onClick={() => set('theme_color', c)} title={c} type="button" style={{ width: 20, height: 20, borderRadius: '50%', padding: 0, cursor: 'pointer', background: c, border: accent === c ? '2px solid #3d2e1a' : '2px solid transparent', transform: accent === c ? 'scale(1.25)' : 'scale(1)', transition: 'transform 0.1s' }} />
                ))}
              </div>
            </div>
            <div style={{ marginTop: 10, padding: '7px 12px', borderRadius: 6, background: accent, fontSize: '0.72rem', fontStyle: 'italic', fontFamily: "'Lora', serif", color: isLight(accent) ? '#1a1410' : '#f5f0e8' }}>
              Preview — used as hero tint and card accent
            </div>
          </div>

          {/* Title + Subtitle */}
          <div style={{ marginBottom: 14 }}>
            <Label>Title <span style={{ color: 'rgba(180,0,0,0.55)' }}>*</span></Label>
            <input value={values.title} onChange={e => set('title', e.target.value)} placeholder="The title of your work" style={F} onFocus={focus} onBlur={blur} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>Subtitle</Label>
            <input value={values.subtitle || ''} onChange={e => set('subtitle', e.target.value)} placeholder="Optional subtitle or tagline" style={F} onFocus={focus} onBlur={blur} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <Label>Description / Blurb</Label>
            <RichTextEditor
              value={values.description || ''}
              onChange={v => set('description', v)}
              rows={7}
              placeholder="Write your blurb… use **bold**, _italic_, # Heading, - bullet list"
            />
          </div>

          {/* Format + Genre */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <Label>Format</Label>
              <select value={values.book_type} onChange={e => set('book_type', e.target.value)} style={{ ...F, cursor: 'pointer' }}>
                {BOOK_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <Label>Genre</Label>
              <select value={values.genre || ''} onChange={e => set('genre', e.target.value)} style={{ ...F, cursor: 'pointer' }}>
                <option value="">— select —</option>
                {GENRES.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Publishing, buy links, date etc — only for non-WIP books */}
          {!values.coming_soon && (<>

          {/* Publishing */}
          <div style={{ marginBottom: 14, padding: '16px', background: 'rgba(201,168,76,0.03)', borderRadius: 10, border: '1px solid rgba(201,168,76,0.1)' }}>
            <Label>Publishing</Label>
            <div style={{ display: 'flex', gap: 8, marginBottom: values.self_published ? 0 : 14 }}>
              <Chip active={!values.self_published} onClick={() => set('self_published', false)}>Traditional</Chip>
              <Chip active={values.self_published}  onClick={() => set('self_published', true)}>Self-Published</Chip>
            </div>
            {!values.self_published && (
              <div style={{ marginTop: 14 }}>
                <Label>Publisher Name</Label>
                <input value={values.publisher || ''} onChange={e => set('publisher', e.target.value)} placeholder="e.g. Penguin Random House" style={F} onFocus={focus} onBlur={blur} />
              </div>
            )}
          </div>

          {/* Date + Pages + ISBN */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <Label>Published Date</Label>
              <GoldDatePicker
                value={values.published_at ? values.published_at.slice(0, 7) : ''}
                onChange={v => set('published_at', v ? v + '-01' : '')}
                placeholder="Select month"
              />
            </div>
            <div>
              <Label>Pages</Label>
              <input type="number" value={values.pages || ''} onChange={e => set('pages', e.target.value)} placeholder="320" style={F} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <Label>ISBN</Label>
              <input value={values.isbn || ''} onChange={e => set('isbn', e.target.value)} placeholder="978-…" style={F} onFocus={focus} onBlur={blur} />
            </div>
          </div>

          {/* Buy links */}
          <div style={{ marginBottom: 14, paddingTop: 16, borderTop: '1px solid rgba(201,168,76,0.1)' }}>
            <Label sub="leave blank if not available">Buy Links</Label>
            {[
              { key: 'amazon_url',    ph: 'Amazon — https://amazon.com/dp/…' },
              { key: 'goodreads_url', ph: 'Goodreads — https://goodreads.com/book/…' },
              { key: 'other_buy_url', ph: 'Direct / other store URL' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <input value={values[f.key] || ''} onChange={e => set(f.key, e.target.value)} placeholder={f.ph} style={F} onFocus={focus} onBlur={blur} />
              </div>
            ))}
          </div>

          </>)}

          {/* Status flags */}
          <div style={{ paddingTop: 16, borderTop: '1px solid rgba(201,168,76,0.1)', marginBottom: 0 }}>
            <Label>Status</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!values.coming_soon && (
                <Chip active={values.published} onClick={() => set('published', !values.published)}>
                  {values.published ? '✓ Published' : 'Unpublished'}
                </Chip>
              )}
              {!values.coming_soon && (
                <Chip active={values.featured} onClick={() => set('featured', !values.featured)}>
                  {values.featured ? '⭐ Featured' : 'Add to Featured'}
                </Chip>
              )}
            </div>
            {values.featured && !values.coming_soon && (
              <div style={{ marginTop: 8, fontFamily: "'Lora', serif", fontSize: '0.72rem', fontStyle: 'italic', color: '#9a8060' }}>
                Appears in the Featured section. Manage all featured books from the author page.
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(180,60,40,0.07)', border: '1px solid rgba(180,60,40,0.2)', borderRadius: 8, fontFamily: "'Lora', serif", fontSize: '0.8rem', color: '#b43c28' }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 26 }}>
            <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', fontFamily: "'Lora', serif", fontSize: '0.85rem', color: '#9a8060', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: saving ? 'rgba(201,168,76,0.4)' : '#c9a84c', fontFamily: "'Playfair Display', serif", fontSize: '0.88rem', fontWeight: 600, color: '#1a1410', cursor: saving ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
              {saving ? 'Saving…' : isNew ? 'Add to Library' : 'Save Changes'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}