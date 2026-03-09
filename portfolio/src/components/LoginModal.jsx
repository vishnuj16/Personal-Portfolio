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
    } catch {
      setError(isAuthor ? 'Incorrect passkey — try again.' : 'invalid passkey')
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

  // ── Author theme ───────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'rgba(61,46,26,0.6)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.15s ease',
      fontFamily: "'Lora', Georgia, serif",
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 380,
        background: '#fdf8f0',
        border: '1px solid rgba(201,168,76,0.25)',
        borderRadius: 18,
        padding: '40px 36px',
        boxShadow: '0 32px 80px rgba(61,46,26,0.3)',
        animation: 'slideUp 0.2s ease',
      }}>
        {/* Ornamental top rule */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28,
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.25)' }} />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="rgba(201,168,76,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.25)' }} />
        </div>

        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{
            fontSize: '0.65rem', color: '#c9a84c',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            marginBottom: 8, fontStyle: 'italic',
          }}>
            Author's Desk
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.4rem', color: '#3d2e1a',
            margin: 0, fontWeight: 700,
          }}>Enter your passkey</h2>
          <p style={{
            fontSize: '0.78rem', color: '#9a8060',
            marginTop: 8, fontStyle: 'italic', lineHeight: 1.5,
          }}>
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
            width: '100%', padding: '12px 16px',
            background: '#fff9f0',
            border: `1px solid ${error ? 'rgba(180,60,40,0.4)' : 'rgba(201,168,76,0.3)'}`,
            borderRadius: 10,
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.9rem', color: '#3d2e1a',
            outline: 'none', boxSizing: 'border-box',
            marginBottom: error ? 10 : 20,
            letterSpacing: '0.12em',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.7)'}
          onBlur={e => e.target.style.borderColor = error ? 'rgba(180,60,40,0.4)' : 'rgba(201,168,76,0.3)'}
        />

        {error && (
          <div style={{
            fontSize: '0.75rem', fontStyle: 'italic',
            color: '#b43c28', marginBottom: 16,
          }}>
            ✗ {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px',
            background: 'transparent',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: 8, cursor: 'pointer',
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.82rem', color: '#9a8060',
            transition: 'all 0.2s',
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{
            flex: 2, padding: '11px',
            background: loading ? 'rgba(201,168,76,0.5)' : '#c9a84c',
            border: 'none',
            borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '0.85rem', fontWeight: 600, color: '#1a1410',
            transition: 'all 0.2s',
          }}>
            {loading ? 'Verifying…' : 'Enter the Desk'}
          </button>
        </div>
      </div>
    </div>
  )
}