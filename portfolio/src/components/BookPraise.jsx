import { useState, useEffect, useRef, useCallback } from 'react'
import { rgba } from '../utils/color'
import useInView from '../hooks/useInView'

// ── Review placement ───────────────────────────────────────────────────────────
// The author only enters reviews (and stars the best ones); this decides where
// each one appears on the book page.
//   hero   — first starred review, in the hero (framed by laurels in 3D mode)
//   slides — every other review, in one praise slideshow before the blurb:
//            remaining starred first, then press/author, then readers (author's order within each)

const EDITORIAL = new Set(['press', 'author'])

export function placeReviews(reviews = []) {
  const starred = reviews.filter(r => r.starred)
  const hero = starred[0] || null
  const rest = reviews.filter(r => !r.starred)
  const slides = [
    ...starred.slice(1),
    ...rest.filter(r => EDITORIAL.has(r.source)),
    ...rest.filter(r => !EDITORIAL.has(r.source)),
  ]

  const rated = reviews.filter(r => r.rating)
  const rating = rated.length
    ? { average: rated.reduce((s, r) => s + r.rating, 0) / rated.length, count: rated.length }
    : null

  return { hero, slides, rating }
}

// ── Shared bits ────────────────────────────────────────────────────────────────

const SOURCE_LABEL = { amazon: 'Amazon review', goodreads: 'Goodreads review', press: 'Press', author: 'Author', other: '' }

function sourceLabel(r) {
  if (r.reviewer_title) return r.reviewer_title
  return SOURCE_LABEL[r.source] || ''
}

function safeUrl(u) {
  return u && /^https?:\/\//i.test(u) ? u : null
}

function trimQuote(text, max) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const i = cut.lastIndexOf(' ')
  return cut.slice(0, i > max / 2 ? i : max).replace(/[\s,.;:—-]+$/, '') + '…'
}

function Attribution({ review, accent, color, align = 'left' }) {
  const label = sourceLabel(review)
  const url = safeUrl(review.source_url)
  if (!review.reviewer && !label) return null
  return (
    <div style={{ textAlign: align, fontFamily: "'Lora', Georgia, serif" }}>
      {review.reviewer && (
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color, letterSpacing: '0.02em' }}>
          — {review.reviewer}
        </div>
      )}
      {label && (
        <div style={{ fontSize: '0.66rem', color: rgba(accent, 0.85), letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 3 }}>
          {url
            ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', borderBottom: `1px solid ${rgba(accent, 0.3)}` }}>{label} ↗</a>
            : label}
        </div>
      )}
    </div>
  )
}

// ── Hero quote (under the title, on the dark hero) ─────────────────────────────
export function HeroQuote({ review, accent }) {
  if (!review) return null
  return (
    <figure style={{
      margin: '0 0 30px', maxWidth: 520,
      borderLeft: `2px solid ${rgba(accent, 0.55)}`, paddingLeft: 18,
      animation: 'fadeInUp 0.7s ease 0.25s both',
    }}>
      <blockquote style={{
        margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic',
        fontSize: '1.08rem', lineHeight: 1.55, color: 'rgba(245,240,232,0.88)',
      }}>
        “{trimQuote(review.quote, 150)}”
      </blockquote>
      <figcaption style={{ marginTop: 8 }}>
        <Attribution review={review} accent={accent} color="rgba(245,240,232,0.6)" />
      </figcaption>
    </figure>
  )
}

// ── Pull quote — the grand, full-width praise moment ──────────────────────────
// Gold ornament and glowing stars, the quote in large EB Garamond with a gilded
// gradient, words drifting in one by one, then a single gleam sweeps across.

const GARAMOND = "'EB Garamond', Garamond, Georgia, serif"
const GOLD = '#d9b56a'

function Ornament({ color, width = 180 }) {
  return (
    <svg width={width} height="14" viewBox={`0 0 ${width} 14`} aria-hidden style={{ display: 'block', margin: '0 auto' }}>
      <line x1="0" y1="7" x2={width / 2 - 14} y2="7" stroke={color} strokeWidth="1" />
      <line x1={width / 2 + 14} y1="7" x2={width} y2="7" stroke={color} strokeWidth="1" />
      <path d={`M${width / 2} 1 L${width / 2 + 6} 7 L${width / 2} 13 L${width / 2 - 6} 7 Z`} fill={color} />
    </svg>
  )
}

const SLIDE_MS = 5200

