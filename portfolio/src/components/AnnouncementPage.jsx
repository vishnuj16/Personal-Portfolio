import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateAnnouncement, deleteAnnouncement } from '../api'
import { renderRichText, RichTextEditor } from './RichText'

// ── Colour palette (warm ink + alert amber) ───────────────────────────────────
const C = {
  bg:          '#1a1208',
  bgMid:       '#221a0a',
  ink:         '#f5f0e8',
  inkMuted:    'rgba(245,240,232,0.55)',
  inkFaint:    'rgba(245,240,232,0.25)',
  amber:       '#e8a030',
  amberDim:    'rgba(232,160,48,0.18)',
  amberBorder: 'rgba(232,160,48,0.35)',
  red:         'rgba(220,60,60,0.85)',
  redDim:      'rgba(220,60,60,0.12)',
}

function fmt(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AnnouncementPage({ announcement: initial, onBack, onUpdated, onDeleted }) {
  const { isAdmin, isEditMode } = useAuth()
  const [ann,      setAnn]      = useState(initial)
  const [editing,  setEditing]  = useState(false)
  const [title,    setTitle]    = useState(initial.title)
  const [body,     setBody]     = useState(initial.body || '')
  const [pinned,   setPinned]   = useState(!!initial.pinned)
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')

  // Scroll to top on open
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const handleSave = async () => {
    if (!title.trim()) { setErr('Title is required'); return }
    setSaving(true); setErr('')
    try {
      const updated = await updateAnnouncement(ann.id, { title: title.trim(), body, pinned })
      // Update local display state
      setAnn(updated)
      // Sync edit fields to the saved values so re-editing shows correct content
      setTitle(updated.title)
      setBody(updated.body || '')
      setPinned(!!updated.pinned)
      setEditing(false)
      // Notify parent so the list and viewingAnn stay in sync
      if (onUpdated) onUpdated(updated)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${ann.title}"? This cannot be undone.`)) return
    try {
      await deleteAnnouncement(ann.id)
      if (onDeleted) onDeleted(ann.id)
      if (onBack) onBack()
    } catch (e) { alert(e.message) }
  }

  const cancelEdit = () => {
    setTitle(ann.title); setBody(ann.body || ''); setPinned(!!ann.pinned)
    setEditing(false); setErr('')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: "'Lora', Georgia, serif" }}>

      {/* ── Atmospheric top bar ─────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(90deg, ${C.bgMid} 0%, #2c1e08 50%, ${C.bgMid} 100%)`,
        borderBottom: `1px solid ${C.amberBorder}`,
        padding: '14px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(12px)',
      }}>
        {/* Back */}
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          color: C.inkMuted, fontFamily: "'Lora', serif", fontSize: '0.85rem',
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = C.amber}
          onMouseLeave={e => e.currentTarget.style.color = C.inkMuted}
        >
          <span style={{ fontSize: '1rem' }}>←</span> Back
        </button>

        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertIcon size={16} color={C.amber} />
          <span style={{
            fontFamily: "'Playfair Display', serif", fontSize: '0.75rem',
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: C.amber, opacity: 0.85,
          }}>Announcement</span>
          {ann.pinned && (
            <span style={{
              fontFamily: "'Lora', serif", fontSize: '0.6rem',
              background: C.amberDim, border: `1px solid ${C.amberBorder}`,
              color: C.amber, padding: '2px 8px', borderRadius: 20,
              letterSpacing: '0.06em',
            }}>📌 Pinned</span>
          )}
        </div>

        {/* Admin actions */}
        {isAdmin && isEditMode && !editing && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setEditing(true)} style={editBtnStyle(C.amber, C.amberDim, C.amberBorder)}>
              ✎ Edit
            </button>
            <button onClick={handleDelete} style={editBtnStyle(C.red, C.redDim, 'rgba(220,60,60,0.3)')}>
              ✕ Delete
            </button>
          </div>
        )}
        {isAdmin && isEditMode && editing && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={editBtnStyle(C.amber, C.amberDim, C.amberBorder)}>
              {saving ? 'Saving…' : '✓ Save'}
            </button>
            <button onClick={cancelEdit} style={editBtnStyle(C.inkMuted, 'transparent', C.inkFaint)}>
              Cancel
            </button>
          </div>
        )}
        {/* spacer when not admin */}
        {(!isAdmin || !isEditMode) && <div style={{ width: 80 }} />}
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '64px 40px 100px' }}>

        {/* Decorative rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${C.amberBorder}, transparent)` }} />
          <AlertIcon size={20} color={C.amber} />
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, ${C.amberBorder}, transparent)` }} />
        </div>

        {/* Date */}
        <div style={{
          fontFamily: "'Lora', serif", fontSize: '0.72rem', fontStyle: 'italic',
          color: C.inkFaint, letterSpacing: '0.06em', marginBottom: 16, textAlign: 'center',
        }}>
          {fmt(ann.created_at)}
          {ann.updated_at !== ann.created_at && (
            <span style={{ marginLeft: 12, opacity: 0.6 }}>· updated {fmt(ann.updated_at)}</span>
          )}
        </div>

        {/* ── EDIT MODE ─────────────────────────────────────────────────────── */}
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: C.amber, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Title *
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Announcement title"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#221a0a', border: `1px solid ${C.amberBorder}`,
                  borderRadius: 8, padding: '12px 16px',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.5rem', fontWeight: 700, color: C.ink,
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = C.amber}
                onBlur={e => e.target.style.borderColor = C.amberBorder}
              />
            </div>

            {/* Pinned */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox" checked={pinned}
                onChange={e => setPinned(e.target.checked)}
                style={{ accentColor: C.amber, width: 16, height: 16 }}
              />
              <span style={{ fontSize: '0.82rem', color: C.inkMuted }}>
                📌 Pin this announcement (shows first)
              </span>
            </label>

            {/* Body — RichTextEditor, dark-themed wrapper */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: C.amber, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Body
              </label>
              <div style={{ '--rte-bg': '#221a0a', '--rte-border': C.amberBorder }}>
                <AnnouncementEditor value={body} onChange={setBody} />
              </div>
            </div>

            {err && (
              <div style={{ color: C.red, fontSize: '0.8rem', background: C.redDim, border: `1px solid rgba(220,60,60,0.3)`, borderRadius: 6, padding: '8px 12px' }}>
                ✗ {err}
              </div>
            )}
          </div>

        ) : (
          /* ── VIEW MODE ─────────────────────────────────────────────────────── */
          <>
            {/* Title */}
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900,
              color: C.ink, lineHeight: 1.2, textAlign: 'center',
              marginBottom: 40, letterSpacing: '-0.01em',
            }}>
              {ann.title}
            </h1>

            {/* Body */}
            {ann.body ? (
              <div style={{
                fontSize: '1.05rem', lineHeight: 1.95,
                '--rt-link-color': C.amber,
                '--rt-link-underline': 'rgba(232,160,48,0.35)',
                '--rt-link-hover': '#f0c060',
                '--rt-link-glow': 'rgba(232,160,48,0.45)',
              }}>
                {renderRichText(ann.body, {
                  color: 'rgba(245,240,232,0.82)',
                  headingColor: C.ink,
                  accentColor: C.amber,
                  lineHeight: 1.95,
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: '1.05rem',
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: C.inkFaint, fontStyle: 'italic', padding: '40px 0' }}>
                No body text yet.
              </div>
            )}

            {/* Closing ornament */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 64 }}>
              <ClosingOrnament color={C.amber} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Dark-themed RichTextEditor wrapper for announcement editing ───────────────
