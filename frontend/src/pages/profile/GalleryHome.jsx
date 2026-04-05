import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, Grid, Card, CardActionArea,
  CardMedia, CardContent, CircularProgress, Alert, Divider,
  Tooltip, IconButton,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import client from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'

function AlbumCard({ album, username }) {
  const cover = album.cover_url || null

  return (
    <Card elevation={0} sx={{ borderRadius: 2, background: 'transparent' }}>
      <CardActionArea component={RouterLink} to={`/u/${username}/gallery/${album.slug}`}>
        {cover && (
          <CardMedia
            component="img"
            height={200}
            image={cover}
            alt={album.title}
            sx={{ objectFit: 'cover', borderRadius: 1 }}
          />
        )}
        <CardContent sx={{ textAlign: 'center', px: 0 }}>
          <Typography variant="h6" fontWeight={600}>
            {album.title}
          </Typography>
          {album.photo_count !== undefined && (
            <Typography variant="body2" color="text.secondary">
              {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default function GalleryHome() {
  const { username } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isOwner = user?.username?.toLowerCase() === username?.toLowerCase()

  useEffect(() => {
    client.get(`/u/${username}/gallery`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.status === 404 ? null : 'Failed to load gallery.'))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
      <CircularProgress />
    </Box>
  )

  if (error) return (
    <Container sx={{ py: 4 }}>
      <Alert severity="error">{error}</Alert>
    </Container>
  )

  const albums = data?.albums || []
  const recentPhotos = data?.recent_photos || []

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h3" fontWeight={700} gutterBottom sx={{ flex: 1, mb: 0 }}>
          Gallery
        </Typography>
        {isOwner && (
          <Tooltip title="Edit gallery">
            <IconButton component={RouterLink} to="/dashboard/gallery" size="small">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Divider sx={{ mb: 4 }} />

      {albums.length === 0 ? (
        <Typography color="text.secondary">No albums yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {albums.map((album) => (
            <Grid item xs={12} sm={6} md={4} key={album.slug || album.id}>
              <AlbumCard album={album} username={username} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}
