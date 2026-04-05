import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, TextField, Button, Alert,
  AppBar, Toolbar, Switch,
} from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { useAuth } from '../context/AuthContext.jsx'
import { getCsrfToken } from '../api/client.js'
import { ThemeModeProvider, useThemeMode } from '../context/ThemeModeContext.jsx'
import buildProfileTheme from '../theme/buildProfileTheme.js'
import SpiderWeb from '../components/SpiderWeb.jsx'

// Default site theme — mirrors the server-side DefaultSiteTheme values.
const DEFAULT_SITE_THEME = {
  accent_h: 340, accent_s: 54, accent_l: 39,
  bg_h: 38, bg_s: 44, bg_l: 89,
  text_h: 220, text_s: 20, text_l: 15,
  heading_h: 220, heading_s: 25, heading_l: 10,
  dark_accent_h: 197, dark_accent_s: 61, dark_accent_l: 63,
  dark_bg_h: 232, dark_bg_s: 28, dark_bg_l: 20,
  dark_text_h: 36, dark_text_s: 15, dark_text_l: 88,
  dark_heading_h: 36, dark_heading_s: 20, dark_heading_l: 95,
  font_display: 'Playfair Display',
  font_body: 'Playfair Display',
  font_ui: 'Inter',
  font_size: 16,
  nav_font_size: 13,
}

function LoginInner() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { mode, toggleMode } = useThemeMode()

  const theme = buildProfileTheme(DEFAULT_SITE_THEME, mode)
  const fontDisplay = theme.fontDisplay

  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await getCsrfToken()
      const user = await login(form.username, form.password)
      navigate(user ? `/u/${user.username}` : '/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          color: 'text.primary',
        }}
      >
        {/* Top bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          <Toolbar sx={{ px: { xs: 2, md: 4 } }}>
            <Typography
              component={RouterLink}
              to="/"
              variant="h6"
              sx={{
                flexGrow: 1,
                textDecoration: 'none',
                color: 'inherit',
                fontFamily: `'${fontDisplay}', Georgia, serif`,
                fontWeight: 700,
              }}
            >
              Charlotte
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mx: 1.5, opacity: 0.75 }}>
              <LightModeIcon sx={{ fontSize: 14 }} />
              <Switch
                checked={mode === 'dark'}
                onChange={toggleMode}
                size="small"
                color="default"
                sx={{ mx: 0.5 }}
              />
              <DarkModeIcon sx={{ fontSize: 14 }} />
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page body */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            py: 6,
          }}
        >
          {/* Decorative webs */}
          <SpiderWeb
            size={340}
            sx={{
              position: 'absolute',
              top: -60,
              left: -60,
              opacity: 0.06,
              color: 'text.primary',
              pointerEvents: 'none',
            }}
          />
          <SpiderWeb
            size={180}
            sx={{
              position: 'absolute',
              bottom: -30,
              right: -30,
              opacity: 0.06,
              color: 'text.primary',
              pointerEvents: 'none',
            }}
          />

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              maxWidth: 360,
              mx: 'auto',
              px: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ fontFamily: `'${fontDisplay}', Georgia, serif`, mb: 0.5 }}
            >
              Log in
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Username"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
              autoFocus
              fullWidth
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
              {loading ? 'Logging in…' : 'Log in'}
            </Button>

            <Typography variant="body2" sx={{ textAlign: 'center' }}>
              No account?{' '}
              <RouterLink to="/register">Register</RouterLink>
            </Typography>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default function Login() {
  return (
    <ThemeModeProvider>
      <LoginInner />
    </ThemeModeProvider>
  )
}
