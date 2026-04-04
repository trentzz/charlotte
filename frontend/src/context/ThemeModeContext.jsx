import React, { createContext, useContext, useState, useCallback } from 'react'

const STORAGE_KEY = 'charlotte_theme_mode'

const ThemeModeContext = createContext(null)

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  })

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) throw new Error('useThemeMode must be used inside ThemeModeProvider')
  return ctx
}
