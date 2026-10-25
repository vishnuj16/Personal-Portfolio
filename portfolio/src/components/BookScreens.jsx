// ── Book page loading / not-found screens ──────────────────────────────────────
// Pure CSS (they show before three.js has loaded): a night sky, a small book whose
// pages turn while the book loads, and a torn-out page when a book can't be found.

const GARAMOND = "'EB Garamond', Garamond, Georgia, serif"

const sky = {
  minHeight: '100vh', boxSizing: 'border-box', padding: 24,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  backgroundColor: '#05070f',
  backgroundImage: [
    'radial-gradient(ellipse at 50% 40%, rgba(217,181,106,0.10) 0%, transparent 45%)',
    'radial-gradient(1px 1px at 12% 18%, #fff 50%, transparent 51%)',
    'radial-gradient(1px 1px at 78% 14%, #ffe9c0 50%, transparent 51%)',
    'radial-gradient(1.5px 1.5px at 34% 72%, #dfe8ff 50%, transparent 51%)',
    'radial-gradient(1px 1px at 88% 62%, #fff 50%, transparent 51%)',
    'radial-gradient(1px 1px at 22% 44%, #ffe9c0 50%, transparent 51%)',
    'radial-gradient(1.5px 1.5px at 64% 86%, #fff 50%, transparent 51%)',
    'radial-gradient(1px 1px at 6% 82%, #dfe8ff 50%, transparent 51%)',
    'radial-gradient(1px 1px at 56% 24%, #fff 50%, transparent 51%)',
    'radial-gradient(1px 1px at 94% 32%, #ffe9c0 50%, transparent 51%)',
    'linear-gradient(180deg, #0a1028 0%, #04060d 100%)',
  ].join(', '),
  fontFamily: GARAMOND, color: '#f5f0e8', textAlign: 'center',
}

export function BookLoading() {
  return (
    <div style={sky} role="status" aria-live="polite">
      <div className="bl-stage" aria-hidden>
        <div className="bl-book">
          <div className="bl-half bl-left" />
          <div className="bl-half bl-right" />
          {[0, 1, 2].map(i => <div key={i} className="bl-page" style={{ animationDelay: `${i * 0.42}s` }} />)}
        </div>
        <div className="bl-glow" />
      </div>
      <div style={{ marginTop: 34, fontStyle: 'italic', fontSize: '1.15rem', color: 'rgba(245,236,214,0.75)', letterSpacing: '0.02em' }}>
        Opening the book<span className="bl-dots"><span>.</span><span>.</span><span>.</span></span>
      </div>
      <style>{`
        .bl-stage { position: relative; perspective: 700px; }
        .bl-book { position: relative; width: 168px; height: 112px; transform: rotateX(28deg); transform-style: preserve-3d; }
        .bl-half { position: absolute; top: 0; width: 84px; height: 112px; box-sizing: border-box;
          background: linear-gradient(160deg, #1a2244, #0b1024); border: 1px solid rgba(217,181,106,0.55); }
        .bl-left { left: 0; border-radius: 4px 0 0 4px; transform-origin: right center; transform: rotateY(12deg); }
        .bl-right { right: 0; border-radius: 0 4px 4px 0; transform-origin: left center; transform: rotateY(-12deg); }
        .bl-half::after { content: ''; position: absolute; inset: 5px; border-radius: 2px;
          background: linear-gradient(90deg, #efe4c8, #fbf5e6); }
        .bl-page { position: absolute; top: 5px; left: 84px; width: 78px; height: 102px; transform-origin: left center;
          background: linear-gradient(90deg, #e8dcbf 0%, #fbf5e6 60%, #f1e6cc 100%); border-radius: 0 2px 2px 0;
          box-shadow: 0 0 6px rgba(0,0,0,0.25); backface-visibility: visible;
          animation: blFlip 1.6s cubic-bezier(.45,.05,.35,1) infinite; }
        .bl-glow { position: absolute; left: 50%; top: 70%; width: 260px; height: 80px; transform: translateX(-50%);
          background: radial-gradient(ellipse, rgba(217,181,106,0.35) 0%, transparent 70%); filter: blur(8px); z-index: -1; }
        @keyframes blFlip {
          0% { transform: rotateY(-8deg); }
          55%, 100% { transform: rotateY(-172deg); }
        }
        .bl-dots span { animation: blDot 1.4s infinite; opacity: 0.2; }
        .bl-dots span:nth-child(2) { animation-delay: 0.2s; }
        .bl-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blDot { 0%, 100% { opacity: 0.2; } 40% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .bl-page, .bl-dots span { animation: none; opacity: 1; } }
      `}</style>
    </div>
  )
}

export function BookNotFound({ onBack }) {
  return (
    <div style={sky}>
      {/* a page torn from a book */}
      <div aria-hidden style={{ position: 'relative', marginBottom: 34, transform: 'rotate(-6deg)' }}>
        <div style={{
          width: 120, height: 150,
          background: 'linear-gradient(160deg, #fbf5e6 0%, #e9dcbe 100%)',
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 88% 94%, 76% 100%, 64% 93%, 52% 100%, 40% 94%, 28% 100%, 16% 93%, 0 100%)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: 4, margin: i ? '10px 18px 0' : '28px 18px 0', width: i === 5 ? '40%' : 'auto', background: 'rgba(60,44,24,0.16)', borderRadius: 2 }} />
          ))}
        </div>
        <div style={{ position: 'absolute', inset: -30, background: 'radial-gradient(ellipse, rgba(217,181,106,0.25) 0%, transparent 65%)', zIndex: -1 }} />
      </div>
      <div style={{ fontFamily: "'Lora', serif", fontSize: '0.66rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: '#d9b56a', marginBottom: 12 }}>
        Book not found
      </div>
      <h1 style={{
        margin: '0 0 12px', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
        fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', lineHeight: 1.2,
        backgroundImage: 'linear-gradient(180deg, #fcf5e4 0%, #ddbb78 100%)',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
      }}>This page seems to have been torn out</h1>
      <p style={{ margin: '0 0 30px', fontStyle: 'italic', fontSize: '1.1rem', color: 'rgba(245,236,214,0.6)', maxWidth: 420, lineHeight: 1.6 }}>
        Perhaps it was never written — or the story has moved to another shelf.
      </p>
      {onBack && (
        <button onClick={onBack} style={{
          padding: '11px 26px', borderRadius: 999, cursor: 'pointer',
          border: '1px solid rgba(217,181,106,0.55)', background: 'rgba(217,181,106,0.08)',
          fontFamily: "'Lora', serif", fontSize: '0.86rem', color: '#ecd08f', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217,181,106,0.18)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(217,181,106,0.25)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(217,181,106,0.08)'; e.currentTarget.style.boxShadow = 'none' }}>
          ← Return to the library
        </button>
      )}
    </div>
  )
}
