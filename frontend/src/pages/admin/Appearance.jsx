import React, { useEffect, useState, useRef } from 'react'
import {
  Box, Typography, Slider, Alert, CircularProgress,
  Divider, Stack, Tabs, Tab, TextField, useTheme,
} from '@mui/material'
import { HslColorPicker } from 'react-colorful'
import client from '../../api/client.js'

// Font lists per role.
const DISPLAY_FONTS = ['Playfair Display', 'DM Serif Display', 'EB Garamond', 'Cormorant Garamond', 'Libre Baskerville']
const BODY_FONTS = ['Playfair Display', 'EB Garamond', 'Cormorant Garamond', 'Libre Baskerville', 'Inter', 'Lato', 'Source Sans 3']
const UI_FONTS = ['Inter', 'Lato', 'Source Sans 3', 'Nunito', 'Open Sans', 'Roboto']

// Default site theme matching server-side DefaultSiteTheme values.
const DEFAULT_SITE_THEME = {
  accent_h: 340, accent_s: 50, accent_l: 35,
  bg_h: 38, bg_s: 30, bg_l: 97,
  text_h: 220, text_s: 20, text_l: 15,
  heading_h: 220, heading_s: 25, heading_l: 10,
  dark_accent_h: 36, dark_accent_s: 70, dark_accent_l: 58,
  dark_bg_h: 222, dark_bg_s: 22, dark_bg_l: 11,
  dark_text_h: 36, dark_text_s: 15, dark_text_l: 88,
  dark_heading_h: 36, dark_heading_s: 20, dark_heading_l: 95,
  font_body: 'Playfair Display',
  font_display: 'Playfair Display',
  font_ui: 'Inter',
  font_size: 16,
  nav_font_size: 13,
}

function hslStr(h, s, l) {
  return `hsl(${h}, ${s}%, ${l}%)`
}

// Inject a Google Fonts <link> for a font name if not already present.
function injectGoogleFont(fontName) {
  if (!fontName) return
  const id = `gfont-${fontName.replace(/\s+/g, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}&display=swap`
  document.head.appendChild(link)
}

;[...DISPLAY_FONTS, ...BODY_FONTS, ...UI_FONTS].forEach(injectGoogleFont)

function ColourPickerBlock({ label, h, s, l, onChange }) {
  const colour = { h, s, l }

  function handleChange(c) {
    onChange({
      h: Math.round(c.h),
      s: Math.round(c.s),
      l: Math.round(c.l),
    })
  }

  const css = hslStr(h, s, l)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle2" fontWeight={600}>{label}</Typography>
      <HslColorPicker color={colour} onChange={handleChange} style={{ width: '100%' }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1.5,
            bgcolor: css,
            border: '1px solid rgba(0,0,0,0.12)',
            flexShrink: 0,
          }}
        />
        <Typography variant="caption" color="text.secondary">{css}</Typography>
      </Box>
    </Box>
  )
}

function SliderRow({ label, value, onChange, min, max }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2" gutterBottom>{label}</Typography>
        <Typography variant="body2" color="text.secondary">{value}px</Typography>
      </Box>
      <Slider
        value={value}
        onChange={(_, v) => onChange(v)}
        min={min}
        max={max}
        step={1}
        size="small"
      />
    </Box>
  )
}

function FontCard({ fontName, selected, onSelect, accentColor }) {
  return (
    <Box
      onClick={() => onSelect(fontName)}
      sx={{
        border: selected ? `2px solid ${accentColor}` : '2px solid rgba(0,0,0,0.12)',
        borderRadius: 2,
        p: 1.5,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        userSelect: 'none',
        transition: 'border-color 0.15s',
        '&:hover': {
          borderColor: selected ? accentColor : 'rgba(0,0,0,0.3)',
        },
      }}
    >
      <Typography
        sx={{
          fontFamily: `'${fontName}', Georgia, serif`,
          fontSize: 28,
          lineHeight: 1,
          color: 'text.primary',
        }}
      >
        Aa
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: 11 }}>
        {fontName}
      </Typography>
    </Box>
  )
}

function FontCardPicker({ label, fonts, value, onChange }) {
  const theme = useTheme()
  const accentColor = theme.palette.primary.main

  const isKnown = fonts.includes(value)
  const [otherSelected, setOtherSelected] = useState(!isKnown)
  const [otherValue, setOtherValue] = useState(isKnown ? '' : value)
  const [otherPreviewFont, setOtherPreviewFont] = useState(isKnown ? '' : value)
  const debounceRef = useRef(null)

  function handleKnownSelect(font) {
    setOtherSelected(false)
    onChange(font)
  }

  function handleOtherSelect() {
    setOtherSelected(true)
    if (otherValue) onChange(otherValue)
  }

  function handleOtherType(e) {
    const val = e.target.value
    setOtherValue(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (val.trim()) {
        injectGoogleFont(val.trim())
        setOtherPreviewFont(val.trim())
        onChange(val.trim())
      }
    }, 500)
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>{label}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
        {fonts.map((f) => (
          <FontCard
            key={f}
            fontName={f}
            selected={!otherSelected && value === f}
            onSelect={handleKnownSelect}
            accentColor={accentColor}
          />
        ))}
        <Box
          onClick={handleOtherSelect}
          sx={{
            border: otherSelected ? `2px solid ${accentColor}` : '2px solid rgba(0,0,0,0.12)',
            borderRadius: 2,
            p: 1.5,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            userSelect: 'none',
            transition: 'border-color 0.15s',
            '&:hover': {
              borderColor: otherSelected ? accentColor : 'rgba(0,0,0,0.3)',
            },
          }}
        >
          <Typography
            sx={{
              fontFamily: otherPreviewFont ? `'${otherPreviewFont}', sans-serif` : 'sans-serif',
              fontSize: 28,
              lineHeight: 1,
              color: 'text.primary',
            }}
          >
            Aa
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: 11 }}>
            Other
          </Typography>
        </Box>
      </Box>
      {otherSelected && (
        <TextField
          size="small"
          label="Google Font name"
          value={otherValue}
          onChange={handleOtherType}
          placeholder="e.g. Josefin Sans"
          sx={{ mt: 1.5 }}
          fullWidth
        />
      )}
    </Box>
  )
}

