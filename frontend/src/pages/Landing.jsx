import React, { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  CardActionArea, Avatar, CircularProgress, Alert,
} from '@mui/material'
import client from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Landing() {
  const { user } = useAuth()
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
      } catch (err) {
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
    <Box>
      {/* Hero */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          py: { xs: 8, md: 12 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" fontWeight={700} gutterBottom>
            {settings?.site_name || 'Charlotte'}
          </Typography>
          {settings?.description && (
            <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
              {settings.description}
            </Typography>
          )}
          {!user && (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {settings?.registration_open && (
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  size="large"
                  sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
                >
                  Get started
                </Button>
              )}
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                size="large"
                sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                Log in
              </Button>
            </Box>
          )}
          {user && (
            <Button
              component={RouterLink}
              to="/dashboard"
              variant="contained"
              size="large"
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
            >
              Go to dashboard
            </Button>
          )}
        </Container>
      </Box>

      {/* User directory */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {users.length > 0 && (
          <>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Members
            </Typography>
            <Grid container spacing={3}>
              {users.map((u) => (
                <Grid item xs={12} sm={6} md={4} key={u.username}>
                  <Card elevation={1}>
                    <CardActionArea component={RouterLink} to={`/u/${u.username}`}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          src={u.avatar_path ? (u.avatar_path.startsWith('/') ? u.avatar_path : `/${u.avatar_path}`) : undefined}
                          sx={{ width: 56, height: 56 }}
                        >
                          {(u.display_name || u.username)[0]?.toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600}>
                            {u.display_name || u.username}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            @{u.username}
                          </Typography>
                          {u.bio && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}
                            >
                              {u.bio}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>
    </Box>
  )
}
