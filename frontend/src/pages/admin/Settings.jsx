import React, { useEffect, useState } from 'react'
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  FormControlLabel, Switch, Stack, Divider,
} from '@mui/material'
import client from '../../api/client.js'

export default function AdminSettings() {
  const [form, setForm] = useState({
    site_name: '',
    description: '',
    registration_open: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    client.get('/admin/settings')
      .then((res) => {
        const s = res.data.settings || res.data
        setForm({
          site_name: s.site_name || '',
          description: s.description || '',
          registration_open: Boolean(s.registration_open),
        })
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false))
  }, [])

  function handle(e) {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await client.put('/admin/settings', form)
      setSuccess('Settings saved.')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box maxWidth={520}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Site settings
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box component="form" onSubmit={handleSave}>
        <Stack spacing={2}>
          <TextField
            label="Site name"
            name="site_name"
            value={form.site_name}
            onChange={handle}
            fullWidth
          />
          <TextField
            label="Description"
            name="description"
            value={form.description}
            onChange={handle}
            multiline
            rows={3}
            fullWidth
          />
          <Divider />
          <FormControlLabel
            control={
              <Switch
                name="registration_open"
                checked={form.registration_open}
                onChange={handle}
              />
            }
            label="Registration open"
          />
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
