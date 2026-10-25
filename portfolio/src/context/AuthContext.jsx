import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { setToken, clearToken } from '../api'

const AuthContext = createContext(null)

// Seconds-since-epoch expiry from a JWT, or 0 if it can't be read
function tokenExpiry(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)).exp || 0
  } catch { return 0 }
}

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin]       = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [adminName, setAdminName]   = useState('')

  // Restore session from localStorage on mount — unless the token has expired.
  // Also restore the in-memory API token so admin requests work after a page refresh
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const name  = localStorage.getItem('admin_name')
    if (!token) return
    if (tokenExpiry(token) * 1000 <= Date.now()) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_name')
      return
    }
    setToken(token)          // restore in-memory token for api.js
    setIsAdmin(true)
    setAdminName(name || '')
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

  // End the session when the token expires, or when the API rejects it
  useEffect(() => {
    if (!isAdmin) return
    let fired = false   // several requests can fail at once; tell the admin only once
    const expired = () => {
      if (fired) return
      fired = true
      logout()
      window.alert('Your admin session has expired — please sign in again.')
    }
    window.addEventListener('auth:expired', expired)
    const exp = tokenExpiry(localStorage.getItem('admin_token') || '')
    const timer = exp ? setTimeout(expired, Math.max(0, exp * 1000 - Date.now())) : null
    return () => { window.removeEventListener('auth:expired', expired); clearTimeout(timer) }
  }, [isAdmin, logout])

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