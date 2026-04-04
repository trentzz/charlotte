import React, { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableHead,
  TableRow, IconButton, CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Paper,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import client from '../../api/client.js'

export default function Recipes() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    try {
      const res = await client.get('/dashboard/recipes')
      setRecipes(res.data.recipes || res.data || [])
    } catch {
      setError('Failed to load recipes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await client.delete(`/dashboard/recipes/${deleteId}`)
      setRecipes((rs) => rs.filter((r) => r.id !== deleteId))
      setDeleteId(null)
    } catch {
      setError('Failed to delete recipe.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Recipes</Typography>
        <Button
          component={RouterLink}
          to="/dashboard/recipes/new"
          variant="contained"
          startIcon={<AddIcon />}
        >
          New recipe
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {recipes.length === 0 ? (
        <Typography color="text.secondary">No recipes yet.</Typography>
      ) : (
        <Paper elevation={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Cuisine</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recipes.map((recipe) => (
                <TableRow key={recipe.id} hover>
                  <TableCell>{recipe.title}</TableCell>
                  <TableCell>{recipe.cuisine || '—'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      component={RouterLink}
                      to={`/dashboard/recipes/${recipe.id}`}
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(recipe.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete recipe?</DialogTitle>
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
