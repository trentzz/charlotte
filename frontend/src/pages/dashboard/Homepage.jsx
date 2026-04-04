import React, { useCallback, useEffect, useRef, useState } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import {
  Box, Typography, Paper, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItemButton, ListItemText,
  ListItemAvatar, Avatar, TextField, CircularProgress, Chip, Divider,
  Alert,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import LinkIcon from '@mui/icons-material/Link'
import ArticleIcon from '@mui/icons-material/Article'
import PhotoIcon from '@mui/icons-material/Photo'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import WorkIcon from '@mui/icons-material/Work'
import CloseIcon from '@mui/icons-material/Close'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import client from '../../api/client.js'

// Default grid sizes per widget type.
const WIDGET_DEFAULTS = {
  profile:   { w: 3, h: 4 },
  text:      { w: 4, h: 3 },
  link:      { w: 3, h: 2 },
  blog_post: { w: 4, h: 3 },
  photo:     { w: 3, h: 4 },
  album:     { w: 4, h: 3 },
  recipe:    { w: 4, h: 3 },
  project:   { w: 4, h: 3 },
}

// Accent colours per widget type.
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

const PALETTE = [
  { type: 'profile',   label: 'Profile card',    Icon: PersonIcon,       description: 'Your avatar, name, and bio' },
  { type: 'text',      label: 'Text block',       Icon: TextFieldsIcon,   description: 'Custom text or markdown' },
  { type: 'link',      label: 'Link',             Icon: LinkIcon,         description: 'External link with label' },
  { type: 'blog_post', label: 'Blog post',        Icon: ArticleIcon,      description: 'Pin a specific post' },
  { type: 'photo',     label: 'Photo',            Icon: PhotoIcon,        description: 'Pin a single photo' },
  { type: 'album',     label: 'Album',            Icon: PhotoLibraryIcon, description: 'Feature a photo album' },
  { type: 'recipe',    label: 'Recipe',           Icon: MenuBookIcon,     description: 'Pin a recipe' },
  { type: 'project',   label: 'Project',          Icon: WorkIcon,         description: 'Showcase a project' },
]

// Content-linked widget types that need a picker.
const CONTENT_TYPES = new Set(['blog_post', 'photo', 'album', 'recipe', 'project'])

// Simple counter for unique widget IDs within a session.
let widgetCounter = 1
function nextID() {
  return `w${Date.now()}_${widgetCounter++}`
}

// Convert backend Widget array to react-grid-layout layout array.
function widgetsToLayout(widgets) {
  if (!Array.isArray(widgets)) return []
  return widgets.map((w) => {
    const layout = w.layout || { x: 0, y: 0, w: 4, h: 3 }
    return {
      i: w.id,
      x: layout.x,
      y: layout.y,
      w: layout.w,
      h: layout.h,
    }
  })
}

// Merge an updated layout into the widgets array.
function applyLayout(widgets, layout) {
  const byID = {}
  layout.forEach((l) => { byID[l.i] = l })
  return widgets.map((w) => {
    const l = byID[w.id]
    if (!l && !w.layout) return { ...w, layout: { x: 0, y: 0, w: 4, h: 3 } }
    if (!l) return w
    return { ...w, layout: { x: l.x, y: l.y, w: l.w, h: l.h } }
  })
}

// ── Widget card rendered on the canvas ───────────────────────────────────────

function WidgetCard({ widget, onRemove, available }) {
  const colour = WIDGET_COLOURS[widget.type] || '#9e9e9e'
  const entry = PALETTE.find((p) => p.type === widget.type)
  const Icon = entry?.Icon || ArticleIcon

  // Resolve a display label for the widget.
  function resolveLabel() {
    if (widget.label) return widget.label
    if (widget.content) return widget.content
    if (widget.content_id) {
      const list = available?.[widget.type + 's'] || []
      const item = list.find((x) => x.id === widget.content_id)
      return item?.title || item?.caption || `#${widget.content_id}`
    }
    return entry?.label || widget.type
  }

  const label = resolveLabel()
  const photoURL = widget.type === 'photo' && widget.content_id
    ? available?.photos?.find((p) => p.id === widget.content_id)?.url
    : null

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
        position: 'relative',
      }}
    >
      {/* Coloured accent strip + drag handle */}
      <Box
        className="widget-drag-handle"
        sx={{
          height: 6,
          bgcolor: colour,
          cursor: 'grab',
          flexShrink: 0,
        }}
      />

      {/* Remove button */}
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onRemove(widget.id) }}
        sx={{
          position: 'absolute',
          top: 8,
          right: 4,
          zIndex: 10,
          bgcolor: 'background.paper',
          p: 0.25,
          '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
        }}
      >
        <CloseIcon sx={{ fontSize: 14 }} />
      </IconButton>

      {/* Drag handle icon in top-left corner */}
      <DragIndicatorIcon
        className="widget-drag-handle"
        sx={{
          position: 'absolute',
          top: 10,
          left: 6,
          fontSize: 16,
          color: 'text.disabled',
          cursor: 'grab',
        }}
      />

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'hidden', p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {photoURL ? (
          <Box
            component="img"
            src={photoURL}
            alt={label}
            sx={{ width: '100%', flex: 1, objectFit: 'cover', borderRadius: 1 }}
          />
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Icon sx={{ fontSize: 18, color: colour, flexShrink: 0 }} />
              <Chip
                label={entry?.label || widget.type}
                size="small"
                sx={{ fontSize: 10, height: 18, bgcolor: colour + '22', color: colour }}
              />
            </Box>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.3,
              }}
            >
              {label}
            </Typography>
            {widget.url && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {widget.url}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Box>
  )
}

