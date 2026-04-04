import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Grid, Card, CardContent, CardMedia,
  CardActions, IconButton, CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Stack,
  Switch, FormControlLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import client from '../../api/client.js'

const EMPTY = { title: '', description: '', url: '', published: true }

function ProjectForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY)
  function handle(e) {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }
  return (
    <Stack spacing={2}>
      <TextField label="Title" name="title" value={form.title} onChange={handle} required fullWidth />
      <TextField label="Description" name="description" value={form.description} onChange={handle} multiline rows={2} fullWidth />
      <TextField label="URL" name="url" value={form.url} onChange={handle} type="url" fullWidth />
      <FormControlLabel
        control={<Switch name="published" checked={Boolean(form.published)} onChange={handle} />}
        label="Published"
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={() => onSave(form)} disabled={saving || !form.title}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
      </Box>
    </Stack>
  )
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editProject, setEditProject] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    try {
      const res = await client.get('/dashboard/projects')
      setProjects(res.data.projects || res.data || [])
    } catch {
      setError('Failed to load projects.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(form) {
    setSaving(true)
    try {
      const res = await client.post('/dashboard/projects', form)
      setProjects((ps) => [...ps, res.data.project || res.data])
      setShowCreate(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project.')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(form) {
    setSaving(true)
    try {
      await client.put(`/dashboard/projects/${editProject.id}`, form)
      setProjects((ps) => ps.map((p) => p.id === editProject.id ? { ...p, ...form } : p))
      setEditProject(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update project.')
    } finally {
      setSaving(false)
    }
  }

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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
          New project
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {showCreate && (
        <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>New project</Typography>
          <ProjectForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
        </Box>
      )}

      {projects.length === 0 && !showCreate ? (
        <Typography color="text.secondary">No projects yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => {
            const imgSrc = project.image_path
              ? (project.image_path.startsWith('/') ? project.image_path : `/${project.image_path}`)
              : null

            if (editProject?.id === project.id) {
              return (
                <Grid item xs={12} sm={6} md={4} key={project.id}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <ProjectForm
                      initial={{ title: project.title, description: project.description || '', url: project.url || '', published: project.published }}
                      onSave={handleEdit}
                      onCancel={() => setEditProject(null)}
                      saving={saving}
                    />
                  </Box>
                </Grid>
              )
            }

            return (
              <Grid item xs={12} sm={6} md={4} key={project.id}>
                <Card elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {imgSrc && (
                    <CardMedia component="img" height={160} image={imgSrc} alt={project.title} sx={{ borderRadius: 0 }} />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography fontWeight={600}>{project.title}</Typography>
                    {project.description && (
                      <Typography variant="body2" color="text.secondary">{project.description}</Typography>
                    )}
                    {project.url && (
                      <Typography variant="caption" color="primary.main" component="a" href={project.url} target="_blank" rel="noopener noreferrer" sx={{ display: 'block', mt: 0.5 }}>
                        {project.url}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <IconButton size="small" onClick={() => setEditProject(project)}>
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
