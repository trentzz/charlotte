import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  FormControlLabel, Switch, Paper, Stack, Chip,
} from '@mui/material'
import client from '../../api/client.js'

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
  const isNew = id === 'new'

  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    published: false,
    tags: [],
  })
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [quillReady, setQuillReady] = useState(false)
  const QuillRef = useRef(null)

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
        const post = res.data.post || res.data
        setForm({
          title: post.title || '',
          summary: post.summary || '',
          content: post.content || '',
          published: Boolean(post.published),
          tags: post.tags || [],
        })
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

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      if (isNew) {
        const res = await client.post('/dashboard/blog', form)
        const newId = res.data.id || res.data.post?.id
        navigate(`/dashboard/blog/${newId}`, { replace: true })
      } else {
        await client.put(`/dashboard/blog/${id}`, form)
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
            label={form.published ? 'Published' : 'Draft'}
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
        <TextField
          label="Summary"
          name="summary"
          value={form.summary}
          onChange={handleChange}
          fullWidth
          multiline
          rows={2}
          helperText="Short description shown in post lists."
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
          <Typography variant="body2" gutterBottom>Content</Typography>
          {quillReady && Q ? (
            <Paper variant="outlined" sx={{ '& .ql-container': { minHeight: 300, fontSize: 15 } }}>
              <Q
                value={form.content}
                onChange={(val) => setForm((f) => ({ ...f, content: val }))}
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

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.title}
          >
            {saving ? 'Saving…' : isNew ? 'Create post' : 'Save changes'}
          </Button>
          <Button onClick={() => navigate('/dashboard/blog')} disabled={saving}>
            Cancel
          </Button>
        </Box>
      </Stack>
    </Box>
  )
}
