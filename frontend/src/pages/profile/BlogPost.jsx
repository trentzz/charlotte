import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, Chip, CircularProgress, Alert,
  Divider, Breadcrumbs, Link,
} from '@mui/material'
import client from '../../api/client.js'

export default function BlogPost() {
  const { username, slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get(`/u/${username}/blog/${slug}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Post not found.'))
      .finally(() => setLoading(false))
  }, [username, slug])

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

  const post = data?.post

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link component={RouterLink} to={`/u/${username}`} underline="hover" color="inherit">
          {data?.user?.display_name || username}
        </Link>
        <Link component={RouterLink} to={`/u/${username}/blog`} underline="hover" color="inherit">
          Blog
        </Link>
        <Typography color="text.primary">{post?.title}</Typography>
      </Breadcrumbs>

      <Typography variant="h2" fontWeight={700} gutterBottom>
        {post?.title}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          {post?.created_at && new Date(post.created_at).toLocaleDateString('en-AU', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </Typography>
        {post?.tags?.map((tag) => (
          <Chip key={tag} label={tag} size="small" variant="outlined" />
        ))}
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Server-rendered HTML from the API */}
      <Box
        sx={{
          '& h1, & h2, & h3, & h4, & h5, & h6': { fontFamily: 'inherit' },
          '& p': { lineHeight: 1.8 },
          '& img': { maxWidth: '100%', borderRadius: 0 },
          '& pre': {
            bgcolor: 'action.hover',
            p: 2,
            borderRadius: 1,
            overflowX: 'auto',
            fontSize: 14,
          },
          '& code': { fontFamily: 'monospace', fontSize: '0.9em' },
          '& blockquote': {
            borderLeft: '3px solid',
            borderColor: 'primary.main',
            pl: 2,
            ml: 0,
            color: 'text.secondary',
          },
        }}
        dangerouslySetInnerHTML={{ __html: post?.body_html || post?.content_html || '' }}
      />

      <Box sx={{ mt: 6 }}>
        <Link component={RouterLink} to={`/u/${username}/blog`} underline="hover">
          ← Back to blog
        </Link>
      </Box>
    </Container>
  )
}
