import React, { useEffect, useState, useRef } from 'react'
import {
  Box, Typography, Alert, CircularProgress,
  Divider, ToggleButtonGroup, ToggleButton,
} from '@mui/material'
import client from '../../api/client.js'
import { useLiveTheme } from '../../context/LiveThemeContext.jsx'
import { useThemeMode } from '../../context/ThemeModeContext.jsx'
import AppearanceEditor from '../../components/AppearanceEditor.jsx'

const DEFAULT_THEME = {
  accent_h: 150,
  accent_s: 20,
  accent_l: 63,
  bg_h: 35,
  bg_s: 60,
  bg_l: 97,
  dark_accent_h: 150,
  dark_accent_s: 30,
  dark_accent_l: 55,
  dark_bg_h: 220,
  dark_bg_s: 15,
  dark_bg_l: 12,
  text_h: 220,
  text_s: 15,
  text_l: 20,
  heading_h: 220,
  heading_s: 20,
  heading_l: 10,
  dark_text_h: 220,
  dark_text_s: 15,
  dark_text_l: 85,
  dark_heading_h: 220,
  dark_heading_s: 10,
  dark_heading_l: 92,
  font_body: 'Playfair Display',
  font_display: 'Playfair Display',
  font_ui: 'Inter',
  font_size: 16,
  nav_font_size: 13,
  default_mode: 'light',
}

export default function Appearance() {
  const [theme, setTheme] = useState(DEFAULT_THEME)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { setLiveTheme } = useLiveTheme()
  const { setMode } = useThemeMode()
  const autoSaveTimer = useRef(null)
  // Track whether the initial load is done so we don't auto-save on mount.
  const initialised = useRef(false)

  useEffect(() => {
    client.get('/dashboard/appearance')
      .then((res) => {
        setTheme((prev) => ({ ...prev, ...res.data }))
      })
      .catch(() => setError('Failed to load appearance settings.'))
      .finally(() => {
        setLoading(false)
        initialised.current = true
      })
  }, [])

  // Auto-save 800ms after the last change.
  useEffect(() => {
    if (!initialised.current) return
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      doSave(theme)
    }, 800)
    return () => clearTimeout(autoSaveTimer.current)
  }, [theme])

  async function doSave(t) {
    setError(null)
    try {
      await client.put('/dashboard/appearance', t)
      setLiveTheme(t)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.')
    }
  }

  function set(key, val) {
    setTheme((t) => ({ ...t, [key]: val }))
  }

  if (loading) return <CircularProgress />

  return (
    <Box maxWidth={700}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Appearance
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Default mode for visitors — profile-only setting */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Default mode for visitors</Typography>
        <ToggleButtonGroup
          value={theme.default_mode || 'light'}
          exclusive
          onChange={(_, v) => v && set('default_mode', v)}
          size="small"
        >
          <ToggleButton value="light">Light</ToggleButton>
          <ToggleButton value="dark">Dark</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <AppearanceEditor
        theme={theme}
        onChange={(key, val) => set(key, val)}
        onTabChange={(tab) => setMode(tab === 1 ? 'dark' : 'light')}
      />
    </Box>
  )
}
