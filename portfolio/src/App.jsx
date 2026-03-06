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

function PortfolioApp() {
  const { isAdmin, isEditMode } = useAuth()
  const [profile, setProfile] = useState(null)
  const adminBarHeight = isAdmin ? 37 : 0

  useEffect(() => {
    getProfile().then(setProfile).catch(() => {})
  }, [])

  return (
    <div className={isEditMode ? 'edit-mode-active' : ''}>
      <CursorGlow />
      <AdminBanner />
      <Navbar adminOffset={`${adminBarHeight}px`} />

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
