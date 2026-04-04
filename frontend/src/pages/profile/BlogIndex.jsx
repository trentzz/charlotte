import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, Grid, Card, CardContent, CardActionArea,
  Chip, CircularProgress, Alert, Divider,
} from '@mui/material'
import client from '../../api/client.js'

function PostCard({ post, username }) {
  return (
    <Card elevation={1}>
      <CardActionArea component={RouterLink} to={`/u/${username}/blog/${post.slug}`}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {post.title}
          </Typography>
          {post.summary && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {post.summary}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {new Date(post.created_at).toLocaleDateString('en-AU', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </Typography>
            {post.tags?.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default function BlogIndex() {
  const { username } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get(`/u/${username}/blog`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.status === 404 ? null : 'Failed to load blog posts.'))
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

  const posts = data?.posts || []

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" fontWeight={700} gutterBottom>
        Blog
      </Typography>
      <Divider sx={{ mb: 4 }} />
      {posts.length === 0 ? (
        <Typography color="text.secondary">No posts yet.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {posts.map((post) => (
            <PostCard key={post.slug || post.id} post={post} username={username} />
          ))}
        </Box>
      )}
    </Container>
  )
}
