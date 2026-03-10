import { useState, useEffect, useRef } from 'react'
import { createSkill, uploadFile, deleteFile, imgUrl } from '../api'

// ─── Image Upload Field ────────────────────────────────────────────────────
// value    : string | null  — the stored URL
// onChange : (url: string | null) => void
// bucket   : string         — "projects" | "skills" | "categories" | "education" | "experiences" | "avatars"
// label    : string         — e.g. "cover image", "logo"
function ImageUpload({ value, onChange, bucket = 'misc', label = 'image' }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const previewSrc = value ? (value.startsWith('http') ? value : imgUrl(value)) : null

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const result = await uploadFile(file, bucket)
      onChange(result.url)
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!value) return
    try {
      await deleteFile(value)
    } catch (_) { /* ignore if already gone */ }
    onChange(null)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      {/* Drop zone / current image */}
      {previewSrc ? (
        <div style={{
          position: 'relative', borderRadius: '8px', overflow: 'hidden',
          border: '1px solid rgba(0,229,255,0.25)',
          background: '#0a0f1e',
        }}>
          <img
            src={previewSrc}
            alt={label}
            style={{
              width: '100%', maxHeight: '160px', objectFit: 'cover',
              display: 'block',
              filter: 'brightness(0.85)',
            }}
          />
          {/* Overlay controls */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(3,7,18,0.85) 0%, transparent 50%)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            padding: '10px 12px',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(0,229,255,0.7)' }}>
              ✓ {label} uploaded
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => inputRef.current?.click()}
                style={overlayBtnStyle('#febc2e', 'rgba(254,188,46,0.15)')}
              >replace</button>
              <button
                onClick={handleRemove}
                style={overlayBtnStyle('rgba(255,100,100,0.8)', 'rgba(255,0,0,0.08)')}
              >rm</button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `1px dashed ${dragOver ? 'var(--cyan)' : 'rgba(0,229,255,0.2)'}`,
            borderRadius: '8px',
            padding: '28px 16px',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: dragOver ? 'rgba(0,229,255,0.04)' : '#0a0f1e',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)' }}
          onMouseLeave={e => { if (!dragOver) e.currentTarget.style.borderColor = 'rgba(0,229,255,0.2)' }}
        >
          {uploading ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)' }}>
              <div style={{ marginBottom: 6, opacity: 0.5 }}>▲▲▲</div>
              uploading...
            </div>
          ) : (
            <>
              <div style={{ fontSize: '1.4rem', marginBottom: 6, opacity: 0.3 }}>⊕</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                click or drop to upload {label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                jpg · png · webp · gif · svg · max 5MB
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(255,100,100,0.8)', marginTop: 5 }}>
          ✗ {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}

function overlayBtnStyle(color, bg) {
  return {
    fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
    color, background: bg,
    border: `1px solid ${color}`,
    padding: '3px 8px', borderRadius: '4px', cursor: 'pointer',
  }
}

// ─── Cyan Date Picker ──────────────────────────────────────────────────────
function CyanDatePicker({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => {
    if (value) { const [y] = value.split('-'); return parseInt(y) || new Date().getFullYear() }
    return new Date().getFullYear()
  })
  const ref = useRef(null)

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const selectedYear = value ? parseInt(value.split('-')[0]) : null
  const selectedMonth = value ? parseInt(value.split('-')[1]) - 1 : null

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const select = (y, m) => { onChange(`${y}-${String(m + 1).padStart(2, '0')}`); setOpen(false) }
  const clear = (e) => { e.stopPropagation(); onChange('') }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        width: '100%', background: '#0a0f1e',
        border: `1px solid ${open ? 'var(--cyan)' : 'var(--card-border)'}`,
        color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        padding: '8px 36px 8px 12px', borderRadius: '6px', fontSize: '0.82rem',
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        transition: 'border-color 0.2s', boxSizing: 'border-box',
        fontFamily: 'var(--font-mono)',
        boxShadow: open ? '0 0 0 2px rgba(0,229,255,0.1)' : 'none',
        position: 'relative',
      }}>
        <span>{value || placeholder || 'YYYY-MM'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'absolute', right: 10 }}>
          {value && <span onClick={clear} style={{ color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}>✕</span>}
          <span style={{ color: 'var(--cyan)', fontSize: '0.7rem', opacity: 0.7 }}>▾</span>
        </div>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 99999,
          background: '#0d1117', border: '1px solid rgba(0,229,255,0.25)',
          borderRadius: '10px', padding: '16px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,229,255,0.08)',
          minWidth: '260px', animation: 'fadeInUp 0.18s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={() => setViewYear(y => y - 1)} style={navBtnStyle}>◀</button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--cyan)', letterSpacing: '0.05em' }}>{viewYear}</span>
            <button onClick={() => setViewYear(y => y + 1)} style={navBtnStyle}>▶</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {MONTHS.map((m, i) => {
              const isSel = selectedYear === viewYear && selectedMonth === i
              const isCur = new Date().getFullYear() === viewYear && new Date().getMonth() === i
              return (
                <button key={m} onClick={() => select(viewYear, i)} style={{
                  padding: '8px 4px', borderRadius: '6px',
                  fontFamily: 'var(--font-mono)', fontSize: '0.72rem', cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: isSel ? 'rgba(0,229,255,0.15)' : 'transparent',
                  border: isSel ? '1px solid rgba(0,229,255,0.6)' : isCur ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
                  color: isSel ? 'var(--cyan)' : isCur ? 'rgba(0,229,255,0.6)' : 'var(--text-secondary)',
                  boxShadow: isSel ? '0 0 8px rgba(0,229,255,0.2)' : 'none',
                }}
                onMouseEnter={e => { if (!isSel) { e.currentTarget.style.background = 'rgba(0,229,255,0.06)'; e.currentTarget.style.color = 'var(--cyan)' } }}
                onMouseLeave={e => { if (!isSel) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isCur ? 'rgba(0,229,255,0.6)' : 'var(--text-secondary)' } }}
                >{m}</button>
              )
            })}
          </div>
          <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, textAlign: 'center' }}>
            <button onClick={() => { const n = new Date(); select(n.getFullYear(), n.getMonth()) }}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >⊙ today</button>
          </div>
        </div>
      )}
    </div>
  )
}

