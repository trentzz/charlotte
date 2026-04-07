import React, { createContext, useContext, useState, useCallback } from 'react'

const STORAGE_KEY = 'charlotte_theme_mode'

const ThemeModeContext = createContext(null)

export function ThemeModeProvider({ children, defaultMode = 'light' }) {
  const [mode, setMode] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    return defaultMode
  })

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  // Update the in-memory mode without writing to localStorage.
  // Used by per-page appearance previews in the dashboard.
  const setModeInMemory = useCallback((m) => {
    if (m === 'light' || m === 'dark') setMode(m)
  }, [])

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode, setMode: setModeInMemory }}>
      {children}
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) throw new Error('useThemeMode must be used inside ThemeModeProvider')
  return ctx
}
