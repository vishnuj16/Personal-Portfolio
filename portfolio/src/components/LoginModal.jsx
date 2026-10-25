import { useState } from 'react'
import { verifyPasskey, setToken } from '../api'
import { useAuth } from '../context/AuthContext'

// theme: 'dev' (default, dark terminal) | 'author' (warm parchment)
export default function LoginModal({ onClose, theme = 'dev' }) {
  const { login } = useAuth()
  const [passkey, setPasskey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isAuthor = theme === 'author'

  const handleSubmit = async () => {
    if (!passkey.trim()) return
    setLoading(true); setError('')
    try {
      const { token, name } = await verifyPasskey(passkey)
      setToken(token)
      login(token, name)
      onClose()
    } catch (e) {
      // Rate-limit lockouts carry their own message; anything else is a wrong passkey
      if (/too many/i.test(e.message)) setError(e.message)
      else setError(isAuthor ? 'Incorrect passkey — try again.' : 'invalid passkey')
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  // ── Dev theme ──────────────────────────────────────────────────────────────
  if (!isAuthor) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(3,7,18,0.88)', backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div style={{
          width: 360,
          background: '#0a0f1a',
          border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: 14,
          padding: '36px 32px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.05)',
          animation: 'slideUp 0.2s ease',
        }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              color: 'var(--cyan)', letterSpacing: '0.15em', marginBottom: 8,
            }}>
              [sudo] admin access
            </div>
            <h2 style={{
              fontFamily: 'var(--font-mono)', fontSize: '1.1rem',
              color: 'var(--text-primary)', margin: 0, fontWeight: 600,
            }}>Enter passkey</h2>
          </div>

          {/* Input */}
          <input
            type="password"
            value={passkey}
            onChange={e => setPasskey(e.target.value)}
            onKeyDown={onKey}
            placeholder="••••••••"
            autoFocus
            style={{
              width: '100%', padding: '11px 14px',
              background: 'rgba(0,229,255,0.04)',
              border: `1px solid ${error ? 'rgba(255,80,80,0.5)' : 'rgba(0,229,255,0.2)'}`,
              borderRadius: 8,
              fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
              color: 'var(--text-primary)', outline: 'none',
              boxSizing: 'border-box', marginBottom: error ? 10 : 16,
              letterSpacing: '0.1em',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,0.5)'}
            onBlur={e => e.target.style.borderColor = error ? 'rgba(255,80,80,0.5)' : 'rgba(0,229,255,0.2)'}
          />

          {error && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
              color: 'rgba(255,100,80,0.85)', marginBottom: 14,
            }}>✗ {error}</div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '10px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7, cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
              color: 'var(--text-muted)', transition: 'all 0.2s',
            }}>cancel</button>
            <button onClick={handleSubmit} disabled={loading} style={{
              flex: 2, padding: '10px',
              background: loading ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.12)',
              border: '1px solid rgba(0,229,255,0.35)',
              borderRadius: 7, cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
              color: 'var(--cyan)', transition: 'all 0.2s',
            }}>
              {loading ? 'verifying...' : 'authenticate →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Author theme: night glass, gold seal (matches the author page's sky) ──
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'rgba(3,5,12,0.72)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      animation: 'fadeIn 0.15s ease',
      fontFamily: "'Lora', Georgia, serif",
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 'min(390px, 100%)', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(165deg, rgba(22,28,52,0.94) 0%, rgba(6,8,18,0.97) 100%)',
        border: '1px solid rgba(217,181,106,0.3)',
        borderRadius: 18,
        padding: '44px 36px 34px',
        boxShadow: '0 40px 110px rgba(0,0,0,0.7), 0 0 60px rgba(217,181,106,0.08)',
        animation: 'slideUp 0.2s ease',
      }}>
        <span aria-hidden style={{ position: 'absolute', top: 0, left: '12%', right: '12%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(217,181,106,0.7), transparent)' }} />

        {/* Seal */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22, filter: 'drop-shadow(0 0 14px rgba(217,181,106,0.35))' }}>
          <svg width="52" height="52" viewBox="0 0 48 48" aria-hidden>
            <defs>
              <radialGradient id="loginWax" cx="38%" cy="32%" r="70%">
                <stop offset="0%" stopColor="#f6dc98" /><stop offset="45%" stopColor="#c99a48" /><stop offset="100%" stopColor="#7a5418" />
              </radialGradient>
            </defs>
            <path d="M24 2 C30 3 33 1 37 5 C41 9 45 12 45 18 C47 24 44 28 45 33 C43 39 39 41 35 44 C30 47 26 45 21 46 C15 46 11 43 7 39 C3 35 3 31 2 25 C2 19 4 14 8 10 C12 5 17 2 24 2 Z" fill="url(#loginWax)" />
            <circle cx="24" cy="24" r="14" fill="none" stroke="#6a4612" strokeOpacity="0.55" strokeWidth="1.2" />
            <path d="M15 17 h6 a3.5 3.5 0 0 1 3 3 v12 a2.6 2.6 0 0 0 -2.6 -2.6 h-6.4 z M33 17 h-6 a3.5 3.5 0 0 0 -3 3 v12 a2.6 2.6 0 0 1 2.6 -2.6 h6.4 z" fill="#6a4612" fillOpacity="0.6" />
          </svg>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: '0.64rem', color: '#d9b56a', letterSpacing: '0.26em', textTransform: 'uppercase', marginBottom: 10, fontStyle: 'italic' }}>
            Author's Desk
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', color: '#f5f0e8', margin: 0, fontWeight: 700 }}>
            Enter your passkey
          </h2>
          <p style={{ fontFamily: "'EB Garamond', Garamond, Georgia, serif", fontSize: '1rem', color: 'rgba(245,240,232,0.55)', marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>
            To manage your books and content
          </p>
        </div>

        {/* Input */}
        <input
          type="password"
          value={passkey}
          onChange={e => setPasskey(e.target.value)}
          onKeyDown={onKey}
          placeholder="••••••••"
          autoFocus
          style={{
            width: '100%', padding: '13px 16px',
            background: 'rgba(4,6,14,0.85)',
            border: `1px solid ${error ? 'rgba(240,120,100,0.6)' : 'rgba(217,181,106,0.3)'}`,
            borderRadius: 10,
            fontFamily: "'Lora', Georgia, serif", textAlign: 'center',
            fontSize: '0.95rem', color: '#f5f0e8',
            outline: 'none', boxSizing: 'border-box',
            marginBottom: error ? 10 : 22,
            letterSpacing: '0.3em',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(217,181,106,0.75)'; e.target.style.boxShadow = '0 0 0 3px rgba(217,181,106,0.12)' }}
          onBlur={e => { e.target.style.borderColor = error ? 'rgba(240,120,100,0.6)' : 'rgba(217,181,106,0.3)'; e.target.style.boxShadow = 'none' }}
        />

        {error && (
          <div style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#f08a70', marginBottom: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px',
            background: 'transparent',
            border: '1px solid rgba(245,240,232,0.14)',
            borderRadius: 8, cursor: 'pointer',
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.82rem', color: 'rgba(245,240,232,0.55)',
            transition: 'all 0.2s',
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{
            flex: 2, padding: '11px',
            background: loading ? 'rgba(217,181,106,0.45)' : 'linear-gradient(180deg, #ecd08f 0%, #c99a48 100%)',
            border: 'none',
            borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '0.88rem', fontWeight: 700, color: '#1a1206',
            boxShadow: '0 6px 22px rgba(217,181,106,0.25)',
            transition: 'all 0.2s',
          }}>
            {loading ? 'Verifying…' : 'Enter the Desk'}
          </button>
        </div>
      </div>
    </div>
  )
}
