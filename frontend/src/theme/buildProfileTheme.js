import { createTheme } from '@mui/material/styles'

// Convert HSL components to a hex colour string.
// MUI's colour manipulator works most reliably with hex values.
function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Build a MUI theme from a user's stored theme object.
 *
 * Expected shape:
 * {
 *   accent_h, accent_s, accent_l,
 *   bg_h, bg_s, bg_l,
 *   dark_accent_h, dark_accent_s, dark_accent_l,
 *   dark_bg_h, dark_bg_s, dark_bg_l,
 *   text_h, text_s, text_l,
 *   heading_h, heading_s, heading_l,
 *   dark_text_h, dark_text_s, dark_text_l,
 *   dark_heading_h, dark_heading_s, dark_heading_l,
 *   font_body, font_display, font_ui,
 *   font_size, nav_font_size
 * }
 *
 * @param {object} userTheme - stored theme values
 * @param {'light'|'dark'} mode - colour mode, defaults to 'light'
 */
export default function buildProfileTheme(userTheme, mode = 'light') {
  const t = userTheme || {}
  const dark = mode === 'dark'

  // Light mode colours
  const accentH = t.accent_h ?? 150
  const accentS = t.accent_s ?? 20
  const accentL = t.accent_l ?? 63
  const bgH = t.bg_h ?? 35
  const bgS = t.bg_s ?? 60
  const bgL = t.bg_l ?? 97

  // Dark mode colours
  const darkAccentH = t.dark_accent_h ?? 150
  const darkAccentS = t.dark_accent_s ?? 30
  const darkAccentL = t.dark_accent_l ?? 55
  const darkBgH = t.dark_bg_h ?? 220
  const darkBgS = t.dark_bg_s ?? 15
  const darkBgL = t.dark_bg_l ?? 12

  // Text colours — light mode
  const textH = t.text_h ?? 220
  const textS = t.text_s ?? 15
  const textL = t.text_l ?? 20
  const headingH = t.heading_h ?? 220
  const headingS = t.heading_s ?? 20
  const headingL = t.heading_l ?? 10

  // Text colours — dark mode
  const darkTextH = t.dark_text_h ?? 220
  const darkTextS = t.dark_text_s ?? 15
  const darkTextL = t.dark_text_l ?? 85
  const darkHeadingH = t.dark_heading_h ?? 220
  const darkHeadingS = t.dark_heading_s ?? 10
  const darkHeadingL = t.dark_heading_l ?? 92

  const usedAccentH = dark ? darkAccentH : accentH
  const usedAccentS = dark ? darkAccentS : accentS
  const usedAccentL = dark ? darkAccentL : accentL
  const usedBgH = dark ? darkBgH : bgH
  const usedBgS = dark ? darkBgS : bgS
  const usedBgL = dark ? darkBgL : bgL

  const accent = hslToHex(usedAccentH, usedAccentS, usedAccentL)
  const bg = hslToHex(usedBgH, usedBgS, usedBgL)
  // Paper is slightly lighter in light mode, slightly darker in dark mode.
  const paper = dark
    ? hslToHex(usedBgH, Math.max(usedBgS - 5, 0), Math.min(usedBgL + 4, 100))
    : hslToHex(usedBgH, Math.max(usedBgS - 10, 0), Math.min(usedBgL + 2, 100))
  const accentDark = hslToHex(usedAccentH, usedAccentS, Math.max(usedAccentL - 15, 10))
  const accentLight = hslToHex(usedAccentH, usedAccentS, Math.min(usedAccentL + 15, 95))

  // Resolved text and heading colours for the active mode.
  const textColour = hslToHex(
    dark ? darkTextH : textH,
    dark ? darkTextS : textS,
    dark ? darkTextL : textL,
  )
  const headingColour = hslToHex(
    dark ? darkHeadingH : headingH,
    dark ? darkHeadingS : headingS,
    dark ? darkHeadingL : headingL,
  )

  const fontBody = t.font_body || 'Playfair Display'
  const fontDisplay = t.font_display || 'Playfair Display'
  const fontUI = t.font_ui || 'Inter'
  const fontSize = t.font_size || 16

  const displayStack = `'${fontDisplay}', Georgia, serif`
  const bodyStack = `'${fontBody}', Georgia, serif`
  const uiStack = `'${fontUI}', system-ui, sans-serif`

  return createTheme({
    palette: {
      mode,
      primary: {
        main: accent,
        dark: accentDark,
        light: accentLight,
        contrastText: usedAccentL > 55 ? '#000000' : '#ffffff',
      },
      background: {
        default: bg,
        paper,
      },
      text: {
        primary: textColour,
      },
    },
    typography: {
      fontSize,
      // All UI chrome (buttons, labels, menus) uses the UI font.
      fontFamily: uiStack,
      // Reading content uses the body font.
      body1: { fontFamily: bodyStack },
      body2: { fontFamily: bodyStack },
      // Headings use the display font and heading colour.
      h1: { fontFamily: displayStack, color: headingColour },
      h2: { fontFamily: displayStack, color: headingColour },
      h3: { fontFamily: displayStack, color: headingColour },
      h4: { fontFamily: displayStack, color: headingColour },
      h5: { fontFamily: displayStack, color: headingColour },
      h6: { fontFamily: displayStack, color: headingColour },
      // UI variants — explicitly set so overrides to fontFamily do not bleed through.
      subtitle1: { fontFamily: uiStack },
      subtitle2: { fontFamily: uiStack },
      caption: { fontFamily: uiStack },
      overline: { fontFamily: uiStack },
      button: { fontFamily: uiStack },
    },
    // Custom keys used by ProfileLayout for nav styling.
    navFontSize: t.nav_font_size || 13,
    fontDisplay,
    fontUI,
  })
}
