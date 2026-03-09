import { useState, useEffect } from 'react'
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

function PortfolioApp() {
  const [mode, setMode] = useState(() => localStorage.getItem('site_mode') || 'dev')
  const { isAdmin, isEditMode } = useAuth()
  const [profile, setProfile] = useState(null)

  // Must come BEFORE any early return — hooks cannot be conditional
  const adminOffset = isAdmin ? 37 : 0

  const handleModeChange = (m) => {
    setMode(m)
    localStorage.setItem('site_mode', m)
  }

  useEffect(() => {
    getProfile().then(setProfile).catch(() => {})
  }, [])

  // Early return is fine here — all hooks are already called above
  if (mode === 'author') {
    return <AuthorPage onModeChange={handleModeChange} />
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