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
import SearchIcon from '@mui/icons-material/Search'
import client from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { ThemeModeProvider, useThemeMode } from '../context/ThemeModeContext.jsx'
import buildProfileTheme from '../theme/buildProfileTheme.js'
import SearchModal from '../components/SearchModal.jsx'

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

// Inner layout that can access ThemeModeContext.
function ProfileLayoutInner({ username, profile, navData }) {
  const { user: authUser, logout } = useAuth()
  const navigate = useNavigate()
  const { mode, toggleMode } = useThemeMode()
  const [accountAnchor, setAccountAnchor] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)

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

  const features = profile?.features || {}

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
  const customNav = profile?.custom_nav || { mode: 'grouped', label: 'More' }
  const dropdownItems = dropdownPages.map((p) => ({
    href: `/u/${username}/pages/${p.slug}`,
    label: p.title,
  }))

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
                  flexShrink: 0,
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
                {/* Search button */}
                <IconButton
                  onClick={() => setSearchOpen(true)}
                  size="small"
                  sx={{ color: 'inherit', opacity: 0.75 }}
                  aria-label="Search"
                >
                  <SearchIcon fontSize="small" />
                </IconButton>

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
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        username={username}
      />
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
