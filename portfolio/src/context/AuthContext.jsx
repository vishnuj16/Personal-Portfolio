import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { verifyPasskey, setToken, clearToken } from '../api'

const COOKIE_NAME = 'portfolio_admin_token'
const COOKIE_EXPIRY_NAME = 'portfolio_admin_expiry'

const setCookie = (name, value, seconds) => {
  const expires = new Date(Date.now() + seconds * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`
}

const getCookie = (name) => {
  const match = document.cookie.split('; ').find(row => row.startsWith(name + '='))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
}

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  // Restore session from cookie on mount
  useEffect(() => {
    const token = getCookie(COOKIE_NAME)
    const expiry = getCookie(COOKIE_EXPIRY_NAME)
    if (token && expiry && Date.now() < Number(expiry)) {
      setToken(token)
      setIsAdmin(true)
      setAdminName('Vishnu')
      setIsEditMode(true)
    } else {
      deleteCookie(COOKIE_NAME)
      deleteCookie(COOKIE_EXPIRY_NAME)
    }
  }, [])

  const login = useCallback(async (passkey) => {
    const data = await verifyPasskey(passkey)
    setToken(data.token)
    setIsAdmin(true)
    setAdminName('Vishnu')
    setIsEditMode(true)
    const ttl = (data.expires_in || 86400) - 60
    setCookie(COOKIE_NAME, data.token, ttl)
    setCookie(COOKIE_EXPIRY_NAME, String(Date.now() + ttl * 1000), ttl)
    return data
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setIsAdmin(false)
    setAdminName('')
    setIsEditMode(false)
    setModalOpen(false)
    deleteCookie(COOKIE_NAME)
    deleteCookie(COOKIE_EXPIRY_NAME)
  }, [])

  return (
    <AuthContext.Provider value={{
      isAdmin, adminName,
      isEditMode, setIsEditMode,
      modalOpen, setModalOpen,
      login, logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
