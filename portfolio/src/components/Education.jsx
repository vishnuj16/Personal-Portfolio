import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getEducation, createEducation, updateEducation, deleteEducation, imgUrl } from '../api'
import EditModal from './EditModal'
import EducationViewModal from './EducationViewModal'

const EDU_FIELDS = [
  { key: 'logo_url',    label: 'institution logo', type: 'image-upload', bucket: 'education' },
  { key: 'institution', label: 'institution', required: true },
  { key: 'degree',      label: 'degree',      placeholder: 'e.g. B.Tech' },
  { key: 'field',       label: 'field of study', placeholder: 'e.g. Computer Science' },
  { key: 'started_at',  label: 'started_at',  type: 'date' },
  { key: 'ended_at',    label: 'ended_at',    type: 'date', placeholder: 'leave blank if ongoing' },
]

function EduCard({ edu, isEditMode, onView, onEdit }) {
  const [hovered, setHovered] = useState(false)
  const logoSrc = edu.logo_url ? imgUrl(edu.logo_url) : null

  return (
    <div
      onClick={() => onView(edu)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden', background: '#0a0f1a',
        border: `1px solid ${hovered ? 'rgba(0,229,255,0.45)' : 'rgba(0,229,255,0.08)'}`,
        borderRadius: '12px', padding: '22px 24px', transition: 'all 0.3s ease',
        cursor: 'pointer',
        boxShadow: hovered
          ? '0 0 0 1px rgba(0,229,255,0.1), 0 16px 40px rgba(0,0,0,0.5)'
          : '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Glow radial top-right */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: hovered ? 180 : 80, height: hovered ? 180 : 80, background: 'radial-gradient(circle at top right, rgba(0,229,255,0.08) 0%, transparent 70%)', transition: 'all 0.4s ease', pointerEvents: 'none' }} />
      {/* Bottom accent line */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: hovered ? 'linear-gradient(to right, var(--cyan), transparent)' : 'linear-gradient(to right, rgba(0,229,255,0.2), transparent)', transition: 'all 0.3s' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative' }}>
        {/* Logo */}
        {logoSrc ? (
          <div style={{ width: 48, height: 48, flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6, filter: hovered ? 'brightness(1.1)' : 'brightness(0.85) grayscale(0.3)', transition: 'filter 0.3s' }} />
          </div>
        ) : (
          <div style={{ width: 48, height: 48, flexShrink: 0, background: 'rgba(0,229,255,0.04)', border: '1px dashed rgba(0,229,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.1rem', opacity: 0.25 }}>🎓</span>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 600, color: hovered ? 'var(--cyan)' : 'var(--text-primary)', marginBottom: 4, transition: 'color 0.2s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {edu.institution}
          </h3>
          {(edu.degree || edu.field) && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(0,229,255,0.7)', marginBottom: 6 }}>
              {[edu.degree, edu.field].filter(Boolean).join(' · ')}
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
            {edu.started_at}{edu.ended_at ? ` → ${edu.ended_at}` : ' → present'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: hovered ? 'rgba(0,229,255,0.5)' : 'transparent', transition: 'color 0.2s' }}>view →</span>
          {isEditMode && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(edu) }}
              style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', color: 'var(--cyan)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
            >✎</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Education() {
  const { isEditMode } = useAuth()
  const [education, setEducation] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)

  const load = () => getEducation().then(setEducation).catch(() => {})
  useEffect(() => { load() }, [])

  return (
    <section id="education" style={{ background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ padding: '60px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)', letterSpacing: '0.15em', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>$ cat</span> ~/.education
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
              Education<span style={{ color: 'var(--cyan)' }}>.</span>
            </h2>
            {isEditMode && (
              <button onClick={() => setShowAdd(true)} style={addBtnStyle}>+ add</button>
            )}
          </div>
        </div>

        {education.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '60px 0' }}>
            // no education entries yet
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {education.map(edu => (
              <EduCard key={edu.id} edu={edu} isEditMode={isEditMode}
                onView={setViewing}
                onEdit={setEditing}
              />
            ))}
          </div>
        )}
      </div>

      {viewing && (
        <EducationViewModal edu={viewing} onClose={() => setViewing(null)}
          onEdit={e => { setViewing(null); setEditing(e) }}
          isEditMode={isEditMode} />
      )}
      {showAdd && (
        <EditModal title="new education" fields={EDU_FIELDS}
          onSave={async (v) => { await createEducation(v); load() }}
          onClose={() => setShowAdd(false)} />
      )}
      {editing && (
        <EditModal title={`edit — ${editing.institution}`} fields={EDU_FIELDS}
          initialValues={editing}
          onSave={async (v) => { await updateEducation(editing.id, v); load() }}
          onDelete={async () => { await deleteEducation(editing.id); load() }}
          onClose={() => setEditing(null)} />
      )}
    </section>
  )
}

const addBtnStyle = {
  fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
  background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.3)',
  color: 'var(--green)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer',
}