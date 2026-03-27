import { useAuth } from '../context/AuthContext'
import LoginModal from './LoginModal'
import { useState } from 'react'

export default function AdminBanner() {
  const { isAdmin, adminName, isEditMode, toggleEditMode, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  if (!isAdmin) {
    return (
      <>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} theme="dev" />}
      </>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      height: '37px',
      background: 'linear-gradient(90deg, #030712 0%, #0a0f1e 50%, #030712 100%)',
      borderBottom: '1px solid rgba(0,229,255,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      fontFamily: 'var(--font-mono)',
    }}>
      {/* Left: status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: isEditMode ? 'var(--cyan)' : 'rgba(0,229,255,0.3)',
          boxShadow: isEditMode ? '0 0 8px var(--cyan)' : 'none',
          transition: 'all 0.3s',
        }} />
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          admin
        </span>
        <span style={{ color: 'rgba(0,229,255,0.3)', fontSize: '0.6rem' }}>·</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--cyan)', opacity: 0.8 }}>
          {adminName || 'admin'}
        </span>
        {isEditMode && (
          <span style={{
            fontSize: '0.6rem', color: '#28c840',
            background: 'rgba(40,200,64,0.08)', border: '1px solid rgba(40,200,64,0.25)',
            padding: '1px 7px', borderRadius: 3, letterSpacing: '0.08em',
          }}>
            EDITING
          </span>
        )}
      </div>

      {/* Right: controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={toggleEditMode}
          style={{
            background: isEditMode ? 'rgba(0,229,255,0.1)' : 'transparent',
            border: `1px solid ${isEditMode ? 'rgba(0,229,255,0.5)' : 'rgba(0,229,255,0.2)'}`,
            color: isEditMode ? 'var(--cyan)' : 'var(--text-muted)',
            padding: '3px 12px', borderRadius: '4px',
            fontSize: '0.68rem', cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(0,229,255,0.5)'
            e.currentTarget.style.color = 'var(--cyan)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = isEditMode ? 'rgba(0,229,255,0.5)' : 'rgba(0,229,255,0.2)'
            e.currentTarget.style.color = isEditMode ? 'var(--cyan)' : 'var(--text-muted)'
          }}
        >
          {isEditMode ? '✎ editing on' : '✎ edit off'}
        </button>

        <button
          onClick={logout}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,80,80,0.25)',
            color: 'rgba(255,100,100,0.6)',
            padding: '3px 10px', borderRadius: '4px',
            fontSize: '0.68rem', cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(255,80,80,0.5)'
            e.currentTarget.style.color = 'rgba(255,100,100,0.9)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,80,80,0.25)'
            e.currentTarget.style.color = 'rgba(255,100,100,0.6)'
          }}
        >
          logout
        </button>
      </div>
    </div>
  )
}