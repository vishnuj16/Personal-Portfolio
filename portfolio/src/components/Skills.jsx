import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  createSkill, updateSkill, deleteSkill, imgUrl
} from '../api'
import EditModal from './EditModal'

const CATEGORY_FIELDS = [
  { key: 'image_url',  label: 'category icon', type: 'image-upload', bucket: 'categories' },
  { key: 'name',       label: 'category name', required: true },
  { key: 'sort_order', label: 'sort order',    type: 'number' },
]

const SKILL_FIELDS = (categories) => [
  { key: 'image_url',   label: 'skill icon',    type: 'image-upload', bucket: 'skills' },
  { key: 'name',        label: 'skill name',    required: true },
  { key: 'category_id', label: 'category', type: 'select', options: categories.map(c => ({ value: c.id, label: c.name })) },
  { key: 'proficiency', label: 'proficiency (0-100)', type: 'number' },
  { key: 'years',       label: 'years experience', type: 'number', hint: 'Decimals ok, e.g. 2.5' },
  { key: 'sort_order',  label: 'sort order',    type: 'number' },
]

// ── Animated proficiency bar that triggers on first visibility ──────────────
function SkillBar({ proficiency, visible }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 160 }}>
      <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          width: visible ? `${proficiency}%` : '0%',
          background: proficiency >= 80
            ? 'linear-gradient(90deg, rgba(0,229,255,0.6), var(--cyan))'
            : proficiency >= 50
              ? 'linear-gradient(90deg, rgba(0,229,255,0.35), rgba(0,229,255,0.7))'
              : 'linear-gradient(90deg, rgba(0,229,255,0.2), rgba(0,229,255,0.45))',
          transition: visible ? 'width 0.8s cubic-bezier(0.16,1,0.3,1)' : 'none',
          boxShadow: proficiency >= 80 ? '0 0 6px rgba(0,229,255,0.4)' : 'none',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>
        {proficiency}%
      </span>
    </div>
  )
}

// ── A single skill row — tree node ──────────────────────────────────────────
function SkillRow({ skill, isLast, isEditMode, onEdit, catIndex, rowIndex, visible }) {
  const [hovered, setHovered] = useState(false)
  const iconSrc = skill.image_url ? imgUrl(skill.image_url) : null
  const connector = isLast ? '└──' : '├──'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 0,
        padding: '5px 0',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-8px)',
        transition: `opacity 0.4s ease ${(catIndex * 80 + rowIndex * 40)}ms, transform 0.4s ease ${(catIndex * 80 + rowIndex * 40)}ms`,
      }}
    >
      {/* Tree connector */}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
        color: hovered ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.1)',
        marginRight: 10, userSelect: 'none', flexShrink: 0,
        transition: 'color 0.2s',
      }}>{connector}</span>

      {/* Skill icon */}
      {iconSrc && (
        <div style={{ width: 16, height: 16, flexShrink: 0, marginRight: 8, borderRadius: 3, overflow: 'hidden', opacity: hovered ? 1 : 0.7, transition: 'opacity 0.2s' }}>
          <img src={iconSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      )}

      {/* Skill name */}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
        color: hovered ? 'var(--cyan)' : 'var(--text-secondary)',
        transition: 'color 0.15s',
        minWidth: 130, flexShrink: 0,
      }}>
        {skill.name}
        {skill.years > 0 && (
          <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 6, fontSize: '0.68rem' }}>
            {skill.years}y
          </span>
        )}
      </span>

      {/* Progress bar */}
      <SkillBar proficiency={skill.proficiency || 0} visible={visible} />

      {/* Edit button */}
      {isEditMode && (
        <button
          onClick={() => onEdit(skill)}
          style={{
            background: 'transparent', border: '1px solid rgba(0,229,255,0.15)',
            color: 'rgba(0,229,255,0.5)', padding: '1px 6px', borderRadius: '3px',
            fontSize: '0.6rem', fontFamily: 'var(--font-mono)', cursor: 'pointer',
            marginLeft: 10, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s',
          }}
        >✎</button>
      )}
    </div>
  )
}

