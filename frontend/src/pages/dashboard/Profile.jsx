import React, { useEffect, useState } from 'react'
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  Avatar, Stack, Divider, FormControlLabel, Switch, Chip, Snackbar,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import VerifiedIcon from '@mui/icons-material/Verified'
import client from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNavData } from '../../context/NavDataContext.jsx'

export default function Profile() {
  const { user, refresh } = useAuth()
  const navDataCtx = useNavData()
  const [form, setForm] = useState({ display_name: '', bio: '', email: '', location: '', website: '', show_on_homepage: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [avatarSrc, setAvatarSrc] = useState(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [sendingVerify, setSendingVerify] = useState(false)
  const [snackbar, setSnackbar] = useState(null)

  useEffect(() => {
    // Show success message if redirected back from the email verification link.
    const params = new URLSearchParams(window.location.search)
    if (params.get('verified') === '1') {
      setSnackbar('Email verified successfully')
      // Remove the query param without a page reload.
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    client.get('/dashboard/profile')
      .then((res) => {
        const p = res.data.data || res.data.profile || res.data
        setForm({
          display_name: p.display_name || '',
          bio: p.bio || '',
          email: p.email || '',
          location: p.location || '',
          website: p.website || '',
          show_on_homepage: p.show_on_homepage !== false,
        })
        setEmailVerified(p.email_verified === true)
        if (p.avatar_url) {
          setAvatarSrc(p.avatar_url)
        } else if (p.avatar_path) {
          setAvatarSrc(p.avatar_path.startsWith('/') ? p.avatar_path : `/${p.avatar_path}`)
        }
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await client.put('/dashboard/profile', form)
      setSuccess('Profile saved.')
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      await refresh()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSendVerification() {
    setSendingVerify(true)
    setError(null)
    try {
      const res = await client.post('/dashboard/send-verification', {})
      const d = res.data?.data || res.data
      if (d?.ok) {
        setSnackbar('Verification email sent')
      } else {
        setError(d?.error || 'Failed to send verification email.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification email.')
    } finally {
      setSendingVerify(false)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await client.post('/dashboard/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const path = res.data.avatar_path || res.data.path
      if (path) {
        setAvatarSrc(path.startsWith('/') ? path : `/${path}`)
      }
      await refresh()
      navDataCtx?.reloadNavData?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload avatar.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box maxWidth={520}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Profile
      </Typography>

      {/* Avatar */}
      <Box sx={{ mb: 3 }}>
        <Avatar src={avatarSrc} sx={{ width: 80, height: 80, mb: 1, fontSize: 32 }}>
          {(user?.display_name || user?.username || '?')[0]?.toUpperCase()}
        </Avatar>
        <Button
          component="label"
          variant="outlined"
          size="small"
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Change avatar'}
          <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Display name"
          name="display_name"
          value={form.display_name}
          onChange={handleChange}
        />
        <TextField
          label="Bio"
          name="bio"
          value={form.bio}
          onChange={handleChange}
          multiline
          rows={3}
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.show_on_homepage}
              onChange={(e) => setForm((f) => ({ ...f, show_on_homepage: e.target.checked }))}
            />
          }
          label="Show my profile on the Charlotte homepage"
        />

        {/* Email field with verification status */}
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            type="email"
            sx={{ flex: 1 }}
          />
          {form.email && emailVerified && (
            <Chip
              icon={<VerifiedIcon />}
              label="Verified"
              color="success"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          )}
          {form.email && !emailVerified && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleSendVerification}
              disabled={sendingVerify}
              sx={{ mt: 1, whiteSpace: 'nowrap' }}
            >
              {sendingVerify ? 'Sending…' : 'Verify email'}
            </Button>
          )}
        </Stack>

        <TextField
          label="Location"
          name="location"
          value={form.location}
          onChange={handleChange}
        />
        <TextField
          label="Website"
          name="website"
          value={form.website}
          onChange={handleChange}
          type="url"
        />
        <Button
          type="submit"
          variant="contained"
          disabled={saving}
          color={saved ? 'success' : 'primary'}
          startIcon={saved ? <CheckIcon /> : null}
        >
          {saving ? 'Saving…' : saved ? 'Changes saved' : 'Save profile'}
        </Button>
      </Box>

      <Snackbar
        open={snackbar !== null}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  )
}
