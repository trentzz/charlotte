import React, { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Button, Grid, Card, CardContent, CardMedia,
  CardActions, IconButton, CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import client from '../../api/client.js'

// Projects — list view with cards.
export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    client.get('/dashboard/projects')
      .then((res) => setProjects(res.data.projects || res.data || []))
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await client.delete(`/dashboard/projects/${deleteId}`)
      setProjects((ps) => ps.filter((p) => p.id !== deleteId))
      setDeleteId(null)
    } catch {
      setError('Failed to delete project.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Projects</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={RouterLink}
          to="/dashboard/projects/new"
        >
          New project
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {projects.length === 0 ? (
        <Typography color="text.secondary">No projects yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => {
            const imgSrc = project.image_url || null
            return (
              <Grid item xs={12} sm={6} md={4} key={project.id}>
                <Card elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {imgSrc && (
                    <CardMedia
                      component="img"
                      height={160}
                      image={imgSrc}
                      alt={project.title}
                      sx={{ borderRadius: 0, objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography fontWeight={600}>{project.title}</Typography>
                    {project.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {project.description}
                      </Typography>
                    )}
                    {project.url && (
                      <Typography
                        variant="caption"
                        color="primary.main"
                        component="a"
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        {project.url}
                      </Typography>
                    )}
                    {!project.published && (
                      <Chip label="Draft" size="small" sx={{ mt: 1 }} />
                    )}
                  </CardContent>
                  <CardActions>
                    <IconButton size="small" onClick={() => navigate(`/dashboard/projects/${project.id}`)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(project.id)}>
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
        <DialogTitle>Delete project?</DialogTitle>
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