export default function AdminAppearance() {
  const [theme, setTheme] = useState(DEFAULT_SITE_THEME)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [colourTab, setColourTab] = useState(0)
  const autoSaveTimer = useRef(null)
  const initialised = useRef(false)

  useEffect(() => {
    client.get('/admin/appearance')
      .then((res) => {
        setTheme((prev) => ({ ...prev, ...res.data }))
      })
      .catch(() => setError('Failed to load site appearance settings.'))
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
      await client.put('/admin/appearance', t)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.')
    }
  }

  function set(key, val) {
    setTheme((t) => ({ ...t, [key]: val }))
  }

  function handleAccentChange({ h, s, l }) {
    setTheme((t) => ({ ...t, accent_h: h, accent_s: s, accent_l: l }))
  }

  function handleBgChange({ h, s, l }) {
    setTheme((t) => ({ ...t, bg_h: h, bg_s: s, bg_l: l }))
  }

  function handleDarkAccentChange({ h, s, l }) {
    setTheme((t) => ({ ...t, dark_accent_h: h, dark_accent_s: s, dark_accent_l: l }))
  }

  function handleDarkBgChange({ h, s, l }) {
    setTheme((t) => ({ ...t, dark_bg_h: h, dark_bg_s: s, dark_bg_l: l }))
  }

  function handleTextChange({ h, s, l }) {
    setTheme((t) => ({ ...t, text_h: h, text_s: s, text_l: l }))
  }

  function handleHeadingChange({ h, s, l }) {
    setTheme((t) => ({ ...t, heading_h: h, heading_s: s, heading_l: l }))
  }

  function handleDarkTextChange({ h, s, l }) {
    setTheme((t) => ({ ...t, dark_text_h: h, dark_text_s: s, dark_text_l: l }))
  }

  function handleDarkHeadingChange({ h, s, l }) {
    setTheme((t) => ({ ...t, dark_heading_h: h, dark_heading_s: s, dark_heading_l: l }))
  }

  if (loading) return <CircularProgress />

  return (
    <Box maxWidth={700}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Site Appearance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        This theme applies to the landing page and is shared across all visitors.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Colours
      </Typography>
      <Tabs
        value={colourTab}
        onChange={(_, v) => setColourTab(v)}
        sx={{ mb: 2 }}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label="Light mode" />
        <Tab label="Dark mode" />
      </Tabs>

      {colourTab === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, mb: 3 }}>
          <ColourPickerBlock
            label="Accent colour"
            h={theme.accent_h}
            s={theme.accent_s}
            l={theme.accent_l}
            onChange={handleAccentChange}
          />
          <ColourPickerBlock
            label="Background colour"
            h={theme.bg_h}
            s={theme.bg_s}
            l={theme.bg_l}
            onChange={handleBgChange}
          />
          <ColourPickerBlock
            label="Body text colour"
            h={theme.text_h}
            s={theme.text_s}
            l={theme.text_l}
            onChange={handleTextChange}
          />
          <ColourPickerBlock
            label="Heading text colour"
            h={theme.heading_h}
            s={theme.heading_s}
            l={theme.heading_l}
            onChange={handleHeadingChange}
          />
        </Box>
      )}

      {colourTab === 1 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, mb: 3 }}>
          <ColourPickerBlock
            label="Dark accent colour"
            h={theme.dark_accent_h}
            s={theme.dark_accent_s}
            l={theme.dark_accent_l}
            onChange={handleDarkAccentChange}
          />
          <ColourPickerBlock
            label="Dark background colour"
            h={theme.dark_bg_h}
            s={theme.dark_bg_s}
            l={theme.dark_bg_l}
            onChange={handleDarkBgChange}
          />
          <ColourPickerBlock
            label="Dark body text colour"
            h={theme.dark_text_h}
            s={theme.dark_text_s}
            l={theme.dark_text_l}
            onChange={handleDarkTextChange}
          />
          <ColourPickerBlock
            label="Dark heading text colour"
            h={theme.dark_heading_h}
            s={theme.dark_heading_s}
            l={theme.dark_heading_l}
            onChange={handleDarkHeadingChange}
          />
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Fonts
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Display font: headings and nav labels. Body font: reading content. UI font: menus, buttons, and interface elements (best kept as a sans-serif).
      </Typography>

      <FontCardPicker
        label="Display font"
        fonts={DISPLAY_FONTS}
        value={theme.font_display}
        onChange={(v) => set('font_display', v)}
      />

      <FontCardPicker
        label="Body font"
        fonts={BODY_FONTS}
        value={theme.font_body}
        onChange={(v) => set('font_body', v)}
      />

      <FontCardPicker
        label="UI font"
        fonts={UI_FONTS}
        value={theme.font_ui}
        onChange={(v) => set('font_ui', v)}
      />

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Sizes
      </Typography>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <SliderRow
          label="Base font size"
          value={theme.font_size}
          onChange={(v) => set('font_size', v)}
          min={12}
          max={22}
        />
        <SliderRow
          label="Nav label size"
          value={theme.nav_font_size}
          onChange={(v) => set('nav_font_size', v)}
          min={10}
          max={20}
        />
      </Stack>
    </Box>
  )
}
