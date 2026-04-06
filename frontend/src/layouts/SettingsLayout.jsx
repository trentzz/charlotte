import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar, Toolbar, Typography, Box, Button, MenuItem,
  IconButton, Menu, Divider, CircularProgress, useMediaQuery,
  Select, FormControl, TextField, Switch, Paper, Popper,
} from '@mui/material'
import { ThemeProvider, CssBaseline, useTheme } from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import SearchIcon from '@mui/icons-material/Search'
import client from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { ThemeModeProvider, useThemeMode } from '../context/ThemeModeContext.jsx'
import { LiveThemeProvider, useLiveTheme } from '../context/LiveThemeContext.jsx'
import { NavDataContext } from '../context/NavDataContext.jsx'
import buildProfileTheme from '../theme/buildProfileTheme.js'
import SearchModal from '../components/SearchModal.jsx'

// Settings nav sections and items.
const SETTINGS_NAV = [
  { label: 'Homepage', href: '/dashboard/homepage' },
  { label: 'Profile', href: '/dashboard/profile' },
  { label: 'Navigation', href: '/dashboard/nav-config' },
  { label: 'Appearance', href: '/dashboard/appearance' },
  { label: 'Features', href: '/dashboard/features' },
  { label: 'Blog', href: '/dashboard/blog' },
  { label: 'About', href: '/dashboard/about' },
  { label: 'Gallery', href: '/dashboard/gallery' },
  { label: 'Recipes', href: '/dashboard/recipes' },
  { label: 'Projects', href: '/dashboard/projects' },
  { label: 'Custom pages', href: '/dashboard/custom-pages' },
]

