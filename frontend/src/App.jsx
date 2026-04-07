import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import { AuthProvider } from './context/AuthContext.jsx'

// Layouts
import PublicLayout from './layouts/PublicLayout.jsx'
import ProfileLayout from './layouts/ProfileLayout.jsx'
import SettingsLayout from './layouts/SettingsLayout.jsx'

// Public pages
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

// Profile pages
import UserHome from './pages/profile/UserHome.jsx'
import BlogIndex from './pages/profile/BlogIndex.jsx'
import BlogPost from './pages/profile/BlogPost.jsx'
import About from './pages/profile/About.jsx'
import GalleryHome from './pages/profile/GalleryHome.jsx'
import GalleryAlbum from './pages/profile/GalleryAlbum.jsx'
import RecipesIndex from './pages/profile/RecipesIndex.jsx'
import RecipePost from './pages/profile/RecipePost.jsx'
import Projects from './pages/profile/Projects.jsx'
import CustomPage from './pages/profile/CustomPage.jsx'

// Dashboard pages
import Overview from './pages/dashboard/Overview.jsx'
import Profile from './pages/dashboard/Profile.jsx'
import Appearance from './pages/dashboard/Appearance.jsx'
import Features from './pages/dashboard/Features.jsx'
import Blog from './pages/dashboard/Blog.jsx'
import BlogEdit from './pages/dashboard/BlogEdit.jsx'
import DashAbout from './pages/dashboard/About.jsx'
import Gallery from './pages/dashboard/Gallery.jsx'
import AlbumView from './pages/dashboard/AlbumView.jsx'
import Recipes from './pages/dashboard/Recipes.jsx'
import RecipeEdit from './pages/dashboard/RecipeEdit.jsx'
import DashProjects from './pages/dashboard/Projects.jsx'
import ProjectEdit from './pages/dashboard/ProjectEdit.jsx'
import Homepage from './pages/dashboard/Homepage.jsx'
import CustomPages from './pages/dashboard/CustomPages.jsx'
import CustomPageEdit from './pages/dashboard/CustomPageEdit.jsx'
import NavConfig from './pages/dashboard/NavConfig.jsx'

// Admin pages
import AdminUsers from './pages/admin/Users.jsx'
import AdminContent from './pages/admin/Content.jsx'
import AdminSettings from './pages/admin/Settings.jsx'
import AdminAppearance from './pages/admin/Appearance.jsx'

// Default site-level theme (neutral; per-user profile pages use their own theme).
const siteTheme = createTheme({
  palette: {
    primary: { main: '#4a7c59' },
    background: { default: '#fafaf8' },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
  },
})

export default function App() {
  return (
    <ThemeProvider theme={siteTheme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Per-user profile routes — each wrapped in per-user themed layout */}
            <Route path="/u/:username" element={<ProfileLayout />}>
              <Route index element={<UserHome />} />
              <Route path="blog" element={<BlogIndex />} />
              <Route path="blog/:slug" element={<BlogPost />} />
              <Route path="about" element={<About />} />
              <Route path="gallery" element={<GalleryHome />} />
              <Route path="gallery/:album" element={<GalleryAlbum />} />
              <Route path="gallery/:album/:subalbum" element={<GalleryAlbum />} />
              <Route path="recipes" element={<RecipesIndex />} />
              <Route path="recipes/:slug" element={<RecipePost />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:slug" element={<Projects />} />
              <Route path="pages/:slug" element={<CustomPage />} />
            </Route>

            {/* Dashboard / settings routes */}
            <Route element={<SettingsLayout />}>
              <Route path="/dashboard" element={<Overview />} />
              <Route path="/dashboard/profile" element={<Profile />} />
              <Route path="/dashboard/appearance" element={<Appearance />} />
              <Route path="/dashboard/features" element={<Features />} />
              <Route path="/dashboard/blog" element={<Blog />} />
              <Route path="/dashboard/blog/:id" element={<BlogEdit />} />
              <Route path="/dashboard/about" element={<DashAbout />} />
              <Route path="/dashboard/gallery" element={<Gallery />} />
              <Route path="/dashboard/gallery/albums/:id" element={<AlbumView />} />
              <Route path="/dashboard/recipes" element={<Recipes />} />
              <Route path="/dashboard/recipes/:id" element={<RecipeEdit />} />
              <Route path="/dashboard/projects" element={<DashProjects />} />
              <Route path="/dashboard/projects/:id" element={<ProjectEdit />} />
              <Route path="/dashboard/homepage" element={<Homepage />} />
              <Route path="/dashboard/custom-pages" element={<CustomPages />} />
              <Route path="/dashboard/custom-pages/:id" element={<CustomPageEdit />} />
              <Route path="/dashboard/nav-config" element={<NavConfig />} />

              {/* Admin routes */}
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/content" element={<AdminContent />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/appearance" element={<AdminAppearance />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
