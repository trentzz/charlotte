import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Radio, RadioGroup,
  FormControlLabel, FormLabel, FormControl, Card, CardContent,
  CardActionArea, Grid, CircularProgress, Alert, Switch, Tooltip,
  Stack,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import client from '../../api/client.js'

// Kind icon — a simple emoji fallback based on kind name.
function kindEmoji(kind) {
  const map = {
    freeform: '📄',
    list: '📋',
    books: '📚',
    movies: '🎬',
    games: '🎮',
    music: '🎵',
    tv: '📺',
    travel: '✈️',
    recipes: '🍳',
    bucketlist: '🗺️',
    faq: '❓',
    resume: '📝',
    event: '🎉',
  }
  return map[kind] || '📄'
}

export default function CustomPages() {
  const navigate = useNavigate()

  const [pages, setPages] = useState([])
  const [navMode, setNavMode] = useState('grouped')
  const [navLabel, setNavLabel] = useState('More')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Create dialog state.
  const [dialogOpen, setDialogOpen] = useState(false)
  const [kinds, setKinds] = useState([])
  const [kindsLoading, setKindsLoading] = useState(false)
  const [selectedKind, setSelectedKind] = useState(null)
  const [createTitle, setCreateTitle] = useState('')
  const [createSlug, setCreateSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  // Delete dialog state.
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Nav save debounce.
  const navSaveTimer = useRef(null)
  const navRef = useRef({ mode: 'grouped', label: 'More' })

  async function load() {
    try {
      const res = await client.get('/dashboard/custom-pages')
      setPages(res.data.pages || [])
      const nav = res.data.nav || {}
      setNavMode(nav.mode || 'grouped')
      setNavLabel(nav.label || 'More')
      navRef.current = { mode: nav.mode || 'grouped', label: nav.label || 'More' }
    } catch {
      setError('Failed to load custom pages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function saveNav(mode, label) {
    clearTimeout(navSaveTimer.current)
    navRef.current = { mode, label }
    navSaveTimer.current = setTimeout(() => {
      client.put('/dashboard/custom-pages/nav', { mode, label }).catch(() => {})
    }, 800)
  }

  function handleNavModeChange(e) {
    const mode = e.target.value
    setNavMode(mode)
    saveNav(mode, navLabel)
  }

  function handleNavLabelChange(e) {
    const label = e.target.value
    setNavLabel(label)
    saveNav(navMode, label)
  }

  async function openDialog() {
    setDialogOpen(true)
    setSelectedKind(null)
    setCreateTitle('')
    setCreateSlug('')
    setCreateError(null)
    if (kinds.length === 0) {
      setKindsLoading(true)
      try {
        const res = await client.get('/dashboard/custom-pages/kinds')
        setKinds(res.data.kinds || [])
      } catch {
        setCreateError('Failed to load page types.')
      } finally {
        setKindsLoading(false)
      }
    }
  }

  function selectKind(kind) {
    setSelectedKind(kind)
    setCreateTitle(kind.label)
    setCreateSlug(kind.default_slug)
  }

  async function handleCreate() {
    if (!selectedKind) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await client.post('/dashboard/custom-pages', {
        kind: selectedKind.kind,
        title: createTitle,
        slug: createSlug,
      })
      const page = res.data.page || res.data
      setDialogOpen(false)
      navigate(`/dashboard/custom-pages/${page.id}`)
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create page.')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(page) {
    try {
      const res = await client.patch(`/dashboard/custom-pages/${page.id}/toggle`)
      const updated = res.data.page || res.data
      setPages((ps) => ps.map((p) => p.id === updated.id ? updated : p))
    } catch {
      setError('Failed to update publish status.')
    }
  }

  async function handlePinToggle(page) {
    try {
      const res = await client.put(`/dashboard/custom-pages/${page.id}`, { nav_pinned: !page.nav_pinned })
      const updated = res.data.page || res.data
      setPages((ps) => ps.map((p) => p.id === updated.id ? updated : p))
    } catch {
      setError('Failed to update nav pin.')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await client.delete(`/dashboard/custom-pages/${deleteId}`)
      setPages((ps) => ps.filter((p) => p.id !== deleteId))
      setDeleteId(null)
    } catch {
      setError('Failed to delete page.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Custom pages</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
          Add page
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Nav mode settings */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Navigation settings
        </Typography>
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ fontSize: 13, mb: 0.5 }}>
            How to show custom pages in the navigation
          </FormLabel>
          <RadioGroup row value={navMode} onChange={handleNavModeChange}>
            <FormControlLabel
              value="individual"
              control={<Radio size="small" />}
              label="Top-level nav items"
            />
            <FormControlLabel
              value="grouped"
              control={<Radio size="small" />}
              label="Under a dropdown"
            />
          </RadioGroup>
        </FormControl>
        {navMode === 'grouped' && (
          <Box sx={{ mt: 1.5 }}>
            <TextField
              label="Dropdown label"
              value={navLabel}
              onChange={handleNavLabelChange}
              size="small"
              sx={{ width: 240 }}
              helperText='The label shown in the nav bar (e.g. "More")'
            />
          </Box>
        )}
      </Paper>

      {/* Pages table */}
      {pages.length === 0 ? (
        <Typography color="text.secondary">No custom pages yet. Click "Add page" to create one.</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Kind</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell align="center">Published</TableCell>
                <TableCell align="center">Nav</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{page.title}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={page.kind}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={page.format}
                      size="small"
                      color={page.format === 'freeform' ? 'default' : page.format === 'list' ? 'info' : 'secondary'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">/{page.slug}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={page.published ? 'Published — click to unpublish' : 'Draft — click to publish'}>
                      <IconButton size="small" onClick={() => handleToggle(page)}>
                        {page.published
                          ? <VisibilityIcon fontSize="small" color="success" />
                          : <VisibilityOffIcon fontSize="small" color="disabled" />
                        }
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={page.nav_pinned ? 'Pinned to top nav — click for dropdown' : 'In dropdown menu — click to pin to top nav'}>
                      <IconButton size="small" onClick={() => handlePinToggle(page)}>
                        {page.nav_pinned
                          ? <PushPinIcon fontSize="small" color="primary" />
                          : <PushPinOutlinedIcon fontSize="small" color="disabled" />
                        }
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" onClick={() => navigate(`/dashboard/custom-pages/${page.id}`)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteId(page.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add a custom page</DialogTitle>
        <DialogContent>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}

          {selectedKind ? (
            // Step 2: fill in title and slug.
            <Box sx={{ pt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Type: <strong>{kindEmoji(selectedKind.kind)} {selectedKind.label}</strong>
                </Typography>
                <Button size="small" onClick={() => setSelectedKind(null)}>Change</Button>
              </Box>
              <Stack spacing={2}>
                <TextField
                  label="Title"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                  fullWidth
                  autoFocus
                />
                <TextField
                  label="Slug"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  required
                  fullWidth
                  helperText="Used in the URL: /u/username/pages/slug"
                />
              </Stack>
            </Box>
          ) : (
            // Step 1: pick a kind.
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose a page type:
              </Typography>
              {kindsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {kinds.map((kind) => (
                    <Grid item xs={12} sm={6} md={4} key={kind.kind}>
                      <Card
                        variant="outlined"
                        sx={{ height: '100%', cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                      >
                        <CardActionArea onClick={() => selectKind(kind)} sx={{ height: '100%' }}>
                          <CardContent>
                            <Typography variant="h5" sx={{ mb: 0.5 }}>
                              {kindEmoji(kind.kind)}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {kind.label}
                            </Typography>
                            {kind.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {kind.description}
                              </Typography>
                            )}
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          {selectedKind && (
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={creating || !createTitle || !createSlug}
            >
              {creating ? 'Creating…' : 'Create'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete this page?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently delete the page and all its entries. This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