export function PraiseSlideshow({ reviews, accent, transparent = false, anchorRef, isMobile }) {
  const [inViewRef, inView] = useInView(0.3)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef(null)
  const count = reviews.length
  // Immersive mode: the 3D scene draws a laurel wreath around this section (via anchorRef)
  const ref = useCallback(el => { inViewRef(el); if (anchorRef) anchorRef.current = el }, [inViewRef, anchorRef])

  useEffect(() => {
    if (!inView || paused || count < 2) return
    const id = setTimeout(() => setIndex(i => (i + 1) % count), SLIDE_MS)
    return () => clearTimeout(id)
  }, [inView, paused, count, index])

  if (!count) return null
  const go = d => setIndex(i => (i + d + count) % count)
  const dark = transparent
  const markColor = rgba(GOLD, 0.12)

  return (
    <section ref={ref} aria-roledescription="carousel" aria-label="Reviews"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onTouchStart={e => { touchX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchX.current == null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
      style={{
        background: transparent ? 'transparent' : '#f4ead8',
        padding: isMobile ? '76px 22px' : '104px 48px',
        textAlign: 'center', overflow: 'hidden', position: 'relative',
      }}>
      <div style={{ maxWidth: isMobile ? 300 : 620, margin: '0 auto', position: 'relative' }}>
        {/* Classic page: faint quotation marks frame the quote (the 3D wreath replaces them) */}
        {!transparent && <>
          <span aria-hidden style={{ position: 'absolute', left: -36, top: -70, fontFamily: GARAMOND, fontSize: isMobile ? '7rem' : '13rem', lineHeight: 1, color: rgba(accent, 0.14), pointerEvents: 'none' }}>“</span>
          <span aria-hidden style={{ position: 'absolute', right: -36, bottom: -130, fontFamily: GARAMOND, fontSize: isMobile ? '7rem' : '13rem', lineHeight: 1, color: rgba(accent, 0.14), pointerEvents: 'none' }}>”</span>
        </>}

        <div style={{ opacity: inView ? 1 : 0, transition: 'opacity 1s ease' }}>
          <Ornament color={rgba(dark ? GOLD : accent, 0.7)} width={140} />
        </div>

        {/* All slides share one grid cell, so the box is as tall as the longest review */}
        <div style={{ display: 'grid', marginTop: 22 }}>
          {reviews.map((r, i) => {
            const offset = i === index ? 0 : ((i - index + count) % count === 1 ? 1 : -1)
            const active = offset === 0 && inView
            const long = r.quote.length > 160
            return (
              <figure key={r.id} aria-hidden={!active || undefined} style={{
                gridArea: '1 / 1', margin: 0, alignSelf: 'center',
                opacity: active ? 1 : 0,
                transform: active ? 'none' : `translateX(${offset * (isMobile ? 50 : 90)}px)`,
                filter: active ? 'none' : 'blur(6px)',
                transition: 'opacity 0.9s ease, transform 0.9s cubic-bezier(.16,1,.3,1), filter 0.9s ease',
                pointerEvents: active ? 'auto' : 'none',
              }}>
                {r.rating ? (
                  <div aria-label={`${r.rating} out of 5 stars`} style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
                    {[1, 2, 3, 4, 5].map(k => (
                      <span key={k} style={{
                        fontSize: isMobile ? '0.95rem' : '1.1rem', lineHeight: 1,
                        color: k <= r.rating ? GOLD : rgba(GOLD, 0.2),
                        textShadow: k <= r.rating ? `0 0 12px ${rgba(GOLD, 0.6)}` : 'none',
                      }}>★</span>
                    ))}
                  </div>
                ) : null}
                <blockquote style={{
                  margin: '0 0 26px', fontFamily: GARAMOND, fontStyle: 'italic', fontWeight: 400,
                  fontSize: long ? 'clamp(1.2rem, 2.4vw, 1.9rem)' : 'clamp(1.6rem, 3.7vw, 2.95rem)',
                  lineHeight: 1.24, color: dark ? '#f6ecd6' : '#3d2e1a',
                  textShadow: dark ? `0 0 34px ${rgba(GOLD, 0.18)}` : 'none',
                }}>
                  {r.quote}
                </blockquote>
                <figcaption style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  {r.reviewer && (
                    <div style={{
                      fontFamily: GARAMOND, fontSize: isMobile ? '0.78rem' : '0.86rem', letterSpacing: '0.3em',
                      textTransform: 'uppercase', color: dark ? 'rgba(245,240,232,0.85)' : '#3d2e1a',
                    }}>{r.reviewer}</div>
                  )}
                  <SourceLine review={r} color={rgba(dark ? GOLD : accent, 0.85)} />
                </figcaption>
              </figure>
            )
          })}
        </div>

        {count > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 30 }}>
            {reviews.map((r, i) => (
              <button key={r.id} onClick={() => setIndex(i)} aria-label={`Show review ${i + 1} of ${count}`}
                aria-current={i === index || undefined}
                style={{
                  width: 9, height: 9, padding: 0, cursor: 'pointer', border: `1px solid ${rgba(GOLD, 0.7)}`,
                  background: i === index ? GOLD : 'transparent', transform: 'rotate(45deg)',
                  boxShadow: i === index ? `0 0 10px ${rgba(GOLD, 0.6)}` : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function SourceLine({ review, color }) {
  const label = sourceLabel(review)
  if (!label) return null
  const url = safeUrl(review.source_url)
  const style = { fontFamily: GARAMOND, fontStyle: 'italic', fontSize: '0.95rem', color, textDecoration: 'none' }
  return url
    ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...style, borderBottom: `1px solid ${color}` }}>{label} ↗</a>
    : <div style={style}>{label}</div>
}

// ── Praise wall ────────────────────────────────────────────────────────────────

// ── Laurel quote: the top review in the hero ───────────────────────────────────
// Film-festival style: the 3D scene draws two gold laurel branches around this
// block (via anchorRef); the side padding leaves room for them.
export function LaurelQuote({ review, anchorRef, isMobile }) {
  if (!review) return null
  const label = sourceLabel(review)
  const quote = review.quote.length > 170 ? review.quote.slice(0, 167).replace(/\s+\S*$/, '') + '…' : review.quote
  return (
    <figure ref={anchorRef} style={{
      // the laurels reach a little above this box, so leave room under the book
      margin: isMobile ? '34px auto 0' : '26px auto 0', boxSizing: 'border-box', width: '100%', maxWidth: isMobile ? 360 : 440,
      padding: isMobile ? '20px 54px 18px' : '24px 80px 22px', textAlign: 'center',
      animation: 'fadeInUp 0.9s ease 0.35s both',
    }}>
      <div aria-label={review.rating ? `${review.rating} out of 5 stars` : undefined} style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 10, minHeight: 4 }}>
        {review.rating ? [1, 2, 3, 4, 5].map(i => (
          <span key={i} style={{
            fontSize: '0.95rem', lineHeight: 1, color: i <= review.rating ? GOLD : rgba(GOLD, 0.2),
            textShadow: i <= review.rating ? `0 0 12px ${rgba(GOLD, 0.7)}` : 'none',
          }}>★</span>
        )) : null}
      </div>
      <blockquote style={{
        margin: '0 0 12px', fontFamily: GARAMOND, fontStyle: 'italic',
        fontSize: isMobile ? '1.15rem' : '1.38rem', lineHeight: 1.32, color: '#fbf1da',
        textShadow: `0 0 28px ${rgba(GOLD, 0.25)}`,
      }}>“{quote}”</blockquote>
      <figcaption>
        {review.reviewer && (
          <div style={{ fontFamily: GARAMOND, fontSize: '0.74rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(245,236,214,0.8)' }}>
            {review.reviewer}
          </div>
        )}
        {label && <div style={{ fontFamily: GARAMOND, fontStyle: 'italic', fontSize: '0.82rem', color: rgba(GOLD, 0.85), marginTop: 2 }}>{label}</div>}
      </figcaption>
    </figure>
  )
}

// ── Opening line ───────────────────────────────────────────────────────────────
export function OpeningLine({ text, accent, isMobile }) {
  const [ref, inView] = useInView(0.4)
  if (!text?.trim()) return null
  const words = text.trim().split(/\s+/)

  return (
    <section ref={ref} style={{
      minHeight: isMobile ? '60vh' : '78vh', position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(ellipse at 50% 55%, ${rgba(accent, 0.14)} 0%, transparent 60%), #0e0b08`,
      padding: isMobile ? '80px 24px' : '120px 48px',
    }}>
      <div style={{ maxWidth: 900, textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Lora', serif", fontSize: '0.7rem', fontStyle: 'italic',
          letterSpacing: '0.24em', textTransform: 'uppercase', color: rgba(accent, 0.75),
          marginBottom: isMobile ? 26 : 36,
          opacity: inView ? 1 : 0, transition: 'opacity 1s ease',
        }}>It begins…</div>
        <p style={{
          margin: 0, fontFamily: GARAMOND, fontStyle: 'italic',
          fontSize: 'clamp(1.9rem, 4.8vw, 3.8rem)', lineHeight: 1.25, color: '#f5f0e8',
          textShadow: `0 0 40px ${rgba(accent, 0.25)}`,
        }}>
          {words.map((w, i) => (
            <span key={i} style={{
              display: 'inline-block', marginRight: '0.28em',
              opacity: inView ? 1 : 0,
              transform: inView ? 'none' : 'translateY(0.4em)',
              filter: inView ? 'none' : 'blur(4px)',
              transition: `opacity 0.6s ease ${0.3 + i * 0.07}s, transform 0.6s ease ${0.3 + i * 0.07}s, filter 0.6s ease ${0.3 + i * 0.07}s`,
            }}>{w}</span>
          ))}
        </p>
        <div aria-hidden style={{
          margin: `${isMobile ? 30 : 44}px auto 0`, width: 60, height: 1, background: rgba(accent, 0.6),
          transform: inView ? 'scaleX(1)' : 'scaleX(0)',
          transition: `transform 0.8s ease ${0.5 + words.length * 0.07}s`,
        }} />
      </div>
    </section>
  )
}
