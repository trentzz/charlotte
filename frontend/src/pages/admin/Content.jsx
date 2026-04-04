import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, CircularProgress, Alert, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Chip, Tabs, Tab,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import client from '../../api/client.js'

function ContentTable({ items, onDelete, typeLabel }) {
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await onDelete(deleteId)
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ p: 2 }}>No {typeLabel.toLowerCase()} to moderate.</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Title / Description</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.username || item.user?.username || '—'}</TableCell>
                <TableCell>{item.title || item.caption || item.name || '—'}</TableCell>
                <TableCell>
                  {item.created_at && new Date(item.created_at).toLocaleDateString('en-AU')}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="error" onClick={() => setDeleteId(item.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete {typeLabel}?</DialogTitle>
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
    </>
  )
}

export default function AdminContent() {
  const [data, setData] = useState({ posts: [], photos: [], recipes: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(0)

  async function load() {
    try {
      const res = await client.get('/admin/content')
      setData(res.data || {})
    } catch {
      setError('Failed to load content.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function deletePost(id) {
    await client.delete(`/admin/content/posts/${id}`)
    setData((d) => ({ ...d, posts: d.posts.filter((p) => p.id !== id) }))
  }

  async function deletePhoto(id) {
    await client.delete(`/admin/content/photos/${id}`)
    setData((d) => ({ ...d, photos: d.photos.filter((p) => p.id !== id) }))
  }

  async function deleteRecipe(id) {
    await client.delete(`/admin/content/recipes/${id}`)
    setData((d) => ({ ...d, recipes: d.recipes.filter((r) => r.id !== id) }))
  }

  if (loading) return <CircularProgress />

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Content moderation</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Posts (${data.posts?.length ?? 0})`} />
        <Tab label={`Photos (${data.photos?.length ?? 0})`} />
        <Tab label={`Recipes (${data.recipes?.length ?? 0})`} />
      </Tabs>

      <Paper elevation={1}>
        {tab === 0 && (
          <ContentTable items={data.posts || []} onDelete={deletePost} typeLabel="Post" />
        )}
        {tab === 1 && (
          <ContentTable items={data.photos || []} onDelete={deletePhoto} typeLabel="Photo" />
        )}
        {tab === 2 && (
          <ContentTable items={data.recipes || []} onDelete={deleteRecipe} typeLabel="Recipe" />
        )}
      </Paper>
    </Box>
  )
}
