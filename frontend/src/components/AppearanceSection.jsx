import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  Accordion, AccordionSummary, AccordionDetails,
  Box, Typography, FormControlLabel, Switch, Alert,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import client from '../api/client.js'
import AppearanceEditor from './AppearanceEditor.jsx'
import { useThemeMode } from '../context/ThemeModeContext.jsx'

const DEFAULT_THEME = {
  accent_h: 150, accent_s: 20, accent_l: 63,
  bg_h: 35, bg_s: 60, bg_l: 97,
  dark_accent_h: 150, dark_accent_s: 30, dark_accent_l: 55,
  dark_bg_h: 220, dark_bg_s: 15, dark_bg_l: 12,
  text_h: 220, text_s: 15, text_l: 20,
  heading_h: 220, heading_s: 20, heading_l: 10,
  dark_text_h: 220, dark_text_s: 15, dark_text_l: 85,
  dark_heading_h: 220, dark_heading_s: 10, dark_heading_l: 92,
  font_body: 'Playfair Display',
  font_display: 'Playfair Display',
  font_ui: 'Inter',
  font_size: 16,
  nav_font_size: 13,
}

/**
 * Self-contained collapsible appearance section for per-page custom themes.
 *
 * Props:
 *   contentType   — 'albums' | 'blog' | 'recipes' | 'projects' | 'custom-pages'
 *   contentId     — number (the item's ID)
 *   initialEnabled — bool
 *   initialTheme  — object (the stored theme values, or null/empty)
 */
export default function AppearanceSection({ contentType, contentId, initialEnabled, initialTheme }) {
  const { setMode } = useThemeMode()

  const [enabled, setEnabled] = useState(Boolean(initialEnabled))
  const [theme, setTheme] = useState(() => ({ ...DEFAULT_THEME, ...(initialTheme || {}) }))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  // Track whether the initial mount has completed so we don't auto-save on mount.
  // We use a ref so the auto-save effect can read it synchronously.
  const initialised = useRef(false)
  const autoSaveTimer = useRef(null)

  const doSave = useCallback(async (en, th) => {
    setError(null)
    try {
      await client.patch(`/dashboard/${contentType}/${contentId}/theme`, {
        enabled: en,
        theme: th,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save appearance.')
    }
  }, [contentType, contentId])

  // Auto-save 800ms after any change to enabled or theme.
  // The first effect run (on mount) is skipped using the initialised ref.
  // The ref is set in a layout effect so it is guaranteed to be false during
  // the first run of this effect and true for all subsequent runs.
  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true
      return
    }
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      doSave(enabled, theme)
    }, 800)
    return () => clearTimeout(autoSaveTimer.current)
  }, [enabled, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleEnableChange(e) {
    setEnabled(e.target.checked)
  }

  function handleThemeChange(key, value) {
    setTheme((t) => ({ ...t, [key]: value }))
  }

  function handleTabChange(tabIndex) {
    setMode(tabIndex === 1 ? 'dark' : 'light')
  }

  return (
    <Accordion variant="outlined" sx={{ mt: 3 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>Custom appearance</Typography>
          {saved && (
            <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>
              Saved
            </Typography>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={handleEnableChange}
            />
          }
          label={
            <Typography variant="body2">
              {enabled ? 'Custom theme enabled' : 'Use profile theme'}
            </Typography>
          }
          sx={{ mb: 2 }}
        />

        {enabled && (
          <AppearanceEditor
            theme={theme}
            onChange={handleThemeChange}
            onTabChange={handleTabChange}
          />
        )}
      </AccordionDetails>
    </Accordion>
  )
}