function AnnouncementEditor({ value, onChange }) {
  const [ref] = useState(() => ({ current: null }))

  const wrap = (prefix, suffix = '') => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value: v } = el
    const sel = v.slice(s, e) || 'text'
    const newVal = v.slice(0, s) + prefix + sel + suffix + v.slice(e)
    onChange(newVal)
    setTimeout(() => { el.focus(); el.setSelectionRange(s + prefix.length, s + prefix.length + sel.length) }, 0)
  }

  const linePrefix = (prefix) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, value: v } = el
    const lineStart = v.lastIndexOf('\n', s - 1) + 1
    const lineEnd = v.indexOf('\n', s)
    const end = lineEnd === -1 ? v.length : lineEnd
    const line = v.slice(lineStart, end)
    const newLine = line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line
    onChange(v.slice(0, lineStart) + newLine + v.slice(end))
    setTimeout(() => { el.focus(); el.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length) }, 0)
  }

  const handleKeyDown = (e) => {
    if (!e.ctrlKey && !e.metaKey) return
    const k = e.key.toLowerCase()
    if (k === 'b') { e.preventDefault(); wrap('**', '**') }
    else if (k === 'i') { e.preventDefault(); wrap('_', '_') }
    else if (k === 'u') { e.preventDefault(); wrap('__', '__') }
    else if (k === '1') { e.preventDefault(); linePrefix('# ') }
    else if (k === '2') { e.preventDefault(); linePrefix('## ') }
    else if (k === '3') { e.preventDefault(); linePrefix('### ') }
  }

  const btnStyle = (active) => ({
    padding: '4px 9px', borderRadius: 5, cursor: 'pointer', lineHeight: 1,
    border: `1px solid ${C.amberBorder}`,
    background: active ? C.amberDim : 'rgba(232,160,48,0.04)',
    color: C.amber, fontSize: '0.75rem', fontFamily: 'monospace',
    transition: 'all 0.15s',
  })

  const Btn = ({ label, title, onClick }) => (
    <button type="button" title={title} onClick={onClick} style={btnStyle(false)}
      onMouseEnter={e => e.currentTarget.style.background = C.amberDim}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,160,48,0.04)'}
    >{label}</button>
  )

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 5, flexWrap: 'wrap', padding: '8px 10px',
        background: 'rgba(232,160,48,0.04)',
        border: `1px solid ${C.amberBorder}`, borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
      }}>
        <Btn label="B" title="Bold Ctrl+B" onClick={() => wrap('**', '**')} />
        <Btn label="I" title="Italic Ctrl+I" onClick={() => wrap('_', '_')} />
        <Btn label="U" title="Underline Ctrl+U" onClick={() => wrap('__', '__')} />
        <div style={{ width: 1, background: C.amberBorder, margin: '2px 3px' }} />
        <Btn label="H1" title="Heading 1 Ctrl+1" onClick={() => linePrefix('# ')} />
        <Btn label="H2" title="Heading 2 Ctrl+2" onClick={() => linePrefix('## ')} />
        <Btn label="H3" title="Heading 3 Ctrl+3" onClick={() => linePrefix('### ')} />
        <div style={{ width: 1, background: C.amberBorder, margin: '2px 3px' }} />
        <Btn label="• List" title="Bullet list" onClick={() => linePrefix('- ')} />
        <Btn label="1. List" title="Numbered list" onClick={() => linePrefix('1. ')} />
        <div style={{ width: 1, background: C.amberBorder, margin: '2px 3px' }} />
        <Btn label="🔗 Link" title="Hyperlink [text](url)" onClick={() => {
          const el = ref.current
          if (!el) return
          const { selectionStart: s, selectionEnd: e, value: v } = el
          const sel = v.slice(s, e)
          const url = window.prompt('Enter URL:', 'https://')
          if (!url) return
          const insert = `[${sel || 'link text'}](${url})`
          onChange(v.slice(0, s) + insert + v.slice(e))
          setTimeout(() => el.focus(), 0)
        }} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.6rem', color: C.inkFaint, fontStyle: 'italic', alignSelf: 'center', paddingRight: 4 }}>
          Ctrl+B/I/U · Ctrl+1/2/3
        </span>
      </div>
      <textarea
        ref={el => { ref.current = el }}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={14}
        placeholder="Write your announcement… use **bold**, _italic_, # Heading, - list item"
        style={{
          width: '100%', boxSizing: 'border-box', padding: '14px 16px',
          background: '#221a0a',
          border: `1px solid ${C.amberBorder}`,
          borderTop: `1px solid rgba(232,160,48,0.12)`,
          borderRadius: '0 0 8px 8px',
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.92rem', color: C.ink, lineHeight: 1.8,
          outline: 'none', resize: 'vertical',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => e.target.style.borderColor = C.amber}
        onBlur={e => e.target.style.borderColor = C.amberBorder}
      />
    </div>
  )
}

// ── Icons & ornaments ─────────────────────────────────────────────────────────
function AlertIcon({ size = 20, color = '#e8a030' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 20h20L12 2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill={`${color}18`} />
      <line x1="12" y1="9" x2="12" y2="14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill={color} />
    </svg>
  )
}

function ClosingOrnament({ color = '#e8a030' }) {
  return (
    <svg width="120" height="24" viewBox="0 0 120 24" fill="none">
      <line x1="0" y1="12" x2="48" y2="12" stroke={color} strokeWidth="0.8" opacity="0.4" />
      <polygon points="60,4 64,12 60,20 56,12" fill={color} opacity="0.6" />
      <circle cx="60" cy="12" r="2" fill={color} opacity="0.9" />
      <line x1="72" y1="12" x2="120" y2="12" stroke={color} strokeWidth="0.8" opacity="0.4" />
    </svg>
  )
}

function editBtnStyle(color, bg, border) {
  return {
    background: bg, border: `1px solid ${border}`, color,
    padding: '5px 14px', borderRadius: 5, cursor: 'pointer',
    fontFamily: "'Lora', serif", fontSize: '0.78rem',
    transition: 'all 0.15s',
  }
}