import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin]       = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [adminName, setAdminName]   = useState('')

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const name  = localStorage.getItem('admin_name')
    if (token) {
      setIsAdmin(true)
      setAdminName(name || '')
    }
  }, [])

  // Called by LoginModal after a successful passkey verify
  const login = (token, name) => {
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_name', name || '')
    setIsAdmin(true)
    setAdminName(name || '')
    setIsEditMode(true)   // go straight into edit mode on login
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_name')
    setIsAdmin(false)
    setIsEditMode(false)
    setAdminName('')
  }

  const toggleEditMode = () => setIsEditMode(prev => {
    const next = !prev
    if (next) window.scrollTo({ top: 0, behavior: 'smooth' })
    return next
  })

  return (
    <AuthContext.Provider value={{ isAdmin, isEditMode, adminName, login, logout, toggleEditMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}