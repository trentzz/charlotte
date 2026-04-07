import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Typography, Container, CircularProgress, Alert } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import client from '../../api/client.js'
import CustomPageFreeform from './CustomPageFreeform.jsx'
import CustomPageList from './CustomPageList.jsx'
import CustomPageStructured from './CustomPageStructured.jsx'
import { useThemeMode } from '../../context/ThemeModeContext.jsx'
import buildProfileTheme from '../../theme/buildProfileTheme.js'

export default function CustomPage() {
  const { username, slug } = useParams()
  const { mode } = useThemeMode()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get(`/u/${username}/pages/${slug}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Page not found'))
      .finally(() => setLoading(false))
  }, [username, slug])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    )
  }

  const { page, entries, kind_def, body_html } = data

  const content = (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>{page.title}</Typography>
      {page.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {page.description}
        </Typography>
      )}
      {page.format === 'freeform' && (
        <CustomPageFreeform page={page} bodyHtml={body_html} />
      )}
      {page.format === 'list' && (
        <CustomPageList page={page} entries={entries} kindDef={kind_def} />
      )}
      {page.format === 'structured' && (
        <CustomPageStructured page={page} kindDef={kind_def} />
      )}
    </Container>
  )

  if (page?.theme_enabled && page?.theme) {
    return (
      <ThemeProvider theme={buildProfileTheme(page.theme, mode)}>
        <Box sx={{ bgcolor: 'background.default' }}>
          {content}
        </Box>
      </ThemeProvider>
    )
  }

  return content
}
