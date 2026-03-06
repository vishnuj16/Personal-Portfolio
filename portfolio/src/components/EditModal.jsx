import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function EditModal({ title, fields, initialValues = {}, onSave, onClose, onDelete }) {
  const { setModalOpen } = useAuth()
  const [values, setValues] = useState(initialValues)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Lock the edit mode toggle while this modal is mounted
  useEffect(() => {
    setModalOpen(true)
    return () => setModalOpen(false)
  }, [])

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }))

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      await onSave(values)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Are you sure you want to delete this entry?')) return
    setLoading(true)
    try {
      await onDelete()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(3,7,18,0.95)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: 'calc(37px + 24px) 20px 40px',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: '560px',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '8px', overflow: 'hidden',
        fontFamily: 'var(--font-mono)', animation: 'fadeInUp 0.3s ease',
        flexShrink: 0,
      }}>
        <div style={{
          background: '#0d1117', padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--card-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
            <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{title}</span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1rem'
          }}>✕</button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {fields.map(field => (
            <div key={field.key}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 5, letterSpacing: '0.05em' }}>
                {field.label}{field.required && <span style={{ color: 'var(--cyan)' }}> *</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={values[field.key] ?? ''}
                  onChange={e => set(field.key, e.target.value)}
                  rows={4}
                  placeholder={field.placeholder}
                  style={{
                    width: '100%', background: '#0a0f1e',
                    border: '1px solid var(--card-border)', color: 'var(--text-primary)',
                    padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem',
                    resize: 'vertical', outline: 'none'
                  }}
                />
              ) : field.type === 'checkbox' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!values[field.key]}
                    onChange={e => set(field.key, e.target.checked)}
                    style={{ accentColor: 'var(--cyan)', width: 16, height: 16 }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{field.placeholder}</span>
                </label>
              ) : field.type === 'select' ? (
                <select
                  value={values[field.key] ?? ''}
                  onChange={e => set(field.key, e.target.value)}
                  style={{
                    width: '100%', background: '#0a0f1e',
                    border: '1px solid var(--card-border)', color: 'var(--text-primary)',
                    padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', outline: 'none'
                  }}
                >
                  {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={values[field.key] ?? ''}
                  onChange={e => set(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                  placeholder={field.placeholder}
                  style={{
                    width: '100%', background: '#0a0f1e',
                    border: '1px solid var(--card-border)', color: 'var(--text-primary)',
                    padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', outline: 'none'
                  }}
                />
              )}
              {field.hint && <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 4 }}>{field.hint}</div>}
            </div>
          ))}

          {error && (
            <div style={{ color: 'rgba(255,100,100,0.9)', fontSize: '0.78rem', background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
              ✗ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={handleSave} disabled={loading} style={{
              flex: 1, background: 'rgba(0,229,255,0.1)', border: '1px solid var(--cyan)',
              color: 'var(--cyan)', padding: '10px', borderRadius: '6px', fontSize: '0.82rem',
              opacity: loading ? 0.5 : 1
            }}>
              {loading ? 'saving...' : '$ save'}
            </button>
            {onDelete && (
              <button onClick={handleDelete} disabled={loading} style={{
                background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,80,80,0.4)',
                color: 'rgba(255,100,100,0.8)', padding: '10px 16px', borderRadius: '6px', fontSize: '0.82rem'
              }}>
                rm
              </button>
            )}
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid var(--text-muted)',
              color: 'var(--text-muted)', padding: '10px 16px', borderRadius: '6px', fontSize: '0.82rem'
            }}>
              cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
