import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Button, CircularProgress, Alert,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Link,
  Chip, Stack, Checkbox, Tooltip, TextField, FormControlLabel, Switch,
} from '@mui/material'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import LibraryAddIcon from '@mui/icons-material/LibraryAdd'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import RotateLeftIcon from '@mui/icons-material/RotateLeft'
import RotateRightIcon from '@mui/icons-material/RotateRight'
import Masonry from 'react-masonry-css'
import client from '../../api/client.js'
import Lightbox from '../../components/Lightbox.jsx'

const breakpointColumns = {
  default: 3,
  900: 2,
  600: 1,
}

// Modal for picking existing photos to add to this album.
function ExistingPhotoPicker({ open, albumID, alreadyInAlbum, onClose, onAdded }) {
  const [allPhotos, setAllPhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSelected(new Set())
    setError(null)
    client.get('/dashboard/gallery/photos')
      .then((res) => setAllPhotos(res.data.photos || []))
      .catch(() => setError('Failed to load photos.'))
      .finally(() => setLoading(false))
  }, [open])

  function toggleSelect(id) {
    if (alreadyInAlbum.has(id)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAdd() {
    if (selected.size === 0) return
    setAdding(true)
    setError(null)
    const ids = Array.from(selected)
    const added = []
    try {
      for (const photoID of ids) {
        await client.post(`/dashboard/gallery/albums/${albumID}/photos`, { photo_id: photoID })
        const photo = allPhotos.find((p) => p.id === photoID)
        if (photo) added.push(photo)
      }
      onAdded(added)
      onClose()
    } catch {
      setError('Failed to add some photos.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add existing photos</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <CircularProgress />
        ) : allPhotos.length === 0 ? (
          <Typography color="text.secondary">No photos found.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1, mt: 1 }}>
            {allPhotos.map((photo) => {
              const rawSrc = photo.compressed_url || photo.url || photo.path || ''
              const src = rawSrc.startsWith('/') ? rawSrc : `/${rawSrc}`
              const inAlbum = alreadyInAlbum.has(photo.id)
              const isSelected = selected.has(photo.id)
              return (
                <Tooltip
                  key={photo.id}
                  title={inAlbum ? 'Already in this album' : isSelected ? 'Click to deselect' : 'Click to select'}
                >
                  <Box
                    onClick={() => toggleSelect(photo.id)}
                    sx={{
                      position: 'relative',
                      cursor: inAlbum ? 'not-allowed' : 'pointer',
                      opacity: inAlbum ? 0.45 : 1,
                      border: isSelected ? '2px solid' : '2px solid transparent',
                      borderColor: isSelected ? 'primary.main' : 'transparent',
                    }}
                  >
                    <Box
                      component="img"
                      src={src}
                      alt={photo.caption || ''}
                      sx={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                    />
                    {isSelected && (
                      <Checkbox
                        checked
                        size="small"
                        sx={{
                          position: 'absolute', top: 2, right: 2,
                          bgcolor: 'white', borderRadius: '50%', p: 0.25,
                        }}
                      />
                    )}
                    {inAlbum && (
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          textAlign: 'center', bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', py: 0.25,
                        }}
                      >
                        Added
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={adding}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={adding || selected.size === 0}
          startIcon={<AddIcon />}
        >
          {adding ? 'Adding…' : `Add selected (${selected.size})`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function AlbumView() {
  const { id } = useParams()
  const [album, setAlbum] = useState(null)
  const [photos, setPhotos] = useState([])
  const [allPhotos, setAllPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [removeId, setRemoveId] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [subAlbumDialogOpen, setSubAlbumDialogOpen] = useState(false)
  const [subAlbumTitle, setSubAlbumTitle] = useState('')
  const [subAlbumSaving, setSubAlbumSaving] = useState(false)
  const [highRes, setHighRes] = useState(false)
  // 'own' = just this album, 'all' = this album + sub-albums, or a sub-album ID (number)
  const [view, setView] = useState('own')
  // Photos for the currently selected sub-album tab
  const [subPhotos, setSubPhotos] = useState([])
  const [subLoading, setSubLoading] = useState(false)
  // Parent album info for breadcrumb (only set when this is a sub-album)
  const [parentAlbum, setParentAlbum] = useState(null)

  const displayedPhotos = typeof view === 'number' ? subPhotos
    : view === 'all' ? allPhotos
    : photos

  const load = useCallback(async () => {
    try {
      const res = await client.get(`/dashboard/gallery/albums/${id}`)
      const a = res.data.album
      setAlbum(a)
      setPhotos(res.data.photos || [])
      setAllPhotos(res.data.all_photos || [])
      // If this is a sub-album, fetch the parent for the breadcrumb.
      if (a?.parent_id) {
        client.get(`/dashboard/gallery/albums/${a.parent_id}`)
          .then((r) => setParentAlbum(r.data.album || null))
          .catch(() => setParentAlbum({ id: a.parent_id, title: 'Parent album' }))
      } else {
        setParentAlbum(null)
      }
    } catch {
      setError('Failed to load album.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Reset view when navigating to a different album.
  useEffect(() => {
    setView('own')
    setSubPhotos([])
    setParentAlbum(null)
  }, [id])

  async function selectSubView(sub) {
    if (view === sub.id) return
    setView(sub.id)
    setSubLoading(true)
    try {
      const res = await client.get(`/dashboard/gallery/albums/${sub.id}`)
      setSubPhotos(res.data.photos || [])
    } catch {
      setSubPhotos([])
    } finally {
      setSubLoading(false)
    }
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    setError(null)
    let failed = 0
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('album_id', id)
        fd.append('photos', file)
        try {
          const res = await client.post(`/dashboard/gallery/photos`, fd)
          const newPhotos = res.data.uploaded || []
          setPhotos((ps) => [...ps, ...newPhotos])
          setAllPhotos((ps) => [...ps, ...newPhotos])
          failed += res.data.failed || 0
        } catch {
          failed++
        }
      }
      if (failed > 0) {
        setError(`${failed} file(s) failed to upload.`)
      }
    } finally {
      setUploading(false)
    }
  }

  function handlePickerAdded(added) {
    setPhotos((ps) => {
      const ids = new Set(ps.map((p) => p.id))
      return [...ps, ...added.filter((p) => !ids.has(p.id))]
    })
    setAllPhotos((ps) => {
      const ids = new Set(ps.map((p) => p.id))
      return [...ps, ...added.filter((p) => !ids.has(p.id))]
    })
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await client.delete(`/dashboard/gallery/photos/${deleteId}`)
      setPhotos((ps) => ps.filter((p) => p.id !== deleteId))
      setAllPhotos((ps) => ps.filter((p) => p.id !== deleteId))
      setDeleteId(null)
    } catch {
      setError('Failed to delete photo.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleCreateSubAlbum() {
    if (!subAlbumTitle.trim()) return
    setSubAlbumSaving(true)
    try {
      await client.post('/dashboard/gallery/albums', {
        title: subAlbumTitle.trim(),
        parent_id: parseInt(id, 10),
      })
      setSubAlbumTitle('')
      setSubAlbumDialogOpen(false)
      // Reload to pick up the new sub-album in the list.
      await load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create sub-album.')
    } finally {
      setSubAlbumSaving(false)
    }
  }

  async function handleTogglePublish() {
    try {
      const res = await client.patch(`/dashboard/gallery/albums/${id}/toggle`)
      const published = res.data.published ?? !album.published
      setAlbum((a) => ({ ...a, published }))
    } catch {
      setError('Failed to update publish status.')
    }
  }

  async function handleSetDefault() {
    try {
      await client.patch(`/dashboard/gallery/albums/${id}/default`)
      setAlbum((a) => ({ ...a, is_default: true }))
    } catch {
      setError('Failed to set default album.')
    }
  }

  async function handleRemoveFromAlbum() {
    if (!removeId) return
    setRemoving(true)
    try {
      await client.delete(`/dashboard/gallery/albums/${id}/photos/${removeId}`)
      setPhotos((ps) => ps.filter((p) => p.id !== removeId))
      setAllPhotos((ps) => ps.filter((p) => p.id !== removeId))
      setRemoveId(null)
    } catch {
      setError('Failed to remove photo from album.')
    } finally {
      setRemoving(false)
    }
  }

  async function handleRotate(photoId, degrees) {
    try {
      const res = await client.patch(`/dashboard/gallery/photos/${photoId}/rotate`, { degrees })
      setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, version: res.version } : p))
      setAllPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, version: res.version } : p))
      setSubPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, version: res.version } : p))
    } catch {
      setError('Failed to rotate photo.')
    }
  }

  // Returns the display src for a photo, preferring compressed unless highRes is active.
  // Uses photo.version (from server) for cache-busting so it persists across page reloads.
  const imgSrc = (photo) => {
    const raw = (!highRes && photo.compressed_url) ? photo.compressed_url : (photo.url || photo.path || '')
    const base = raw.startsWith('/') ? raw : `/${raw}`
    return photo.version ? `${base}?v=${photo.version}` : base
  }

  const alreadyInAlbum = new Set(photos.map((p) => p.id))
  const subAlbums = album?.sub_albums || []
  const hasSubAlbums = subAlbums.length > 0

  if (loading) return <CircularProgress />

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h5" fontWeight={700}>{album?.title || 'Album'}</Typography>
          {album?.is_default && (
            <Chip icon={<StarIcon fontSize="small" />} label="Default" size="small" color="primary" variant="outlined" />
          )}
          {album && !album.published && (
            <Chip label="Unpublished" size="small" color="default" variant="outlined" />
          )}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {album && (
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(album.published)}
                  onChange={handleTogglePublish}
                  color="success"
                />
              }
              label={album.published ? 'Published' : 'Draft'}
            />
          )}
          {album && !album.is_default && (
            <Tooltip title="Set as default upload album">
              <IconButton size="small" onClick={handleSetDefault}>
                <StarBorderIcon />
              </IconButton>
            </Tooltip>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<LibraryAddIcon />}
            onClick={() => setPickerOpen(true)}
          >
            Add existing
          </Button>
          <Button
            component="label"
            variant="contained"
            startIcon={<AddPhotoAlternateIcon />}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload photos'}
            <input type="file" hidden accept="image/*" multiple onChange={handleUpload} />
          </Button>
          <Tooltip title={highRes ? 'Showing originals — click for compressed' : 'Showing compressed — click for originals'}>
            <Button
              size="small"
              variant={highRes ? 'contained' : 'outlined'}
              onClick={() => setHighRes((h) => !h)}
            >
              {highRes ? 'Original' : 'Compressed'}
            </Button>
          </Tooltip>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CreateNewFolderIcon />}
            onClick={() => setSubAlbumDialogOpen(true)}
          >
            Sub-album
          </Button>
        </Stack>
      </Box>

      {/* Breadcrumb: show parent link for sub-albums, otherwise link back to album list */}
      {parentAlbum ? (
        <Link
          component={RouterLink}
          to={`/dashboard/gallery/albums/${parentAlbum.id}`}
          underline="hover"
          sx={{ fontSize: 13, mb: 2, display: 'block' }}
        >
          ← Back to {parentAlbum.title}
        </Link>
      ) : (
        <Link component={RouterLink} to="/dashboard/gallery" underline="hover" sx={{ fontSize: 13, mb: 2, display: 'block' }}>
          ← Back to albums
        </Link>
      )}

      {/* Sub-album / view filter tabs */}
      {hasSubAlbums && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Chip
            label="This album"
            variant={view === 'own' ? 'filled' : 'outlined'}
            onClick={() => setView('own')}
            clickable
          />
          <Chip
            label="All (inc. sub-albums)"
            variant={view === 'all' ? 'filled' : 'outlined'}
            onClick={() => setView('all')}
            clickable
          />
          {subAlbums.map((sub) => {
            const isDefault = album?.default_child_id === sub.id
            const isActive = view === sub.id
            return (
              <Box key={sub.id} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                <Chip
                  label={sub.title}
                  variant={isActive ? 'filled' : 'outlined'}
                  onClick={() => selectSubView(sub)}
                  clickable
                />
                <Tooltip title={isDefault ? 'Default landing view' : 'Set as default landing view'}>
                  <IconButton
                    size="small"
                    onClick={async () => {
                      try {
                        const childID = isDefault ? null : sub.id
                        await client.patch(`/dashboard/gallery/albums/${album.id}/default-child`, { child_id: childID })
                        setAlbum((a) => ({ ...a, default_child_id: childID }))
                      } catch {
                        setError('Failed to update default sub-album.')
                      }
                    }}
                  >
                    {isDefault ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            )
          })}
        </Stack>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {subLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : displayedPhotos.length === 0 ? (
        <Typography color="text.secondary">No photos yet. Upload some to get started.</Typography>
      ) : (
        <>
          <Masonry
            breakpointCols={breakpointColumns}
            style={{ display: 'flex', marginLeft: '-10px', width: 'auto' }}
            columnClassName="masonry-column"
          >
            {displayedPhotos.map((photo, i) => {
              return (
                <Box key={photo.id || i} sx={{ position: 'relative', marginBottom: '10px', '&:hover .action-btns': { opacity: 1 } }}>
                  <Box
                    component="img"
                    src={imgSrc(photo)}
                    alt={photo.caption || ''}
                    onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: 0,
                      display: 'block',
                      cursor: 'pointer',
                    }}
                  />
                  <Box
                    className="action-btns"
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      display: 'flex',
                      gap: 0.5,
                      opacity: 0,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <Tooltip title="Rotate left">
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleRotate(photo.id, -90) }}
                        sx={{ bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,80,160,0.8)' } }}
                      >
                        <RotateLeftIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Rotate right">
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleRotate(photo.id, 90) }}
                        sx={{ bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,80,160,0.8)' } }}
                      >
                        <RotateRightIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove from album">
                      <IconButton
                        size="small"
                        onClick={() => setRemoveId(photo.id)}
                        sx={{ bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(150,100,0,0.8)' } }}
                      >
                        <AddIcon fontSize="small" sx={{ transform: 'rotate(45deg)' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete photo">
                      <IconButton
                        size="small"
                        onClick={() => setDeleteId(photo.id)}
                        sx={{ bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(200,0,0,0.7)' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )
            })}
          </Masonry>
          <style>{`.masonry-column { padding-left: 10px; background-clip: padding-box; }`}</style>
        </>
      )}

      <Lightbox
        open={lightboxOpen}
        photos={highRes ? displayedPhotos.map((p) => ({ ...p, compressed_url: '' })) : displayedPhotos}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => setLightboxIndex((i) => (i - 1 + displayedPhotos.length) % displayedPhotos.length)}
        onNext={() => setLightboxIndex((i) => (i + 1) % displayedPhotos.length)}
      />

      {/* Remove from album confirmation */}
      <Dialog open={Boolean(removeId)} onClose={() => setRemoveId(null)}>
        <DialogTitle>Remove from album?</DialogTitle>
        <DialogContent>
          <Typography>The photo will stay in your library but be removed from this album.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveId(null)}>Cancel</Button>
          <Button onClick={handleRemoveFromAlbum} color="warning" variant="contained" disabled={removing}>
            {removing ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete photo confirmation */}
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

      <ExistingPhotoPicker
        open={pickerOpen}
        albumID={id}
        alreadyInAlbum={alreadyInAlbum}
        onClose={() => setPickerOpen(false)}
        onAdded={handlePickerAdded}
      />

      {/* Create sub-album dialog */}
      <Dialog open={subAlbumDialogOpen} onClose={() => setSubAlbumDialogOpen(false)}>
        <DialogTitle>New sub-album</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Title"
            fullWidth
            value={subAlbumTitle}
            onChange={(e) => setSubAlbumTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSubAlbum() }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubAlbumDialogOpen(false)} disabled={subAlbumSaving}>Cancel</Button>
          <Button
            onClick={handleCreateSubAlbum}
            variant="contained"
            disabled={subAlbumSaving || !subAlbumTitle.trim()}
          >
            {subAlbumSaving ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
