import React, { useState, useEffect } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Container, Box, Typography, TextField, Button, Alert, Paper,
} from '@mui/material'
import client, { getCsrfToken } from '../api/client.js'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(true)

  useEffect(() => {
    client.get('/settings').then((res) => {
      setRegistrationOpen(res.data.registration_open !== false)
    }).catch(() => {})
  }, [])

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await getCsrfToken()
      await client.post('/auth/register', form)
      setSuccess('Account created. You can now log in.')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  if (!registrationOpen) {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">Registration is closed</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This site is not accepting new registrations at this time.
          </Typography>
          <Button component={RouterLink} to="/login" sx={{ mt: 2 }}>
            Log in
          </Button>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Create an account
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            autoFocus
            helperText="Letters, numbers, and underscores only."
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Creating account…' : 'Register'}
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Already have an account?{' '}
          <RouterLink to="/login">Log in</RouterLink>
        </Typography>
      </Paper>
    </Container>
  )
}
