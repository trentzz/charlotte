import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea, Button,
} from '@mui/material'
import { useAuth } from '../../context/AuthContext.jsx'
import ArticleIcon from '@mui/icons-material/Article'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import WorkIcon from '@mui/icons-material/Work'
import PersonIcon from '@mui/icons-material/Person'
import PaletteIcon from '@mui/icons-material/Palette'

const QUICK_LINKS = [
  { label: 'Edit profile', href: '/dashboard/profile', icon: <PersonIcon /> },
  { label: 'Appearance', href: '/dashboard/appearance', icon: <PaletteIcon /> },
  { label: 'Blog', href: '/dashboard/blog', icon: <ArticleIcon /> },
  { label: 'Gallery', href: '/dashboard/gallery', icon: <PhotoLibraryIcon /> },
  { label: 'Recipes', href: '/dashboard/recipes', icon: <MenuBookIcon /> },
  { label: 'Projects', href: '/dashboard/projects', icon: <WorkIcon /> },
]

export default function Overview() {
  const { user } = useAuth()

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Welcome back, {user?.display_name || user?.username}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your personal site from here.
      </Typography>

      <Button
        component={RouterLink}
        to={`/u/${user?.username}`}
        variant="outlined"
        sx={{ mb: 4 }}
      >
        View my page →
      </Button>

      <Typography variant="h6" fontWeight={600} gutterBottom>
        Quick links
      </Typography>
      <Grid container spacing={2}>
        {QUICK_LINKS.map((link) => (
          <Grid item xs={12} sm={6} md={4} key={link.href}>
            <Card elevation={1}>
              <CardActionArea component={RouterLink} to={link.href}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: 'primary.main' }}>{link.icon}</Box>
                  <Typography fontWeight={500}>{link.label}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
