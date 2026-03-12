import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProfile, updateProfile, checkResume as checkResume_api, uploadResume } from '../api'
import TerminalTyper from './TerminalTyper'
import EditModal from './EditModal'

// ─── Social link definitions ─────────────────────────────────────────────────
// Each one has a monochrome SVG icon, label, and color accent.
const SOCIAL_DEFS = {
  github_url: {
    label: 'GitHub',
    color: '#e6edf3',
    hoverBg: 'rgba(230,237,243,0.08)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
  },
  linkedin_url: {
    label: 'LinkedIn',
    color: '#0a66c2',
    hoverBg: 'rgba(10,102,194,0.12)',
    borderColor: 'rgba(10,102,194,0.35)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  twitter_url: {
    label: 'X / Twitter',
    color: '#e7e9ea',
    hoverBg: 'rgba(231,233,234,0.08)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  website_url: {
    label: 'Website',
    color: 'var(--cyan)',
    hoverBg: 'rgba(0,229,255,0.08)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
      </svg>
    ),
  },
}

// Profile edit fields — no resume_url here
const PROFILE_FIELDS = [
  { key: 'name',         label: 'name',              required: true },
  { key: 'tagline',      label: 'tagline' },
  { key: 'dev_bio',      label: 'developer bio',     type: 'textarea' },
  { key: 'email',        label: 'email' },
  { key: 'phone',        label: 'phone' },
  { key: 'location',     label: 'location' },
  { key: 'github_url',   label: 'github_url' },
  { key: 'linkedin_url', label: 'linkedin_url' },
  { key: 'twitter_url',  label: 'twitter_url' },
  { key: 'website_url',  label: 'website_url' },
  { key: 'available',    label: 'available for work', type: 'checkbox', placeholder: 'Currently available' },
]

// Keys that belong exclusively to dev mode — never overwrite author-side fields
const DEV_PROFILE_KEYS = PROFILE_FIELDS.map(f => f.key)

// ─── Social pill button ───────────────────────────────────────────────────────
function SocialPill({ url, type }) {
  const [hovered, setHovered] = useState(false)
  if (!url) return null
  const def = SOCIAL_DEFS[type]
  if (!def) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 14px',
        borderRadius: '8px',
        border: `1px solid ${hovered ? (def.borderColor || def.color + '55') : 'rgba(255,255,255,0.08)'}`,
        background: hovered ? def.hoverBg : 'rgba(255,255,255,0.03)',
        color: hovered ? def.color : 'rgba(255,255,255,0.45)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.72rem',
        letterSpacing: '0.02em',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        boxShadow: hovered ? `0 0 14px ${def.color}18` : 'none',
      }}
    >
      <span style={{ color: hovered ? def.color : 'rgba(255,255,255,0.65)', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}>
        {def.icon}
      </span>
      {def.label}
      <span style={{ opacity: 0.4, fontSize: '0.6rem' }}>↗</span>
    </a>
  )
}

// ─── Resume section ───────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

function ResumeDownloadButton() {
  const [hovered, setHovered] = useState(false)
  const [dlLoading, setDlLoading] = useState(false)

  const handleView = () => window.open(`${API_BASE}/api/resume`, '_blank')

  const handleDownload = async (e) => {
    e.stopPropagation()
    setDlLoading(true)
    try {
      const resp = await fetch(`${API_BASE}/api/resume?download=true`)
      if (!resp.ok) throw new Error()
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'resume.pdf'; a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(`${API_BASE}/api/resume?download=true`, '_blank')
    } finally {
      setDlLoading(false)
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', borderRadius: '8px', overflow: 'hidden',
        border: `1px solid ${hovered ? 'rgba(0,229,255,0.45)' : 'rgba(0,229,255,0.2)'}`,
        boxShadow: hovered ? '0 0 18px rgba(0,229,255,0.08)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* View in browser */}
      <button onClick={handleView} style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '8px 15px',
        background: hovered ? 'rgba(0,229,255,0.09)' : 'rgba(0,229,255,0.04)',
        border: 'none', borderRight: '1px solid rgba(0,229,255,0.12)',
        color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
        cursor: 'pointer', transition: 'background 0.2s', letterSpacing: '0.02em',
      }}>
        {/* PDF file icon */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
        resume.pdf
      </button>
      {/* Download arrow */}
      <button onClick={handleDownload} disabled={dlLoading} title="Download PDF" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px 12px',
        background: hovered ? 'rgba(0,229,255,0.09)' : 'rgba(0,229,255,0.04)',
        border: 'none',
        color: 'var(--cyan)', cursor: dlLoading ? 'wait' : 'pointer',
        transition: 'background 0.2s', opacity: dlLoading ? 0.5 : 1,
      }}>
        {dlLoading
          ? <span style={{ fontSize: '0.7rem', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>↻</span>
          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
        }
      </button>
    </div>
  )
}

