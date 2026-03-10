import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProjects, createProject, updateProject, deleteProject, getCategories, imgUrl } from '../api'
import EditModal from './EditModal'
import ProjectViewModal from './ProjectViewModal'

const PROJECT_FIELDS = [
  { key: 'title',       label: 'title',       required: true },
  { key: 'summary',     label: 'summary' },
  { key: 'description', label: 'description', type: 'textarea', hint: 'Markdown supported' },
  { key: 'cover_url',   label: 'cover image', type: 'image-upload', bucket: 'projects' },
  { key: 'repo_url',    label: 'repo_url' },
  { key: 'live_url',    label: 'live_url' },
  { key: 'status',      label: 'status', type: 'select', options: [
    { value: 'completed',   label: 'completed' },
    { value: 'in-progress', label: 'in-progress' },
    { value: 'archived',    label: 'archived' },
  ]},
  { key: 'started_at',  label: 'started_at', type: 'date' },
  { key: 'ended_at',    label: 'ended_at',   type: 'date', placeholder: 'leave blank if ongoing' },
  { key: 'skill_ids',   label: 'skills used', type: 'skill-ids', hint: 'Select from your skill library or create one inline' },
  { key: 'featured',    label: 'featured', type: 'checkbox', placeholder: 'Pin to top' },
]

const STATUS = {
  'completed':   { color: '#00ff87', label: 'COMPLETED',    glyph: '◆' },
  'in-progress': { color: '#00e5ff', label: 'IN PROGRESS',  glyph: '◉' },
  'archived':    { color: '#6b7280', label: 'ARCHIVED',     glyph: '○' },
}

// ── Scanline / CRT aesthetic utilities ───────────────────────────────────────
const BG = '#06090f'
const PANEL = '#0a0f1a'
const BORDER = 'rgba(0,229,255,0.12)'
const CYAN = '#00e5ff'
const GREEN = '#00ff87'

// ── Big Project Spotlight (the main showcase) ────────────────────────────────
function ProjectSpotlight({ project, onView, isEditMode, onEdit }) {
  const [hover, setHover] = useState(false)
  const s = STATUS[project.status] || STATUS['completed']
  const cover = project.cover_url ? imgUrl(project.cover_url) : null
  const skills = project.skills || []

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: cover ? '1fr 1fr' : '1fr',
        minHeight: 480,
        background: PANEL,
        border: `1px solid ${hover ? 'rgba(0,229,255,0.35)' : BORDER}`,
        borderRadius: 16,
        overflow: 'hidden',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        boxShadow: hover
          ? `0 0 0 1px rgba(0,229,255,0.12), 0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(0,229,255,0.08)`
          : '0 8px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Left: cover image */}
      {cover && (
        <div style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => onView(project)}>
          <img src={cover} alt={project.title} style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            filter: hover ? 'brightness(0.8) saturate(1.15)' : 'brightness(0.45) saturate(0.7)',
            transition: 'filter 0.5s ease, transform 0.6s ease',
            transform: hover ? 'scale(1.04)' : 'scale(1)',
          }} />
          {/* Scanline overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
            opacity: 0.5,
          }} />
          {/* Right-side gradient fade */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, #0a0f1a)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, #0a0f1a)', pointerEvents: 'none' }} />
        </div>
      )}

      {/* Right: content */}
      <div style={{
        padding: '40px 44px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative',
      }}>
        {/* Corner bracket accent */}
        <div style={{ position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderTop: `2px solid ${CYAN}`, borderRight: `2px solid ${CYAN}`, opacity: hover ? 0.9 : 0.25, transition: 'opacity 0.3s' }} />
        <div style={{ position: 'absolute', bottom: 16, left: 16, width: 24, height: 24, borderBottom: `2px solid ${CYAN}`, borderLeft: `2px solid ${CYAN}`, opacity: hover ? 0.9 : 0.25, transition: 'opacity 0.3s' }} />

        <div>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: s.color, letterSpacing: '0.15em' }}>
              {s.glyph} {s.label}
            </span>
            {project.featured && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#febc2e', background: 'rgba(254,188,46,0.08)', border: '1px solid rgba(254,188,46,0.25)', padding: '2px 7px', borderRadius: 3 }}>★ FEATURED</span>
            )}
            <span style={{ flex: 1 }} />
            {project.started_at && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(0,229,255,0.35)', letterSpacing: '0.08em' }}>
                {project.started_at}{project.ended_at ? ` → ${project.ended_at}` : ' → present'}
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            onClick={() => onView(project)}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
              fontWeight: 700, letterSpacing: '-0.02em',
              color: hover ? CYAN : 'var(--text-primary)',
              margin: '0 0 14px', cursor: 'pointer',
              transition: 'color 0.2s',
              lineHeight: 1.15,
            }}
          >{project.title}</h3>

          {/* Cyan rule */}
          <div style={{ width: 40, height: 2, background: `linear-gradient(to right, ${CYAN}, transparent)`, marginBottom: 18, borderRadius: 1 }} />

          {/* Summary */}
          {project.summary && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.75, marginBottom: 22, maxWidth: 440 }}>
              {project.summary}
            </p>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 28 }}>
              {skills.slice(0, 8).map(skill => (
                <span key={skill.id} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                  color: hover ? 'rgba(0,229,255,0.75)' : 'var(--text-muted)',
                  background: hover ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${hover ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  padding: '3px 9px', borderRadius: 4, transition: 'all 0.25s',
                }}>#{skill.name}</span>
              ))}
              {skills.length > 8 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', padding: '3px 9px' }}>+{skills.length - 8}</span>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {project.repo_url && (
              <a href={project.repo_url} target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = CYAN}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                repo
              </a>
            )}
            {project.live_url && (
              <a href={project.live_url} target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = GREEN}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                live
              </a>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => onView(project)} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)',
              color: CYAN, padding: '5px 14px', borderRadius: 5, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.06)' }}
            >view →</button>
            {isEditMode && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(project) }}
                style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', color: 'rgba(0,229,255,0.5)', padding: '5px 10px', borderRadius: 5, fontSize: '0.68rem', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>✎</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Compact list row (for the sidebar index) ──────────────────────────────────
