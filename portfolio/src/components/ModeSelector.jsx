import { useState, useEffect, useRef } from 'react'

/**
 * ModeSelector
 *
 * Full-screen frosted-glass overlay. The page behind bleeds through the blur.
 * Editorial split-screen: dark terminal world (left) vs warm parchment author world (right).
 */
export default function ModeSelector({ currentMode, onSelect, onClose }) {
  const [hovered, setHovered] = useState(null)
  const [leaving, setLeaving] = useState(false)
  const overlayRef            = useRef(null)

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const choose = (mode) => {
    setLeaving(true)
    setTimeout(() => { onSelect(mode); onClose() }, 300)
  }

  const devHot    = hovered === 'dev'
  const authorHot = hovered === 'author'

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(6, 4, 12, 0.52)',
        backdropFilter: 'blur(24px) saturate(1.3) brightness(0.55)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.3) brightness(0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'msFadeIn 0.18s ease',
        opacity: leaving ? 0 : 1,
        transition: leaving ? 'opacity 0.28s ease' : 'none',
      }}
    >
      <div style={{
        position: 'relative',
        width: 'min(700px, 92vw)',
        borderRadius: 22,
        overflow: 'hidden',
        boxShadow: '0 40px 130px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.07)',
        animation: 'msSlideUp 0.3s cubic-bezier(0.34,1.15,0.64,1)',
      }}>

        {/* Split panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

          {/* ── Dev side ── */}
          <div
            onMouseEnter={() => setHovered('dev')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => choose('dev')}
            style={{
              position: 'relative', cursor: 'pointer',
              background: devHot
                ? 'linear-gradient(155deg, #071420 0%, #0b1e30 100%)'
                : 'linear-gradient(155deg, #04090f 0%, #070e18 100%)',
              padding: '50px 38px 40px',
              transition: 'background 0.3s',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              minHeight: 360,
            }}
          >
            {/* Scanlines */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,229,255,0.01) 3px, rgba(0,229,255,0.01) 4px)', pointerEvents: 'none' }} />
            {/* Glow */}
            <div style={{ position: 'absolute', top: '25%', left: '20%', width: 300, height: 300, background: `radial-gradient(circle, rgba(0,229,255,${devHot ? 0.1 : 0.035}) 0%, transparent 65%)`, pointerEvents: 'none', transition: 'background 0.4s' }} />
            {/* Top accent bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: currentMode === 'dev' ? 'linear-gradient(to right, transparent, #00e5ff 30%, #00e5ff 70%, transparent)' : devHot ? 'linear-gradient(to right, transparent, rgba(0,229,255,0.35), transparent)' : 'transparent', transition: 'background 0.3s' }} />

            <div style={{ position: 'relative' }}>
              <div style={{
                width: 54, height: 54, borderRadius: 12, marginBottom: 26,
                background: devHot ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.035)',
                border: `1px solid ${devHot ? 'rgba(0,229,255,0.45)' : 'rgba(255,255,255,0.07)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.25s',
                boxShadow: devHot ? '0 0 24px rgba(0,229,255,0.12)' : 'none',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke={devHot ? '#00e5ff' : 'rgba(255,255,255,0.3)'}
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transition: 'stroke 0.25s' }}>
                  <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
              </div>

              <div style={{ fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: '1.25rem', fontWeight: 700, color: devHot ? '#00e5ff' : 'rgba(255,255,255,0.82)', marginBottom: 6, letterSpacing: '-0.02em', transition: 'color 0.25s' }}>Developer</div>
              <div style={{ fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: '0.6rem', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.07em', marginBottom: 22 }}>software · projects · code</div>

              <div style={{ fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: '0.68rem', color: 'rgba(0,229,255,0.42)', lineHeight: 1.8 }}>
                <div><span style={{ color: 'rgba(0,229,255,0.22)' }}>$ </span>git log --oneline</div>
                <div><span style={{ color: 'rgba(0,229,255,0.22)' }}>$ </span>npm run build</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginTop: 28 }}>
              {currentMode === 'dev' ? (
                <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '0.56rem', color: '#00e5ff', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.28)', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#00e5ff', display: 'inline-block' }} />current
                </span>
              ) : <span />}
              <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '0.6rem', color: devHot ? 'rgba(0,229,255,0.55)' : 'transparent', transition: 'color 0.25s' }}>select →</span>
            </div>
          </div>

          {/* ── Author side ── */}
          <div
            onMouseEnter={() => setHovered('author')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => choose('author')}
            style={{
              position: 'relative', cursor: 'pointer',
              background: authorHot
                ? 'linear-gradient(155deg, #f9f2e4 0%, #ede2c8 100%)'
                : 'linear-gradient(155deg, #f5ecdc 0%, #e6d9c2 100%)',
              padding: '50px 38px 40px',
              transition: 'background 0.3s',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              minHeight: 360,
            }}
          >
            {/* Paper grain */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.35, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`, pointerEvents: 'none' }} />
            {/* Gold glow */}
            <div style={{ position: 'absolute', top: '20%', right: '15%', width: 280, height: 280, background: `radial-gradient(circle, rgba(201,168,76,${authorHot ? 0.22 : 0.09}) 0%, transparent 65%)`, pointerEvents: 'none', transition: 'background 0.4s' }} />
            {/* Top bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: currentMode === 'author' ? 'linear-gradient(to right, transparent, #c9a84c 30%, #c9a84c 70%, transparent)' : authorHot ? 'linear-gradient(to right, transparent, rgba(201,168,76,0.45), transparent)' : 'transparent', transition: 'background 0.3s' }} />

            <div style={{ position: 'relative' }}>
              <div style={{
                width: 54, height: 54, borderRadius: 12, marginBottom: 26,
                background: authorHot ? 'rgba(201,168,76,0.15)' : 'rgba(61,46,26,0.07)',
                border: `1px solid ${authorHot ? 'rgba(201,168,76,0.55)' : 'rgba(107,92,69,0.18)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.25s',
                boxShadow: authorHot ? '0 0 24px rgba(201,168,76,0.18)' : 'none',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke={authorHot ? '#c9a84c' : 'rgba(107,92,69,0.5)'}
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transition: 'stroke 0.25s' }}>
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>

              <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: '1.25rem', fontWeight: 900, color: authorHot ? '#8a6010' : '#3d2e1a', marginBottom: 6, letterSpacing: '-0.01em', transition: 'color 0.25s' }}>Author</div>
              <div style={{ fontFamily: "'Lora',Georgia,serif", fontStyle: 'italic', fontSize: '0.65rem', color: 'rgba(107,92,69,0.5)', marginBottom: 22 }}>books · stories · writing</div>

              <div style={{ fontFamily: "'Lora',Georgia,serif", fontStyle: 'italic', fontSize: '0.8rem', color: 'rgba(107,92,69,0.6)', lineHeight: 1.85 }}>
                <div>"Every story begins</div>
                <div style={{ paddingLeft: 16 }}>with a single word."</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginTop: 28 }}>
              {currentMode === 'author' ? (
                <span style={{ fontFamily: "'Lora',serif", fontStyle: 'italic', fontSize: '0.58rem', color: '#c9a84c', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.28)', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#c9a84c', display: 'inline-block' }} />current
                </span>
              ) : <span />}
              <span style={{ fontFamily: "'Lora',serif", fontStyle: 'italic', fontSize: '0.62rem', color: authorHot ? 'rgba(138,96,16,0.75)' : 'transparent', transition: 'color 0.25s' }}>enter →</span>
            </div>
          </div>
        </div>

        {/* Centre divider */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 1, background: 'linear-gradient(to bottom, transparent 4%, rgba(255,255,255,0.14) 18%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.14) 82%, transparent 96%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 9, height: 9, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', boxShadow: '0 0 14px rgba(255,255,255,0.35)', animation: 'msPulse 2.4s ease-in-out infinite', pointerEvents: 'none' }} />

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '12px 32px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', borderTop: '1px solid rgba(255,255,255,0.055)' }}>
          <kbd style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '0.55rem', color: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 6px' }}>esc</kbd>
          <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '0.55rem', color: 'rgba(255,255,255,0.14)' }}>or click outside to close</span>
        </div>
      </div>

      <style>{`
        @keyframes msFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes msSlideUp { from { opacity:0; transform:translateY(18px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes msPulse   { 0%,100% { transform:translate(-50%,-50%) scale(1); opacity:.45 } 50% { transform:translate(-50%,-50%) scale(1.7); opacity:1 } }
      `}</style>
    </div>
  )
}