function ResumeUploadZone({ onUploaded }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(null) // null | 'ok' | 'err'
  const [msg, setMsg] = useState('')
  const inputRef = useRef(null)

  const upload = async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatus('err'); setMsg('PDF only'); return
    }
    setUploading(true); setStatus(null); setMsg('')
    try {
      await uploadResume(file)
      setStatus('ok'); setMsg('uploaded')
      if (onUploaded) onUploaded()
      // reset success state after 3s so button is re-clickable
      setTimeout(() => setStatus(null), 3000)
    } catch (e) {
      setStatus('err'); setMsg(e.message || 'failed')
    } finally {
      setUploading(false)
    }
  }

  const borderColor = dragOver
    ? 'var(--cyan)'
    : status === 'ok'  ? 'rgba(0,255,135,0.7)'
    : status === 'err' ? 'rgba(255,80,80,0.6)'
    : 'rgba(0,229,255,0.5)'

  const bg = dragOver
    ? 'rgba(0,229,255,0.12)'
    : status === 'ok'  ? 'rgba(0,255,135,0.1)'
    : status === 'err' ? 'rgba(255,80,80,0.08)'
    : 'rgba(0,229,255,0.07)'

  const textColor = status === 'ok'
    ? 'var(--green)'
    : status === 'err' ? 'rgba(255,110,110,0.95)'
    : dragOver ? 'var(--cyan)' : 'rgba(0,229,255,0.85)'

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files?.[0]) }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 16px',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          background: bg,
          color: textColor,
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          letterSpacing: '0.02em',
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'all 0.18s ease',
          userSelect: 'none',
          boxShadow: dragOver
            ? '0 0 16px rgba(0,229,255,0.15)'
            : status === 'ok' ? '0 0 12px rgba(0,255,135,0.1)' : 'none',
        }}
        onMouseEnter={e => {
          if (!status && !dragOver) {
            e.currentTarget.style.borderColor = 'var(--cyan)'
            e.currentTarget.style.background = 'rgba(0,229,255,0.1)'
            e.currentTarget.style.color = 'var(--cyan)'
            e.currentTarget.style.boxShadow = '0 0 14px rgba(0,229,255,0.12)'
          }
        }}
        onMouseLeave={e => {
          if (!status && !dragOver) {
            e.currentTarget.style.borderColor = 'rgba(0,229,255,0.5)'
            e.currentTarget.style.background = 'rgba(0,229,255,0.07)'
            e.currentTarget.style.color = 'rgba(0,229,255,0.85)'
            e.currentTarget.style.boxShadow = 'none'
          }
        }}
      >
        {uploading ? (
          <>
            <span style={{ animation: 'spin 0.7s linear infinite', display: 'inline-block', fontSize: '0.85rem' }}>↻</span>
            uploading...
          </>
        ) : status === 'ok' ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {msg}
          </>
        ) : status === 'err' ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {msg}
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            upload resume
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={e => upload(e.target.files?.[0])}
      />
    </div>
  )
}

function AvailableBadge() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      background: 'rgba(0,255,135,0.06)',
      border: '1px solid rgba(0,255,135,0.25)',
      padding: '6px 13px', borderRadius: '20px',
      fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--green)',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: 'var(--green)',
        boxShadow: '0 0 8px var(--green)',
        animation: 'glow-pulse 2s infinite',
        flexShrink: 0,
      }} />
      open to work
    </div>
  )
}

