import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Container, Typography, Box, CircularProgress, Alert,
  Divider, Link, Button, Stack,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import client from '../../api/client.js'
import PhotoGrid from '../../components/PhotoGrid.jsx'

export default function GalleryAlbum() {
  const { username, album } = useParams()
  const navigate = useNavigate()
  const theme = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // 'own' | 'all' — 'all' fetches with ?filter=all
  const [filter, setFilter] = useState('all')
  const [filteredPhotos, setFilteredPhotos] = useState(null)
  const [filterLoading, setFilterLoading] = useState(false)

  useEffect(() => {
    setData(null)
    setFilteredPhotos(null)
    setFilter('all')
    setLoading(true)
    client.get(`/u/${username}/gallery/${album}?filter=all`)
      .then((res) => setData(res.data))
      .catch(() => setError('Album not found.'))
      .finally(() => setLoading(false))
  }, [username, album])

  async function switchFilter(newFilter) {
    if (newFilter === filter) return
    setFilter(newFilter)
    if (newFilter === 'all') {
      setFilteredPhotos(null)
      return
    }
    // 'own' — fetch without ?filter=all
    setFilterLoading(true)
    try {
      const res = await client.get(`/u/${username}/gallery/${album}`)
      setFilteredPhotos(res.data.photos || [])
    } catch {
      // fall back to showing all photos
    } finally {
      setFilterLoading(false)
    }
  }

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
  const subAlbums = data?.sub_albums || []
  const hasSubAlbums = subAlbums.length > 0
  const photos = filteredPhotos !== null ? filteredPhotos : (data?.photos || [])
  const photoCount = photos.length

  return (
    <Box sx={{ py: 6 }}>
      {/* Editorial header — centred, display font */}
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

      {/* Sub-album navigation */}
      {hasSubAlbums && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant={filter === 'all' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => switchFilter('all')}
              sx={{ borderRadius: 4 }}
            >
              All
            </Button>
            <Button
              variant={filter === 'own' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => switchFilter('own')}
              sx={{ borderRadius: 4 }}
            >
              {albumData?.title}
            </Button>
            {subAlbums.map((sub) => (
              <Button
                key={sub.id}
                variant="outlined"
                size="small"
                component={RouterLink}
                to={`/u/${username}/gallery/${sub.slug}`}
                sx={{ borderRadius: 4 }}
              >
                {sub.title}
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      {/* Thin editorial divider */}
      <Divider sx={{ mb: 3, mx: { xs: 2, md: 6 } }} />

      {filterLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : photos.length === 0 ? (
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
