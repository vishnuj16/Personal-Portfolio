import { useState, useEffect, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getProfile } from './api'
import Navbar from './components/Navbar'
import AdminBanner from './components/AdminBanner'
import Hero from './components/Hero'
import Projects from './components/Projects'
import Skills from './components/Skills'
import Experience from './components/Experience'
import Education from './components/Education'
import Footer from './components/Footer'
import CursorGlow from './components/CursorGlow'
import AuthorPage from './components/AuthorPage'

// ── URL helpers ───────────────────────────────────────────────────────────────
// Parse the current path into { mode, bookSlug }
function parsePath() {
  const path = window.location.pathname
  // /book/:slug  → author mode, open that book
  const bookMatch = path.match(/^\/book\/([^/]+)$/)
  if (bookMatch) return { mode: 'author', bookSlug: bookMatch[1] }
  // /author      → author mode, no specific book
  if (path.startsWith('/author')) return { mode: 'author', bookSlug: null }
  // anything else → respect localStorage or default to dev
  return { mode: localStorage.getItem('site_mode') || 'dev', bookSlug: null }
}

function PortfolioApp() {
  const { isAdmin, isEditMode } = useAuth()
  const [profile, setProfile] = useState(null)

  // Initialise mode and deep-link from URL
  const [mode,        setMode]        = useState(() => parsePath().mode)
  const [initialSlug, setInitialSlug] = useState(() => parsePath().bookSlug)

  const adminOffset = isAdmin ? 37 : 0

  const handleModeChange = useCallback((m) => {
    setMode(m)
    localStorage.setItem('site_mode', m)
    // Push a clean URL when switching modes
    const url = m === 'author' ? '/author' : '/'
    window.history.pushState({ mode: m }, '', url)
  }, [])

  useEffect(() => {
    getProfile().then(setProfile).catch(() => {})
  }, [])

  // Handle browser back/forward
  useEffect(() => {
    const onPop = () => {
      const { mode: m, bookSlug } = parsePath()
      setMode(m)
      setInitialSlug(bookSlug)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (mode === 'author') {
    return (
      <AuthorPage
        onModeChange={handleModeChange}
        initialBookSlug={initialSlug}
        onNavigate={(path) => window.history.pushState({}, '', path)}
      />
    )
  }

  return (
    <div className={isEditMode ? 'edit-mode-active' : ''}>
      <CursorGlow />
      <AdminBanner />
      <Navbar adminOffset={adminOffset} currentMode={mode} onModeChange={handleModeChange} />
      <main style={{ paddingTop: isAdmin ? '37px' : '0' }}>
        <Hero />
        <Projects />
        <Skills />
        <Experience />
        <Education />
        <Footer profile={profile} />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <PortfolioApp />
    </AuthProvider>
  )
}