const ADMIN_NAV = [
  { label: 'Users', href: '/admin/users' },
  { label: 'Content', href: '/admin/content' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Appearance', href: '/admin/appearance' },
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
  const [searchOpen, setSearchOpen] = useState(false)
  const { liveTheme } = useLiveTheme()

  // Ctrl+K / Cmd+K opens the search modal.
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const theme = buildProfileTheme(liveTheme, mode)
  const navFontSize = theme.navFontSize
  const fontDisplay = theme.fontDisplay

  const muiTheme = useTheme()
  // Use sm breakpoint: below sm shows mobile nav.
  const isMobile = useMediaQuery('(max-width:700px)')

  // Nav items from the logged-in user's profile data.
  const username = user?.username || ''
  const features = navData?.profile?.features || {}

  // Parse nav config.
  const navCfg = React.useMemo(() => {
    try { return JSON.parse(navData?.nav_config || '{}') } catch { return {} }
  }, [navData?.nav_config])

  const navSections = navCfg.sections || ['home', 'about', 'blog', 'projects', 'gallery', 'recipes']
  const navPinned = navCfg.pinned || {}
  const navLabels = navCfg.labels || {}

  // All available items for dropdown building.
  const allPosts = navData?.recent_posts || []
  const allProjects = navData?.recent_projects || []
  const allAlbums = (navData?.albums || []).filter((a) => !a.parent_id)
  const allRecipes = navData?.recent_recipes || []

  function buildItems(all, pinnedSlugs, hrefFn, labelFn) {
    if (pinnedSlugs && pinnedSlugs.length > 0) {
      return pinnedSlugs
        .map((slug) => all.find((x) => x.slug === slug))
        .filter(Boolean)
        .map((x) => ({ href: hrefFn(x), label: labelFn(x) }))
    }
    return all.slice(0, 5).map((x) => ({ href: hrefFn(x), label: labelFn(x) }))
  }

  const blogItems = buildItems(allPosts, navPinned.blog,
    (p) => `/u/${username}/blog/${p.slug}`, (p) => p.title)
  const projectItems = buildItems(allProjects, navPinned.projects,
    (p) => `/u/${username}/projects/${p.slug}`, (p) => p.title)
  const galleryItems = buildItems(allAlbums, navPinned.gallery,
    (a) => `/u/${username}/gallery/${a.slug}`, (a) => a.title)
  const recipeItems = buildItems(allRecipes, navPinned.recipes,
    (r) => `/u/${username}/recipes/${r.slug}`, (r) => r.title)

  // Custom pages nav — pinned pages show as top-level buttons; unpinned go in dropdown.
  const customPagesOrder = navCfg.custom_pages_order || []
  const sortedCustomPages = React.useMemo(() => {
    const pages = (navData?.custom_pages || []).filter((p) => p.published)
    if (customPagesOrder.length === 0) return pages
    const idx = new Map(customPagesOrder.map((id, i) => [id, i]))
    return [...pages].sort((a, b) => {
      const ai = idx.has(a.id) ? idx.get(a.id) : Infinity
      const bi = idx.has(b.id) ? idx.get(b.id) : Infinity
      return ai - bi
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navData?.custom_pages, navCfg.custom_pages_order])
  const pinnedPages = sortedCustomPages.filter((p) => p.nav_pinned)
  const dropdownPages = sortedCustomPages.filter((p) => !p.nav_pinned)
  const customNav = navData?.profile?.custom_nav || { mode: 'grouped', label: 'More' }
  const dropdownItems = dropdownPages.map((p) => ({
    href: `/u/${username}/pages/${p.slug}`,
    label: p.title,
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
                  flexShrink: 0,
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

              {/* Nav items — scrollable, takes all available space */}
              <Box sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                overflowX: 'auto',
                mx: 1,
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}>
                {navSections.map((section) => {
                  if (section === 'home') {
                    return (
                      <Button key="home" component={RouterLink} to={`/u/${username}`}
                        disableRipple sx={{ color: 'inherit', ...navLabelStyle, '&:hover': { bgcolor: 'transparent' } }}>
                        {navLabels.home || 'Home'}
                      </Button>
                    )
                  }
                  if (section === 'about' && features.about === true) {
                    return (
                      <Button key="about" component={RouterLink} to={`/u/${username}/about`}
                        disableRipple sx={{ color: 'inherit', ...navLabelStyle, '&:hover': { bgcolor: 'transparent' } }}>
                        {navLabels.about || 'About'}
                      </Button>
                    )
                  }
                  if (section === 'blog' && features.blog === true) {
                    return (
                      <NavDropdown key="blog" label={navLabels.blog || 'Blog'} items={blogItems}
                        allHref={`/u/${username}/blog`} navFontSize={navFontSize} fontDisplay={fontDisplay} />
                    )
                  }
                  if (section === 'projects' && features.projects === true) {
                    return (
                      <NavDropdown key="projects" label={navLabels.projects || 'Projects'} items={projectItems}
                        allHref={`/u/${username}/projects`} navFontSize={navFontSize} fontDisplay={fontDisplay} />
                    )
                  }
                  if (section === 'gallery' && features.gallery === true) {
                    return (
                      <NavDropdown key="gallery" label={navLabels.gallery || 'Gallery'} items={galleryItems}
                        allHref={`/u/${username}/gallery`} navFontSize={navFontSize} fontDisplay={fontDisplay} />
                    )
                  }
                  if (section === 'recipes' && features.recipes === true) {
                    return (
                      <NavDropdown key="recipes" label={navLabels.recipes || 'Recipes'} items={recipeItems}
                        allHref={`/u/${username}/recipes`} navFontSize={navFontSize} fontDisplay={fontDisplay} />
                    )
                  }
                  return null
                })}
                {pinnedPages.map((p) => (
                  <Button
                    key={p.id}
                    component={RouterLink}
                    to={`/u/${username}/pages/${p.slug}`}
                    disableRipple
                    sx={{ color: 'inherit', ...navLabelStyle, '&:hover': { bgcolor: 'transparent' } }}
                  >
                    {p.title}
                  </Button>
                ))}
                {dropdownItems.length > 0 && (
                  <NavDropdown
                    label={customNav.label || 'More'}
                    items={dropdownItems}
                    allHref={dropdownItems[0]?.href || '#'}
                    navFontSize={navFontSize}
                    fontDisplay={fontDisplay}
                  />
                )}
              </Box>

              {/* Right controls — fixed, never scrolled */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
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
            </Box>
          </Toolbar>
        </AppBar>

        {/* Two-column body */}
        <Box sx={{ flexGrow: 1, maxWidth: 1600, mx: 'auto', width: '100%', px: { xs: 2, md: 4 } }}>
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
                maxWidth: 'none',
              }}
            >
              <Outlet />
            </Box>
          </Box>
        </Box>
      </Box>
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        username={username}
      />
    </ThemeProvider>
    </NavDataContext.Provider>
  )
}

// Dropdown nav button — navigates to the section on click, opens on hover.
// Uses a Popper-based implementation to avoid MUI Menu focus issues.
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
        disableRipple
        endIcon={<KeyboardArrowDownIcon />}
        onMouseEnter={handleButtonEnter}
        onMouseLeave={handleButtonLeave}
        sx={{ color: 'inherit', ...labelStyle, '&:hover': { bgcolor: 'transparent' } }}
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
