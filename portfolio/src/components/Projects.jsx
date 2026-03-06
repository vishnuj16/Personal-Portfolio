import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProjects, createProject, updateProject, deleteProject, imgUrl } from '../api'
import EditModal from './EditModal'

const PROJECT_FIELDS = [
  { key: 'title', label: 'title', required: true },
  { key: 'summary', label: 'summary' },
  { key: 'description', label: 'description', type: 'textarea', hint: 'Markdown supported' },
  { key: 'repo_url', label: 'repo_url' },
  { key: 'live_url', label: 'live_url' },
  { key: 'status', label: 'status', type: 'select', options: [
    { value: 'completed', label: 'completed' },
    { value: 'in-progress', label: 'in-progress' },
    { value: 'archived', label: 'archived' },
  ]},
  { key: 'started_at', label: 'started_at', placeholder: 'YYYY-MM', hint: 'Format: YYYY-MM' },
  { key: 'ended_at', label: 'ended_at', placeholder: 'YYYY-MM or leave blank' },
  { key: 'tags', label: 'tags', placeholder: 'go, react, docker', hint: 'Comma separated' },
  { key: 'featured', label: 'featured', type: 'checkbox', placeholder: 'Pin to top' },
]

const STATUS_COLORS = {
  'completed': { bg: 'rgba(0,255,135,0.08)', border: 'rgba(0,255,135,0.3)', color: '#00ff87' },
  'in-progress': { bg: 'rgba(0,229,255,0.08)', border: 'rgba(0,229,255,0.3)', color: '#00e5ff' },
  'archived': { bg: 'rgba(100,100,100,0.08)', border: 'rgba(100,100,100,0.3)', color: '#6b7280' },
}

