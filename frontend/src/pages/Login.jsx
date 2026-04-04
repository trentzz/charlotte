import React, { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Container, Box, Typography, TextField, Button, Alert, Paper,
} from '@mui/material'
import { useAuth } from '../context/AuthContext.jsx'
import { getCsrfToken } from '../api/client.js'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await getCsrfToken()
      const user = await login(form.username, form.password)
      navigate(user ? `/u/${user.username}` : '/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Log in
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            autoComplete="username"
            autoFocus
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          No account?{' '}
          <RouterLink to="/register">Register</RouterLink>
        </Typography>
      </Paper>
    </Container>
  )
}
