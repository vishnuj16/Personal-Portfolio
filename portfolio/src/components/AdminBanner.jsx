import { useAuth } from '../context/AuthContext'

export default function AdminBanner() {
  const { isAdmin, adminName, isEditMode, setIsEditMode, modalOpen, logout } = useAuth()
  if (!isAdmin) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #001a1a 0%, #002222 50%, #001a1a 100%)',
      borderBottom: '1px solid var(--cyan)',
      boxShadow: '0 0 20px rgba(0,229,255,0.3)',
      padding: '8px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: 'var(--green)',
          boxShadow: '0 0 10px var(--green)', animation: 'glow-pulse 2s infinite'
        }} />
        <span style={{ color: 'var(--cyan)' }}>
          [root@portfolio ~]$ sudo su <span style={{ color: 'var(--green)', fontWeight: 700 }}>{adminName}</span>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>— Admin mode active</span>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={() => !modalOpen && setIsEditMode(e => !e)}
          title={modalOpen ? 'Close the open modal first' : ''}
          style={{
            background: isEditMode ? 'rgba(0,229,255,0.15)' : 'transparent',
            border: `1px solid ${isEditMode ? 'var(--cyan)' : 'var(--text-muted)'}`,
            color: isEditMode ? 'var(--cyan)' : 'var(--text-muted)',
            padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem',
            transition: 'all 0.2s',
            opacity: modalOpen ? 0.4 : 1,
            cursor: modalOpen ? 'not-allowed' : 'pointer',
          }}
        >
          {isEditMode ? '✎ Edit Mode ON' : '✎ Edit Mode OFF'}
          {modalOpen && <span style={{ marginLeft: 6, fontSize: '0.65rem' }}>(modal open)</span>}
        </button>
        <button
          onClick={logout}
          disabled={modalOpen}
          style={{
            background: 'transparent', border: '1px solid rgba(255,80,80,0.4)',
            color: 'rgba(255,100,100,0.8)', padding: '4px 12px', borderRadius: '4px',
            fontSize: '0.75rem', transition: 'all 0.2s', opacity: modalOpen ? 0.4 : 1, cursor: modalOpen ? 'not-allowed' : 'pointer',
          }}
        >
          exit
        </button>
      </div>
    </div>
  )
}
