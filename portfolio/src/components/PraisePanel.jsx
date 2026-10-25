import { useState, useEffect } from 'react'
import { createReview, updateReview, deleteReview, reorderReviews } from '../api'

// ── Praise panel (edit mode only) ──────────────────────────────────────────────
// Floating "Praise" button on the book page → drawer to add, edit, star,
// reorder and delete reviews. Placement on the page is automatic (BookPraise.jsx).

const SOURCES = [
  { value: 'amazon',    label: 'Amazon' },
  { value: 'goodreads', label: 'Goodreads' },
  { value: 'press',     label: 'Press / critic' },
  { value: 'author',    label: 'Fellow author' },
  { value: 'other',     label: 'Other' },
]

const EMPTY = { quote: '', reviewer: '', reviewer_title: '', source: 'amazon', source_url: '', rating: null, starred: false }

const F = {
  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
  background: '#fdf9f3', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8,
  fontFamily: "'Lora', Georgia, serif", fontSize: '0.85rem', color: '#3d2e1a', outline: 'none',
}

function Label({ children }) {
  return <div style={{ fontFamily: "'Lora', serif", fontSize: '0.66rem', color: '#9a8060', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '12px 0 6px' }}>{children}</div>
}

function IconBtn({ title, onClick, disabled, children, danger }) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled} style={{
      width: 28, height: 28, borderRadius: 6, padding: 0, flexShrink: 0,
      border: '1px solid rgba(201,168,76,0.2)', background: 'transparent',
      color: danger ? '#b43c28' : '#9a8060', cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.35 : 1, fontSize: '0.8rem',
    }}>{children}</button>
  )
}

function ReviewForm({ initial, onSubmit, onCancel, saving }) {
  const [v, setV] = useState({ ...EMPTY, ...initial })
  const set = (k, val) => setV(p => ({ ...p, [k]: val }))

  return (
    <div style={{ padding: 16, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10 }}>
      <Label>Quote *</Label>
      <textarea value={v.quote} onChange={e => set('quote', e.target.value)} rows={4} autoFocus
        placeholder="Paste the review or blurb…" style={{ ...F, resize: 'vertical', lineHeight: 1.6 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <Label>Reviewer</Label>
          <input value={v.reviewer || ''} onChange={e => set('reviewer', e.target.value)} placeholder="Name" style={F} />
        </div>
        <div>
          <Label>Source</Label>
          <select value={v.source} onChange={e => set('source', e.target.value)} style={{ ...F, cursor: 'pointer' }}>
            {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <Label>Title / publication <span style={{ textTransform: 'none', fontStyle: 'italic', letterSpacing: 0 }}>— optional</span></Label>
      <input value={v.reviewer_title || ''} onChange={e => set('reviewer_title', e.target.value)}
        placeholder="e.g. Author of The Lowland · The Hindu" style={F} />

      <Label>Link to review <span style={{ textTransform: 'none', fontStyle: 'italic', letterSpacing: 0 }}>— optional</span></Label>
      <input value={v.source_url || ''} onChange={e => set('source_url', e.target.value)} placeholder="https://…" style={F} />

      <Label>Rating</Label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} type="button" onClick={() => set('rating', v.rating === i ? null : i)} style={{
            background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer',
            fontSize: '1.25rem', color: v.rating && i <= v.rating ? '#c9a84c' : 'rgba(201,168,76,0.25)',
          }}>★</button>
        ))}
        <span style={{ fontFamily: "'Lora', serif", fontSize: '0.7rem', fontStyle: 'italic', color: '#9a8060', marginLeft: 6 }}>
          {v.rating ? 'click again to clear' : 'none'}
        </span>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer', fontFamily: "'Lora', serif", fontSize: '0.8rem', color: '#3d2e1a' }}>
        <input type="checkbox" checked={v.starred} onChange={e => set('starred', e.target.checked)} />
        ✦ Star this review
      </label>
      <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', color: '#9a8060', fontSize: '0.7rem', margin: '3px 0 0 24px' }}>
        Starred reviews get the hero and pull-quote spots
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 7, background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', fontFamily: "'Lora', serif", fontSize: '0.8rem', color: '#9a8060', cursor: 'pointer' }}>Cancel</button>
        <button type="button" disabled={saving || !v.quote.trim()} onClick={() => onSubmit(v)} style={{
          padding: '8px 20px', borderRadius: 7, border: 'none',
          background: saving || !v.quote.trim() ? 'rgba(201,168,76,0.4)' : '#c9a84c',
          fontFamily: "'Playfair Display', serif", fontSize: '0.82rem', fontWeight: 600, color: '#1a1410',
          cursor: saving ? 'wait' : 'pointer',
        }}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}

function toPayload(v) {
  return {
    quote: v.quote, reviewer: v.reviewer || '', reviewer_title: v.reviewer_title || '',
    source: v.source, source_url: v.source_url || '', starred: !!v.starred,
    ...(v.rating ? { rating: v.rating } : { clear_rating: true }),
  }
}

