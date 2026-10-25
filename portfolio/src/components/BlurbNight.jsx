import { useEffect, useRef } from 'react'
import { renderRichText } from './RichText'
import useInView from '../hooks/useInView'
import { rgba } from '../utils/color'

// ── The blurb, read by candlelight (immersive mode) ───────────────────────────
// Cream EB Garamond set straight onto the dark scene. The 3D layer puts a warm,
// flickering glow behind the text column (it tracks `textRef`) and lets loose
// letters drift around it. Paragraphs near the middle of the screen are fully lit;
// the rest fall into shadow, so the light follows the reader. The book's details
// are an engraved gold plaque rendered in 3D into `plaqueRef`'s slot.

const srOnly = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }

const GARAMOND = "'EB Garamond', Garamond, Georgia, serif"
const GOLD = '#d9b56a'
const TEXT = 'rgba(245,236,214,0.88)'

function useLantern(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0
    const update = () => {
      frame = 0
      const vh = window.innerHeight
      for (const child of el.children) {
        const r = child.getBoundingClientRect()
        const d = Math.abs(r.top + r.height / 2 - vh * 0.5) / (vh * 0.55)
        const t = Math.min(1, Math.max(0, (d - 0.35) / 0.65))
        child.style.opacity = (1 - t * t * (3 - 2 * t) * 0.74).toFixed(3)
      }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [ref])
}

export default function BlurbNight({ book, isMobile, dropCap, textRef, plaqueRef, details = [] }) {
  const [headRef, headIn] = useInView(0.3)
  const bodyRef = useRef(null)
  useLantern(bodyRef)

  const setText = el => {
    bodyRef.current = el
    if (textRef) textRef.current = el
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Header */}
      <div ref={headRef} style={{
        textAlign: 'center', marginBottom: isMobile ? 48 : 72,
        opacity: headIn ? 1 : 0, transform: headIn ? 'none' : 'translateY(24px)',
        transition: 'opacity 1.2s ease, transform 1.2s cubic-bezier(.16,1,.3,1)',
      }}>
        <svg width="200" height="14" viewBox="0 0 200 14" aria-hidden style={{ display: 'block', margin: '0 auto 22px' }}>
          <line x1="0" y1="7" x2="86" y2="7" stroke={rgba(GOLD, 0.55)} />
          <line x1="114" y1="7" x2="200" y2="7" stroke={rgba(GOLD, 0.55)} />
          <path d="M100 1 L106 7 L100 13 L94 7 Z" fill={GOLD} />
        </svg>
        <div style={{
          fontFamily: GARAMOND, fontStyle: 'italic', fontSize: '0.95rem', letterSpacing: '0.3em',
          textTransform: 'uppercase', color: rgba(GOLD, 0.85), marginBottom: 14,
        }}>About the Book</div>
        <h2 style={{
          margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
          fontSize: 'clamp(2rem, 4.4vw, 3.4rem)', lineHeight: 1.12,
          backgroundImage: 'linear-gradient(180deg, #fcf5e4 0%, #f1dfb6 55%, #ddbb78 100%)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          filter: `drop-shadow(0 0 30px ${rgba(GOLD, 0.18)})`,
        }}>{book.title}</h2>
      </div>

      <div style={{
        display: 'grid', alignItems: 'start', justifyContent: 'center',
        gridTemplateColumns: isMobile || !book.description ? '1fr' : 'minmax(0, 640px) 300px',
        gap: isMobile ? 56 : 96,
      }}>
        {book.description && (
          <div ref={setText} className={dropCap ? 'blurb-night drop-cap' : 'blurb-night'}>
            {renderRichText(book.description, {
              fontFamily: GARAMOND, fontSize: isMobile ? '1.12rem' : '1.26rem',
              color: TEXT, lineHeight: 1.85,
              headingColor: '#fbf3df', accentColor: GOLD,
            })}
          </div>
        )}
        {details.length > 0 && (
          <div ref={plaqueRef} style={{
            width: isMobile ? 280 : 300, height: (isMobile ? 280 : 300) * 1.3, margin: isMobile ? '0 auto' : 0,
            ...(isMobile ? {} : { position: 'sticky', top: 120 }),
          }}>
            <dl style={srOnly}>
              {details.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          </div>
        )}
      </div>

      <style>{`
        .blurb-night > * { transition: opacity 0.25s linear; }
        .blurb-night.drop-cap p:first-of-type::first-letter {
          float: left; font-family: 'Playfair Display', Georgia, serif; font-weight: 700;
          font-size: 4.6em; line-height: 0.78; padding: 0.06em 0.12em 0 0;
          color: ${GOLD}; text-shadow: 0 0 24px ${rgba(GOLD, 0.55)};
        }
      `}</style>
    </div>
  )
}
