import React, { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Button, Grid, Card, CardContent, CardMedia,
  CardActions, IconButton, CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Stack,
  Chip, Tooltip, Switch, FormControlLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import client from '../../api/client.js'

function AlbumForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || { title: '', description: '' })
  function handle(e) { setForm((f) => ({ ...f, [e.target.name]: e.target.value })) }
  return (
    <Stack spacing={2}>
      <TextField label="Title" name="title" value={form.title} onChange={handle} required />
      <TextField label="Description" name="description" value={form.description} onChange={handle} multiline rows={2} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={() => onSave(form)} disabled={saving || !form.title}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
      </Box>
    </Stack>
  )
}

export default function Gallery() {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editAlbum, setEditAlbum] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    try {
      const res = await client.get('/dashboard/gallery')
      setAlbums(res.data.albums || res.data || [])
    } catch {
      setError('Failed to load albums.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(form) {
    setSaving(true)
    try {
      const res = await client.post('/dashboard/gallery/albums', form)
      setAlbums((a) => [...a, res.data.album || res.data])
      setShowCreate(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create album.')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(form) {
    setSaving(true)
    try {
      const res = await client.put(`/dashboard/gallery/albums/${editAlbum.id}`, form)
      setAlbums((a) => a.map((al) => al.id === editAlbum.id ? { ...al, ...res.data } : al))
      setEditAlbum(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update album.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await client.delete(`/dashboard/gallery/albums/${deleteId}`)
      setAlbums((a) => a.filter((al) => al.id !== deleteId))
      setDeleteId(null)
    } catch {
      setError('Failed to delete album.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleTogglePublish(album) {
    try {
      const res = await client.patch(`/dashboard/gallery/albums/${album.id}/toggle`)
      const published = res.data.published ?? !album.published
      setAlbums((a) => a.map((al) => al.id === album.id ? { ...al, published } : al))
    } catch {
      setError('Failed to update publish status.')
    }
  }

  async function handleSetDefault(album) {
    try {
      await client.patch(`/dashboard/gallery/albums/${album.id}/default`)
      // Mark the new default and clear the old one.
      setAlbums((a) => a.map((al) => ({ ...al, is_default: al.id === album.id })))
    } catch {
      setError('Failed to set default album.')
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Gallery</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
          New album
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {showCreate && (
        <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>New album</Typography>
          <AlbumForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
        </Box>
      )}

      {albums.length === 0 && !showCreate ? (
        <Typography color="text.secondary">No albums yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {albums.map((album) => {
            const coverUrl = album.cover_photo?.url || null

            if (editAlbum?.id === album.id) {
              return (
                <Grid item xs={12} sm={6} md={4} key={album.id}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <AlbumForm
                      initial={{ title: album.title, description: album.description || '' }}
                      onSave={handleEdit}
                      onCancel={() => setEditAlbum(null)}
                      saving={saving}
                    />
                  </Box>
                </Grid>
              )
            }

            return (
              <Grid item xs={12} sm={6} md={4} key={album.id}>
                <Card elevation={1}>
                  {coverUrl && (
                    <CardMedia component="img" height={160} image={coverUrl} alt={album.title} sx={{ borderRadius: 0 }} />
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography fontWeight={600}>{album.title}</Typography>
                      {album.is_default && (
                        <Chip
                          icon={<StarIcon fontSize="small" />}
                          label="Default"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      {album.parent_id && (() => {
                        const parent = albums.find((a) => a.id === album.parent_id)
                        return (
                          <Chip
                            label={`Subalbum of ${parent?.title ?? '…'}`}
                            size="small"
                            variant="outlined"
                          />
                        )
                      })()}
                    </Box>
                    {album.description && (
                      <Typography variant="body2" color="text.secondary">{album.description}</Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {album.photo_count ?? 0} photos
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Tooltip title="Open album">
                      <IconButton
                        component={RouterLink}
                        to={`/dashboard/gallery/albums/${album.id}`}
                        size="small"
                      >
                        <FolderOpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit album">
                      <IconButton size="small" onClick={() => setEditAlbum(album)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={album.published ? 'Unpublish album' : 'Publish album'}>
                      <IconButton size="small" onClick={() => handleTogglePublish(album)}>
                        {album.published
                          ? <VisibilityIcon fontSize="small" />
                          : <VisibilityOffIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={album.is_default ? 'Default upload album' : 'Set as default upload album'}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleSetDefault(album)}
                          disabled={album.is_default}
                          color={album.is_default ? 'primary' : 'default'}
                        >
                          {album.is_default
                            ? <StarIcon fontSize="small" />
                            : <StarBorderIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete album">
                      <IconButton size="small" color="error" onClick={() => setDeleteId(album.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete album?</DialogTitle>
        <DialogContent>
          <Typography>This will delete the album and all its photos. This cannot be undone.</Typography>
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
