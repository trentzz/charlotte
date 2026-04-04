import React from 'react'
import { useOutletContext, Link as RouterLink } from 'react-router-dom'
import {
  Container, Box, Typography, Avatar, Grid, Card, CardContent,
  CardActionArea, Chip, Divider,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

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

export default function UserHome() {
  const { profile, navData, username } = useOutletContext()
  const theme = useTheme()

  if (!profile) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" color="text.secondary">User not found.</Typography>
      </Container>
    )
  }

  const recentPosts = navData?.recent_posts || []
  const avatarSrc = profile.avatar_path
    ? (profile.avatar_path.startsWith('/') ? profile.avatar_path : `/${profile.avatar_path}`)
    : undefined

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
