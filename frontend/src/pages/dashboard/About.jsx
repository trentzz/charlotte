import React, { useEffect, useState } from 'react'
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
} from '@mui/material'
import client from '../../api/client.js'

export default function About() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    client.get('/dashboard/about')
      .then((res) => {
        setContent(res.data.content || res.data.about?.content || '')
      })
      .catch(() => setError('Failed to load about content.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await client.put('/dashboard/about', { content })
      setSuccess('About page saved.')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box maxWidth={680}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        About page
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Write in Markdown. The server renders it to HTML.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <TextField
        multiline
        rows={18}
        fullWidth
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write about yourself…"
        sx={{ mb: 2, fontFamily: 'monospace' }}
        inputProps={{ style: { fontFamily: 'monospace', fontSize: 14 } }}
      />

      <Button variant="contained" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save about page'}
      </Button>
    </Box>
  )
}
