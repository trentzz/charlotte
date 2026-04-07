import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  FormControlLabel, Switch, Paper, Stack, Chip, Tooltip,
} from '@mui/material'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import CheckIcon from '@mui/icons-material/Check'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import client from '../../api/client.js'
import GalleryPhotoPicker from '../../components/GalleryPhotoPicker.jsx'
import AppearanceSection from '../../components/AppearanceSection.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

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

export default function BlogEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isNew = id === 'new'

  // API fields: title, body, published, tags.
  const [form, setForm] = useState({
    title: '',
    body: '',
    published: false,
    tags: [],
  })
  const [slug, setSlug] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [themeEnabled, setThemeEnabled] = useState(false)
  const [postTheme, setPostTheme] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [quillReady, setQuillReady] = useState(false)
  const QuillRef = useRef(null)
  const quillEditorRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const imageInputRef = useRef(null)

  // Load Quill dynamically.
  useEffect(() => {
    loadQuill().then((Q) => {
      QuillRef.current = Q
      setQuillReady(true)
    })
  }, [])

  useEffect(() => {
    if (isNew) return
    client.get(`/dashboard/blog/${id}`)
      .then((res) => {
        // The axios interceptor unwraps the {"data": ...} envelope, so res.data is the post directly.
        const post = res.data.post || res.data
        setForm({
          title: post.title || '',
          body: post.body || '',
          published: Boolean(post.published),
          tags: post.tags || [],
        })
        setSlug(post.slug || '')
        setThemeEnabled(Boolean(post.theme_enabled))
        setPostTheme(post.theme || null)
      })
      .catch(() => setError('Failed to load post.'))
      .finally(() => setLoading(false))
  }, [id, isNew])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  function addTag() {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, tag] }))
    }
    setTagInput('')
  }

  function removeTag(tag) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))
  }

  // Insert an image URL into the Quill editor at the current cursor position.
  function insertImageIntoEditor(url) {
    const editor = quillEditorRef.current?.getEditor()
    if (!editor) return
    const range = editor.getSelection(true)
    const index = range ? range.index : editor.getLength()
    editor.insertEmbed(index, 'image', url)
    editor.setSelection(index + 1)
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await client.post('/dashboard/blog/image', fd)
      const url = res.data.url
      if (url) insertImageIntoEditor(url)
    } catch {
      setError('Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function handleGalleryPick(photo) {
    const url = (photo.url || '').startsWith('/') ? photo.url : `/${photo.url}`
    insertImageIntoEditor(url)
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      if (isNew) {
        const res = await client.post('/dashboard/blog', form)
        const created = res.data || {}
        const newId = created.id
        setSlug(created.slug || '')
        navigate(`/dashboard/blog/${newId}`, { replace: true })
      } else {
        const res = await client.put(`/dashboard/blog/${id}`, form)
        const updated = res.data || {}
        if (updated.slug) setSlug(updated.slug)
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save post.')
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublish() {
    const published = !form.published
    setForm((f) => ({ ...f, published }))
    try {
      await client.patch(`/dashboard/blog/${id}/toggle`, { published })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update publish status.')
      // Revert on failure.
      setForm((f) => ({ ...f, published: !published }))
    }
  }

  if (loading) return <CircularProgress />

  const Q = QuillRef.current

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          {isNew ? 'New post' : 'Edit post'}
        </Typography>
        {!isNew && (
          <FormControlLabel
            control={
              <Switch
                checked={form.published}
                onChange={handleTogglePublish}
              />
            }
            label={
              <Typography component="span" sx={{ display: 'inline-block', minWidth: '5rem' }}>
                {form.published ? 'Published' : 'Draft'}
              </Typography>
            }
          />
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={2}>
        <TextField
          label="Title"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          fullWidth
        />

        {/* Tags */}
        <Box>
          <Typography variant="body2" gutterBottom>Tags</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {form.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                onDelete={() => removeTag(tag)}
              />
            ))}
          </Box>
          <TextField
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="Add a tag and press Enter"
            size="small"
            sx={{ width: 240 }}
          />
        </Box>

        {/* Rich text editor */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">Content</Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Upload image and insert into post">
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
                      onChange={handleImageUpload}
                    />
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Insert an existing gallery photo">
                <Button
                  size="small"
                  startIcon={<PhotoLibraryIcon />}
                  onClick={() => setPickerOpen(true)}
                >
                  Pick from gallery
                </Button>
              </Tooltip>
            </Stack>
          </Box>
          {quillReady && Q ? (
            <Paper variant="outlined" sx={{ '& .ql-container': { minHeight: 300, fontSize: 15 } }}>
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

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.title}
            color={saved ? 'success' : 'primary'}
            startIcon={saved ? <CheckIcon /> : null}
          >
            {saving ? 'Saving…' : saved ? 'Changes saved' : isNew ? 'Create post' : 'Save changes'}
          </Button>
          {!isNew && slug && user?.username && (
            <Button
              variant="outlined"
              component={RouterLink}
              to={`/u/${user.username}/blog/${slug}`}
              endIcon={<OpenInNewIcon />}
            >
              View page
            </Button>
          )}
          <Button onClick={() => navigate('/dashboard/blog')} disabled={saving}>
            Cancel
          </Button>
        </Box>
      </Stack>

      {!isNew && id && (
        <AppearanceSection
          contentType="blog"
          contentId={Number(id)}
          initialEnabled={themeEnabled}
          initialTheme={postTheme}
        />
      )}

      <GalleryPhotoPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleGalleryPick}
        label="Insert photo"
      />
    </Box>
  )
}
