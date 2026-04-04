import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, CircularProgress, Alert,
  Divider, Link,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import client from '../../api/client.js'
import PhotoGrid from '../../components/PhotoGrid.jsx'

export default function GalleryAlbum() {
  const { username, album } = useParams()
  const theme = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get(`/u/${username}/gallery/${album}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Album not found.'))
      .finally(() => setLoading(false))
  }, [username, album])

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

  const albumData = data?.album
  const photos = data?.photos || []
  const photoCount = photos.length

  return (
    <Box sx={{ py: 6 }}>
      {/* Sean Tucker editorial header — centered, display font */}
      <Box sx={{ textAlign: 'center', mb: 4, px: 2 }}>
        <Typography
          variant="h2"
          sx={{
            fontFamily: theme.typography.h2.fontFamily,
            fontWeight: 400,
            mb: 1,
          }}
        >
          {albumData?.title}
        </Typography>
        <Typography
          variant="subtitle1"
          color="text.secondary"
          sx={{ mb: albumData?.description ? 1.5 : 0 }}
        >
          {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
        </Typography>
        {albumData?.description && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ fontStyle: 'italic', maxWidth: 560, mx: 'auto' }}
          >
            {albumData.description}
          </Typography>
        )}
      </Box>

      {/* Thin editorial divider */}
      <Divider sx={{ mb: 3, mx: { xs: 2, md: 6 } }} />

      {/* 3-column photo grid, no border radius, 3px gap */}
      {photos.length === 0 ? (
        <Container>
          <Typography color="text.secondary">No photos in this album.</Typography>
        </Container>
      ) : (
        <PhotoGrid photos={photos} />
      )}

      {/* Back link */}
      <Container sx={{ mt: 4 }}>
        <Link component={RouterLink} to={`/u/${username}/gallery`} underline="hover">
          ← Back to gallery
        </Link>
      </Container>
    </Box>
  )
}
