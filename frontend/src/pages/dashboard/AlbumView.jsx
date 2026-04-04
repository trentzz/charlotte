import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Button, CircularProgress, Alert, Grid,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Link,
} from '@mui/material'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import DeleteIcon from '@mui/icons-material/Delete'
import client from '../../api/client.js'
import Lightbox from '../../components/Lightbox.jsx'

export default function AlbumView() {
  const { id } = useParams()
  const [album, setAlbum] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  async function load() {
    try {
      const res = await client.get(`/dashboard/gallery/albums/${id}`)
      setAlbum(res.data.album)
      setPhotos(res.data.photos || [])
    } catch {
      setError('Failed to load album.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('album_id', id)
      for (const file of files) {
        fd.append('photos', file)
      }
      const res = await client.post(`/dashboard/gallery/photos`, fd)
      const newPhotos = res.data.uploaded || []
      setPhotos((ps) => [...ps, ...newPhotos])
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await client.delete(`/dashboard/gallery/photos/${deleteId}`)
      setPhotos((ps) => ps.filter((p) => p.id !== deleteId))
      setDeleteId(null)
    } catch {
      setError('Failed to delete photo.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>{album?.title || 'Album'}</Typography>
        <Button
          component="label"
          variant="contained"
          startIcon={<AddPhotoAlternateIcon />}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Add photos'}
          <input type="file" hidden accept="image/*" multiple onChange={handleUpload} />
        </Button>
      </Box>

      <Link component={RouterLink} to="/dashboard/gallery" underline="hover" sx={{ fontSize: 13, mb: 3, display: 'block' }}>
        ← Back to albums
      </Link>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {photos.length === 0 ? (
        <Typography color="text.secondary">No photos yet. Upload some to get started.</Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '3px',
          }}
        >
          {photos.map((photo, i) => {
            const rawSrc = photo.url || photo.path || ''
            const src = rawSrc.startsWith('/') ? rawSrc : `/${rawSrc}`
            return (
              <Box key={photo.id || i} sx={{ position: 'relative', '&:hover .del-btn': { opacity: 1 } }}>
                <Box
                  component="img"
                  src={src}
                  alt={photo.caption || ''}
                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                  sx={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    objectFit: 'cover',
                    borderRadius: 0,
                    display: 'block',
                    cursor: 'pointer',
                  }}
                />
                <IconButton
                  className="del-btn"
                  size="small"
                  onClick={() => setDeleteId(photo.id)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    opacity: 0,
                    transition: 'opacity 0.15s',
                    '&:hover': { bgcolor: 'rgba(200,0,0,0.7)' },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )
          })}
        </Box>
      )}

      <Lightbox
        open={lightboxOpen}
        photos={photos}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => setLightboxIndex((i) => (i - 1 + photos.length) % photos.length)}
        onNext={() => setLightboxIndex((i) => (i + 1) % photos.length)}
      />

      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete photo?</DialogTitle>
        <DialogContent>
          <Typography>This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
