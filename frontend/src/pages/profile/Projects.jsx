import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Container, Typography, Box, Grid, Card, CardContent, CardMedia,
  CardActions, Button, CircularProgress, Alert, Divider, Tooltip, IconButton,
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import client from '../../api/client.js'
import TableOfContents from '../../components/TableOfContents.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

// ProjectCard — used in the list view.
function ProjectCard({ project, username }) {
  const imgSrc = project.image_url
    ? (project.image_url.startsWith('/') ? project.image_url : `/${project.image_url}`)
    : null

  return (
    <Card
      elevation={1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: 4 },
      }}
      component={RouterLink}
      to={`/u/${username}/projects/${project.slug}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      {imgSrc && (
        <CardMedia
          component="img"
          height={180}
          image={imgSrc}
          alt={project.title}
          sx={{ borderRadius: 0, objectFit: 'cover' }}
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {project.title}
        </Typography>
        {project.description && (
          <Typography variant="body2" color="text.secondary">
            {project.description}
          </Typography>
        )}
      </CardContent>
      {project.url && (
        <CardActions onClick={(e) => e.stopPropagation()}>
          <Button
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            endIcon={<OpenInNewIcon fontSize="small" />}
          >
            View project
          </Button>
        </CardActions>
      )}
    </Card>
  )
}

// ProjectDetail — full-page view for a single project.
function ProjectDetail({ username, slug }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isOwner = user?.username?.toLowerCase() === username?.toLowerCase()

  useEffect(() => {
    client.get(`/u/${username}/projects/${slug}`)
      .then((res) => setData(res.data.project || res.data))
      .catch((err) => setError(err.response?.status === 404 ? 'Project not found.' : 'Failed to load project.'))
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

  const project = data
  const imgSrc = project.image_url
    ? (project.image_url.startsWith('/') ? project.image_url : `/${project.image_url}`)
    : null

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
        {/* Main content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Button
            component={RouterLink}
            to={`/u/${username}/projects`}
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 3 }}
          >
            All projects
          </Button>

          {imgSrc && (
            <Box
              component="img"
              src={imgSrc}
              alt={project.title}
              sx={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 1, mb: 3 }}
            />
          )}

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography variant="h3" fontWeight={700} gutterBottom sx={{ flex: 1 }}>
              {project.title}
            </Typography>
            {isOwner && (
              <Tooltip title="Edit project">
                <IconButton component={RouterLink} to="/dashboard/projects" size="small" sx={{ mt: 1, flexShrink: 0 }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {project.description && (
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {project.description}
            </Typography>
          )}

          {project.url && (
            <Button
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon />}
              sx={{ mb: 2 }}
            >
              View project
            </Button>
          )}

          {project.body_html && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box
                className="prose"
                dangerouslySetInnerHTML={{ __html: project.body_html }}
                sx={{
                  '& img': { maxWidth: '100%', borderRadius: 1 },
                  '& h1,h2,h3': { mt: 3, mb: 1 },
                  '& p': { mb: 1.5 },
                  '& ul,ol': { pl: 2.5, mb: 1.5 },
                  '& blockquote': { borderLeft: '4px solid', borderColor: 'divider', pl: 2, ml: 0, my: 2, color: 'text.secondary' },
                  '& code': { fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 },
                  '& pre': { bgcolor: 'action.hover', p: 1.5, borderRadius: 1, overflowX: 'auto', mb: 1.5 },
                }}
              />
            </>
          )}

          {project.linked_posts && project.linked_posts.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h5" fontWeight={600} gutterBottom>Related posts</Typography>
              <Box component="ul" sx={{ pl: 2.5 }}>
                {project.linked_posts.map((post) => (
                  <Box component="li" key={post.id} sx={{ mb: 0.5 }}>
                    <RouterLink to={`/u/${username}/blog/${post.slug}`} style={{ color: 'inherit' }}>
                      {post.title}
                    </RouterLink>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>

        {/* Table of contents — hidden on small screens */}
        <Box sx={{ width: 220, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
          <TableOfContents contentHtml={project.body_html || ''} />
        </Box>
      </Box>
    </Container>
  )
}

// Projects — router between list and detail view using the URL slug param.
export default function Projects() {
  const { username, slug } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isOwner = user?.username?.toLowerCase() === username?.toLowerCase()

  // Only fetch the list when we are on the /projects index (no slug).
  useEffect(() => {
    if (slug) return // detail view handles its own fetch
    client.get(`/u/${username}/projects`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.status === 404 ? null : 'Failed to load projects.'))
      .finally(() => setLoading(false))
  }, [username, slug])

  // Detail view.
  if (slug) {
    return <ProjectDetail username={username} slug={slug} />
  }

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

  const projects = data?.projects || []

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h3" fontWeight={700} gutterBottom sx={{ flex: 1, mb: 0 }}>
          Projects
        </Typography>
        {isOwner && (
          <Tooltip title="Edit projects">
            <IconButton component={RouterLink} to="/dashboard/projects" size="small">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Divider sx={{ mb: 4 }} />
      {projects.length === 0 ? (
        <Typography color="text.secondary">No projects yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <ProjectCard project={project} username={username} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}
