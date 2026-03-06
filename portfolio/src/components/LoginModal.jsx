import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginModal({ onClose }) {
  const { login } = useAuth()
  const [passkey, setPasskey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('confirm') // confirm | login

  const handleConfirm = () => setStep('login')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(passkey)
      onClose()
    } catch (err) {
      setError('Access denied. Wrong passkey.')
      setPasskey('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(3, 7, 18, 0.95)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: '480px', margin: '20px',
        background: 'var(--card-bg)',
        border: '1px solid var(--cyan)',
        boxShadow: '0 0 40px rgba(0,229,255,0.2)',
        borderRadius: '8px', overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
        animation: 'fadeInUp 0.3s ease'
      }}>
        {/* Terminal bar */}
        <div style={{
          background: '#111827', padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: '8px',
          borderBottom: '1px solid var(--card-border)'
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            portfolio — auth
          </span>
        </div>

        <div style={{ padding: '28px' }}>
          {step === 'confirm' ? (
            <>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>
                  $ sudo authenticate
                </div>
                <div style={{ color: 'var(--cyan)', fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>
                  Are you <span style={{ color: 'var(--green)' }}>Vishnu</span>?
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  This area requires elevated privileges. Only the site owner can proceed.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleConfirm} style={{
                  flex: 1, background: 'rgba(0,229,255,0.1)',
                  border: '1px solid var(--cyan)', color: 'var(--cyan)',
                  padding: '10px', borderRadius: '6px', fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}>
                  yes, I am
                </button>
                <button onClick={onClose} style={{
                  flex: 1, background: 'transparent',
                  border: '1px solid var(--text-muted)', color: 'var(--text-muted)',
                  padding: '10px', borderRadius: '6px', fontSize: '0.85rem',
                }}>
                  no, go back
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 4 }}>
                  $ enter passkey
                </div>
                <div style={{ color: 'var(--cyan)', fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>
                  Authentication required
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 6 }}>
                  passkey
                </label>
                <input
                  type="password"
                  value={passkey}
                  onChange={e => setPasskey(e.target.value)}
                  autoFocus
                  placeholder="••••••••••••"
                  style={{
                    width: '100%', background: '#0a0f1e',
                    border: `1px solid ${error ? 'rgba(255,80,80,0.6)' : 'var(--card-border)'}`,
                    color: 'var(--cyan)', padding: '10px 14px',
                    borderRadius: '6px', fontSize: '0.9rem',
                    outline: 'none', letterSpacing: '0.2em',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
                  onBlur={e => e.target.style.borderColor = error ? 'rgba(255,80,80,0.6)' : 'var(--card-border)'}
                />
                {error && (
                  <div style={{ color: 'rgba(255,100,100,0.9)', fontSize: '0.75rem', marginTop: 6 }}>
                    ✗ {error}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !passkey}
                style={{
                  width: '100%', background: loading ? 'rgba(0,229,255,0.05)' : 'rgba(0,229,255,0.1)',
                  border: '1px solid var(--cyan)', color: 'var(--cyan)',
                  padding: '10px', borderRadius: '6px', fontSize: '0.85rem',
                  opacity: loading || !passkey ? 0.5 : 1, transition: 'all 0.2s'
                }}
              >
                {loading ? 'authenticating...' : '$ authenticate'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