// ── Content picker dialog ─────────────────────────────────────────────────────

function ContentPickerDialog({ open, widgetType, available, onPick, onClose }) {
  const listKey = widgetType + 's'
  const items = available?.[listKey] || []

  function labelFor(item) {
    return item.title || item.caption || `#${item.id}`
  }

  function subtitleFor(item) {
    if (widgetType === 'blog_post') return item.created_at?.slice(0, 10)
    if (widgetType === 'photo') return item.mime_type
    if (widgetType === 'album') return `${item.photo_count} photo${item.photo_count === 1 ? '' : 's'}`
    if (widgetType === 'recipe') return item.description?.slice(0, 60)
    if (widgetType === 'project') return item.description?.slice(0, 60)
    return ''
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Choose a {widgetType.replace('_', ' ')}</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {items.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">No items available.</Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {items.map((item) => (
              <ListItemButton key={item.id} onClick={() => onPick(item)}>
                {item.url && widgetType === 'photo' ? (
                  <ListItemAvatar>
                    <Avatar variant="rounded" src={item.url} sx={{ width: 40, height: 40 }} />
                  </ListItemAvatar>
                ) : null}
                {item.cover_photo?.url && widgetType === 'album' ? (
                  <ListItemAvatar>
                    <Avatar variant="rounded" src={item.cover_photo.url} sx={{ width: 40, height: 40 }} />
                  </ListItemAvatar>
                ) : null}
                <ListItemText
                  primary={labelFor(item)}
                  secondary={subtitleFor(item)}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                  secondaryTypographyProps={{ fontSize: 12, noWrap: true }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Text / link input dialog ──────────────────────────────────────────────────

function TextInputDialog({ open, widgetType, onConfirm, onClose }) {
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (open) { setContent(''); setUrl(''); setLabel('') }
  }, [open])

  function handleConfirm() {
    if (widgetType === 'text') {
      if (!content.trim()) return
      onConfirm({ content: content.trim() })
    } else {
      if (!url.trim()) return
      onConfirm({ url: url.trim(), label: label.trim() || url.trim() })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{widgetType === 'text' ? 'Add text block' : 'Add link'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {widgetType === 'text' ? (
          <TextField
            label="Content"
            multiline
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            fullWidth
          />
        ) : (
          <>
            <TextField
              label="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
              fullWidth
            />
            <TextField
              label="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm}>Add</Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Homepage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | error
  const [widgets, setWidgets] = useState([])
  const [available, setAvailable] = useState(null)
  const [canvasWidth, setCanvasWidth] = useState(800)

  // Dialog state.
  const [pickerType, setPickerType] = useState(null)    // widget type being picked
  const [textType, setTextType] = useState(null)        // 'text' | 'link'

  const canvasRef = useRef(null)
  const saveTimerRef = useRef(null)

  // Measure canvas width.
  useEffect(() => {
    if (!canvasRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      setCanvasWidth(entry.contentRect.width || 800)
    })
    obs.observe(canvasRef.current)
    return () => obs.disconnect()
  }, [])

  // Load initial data.
  useEffect(() => {
    client.get('/dashboard/homepage')
      .then((res) => {
        const { layout, ...rest } = res.data
        setWidgets(layout?.widgets || [])
        setAvailable(rest)
      })
      .catch((err) => {
        const msg = err.response?.data?.error || 'Failed to load homepage data.'
        setLoadError(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  // Auto-save with 1s debounce.
  const scheduleSave = useCallback((updatedWidgets) => {
    clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(() => {
      client.put('/dashboard/homepage', { widgets: updatedWidgets })
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'))
    }, 1000)
  }, [])

  function handleLayoutChange(layout) {
    setWidgets((prev) => {
      const updated = applyLayout(prev, layout)
      scheduleSave(updated)
      return updated
    })
  }

  function removeWidget(id) {
    setWidgets((prev) => {
      const updated = prev.filter((w) => w.id !== id)
      scheduleSave(updated)
      return updated
    })
  }

  function addWidget(type, extra = {}) {
    const defaults = WIDGET_DEFAULTS[type] || { w: 4, h: 3 }
    const id = nextID()
    const newWidget = {
      id,
      type,
      layout: { x: 0, y: 0, w: defaults.w, h: defaults.h },
      ...extra,
    }
    setWidgets((prev) => {
      const updated = [...prev, newWidget]
      scheduleSave(updated)
      return updated
    })
  }

  // Handle palette "Add" click.
  function handlePaletteAdd(type) {
    if (type === 'profile') {
      addWidget('profile')
      return
    }
    if (type === 'text' || type === 'link') {
      setTextType(type)
      return
    }
    if (CONTENT_TYPES.has(type)) {
      setPickerType(type)
    }
  }

  function handlePickerConfirm(item) {
    const type = pickerType
    setPickerType(null)
    addWidget(type, { content_id: item.id, label: item.title || item.caption || '' })
  }

  function handleTextConfirm(extra) {
    const type = textType
    setTextType(null)
    addWidget(type, extra)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (loadError) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">{loadError}</Alert>
      </Box>
    )
  }

  let gridLayout = []
  try {
    gridLayout = widgetsToLayout(widgets)
  } catch (err) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">Failed to render widget layout. Please reload the page.</Alert>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="h5" fontWeight={700}>Homepage builder</Typography>
          <Typography variant="caption" color={
            saveStatus === 'saving' ? 'text.secondary'
              : saveStatus === 'saved' ? 'success.main'
              : saveStatus === 'error' ? 'error.main'
              : 'transparent'
          }>
            {saveStatus === 'saving' ? 'Saving…'
              : saveStatus === 'saved' ? 'Saved'
              : saveStatus === 'error' ? 'Save failed'
              : '.'}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Drag and resize widgets to arrange your homepage. Changes save automatically.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Left palette */}
        <Box sx={{ width: 240, flexShrink: 0 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontSize: 11, letterSpacing: '0.08em' }}>
            Widgets
          </Typography>
          {PALETTE.map((entry) => {
            const Icon = entry.Icon
            const colour = WIDGET_COLOURS[entry.type]
            return (
              <Paper
                key={entry.type}
                variant="outlined"
                sx={{ mb: 1, p: 1.5, borderRadius: 1.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Icon sx={{ fontSize: 18, color: colour }} />
                  <Typography variant="body2" fontWeight={600} sx={{ flexGrow: 1, fontSize: 13 }}>
                    {entry.label}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.3 }}>
                  {entry.description}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={() => handlePaletteAdd(entry.type)}
                  sx={{ fontSize: 12, py: 0.25, borderColor: colour, color: colour, '&:hover': { borderColor: colour, bgcolor: colour + '11' } }}
                >
                  Add
                </Button>
              </Paper>
            )
          })}
        </Box>

        {/* Right canvas */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box
            ref={canvasRef}
            sx={{
              width: '100%',
              minHeight: 500,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)',
              backgroundSize: `calc(100% / 12) 80px`,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {widgets.length === 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Typography color="text.disabled" variant="body2">
                  Add widgets from the panel on the left.
                </Typography>
              </Box>
            )}
            <GridLayout
              className="layout"
              layout={gridLayout}
              cols={12}
              rowHeight={80}
              width={canvasWidth}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".widget-drag-handle"
              compactType="vertical"
              resizeHandles={['se']}
              margin={[8, 8]}
            >
              {widgets.map((widget) => (
                <div key={widget.id} style={{ boxSizing: 'border-box' }}>
                  <WidgetCard
                    widget={widget}
                    onRemove={removeWidget}
                    available={available}
                  />
                </div>
              ))}
            </GridLayout>
          </Box>
        </Box>
      </Box>

      {/* Picker dialog for content-linked widgets */}
      <ContentPickerDialog
        open={Boolean(pickerType)}
        widgetType={pickerType}
        available={available}
        onPick={handlePickerConfirm}
        onClose={() => setPickerType(null)}
      />

      {/* Text / link input dialog */}
      <TextInputDialog
        open={Boolean(textType)}
        widgetType={textType}
        onConfirm={handleTextConfirm}
        onClose={() => setTextType(null)}
      />
    </Box>
  )
}
