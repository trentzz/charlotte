import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Switch, FormControlLabel, Button, Alert,
  CircularProgress, Paper, Stack, Divider,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import client from '../../api/client.js'

const FEATURE_LIST = [
  { key: 'blog', label: 'Blog', description: 'Share written posts with your readers.' },
  { key: 'gallery', label: 'Gallery', description: 'Showcase photos organised into albums.' },
  { key: 'recipes', label: 'Recipes', description: 'Publish recipes and track your cooking attempts.' },
  { key: 'projects', label: 'Projects', description: 'Showcase your projects with links and images.' },
  { key: 'about', label: 'About page', description: 'A standalone page introducing yourself.' },
]

export default function Features() {
  const [features, setFeatures] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get('/dashboard/features')
      .then((res) => {
        setFeatures(res.data.features || res.data || {})
      })
      .catch(() => setError('Failed to load features.'))
      .finally(() => setLoading(false))
  }, [])

  function toggle(key) {
    setFeatures((f) => ({ ...f, [key]: !f[key] }))
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      await client.put('/dashboard/features', features)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save features.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box maxWidth={520}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Features
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enable or disable sections of your public page.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={1} sx={{ mb: 3 }}>
        {FEATURE_LIST.map((feat, i) => (
          <React.Fragment key={feat.key}>
            {i > 0 && <Divider />}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
              <Box>
                <Typography variant="body1" fontWeight={500}>{feat.label}</Typography>
                <Typography variant="body2" color="text.secondary">{feat.description}</Typography>
              </Box>
              <Switch
                checked={Boolean(features[feat.key])}
                onChange={() => toggle(feat.key)}
              />
            </Box>
          </React.Fragment>
        ))}
      </Stack>

      <Button
        variant="contained"
        color={saved ? 'success' : 'primary'}
        startIcon={saved ? <CheckIcon /> : null}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : saved ? 'Changes saved' : 'Save features'}
      </Button>
    </Box>
  )
}
