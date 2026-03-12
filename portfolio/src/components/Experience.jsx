import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getExperiences, createExperience, updateExperience, deleteExperience, imgUrl } from '../api'
import EditModal from './EditModal'
import ExperienceViewModal from './ExperienceViewModal'

const EXP_FIELDS = [
  { key: 'logo_url',    label: 'company logo',  type: 'image-upload', bucket: 'experiences' },
  { key: 'company',     label: 'company',        required: true },
  { key: 'role',        label: 'role / title',   required: true },
  { key: 'description', label: 'description',    type: 'textarea', hint: 'Markdown supported' },
  { key: 'company_url', label: 'company_url' },
  { key: 'started_at',  label: 'started_at',     type: 'date', required: true },
  { key: 'ended_at',    label: 'ended_at',        type: 'date', placeholder: 'leave blank if current' },
  { key: 'current',     label: 'current job',    type: 'checkbox', placeholder: 'This is my current position' },
  { key: 'sort_order',  label: 'sort order',     type: 'number' },
]

function ExperienceCard({ exp, isEditMode, onView, onEdit }) {
  const [hovered, setHovered] = useState(false)
  const logoSrc = exp.logo_url ? imgUrl(exp.logo_url) : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1px 1fr', gap: '0 28px', position: 'relative' }}>
      {/* Timeline line */}
      <div style={{ background: 'linear-gradient(to bottom, var(--cyan), rgba(0,229,255,0.1))', borderRadius: '1px' }} />

      <div
        onClick={() => onView(exp)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'var(--card-bg)', border: `1px solid ${hovered ? 'rgba(0,229,255,0.35)' : 'var(--card-border)'}`,
          borderRadius: '10px', padding: '22px 24px', marginBottom: '16px',
          position: 'relative', transition: 'all 0.2s', cursor: 'pointer',
          boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        {/* Timeline dot */}
        <div style={{ position: 'absolute', left: '-36px', top: '24px', width: 10, height: 10, borderRadius: '50%', background: exp.current ? 'var(--cyan)' : 'var(--card-border)', border: '2px solid var(--black)', boxShadow: exp.current ? '0 0 10px var(--cyan)' : 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {logoSrc ? (
              <div style={{ width: 38, height: 38, flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                <img src={logoSrc} alt={exp.company} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4, filter: 'brightness(0.9)' }} />
              </div>
            ) : (
              <div style={{ width: 38, height: 38, flexShrink: 0, background: 'rgba(0,229,255,0.03)', border: '1px dashed rgba(0,229,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, fontSize: '0.9rem', opacity: 0.3 }}>🏢</div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 600, color: hovered ? 'var(--cyan)' : 'var(--text-primary)', transition: 'color 0.2s' }}>{exp.role}</h3>
                {exp.current && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--cyan)', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.3)', padding: '2px 8px', borderRadius: '4px' }}>CURRENT</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cyan)' }}>{exp.company}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {exp.started_at}{exp.ended_at ? ` → ${exp.ended_at}` : exp.current ? ' → present' : ''}
            </div>
            {isEditMode && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(exp) }} style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', color: 'var(--cyan)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>✎</button>
            )}
          </div>
        </div>

        {exp.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.65, marginTop: '10px' }}>{exp.description}</p>}

        {hovered && <div style={{ position: 'absolute', bottom: 12, right: 16, fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(0,229,255,0.4)' }}>view details →</div>}
      </div>
    </div>
  )
}

export default function Experience() {
  const { isEditMode } = useAuth()
  const [experiences, setExperiences] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)

  const load = () => getExperiences().then(setExperiences).catch(() => {})
  useEffect(() => { load() }, [])

  return (
    <section id="experience">
      <div style={{ padding: '60px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)', letterSpacing: '0.15em', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>$ git</span> log --experience
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>Experience<span style={{ color: 'var(--cyan)' }}>.</span></h2>
            {isEditMode && <button onClick={() => setShowAdd(true)} style={addBtnStyle}>+ add</button>}
          </div>
        </div>

        {experiences.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '60px 0' }}>// no experience entries yet</div>
        ) : (
          <div style={{ maxWidth: '760px', paddingLeft: '20px' }}>
            {experiences.map(exp => (
              <ExperienceCard key={exp.id} exp={exp} isEditMode={isEditMode}
                onView={setViewing}
                onEdit={setEditing}
              />
            ))}
          </div>
        )}
      </div>

      {viewing && (
        <ExperienceViewModal exp={viewing} onClose={() => setViewing(null)}
          onEdit={(e) => { setViewing(null); setEditing(e) }}
          isEditMode={isEditMode} />
      )}
      {showAdd && (
        <EditModal title="new experience" fields={EXP_FIELDS}
          initialValues={{ current: false }}
          onSave={async (v) => { await createExperience(v); load() }}
          onClose={() => setShowAdd(false)} />
      )}
      {editing && (
        <EditModal title={`edit — ${editing.company}`} fields={EXP_FIELDS}
          initialValues={editing}
          onSave={async (v) => { await updateExperience(editing.id, v); load() }}
          onDelete={async () => { await deleteExperience(editing.id); load() }}
          onClose={() => setEditing(null)} />
      )}
    </section>
  )
}

const addBtnStyle = { fontFamily: 'var(--font-mono)', fontSize: '0.72rem', background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.3)', color: 'var(--green)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer' }