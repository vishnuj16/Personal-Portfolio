import { useState, useEffect } from 'react'
import { updateBook } from '../api'
import { rgba } from '../utils/color'

// ── Opening line editor (edit mode only) ───────────────────────────────────────
// Floating button above "Praise" → a writing desk for the book's first line.
// On save the 3D book re-prints its first page with the new line.

const SOFT_LIMIT = 220

export default function OpeningLineEditor({ bookId, value, accent, onSaved }) {
  const [open, setOpen]     = useState(false)
  const [text, setText]     = useState(value || '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => { if (open) setText(value || '') }, [open, value])
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const save = async () => {
    setSaving(true); setError('')
    try {
      const saved = await updateBook(bookId, { opening_line: text.trim() })
      onSaved(saved?.opening_line ?? text.trim())
      setOpen(false)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const over = text.length > SOFT_LIMIT

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', right: 24, bottom: 84, zIndex: 9000,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '11px 18px', borderRadius: 999, cursor: 'pointer',
        background: '#fdf8f0', color: '#3d2e1a', border: '1px solid rgba(201,168,76,0.5)',
        fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 600, fontSize: '0.86rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}>
        ❝ Opening line{!value && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#c9503c' }} title="Not set yet" />}
      </button>

      {open && (
        <div onClick={e => { if (e.target === e.currentTarget) setOpen(false) }} style={{
          position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(7,6,5,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.15s ease',
        }}>
          <div style={{
            width: 'min(620px, 100%)', background: '#f4ecda', borderRadius: 4, color: '#2a2118',
            padding: '40px 40px 28px', boxSizing: 'border-box',
            boxShadow: `0 40px 100px rgba(0,0,0,0.6), inset 0 0 80px rgba(140,105,60,0.18), 0 0 0 1px ${rgba(accent, 0.25)}`,
          }}>
            <div style={{ textAlign: 'center', fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '0.7rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: rgba(accent, 0.9) }}>
              It begins…
            </div>
            <div style={{ width: 120, height: 1, background: rgba(accent, 0.5), margin: '12px auto 22px' }} />

            <textarea value={text} onChange={e => setText(e.target.value)} rows={4} autoFocus
              placeholder="The first sentence of the book…"
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical', border: 'none', outline: 'none',
                background: 'transparent', textAlign: 'center', color: '#2a2118',
                fontFamily: "'EB Garamond', Garamond, Georgia, serif", fontStyle: 'italic',
                fontSize: '1.65rem', lineHeight: 1.35,
                borderBottom: `1px dashed ${rgba(accent, 0.35)}`, paddingBottom: 12,
              }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: "'Lora', serif", fontSize: '0.7rem', fontStyle: 'italic', color: over ? '#b43c28' : '#9a8060' }}>
              <span>Printed on the book's first page and written in ink as the book opens. Leave empty to show your top review instead.</span>
              <span style={{ flexShrink: 0, marginLeft: 12 }}>{text.length}/{SOFT_LIMIT}</span>
            </div>
            {over && <div style={{ marginTop: 6, fontFamily: "'Lora', serif", fontSize: '0.7rem', color: '#b43c28' }}>Long lines get smaller type on the page — one or two sentences reads best.</div>}
            {error && <div style={{ marginTop: 10, fontFamily: "'Lora', serif", fontSize: '0.78rem', color: '#b43c28' }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button onClick={() => setOpen(false)} style={{ padding: '9px 18px', borderRadius: 7, background: 'transparent', border: '1px solid rgba(61,46,26,0.2)', fontFamily: "'Lora', serif", fontSize: '0.82rem', color: '#6b5c45', cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ padding: '9px 22px', borderRadius: 7, border: 'none', background: saving ? 'rgba(201,168,76,0.5)' : '#c9a84c', fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: '0.85rem', color: '#1a1410', cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Saving…' : 'Print it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
