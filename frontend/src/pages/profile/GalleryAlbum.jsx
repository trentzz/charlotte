import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Container, Typography, Box, CircularProgress, Alert,
  Divider, Link, Button, Stack, Tooltip, IconButton,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import client from '../../api/client.js'
import PhotoGrid from '../../components/PhotoGrid.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function GalleryAlbum() {
  const { username, album, subalbum } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const theme = useTheme()
  const isOwner = user?.username?.toLowerCase() === username?.toLowerCase()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // activeSubId: null = show all photos, otherwise the sub-album ID whose photos are shown
  const [activeSubId, setActiveSubId] = useState(null)
  // subPhotos: photos fetched for the currently active sub-album
  const [subPhotos, setSubPhotos] = useState(null)
  const [subLoading, setSubLoading] = useState(false)

  useEffect(() => {
    setData(null)
    setActiveSubId(null)
    setSubPhotos(null)
    setLoading(true)
    setError(null)

    // Always fetch the parent album — `album` param is always the parent slug.
    client.get(`/u/${username}/gallery/${album}?filter=all`)
      .then((res) => {
        const d = res.data
        setData(d)

        if (subalbum) {
          // Find the sub-album whose slug matches the URL param.
          const sub = (d.sub_albums || []).find((s) => s.slug === subalbum)
          if (sub) {
            setActiveSubId(sub.id)
            setSubLoading(true)
            client.get(`/u/${username}/gallery/${subalbum}`)
              .then((r) => setSubPhotos(r.data?.photos || []))
              .catch(() => setSubPhotos([]))
              .finally(() => setSubLoading(false))
          } else {
            // Sub-album slug not found — fall back to parent view.
            setActiveSubId(null)
          }
        } else {
          // No subalbum param — check for a configured default child.
          const defaultSub = (d.sub_albums || []).find(
            (s) => s.id === d.album?.default_child_id,
          )
          if (defaultSub) {
            navigate(`/u/${username}/gallery/${album}/${defaultSub.slug}`, { replace: true })
          } else {
            setActiveSubId(null)
          }
        }
      })
      .catch(() => setError('Album not found.'))
      .finally(() => setLoading(false))
  }, [username, album, subalbum])

  function selectSub(sub) {
    navigate(`/u/${username}/gallery/${album}/${sub.slug}`)
  }

  function selectAll() {
    navigate(`/u/${username}/gallery/${album}`)
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

  // Determine which photos to display.
  const photos = activeSubId !== null && subPhotos !== null
    ? subPhotos
    : (data?.photos || [])
  const photoCount = photos.length

  return (
    <Box sx={{ py: 6 }}>
      {/* Editorial header — centred, display font */}
      <Box sx={{ textAlign: 'center', mb: 4, px: 2, position: 'relative' }}>
        {isOwner && (
          <Tooltip title="Edit gallery">
            <IconButton
              component={RouterLink}
              to="/dashboard/gallery"
              size="small"
              sx={{ position: 'absolute', top: 0, right: 8 }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
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

      {/* Sub-album tabs — navigate to URL on select */}
      {hasSubAlbums && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant={activeSubId === null ? 'contained' : 'outlined'}
              size="small"
              onClick={selectAll}
              sx={{ borderRadius: 4 }}
            >
              All
            </Button>
            {subAlbums.map((sub) => (
              <Button
                key={sub.id}
                variant={activeSubId === sub.id ? 'contained' : 'outlined'}
                size="small"
                onClick={() => selectSub(sub)}
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

      {subLoading ? (
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
