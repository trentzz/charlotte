import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, Grid, Card, CardActionArea,
  CardMedia, CardContent, CircularProgress, Alert, Divider,
} from '@mui/material'
import client from '../../api/client.js'

function AlbumCard({ album, username }) {
  const cover = album.cover_path
    ? (album.cover_path.startsWith('/') ? album.cover_path : `/${album.cover_path}`)
    : null

  return (
    <Card elevation={1} sx={{ borderRadius: 0 }}>
      <CardActionArea component={RouterLink} to={`/u/${username}/gallery/${album.slug}`}>
        {cover && (
          <CardMedia
            component="img"
            height={200}
            image={cover}
            alt={album.title}
            sx={{ borderRadius: 0, objectFit: 'cover' }}
          />
        )}
        <CardContent>
          <Typography variant="h6" fontWeight={600}>
            {album.title}
          </Typography>
          {album.photo_count !== undefined && (
            <Typography variant="body2" color="text.secondary">
              {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
            </Typography>
          )}
          {album.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {album.description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default function GalleryHome() {
  const { username } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      <Typography variant="h3" fontWeight={700} gutterBottom>
        Gallery
      </Typography>
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
