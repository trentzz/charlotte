import React, { useEffect, useRef, useState } from 'react'
import { Outlet, Link as RouterLink, useParams, useNavigate } from 'react-router-dom'
import {
  AppBar, Toolbar, Typography, Box, Button,
  IconButton, Menu, MenuItem, Divider, CircularProgress, TextField, Paper, Switch, Popper,
} from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import client from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { ThemeModeProvider, useThemeMode } from '../context/ThemeModeContext.jsx'
import buildProfileTheme from '../theme/buildProfileTheme.js'

// A nav button that navigates to the section on click and shows a Popper-based
// dropdown on hover. Uses relatedTarget checking and a small close timer to
// prevent blinking when moving the cursor between the button and the list.
function NavDropdown({ label, items, allHref, navFontSize, fontDisplay }) {
  const buttonRef = useRef(null)
  const popperRef = useRef(null)
  const closeTimer = useRef(null)
  const [open, setOpen] = useState(false)
  const [filterText, setFilterText] = useState('')

  function cancelClose() {
    clearTimeout(closeTimer.current)
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => {
      setOpen(false)
      setFilterText('')
    }, 80)
  }

  function handleButtonEnter() {
    cancelClose()
    setOpen(true)
  }

  function handleButtonLeave(e) {
    if (popperRef.current && popperRef.current.contains(e.relatedTarget)) {
      cancelClose()
      return
    }
    scheduleClose()
  }

  function handlePopperEnter() {
    cancelClose()
  }

  function handlePopperLeave(e) {
    if (buttonRef.current && buttonRef.current.contains(e.relatedTarget)) {
      cancelClose()
      return
    }
    scheduleClose()
  }

  const labelStyle = {
    fontFamily: `'${fontDisplay}', Georgia, serif`,
    fontSize: navFontSize,
    textTransform: 'uppercase',
    fontWeight: 700,
    letterSpacing: '0.08em',
  }

  const visibleItems = filterText.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(filterText.toLowerCase()))
    : items

  return (
    <>
      <Button
        ref={buttonRef}
        component={RouterLink}
        to={allHref}
        endIcon={<KeyboardArrowDownIcon />}
        onMouseEnter={handleButtonEnter}
        onMouseLeave={handleButtonLeave}
        sx={{ color: 'inherit', ...labelStyle }}
      >
        {label}
      </Button>

      <Popper
        open={open && items.length > 0}
        anchorEl={buttonRef.current}
        placement="bottom-start"
        sx={{ zIndex: 1300 }}
      >
        <Paper
          ref={popperRef}
          elevation={4}
          onMouseEnter={handlePopperEnter}
          onMouseLeave={handlePopperLeave}
          sx={{ minWidth: 160, py: 0.5, mt: 0.5 }}
        >
          {items.length > 3 && (
            <Box sx={{ px: 1.5, pt: 0.5, pb: 0.5 }}>
              <TextField
                size="small"
                placeholder="Search…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                fullWidth
                sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
              />
            </Box>
          )}
          {visibleItems.map((item) => (
            <Box
              key={item.href}
              component={RouterLink}
              to={item.href}
              onClick={() => { setOpen(false); setFilterText('') }}
              sx={{
                display: 'block',
                px: 2,
                py: 0.75,
                fontSize: navFontSize,
                color: 'text.primary',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {item.label}
            </Box>
          ))}
        </Paper>
      </Popper>
    </>
  )
}

// Inner layout that can access ThemeModeContext.
function ProfileLayoutInner({ username, profile, navData }) {
  const { user: authUser, logout } = useAuth()
  const navigate = useNavigate()
  const { mode, toggleMode } = useThemeMode()
  const [accountAnchor, setAccountAnchor] = useState(null)

  const theme = buildProfileTheme(profile?.theme, mode)
  const navFontSize = theme.navFontSize
  const fontDisplay = theme.fontDisplay

  const navLabelStyle = {
    fontFamily: `'${fontDisplay}', Georgia, serif`,
    fontSize: navFontSize,
    textTransform: 'uppercase',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'inherit',
  }

  // Build dropdown items from profile data returned by /u/:username.
  const recentPosts = navData?.recent_posts?.slice(0, 5) || []
  const recentProjects = navData?.recent_projects?.slice(0, 5) || []
  const albums = navData?.albums?.slice(0, 10) || []
  const recentRecipes = navData?.recent_recipes?.slice(0, 5) || []

  const blogItems = recentPosts.map((p) => ({
    href: `/u/${username}/blog/${p.slug}`,
    label: p.title,
  }))
  const projectItems = recentProjects.map((p) => ({
    href: `/u/${username}/projects`,
    label: p.title,
  }))
  const galleryItems = albums.map((a) => ({
    href: `/u/${username}/gallery/${a.slug}`,
    label: a.title,
  }))
  const recipeItems = recentRecipes.map((r) => ({
    href: `/u/${username}/recipes/${r.slug}`,
    label: r.title,
  }))

  const features = profile?.features || {}

  const handleAccountClick = (e) => setAccountAnchor(e.currentTarget)
  const handleAccountClose = () => setAccountAnchor(null)

  async function handleLogout() {
    handleAccountClose()
    await logout()
    navigate('/')
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
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
          <Toolbar sx={{ gap: 0.5, px: { xs: 2, md: 4 } }}>
            <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Logo: user display name */}
              <Typography
                component={RouterLink}
                to={`/u/${username}`}
                variant="h6"
                sx={{
                  flexGrow: 0,
                  mr: 3,
                  textDecoration: 'none',
                  color: 'inherit',
                  fontFamily: `'${fontDisplay}', Georgia, serif`,
                  fontWeight: 700,
                  fontSize: navFontSize + 3,
                }}
              >
                {profile?.display_name || username}
              </Typography>

              {/* Spacer pushes nav to the right */}
              <Box sx={{ flexGrow: 1 }} />

              {/* Nav items */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  component={RouterLink}
                  to={`/u/${username}`}
                  sx={{ color: 'inherit', ...navLabelStyle }}
                >
                  Home
                </Button>
                {features.blog === true && (
                  <NavDropdown
                    label="Blog"
                    items={blogItems}
                    allHref={`/u/${username}/blog`}
                    navFontSize={navFontSize}
                    fontDisplay={fontDisplay}
                  />
                )}
                {features.projects === true && (
                  <NavDropdown
                    label="Projects"
                    items={projectItems}
                    allHref={`/u/${username}/projects`}
                    navFontSize={navFontSize}
                    fontDisplay={fontDisplay}
                  />
                )}
                {features.gallery === true && (
                  <NavDropdown
                    label="Gallery"
                    items={galleryItems}
                    allHref={`/u/${username}/gallery`}
                    navFontSize={navFontSize}
                    fontDisplay={fontDisplay}
                  />
                )}
                {features.recipes === true && (
                  <NavDropdown
                    label="Recipes"
                    items={recipeItems}
                    allHref={`/u/${username}/recipes`}
                    navFontSize={navFontSize}
                    fontDisplay={fontDisplay}
                  />
                )}
                {features.about === true && (
                  <Button
                    component={RouterLink}
                    to={`/u/${username}/about`}
                    sx={{ color: 'inherit', ...navLabelStyle }}
                  >
                    About
                  </Button>
                )}
              </Box>

              {/* Dark/light toggle */}
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

              {/* Account button with icon + text for logged-in users */}
              {authUser && (
                <>
                  <Button
                    onClick={handleAccountClick}
                    startIcon={<AccountCircleIcon />}
                    endIcon={<KeyboardArrowDownIcon />}
                    sx={{
                      color: 'inherit',
                      ml: 0.5,
                      fontFamily: `'${fontDisplay}', Georgia, serif`,
                      fontSize: navFontSize,
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                    }}
                  >
                    Account
                  </Button>
                  <Menu
                    anchorEl={accountAnchor}
                    open={Boolean(accountAnchor)}
                    onClose={handleAccountClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{ sx: { minWidth: 200 } }}
                  >
                    <MenuItem
                      component={RouterLink}
                      to={`/u/${authUser.username}`}
                      onClick={handleAccountClose}
                    >
                      My Page
                    </MenuItem>
                    <MenuItem
                      component={RouterLink}
                      to="/dashboard/profile"
                      onClick={handleAccountClose}
                    >
                      Settings
                    </MenuItem>
                    {authUser.is_admin && (
                      <MenuItem
                        component={RouterLink}
                        to="/admin/users"
                        onClick={handleAccountClose}
                      >
                        Admin
                      </MenuItem>
                    )}
                    <Divider />
                    <MenuItem onClick={handleLogout}>Log out</MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1 }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, width: '100%' }}>
            <Outlet context={{ profile, navData, username }} />
          </Box>
        </Box>

        <Box
          component="footer"
          sx={{
            py: 3,
            mt: 4,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Typography
            component={RouterLink}
            to="/"
            variant="body2"
            color="text.secondary"
            sx={{ textDecoration: 'none', '&:hover': { color: 'text.primary' } }}
          >
            Charlotte
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

// Outer wrapper: fetches profile data, wraps in ThemeModeProvider.
export default function ProfileLayout() {
  const { username } = useParams()

  const [profile, setProfile] = useState(null)
  const [navData, setNavData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await client.get(`/u/${username}`)
        if (!cancelled) {
          setProfile(res.data.profile)
          setNavData(res.data)
        }
      } catch {
        if (!cancelled) {
          setProfile(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [username])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <ThemeModeProvider>
      <ProfileLayoutInner username={username} profile={profile} navData={navData} />
    </ThemeModeProvider>
  )
}
