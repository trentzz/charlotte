import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, CircularProgress, Alert, Divider, Link,
} from '@mui/material'
import client from '../../api/client.js'

export default function About() {
  const { username } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get(`/u/${username}/about`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.status === 404 ? null : 'This page is not available.'))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
      <CircularProgress />
    </Box>
  )

  if (error) return (
    <Container sx={{ py: 4 }}>
      <Alert severity="error">{error}</Alert>
    </Container>
  )

  const user = data?.user

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" fontWeight={700} gutterBottom>
        About {user?.display_name || username}
      </Typography>
      <Divider sx={{ mb: 4 }} />

      {data?.content_html ? (
        <Box
          sx={{
            '& p': { lineHeight: 1.8 },
            '& img': { maxWidth: '100%', borderRadius: 0 },
            '& h1, & h2, & h3': { fontFamily: 'inherit' },
            '& blockquote': {
              borderLeft: '3px solid',
              borderColor: 'primary.main',
              pl: 2,
              ml: 0,
              color: 'text.secondary',
            },
          }}
          dangerouslySetInnerHTML={{ __html: data.content_html }}
        />
      ) : (
        <Typography color="text.secondary">Nothing here yet.</Typography>
      )}

      <Box sx={{ mt: 6 }}>
        <Link component={RouterLink} to={`/u/${username}`} underline="hover">
          ← Back to home
        </Link>
      </Box>
    </Container>
  )
}
