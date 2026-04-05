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
  const recentPosts = (navData?.recent_posts || []).slice(0, 3)
  const recentPhotos = (navData?.recent_photos || []).slice(0, 3)
  const avatarSrc = profile.avatar_url || undefined

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      {/* Hero */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Avatar
          src={avatarSrc}
          sx={{ width: 108, height: 108, mx: 'auto', mb: 3, fontSize: 40 }}
        >
          {(profile.display_name || profile.username)[0]?.toUpperCase()}
        </Avatar>
        <Typography variant="h2" fontWeight={700} gutterBottom>
          {profile.display_name || profile.username}
        </Typography>
        {profile.bio && (
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mt: 1, lineHeight: 1.7 }}>
            {profile.bio}
          </Typography>
        )}
        {profile.links?.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3, flexWrap: 'wrap' }}>
            {profile.links.map((link) => (
              <Typography
                key={link.url}
                component="a"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {link.label || link.url}
              </Typography>
            ))}
          </Box>
        )}
      </Box>

      {/* Recent photos strip */}
      {recentPhotos.length > 0 && (
        <Box sx={{ mb: 8 }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {recentPhotos.map((photo) => (
              <Box
                key={photo.id}
                component={RouterLink}
                to={`/u/${username}/gallery`}
                sx={{ flex: 1, aspectRatio: '1', overflow: 'hidden', borderRadius: 2, display: 'block' }}
              >
                <Box
                  component="img"
                  src={photo.url}
                  alt={photo.caption || ''}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.04)' } }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Recent blog posts */}
      {recentPosts.length > 0 && (
        <>
          <Divider sx={{ mb: 5 }} />
          <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
            Recent writing
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentPosts.map((post, i) => (
              <Box key={post.slug || post.id}>
                {i > 0 && <Divider />}
                <Box
                  component={RouterLink}
                  to={`/u/${username}/blog/${post.slug}`}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 2.5, textDecoration: 'none', color: 'inherit', '&:hover h6': { color: 'primary.main' } }}
                >
                  <Typography variant="h6" fontWeight={600} sx={{ transition: 'color 0.15s' }}>
                    {post.title}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, ml: 2 }}>
                    {new Date(post.created_at).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 3, textAlign: 'center' }}>
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
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1.5, p: 2.5, textAlign: 'center' }}>
      <Avatar src={avatarSrc} sx={{ width: 72, height: 72, fontSize: 30 }}>
        {(profile?.display_name || profile?.username || '?')[0]?.toUpperCase()}
      </Avatar>
      <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
        {profile?.display_name || profile?.username}
      </Typography>
      {profile?.bio && (
        <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
          {profile.bio}
        </Typography>
      )}
    </Box>
  )
}

function TextWidget({ widget }) {
  return (
    <Box
      sx={{ p: 2, height: '100%', overflow: 'hidden', '& p': { margin: 0 }, '& ul, & ol': { pl: 2, margin: 0 } }}
      dangerouslySetInnerHTML={{ __html: widget.content }}
    />
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
        borderRadius: 1.5,
        overflow: 'hidden',
      }}
    >
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

  const homepageMode = navData?.homepage?.mode || 'builder'
  const homepageWidgets = navData?.homepage?.widgets || []
  const hasCustomLayout = homepageWidgets.length > 0

  // Simple mode: render the rich-text page.
  if (homepageMode === 'simple') {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box
          sx={{
            '& h1': { typography: 'h3', fontWeight: 700, mb: 2 },
            '& h2': { typography: 'h5', fontWeight: 600, mt: 4, mb: 1 },
            '& p': { typography: 'body1', mb: 2, lineHeight: 1.8 },
            '& a': { color: 'primary.main' },
          }}
          dangerouslySetInnerHTML={{ __html: navData.homepage.simple_content || '' }}
        />
      </Container>
    )
  }

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