function ProjectRow({ project, active, onClick }) {
  const [hover, setHover] = useState(false)
  const s = STATUS[project.status] || STATUS['completed']
  const lit = hover || active
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '13px 16px',
        borderRadius: 8,
        cursor: 'pointer',
        background: active ? 'rgba(0,229,255,0.06)' : hover ? 'rgba(255,255,255,0.02)' : 'transparent',
        border: `1px solid ${active ? 'rgba(0,229,255,0.3)' : 'transparent'}`,
        transition: 'all 0.18s',
        borderLeft: `3px solid ${active ? CYAN : hover ? 'rgba(0,229,255,0.3)' : 'transparent'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: '0.55rem', color: s.color, opacity: lit ? 1 : 0.5, transition: 'opacity 0.2s' }}>{s.glyph}</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', fontWeight: 600, color: lit ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.18s', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{project.title}</span>
        {project.featured && <span style={{ fontSize: '0.5rem', color: '#febc2e', opacity: 0.8 }}>★</span>}
      </div>
      {project.summary && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 16 }}>
          {project.summary.slice(0, 60)}{project.summary.length > 60 ? '…' : ''}
        </div>
      )}
    </div>
  )
}

// ── Main Projects component ───────────────────────────────────────────────────
export default function Projects() {
  const { isEditMode } = useAuth()
  const [projects, setProjects]             = useState([])
  const [skillCategories, setSkillCategories] = useState([])
  const [showAdd, setShowAdd]               = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [viewingProject, setViewingProject] = useState(null)
  const [filter, setFilter]                 = useState('all')
  const [activeIdx, setActiveIdx]           = useState(0)
  const [phase, setPhase]                   = useState('in')
  const intervalRef                         = useRef(null)

  const load           = () => getProjects().then(setProjects).catch(() => {})
  const loadCategories = () => getCategories().then(setSkillCategories).catch(() => {})
  useEffect(() => { load(); loadCategories() }, [])

  const filtered = filter === 'all' ? projects
    : filter === 'featured'     ? projects.filter(p => p.featured)
    : projects.filter(p => p.status === filter)

  // Clamp activeIdx when filter changes
  useEffect(() => { setActiveIdx(0); setPhase('in') }, [filter, projects.length])

  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (filtered.length <= 1) return
    intervalRef.current = setInterval(() => {
      setPhase('out')
      setTimeout(() => {
        setActiveIdx(i => (i + 1) % filtered.length)
        setPhase('in')
      }, 280)
    }, 6000)
  }, [filtered.length])

  useEffect(() => {
    startTimer()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [startTimer])

  const goTo = useCallback((i) => {
    if (i === activeIdx) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setPhase('out')
    setTimeout(() => { setActiveIdx(i); setPhase('in'); startTimer() }, 280)
  }, [activeIdx, startTimer])

  const project = filtered[activeIdx] || filtered[0]

  const projectToForm = (p) => ({ ...p, skill_ids: (p.skills || []).map(s => Number(s.id)) })
  const handleAdd    = async (v) => { const { skill_ids = [], ...rest } = v; await createProject({ ...rest, skill_ids: skill_ids.map(Number) }); load() }
  const handleEdit   = async (v) => { const { skill_ids = [], ...rest } = v; await updateProject(editingProject.id, { ...rest, skill_ids: skill_ids.map(Number) }); load() }
  const handleDelete = async ()  => { await deleteProject(editingProject.id); load() }

  return (
    <section id="projects">
      <div style={{ padding: '100px 40px', maxWidth: 1280, margin: '0 auto' }}>

        {/* Section header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: CYAN, letterSpacing: '0.15em', marginBottom: 6, opacity: 0.7 }}>
            <span style={{ color: 'var(--text-muted)' }}>~/</span>projects<span style={{ animation: 'blink 1.1s step-end infinite' }}>_</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 700, fontFamily: 'var(--font-sans)', margin: 0, letterSpacing: '-0.025em' }}>
              Projects<span style={{ color: CYAN }}>.</span>
            </h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {['all', 'featured', 'in-progress', 'completed', 'archived'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                  background: filter === f ? 'rgba(0,229,255,0.1)' : 'transparent',
                  border: `1px solid ${filter === f ? CYAN : 'var(--card-border)'}`,
                  color: filter === f ? CYAN : 'var(--text-muted)',
                  padding: '5px 12px', borderRadius: 4, transition: 'all 0.2s', cursor: 'pointer',
                }}>{f}</button>
              ))}
              {isEditMode && (
                <button onClick={() => setShowAdd(true)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.3)', color: GREEN, padding: '5px 12px', borderRadius: 4, cursor: 'pointer' }}>+ add</button>
              )}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '80px 0', border: `1px dashed ${BORDER}`, borderRadius: 12 }}>
            <div style={{ marginBottom: 8, opacity: 0.4 }}>// no projects found</div>
            {isEditMode && <div style={{ color: CYAN, cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => setShowAdd(true)}>add your first project →</div>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

            {/* Sidebar — project index */}
            <div style={{ position: 'sticky', top: 20 }}>
              {/* Terminal header */}
              <div style={{
                background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '10px 10px 0 0',
                padding: '10px 14px', borderBottom: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                  {filtered.length} project{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{
                background: PANEL, border: `1px solid ${BORDER}`, borderTop: 'none',
                borderRadius: '0 0 10px 10px', padding: '8px',
                maxHeight: '70vh', overflowY: 'auto',
              }}>
                {filtered.map((p, i) => (
                  <ProjectRow key={p.id} project={p} active={i === activeIdx} onClick={() => goTo(i)} />
                ))}
              </div>
              {/* Progress indicator */}
              {filtered.length > 1 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 10, justifyContent: 'center' }}>
                  {filtered.map((_, i) => (
                    <button key={i} onClick={() => goTo(i)} style={{
                      padding: 0, border: 'none', background: 'none', cursor: 'pointer',
                    }}>
                      <div style={{
                        width: i === activeIdx ? 20 : 5, height: 3, borderRadius: 2,
                        background: i === activeIdx ? CYAN : 'rgba(0,229,255,0.2)',
                        transition: 'all 0.3s ease',
                      }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Main spotlight */}
            <div style={{
              opacity: phase === 'out' ? 0 : 1,
              transform: phase === 'out' ? 'translateY(8px)' : 'translateY(0)',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
            }}>
              {project && (
                <ProjectSpotlight
                  project={project}
                  isEditMode={isEditMode}
                  onView={setViewingProject}
                  onEdit={setEditingProject}
                />
              )}

              {/* Navigation arrows */}
              {filtered.length > 1 && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                  <button onClick={() => goTo((activeIdx - 1 + filtered.length) % filtered.length)} style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                    background: 'rgba(0,229,255,0.04)', border: `1px solid ${BORDER}`,
                    color: 'var(--text-muted)', padding: '6px 14px', borderRadius: 5, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.35)'; e.currentTarget.style.color = CYAN }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >← prev</button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                    {String(activeIdx + 1).padStart(2, '0')} / {String(filtered.length).padStart(2, '0')}
                  </span>
                  <button onClick={() => goTo((activeIdx + 1) % filtered.length)} style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                    background: 'rgba(0,229,255,0.04)', border: `1px solid ${BORDER}`,
                    color: 'var(--text-muted)', padding: '6px 14px', borderRadius: 5, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.35)'; e.currentTarget.style.color = CYAN }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >next →</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {viewingProject && (
        <ProjectViewModal
          project={viewingProject}
          onClose={() => setViewingProject(null)}
          onEdit={(p) => { setViewingProject(null); setEditingProject(p) }}
          isEditMode={isEditMode}
        />
      )}
      {showAdd && (
        <EditModal title="new project" fields={PROJECT_FIELDS}
          initialValues={{ status: 'completed', featured: false, skill_ids: [] }}
          onSave={handleAdd} onClose={() => setShowAdd(false)}
          skillCategories={skillCategories} onSkillCreated={loadCategories} />
      )}
      {editingProject && (
        <EditModal title={`edit — ${editingProject.title}`} fields={PROJECT_FIELDS}
          initialValues={projectToForm(editingProject)}
          onSave={handleEdit} onDelete={handleDelete} onClose={() => setEditingProject(null)}
          skillCategories={skillCategories} onSkillCreated={loadCategories} />
      )}
    </section>
  )
}