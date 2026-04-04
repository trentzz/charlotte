import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar, Toolbar, Typography, Box, Button, MenuItem,
  IconButton, Menu, Divider, CircularProgress, useMediaQuery,
  Select, FormControl, TextField,
} from '@mui/material'
import { ThemeProvider, CssBaseline, useTheme } from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import client from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { ThemeModeProvider, useThemeMode } from '../context/ThemeModeContext.jsx'
import { LiveThemeProvider, useLiveTheme } from '../context/LiveThemeContext.jsx'
import { NavDataContext } from '../context/NavDataContext.jsx'
import buildProfileTheme from '../theme/buildProfileTheme.js'

// Settings nav sections and items.
const SETTINGS_NAV = [
  { label: 'Homepage', href: '/dashboard/homepage' },
  { label: 'Profile', href: '/dashboard/profile' },
  { label: 'Appearance', href: '/dashboard/appearance' },
  { label: 'Features', href: '/dashboard/features' },
  { label: 'Blog', href: '/dashboard/blog' },
  { label: 'About', href: '/dashboard/about' },
  { label: 'Gallery', href: '/dashboard/gallery' },
  { label: 'Recipes', href: '/dashboard/recipes' },
  { label: 'Projects', href: '/dashboard/projects' },
]

const ADMIN_NAV = [
  { label: 'Users', href: '/admin/users' },
  { label: 'Content', href: '/admin/content' },
  { label: 'Settings', href: '/admin/settings' },
]

// Mobile nav options — all items flattened for a select element.
function MobileNavSelect({ items, adminItems, isAdmin, location }) {
  const navigate = useNavigate()
  const value = items.find((i) => location.pathname.startsWith(i.href))?.href
    || (isAdmin ? adminItems.find((i) => location.pathname.startsWith(i.href))?.href : '')
    || ''

  return (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <Select
        value={value}
        onChange={(e) => navigate(e.target.value)}
        displayEmpty
        sx={{ fontSize: 14 }}
      >
        {items.map((item) => (
          <MenuItem key={item.href} value={item.href}>{item.label}</MenuItem>
        ))}
        {isAdmin && [
          <Divider key="div" />,
          ...adminItems.map((item) => (
            <MenuItem key={item.href} value={item.href}>{item.label}</MenuItem>
          )),
        ]}
      </Select>
    </FormControl>
  )
}

