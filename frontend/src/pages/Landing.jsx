import React, { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box, Container, Typography, Button, Grid, Avatar,
  CircularProgress, Alert, AppBar, Toolbar, Switch,
} from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import client from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { ThemeModeProvider, useThemeMode } from '../context/ThemeModeContext.jsx'
import buildProfileTheme from '../theme/buildProfileTheme.js'

// Decorative spider-web SVG component.
function SpiderWeb({ size = 200, sx }) {
  const degrees = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
  const radii = [20, 40, 60, 80, 95]

  return (
    <Box
      component="svg"
      viewBox="0 0 200 200"
      sx={{ width: size, height: size, ...sx }}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.8"
    >
      {/* Radial lines from centre */}
      {degrees.map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line
            key={deg}
            x1="100" y1="100"
            x2={100 + 95 * Math.cos(rad)}
            y2={100 + 95 * Math.sin(rad)}
          />
        )
      })}
      {/* Concentric web rings */}
      {radii.map((r) => (
        <polygon
          key={r}
          points={degrees
            .map((deg) => {
              const rad = (deg * Math.PI) / 180
              return `${100 + r * Math.cos(rad)},${100 + r * Math.sin(rad)}`
            })
            .join(' ')}
        />
      ))}
    </Box>
  )
}

// Default site theme matching the server-side DefaultSiteTheme values.
const DEFAULT_SITE_THEME = {
  accent_h: 340, accent_s: 50, accent_l: 35,
  bg_h: 38, bg_s: 30, bg_l: 97,
  text_h: 220, text_s: 20, text_l: 15,
  heading_h: 220, heading_s: 25, heading_l: 10,
  dark_accent_h: 36, dark_accent_s: 70, dark_accent_l: 58,
  dark_bg_h: 222, dark_bg_s: 22, dark_bg_l: 11,
  dark_text_h: 36, dark_text_s: 15, dark_text_l: 88,
  dark_heading_h: 36, dark_heading_s: 20, dark_heading_l: 95,
  font_display: 'Playfair Display',
  font_body: 'Playfair Display',
  font_ui: 'Inter',
  font_size: 16,
  nav_font_size: 13,
}

// Inner page that can access ThemeModeContext.
function LandingInner({ settings, users, error }) {
  const { user } = useAuth()
  const { mode, toggleMode } = useThemeMode()

  // Use the site theme from settings, falling back to the built-in default.
  const siteTheme = settings?.site_theme ?? DEFAULT_SITE_THEME
  const theme = buildProfileTheme(siteTheme, mode)
  const fontDisplay = theme.fontDisplay

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

            {user ? (
              <Button component={RouterLink} to="/dashboard" color="inherit" size="small">
                Dashboard
              </Button>
            ) : (
              <>
                <Button component={RouterLink} to="/login" color="inherit" size="small">
                  Log in
                </Button>
                {settings?.registration_open && (
                  <Button
                    component={RouterLink}
                    to="/register"
                    variant="outlined"
                    size="small"
                    color="primary"
                    sx={{ ml: 1 }}
                  >
                    Register
                  </Button>
                )}
              </>
            )}
          </Toolbar>
        </AppBar>

        {/* Hero section */}
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            py: { xs: 10, md: 16 },
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {/* Background web — top-left */}
          <SpiderWeb
            size={380}
            sx={{
              position: 'absolute',
              top: -60,
              left: -60,
              opacity: 0.06,
              color: 'text.primary',
              pointerEvents: 'none',
            }}
          />
          {/* Background web — bottom-right */}
          <SpiderWeb
            size={160}
            sx={{
              position: 'absolute',
              bottom: -20,
              right: -20,
              opacity: 0.06,
              color: 'text.primary',
              pointerEvents: 'none',
            }}
          />

          <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              variant="h1"
              sx={{
                fontFamily: `'${fontDisplay}', Georgia, serif`,
                fontWeight: 700,
                fontSize: { xs: '3.5rem', md: '6rem' },
                lineHeight: 1.05,
                mb: 2,
              }}
            >
              {settings?.site_name || 'Charlotte'}
            </Typography>

            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: settings?.site_description ? 1.5 : 4, fontStyle: 'italic' }}
            >
              Some website. Radiant.
            </Typography>

            {settings?.site_description && (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 4, maxWidth: 560, mx: 'auto' }}
              >
                {settings.site_description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {user ? (
                <Button
                  component={RouterLink}
                  to="/dashboard"
                  variant="contained"
                  size="large"
                >
                  Go to dashboard
                </Button>
              ) : (
                <>
                  {settings?.registration_open && (
                    <Button
                      component={RouterLink}
                      to="/register"
                      variant="contained"
                      size="large"
                    >
                      Get started
                    </Button>
                  )}
                  <Button
                    component={RouterLink}
                    to="/login"
                    variant="outlined"
                    size="large"
                  >
                    Log in
                  </Button>
                </>
              )}
            </Box>
          </Container>
        </Box>

        {/* User grid */}
        <Box component="main" sx={{ flexGrow: 1 }}>
          <Container maxWidth="lg" sx={{ py: 6 }}>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {users.length > 0 && (
              <>
                <Grid container spacing={4} justifyContent={users.length === 1 ? 'center' : undefined}>
                  {users.map((u) => (
                    <Grid item xs={12} sm={6} md={4} key={u.username}>
                      <Box
                        component={RouterLink}
                        to={`/u/${u.username}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          textDecoration: 'none',
                          color: 'inherit',
                          '&:hover .user-name': { color: 'primary.main' },
                        }}
                      >
                        <Avatar
                          src={u.avatar_url || undefined}
                          sx={{ width: 52, height: 52, flexShrink: 0 }}
                        >
                          {(u.display_name || u.username)[0]?.toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            className="user-name"
                            fontWeight={600}
                            sx={{
                              fontFamily: `'${fontDisplay}', Georgia, serif`,
                              transition: 'color 0.15s',
                            }}
                          >
                            {u.display_name || u.username}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            @{u.username}
                          </Typography>
                          {u.bio && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 0.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 220,
                              }}
                            >
                              {u.bio}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Container>
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Charlotte
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

// Outer wrapper: fetches data, wraps in ThemeModeProvider.
export default function Landing() {
  const [settings, setSettings] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, usersRes] = await Promise.all([
          client.get('/settings'),
          client.get('/users'),
        ])
        setSettings(settingsRes.data)
        setUsers(usersRes.data || [])
      } catch {
        setError('Failed to load site information.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <ThemeModeProvider>
      <LandingInner settings={settings} users={users} error={error} />
    </ThemeModeProvider>
  )
}