// ─── Main Hero ────────────────────────────────────────────────────────────────
export default function Hero() {
  const { isEditMode } = useAuth()
  const [profile, setProfile] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [resumeExists, setResumeExists] = useState(false)

  const checkResume = () =>
    checkResume_api().then(setResumeExists)

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile({
      name: 'Vishnu', tagline: 'Full Stack Developer',
      bio: 'I build things for the web.', location: 'Chennai, India', available: true
    }))
    checkResume()
  }, [])

  const handleSave = async (values) => {
    // Only send keys that belong to dev mode — never overwrite author_bio, author_tagline etc.
    const patch = Object.fromEntries(DEV_PROFILE_KEYS.map(k => [k, values[k]]))
    await updateProfile(patch)
    setProfile(p => ({ ...p, ...patch }))
  }

  const termLines = profile ? [
    `whoami → ${profile.name || 'dev'}`,
    `role   → ${profile.tagline || 'Developer'}`,
    `loc    → ${profile.location || 'Earth'}`,
    `status → ${profile.available ? 'open_to_work=true' : 'not_looking'}`,
    `stack  → [go, react, linux, docker, ...]`,
  ] : []

  if (!profile) return (
    <section id="hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontSize: '0.85rem' }}>
        <span>█</span> initializing...
      </div>
    </section>
  )

  return (
    <section id="hero" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      position: 'relative', overflow: 'hidden',
      padding: '120px 40px 80px',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: '35%', left: '55%', transform: 'translate(-50%,-50%)',
        width: '700px', height: '700px',
        background: 'radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div style={{ animation: 'fadeInUp 0.8s ease' }}>

            {/* Section prefix */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
              color: 'var(--cyan)', marginBottom: '20px', letterSpacing: '0.15em',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ width: 28, height: 1, background: 'var(--cyan)', opacity: 0.6, display: 'inline-block' }} />
              <span style={{ opacity: 0.6 }}>HELLO, WORLD</span>
            </div>

            {/* Name */}
            <h1 style={{
              fontSize: 'clamp(2.6rem, 5vw, 4.2rem)', fontWeight: 700,
              lineHeight: 1.08, marginBottom: '14px',
              fontFamily: 'var(--font-sans)', letterSpacing: '-0.025em',
            }}>
              I'm{' '}
              <span style={{ color: 'var(--cyan)', textShadow: '0 0 40px rgba(0,229,255,0.35)' }}>
                {profile.name || 'Vishnu'}
              </span>
            </h1>

            {/* Tagline */}
            <div style={{
              fontSize: 'clamp(0.9rem, 1.8vw, 1.15rem)', color: 'var(--text-muted)',
              marginBottom: '24px', fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ color: 'var(--cyan)', opacity: 0.5 }}>$</span>
              <span style={{ color: 'var(--text-secondary)' }}>{profile.tagline || 'Full Stack Developer'}</span>
              <span style={{ width: 2, height: '1.1em', background: 'var(--cyan)', opacity: 0.7, animation: 'blink 1.1s step-end infinite', flexShrink: 0 }} />
            </div>

            {/* Bio */}
            {(profile.dev_bio || profile.bio) && (
              <p style={{
                color: 'var(--text-muted)', lineHeight: 1.75,
                maxWidth: '460px', marginBottom: '32px', fontSize: '0.9rem',
                fontFamily: 'var(--font-sans)',
              }}>
                {profile.dev_bio || profile.bio}
              </p>
            )}

            {/* Status row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '28px', alignItems: 'center' }}>
              {profile.available && <AvailableBadge />}
              {profile.location && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {profile.location}
                </span>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {profile.email}
                </a>
              )}
            </div>

            {/* ── Social links ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '16px' }}>
              {['github_url', 'linkedin_url', 'twitter_url', 'website_url'].map(key => (
                <SocialPill key={key} url={profile[key]} type={key} />
              ))}
            </div>

            {/* ── Resume ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px', flexWrap: 'wrap' }}>
              {resumeExists && <ResumeDownloadButton />}
              {isEditMode && (
                <ResumeUploadZone onUploaded={() => { setTimeout(checkResume, 200) }} />
              )}
              {!resumeExists && !isEditMode && null}
            </div>

            {/* Edit profile button (edit mode only) */}
            {isEditMode && (
              <button onClick={() => setShowEdit(true)} style={{
                marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                background: 'transparent', border: '1px dashed rgba(0,229,255,0.3)',
                color: 'var(--text-muted)', padding: '6px 14px', borderRadius: '6px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.color = 'var(--cyan)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >✎ edit profile</button>
            )}
          </div>

          {/* ── Right column: terminal card ─────────────────────────────── */}
          <div style={{ animation: 'fadeInUp 0.8s ease 0.15s both' }}>
            <div style={{
              background: '#06090f',
              border: '1px solid rgba(0,229,255,0.12)',
              borderRadius: '12px', overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,255,0.04), inset 0 1px 0 rgba(0,229,255,0.06)',
            }}>
              {/* Terminal title bar */}
              <div style={{
                background: '#0d1117', padding: '11px 16px',
                display: 'flex', alignItems: 'center', gap: '8px',
                borderBottom: '1px solid rgba(0,229,255,0.07)',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem' }}>
                  zsh — {(profile.name || 'vishnu').toLowerCase()}@portfolio
                </span>
              </div>

              {/* Terminal body */}
              <div style={{ padding: '24px', minHeight: '200px' }}>
                {termLines.length > 0 && <TerminalTyper lines={termLines} speed={40} />}
              </div>

              {/* Terminal footer — live stat strip */}
              <div style={{
                borderTop: '1px solid rgba(0,229,255,0.06)',
                padding: '10px 18px',
                display: 'flex', gap: 20, alignItems: 'center',
                background: 'rgba(0,229,255,0.015)',
              }}>
                <StatPip label="status" value={profile.available ? 'open' : 'closed'} color={profile.available ? 'var(--green)' : '#6b7280'} />
                <StatPip label="loc" value={profile.location || '—'} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {showEdit && profile && (
        <EditModal
          key={showEdit ? 'open' : 'closed'}
          title="edit profile"
          fields={PROFILE_FIELDS}
          initialValues={profile}
          onSave={handleSave}
          onClose={() => setShowEdit(false)}
        />
      )}
    </section>
  )
}

function StatPip({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {color && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: color !== '#6b7280' ? `0 0 5px ${color}` : 'none' }} />}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)' }}>{label}:</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: color || 'rgba(255,255,255,0.4)' }}>{value}</span>
    </div>
  )
}