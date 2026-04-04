import React, { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Button, Grid, Card, CardContent, CardMedia,
  CardActions, IconButton, CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Stack,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
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
      await client.put(`/dashboard/gallery/albums/${editAlbum.id}`, form)
      setAlbums((a) => a.map((al) => al.id === editAlbum.id ? { ...al, ...form } : al))
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
            const cover = album.cover_path
              ? (album.cover_path.startsWith('/') ? album.cover_path : `/${album.cover_path}`)
              : null

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
                  {cover && (
                    <CardMedia component="img" height={160} image={cover} alt={album.title} sx={{ borderRadius: 0 }} />
                  )}
                  <CardContent>
                    <Typography fontWeight={600}>{album.title}</Typography>
                    {album.description && (
                      <Typography variant="body2" color="text.secondary">{album.description}</Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {album.photo_count ?? 0} photos
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <IconButton
                      component={RouterLink}
                      to={`/dashboard/gallery/albums/${album.id}`}
                      size="small"
                      title="Open album"
                    >
                      <FolderOpenIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setEditAlbum(album)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(album.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
