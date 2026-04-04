import React, { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableHead,
  TableRow, IconButton, Chip, CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Paper,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import client from '../../api/client.js'

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    try {
      const res = await client.get('/dashboard/blog')
      setPosts(res.data.posts || res.data || [])
    } catch {
      setError('Failed to load posts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await client.delete(`/dashboard/blog/${deleteId}`)
      setPosts((ps) => ps.filter((p) => p.id !== deleteId))
      setDeleteId(null)
    } catch {
      setError('Failed to delete post.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Blog</Typography>
        <Button
          component={RouterLink}
          to="/dashboard/blog/new"
          variant="contained"
          startIcon={<AddIcon />}
        >
          New post
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {posts.length === 0 ? (
        <Typography color="text.secondary">No posts yet. Create your first one.</Typography>
      ) : (
        <Paper elevation={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id} hover>
                  <TableCell>{post.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={post.published ? 'Published' : 'Draft'}
                      size="small"
                      color={post.published ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {post.created_at && new Date(post.created_at).toLocaleDateString('en-AU')}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      component={RouterLink}
                      to={`/dashboard/blog/${post.id}`}
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteId(post.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete post?</DialogTitle>
        <DialogContent>
          <Typography>This action cannot be undone.</Typography>
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
