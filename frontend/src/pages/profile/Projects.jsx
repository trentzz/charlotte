import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, Grid, Card, CardContent, CardMedia,
  CardActions, Button, CircularProgress, Alert, Divider, Link,
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import client from '../../api/client.js'

function ProjectCard({ project }) {
  const imgSrc = project.image_path
    ? (project.image_path.startsWith('/') ? project.image_path : `/${project.image_path}`)
    : null

  return (
    <Card elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
        <CardActions>
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

export default function Projects() {
  const { username } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get(`/u/${username}/projects`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.status === 404 ? null : 'Failed to load projects.'))
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

  const projects = data?.projects || []

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h3" fontWeight={700} gutterBottom>
        Projects
      </Typography>
      <Divider sx={{ mb: 4 }} />
      {projects.length === 0 ? (
        <Typography color="text.secondary">No projects yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <ProjectCard project={project} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}
