import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import client from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch current session from the server.
  const refresh = useCallback(async () => {
    try {
      const res = await client.get('/auth/me')
      setUser(res.data ?? null)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  // Listen for 401 responses dispatched by the API client interceptor.
  useEffect(() => {
    const handler = () => setUser(null)
    window.addEventListener('unauthorized', handler)
    return () => window.removeEventListener('unauthorized', handler)
  }, [])

  async function login(username, password) {
    const res = await client.post('/auth/login', { identifier: username, password })
    setUser(res.data)
    return res.data
  }

  async function logout() {
    await client.post('/auth/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