function ProjectCard({ project, isEditMode, onEdit }) {
  const [hovered, setHovered] = useState(false)
  const status = STATUS_COLORS[project.status] || STATUS_COLORS['completed']
  const coverSrc = project.cover_url ? imgUrl(project.cover_url) : null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: '12px', cursor: 'default',
        border: `1px solid ${hovered ? 'rgba(0,229,255,0.5)' : 'rgba(0,229,255,0.1)'}`,
        background: '#0a0f1a',
        transition: 'all 0.35s ease',
        boxShadow: hovered
          ? '0 0 0 1px rgba(0,229,255,0.15), 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,229,255,0.1)'
          : '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Cover image strip — only renders if image exists */}
      {coverSrc && (
        <div style={{
          height: '160px', overflow: 'hidden', position: 'relative',
        }}>
          <img src={coverSrc} alt={project.title}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: hovered ? 'brightness(0.75) saturate(1.1)' : 'brightness(0.5) saturate(0.8)',
              transition: 'filter 0.4s ease, transform 0.5s ease',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              display: 'block',
            }}
          />
          {/* Gradient fade into card body */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
            background: 'linear-gradient(to bottom, transparent, #0a0f1a)',
          }} />
          {/* Status badge on image */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            display: 'flex', gap: 6,
          }}>
            {project.featured && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                color: '#febc2e', background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(254,188,46,0.4)',
                padding: '2px 8px', borderRadius: '4px', backdropFilter: 'blur(4px)'
              }}>★ FEATURED</span>
            )}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
              color: status.color, background: 'rgba(0,0,0,0.7)',
              border: `1px solid ${status.border}`,
              padding: '2px 8px', borderRadius: '4px', backdropFilter: 'blur(4px)'
            }}>{project.status}</span>
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '20px 22px 22px' }}>
        {/* Badges — only show here if no cover image */}
        {!coverSrc && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {project.featured && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                color: '#febc2e', background: 'rgba(254,188,46,0.08)',
                border: '1px solid rgba(254,188,46,0.3)',
                padding: '2px 8px', borderRadius: '4px'
              }}>★ FEATURED</span>
            )}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
              color: status.color, background: status.bg,
              border: `1px solid ${status.border}`,
              padding: '2px 8px', borderRadius: '4px'
            }}>{project.status}</span>
          </div>
        )}

        {/* Decorative top-left corner accent */}
        <div style={{
          position: 'absolute', top: coverSrc ? 'auto' : 0, left: 0,
          bottom: coverSrc ? 0 : 'auto',
          width: 3, height: coverSrc ? '60%' : '60%',
          background: hovered
            ? 'linear-gradient(to bottom, var(--cyan), transparent)'
            : 'linear-gradient(to bottom, rgba(0,229,255,0.3), transparent)',
          borderRadius: '0 2px 2px 0',
          transition: 'all 0.3s',
        }} />

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.05em' }}>
          {project.started_at && `${project.started_at}${project.ended_at ? ` → ${project.ended_at}` : ' → present'}`}
        </div>

        <h3 style={{
          fontSize: '1.05rem', fontWeight: 600,
          color: hovered ? 'var(--cyan)' : 'var(--text-primary)',
          marginBottom: 8, fontFamily: 'var(--font-sans)',
          transition: 'color 0.2s',
          letterSpacing: '-0.01em',
        }}>
          {project.title}
        </h3>

        {project.summary && (
          <p style={{
            color: 'var(--text-secondary)', fontSize: '0.82rem',
            lineHeight: 1.65, marginBottom: 16,
          }}>
            {project.summary}
          </p>
        )}

        {project.tags && project.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
            {project.tags.map(tag => (
              <span key={tag} style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                color: hovered ? 'rgba(0,229,255,0.7)' : 'var(--text-muted)',
                background: hovered ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${hovered ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                padding: '2px 8px', borderRadius: '4px', transition: 'all 0.25s',
              }}>#{tag}</span>
            ))}
          </div>
        )}

        <div style={{
          display: 'flex', gap: 14,
          borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14,
          alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {project.repo_url && (
              <a href={project.repo_url} target="_blank" rel="noreferrer" style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                color: 'var(--text-muted)', transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >⌥ repo ↗</a>
            )}
            {project.live_url && (
              <a href={project.live_url} target="_blank" rel="noreferrer" style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                color: 'var(--text-muted)', transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--green)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >◉ live ↗</a>
            )}
          </div>
          {isEditMode && (
            <button onClick={() => onEdit(project)} style={{
              background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)',
              color: 'var(--cyan)', padding: '3px 10px', borderRadius: '4px',
              fontSize: '0.68rem', fontFamily: 'var(--font-mono)'
            }}>✎</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Projects() {
  const { isEditMode } = useAuth()
  const [projects, setProjects] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = () => getProjects().then(setProjects).catch(() => {})
  useEffect(() => { load() }, [])

  const handleAdd = async (values) => {
    const tags = typeof values.tags === 'string'
      ? values.tags.split(',').map(t => t.trim()).filter(Boolean)
      : values.tags || []
    await createProject({ ...values, tags })
    load()
  }

  const handleEdit = async (values) => {
    const tags = typeof values.tags === 'string'
      ? values.tags.split(',').map(t => t.trim()).filter(Boolean)
      : values.tags || []
    await updateProject(editingProject.id, { ...values, tags })
    load()
  }

  const handleDelete = async () => {
    await deleteProject(editingProject.id)
    load()
  }

  const filtered = filter === 'all' ? projects
    : filter === 'featured' ? projects.filter(p => p.featured)
    : projects.filter(p => p.status === filter)

  const sectionStyle = {
    padding: '100px 40px',
    maxWidth: '1200px', margin: '0 auto'
  }

  return (
    <section id="projects">
      <div style={sectionStyle}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)', letterSpacing: '0.15em', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>$ ls ~/</span>projects
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
              Projects<span style={{ color: 'var(--cyan)' }}>.</span>
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['all', 'featured', 'in-progress', 'completed', 'archived'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                  background: filter === f ? 'rgba(0,229,255,0.1)' : 'transparent',
                  border: `1px solid ${filter === f ? 'var(--cyan)' : 'var(--card-border)'}`,
                  color: filter === f ? 'var(--cyan)' : 'var(--text-muted)',
                  padding: '5px 12px', borderRadius: '4px', transition: 'all 0.2s'
                }}>{f}</button>
              ))}
              {isEditMode && (
                <button onClick={() => setShowAdd(true)} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                  background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.3)',
                  color: 'var(--green)', padding: '5px 12px', borderRadius: '4px'
                }}>+ add</button>
              )}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '60px 0' }}>
            <div>// no projects found</div>
            {isEditMode && <div style={{ marginTop: '12px', color: 'var(--cyan)', cursor: 'pointer' }} onClick={() => setShowAdd(true)}>add your first project →</div>}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px'
          }}>
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} isEditMode={isEditMode} onEdit={setEditingProject} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <EditModal
          title="new project"
          fields={PROJECT_FIELDS}
          initialValues={{ status: 'completed', featured: false }}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editingProject && (
        <EditModal
          title={`edit — ${editingProject.title}`}
          fields={PROJECT_FIELDS}
          initialValues={{
            ...editingProject,
            tags: Array.isArray(editingProject.tags) ? editingProject.tags.join(', ') : ''
          }}
          onSave={handleEdit}
          onDelete={handleDelete}
          onClose={() => setEditingProject(null)}
        />
      )}
    </section>
  )
}
