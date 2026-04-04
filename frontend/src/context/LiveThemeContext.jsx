import React, { createContext, useContext, useState } from 'react'

const LiveThemeContext = createContext(null)

export function LiveThemeProvider({ initialTheme, children }) {
  const [liveTheme, setLiveTheme] = useState(initialTheme)
  return (
    <LiveThemeContext.Provider value={{ liveTheme, setLiveTheme }}>
      {children}
    </LiveThemeContext.Provider>
  )
}

export function useLiveTheme() {
  return useContext(LiveThemeContext)
}
