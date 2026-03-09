import { useState, useEffect, useRef } from 'react'

// ─── ModeSelector ─────────────────────────────────────────────────────────────
// Renders as a portal-style overlay when triggered from the navbar logo.
// currentMode: 'dev' | 'author'
// onSelect(mode): callback
export default function ModeSelector({ currentMode, onSelect, onClose }) {
  const [hovered, setHovered] = useState(null) // 'dev' | 'author'
  const overlayRef = useRef(null)

  // Close on Escape or outside click
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isDev = currentMode === 'dev'

  // Theme adapts to current mode
  const overlayBg = isDev
    ? 'rgba(3, 7, 18, 0.92)'
    : 'rgba(245, 240, 232, 0.92)'

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: overlayBg,
        backdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.18s ease',
      }}
    >
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        animation: 'slideUp 0.22s ease',
      }}>

        {/* Header */}
        <div style={{
          marginBottom: 40, textAlign: 'center',
          fontFamily: isDev ? 'var(--font-mono)' : "'Playfair Display', Georgia, serif",
          color: isDev ? 'var(--text-muted)' : '#6b5c45',
          fontSize: isDev ? '0.72rem' : '0.85rem',
          letterSpacing: isDev ? '0.15em' : '0.05em',
        }}>
          {isDev ? '$ select --mode' : 'Choose your world'}
        </div>

        {/* Two cards side by side */}
        <div style={{ display: 'flex', gap: 20 }}>

          {/* ── Dev card — icon/text colour always respects isDev (the UI theme) ── */}
          <ModeCard
            active={currentMode === 'dev'}
            hovered={hovered === 'dev'}
            onHover={() => setHovered('dev')}
            onLeave={() => setHovered(null)}
            onClick={() => { onSelect('dev'); onClose() }}
            isDarkUI={isDev}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 14,
              background: hovered === 'dev' || currentMode === 'dev'
                ? 'rgba(0,229,255,0.12)'
                : isDev ? 'rgba(255,255,255,0.04)' : 'rgba(107,92,69,0.06)',
              border: `1px solid ${
                hovered === 'dev' || currentMode === 'dev'
                  ? 'rgba(0,229,255,0.5)'
                  : isDev ? 'rgba(255,255,255,0.1)' : 'rgba(107,92,69,0.15)'
              }`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', margin: '0 auto 20px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke={hovered === 'dev' || currentMode === 'dev'
                  ? '#00e5ff'
                  : isDev ? 'rgba(255,255,255,0.4)' : 'rgba(107,92,69,0.5)'}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'stroke 0.2s' }}>
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
            </div>
            <CardLabel isDark={isDev}
              color={hovered === 'dev' || currentMode === 'dev'
                ? '#00e5ff'
                : isDev ? 'rgba(255,255,255,0.85)' : '#3d2e1a'}>
              Developer
            </CardLabel>
            <CardSub isDark={isDev}>Software, projects & code</CardSub>
            {currentMode === 'dev' && <ActivePip color="#00e5ff" label="current" dark={isDev} />}
          </ModeCard>

          {/* ── Author card ── */}
          <ModeCard
            active={currentMode === 'author'}
            hovered={hovered === 'author'}
            onHover={() => setHovered('author')}
            onLeave={() => setHovered(null)}
            onClick={() => { onSelect('author'); onClose() }}
            isDarkUI={isDev}
            isAuthorCard
          >
            <div style={{
              width: 64, height: 64, borderRadius: 14,
              background: hovered === 'author' || currentMode === 'author'
                ? 'rgba(201,168,76,0.15)'
                : isDev ? 'rgba(255,255,255,0.04)' : 'rgba(201,168,76,0.08)',
              border: `1px solid ${
                hovered === 'author' || currentMode === 'author'
                  ? 'rgba(201,168,76,0.6)'
                  : isDev ? 'rgba(255,255,255,0.1)' : 'rgba(201,168,76,0.25)'
              }`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', margin: '0 auto 20px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke={hovered === 'author' || currentMode === 'author'
                  ? '#c9a84c'
                  : isDev ? 'rgba(255,255,255,0.4)' : 'rgba(107,92,69,0.6)'}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'stroke 0.2s' }}>
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <CardLabel isDark={isDev}
              color={hovered === 'author' || currentMode === 'author'
                ? '#c9a84c'
                : isDev ? 'rgba(255,255,255,0.85)' : '#3d2e1a'}>
              Author
            </CardLabel>
            <CardSub isDark={isDev}>Books, stories & writing</CardSub>
            {currentMode === 'author' && <ActivePip color="#c9a84c" label="current" dark={isDev} />}
          </ModeCard>

        </div>

        {/* Dismiss hint */}
        <div style={{
          marginTop: 36,
          fontFamily: isDev ? 'var(--font-mono)' : "'Lora', Georgia, serif",
          fontSize: '0.68rem',
          color: isDev ? 'rgba(255,255,255,0.15)' : 'rgba(107,92,69,0.4)',
          letterSpacing: isDev ? '0.08em' : '0.02em',
        }}>
          {isDev ? 'esc to close' : 'press escape or click outside'}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ModeCard({ children, active, hovered, onHover, onLeave, onClick, isDarkUI, isAuthorCard }) {
  const bg = isDarkUI
    ? (hovered || active ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)')
    : (hovered || active
        ? isAuthorCard ? 'rgba(201,168,76,0.08)' : 'rgba(0,229,255,0.04)'
        : 'rgba(255,255,255,0.6)')

  const borderColor = isDarkUI
    ? (active ? 'rgba(255,255,255,0.2)' : hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)')
    : (active ? (isAuthorCard ? 'rgba(201,168,76,0.5)' : 'rgba(0,229,255,0.4)') : hovered ? 'rgba(107,92,69,0.25)' : 'rgba(107,92,69,0.12)')

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        width: 180, padding: '32px 24px',
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.22s ease',
        boxShadow: hovered
          ? isDarkUI ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(0,0,0,0.1)'
          : 'none',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      {children}
    </div>
  )
}

function CardLabel({ children, color, isDark }) {
  return (
    <div style={{
      fontFamily: isDark ? 'var(--font-mono)' : "'Playfair Display', Georgia, serif",
      fontSize: isDark ? '0.88rem' : '1.1rem',
      fontWeight: 600,
      color: color,
      marginBottom: 6,
      transition: 'color 0.2s',
      letterSpacing: isDark ? '0.04em' : '0.01em',
    }}>
      {children}
    </div>
  )
}

function CardSub({ children, isDark }) {
  return (
    <div style={{
      fontFamily: isDark ? 'var(--font-mono)' : "'Lora', Georgia, serif",
      fontSize: isDark ? '0.65rem' : '0.75rem',
      color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(107,92,69,0.6)',
      lineHeight: 1.5,
      fontStyle: isDark ? 'normal' : 'italic',
    }}>
      {children}
    </div>
  )
}

function ActivePip({ color, label, dark }) {
  return (
    <div style={{
      marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6,
      background: dark ? `${color}15` : `${color}20`,
      border: `1px solid ${color}40`,
      borderRadius: 999, padding: '3px 10px',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{
        fontFamily: dark ? 'var(--font-mono)' : "'Lora', serif",
        fontSize: '0.6rem', color: color, letterSpacing: '0.05em',
      }}>
        {label}
      </span>
    </div>
  )
}