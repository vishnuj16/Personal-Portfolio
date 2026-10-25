import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useAuth } from '../context/AuthContext'
import { getBook, imgUrl } from '../api'
import { renderRichText, stripToPlain } from './RichText'
import useMediaQuery from '../hooks/useMediaQuery'
import { rgba, darken, isLight } from '../utils/color'
import Cover3D from './Cover3D'
import { placeReviews, HeroQuote, LaurelQuote, PraiseSlideshow, OpeningLine } from './BookPraise'
import PraisePanel from './PraisePanel'
import OpeningLineEditor from './OpeningLineEditor'
import AuthorAdminBanner from './AuthorAdminBanner'
import CatalogCard from './CatalogCard'
import BlurbNight from './BlurbNight'
import { BookLoading, BookNotFound } from './BookScreens'
import { canImmerse, SceneBoundary } from '../three/gate'
import { injectGaramond } from '../utils/fonts'
import { safeHref } from '../utils/url'

// three.js only downloads when the immersive page actually renders
const BookExperience = lazy(() => import('../three/BookExperience'))
const ForgeExperience = lazy(() => import('../three/ForgeExperience'))

// ── Pinned stage where the 3D book opens to its first page ─────────────────────
function BookStage({ stageRef, innerRef, openingText, accent, isMobile }) {
  return (
    <section ref={stageRef} style={{ height: isMobile ? '215vh' : '200vh', position: 'relative' }}>
      <div ref={innerRef} style={{
        position: 'sticky', top: 0, height: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        paddingBottom: isMobile ? 36 : 44, boxSizing: 'border-box', pointerEvents: 'none',
      }}>
        {/* The opening line is drawn on the 3D page; keep it in the DOM for screen readers */}
        <p style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          It begins: {openingText}
        </p>
        <div style={{
          fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '0.72rem',
          letterSpacing: '0.2em', textTransform: 'uppercase', color: rgba(accent, 0.75),
          opacity: 'calc(1 - var(--book-open, 0) * 5)', transition: 'opacity 0.2s',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          keep scrolling to open the book
          <span style={{ width: 1, height: 34, background: `linear-gradient(to bottom, ${rgba(accent, 0.6)}, transparent)` }} />
        </div>
      </div>
    </section>
  )
}

// ── Inject fonts once ──────────────────────────────────────────────────────────
function injectFonts() {
  if (document.getElementById('author-fonts')) return
  const link = document.createElement('link')
  link.id = 'author-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap'
  document.head.appendChild(link)
}

// ── Buy button ─────────────────────────────────────────────────────────────────
function BuyButton({ href, label, primary, accent }) {
  const [hov, setHov] = useState(false)
  if (!href) return null
  const light = isLight(accent)
  return (
    <a href={safeHref(href)} target="_blank" rel="noreferrer"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '13px 28px', borderRadius: 8, textDecoration: 'none',
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '0.88rem', fontWeight: 600,
        transition: 'all 0.22s ease',
        ...(primary ? {
          background: hov ? darken(accent, 0.1) : accent,
          color: light ? '#1a1410' : '#fff',
          boxShadow: hov ? `0 8px 28px ${rgba(accent, 0.45)}` : `0 4px 14px ${rgba(accent, 0.25)}`,
        } : {
          background: hov ? rgba(accent, 0.08) : 'transparent',
          color: accent,
          border: `1px solid ${rgba(accent, hov ? 0.6 : 0.3)}`,
        }),
      }}
    >
      {label}
      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>↗</span>
    </a>
  )
}

// ── Back button ────────────────────────────────────────────────────────────────
function BackButton({ onBack, accent }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onBack}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'transparent',
        border: `1px solid ${rgba(accent, hov ? 0.5 : 0.2)}`,
        borderRadius: 8, padding: '9px 18px',
        fontFamily: "'Lora', Georgia, serif", fontSize: '0.8rem',
        color: rgba(accent, hov ? 1 : 0.6),
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      ← Back
    </button>
  )
}

// ── Scroll progress bar ────────────────────────────────────────────────────────
function ScrollProgress({ accent }) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const handler = () => {
      const el = document.documentElement
      setPct(el.scrollTop / (el.scrollHeight - el.clientHeight) * 100)
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999,
      background: rgba(accent, 0.15),
    }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: accent,
        transition: 'width 0.1s linear',
        boxShadow: `0 0 8px ${rgba(accent, 0.6)}`,
      }} />
    </div>
  )
}

