import { useState, useEffect, useRef } from 'react'
import { rgba, darken, isLight } from '../utils/color'

// ── 3D book cover ──────────────────────────────────────────────────────────────
// Pure-CSS book: front cover image, spine in the theme colour, page block, shadow.
// Desktop: tilts toward the cursor with a moving sheen.
// Mobile: rotates with scroll and settles facing forward.
// prefers-reduced-motion: static angled pose.

const REST = { ry: 22, rx: -4 }

export default function Cover3D({ src, title, accent, pages, isMobile }) {
  const bookRef  = useRef(null)
  const sheenRef = useRef(null)
  const [aspect, setAspect] = useState(1.5)   // height / width, updated once the image loads

  const maxW = isMobile ? 220 : 320
  const maxH = isMobile ? 330 : 480
  const W = Math.round(Math.min(maxW, maxH / aspect))
  const H = Math.round(W * aspect)
  // Thicker books get a thicker spine
  const D = Math.round(Math.min(44, Math.max(18, (pages || 240) / 10)) * (isMobile ? 0.75 : 1))

  useEffect(() => {
    const book = bookRef.current
    if (!book) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const apply = (ry, rx, sheen) => {
      book.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`
      if (sheenRef.current) sheenRef.current.style.backgroundPosition = `${sheen}% 0`
    }
    apply(REST.ry, REST.rx, 60)
    if (reduced) return

    let frame = 0
    const schedule = fn => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fn) }

    if (isMobile) {
      const onScroll = () => schedule(() => {
        const p = Math.min(1, window.scrollY / 350)
        apply(4 + (REST.ry + 10) * (1 - p), REST.rx * (1 - p), 60 - p * 40)
      })
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll) }
    }

    const onMove = (e) => schedule(() => {
      const r  = book.getBoundingClientRect()
      const clamp = v => Math.max(-1, Math.min(1, v))
      const dx = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2))
      const dy = clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2))
      apply(REST.ry - 4 + dx * 16, REST.rx + 1 - dy * 9, 60 - dx * 45)
    })
    const onLeave = () => schedule(() => apply(REST.ry, REST.rx, 60))
    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [isMobile])

  const face = { position: 'absolute', backfaceVisibility: 'hidden' }
  const pageEdge = `repeating-linear-gradient(to right, #f4ecda 0 1px, #e3d6bb 1px 2px)`
  const spineText = isLight(accent) ? '#1a1410' : 'rgba(245,240,232,0.88)'

  return (
    <div style={{ position: 'relative', perspective: 1600, padding: isMobile ? '10px 0 30px' : '20px 0 44px' }}>
      {/* Glow behind the book */}
      <div style={{
        position: 'absolute', inset: '-10% -25%',
        background: `radial-gradient(ellipse at center, ${rgba(accent, 0.32)} 0%, transparent 62%)`,
        filter: 'blur(24px)', pointerEvents: 'none',
      }} />

      {/* Floor shadow */}
      <div style={{
        position: 'absolute', left: '50%', bottom: isMobile ? 6 : 14,
        width: W * 1.15, height: 34, transform: 'translateX(-46%)',
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%)',
        filter: 'blur(6px)', pointerEvents: 'none',
      }} />

      <div ref={bookRef} style={{
        position: 'relative', width: W, height: H, margin: '0 auto',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.7s cubic-bezier(.2,.8,.2,1)',
        willChange: 'transform',
      }}>
        {/* Front cover */}
        <div style={{
          ...face, inset: 0, transform: `translateZ(${D / 2}px)`,
          borderRadius: '2px 6px 6px 2px', overflow: 'hidden',
          background: darken(accent, 0.5),
          boxShadow: `inset 0 0 0 1px ${rgba(accent, 0.25)}`,
        }}>
          <img
            src={src} alt={title}
            onLoad={e => {
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget
              if (w && h) setAspect(Math.min(1.8, Math.max(1.1, h / w)))
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Hinge crease near the spine */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to right, rgba(0,0,0,0.38) 0, rgba(255,255,255,0.14) 2.2%, rgba(0,0,0,0.12) 4%, transparent 8%)',
          }} />
          {/* Moving sheen */}
          <div ref={sheenRef} style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.16) 48%, transparent 62%)',
            backgroundSize: '250% 100%', mixBlendMode: 'screen',
            transition: 'background-position 0.7s cubic-bezier(.2,.8,.2,1)',
          }} />
        </div>

        {/* Back cover */}
        <div style={{
          ...face, inset: 0, transform: `rotateY(180deg) translateZ(${D / 2}px)`,
          borderRadius: '6px 2px 2px 6px', background: darken(accent, 0.6),
        }} />

        {/* Spine */}
        <div style={{
          ...face, top: 0, left: (W - D) / 2, width: D, height: H,
          transform: `rotateY(-90deg) translateZ(${W / 2}px)`,
          background: `linear-gradient(to right, ${darken(accent, 0.55)} 0%, ${darken(accent, 0.3)} 45%, ${darken(accent, 0.5)} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          <span style={{
            writingMode: 'vertical-rl', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxHeight: H - 40,
            fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
            fontSize: Math.max(9, Math.min(14, D * 0.38)), letterSpacing: '0.08em',
            color: spineText,
          }}>{title}</span>
        </div>

        {/* Page block — fore-edge */}
        <div style={{
          ...face, top: 3, left: (W - D) / 2, width: D - 2, height: H - 6,
          transform: `rotateY(90deg) translateZ(${W / 2 - 3}px)`,
          background: pageEdge,
        }} />

        {/* Page block — top edge */}
        <div style={{
          ...face, left: 0, top: (H - D) / 2, width: W - 4, height: D - 2,
          transform: `rotateX(90deg) translateZ(${H / 2 - 3}px)`,
          background: 'repeating-linear-gradient(to bottom, #f4ecda 0 1px, #e3d6bb 1px 2px)',
        }} />
      </div>
    </div>
  )
}