const navBtnStyle = {
  background: 'transparent', border: '1px solid rgba(0,229,255,0.2)',
  color: 'var(--cyan)', width: 28, height: 28, borderRadius: '5px',
  cursor: 'pointer', fontSize: '0.65rem',
}

// ─── Skill ID Picker ───────────────────────────────────────────────────────
function SkillIDPicker({ value = [], onChange, categories = [], onSkillCreated }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newSkill, setNewSkill] = useState({ name: '', category_id: '', proficiency: 80, years: 1 })
  const ref = useRef(null)

  const selectedIds = Array.isArray(value) ? value.map(Number) : []
  const allSkills = categories.flatMap(cat => (cat.skills || []).map(s => ({ ...s, categoryName: cat.name })))
  const selectedSkills = allSkills.filter(s => selectedIds.includes(Number(s.id)))
  const grouped = categories.map(cat => ({
    ...cat,
    skills: (cat.skills || []).filter(s =>
      !selectedIds.includes(Number(s.id)) && s.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.skills.length > 0)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setShowCreate(false) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (skillId) => {
    const id = Number(skillId)
    onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id])
  }

  const handleCreateSkill = async () => {
    if (!newSkill.name.trim() || !newSkill.category_id) return
    setCreating(true)
    try {
      const created = await createSkill({
        name: newSkill.name.trim(),
        category_id: Number(newSkill.category_id),
        proficiency: Number(newSkill.proficiency),
        years: Number(newSkill.years),
        sort_order: 0,
      })
      if (created?.id) { onChange([...selectedIds, Number(created.id)]); if (onSkillCreated) onSkillCreated() }
      setNewSkill(s => ({ ...s, name: '' })); setShowCreate(false)
    } catch (e) { console.error('Failed to create skill:', e) }
    finally { setCreating(false) }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => { setOpen(true); setShowCreate(false) }} style={{
        minHeight: '42px', background: '#0a0f1e',
        border: `1px solid ${open ? 'var(--cyan)' : 'var(--card-border)'}`,
        borderRadius: '6px', padding: '6px 10px',
        cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center',
        transition: 'border-color 0.2s',
        boxShadow: open ? '0 0 0 2px rgba(0,229,255,0.1)' : 'none', boxSizing: 'border-box',
      }}>
        {selectedSkills.map(skill => (
          <span key={skill.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
            color: 'var(--cyan)', background: 'rgba(0,229,255,0.08)',
            border: '1px solid rgba(0,229,255,0.3)', padding: '2px 8px', borderRadius: '4px',
          }}>
            {skill.name}
            <span onClick={(e) => { e.stopPropagation(); toggle(skill.id) }}
              style={{ cursor: 'pointer', opacity: 0.55, fontSize: '0.65rem' }}>✕</span>
          </span>
        ))}
        {selectedSkills.length === 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            click to select skills...
          </span>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 99999,
          background: '#0d1117', border: '1px solid rgba(0,229,255,0.25)',
          borderRadius: '10px', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
          animation: 'fadeInUp 0.18s ease',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input autoFocus value={search}
              onChange={e => { setSearch(e.target.value); setShowCreate(false) }}
              onKeyDown={e => e.key === 'Escape' && setOpen(false)}
              placeholder="search skills..."
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', outline: 'none' }}
            />
            <button onClick={() => { setShowCreate(s => !s); setSearch('') }} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              background: showCreate ? 'rgba(0,255,135,0.12)' : 'rgba(0,255,135,0.06)',
              border: '1px solid rgba(0,255,135,0.35)',
              color: 'var(--green)', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{showCreate ? '✕ cancel' : '+ new skill'}</button>
          </div>

          {showCreate && (
            <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,255,135,0.015)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--green)', letterSpacing: '0.08em' }}>// create &amp; attach new skill</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input value={newSkill.name} onChange={e => setNewSkill(s => ({ ...s, name: e.target.value }))}
                  placeholder="skill name *" onKeyDown={e => e.key === 'Enter' && handleCreateSkill()} style={miniInputStyle} />
                <select value={newSkill.category_id} onChange={e => setNewSkill(s => ({ ...s, category_id: e.target.value }))} style={miniInputStyle}>
                  <option value="">select category *</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'end' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    proficiency: <span style={{ color: 'var(--cyan)' }}>{newSkill.proficiency}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={newSkill.proficiency}
                    onChange={e => setNewSkill(s => ({ ...s, proficiency: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: 'var(--cyan)', cursor: 'pointer' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4 }}>years exp</div>
                  <input type="number" min={0} step={0.5} value={newSkill.years}
                    onChange={e => setNewSkill(s => ({ ...s, years: e.target.value }))}
                    style={{ ...miniInputStyle, width: '100%' }} />
                </div>
              </div>
              <button onClick={handleCreateSkill} disabled={creating || !newSkill.name.trim() || !newSkill.category_id} style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.4)',
                color: 'var(--green)', padding: '8px', borderRadius: '5px',
                cursor: creating || !newSkill.name.trim() || !newSkill.category_id ? 'not-allowed' : 'pointer',
                opacity: creating || !newSkill.name.trim() || !newSkill.category_id ? 0.5 : 1, transition: 'opacity 0.2s',
              }}>{creating ? 'creating...' : '$ create + attach'}</button>
            </div>
          )}

          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {grouped.length === 0 && !showCreate && (
              <div style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                {search ? `// no skills matching "${search}"` : '// all skills already attached'}
              </div>
            )}
            {grouped.map(cat => (
              <div key={cat.id}>
                <div style={{ padding: '7px 14px 4px', fontFamily: 'var(--font-mono)', fontSize: '0.59rem', color: 'rgba(0,229,255,0.45)', letterSpacing: '0.12em', borderBottom: '1px solid rgba(255,255,255,0.03)', userSelect: 'none' }}>
                  ▸ {cat.name.toUpperCase()}
                </div>
                {cat.skills.map(skill => (
                  <div key={skill.id} onClick={() => toggle(skill.id)}
                    style={{ padding: '8px 14px 8px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>{skill.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>{skill.proficiency}%{skill.years ? ` · ${skill.years}y` : ''}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const miniInputStyle = {
  background: '#0a0f1e', border: '1px solid rgba(0,229,255,0.15)',
  color: 'var(--text-primary)', padding: '6px 10px', borderRadius: '5px',
  fontSize: '0.75rem', fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box',
}

// ─── Main EditModal ────────────────────────────────────────────────────────
export default function EditModal({
  title, fields, initialValues = {}, onSave, onClose, onDelete,
  skillCategories = [], onSkillCreated,
}) {
  const [values, setValues] = useState(initialValues)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }))

  const handleSave = async () => {
    setLoading(true); setError('')
    try { await onSave(values); onClose() }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm('Are you sure you want to delete this entry?')) return
    setLoading(true)
    try { await onDelete(); onClose() }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const renderField = (field) => {
    if (field.type === 'image-upload') {
      return (
        <ImageUpload
          value={values[field.key] ?? null}
          onChange={url => set(field.key, url)}
          bucket={field.bucket || 'misc'}
          label={field.label}
        />
      )
    }
    if (field.type === 'textarea') {
      return <textarea value={values[field.key] ?? ''} onChange={e => set(field.key, e.target.value)}
        rows={4} placeholder={field.placeholder} style={{ ...inputStyle, resize: 'vertical' }} />
    }
    if (field.type === 'checkbox') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!values[field.key]} onChange={e => set(field.key, e.target.checked)}
            style={{ accentColor: 'var(--cyan)', width: 16, height: 16 }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{field.placeholder}</span>
        </label>
      )
    }
    if (field.type === 'select') {
      return (
        <select value={values[field.key] ?? ''} onChange={e => set(field.key, e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}>
          {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    }
    if (field.type === 'date') {
      return <CyanDatePicker value={values[field.key] ?? ''} onChange={val => set(field.key, val)}
        placeholder={field.placeholder} />
    }
    if (field.type === 'skill-ids') {
      return (
        <SkillIDPicker
          value={values[field.key] ?? []}
          onChange={val => set(field.key, val)}
          categories={skillCategories}
          onSkillCreated={onSkillCreated}
        />
      )
    }
    return <input type={field.type || 'text'} value={values[field.key] ?? ''}
      onChange={e => set(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder={field.placeholder} style={inputStyle} />
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(3,7,18,0.92)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: '560px', maxHeight: '90vh',
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: '12px', overflow: 'hidden',
        fontFamily: 'var(--font-mono)', animation: 'fadeInUp 0.25s ease',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,229,255,0.06)',
      }}>
        {/* Title bar */}
        <div style={{
          background: '#0d1117', padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--card-border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
            <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{title}</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          {fields.map(field => (
            <div key={field.key}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 5, letterSpacing: '0.05em' }}>
                {field.label}{field.required && <span style={{ color: 'var(--cyan)' }}> *</span>}
              </label>
              {renderField(field)}
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
              opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)',
            }}>{loading ? 'saving...' : '$ save'}</button>
            {onDelete && (
              <button onClick={handleDelete} disabled={loading} style={{
                background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,80,80,0.4)',
                color: 'rgba(255,100,100,0.8)', padding: '10px 16px', borderRadius: '6px',
                fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-mono)',
              }}>rm</button>
            )}
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid var(--text-muted)',
              color: 'var(--text-muted)', padding: '10px 16px', borderRadius: '6px',
              fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-mono)',
            }}>cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', background: '#0a0f1e',
  border: '1px solid var(--card-border)', color: 'var(--text-primary)',
  padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem',
  outline: 'none', fontFamily: 'var(--font-mono)', boxSizing: 'border-box',
}