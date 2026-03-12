import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { setToken, clearToken } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin]       = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [adminName, setAdminName]   = useState('')

  // Restore session from localStorage on mount
  // Also restore the in-memory API token so admin requests work after a page refresh
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const name  = localStorage.getItem('admin_name')
    if (token) {
      setToken(token)          // restore in-memory token for api.js
      setIsAdmin(true)
      setAdminName(name || '')
    }
  }, [])

  const login = useCallback((token, name) => {
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_name', name || '')
    setIsAdmin(true)
    setAdminName(name || '')
    setIsEditMode(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_name')
    clearToken()               // clear in-memory token
    setIsAdmin(false)
    setIsEditMode(false)
    setAdminName('')
  }, [])

  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => {
      const next = !prev
      if (next) window.scrollTo({ top: 0, behavior: 'smooth' })
      return next
    })
  }, [])

  // Memoize the context value so consumers only re-render when these values actually change,
  // not on every AuthProvider render
  const value = useMemo(() => ({
    isAdmin,
    isEditMode,
    adminName,
    login,
    logout,
    toggleEditMode,
  }), [isAdmin, isEditMode, adminName, login, logout, toggleEditMode])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}