// The inner layout that can access ThemeModeContext and LiveThemeContext.
function SettingsLayoutInner({ user, navData, reloadNavData }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { mode, toggleMode } = useThemeMode()
  const [accountAnchor, setAccountAnchor] = useState(null)
  const { liveTheme } = useLiveTheme()

  const theme = buildProfileTheme(liveTheme, mode)
  const navFontSize = theme.navFontSize
  const fontDisplay = theme.fontDisplay

  const muiTheme = useTheme()
  // Use sm breakpoint: below sm shows mobile nav.
  const isMobile = useMediaQuery('(max-width:700px)')

  // Nav items from the logged-in user's profile data.
  const username = user?.username || ''
  const recentPosts = navData?.recent_posts?.slice(0, 5) || []
  const recentProjects = navData?.recent_projects?.slice(0, 5) || []
  const albums = navData?.albums?.slice(0, 10) || []
  const recentRecipes = navData?.recent_recipes?.slice(0, 5) || []
  const features = navData?.profile?.features || {}

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

  const navLabelStyle = {
    fontFamily: `'${fontDisplay}', Georgia, serif`,
    fontSize: navFontSize,
    textTransform: 'uppercase',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'inherit',
  }

  const handleAccountClick = (e) => setAccountAnchor(e.currentTarget)
  const handleAccountClose = () => setAccountAnchor(null)

  async function handleLogout() {
    handleAccountClose()
    await logout()
    navigate('/')
  }

  return (
    <NavDataContext.Provider value={{ navData, reloadNavData }}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        {/* Top nav bar — same style as ProfileLayout */}
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
              {/* Logo: user display name → links to their public page */}
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
                {navData?.profile?.display_name || username}
              </Typography>

              <Box sx={{ flexGrow: 1 }} />

              {/* Nav items from the user's own profile */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {features.blog === true && blogItems.length > 0 && (
                  <NavDropdown
                    label="Blog"
                    items={blogItems}
                    allHref={`/u/${username}/blog`}
                    navFontSize={navFontSize}
                    fontDisplay={fontDisplay}
                  />
                )}
                {features.blog === true && blogItems.length === 0 && (
                  <Button component={RouterLink} to={`/u/${username}/blog`} sx={{ color: 'inherit', ...navLabelStyle }}>
                    Blog
                  </Button>
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
              <IconButton onClick={toggleMode} color="inherit" size="small" sx={{ ml: 1 }}>
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>

              {/* Account button with icon + text */}
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
                  to={`/u/${username}`}
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
                {user?.is_admin && (
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
            </Box>
          </Toolbar>
        </AppBar>

        {/* Two-column body */}
        <Box sx={{ flexGrow: 1, maxWidth: 1200, mx: 'auto', width: '100%', px: { xs: 2, md: 4 } }}>
          {isMobile ? (
            // Mobile: show a select for settings navigation above content.
            <Box sx={{ pt: 2, pb: 1 }}>
              <MobileNavSelect
                items={SETTINGS_NAV}
                adminItems={ADMIN_NAV}
                isAdmin={user?.is_admin}
                location={location}
              />
            </Box>
          ) : null}

          <Box sx={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
            {/* Left sidebar nav — hidden on mobile */}
            {!isMobile && (
              <Box
                sx={{
                  width: 220,
                  flexShrink: 0,
                  pt: 4,
                  pr: 3,
                  minHeight: 'calc(100vh - 64px)',
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {SETTINGS_NAV.map((item) => {
                    const active = location.pathname === item.href ||
                      (location.pathname.startsWith(item.href) && item.href !== '/dashboard')
                    return (
                      <Button
                        key={item.href}
                        component={RouterLink}
                        to={item.href}
                        sx={{
                          justifyContent: 'flex-start',
                          px: 1.5,
                          py: 0.75,
                          fontSize: 14,
                          fontWeight: active ? 600 : 400,
                          color: active ? 'text.primary' : 'text.secondary',
                          bgcolor: active ? 'action.selected' : 'transparent',
                          borderRadius: 1.5,
                          textTransform: 'none',
                          '&:hover': {
                            bgcolor: active ? 'action.selected' : 'action.hover',
                            color: 'text.primary',
                          },
                        }}
                      >
                        {item.label}
                      </Button>
                    )
                  })}

                  {user?.is_admin && (
                    <>
                      <Typography
                        variant="overline"
                        sx={{
                          px: 1.5,
                          pt: 2,
                          pb: 0.5,
                          display: 'block',
                          color: 'text.disabled',
                          fontSize: 10,
                          letterSpacing: '0.08em',
                        }}
                      >
                        Admin
                      </Typography>
                      {ADMIN_NAV.map((item) => {
                        const active = location.pathname === item.href
                        return (
                          <Button
                            key={item.href}
                            component={RouterLink}
                            to={item.href}
                            sx={{
                              justifyContent: 'flex-start',
                              px: 1.5,
                              py: 0.75,
                              fontSize: 14,
                              fontWeight: active ? 600 : 400,
                              color: active ? 'primary.main' : 'text.secondary',
                              bgcolor: 'transparent',
                              borderRadius: 1,
                              textTransform: 'none',
                              '&:hover': {
                                bgcolor: 'transparent',
                                color: 'text.primary',
                              },
                            }}
                          >
                            {item.label}
                          </Button>
                        )
                      })}
                    </>
                  )}
                </Box>
              </Box>
            )}

            {/* Right content area */}
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                minWidth: 0,
                pt: 4,
                pl: isMobile ? 0 : 4,
                maxWidth: 860,
              }}
            >
              <Outlet />
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
    </NavDataContext.Provider>
  )
}

// Dropdown nav button — navigates to the section on click, opens on hover.
function NavDropdown({ label, items, allHref, navFontSize, fontDisplay }) {
  const closeTimer = useRef(null)
  const [anchorEl, setAnchorEl] = useState(null)
  const [filterText, setFilterText] = useState('')
  const open = Boolean(anchorEl)

  const handleMouseEnter = (e) => {
    clearTimeout(closeTimer.current)
    setAnchorEl(e.currentTarget)
  }
  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setAnchorEl(null), 120)
  }
  const handleMenuMouseEnter = () => clearTimeout(closeTimer.current)
  const handleClose = () => {
    setAnchorEl(null)
    setFilterText('')
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
        component={RouterLink}
        to={allHref}
        endIcon={<KeyboardArrowDownIcon />}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{ color: 'inherit', ...labelStyle }}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { minWidth: anchorEl?.offsetWidth ?? 120 } }}
        MenuListProps={{
          onMouseEnter: handleMenuMouseEnter,
          onMouseLeave: handleMouseLeave,
        }}
        disableAutoFocusItem
      >
        {items.length > 3 && (
          <Box sx={{ px: 1.5, pt: 1, pb: 0.5 }}>
            <TextField
              size="small"
              placeholder="Search…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              autoFocus
              fullWidth
              sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
            />
          </Box>
        )}
        {visibleItems.map((item) => (
          <MenuItem
            key={item.href}
            component={RouterLink}
            to={item.href}
            onClick={handleClose}
            sx={{ fontSize: navFontSize }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

// Outer shell: fetches profile data, guards auth, then renders inner layout.
export default function SettingsLayout() {
  const { user, loading: authLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [navData, setNavData] = useState(null)
  const [navLoading, setNavLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true })
    }
  }, [authLoading, user, navigate])

  const loadNavData = useCallback(() => {
    if (!user) return
    client.get(`/u/${user.username}`)
      .then((res) => setNavData(res.data))
      .catch(() => setNavData(null))
  }, [user])

  useEffect(() => {
    if (!user) return
    setNavLoading(true)
    client.get(`/u/${user.username}`)
      .then((res) => setNavData(res.data))
      .catch(() => setNavData(null))
      .finally(() => setNavLoading(false))
  }, [user])

  if (authLoading || navLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) return null

  return (
    <LiveThemeProvider initialTheme={user?.theme}>
      <ThemeModeProvider>
        <SettingsLayoutInner user={user} navData={navData} reloadNavData={loadNavData} />
      </ThemeModeProvider>
    </LiveThemeProvider>
  )
}
