import React, { useState } from 'react'
import { Outlet, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Divider, IconButton,
  Menu, MenuItem, useMediaQuery, useTheme, CircularProgress, Switch,
} from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PersonIcon from '@mui/icons-material/Person'
import PaletteIcon from '@mui/icons-material/Palette'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import ArticleIcon from '@mui/icons-material/Article'
import InfoIcon from '@mui/icons-material/Info'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import WorkIcon from '@mui/icons-material/Work'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import PeopleIcon from '@mui/icons-material/People'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import SettingsIcon from '@mui/icons-material/Settings'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from '../context/AuthContext.jsx'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { ThemeModeProvider, useThemeMode } from '../context/ThemeModeContext.jsx'
import buildProfileTheme from '../theme/buildProfileTheme.js'

const DRAWER_WIDTH = 220

const NAV_SECTIONS = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Overview', href: '/dashboard', icon: <DashboardIcon fontSize="small" /> },
      { label: 'Profile', href: '/dashboard/profile', icon: <PersonIcon fontSize="small" /> },
      { label: 'Appearance', href: '/dashboard/appearance', icon: <PaletteIcon fontSize="small" /> },
      { label: 'Features', href: '/dashboard/features', icon: <ToggleOnIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Blog', href: '/dashboard/blog', icon: <ArticleIcon fontSize="small" /> },
      { label: 'About', href: '/dashboard/about', icon: <InfoIcon fontSize="small" /> },
      { label: 'Gallery', href: '/dashboard/gallery', icon: <PhotoLibraryIcon fontSize="small" /> },
      { label: 'Recipes', href: '/dashboard/recipes', icon: <MenuBookIcon fontSize="small" /> },
      { label: 'Projects', href: '/dashboard/projects', icon: <WorkIcon fontSize="small" /> },
    ],
  },
]

const ADMIN_ITEMS = [
  { label: 'Users', href: '/admin/users', icon: <PeopleIcon fontSize="small" /> },
  { label: 'Content', href: '/admin/content', icon: <ContentPasteIcon fontSize="small" /> },
  { label: 'Settings', href: '/admin/settings', icon: <SettingsIcon fontSize="small" /> },
  { label: 'Appearance', href: '/admin/appearance', icon: <PaletteIcon fontSize="small" /> },
]

