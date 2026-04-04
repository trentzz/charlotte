import React, { useEffect, useRef, useState } from 'react'
import { useOutletContext, Link as RouterLink } from 'react-router-dom'
import {
  Container, Box, Typography, Avatar, Grid, Card, CardContent,
  CardActionArea, Chip, Divider,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// ── Default layout (no custom widgets) ───────────────────────────────────────

function PostCard({ post, username }) {
  return (
    <Card elevation={1} sx={{ height: '100%' }}>
      <CardActionArea component={RouterLink} to={`/u/${username}/blog/${post.slug}`} sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {post.title}
          </Typography>
          {post.summary && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {post.summary}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {new Date(post.created_at).toLocaleDateString('en-AU', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

function DefaultLayout({ profile, navData, username }) {
  const recentPosts = navData?.recent_posts || []
  const avatarSrc = profile.avatar_url || undefined

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      {/* Profile header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Avatar
          src={avatarSrc}
          sx={{ width: 96, height: 96, mx: 'auto', mb: 2, fontSize: 36 }}
        >
          {(profile.display_name || profile.username)[0]?.toUpperCase()}
        </Avatar>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          {profile.display_name || profile.username}
        </Typography>
        {profile.bio && (
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
            {profile.bio}
          </Typography>
        )}
      </Box>

      {/* Recent blog posts */}
      {recentPosts.length > 0 && (
        <>
          <Divider sx={{ mb: 4 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Recent posts
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {recentPosts.map((post) => (
              <Grid item xs={12} sm={6} key={post.slug || post.id}>
                <PostCard post={post} username={username} />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: 'center' }}>
            <RouterLink to={`/u/${username}/blog`} style={{ fontSize: 14 }}>
              See all posts →
            </RouterLink>
          </Box>
        </>
      )}
    </Container>
  )
}

// ── Custom grid layout ────────────────────────────────────────────────────────

// Accent colours per widget type (matches dashboard).
const WIDGET_COLOURS = {
  profile:   '#4a7c59',
  text:      '#5c6bc0',
  link:      '#0288d1',
  blog_post: '#e64a19',
  photo:     '#6d4c41',
  album:     '#7b1fa2',
  recipe:    '#f57c00',
  project:   '#00796b',
}

function ProfileWidget({ widget, profile }) {
  const avatarSrc = profile?.avatar_url || undefined
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1, p: 2, textAlign: 'center' }}>
      <Avatar src={avatarSrc} sx={{ width: 64, height: 64, fontSize: 28 }}>
        {(profile?.display_name || profile?.username || '?')[0]?.toUpperCase()}
      </Avatar>
      <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
        {profile?.display_name || profile?.username}
      </Typography>
      {profile?.bio && (
        <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {profile.bio}
        </Typography>
      )}
    </Box>
  )
}

function TextWidget({ widget }) {
  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'hidden' }}>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 10, WebkitBoxOrient: 'vertical' }}>
        {widget.content}
      </Typography>
    </Box>
  )
}

function LinkWidget({ widget }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 2 }}>
      <Typography
        component="a"
        href={widget.url}
        target="_blank"
        rel="noopener noreferrer"
        variant="body2"
        fontWeight={600}
        sx={{ color: WIDGET_COLOURS.link, textDecoration: 'none', textAlign: 'center', '&:hover': { textDecoration: 'underline' } }}
      >
        {widget.label || widget.url}
      </Typography>
    </Box>
  )
}

function BlogPostWidget({ widget, username, navData }) {
  const posts = navData?.recent_posts || []
  const post = posts.find((p) => p.id === widget.content_id)
  if (!post) {
    return (
      <Box sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.disabled">Post unavailable</Typography>
      </Box>
    )
  }
  return (
    <CardActionArea component={RouterLink} to={`/u/${username}/blog/${post.slug}`} sx={{ height: '100%', display: 'block' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {post.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(post.created_at).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })}
        </Typography>
      </Box>
    </CardActionArea>
  )
}

