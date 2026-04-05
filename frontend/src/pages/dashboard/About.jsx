import React, { useEffect, useState, useRef } from 'react'
import {
  Box, Typography, Button, Alert, CircularProgress, Paper,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
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

export default function About() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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
    client.get('/dashboard/about')
      .then((res) => {
        // Load the rendered HTML into Quill so existing markdown content is preserved.
        setContent(res.data.content_html || '')
      })
      .catch(() => setError('Failed to load about content.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      await client.put('/dashboard/about', { content })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CircularProgress />

  const Q = QuillRef.current

  return (
    <Box maxWidth={680}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        About page
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {quillReady && Q ? (
        <Paper variant="outlined" sx={{ mb: 2, '& .ql-container': { minHeight: 300, fontSize: 15 } }}>
          <Q
            value={content}
            onChange={(val) => setContent(val)}
            modules={QUILL_MODULES}
            theme="snow"
          />
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Loading editor…</Typography>
        </Box>
      )}

      <Button
        variant="contained"
        color={saved ? 'success' : 'primary'}
        startIcon={saved ? <CheckIcon /> : null}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : saved ? 'Changes saved' : 'Save about page'}
      </Button>
    </Box>
  )
}
