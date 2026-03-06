import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getCategories, createCategory, updateCategory, deleteCategory, createSkill, updateSkill, deleteSkill } from '../api'
import EditModal from './EditModal'

const CATEGORY_FIELDS = [
  { key: 'name', label: 'category name', required: true },
  { key: 'sort_order', label: 'sort order', type: 'number' },
]

const SKILL_FIELDS = (categories) => [
  { key: 'name', label: 'skill name', required: true },
  { key: 'category_id', label: 'category', type: 'select', options: categories.map(c => ({ value: c.id, label: c.name })) },
  { key: 'proficiency', label: 'proficiency (0-100)', type: 'number' },
  { key: 'years', label: 'years experience', type: 'number', hint: 'Decimals ok, e.g. 2.5' },
  { key: 'sort_order', label: 'sort order', type: 'number' },
]

function SkillBadge({ skill, isEditMode, onEdit }) {
  const [hovered, setHovered] = useState(false)
  const proficiency = skill.proficiency || 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? 'rgba(0,229,255,0.4)' : 'var(--card-border)'}`,
        borderRadius: '10px', padding: '14px 16px',
        transition: 'all 0.25s', cursor: 'default',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
          {skill.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {skill.years && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {skill.years}y
            </span>
          )}
          {isEditMode && (
            <button onClick={() => onEdit(skill)} style={{
              background: 'transparent', border: '1px solid rgba(0,229,255,0.2)',
              color: 'var(--cyan)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)'
            }}>✎</button>
          )}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${proficiency}%`,
          background: `linear-gradient(90deg, var(--cyan-dim), var(--cyan))`,
          borderRadius: '2px', transition: 'width 0.6s ease',
          boxShadow: '0 0 8px rgba(0,229,255,0.4)'
        }} />
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
        {proficiency}%
      </div>
    </div>
  )
}

export default function Skills() {
  const { isEditMode } = useAuth()
  const [categories, setCategories] = useState([])
  const [showAddCat, setShowAddCat] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [showAddSkill, setShowAddSkill] = useState(null)
  const [editingSkill, setEditingSkill] = useState(null)

  const load = () => getCategories().then(setCategories).catch(() => {})
  useEffect(() => { load() }, [])

  return (
    <section id="skills" style={{ background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ padding: '100px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)', letterSpacing: '0.15em', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>$ cat</span> ~/.skills
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
              Skills<span style={{ color: 'var(--cyan)' }}>.</span>
            </h2>
            {isEditMode && (
              <button onClick={() => setShowAddCat(true)} style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.3)',
                color: 'var(--green)', padding: '5px 12px', borderRadius: '4px'
              }}>+ add category</button>
            )}
          </div>
        </div>

        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '60px 0' }}>
            // no skills added yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {categories.map(cat => (
              <div key={cat.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: 24, height: 1, background: 'var(--cyan)', opacity: 0.5 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cyan)', letterSpacing: '0.1em' }}>
                    {cat.name.toUpperCase()}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
                  {isEditMode && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setShowAddSkill(cat)} style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                        background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.3)',
                        color: 'var(--green)', padding: '3px 8px', borderRadius: '3px'
                      }}>+ skill</button>
                      <button onClick={() => setEditingCat(cat)} style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                        background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)',
                        color: 'var(--cyan)', padding: '3px 8px', borderRadius: '3px'
                      }}>✎ cat</button>
                    </div>
                  )}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px'
                }}>
                  {(cat.skills || []).map(skill => (
                    <SkillBadge
                      key={skill.id} skill={skill}
                      isEditMode={isEditMode}
                      onEdit={setEditingSkill}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddCat && (
        <EditModal
          title="new category"
          fields={CATEGORY_FIELDS}
          initialValues={{ sort_order: 0 }}
          onSave={async (v) => { await createCategory(v); load() }}
          onClose={() => setShowAddCat(false)}
        />
      )}
      {editingCat && (
        <EditModal
          title={`edit category — ${editingCat.name}`}
          fields={CATEGORY_FIELDS}
          initialValues={editingCat}
          onSave={async (v) => { await updateCategory(editingCat.id, v); load() }}
          onDelete={async () => { await deleteCategory(editingCat.id); load() }}
          onClose={() => setEditingCat(null)}
        />
      )}
      {showAddSkill && (
        <EditModal
          title={`add skill to ${showAddSkill.name}`}
          fields={SKILL_FIELDS(categories)}
          initialValues={{ category_id: showAddSkill.id, proficiency: 80, sort_order: 0 }}
          onSave={async (v) => { await createSkill(v); load() }}
          onClose={() => setShowAddSkill(null)}
        />
      )}
      {editingSkill && (
        <EditModal
          title={`edit skill — ${editingSkill.name}`}
          fields={SKILL_FIELDS(categories)}
          initialValues={editingSkill}
          onSave={async (v) => { await updateSkill(editingSkill.id, v); load() }}
          onDelete={async () => { await deleteSkill(editingSkill.id); load() }}
          onClose={() => setEditingSkill(null)}
        />
      )}
    </section>
  )
}