function PhotoWidget({ widget, navData }) {
  const photos = navData?.recent_photos || []
  const photo = photos.find((p) => p.id === widget.content_id)
  if (!photo) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.disabled">Photo unavailable</Typography>
      </Box>
    )
  }
  return (
    <Box
      component="img"
      src={photo.url}
      alt={photo.caption || ''}
      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

function AlbumWidget({ widget, username, navData }) {
  const albums = navData?.albums || []
  const album = albums.find((a) => a.id === widget.content_id)
  if (!album) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.disabled">Album unavailable</Typography>
      </Box>
    )
  }
  return (
    <CardActionArea component={RouterLink} to={`/u/${username}/gallery/${album.slug}`} sx={{ height: '100%', display: 'block', position: 'relative' }}>
      {album.cover_photo?.url && (
        <Box component="img" src={album.cover_photo.url} alt={album.title} sx={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
      )}
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1.5, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
        <Typography variant="subtitle2" fontWeight={700} color="white" noWrap>{album.title}</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>{album.photo_count} photos</Typography>
      </Box>
    </CardActionArea>
  )
}

function RecipeWidget({ widget, username, navData }) {
  const recipes = navData?.recent_recipes || []
  const recipe = recipes.find((r) => r.id === widget.content_id)
  if (!recipe) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.disabled">Recipe unavailable</Typography>
      </Box>
    )
  }
  return (
    <CardActionArea component={RouterLink} to={`/u/${username}/recipes/${recipe.slug}`} sx={{ height: '100%', display: 'block' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {recipe.title}
        </Typography>
        {recipe.description && (
          <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
            {recipe.description}
          </Typography>
        )}
      </Box>
    </CardActionArea>
  )
}

function ProjectWidget({ widget, navData }) {
  const projects = navData?.recent_projects || []
  const project = projects.find((p) => p.id === widget.content_id)
  if (!project) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.disabled">Project unavailable</Typography>
      </Box>
    )
  }
  const inner = (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {project.title}
      </Typography>
      {project.description && (
        <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {project.description}
        </Typography>
      )}
    </Box>
  )
  if (project.url) {
    return (
      <Box component="a" href={project.url} target="_blank" rel="noopener noreferrer" sx={{ display: 'block', height: '100%', textDecoration: 'none', color: 'inherit' }}>
        {inner}
      </Box>
    )
  }
  return <Box sx={{ height: '100%' }}>{inner}</Box>
}

function PublicWidgetCard({ widget, profile, username, navData }) {
  const colour = WIDGET_COLOURS[widget.type] || '#9e9e9e'

  function renderContent() {
    switch (widget.type) {
      case 'profile':   return <ProfileWidget widget={widget} profile={profile} />
      case 'text':      return <TextWidget widget={widget} />
      case 'link':      return <LinkWidget widget={widget} />
      case 'blog_post': return <BlogPostWidget widget={widget} username={username} navData={navData} />
      case 'photo':     return <PhotoWidget widget={widget} navData={navData} />
      case 'album':     return <AlbumWidget widget={widget} username={username} navData={navData} />
      case 'recipe':    return <RecipeWidget widget={widget} username={username} navData={navData} />
      case 'project':   return <ProjectWidget widget={widget} navData={navData} />
      default:          return null
    }
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow: 1,
      }}
    >
      <Box sx={{ height: 4, bgcolor: colour, flexShrink: 0 }} />
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {renderContent()}
      </Box>
    </Box>
  )
}

function CustomGridLayout({ widgets, profile, username, navData }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(900)

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width || 900)
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const layout = widgets.map((w) => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
  }))

  return (
    <Box ref={containerRef} sx={{ width: '100%' }}>
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={80}
        width={width}
        isDraggable={false}
        isResizable={false}
        compactType="vertical"
        margin={[8, 8]}
      >
        {widgets.map((widget) => (
          <div key={widget.id}>
            <PublicWidgetCard
              widget={widget}
              profile={profile}
              username={username}
              navData={navData}
            />
          </div>
        ))}
      </GridLayout>
    </Box>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function UserHome() {
  const { profile, navData, username } = useOutletContext()

  if (!profile) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" color="text.secondary">User not found.</Typography>
      </Container>
    )
  }

  const homepageWidgets = navData?.homepage?.widgets || []
  const hasCustomLayout = homepageWidgets.length > 0

  if (hasCustomLayout) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <CustomGridLayout
          widgets={homepageWidgets}
          profile={profile}
          username={username}
          navData={navData}
        />
      </Container>
    )
  }

  return <DefaultLayout profile={profile} navData={navData} username={username} />
}
