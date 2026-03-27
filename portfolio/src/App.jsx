import { useState, useEffect, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getProfile } from './api'
import Navbar from './components/Navbar'
import AdminBanner from './components/AdminBanner'
import Hero from './components/Hero'
import Projects from './components/Projects'
import ProjectPage from './components/ProjectPage'
import Skills from './components/Skills'
import Experience from './components/Experience'
import Education from './components/Education'
import Footer from './components/Footer'
import CursorGlow from './components/CursorGlow'
import AuthorPage from './components/AuthorPage'

// ── URL routing ───────────────────────────────────────────────────────────────
// URL scheme:
//   /              → dev mode
//   /author        → author mode (book list)
//   /book/:slug    → author mode, open that specific book
//
// The mode is entirely URL-driven. localStorage is no longer the source of truth
// for mode — the URL is. Sharing /book/:slug always opens author mode + that book.

function parsePath() {
  const path = window.location.pathname

  // /book/:slug → author mode, open that book
  const bookMatch = path.match(/^\/book\/([^/]+)\/?$/)
  if (bookMatch) return { mode: 'author', bookSlug: bookMatch[1] }

  // /author → author mode, no specific book
  if (path === '/author' || path.startsWith('/author/')) return { mode: 'author', bookSlug: null }

  // everything else → dev mode
  return { mode: 'dev', bookSlug: null }
}

function PortfolioApp() {
  const { isAdmin, isEditMode } = useAuth()
  const [profile, setProfile]               = useState(null)
  const [viewingProject, setViewingProject] = useState(null)

  const initial = parsePath()
  const [mode,        setMode]        = useState(initial.mode)
  const [initialSlug, setInitialSlug] = useState(initial.bookSlug)

  const adminOffset = isAdmin ? 37 : 0

  useEffect(() => {
    getProfile().then(setProfile).catch(() => {})
    // Reload when window regains focus (catches edits made in Hero)
    const onFocus = () => getProfile().then(setProfile).catch(() => {})
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Sync state when browser navigates (back/forward)
  useEffect(() => {
    const onPop = () => {
      const { mode: m, bookSlug } = parsePath()
      setMode(m)
      setInitialSlug(bookSlug)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Called by navbar / mode selector to switch modes
  const handleModeChange = useCallback((m) => {
    const url = m === 'author' ? '/author' : '/'
    window.history.pushState({ mode: m }, '', url)
    setMode(m)
    setInitialSlug(null)
  }, [])

  // Called by AuthorPage when navigating to a book or back
  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path)
    // If navigating back to /author, clear the slug so a re-mount won't re-open the book
    if (path === '/author') setInitialSlug(null)
  }, [])

  if (viewingProject) {
    return (
      <ProjectPage
        project={viewingProject}
        onBack={() => { setViewingProject(null); window.scrollTo(0, 0) }}
        onEdit={() => { setViewingProject(null) }}
      />
    )
  }

  if (mode === 'author') {
    return (
      <AuthorPage
        onModeChange={handleModeChange}
        initialBookSlug={initialSlug}
        onNavigate={handleNavigate}
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
        <Projects onViewProject={setViewingProject} />
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