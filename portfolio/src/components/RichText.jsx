/**
 * RichText.jsx
 *
 * Minimal rich-text system for book descriptions.
 *
 * Syntax (stored as plain string in DB):
 *   **bold**         → <strong>
 *   _italic_         → <em>
 *   __underline__    → underline
 *   # Heading        → large heading
 *   ## Subheading    → medium heading
 *   ### Small head   → small-caps label
 *   - item           → unordered list item
 *   1. item          → ordered list item
 *   blank line       → paragraph break
 *
 * Exports:
 *   <RichTextEditor value onChange />   — toolbar + textarea
 *   renderRichText(text, style)         — returns JSX for full display
 *   stripToPlain(text)                  → plain string for previews/cards
 */

import React from 'react'

// ── Strip ALL markup syntax to clean plain text (for cards, previews) ─────────
// Handles multiline spans: **text\n** _text\n_ etc.
export function stripToPlain(text) {
  if (!text) return ''
  return text
    // Remove headings
    .replace(/^#{1,3}\s+/gm, '')
    // Remove bold (including across newlines)
    .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
    // Remove underline (including across newlines)
    .replace(/__([\s\S]*?)__/g, '$1')
    // Remove italic — only single underscores not preceded/followed by another underscore
    .replace(/(?<![_*])_(?!_)([\s\S]*?)(?<!_)_(?![_*])/g, '$1')
    // Remove list markers
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Collapse multiple blank lines and newlines to single spaces
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    // Clean up any leftover lone markers that didn't match (malformed syntax)
    .replace(/\*\*/g, '')
    .replace(/(?<![_])\b__\b(?![_])/g, '')
    .trim()
}

// ── Parse inline markup within a single segment of text ──────────────────────
// Handles **bold**, __underline__, _italic_ — robust against edge cases
function parseInline(text, keyPrefix) {
  if (!text) return null
  const parts = []
  // Order matters: check __ before _ to avoid greedy underscore matches
  const re = /(\*\*[\s\S]*?\*\*|__[\s\S]*?__|(?<![_*])_(?!_)[\s\S]*?(?<!_)_(?![_*]))/g
  let last = 0
  let m
  let i = 0

  while ((m = re.exec(text)) !== null) {
    // Text before this match
    if (m.index > last) {
      parts.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(last, m.index)}</span>)
    }
    const raw = m[0]
    if (raw.startsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-b${i++}`}>{raw.slice(2, -2)}</strong>)
    } else if (raw.startsWith('__')) {
      parts.push(
        <span key={`${keyPrefix}-u${i++}`} style={{ textDecoration: 'underline' }}>
          {raw.slice(2, -2)}
        </span>
      )
    } else {
      // italic _..._
      parts.push(<em key={`${keyPrefix}-e${i++}`}>{raw.slice(1, -1)}</em>)
    }
    last = m.index + raw.length
  }

  // Remaining text
  if (last < text.length) {
    parts.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(last)}</span>)
  }

  return parts.length === 0 ? text : parts
}

// ── Render rich text as styled JSX ───────────────────────────────────────────
export function renderRichText(text, baseStyle = {}) {
  if (!text) return null

  // Pre-process: normalise line endings
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalised.split('\n')
  const nodes = []
  let ulBuf = []
  let olBuf = []
  let key = 0

  const flushUL = () => {
    if (!ulBuf.length) return
    nodes.push(
      <ul key={`ul${key++}`} style={{ paddingLeft: 22, margin: '10px 0', listStyle: 'none' }}>
        {ulBuf.map((item, i) => (
          <li key={i} style={{ ...baseStyle, marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: baseStyle.accentColor || '#c9a84c', marginTop: 2, fontSize: '0.6em', lineHeight: 2, flexShrink: 0 }}>◆</span>
            <span>{parseInline(item, `ul${key}-${i}`)}</span>
          </li>
        ))}
      </ul>
    )
    ulBuf = []
  }

  const flushOL = () => {
    if (!olBuf.length) return
    nodes.push(
      <ol key={`ol${key++}`} style={{ paddingLeft: 22, margin: '10px 0', listStyle: 'none' }}>
        {olBuf.map((item, i) => (
          <li key={i} style={{ ...baseStyle, marginBottom: 6, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: baseStyle.accentColor || '#c9a84c', fontSize: '0.85em', minWidth: 18, flexShrink: 0 }}>{i + 1}.</span>
            <span>{parseInline(item, `ol${key}-${i}`)}</span>
          </li>
        ))}
      </ol>
    )
    olBuf = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (/^###\s+/.test(line)) {
      flushUL(); flushOL()
      nodes.push(
        <div key={key++} style={{
          fontFamily: "'Lora', Georgia, serif", fontSize: '0.65rem',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: baseStyle.accentColor || '#c9a84c', marginTop: 20, marginBottom: 6,
        }}>
          {parseInline(line.replace(/^###\s+/, ''), `h3-${key}`)}
        </div>
      )
    } else if (/^##\s+/.test(line)) {
      flushUL(); flushOL()
      nodes.push(
        <div key={key++} style={{
          fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.25rem',
          fontWeight: 700, color: baseStyle.headingColor || '#f5f0e8',
          marginTop: 24, marginBottom: 8, lineHeight: 1.3,
        }}>
          {parseInline(line.replace(/^##\s+/, ''), `h2-${key}`)}
        </div>
      )
    } else if (/^#\s+/.test(line)) {
      flushUL(); flushOL()
      nodes.push(
        <div key={key++} style={{
          fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.6rem',
          fontWeight: 900, color: baseStyle.headingColor || '#f5f0e8',
          marginTop: 28, marginBottom: 10, lineHeight: 1.15,
        }}>
          {parseInline(line.replace(/^#\s+/, ''), `h1-${key}`)}
        </div>
      )
    } else if (/^[-*]\s+/.test(line)) {
      flushOL()
      ulBuf.push(line.replace(/^[-*]\s+/, ''))
    } else if (/^\d+\.\s+/.test(line)) {
      flushUL()
      olBuf.push(line.replace(/^\d+\.\s+/, ''))
    } else if (line.trim() === '') {
      flushUL(); flushOL()
      nodes.push(<div key={key++} style={{ height: 12 }} />)
    } else {
      flushUL(); flushOL()
      nodes.push(
        <p key={key++} style={{ ...baseStyle, margin: '0 0 4px', lineHeight: baseStyle.lineHeight || 1.9 }}>
          {parseInline(line, `p-${key}`)}
        </p>
      )
    }
  }

  flushUL(); flushOL()
  return <>{nodes}</>
}

// ── Toolbar button ────────────────────────────────────────────────────────────
function TBtn({ label, title, onClick, mono }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        padding: '4px 9px',
        borderRadius: 5,
        border: '1px solid rgba(201,168,76,0.2)',
        background: 'rgba(201,168,76,0.04)',
        fontFamily: mono ? 'monospace' : "'Lora', serif",
        fontSize: mono ? '0.75rem' : '0.8rem',
        color: '#9a8060',
        cursor: 'pointer',
        transition: 'all 0.15s',
        lineHeight: 1,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(201,168,76,0.12)'
        e.currentTarget.style.color = '#c9a84c'
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(201,168,76,0.04)'
        e.currentTarget.style.color = '#9a8060'
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'
      }}
    >
      {label}
    </button>
  )
}

// ── RichTextEditor ────────────────────────────────────────────────────────────
export function RichTextEditor({ value, onChange, rows = 8, placeholder }) {
  const ref = React.useRef(null)

  const wrap = (prefix, suffix = '') => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value: v } = el
    const sel = v.slice(s, e) || 'text'
    const newVal = v.slice(0, s) + prefix + sel + suffix + v.slice(e)
    onChange(newVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(s + prefix.length, s + prefix.length + sel.length)
    }, 0)
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
    const newVal = v.slice(0, lineStart) + newLine + v.slice(end)
    onChange(newVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length)
    }, 0)
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

  return (
    <div>
      <div style={{
        display: 'flex', gap: 5, flexWrap: 'wrap',
        padding: '8px 10px',
        background: 'rgba(201,168,76,0.03)',
        border: '1px solid rgba(201,168,76,0.15)',
        borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
      }}>
        <TBtn label="B" title="Bold  Ctrl+B" onClick={() => wrap('**', '**')} />
        <TBtn label="I" title="Italic  Ctrl+I" onClick={() => wrap('_', '_')} mono />
        <TBtn label="U" title="Underline  Ctrl+U" onClick={() => wrap('__', '__')} />
        <div style={{ width: 1, background: 'rgba(201,168,76,0.15)', margin: '2px 3px' }} />
        <TBtn label="H1" title="Large heading  Ctrl+1" onClick={() => linePrefix('# ')} mono />
        <TBtn label="H2" title="Medium heading  Ctrl+2" onClick={() => linePrefix('## ')} mono />
        <TBtn label="H3" title="Small label  Ctrl+3" onClick={() => linePrefix('### ')} mono />
        <div style={{ width: 1, background: 'rgba(201,168,76,0.15)', margin: '2px 3px' }} />
        <TBtn label="• List" title="Bullet list" onClick={() => linePrefix('- ')} />
        <TBtn label="1. List" title="Numbered list" onClick={() => linePrefix('1. ')} />
        <div style={{ flex: 1 }} />
        <span style={{
          fontFamily: "'Lora', serif", fontSize: '0.6rem',
          color: 'rgba(107,92,69,0.38)', fontStyle: 'italic',
          alignSelf: 'center', paddingRight: 4,
        }}>
          Ctrl+B/I/U · Ctrl+1/2/3
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder || 'Write your description… use **bold**, _italic_, # Heading, - list item'}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '12px 14px',
          background: '#fdf9f3',
          border: '1px solid rgba(201,168,76,0.25)',
          borderTop: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '0 0 8px 8px',
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.88rem', color: '#3d2e1a',
          lineHeight: 1.75,
          outline: 'none',
          resize: 'vertical',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.6)'}
        onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'}
      />
    </div>
  )
}