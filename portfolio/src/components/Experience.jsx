import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getExperiences, createExperience, updateExperience, deleteExperience } from '../api'
import EditModal from './EditModal'

const EXP_FIELDS = [
  { key: 'company', label: 'company', required: true },
  { key: 'role', label: 'role / title', required: true },
  { key: 'description', label: 'description', type: 'textarea', hint: 'Markdown supported' },
  { key: 'company_url', label: 'company_url' },
  { key: 'started_at', label: 'started_at', required: true, placeholder: 'YYYY-MM', hint: 'Format: YYYY-MM' },
  { key: 'ended_at', label: 'ended_at', placeholder: 'YYYY-MM or leave blank if current' },
  { key: 'current', label: 'current job', type: 'checkbox', placeholder: 'This is my current position' },
  { key: 'sort_order', label: 'sort order', type: 'number' },
]

function ExperienceCard({ exp, isEditMode, onEdit }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1px 1fr',
      gap: '0 28px', position: 'relative'
    }}>
      {/* Timeline line */}
      <div style={{
        background: 'linear-gradient(to bottom, var(--cyan), rgba(0,229,255,0.1))',
        borderRadius: '1px'
      }} />

      {/* Content */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: '10px', padding: '22px 24px', marginBottom: '16px',
        position: 'relative', transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
      >
        {/* Timeline dot */}
        <div style={{
          position: 'absolute', left: '-36px', top: '24px',
          width: 10, height: 10, borderRadius: '50%',
          background: exp.current ? 'var(--cyan)' : 'var(--card-border)',
          border: '2px solid var(--black)',
          boxShadow: exp.current ? '0 0 10px var(--cyan)' : 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {exp.role}
              </h3>
              {exp.current && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                  color: 'var(--cyan)', background: 'rgba(0,229,255,0.08)',
                  border: '1px solid rgba(0,229,255,0.3)',
                  padding: '2px 8px', borderRadius: '4px'
                }}>CURRENT</span>
              )}
            </div>
            {exp.company_url ? (
              <a href={exp.company_url} target="_blank" rel="noreferrer" style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cyan)',
                textDecoration: 'none'
              }}>
                {exp.company} ↗
              </a>
            ) : (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cyan)' }}>
                {exp.company}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {exp.started_at}{exp.ended_at ? ` → ${exp.ended_at}` : exp.current ? ' → present' : ''}
            </div>
            {isEditMode && (
              <button onClick={() => onEdit(exp)} style={{
                background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)',
                color: 'var(--cyan)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)'
              }}>✎</button>
            )}
          </div>
        </div>

        {exp.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.65, marginTop: '10px' }}>
            {exp.description}
          </p>
        )}
      </div>
    </div>
  )
}

export default function Experience() {
  const { isEditMode } = useAuth()
  const [experiences, setExperiences] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = () => getExperiences().then(setExperiences).catch(() => {})
  useEffect(() => { load() }, [])

  return (
    <section id="experience">
      <div style={{ padding: '100px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)', letterSpacing: '0.15em', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>$ git</span> log --experience
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
              Experience<span style={{ color: 'var(--cyan)' }}>.</span>
            </h2>
            {isEditMode && (
              <button onClick={() => setShowAdd(true)} style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.3)',
                color: 'var(--green)', padding: '5px 12px', borderRadius: '4px'
              }}>+ add</button>
            )}
          </div>
        </div>

        {experiences.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '60px 0' }}>
            // no experience entries yet
          </div>
        ) : (
          <div style={{ maxWidth: '760px', paddingLeft: '20px' }}>
            {experiences.map(exp => (
              <ExperienceCard key={exp.id} exp={exp} isEditMode={isEditMode} onEdit={setEditing} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <EditModal
          title="new experience"
          fields={EXP_FIELDS}
          initialValues={{ current: false }}
          onSave={async (v) => { await createExperience(v); load() }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <EditModal
          title={`edit — ${editing.company}`}
          fields={EXP_FIELDS}
          initialValues={editing}
          onSave={async (v) => { await updateExperience(editing.id, v); load() }}
          onDelete={async () => { await deleteExperience(editing.id); load() }}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}