export default function PraisePanel({ bookId, reviews, onChange }) {
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState(null)   // review id, 'new', or null
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const run = async (fn) => {
    setSaving(true); setError('')
    try { await fn(); return true }
    catch (e) { setError(e.message); return false }
    finally { setSaving(false) }
  }

  const save = (v) => run(async () => {
    if (editing === 'new') {
      const created = await createReview(bookId, toPayload(v))
      onChange([...reviews, created])
    } else {
      const updated = await updateReview(editing, toPayload(v))
      onChange(reviews.map(r => r.id === updated.id ? updated : r))
    }
    setEditing(null)
  })

  const toggleStar = (r) => run(async () => {
    const updated = await updateReview(r.id, { starred: !r.starred })
    onChange(reviews.map(x => x.id === updated.id ? updated : x))
  })

  const remove = (r) => {
    if (!confirm(`Delete the review${r.reviewer ? ` by ${r.reviewer}` : ''}?`)) return
    run(async () => {
      await deleteReview(r.id)
      onChange(reviews.filter(x => x.id !== r.id))
    })
  }

  const move = (i, dir) => run(async () => {
    const ids = reviews.map(r => r.id)
    ;[ids[i], ids[i + dir]] = [ids[i + dir], ids[i]]
    onChange(await reorderReviews(bookId, ids))
  })

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', right: 24, bottom: 24, zIndex: 9000,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '12px 20px', borderRadius: 999, cursor: 'pointer',
        background: '#c9a84c', color: '#1a1410', border: 'none',
        fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: '0.88rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}>
        ✦ Praise <span style={{ background: 'rgba(26,20,16,0.15)', borderRadius: 999, padding: '1px 8px', fontSize: '0.75rem' }}>{reviews.length}</span>
      </button>

      {open && (
        <div onClick={e => { if (e.target === e.currentTarget) setOpen(false) }} style={{
          position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(26,20,16,0.55)',
          backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'flex-end',
          animation: 'fadeIn 0.15s ease',
        }}>
          <aside style={{
            width: 'min(480px, 100%)', height: '100%', overflowY: 'auto', boxSizing: 'border-box',
            background: '#fdf8f0', padding: '26px 24px 40px', color: '#3d2e1a',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: '0.65rem', color: '#c9a84c', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Book page</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', margin: '2px 0 0' }}>Praise & reviews</h2>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', color: '#9a8060', fontSize: '1.05rem' }}>×</button>
            </div>
            <p style={{ fontFamily: "'Lora', serif", fontSize: '0.75rem', fontStyle: 'italic', color: '#9a8060', lineHeight: 1.6, margin: '0 0 18px' }}>
              The first starred review sits in the hero. Every other review joins the praise slideshow before the blurb — other starred ones first, then the rest in this order.
            </p>

            {error && <div style={{ marginBottom: 14, padding: '9px 12px', background: 'rgba(180,60,40,0.07)', border: '1px solid rgba(180,60,40,0.2)', borderRadius: 8, fontFamily: "'Lora', serif", fontSize: '0.78rem', color: '#b43c28' }}>{error}</div>}

            {editing === 'new'
              ? <div style={{ marginBottom: 16 }}><ReviewForm onSubmit={save} onCancel={() => setEditing(null)} saving={saving} /></div>
              : <button onClick={() => setEditing('new')} style={{
                  width: '100%', padding: '12px', marginBottom: 16, borderRadius: 10, cursor: 'pointer',
                  border: '1px dashed rgba(201,168,76,0.5)', background: 'rgba(201,168,76,0.04)',
                  fontFamily: "'Lora', serif", fontSize: '0.85rem', color: '#9a8060',
                }}>+ Add a review</button>}

            {reviews.length === 0 && editing !== 'new' && (
              <div style={{ textAlign: 'center', padding: '30px 10px', fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '0.82rem', color: '#9a8060' }}>
                No reviews yet — the praise sections stay hidden until you add some.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reviews.map((r, i) => editing === r.id ? (
                <ReviewForm key={r.id} initial={r} onSubmit={save} onCancel={() => setEditing(null)} saving={saving} />
              ) : (
                <div key={r.id} style={{
                  padding: '12px 12px 12px 14px', borderRadius: 10, background: '#fff',
                  border: `1px solid ${r.starred ? 'rgba(201,168,76,0.55)' : 'rgba(201,168,76,0.15)'}`,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: '0.82rem', lineHeight: 1.5, color: '#3d2e1a', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      “{r.quote}”
                    </div>
                    <div style={{ marginTop: 6, fontFamily: "'Lora', serif", fontSize: '0.68rem', color: '#9a8060' }}>
                      {r.reviewer || 'Anonymous'} · {SOURCES.find(s => s.value === r.source)?.label}
                      {r.rating ? ` · ${'★'.repeat(r.rating)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 28px)', gap: 4 }}>
                    <IconBtn title={r.starred ? 'Unstar' : 'Star'} onClick={() => toggleStar(r)} disabled={saving}>
                      <span style={{ color: r.starred ? '#c9a84c' : undefined }}>{r.starred ? '✦' : '✧'}</span>
                    </IconBtn>
                    <IconBtn title="Edit" onClick={() => setEditing(r.id)} disabled={saving}>✎</IconBtn>
                    <IconBtn title="Move up" onClick={() => move(i, -1)} disabled={saving || i === 0}>↑</IconBtn>
                    <IconBtn title="Move down" onClick={() => move(i, 1)} disabled={saving || i === reviews.length - 1}>↓</IconBtn>
                    <IconBtn title="Delete" onClick={() => remove(r)} disabled={saving} danger>🗑</IconBtn>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
