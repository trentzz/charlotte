import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, Chip, CircularProgress, Alert,
  Divider, Breadcrumbs, Link, IconButton, Tooltip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import client from '../../api/client.js'
import TableOfContents from '../../components/TableOfContents.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function BlogPost() {
  const { username, slug } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isOwner = user?.username?.toLowerCase() === username?.toLowerCase()

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
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
        {/* Main content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Breadcrumbs sx={{ mb: 3 }}>
            <Link component={RouterLink} to={`/u/${username}`} underline="hover" color="inherit">
              {data?.user?.display_name || username}
            </Link>
            <Link component={RouterLink} to={`/u/${username}/blog`} underline="hover" color="inherit">
              Blog
            </Link>
            <Typography color="text.primary">{post?.title}</Typography>
          </Breadcrumbs>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography variant="h2" fontWeight={700} gutterBottom sx={{ flex: 1 }}>
              {post?.title}
            </Typography>
            {isOwner && data?.post?.id && (
              <Tooltip title="Edit post">
                <IconButton
                  component={RouterLink}
                  to={`/dashboard/blog/${data.post.id}`}
                  size="small"
                  sx={{ mt: 1, flexShrink: 0 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

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
        </Box>

        {/* Table of contents — hidden on small screens */}
        <Box sx={{ width: 220, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
          <TableOfContents contentHtml={post?.body_html || post?.content_html || ''} />
        </Box>
      </Box>
    </Container>
  )
}
