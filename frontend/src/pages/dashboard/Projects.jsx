import React, { useEffect, useState, useRef } from 'react'
import {
  Box, Typography, Button, Grid, Card, CardContent, CardMedia,
  CardActions, IconButton, CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Stack,
  Switch, FormControlLabel, Tooltip, Chip, Paper,
  Divider, Autocomplete,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import CheckIcon from '@mui/icons-material/Check'
import client from '../../api/client.js'
import GalleryPhotoPicker from '../../components/GalleryPhotoPicker.jsx'

// Lazy-load react-quill to avoid SSR issues.
let ReactQuill = null

async function loadQuill() {
  if (ReactQuill) return ReactQuill
  const mod = await import('react-quill')
  await import('react-quill/dist/quill.snow.css')
  ReactQuill = mod.default
  return ReactQuill
}

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
}

// ProjectEditor — full-page rich editor for a single project.
function ProjectEditor({ projectId, onBack }) {
  const isNew = projectId === 'new'
  const [form, setForm] = useState({
    title: '',
    description: '',
    url: '',
    image_path: '',
    body: '',
    linked_post_ids: [],
    published: false,
  })
  const [linkedPosts, setLinkedPosts] = useState([]) // hydrated Post objects for display
  const [allPosts, setAllPosts] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [quillReady, setQuillReady] = useState(false)
  const QuillRef = useRef(null)
  const quillEditorRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [postSearch, setPostSearch] = useState('')
  const [coverPickerOpen, setCoverPickerOpen] = useState(false)
  const [bodyPickerOpen, setBodyPickerOpen] = useState(false)
  const imageInputRef = useRef(null)

  useEffect(() => {
    loadQuill().then((Q) => {
      QuillRef.current = Q
      setQuillReady(true)
    })
    // Load all posts for the linked-posts selector.
    client.get('/dashboard/blog')
      .then((res) => setAllPosts(res.data.posts || res.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isNew) return
    client.get(`/dashboard/projects/${projectId}`)
      .then((res) => {
        const proj = res.data.project || res.data
        setForm({
          title: proj.title || '',
          description: proj.description || '',
          url: proj.url || '',
          image_path: proj.image_url || '',
          body: proj.body || '',
          linked_post_ids: (proj.linked_posts || []).map((p) => p.id),
          published: Boolean(proj.published),
        })
        setLinkedPosts(proj.linked_posts || [])
      })
      .catch(() => setError('Failed to load project.'))
      .finally(() => setLoading(false))
  }, [projectId, isNew])

  function handle(e) {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleCoverPick(photo) {
    const url = (photo.url || '').startsWith('/') ? photo.url : `/${photo.url}`
    setForm((f) => ({ ...f, image_path: url }))
  }

  // Insert a gallery photo URL into the Quill body editor.
  function insertImageIntoBody(url) {
    const editor = quillEditorRef.current?.getEditor()
    if (!editor) return
    const range = editor.getSelection(true)
    const index = range ? range.index : editor.getLength()
    editor.insertEmbed(index, 'image', url)
    editor.setSelection(index + 1)
  }

  async function handleBodyImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      // Reuse the blog image upload endpoint — images land in the same user uploads dir.
      const res = await client.post('/dashboard/blog/image', fd)
      const url = res.data.url
      if (url) insertImageIntoBody(url)
    } catch {
      setError('Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function addLinkedPost(post) {
    if (!post || form.linked_post_ids.includes(post.id)) return
    setForm((f) => ({ ...f, linked_post_ids: [...f.linked_post_ids, post.id] }))
    setLinkedPosts((ps) => [...ps, post])
  }

  function removeLinkedPost(postId) {
    setForm((f) => ({ ...f, linked_post_ids: f.linked_post_ids.filter((id) => id !== postId) }))
    setLinkedPosts((ps) => ps.filter((p) => p.id !== postId))
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      if (isNew) {
        const res = await client.post('/dashboard/projects', form)
        const created = res.data.project || res.data
        onBack(created)
      } else {
        await client.put(`/dashboard/projects/${projectId}`, form)
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
        onBack(null)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save project.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CircularProgress />

  const Q = QuillRef.current
  const imgSrc = form.image_path || null
  const availablePosts = allPosts.filter((p) => !form.linked_post_ids.includes(p.id))

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => onBack(null)}><ArrowBackIcon /></IconButton>
        <Typography variant="h5" fontWeight={700}>
          {isNew ? 'New project' : 'Edit project'}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <FormControlLabel
          control={<Switch name="published" checked={Boolean(form.published)} onChange={handle} />}
          label={form.published ? 'Published' : 'Draft'}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={3}>
        <TextField
          label="Title"
          name="title"
          value={form.title}
          onChange={handle}
          required
          fullWidth
        />
        <TextField
          label="Short description"
          name="description"
          value={form.description}
          onChange={handle}
          multiline
          rows={2}
          fullWidth
          helperText="Shown in the project list. Keep it brief."
        />
        <TextField
          label="External URL"
          name="url"
          value={form.url}
          onChange={handle}
          type="url"
          fullWidth
          helperText="Optional link to a live project, repository, or paper."
        />

        {/* Cover image */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" fontWeight={500}>Cover image</Typography>
            <Button size="small" startIcon={<PhotoLibraryIcon />} onClick={() => setCoverPickerOpen(true)}>
              Pick from gallery
            </Button>
            {imgSrc && (
              <Button size="small" color="error" onClick={() => setForm((f) => ({ ...f, image_path: '' }))}>
                Remove
              </Button>
            )}
          </Box>
          {imgSrc && (
            <Box
              component="img"
              src={imgSrc}
              alt="Cover"
              sx={{ height: 160, borderRadius: 1, objectFit: 'cover', display: 'block' }}
            />
          )}
        </Box>

        {/* Long-form body */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" fontWeight={500}>Body</Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Upload image and insert into body">
                <span>
                  <Button
                    size="small"
                    startIcon={<AddPhotoAlternateIcon />}
                    component="label"
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Upload image'}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleBodyImageUpload}
                    />
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Insert an existing gallery photo">
                <Button
                  size="small"
                  startIcon={<PhotoLibraryIcon />}
                  onClick={() => setBodyPickerOpen(true)}
                >
                  Pick from gallery
                </Button>
              </Tooltip>
            </Stack>
          </Box>
          {quillReady && Q ? (
            <Paper variant="outlined" sx={{ '& .ql-container': { minHeight: 400, fontSize: 15 } }}>
              <Q
                ref={quillEditorRef}
                value={form.body}
                onChange={(val) => setForm((f) => ({ ...f, body: val }))}
                modules={QUILL_MODULES}
                theme="snow"
              />
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">Loading editor…</Typography>
            </Box>
          )}
        </Box>

        {/* Linked blog posts */}
        <Box>
          <Typography variant="body2" fontWeight={500} gutterBottom>Related blog posts</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {linkedPosts.map((post) => (
              <Chip
                key={post.id}
                label={post.title}
                size="small"
                onDelete={() => removeLinkedPost(post.id)}
              />
            ))}
            {linkedPosts.length === 0 && (
              <Typography variant="body2" color="text.secondary">None selected.</Typography>
            )}
          </Box>
          <Autocomplete
            options={availablePosts}
            getOptionLabel={(p) => p.title || ''}
            onChange={(_, value) => addLinkedPost(value)}
            inputValue={postSearch}
            onInputChange={(_, v) => setPostSearch(v)}
            renderInput={(params) => (
              <TextField {...params} size="small" placeholder="Search posts to link…" sx={{ maxWidth: 360 }} />
            )}
            noOptionsText="No posts available"
          />
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.title}
            color={saved ? 'success' : 'primary'}
            startIcon={saved ? <CheckIcon /> : null}
          >
            {saving ? 'Saving…' : saved ? 'Changes saved' : isNew ? 'Create project' : 'Save changes'}
          </Button>
          <Button onClick={() => onBack(null)} disabled={saving}>
            Cancel
          </Button>
        </Box>
      </Stack>

      <GalleryPhotoPicker
        open={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        onSelect={handleCoverPick}
        label="Use as cover image"
      />
      <GalleryPhotoPicker
        open={bodyPickerOpen}
        onClose={() => setBodyPickerOpen(false)}
        onSelect={(photo) => {
          const url = (photo.url || '').startsWith('/') ? photo.url : `/${photo.url}`
          insertImageIntoBody(url)
        }}
        label="Insert into body"
      />
    </Box>
  )
}

// Projects — list view with cards.
export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null) // null = list, 'new' = new, number = edit
  const [deleteId, setDeleteId] = useState(null)
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

  function handleBack(created) {
    setEditingId(null)
    // Re-fetch the list so counts and slugs are up to date.
    load()
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

  // Show the rich editor when creating or editing.
  if (editingId !== null) {
    return <ProjectEditor projectId={editingId} onBack={handleBack} />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Projects</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditingId('new')}>
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
                    <IconButton size="small" onClick={() => setEditingId(project.id)}>
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
