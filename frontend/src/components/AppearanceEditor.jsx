import React, { useState, useRef } from 'react'
import {
  Box, Typography, Slider, Divider, Stack, Tabs, Tab, TextField, useTheme,
} from '@mui/material'
import { HslColorPicker } from 'react-colorful'

// ── Font lists per role ────────────────────────────────────────────────────────

const DISPLAY_FONTS = ['Playfair Display', 'DM Serif Display', 'EB Garamond', 'Cormorant Garamond', 'Libre Baskerville']
const BODY_FONTS = ['Playfair Display', 'EB Garamond', 'Cormorant Garamond', 'Libre Baskerville', 'Inter', 'Lato', 'Source Sans 3']
const UI_FONTS = ['Inter', 'Lato', 'Source Sans 3', 'Nunito', 'Open Sans', 'Roboto']

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// Pre-inject all known fonts.
;[...DISPLAY_FONTS, ...BODY_FONTS, ...UI_FONTS].forEach(injectGoogleFont)

// ── Colour picker ──────────────────────────────────────────────────────────────

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

// ── Slider row ─────────────────────────────────────────────────────────────────

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

// ── Font card ──────────────────────────────────────────────────────────────────

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

// ── Font card picker ───────────────────────────────────────────────────────────

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
        {/* "Other" card */}
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

// ── AppearanceEditor ───────────────────────────────────────────────────────────

/**
 * Controlled appearance editor. Renders colour pickers (tabbed light/dark),
 * font pickers, and size sliders. Does not include the profile-only
 * "Default mode for visitors" toggle.
 *
 * Props:
 *   theme     — object with all theme fields
 *   onChange  — called as onChange(key, value) on any field change
 *   onTabChange — called as onTabChange(tabIndex) when light/dark tab changes
 */
export default function AppearanceEditor({ theme: t, onChange, onTabChange }) {
  const [colourTab, setColourTab] = useState(0)

  function handleTabChange(_, v) {
    setColourTab(v)
    if (onTabChange) onTabChange(v)
  }

  function set(key, val) {
    onChange(key, val)
  }

  return (
    <Box>
      {/* Colour pickers — tabbed by mode */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Colours
      </Typography>
      <Tabs
        value={colourTab}
        onChange={handleTabChange}
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
            h={t.accent_h}
            s={t.accent_s}
            l={t.accent_l}
            onChange={({ h, s, l }) => { set('accent_h', h); set('accent_s', s); set('accent_l', l) }}
          />
          <ColourPickerBlock
            label="Background colour"
            h={t.bg_h}
            s={t.bg_s}
            l={t.bg_l}
            onChange={({ h, s, l }) => { set('bg_h', h); set('bg_s', s); set('bg_l', l) }}
          />
          <ColourPickerBlock
            label="Body text colour"
            h={t.text_h}
            s={t.text_s}
            l={t.text_l}
            onChange={({ h, s, l }) => { set('text_h', h); set('text_s', s); set('text_l', l) }}
          />
          <ColourPickerBlock
            label="Heading text colour"
            h={t.heading_h}
            s={t.heading_s}
            l={t.heading_l}
            onChange={({ h, s, l }) => { set('heading_h', h); set('heading_s', s); set('heading_l', l) }}
          />
        </Box>
      )}

      {colourTab === 1 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, mb: 3 }}>
          <ColourPickerBlock
            label="Dark accent colour"
            h={t.dark_accent_h}
            s={t.dark_accent_s}
            l={t.dark_accent_l}
            onChange={({ h, s, l }) => { set('dark_accent_h', h); set('dark_accent_s', s); set('dark_accent_l', l) }}
          />
          <ColourPickerBlock
            label="Dark background colour"
            h={t.dark_bg_h}
            s={t.dark_bg_s}
            l={t.dark_bg_l}
            onChange={({ h, s, l }) => { set('dark_bg_h', h); set('dark_bg_s', s); set('dark_bg_l', l) }}
          />
          <ColourPickerBlock
            label="Dark body text colour"
            h={t.dark_text_h}
            s={t.dark_text_s}
            l={t.dark_text_l}
            onChange={({ h, s, l }) => { set('dark_text_h', h); set('dark_text_s', s); set('dark_text_l', l) }}
          />
          <ColourPickerBlock
            label="Dark heading text colour"
            h={t.dark_heading_h}
            s={t.dark_heading_s}
            l={t.dark_heading_l}
            onChange={({ h, s, l }) => { set('dark_heading_h', h); set('dark_heading_s', s); set('dark_heading_l', l) }}
          />
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Font pickers */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Fonts
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Display font: headings and nav labels. Body font: reading content. UI font: menus, buttons, and interface elements (best kept as a sans-serif).
      </Typography>

      <FontCardPicker
        label="Display font"
        fonts={DISPLAY_FONTS}
        value={t.font_display}
        onChange={(v) => set('font_display', v)}
      />

      <FontCardPicker
        label="Body font"
        fonts={BODY_FONTS}
        value={t.font_body}
        onChange={(v) => set('font_body', v)}
      />

      <FontCardPicker
        label="UI font"
        fonts={UI_FONTS}
        value={t.font_ui}
        onChange={(v) => set('font_ui', v)}
      />

      <Divider sx={{ mb: 3 }} />

      {/* Sizes */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Sizes
      </Typography>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <SliderRow
          label="Base font size"
          value={t.font_size}
          onChange={(v) => set('font_size', v)}
          min={12}
          max={22}
        />
        <SliderRow
          label="Nav label size"
          value={t.nav_font_size}
          onChange={(v) => set('nav_font_size', v)}
          min={10}
          max={20}
        />
      </Stack>
    </Box>
  )
}