// ── Main BookPage ──────────────────────────────────────────────────────────────
export default function BookPage({ bookId, book: bookProp, onBack }) {
  const { isAdmin, isEditMode } = useAuth()
  const isMobile = useMediaQuery(900)
  const [book, setBook] = useState(bookProp || null)
  const [loading, setLoading] = useState(!bookProp)
  const [descExpanded, setDescExpanded] = useState(false)
  const heroRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)

  // Immersive (three.js) mode and the DOM anchors the 3D scene follows
  const [immersiveOk] = useState(canImmerse)
  const [sceneFailed, setSceneFailed] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const onSceneReady = useCallback(() => setSceneReady(true), [])
  const anchors = {
    heroSlot: useRef(null), stage: useRef(null), stageInner: useRef(null),
    about: useRef(null), blurbText: useRef(null), copySlot: useRef(null), callouts: useRef(null),
    plaque: useRef(null), pull0: useRef(null), heroQuote: useRef(null),
  }

  useEffect(() => { injectFonts(); injectGaramond() }, [])

  // List items don't carry reviews, so always fetch the full book;
  // bookProp (when given) renders immediately in the meantime.
  useEffect(() => {
    if (bookProp) setBook(bookProp)
    const slug = bookProp?.slug || bookId
    if (!slug) return
    getBook(slug)
      .then(setBook)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [bookId, bookProp])

  const setReviews = (reviews) => setBook(b => ({ ...b, reviews }))

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Scroll to top when page opens
  useEffect(() => { window.scrollTo(0, 0) }, [])

  if (loading) return <BookLoading />

  if (!book) return <BookNotFound onBack={onBack} />

  const accent    = book.theme_color || '#c9a84c'
  const coverSrc  = book.cover_url ? imgUrl(book.cover_url) : null
  const lightAccent = isLight(accent)

  // ── Coming Soon / WIP page ─────────────────────────────────────────────────
  if (book.coming_soon) {
    return <ComingSoonBookPage book={book} accent={accent} coverSrc={coverSrc} lightAccent={lightAccent} onBack={onBack} />
  }

  // Hero colours — always dark bg with accent tints
  const heroBg = `linear-gradient(160deg, ${darken(accent, 0.72)} 0%, ${darken(accent, 0.55)} 50%, #1a1410 100%)`

  const placed = placeReviews(book.reviews || [])

  const descWords = stripToPlain(book.description || '').split(' ')
  const shortDesc = descWords.length > 60 ? descWords.slice(0, 60).join(' ') + '…' : stripToPlain(book.description)
  const isLong = descWords.length > 60

  const immersive = immersiveOk && !sceneFailed
  // What the book's right-hand page shows: the opening line, else a "Praise" page, else the subtitle
  const openingLine = book.opening_line?.trim()
  const rightPage = openingLine
    ? { label: 'IT BEGINS…', text: openingLine }
    : placed.hero
      ? { label: 'PRAISE', text: `“${placed.hero.quote}”`, attribution: placed.hero.reviewer || '' }
      : { label: '', text: book.subtitle || book.title }
  const openingText = rightPage.text
  // Desktop immersive: details become hairline callouts around the 3D book
  const minimalHero = immersive && !isMobile
  // Book details engraved on the 3D gold plaque beside the blurb
  const cap = v => v && v.charAt(0).toUpperCase() + v.slice(1)
  const details = [
    ['Format', cap(book.book_type)],
    ['Genre', cap(book.genre)],
    ['Pages', book.pages],
    ['Published', book.published_at && new Date(book.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })],
    ['Imprint', book.publisher || (book.self_published ? 'Self-published' : null)],
    ['ISBN', book.isbn],
  ].filter(([, v]) => v).map(([k, v]) => [k, String(v)])
  const plaque = details.length ? {
    title: book.title, rows: details,
    stamp: book.new_release ? '— New Release —' : book.published_at ? `First published ${book.published_at.slice(0, 4)}` : '',
  } : null
  const callouts = [
    book.published_at && ['Published', new Date(book.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })],
    book.pages && ['Extent', `${book.pages} pages`],
    (book.publisher || book.self_published) && ['Imprint', book.publisher || 'Self-published'],
  ].filter(Boolean)
  const slotW = isMobile ? 220 : 320
  const slotH = isMobile ? 330 : 420
  const hasBuyLinks = book.amazon_url || book.goodreads_url || book.other_buy_url

  return (
    <div style={{ fontFamily: "'Lora', Georgia, serif", background: immersive ? '#070605' : '#0e0b08', color: '#f5f0e8', minHeight: '100vh' }}>
      <ScrollProgress accent={accent} />
      <AuthorAdminBanner />

      {immersive && (
        <SceneBoundary onFail={() => setSceneFailed(true)}>
          <Suspense fallback={null}>
            <BookExperience
              book={book} accent={accent} coverSrc={coverSrc} page={rightPage} plaque={plaque}
              anchors={anchors} isMobile={isMobile} onReady={onSceneReady}
            />
          </Suspense>
        </SceneBoundary>
      )}

      {minimalHero && callouts.length > 0 && (
        <div ref={anchors.callouts} aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0 }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            {callouts.map(([label]) => (
              <g key={label}>
                <line stroke={rgba(accent, 0.45)} strokeWidth="1" />
                <circle r="2.5" fill={accent} />
              </g>
            ))}
          </svg>
          {callouts.map(([label, value]) => (
            <div key={label} data-label style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', lineHeight: 1.25 }}>
              <div style={{ fontFamily: "'Lora', serif", fontSize: '0.56rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: rgba(accent, 0.85) }}>{label}</div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '0.92rem', color: 'rgba(245,240,232,0.82)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Everything readable sits above the fixed 3D canvas */}
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{
        minHeight: '100vh', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center',
        background: immersive ? 'transparent' : heroBg,
      }}>
        {/* Noise texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }} />

        {/* Accent radial bloom */}
        <div style={{
          position: 'absolute', top: '30%', left: '15%',
          width: 700, height: 700,
          background: `radial-gradient(circle, ${rgba(accent, 0.18)} 0%, transparent 60%)`,
          pointerEvents: 'none',
          transform: `translateY(${scrollY * 0.15}px)`,
          transition: 'transform 0.05s linear',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '5%',
          width: 400, height: 400,
          background: `radial-gradient(circle, ${rgba(accent, 0.1)} 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />

        {/* Back button */}
        {onBack && (
          <div style={{ position: 'absolute', top: (isMobile ? 20 : 28) + (isAdmin ? 37 : 0), left: isMobile ? 20 : 40, zIndex: 10 }}>
            <BackButton onBack={onBack} accent={accent} />
          </div>
        )}

        {/* Content */}
        <div style={{
          maxWidth: 1100, margin: '0 auto', width: '100%',
          padding: isMobile ? '110px 20px 72px' : '140px 48px 100px',
          display: 'grid',
          gridTemplateColumns: coverSrc ? (isMobile ? '1fr' : '1fr 420px') : '1fr',
          gap: isMobile ? 32 : 80, alignItems: 'center',
          position: 'relative', zIndex: 2,
        }}>
          {/* Left — text */}
          <div style={{ animation: 'fadeInUp 0.7s ease both' }}>
            {/* Eyebrow */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22,
              fontFamily: "'Lora', serif", fontSize: '0.7rem',
              color: accent, letterSpacing: '0.22em', textTransform: 'uppercase',
            }}>
              <span style={{ width: 36, height: 1, background: accent, opacity: 0.7, display: 'inline-block' }} />
              {book.book_type}{book.genre ? ` · ${book.genre}` : ''}
              {book.new_release && (
                <span style={{
                  background: accent, color: lightAccent ? '#1a1410' : '#fff',
                  padding: '2px 10px', borderRadius: 999, fontSize: '0.6rem',
                  fontWeight: 700, letterSpacing: '0.08em',
                }}>New Release</span>
              )}
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(2.6rem, 5.5vw, 4.4rem)',
              fontWeight: 900, lineHeight: 1.06,
              color: '#f5f0e8', margin: '0 0 18px',
              textShadow: `0 4px 40px ${rgba(accent, 0.25)}`,
            }}>
              {book.title}
            </h1>

            {/* Subtitle */}
            {book.subtitle && (
              <div style={{
                fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic',
                fontSize: '1.1rem', color: 'rgba(245,240,232,0.55)',
                marginBottom: 28, lineHeight: 1.55,
              }}>{book.subtitle}</div>
            )}

            {/* Top starred review — takes the blurb's spot; the full blurb is in About */}
            {/* Top review (classic page). In immersive mode it sits under the 3D book instead */}
            {!immersive && <HeroQuote review={placed.hero} accent={accent} />}

            {/* Description */}
            {book.description && !placed.hero && (
              <div style={{ marginBottom: 36 }}>
                <div style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: '0.97rem', color: 'rgba(245,240,232,0.68)',
                  lineHeight: 1.85, maxWidth: 520,
                }}>
                  {descExpanded
                    ? renderRichText(book.description, { color: 'rgba(245,240,232,0.68)', headingColor: 'rgba(245,240,232,0.9)', accentColor: accent, lineHeight: 1.85, fontSize: '0.97rem', fontFamily: "'Lora', Georgia, serif" })
                    : <p style={{ margin: 0, fontFamily: "'Lora', Georgia, serif", fontSize: '0.97rem', color: 'rgba(245,240,232,0.68)', lineHeight: 1.85 }}>{shortDesc}</p>
                  }
                </div>
                {isLong && (
                  <button onClick={() => setDescExpanded(v => !v)} style={{
                    marginTop: 10, background: 'transparent', border: 'none', padding: 0,
                    fontFamily: "'Lora', serif", fontSize: '0.78rem', fontStyle: 'italic',
                    color: rgba(accent, 0.8), cursor: 'pointer',
                    borderBottom: `1px solid ${rgba(accent, 0.3)}`,
                  }}>
                    {descExpanded ? 'show less' : 'read more'}
                  </button>
                )}
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36, alignItems: 'center' }}>
              <BuyButton href={book.amazon_url} label="Get on Amazon" primary accent={accent} />
              <BuyButton href={book.goodreads_url} label="Goodreads" accent={accent} />
              <BuyButton href={book.other_buy_url} label="Read/Buy Direct" accent={accent} />
              <BookPageShareBtn slug={book.slug} title={book.title} accent={accent} />
            </div>

          </div>

          {/* Right — cover. In immersive mode this is an empty slot the 3D book docks into;
              the CSS book shows until the scene is ready, then fades out. */}
          {immersive ? (
            <div>
              <div ref={anchors.heroSlot} style={{ width: slotW, height: slotH, margin: '0 auto', position: 'relative' }}>
                {coverSrc && (
                  <div style={{ position: 'absolute', inset: 0, opacity: sceneReady ? 0 : 1, transition: 'opacity 0.9s ease', pointerEvents: 'none' }}>
                    <Cover3D src={coverSrc} title={book.title} accent={accent} pages={book.pages} isMobile={isMobile} />
                  </div>
                )}
              </div>
              {/* Top review under the book, framed by 3D gold laurels */}
              <LaurelQuote review={placed.hero} anchorRef={anchors.heroQuote} isMobile={isMobile} />
            </div>
          ) : coverSrc && (
            <div style={{ animation: 'fadeInUp 0.7s ease 0.15s both' }}>
              <Cover3D src={coverSrc} title={book.title} accent={accent} pages={book.pages} isMobile={isMobile} />
            </div>
          )}
        </div>

        {/* Scroll cue */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          // the hero is taller than the screen on phones, so the cue would sit on top of the content
          display: isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          animation: 'fadeInUp 1s ease 1.2s both',
        }}>
          <div style={{ fontFamily: "'Lora', serif", fontSize: '0.6rem', letterSpacing: '0.18em', color: rgba(accent, 0.4), textTransform: 'uppercase' }}>scroll</div>
          <div style={{ width: 1, height: 36, background: `linear-gradient(to bottom, ${rgba(accent, 0.5)}, transparent)` }} />
        </div>
      </section>

      {immersive && (
        <BookStage stageRef={anchors.stage} innerRef={anchors.stageInner}
          openingText={openingText} accent={accent} isMobile={isMobile} />
      )}

      {/* Every review except the hero's, in one slideshow before the blurb */}
      <PraiseSlideshow reviews={placed.slides} accent={accent} transparent={immersive}
        anchorRef={anchors.pull0} isMobile={isMobile} />

      {!immersive && <OpeningLine text={book.opening_line} accent={accent} isMobile={isMobile} />}

      {/* ── ABOUT THE BOOK (blurb + catalogue card with the book details) ── */}
      <section ref={anchors.about} style={{
        background: immersive ? 'transparent' : '#fdf8f0', color: '#3d2e1a',
        padding: immersive ? (isMobile ? '72px 22px 96px' : '120px 48px 150px') : (isMobile ? '72px 20px' : '96px 48px'),
      }}>
        {immersive ? (
          // Drop cap only when the blurb opens with a letter (not markup like ** or #)
          <BlurbNight book={book} isMobile={isMobile} textRef={anchors.blurbText}
            plaqueRef={anchors.plaque} details={details}
            dropCap={/^["“']?[A-Za-z]/.test((book.description || '').trim())} />
        ) : (
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          {/* Chapter ornament */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 52 }}>
            <div style={{ flex: 1, height: 1, background: rgba(accent, 0.2) }} />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <div style={{ flex: 1, height: 1, background: rgba(accent, 0.2) }} />
          </div>

          <div style={{
            fontFamily: "'Lora', serif", fontSize: '0.72rem',
            color: accent, letterSpacing: '0.2em', textTransform: 'uppercase',
            marginBottom: 12, fontStyle: 'italic',
          }}>About the Book</div>

          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
            fontWeight: 700, color: '#3d2e1a', margin: '0 0 28px', lineHeight: 1.22,
          }}>{book.title}</h2>

          <div style={{
            display: 'grid', alignItems: 'start',
            gridTemplateColumns: isMobile || !book.description ? '1fr' : 'minmax(0, 1fr) 300px',
            gap: isMobile ? 48 : 64,
          }}>
            {book.description && (
              <div style={{
                fontFamily: "'Lora', Georgia, serif", fontSize: '1.02rem',
                color: '#6b5c45', lineHeight: 1.95,
                borderLeft: `3px solid ${rgba(accent, 0.35)}`, paddingLeft: isMobile ? 18 : 28,
              }}>
                {renderRichText(book.description, {
                  fontFamily: "'Lora', Georgia, serif", fontSize: '1.02rem',
                  color: '#6b5c45', lineHeight: 1.95,
                  headingColor: '#3d2e1a', accentColor: accent,
                })}
              </div>
            )}
            <div style={isMobile ? {} : { position: 'sticky', top: 90 }}>
              <CatalogCard book={book} accent={accent} isMobile={isMobile} />
            </div>
          </div>
        </div>
        )}
      </section>


      {/* ── GET YOUR COPY ─────────────────────────────────────────────────── */}
      {hasBuyLinks && (
        <section style={{
          background: immersive ? 'transparent' : '#fdf8f0',
          padding: immersive ? (isMobile ? '16px 20px 80px' : '24px 48px 110px') : (isMobile ? '80px 20px' : '96px 48px'),
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            {immersive && <div ref={anchors.copySlot} style={{ width: isMobile ? 150 : 180, height: isMobile ? 210 : 250, margin: '0 auto 28px' }} />}
            <div style={{
              fontFamily: "'Lora', serif", fontSize: '0.72rem',
              color: accent, letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 12, fontStyle: 'italic',
            }}>Available Now</div>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
              fontWeight: 700, color: immersive ? '#f5f0e8' : '#3d2e1a',
              margin: '0 0 14px',
            }}>Get Your Copy</h2>
            <p style={{
              fontFamily: "'Lora', serif", fontStyle: 'italic',
              fontSize: '0.95rem', color: immersive ? 'rgba(245,240,232,0.6)' : '#9a8060', lineHeight: 1.7,
              maxWidth: 420, margin: '0 auto 36px',
            }}>
              Find {book.title} at your preferred retailer or order direct.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
              <BuyButton href={book.amazon_url} label="Amazon" primary accent={accent} />
              <BuyButton href={book.goodreads_url} label="Goodreads" accent={accent} />
              <BuyButton href={book.other_buy_url} label="Read/Buy Direct" accent={accent} />
              <BookPageShareBtn slug={book.slug} title={book.title} accent={accent} onLight={!immersive} />
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER BAR ────────────────────────────────────────────────────── */}
      <footer style={{
        background: '#1a1410', borderTop: `1px solid ${rgba(accent, 0.12)}`,
        padding: '20px 48px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{
          fontFamily: "'Lora', serif", fontSize: '0.72rem',
          color: 'rgba(245,240,232,0.25)', fontStyle: 'italic',
        }}>
          {book.title}{book.published_at ? ` · ${book.published_at.slice(0,4)}` : ''}
        </div>
        {onBack && (
          <button onClick={onBack} style={{
            background: 'transparent', border: `1px solid ${rgba(accent, 0.2)}`,
            borderRadius: 6, padding: '6px 16px', cursor: 'pointer',
            fontFamily: "'Lora', serif", fontSize: '0.75rem',
            color: rgba(accent, 0.5), transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = rgba(accent, 0.5); e.currentTarget.style.color = accent }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = rgba(accent, 0.2); e.currentTarget.style.color = rgba(accent, 0.5) }}
          >
            ← Back to Author Page
          </button>
        )}
      </footer>

      </div>

      {isAdmin && isEditMode && <PraisePanel bookId={book.id} reviews={book.reviews || []} onChange={setReviews} />}
      {isAdmin && isEditMode && (
        <OpeningLineEditor bookId={book.id} value={book.opening_line || ''} accent={accent}
          onSaved={line => setBook(b => ({ ...b, opening_line: line }))} />
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ── ComingSoonBookPage ─────────────────────────────────────────────────────────
// A beautiful, dark, atmospheric page for upcoming / WIP books.
function ComingSoonBookPage({ book, accent, coverSrc, lightAccent, onBack }) {
  const isMobile = useMediaQuery(900)
  const heroBg = `linear-gradient(160deg, ${darken(accent, 0.78)} 0%, ${darken(accent, 0.62)} 60%, #0e0b06 100%)`

  // Immersive "story taking shape" scene: the cover is drawn in, letters spiral
  // into the book, an astrolabe turns behind it, and an hourglass keeps time below
  const [immersiveOk] = useState(canImmerse)
  const [sceneFailed, setSceneFailed] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const onSceneReady = useCallback(() => setSceneReady(true), [])
  const immersive = immersiveOk && !sceneFailed
  const anchors = { cover: useRef(null), hourglass: useRef(null) }
  const showCover = immersive || coverSrc

  return (
    <div style={{ fontFamily: "'Lora', Georgia, serif", background: immersive ? '#07060a' : '#0e0b06', color: '#f5f0e8', minHeight: '100vh' }}>
      {immersive && (
        <SceneBoundary onFail={() => setSceneFailed(true)}>
          <Suspense fallback={null}>
            <ForgeExperience book={book} accent={accent} coverSrc={coverSrc}
              anchors={anchors} isMobile={isMobile} onReady={onSceneReady} />
          </Suspense>
        </SceneBoundary>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* Back + Share buttons */}
      <BookPageShareBtn slug={book.slug} title={book.title} accent={accent} fixed />
      {onBack && (
        <button onClick={onBack} style={{
          position: 'fixed', top: isMobile ? 18 : 24, left: isMobile ? 18 : 28, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 16px', borderRadius: 8,
          background: 'rgba(14,11,6,0.7)', backdropFilter: 'blur(10px)',
          border: `1px solid ${rgba(accent, 0.25)}`,
          fontFamily: "'Lora', serif", fontSize: '0.78rem', fontStyle: 'italic',
          color: rgba(accent, 0.75), cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = rgba(accent, 0.6); e.currentTarget.style.color = accent }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = rgba(accent, 0.25); e.currentTarget.style.color = rgba(accent, 0.75) }}>
          ← Back
        </button>
      )}

      {/* Hero */}
      <section style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', background: immersive ? 'transparent' : heroBg }}>
        {/* Background glow orbs */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.035, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23f5f0e8'/%3E%3Crect width='1' height='1' fill='%23c9a84c'/%3E%3C/svg%3E")`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 700, height: 700, background: `radial-gradient(circle, ${rgba(accent, 0.12)} 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: 500, height: 500, background: `radial-gradient(circle, ${rgba(accent, 0.08)} 0%, transparent 65%)`, pointerEvents: 'none' }} />

        {/* Animated corner decorations */}
        {[
          { top: 24, left: 24 }, { top: 24, right: 24 },
          { bottom: 24, left: 24 }, { bottom: 24, right: 24 },
        ].map((pos, i) => {
          const isRight = 'right' in pos, isBottom = 'bottom' in pos
          return (
            <div key={i} style={{ position: 'absolute', width: 50, height: 50, pointerEvents: 'none', zIndex: 5, ...pos }}>
              <div style={{ position: 'absolute', [isBottom ? 'bottom' : 'top']: 0, [isRight ? 'right' : 'left']: 0, width: '100%', height: 1.5, background: `linear-gradient(${isRight ? 'to left' : 'to right'}, ${accent}, transparent)`, animation: `borderGlow 3.5s ease-in-out infinite ${i * 0.4}s` }} />
              <div style={{ position: 'absolute', [isBottom ? 'bottom' : 'top']: 0, [isRight ? 'right' : 'left']: 0, width: 1.5, height: '100%', background: `linear-gradient(${isBottom ? 'to top' : 'to bottom'}, ${accent}, transparent)`, animation: `borderGlow 3.5s ease-in-out infinite ${i * 0.4}s` }} />
              <div style={{ position: 'absolute', [isBottom ? 'bottom' : 'top']: 3, [isRight ? 'right' : 'left']: 3, width: 5, height: 5, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${rgba(accent, 0.8)}`, animation: `gemPulse 2.5s ease-in-out infinite ${i * 0.5}s` }} />
            </div>
          )
        })}

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '110px 20px 64px' : '120px 48px 80px', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: showCover ? (isMobile ? '1fr' : '1fr 1fr') : '1fr', gap: isMobile ? 32 : 72, alignItems: 'center' }}>

            {/* Text side */}
            <div style={{ animation: 'fadeInUp 0.8s ease' }}>
              {/* WIP badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 24, background: rgba(accent, 0.12), border: `1px solid ${rgba(accent, 0.35)}`, marginBottom: 24 }}>
                <span style={{ fontSize: '0.8rem' }}>✍️</span>
                <span style={{ fontFamily: "'Lora', serif", fontSize: '0.65rem', color: accent, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Work in Progress</span>
              </div>

              {/* Title */}
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', color: '#f5f0e8', fontWeight: 900, lineHeight: 1.08, margin: '0 0 14px', textShadow: `0 2px 30px ${rgba(accent, 0.25)}` }}>
                {book.title}
              </h1>
              {book.subtitle && (
                <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '1.1rem', color: 'rgba(245,240,232,0.55)', marginBottom: 28, lineHeight: 1.5 }}>{book.subtitle}</div>
              )}

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <div style={{ width: 36, height: 2, background: accent, borderRadius: 1 }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', border: `2px solid ${rgba(accent, 0.6)}` }} />
                <div style={{ width: 18, height: 2, background: rgba(accent, 0.4), borderRadius: 1 }} />
              </div>

              {/* Description */}
              {book.description && (
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '1rem', color: 'rgba(245,240,232,0.65)', lineHeight: 1.9, marginBottom: 36, maxWidth: 460 }}>
                  {renderRichText(book.description, {
                    color: 'rgba(245,240,232,0.65)',
                    headingColor: '#f5f0e8',
                    accentColor: accent,
                    lineHeight: 1.9,
                    fontSize: '1rem',
                    fontFamily: "'Lora', Georgia, serif",
                    fontStyle: 'italic',
                  })}
                </div>
              )}

              {/* Genre + estimated chips */}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {book.genre && (
                  <div style={{ borderLeft: `2px solid ${rgba(accent, 0.5)}`, paddingLeft: 12 }}>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: '0.55rem', color: rgba(accent, 0.6), letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>genre</div>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: '0.82rem', color: 'rgba(245,240,232,0.75)', fontStyle: 'italic' }}>{book.genre}</div>
                  </div>
                )}
                {book.estimated_release && (
                  <div style={{ borderLeft: `2px solid ${rgba(accent, 0.5)}`, paddingLeft: 12 }}>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: '0.55rem', color: rgba(accent, 0.6), letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>expected</div>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: '0.82rem', color: accent, fontWeight: 600 }}>{book.estimated_release}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Cover side. Immersive: a slot the 3D sketch-book renders into (flat cover until ready) */}
            {immersive ? (
              <div style={{ display: 'flex', justifyContent: 'center', animation: 'fadeInUp 0.8s ease 0.15s both' }}>
                <div ref={anchors.cover} style={{ position: 'relative', width: isMobile ? 230 : 310, height: isMobile ? 330 : 440 }}>
                  {coverSrc && (
                    <img src={coverSrc} alt={book.title} style={{
                      position: 'absolute', inset: '6% 6%', width: '88%', height: '88%', objectFit: 'cover', borderRadius: 6,
                      opacity: sceneReady ? 0 : 1, transition: 'opacity 0.9s ease',
                    }} />
                  )}
                  <div style={{
                    position: 'absolute', bottom: 34, right: -18,
                    background: rgba(accent, 0.92), color: darken(accent, 0.7),
                    fontFamily: "'Playfair Display', serif", fontWeight: 900,
                    fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase',
                    padding: '5px 14px', borderRadius: 4, transform: 'rotate(-2deg)',
                    boxShadow: `0 4px 16px ${rgba(accent, 0.4)}`,
                  }}>Coming Soon</div>
                </div>
              </div>
            ) : coverSrc && (
              <div style={{ display: 'flex', justifyContent: 'center', animation: 'fadeInUp 0.8s ease 0.15s both' }}>
                <div style={{ position: 'relative' }}>
                  {/* Glow behind cover */}
                  <div style={{ position: 'absolute', inset: -20, background: `radial-gradient(ellipse, ${rgba(accent, 0.25)} 0%, transparent 70%)`, borderRadius: 20, pointerEvents: 'none' }} />
                  <img src={coverSrc} alt={book.title} style={{
                    maxHeight: 480, maxWidth: 340,
                    borderRadius: 10, display: 'block',
                    position: 'relative',
                    boxShadow: `0 28px 80px rgba(0,0,0,0.6), 0 4px 20px ${rgba(accent, 0.3)}`,
                    transform: 'perspective(700px) rotateY(-4deg)',
                    transition: 'transform 0.4s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'perspective(700px) rotateY(0deg) scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'perspective(700px) rotateY(-4deg)'}
                  />
                  {/* WIP stamp overlay */}
                  <div style={{
                    position: 'absolute', bottom: 20, right: -12,
                    background: rgba(accent, 0.92), color: darken(accent, 0.7),
                    fontFamily: "'Playfair Display', serif", fontWeight: 900,
                    fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase',
                    padding: '5px 14px', borderRadius: 4,
                    transform: 'rotate(-2deg)',
                    boxShadow: `0 4px 16px ${rgba(accent, 0.4)}`,
                  }}>Coming Soon</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        {book.description && book.description.length > 200 && (
          <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, animation: 'fadeInUp 1s ease 1s both' }}>
            <div style={{ fontFamily: "'Lora', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: rgba(accent, 0.4), textTransform: 'uppercase' }}>scroll</div>
            <div style={{ width: 1, height: 36, background: `linear-gradient(to bottom, ${rgba(accent, 0.45)}, transparent)` }} />
          </div>
        )}
      </section>

      {/* ── Watch This Space section ───────────────────────────────────────── */}
      <section style={{ padding: isMobile ? '80px 22px' : '96px 48px', background: immersive ? 'transparent' : 'linear-gradient(180deg, #0e0b06 0%, #1a1208 50%, #0e0b06 100%)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          {/* the 3D hourglass keeps time here */}
          {immersive && <div ref={anchors.hourglass} aria-hidden style={{ width: 150, height: 240, margin: '0 auto 40px' }} />}
          {/* Ornamental heading */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
            <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(to right, transparent, ${rgba(accent, 0.4)})` }} />
            <span style={{ fontFamily: "'Lora', serif", fontSize: '0.6rem', color: rgba(accent, 0.55), letterSpacing: '0.22em', textTransform: 'uppercase', fontStyle: 'italic' }}>Watch This Space</span>
            <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(to left, transparent, ${rgba(accent, 0.4)})` }} />
          </div>

          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.65rem', color: rgba(accent, 0.3), letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 24 }}>·&nbsp;&nbsp;·&nbsp;&nbsp;·</div>

          <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: '1.05rem', color: immersive ? 'rgba(245,240,232,0.62)' : 'rgba(245,240,232,0.38)', lineHeight: 2, margin: 0 }}>
            This story is still being written. Check back for updates,
            {book.estimated_release ? ` or look for it ${book.estimated_release}.` : ' or follow along as it takes shape.'}
          </p>

          {/* Decorative dot row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 48 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: rgba(accent, 0.15 + i * 0.06) }} />
            ))}
          </div>
        </div>
      </section>
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes borderGlow { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        @keyframes gemPulse { 0%,100% { transform:scale(1); opacity:0.6; } 50% { transform:scale(1.6); opacity:1; } }
      `}</style>
    </div>
  )
}

// ── BookPageShareBtn ────────────────────────────────────────────────────────────
// Used inside BookPage — self-contained with its own rgba helper reference
function BookPageShareBtn({ slug, title, accent = '#c9a84c', fixed = false, onLight = false }) {
  const [copied,  setCopied]  = useState(false)
  const [hovered, setHovered] = useState(false)

  const getUrl = () => `${window.location.origin}/book/${slug}`

  const handleShare = async (e) => {
    e.stopPropagation()
    const url = getUrl()
    if (navigator.share) {
      try { await navigator.share({ title, url, text: `Check out "${title}"` }); return }
      catch (_) { /* fallback */ }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch (_) {}
  }

  const light = isLight(accent)

  return (
    <button
      onClick={handleShare}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...(fixed ? { position: 'fixed', top: 24, right: 28, zIndex: 100 } : {}),
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: "'Lora', Georgia, serif", fontSize: '0.85rem',
        padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
        background: copied
          ? rgba(accent, 0.2)
          : hovered ? rgba(accent, 0.12) : rgba(accent, 0.06),
        border: `1px solid ${copied ? rgba(accent, 0.65) : rgba(accent, 0.28)}`,
        color: copied || hovered ? accent : onLight ? '#6b5c45' : 'rgba(245,240,232,0.55)',
        transition: 'all 0.2s',
        boxShadow: hovered && !copied ? `0 4px 20px ${rgba(accent, 0.18)}` : 'none',
      }}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <polyline points="20 6 9 17 4 12" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Link copied!
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.6" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Share
        </>
      )}
    </button>
  )
}