function SidebarContent({ location, user, onClose }) {
  return (
    <Box sx={{ width: DRAWER_WIDTH, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar top spacer — aligns with AppBar height */}
      <Box sx={{ px: 2, py: 2, minHeight: 48 }} />

      <Divider />

      {/* Nav sections */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pt: 1 }}>
        {NAV_SECTIONS.map((section, idx) => (
          <React.Fragment key={section.label}>
            {idx > 0 && <Divider sx={{ my: 1 }} />}
            <Typography
              variant="overline"
              sx={{
                px: 2,
                pt: 1,
                pb: 0.5,
                display: 'block',
                color: 'text.disabled',
                fontSize: 10,
                letterSpacing: '0.08em',
              }}
            >
              {section.label}
            </Typography>
            <List dense disablePadding>
              {section.items.map((item) => {
                const active = location.pathname === item.href ||
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
                return (
                  <ListItem key={item.href} disablePadding>
                    <ListItemButton
                      component={RouterLink}
                      to={item.href}
                      onClick={onClose}
                      sx={{
                        py: 0.75,
                        pl: 2,
                        borderLeft: active ? '2px solid' : '2px solid transparent',
                        borderColor: active ? 'primary.main' : 'transparent',
                        color: active ? 'primary.main' : 'text.secondary',
                        '&:hover': {
                          bgcolor: 'transparent',
                          color: 'text.primary',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'transparent',
                        },
                        '&.Mui-selected:hover': {
                          bgcolor: 'transparent',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 32,
                          color: 'inherit',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }}
                      />
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </List>
          </React.Fragment>
        ))}

        {user?.is_admin && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="overline"
              sx={{
                px: 2,
                pt: 1,
                pb: 0.5,
                display: 'block',
                color: 'text.disabled',
                fontSize: 10,
                letterSpacing: '0.08em',
              }}
            >
              Admin
            </Typography>
            <List dense disablePadding>
              {ADMIN_ITEMS.map((item) => {
                const active = location.pathname === item.href
                return (
                  <ListItem key={item.href} disablePadding>
                    <ListItemButton
                      component={RouterLink}
                      to={item.href}
                      onClick={onClose}
                      sx={{
                        py: 0.75,
                        pl: 2,
                        borderLeft: active ? '2px solid' : '2px solid transparent',
                        borderColor: active ? 'primary.main' : 'transparent',
                        color: active ? 'primary.main' : 'text.secondary',
                        '&:hover': {
                          bgcolor: 'transparent',
                          color: 'text.primary',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'transparent',
                        },
                        '&.Mui-selected:hover': {
                          bgcolor: 'transparent',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }}
                      />
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </List>
          </>
        )}
      </Box>
    </Box>
  )
}

function DashboardLayoutInner() {
  const { mode, toggleMode } = useThemeMode()
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountAnchor, setAccountAnchor] = useState(null)

  if (!loading && !user) {
    navigate('/login', { replace: true })
    return null
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  const handleDrawerToggle = () => setMobileOpen((v) => !v)
  const handleAccountClick = (e) => setAccountAnchor(e.currentTarget)
  const handleAccountClose = () => setAccountAnchor(null)

  async function handleLogout() {
    handleAccountClose()
    await logout()
    navigate('/')
  }

  const profileTheme = buildProfileTheme(user?.theme, mode)

  // Shared drawer paper styles: transparent background, right border only
  const drawerPaperSx = {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    bgcolor: 'background.default',
    borderRight: '1px solid',
    borderColor: 'divider',
    boxShadow: 'none',
  }

  const sidebarContent = (
    <SidebarContent
      location={location}
      user={user}
      onClose={() => setMobileOpen(false)}
    />
  )

  return (
    <ThemeProvider theme={profileTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

        {/* Sidebar — temporary on mobile, permanent on desktop */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': drawerPaperSx }}
          >
            {sidebarContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              width: DRAWER_WIDTH,
              flexShrink: 0,
              '& .MuiDrawer-paper': drawerPaperSx,
            }}
          >
            {sidebarContent}
          </Drawer>
        )}

        {/* Main column */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              zIndex: (t) => t.zIndex.drawer - 1,
              bgcolor: 'background.default',
              borderBottom: '1px solid',
              borderColor: 'divider',
              color: 'text.primary',
            }}
          >
            <Toolbar>
              {isMobile && (
                <IconButton onClick={handleDrawerToggle} edge="start" sx={{ mr: 1 }}>
                  <MenuIcon />
                </IconButton>
              )}
              {/* On mobile show the user's name; on desktop show nothing (sidebar is visible). */}
              <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 600 }}>
                {isMobile ? (user?.display_name || user?.username || 'Dashboard') : ''}
              </Typography>
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
              <IconButton onClick={handleAccountClick}>
                <AccountCircleIcon />
              </IconButton>
              <Menu
                anchorEl={accountAnchor}
                open={Boolean(accountAnchor)}
                onClose={handleAccountClose}
              >
                <MenuItem
                  component={RouterLink}
                  to={`/u/${user.username}`}
                  onClick={handleAccountClose}
                >
                  My Page
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>Log out</MenuItem>
              </Menu>
            </Toolbar>
          </AppBar>

          <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, pb: 6 }}>
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
              <Outlet />
            </Box>
          </Box>
        </Box>

      </Box>
    </ThemeProvider>
  )
}

export default function DashboardLayout() {
  return (
    <ThemeModeProvider>
      <DashboardLayoutInner />
    </ThemeModeProvider>
  )
}
