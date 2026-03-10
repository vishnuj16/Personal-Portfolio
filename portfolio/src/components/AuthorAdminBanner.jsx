import { useAuth } from '../context/AuthContext'

export default function AuthorAdminBanner() {
  const { isAdmin, adminName, isEditMode, toggleEditMode, logout } = useAuth()
  if (!isAdmin) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #2c1f0e 0%, #3d2b12 50%, #2c1f0e 100%)',
      borderBottom: '1px solid rgba(201,168,76,0.5)',
      boxShadow: '0 0 24px rgba(201,168,76,0.15)',
      padding: '8px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: "'Lora', Georgia, serif", fontSize: '0.8rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', background: '#c9a84c',
          boxShadow: '0 0 8px #c9a84c', animation: 'glow-pulse 2s infinite',
          flexShrink: 0,
        }} />
        <span style={{ color: 'rgba(201,168,76,0.9)', fontStyle: 'italic' }}>
          Author's desk —{' '}
          <span style={{ color: '#c9a84c', fontWeight: 600, fontStyle: 'normal' }}>
            {adminName}
          </span>
        </span>
        <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: '0.72rem' }}>
          · managing books & content
        </span>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={toggleEditMode}
          style={{
            background: isEditMode ? 'rgba(201,168,76,0.15)' : 'transparent',
            border: `1px solid ${isEditMode ? 'rgba(201,168,76,0.6)' : 'rgba(245,240,232,0.2)'}`,
            color: isEditMode ? '#c9a84c' : 'rgba(245,240,232,0.4)',
            padding: '4px 14px', borderRadius: '4px', fontSize: '0.74rem',
            fontFamily: "'Lora', Georgia, serif",
            transition: 'all 0.2s',
            cursor: 'pointer',
          }}
        >
          {isEditMode ? '✎ Editing' : '✎ Edit Mode'}
        </button>
        <button
          onClick={logout}
          style={{
            background: 'transparent', border: '1px solid rgba(255,120,80,0.3)',
            color: 'rgba(255,140,100,0.7)', padding: '4px 12px', borderRadius: '4px',
            fontSize: '0.74rem', fontFamily: "'Lora', Georgia, serif",
            transition: 'all 0.2s', cursor: 'pointer',
          }}
        >
          leave desk
        </button>
      </div>
    </div>
  )
}