// ── Category block — a "directory" ──────────────────────────────────────────
function CategoryBlock({ cat, index, isEditMode, onEditCat, onAddSkill, onEditSkill, allVisible }) {
  const [collapsed, setCollapsed] = useState(false)
  const iconSrc = cat.image_url ? imgUrl(cat.image_url) : null
  const skills = cat.skills || []
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  // Intersection observer for staggered reveal
  useEffect(() => {
    if (allVisible) { setVisible(true); return }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [allVisible])

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transition: `opacity 0.5s ease ${index * 100}ms`,
    }}>
      {/* Directory line */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 0', cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Collapse arrow */}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
          color: 'rgba(0,229,255,0.5)',
          transition: 'transform 0.2s',
          display: 'inline-block',
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)',
        }}>▾</span>

        {/* Category icon */}
        {iconSrc ? (
          <div style={{ width: 18, height: 18, flexShrink: 0, borderRadius: 4, overflow: 'hidden', opacity: 0.85 }}>
            <img src={iconSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(0,229,255,0.4)' }}>📁</span>
        )}

        {/* Directory name */}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--cyan)', fontWeight: 500, letterSpacing: '0.02em' }}>
          {cat.name}/
        </span>

        {/* Skill count */}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(255,255,255,0.18)', marginLeft: 2 }}>
          {skills.length} file{skills.length !== 1 ? 's' : ''}
        </span>

        {/* Edit controls */}
        {isEditMode && (
          <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => onAddSkill(cat)} style={microBtn('var(--green)', 'rgba(0,255,135,0.1)')}>+ skill</button>
            <button onClick={() => onEditCat(cat)} style={microBtn('var(--cyan)', 'rgba(0,229,255,0.08)')}>✎</button>
          </div>
        )}
      </div>

      {/* Skills — tree children */}
      <div style={{
        paddingLeft: 18,
        overflow: 'hidden',
        maxHeight: collapsed ? 0 : `${skills.length * 60 + 20}px`,
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Vertical line */}
        <div style={{ position: 'relative', paddingLeft: 14, borderLeft: '1px solid rgba(0,229,255,0.1)', marginLeft: 2 }}>
          {skills.length === 0 ? (
            <div style={{ padding: '6px 0', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.15)' }}>
              └── <span style={{ fontStyle: 'italic', opacity: 0.5 }}>(empty)</span>
            </div>
          ) : (
            skills.map((skill, i) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                isLast={i === skills.length - 1}
                isEditMode={isEditMode}
                onEdit={onEditSkill}
                catIndex={index}
                rowIndex={i}
                visible={visible}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function microBtn(color, bg) {
  return {
    fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
    background: bg, border: `1px solid ${color}44`,
    color, padding: '2px 7px', borderRadius: '3px', cursor: 'pointer',
  }
}

// ── Main Skills section ──────────────────────────────────────────────────────
export default function Skills() {
  const { isEditMode } = useAuth()
  const [categories, setCategories] = useState([])
  const [showAddCat, setShowAddCat] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [showAddSkill, setShowAddSkill] = useState(null)
  const [editingSkill, setEditingSkill] = useState(null)
  const [allExpanded, setAllExpanded] = useState(false)

  const load = () => getCategories().then(setCategories).catch(() => {})
  useEffect(() => { load() }, [])

  const totalSkills = categories.reduce((acc, c) => acc + (c.skills?.length || 0), 0)

  return (
    <section id="skills" style={{ background: 'rgba(255,255,255,0.008)' }}>
      <div style={{ padding: '60px 40px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Section header */}
        <div style={{ marginBottom: '56px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)', letterSpacing: '0.15em', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>$ tree</span> ~/.skills
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
                Skills<span style={{ color: 'var(--cyan)' }}>.</span>
              </h2>
              {totalSkills > 0 && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {categories.length} directories, {totalSkills} files
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {categories.length > 0 && (
                <button onClick={() => setAllExpanded(v => !v)} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                  background: 'transparent', border: '1px solid var(--card-border)',
                  color: 'var(--text-muted)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer',
                }}>
                  {allExpanded ? '▲ collapse all' : '▼ expand all'}
                </button>
              )}
              {isEditMode && (
                <button onClick={() => setShowAddCat(true)} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                  background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.3)',
                  color: 'var(--green)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer',
                }}>+ mkdir</button>
              )}
            </div>
          </div>
        </div>

        {/* Terminal card */}
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '60px 0' }}>
            // no skills added yet
          </div>
        ) : (
          <div style={{
            background: '#06090f',
            border: '1px solid rgba(0,229,255,0.1)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(0,229,255,0.04)',
          }}>
            {/* Terminal title bar */}
            <div style={{
              background: '#0d1117', padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: '1px solid rgba(0,229,255,0.07)',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginLeft: 8 }}>
                tree ~/.skills — {categories.length} dirs
              </span>
            </div>

            {/* Tree content */}
            <div style={{ padding: '20px 24px 24px' }}>
              {/* Root line */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'rgba(0,229,255,0.6)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ opacity: 0.5 }}>~/.skills</span>
              </div>

              {/* Categories */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {categories.map((cat, i) => (
                  <CategoryBlock
                    key={cat.id}
                    cat={cat}
                    index={i}
                    isEditMode={isEditMode}
                    onEditCat={setEditingCat}
                    onAddSkill={setShowAddSkill}
                    onEditSkill={setEditingSkill}
                    allVisible={allExpanded}
                  />
                ))}
              </div>

              {/* Summary line */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>
                {categories.length} director{categories.length === 1 ? 'y' : 'ies'}, {totalSkills} file{totalSkills !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddCat && (
        <EditModal title="mkdir — new category" fields={CATEGORY_FIELDS}
          initialValues={{ sort_order: 0 }}
          onSave={async (v) => { await createCategory(v); load() }}
          onClose={() => setShowAddCat(false)} />
      )}
      {editingCat && (
        <EditModal title={`edit dir — ${editingCat.name}`} fields={CATEGORY_FIELDS}
          initialValues={editingCat}
          onSave={async (v) => { await updateCategory(editingCat.id, v); load() }}
          onDelete={async () => { await deleteCategory(editingCat.id); load() }}
          onClose={() => setEditingCat(null)} />
      )}
      {showAddSkill && (
        <EditModal title={`touch — new skill in ${showAddSkill.name}`} fields={SKILL_FIELDS(categories)}
          initialValues={{ category_id: showAddSkill.id, proficiency: 80, sort_order: 0 }}
          onSave={async (v) => { await createSkill(v); load() }}
          onClose={() => setShowAddSkill(null)} />
      )}
      {editingSkill && (
        <EditModal title={`edit — ${editingSkill.name}`} fields={SKILL_FIELDS(categories)}
          initialValues={editingSkill}
          onSave={async (v) => { await updateSkill(editingSkill.id, v); load() }}
          onDelete={async () => { await deleteSkill(editingSkill.id); load() }}
          onClose={() => setEditingSkill(null)} />
      )}
    </section>
  )
}