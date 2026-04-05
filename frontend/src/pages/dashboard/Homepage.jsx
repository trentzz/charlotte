import React, { Component, useCallback, useEffect, useRef, useState } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// Lazy-load react-quill to avoid Vite ESM compatibility issues.
let _ReactQuill = null
async function loadQuill() {
  if (_ReactQuill) return _ReactQuill
  const mod = await import('react-quill')
  await import('react-quill/dist/quill.snow.css')
  _ReactQuill = mod.default
  return _ReactQuill
}
import {
  Box, Typography, Paper, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItemButton, ListItemText,
  ListItemAvatar, Avatar, TextField, CircularProgress, Chip, Divider,
  Alert, useMediaQuery, ToggleButtonGroup, ToggleButton,
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
import EditIcon from '@mui/icons-material/Edit'
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

// Default widget layout shown when a user has not configured their homepage yet.
const DEFAULT_WIDGETS = [
  { id: 'default_profile', type: 'profile', layout: { x: 0, y: 0, w: 4, h: 5 } },
  { id: 'default_intro',   type: 'text',    layout: { x: 4, y: 0, w: 8, h: 5 },
    content: '<h2>Welcome</h2><p>This is your homepage. Add a short introduction, link to your work, or tell people what you\'re up to.</p>' },
]

// Simple counter for unique widget IDs within a session.
let widgetCounter = 1
function nextID() {
  return `w${Date.now()}_${widgetCounter++}`
}

// Convert backend Widget array to react-grid-layout layout array.
function widgetsToLayout(widgets) {
  if (!Array.isArray(widgets)) return []
  return widgets
    .filter((w) => w.id && typeof w.id === 'string' && w.id.length > 0)
    .map((w) => {
      const layout = w.layout || { x: 0, y: 0, w: 4, h: 3 }
      return {
        i: w.id,
        x: layout.x ?? 0,
        y: layout.y ?? 0,
        w: Math.min(layout.w || 4, 12),
        h: layout.h || 3,
        minW: 2,
        minH: 2,
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

function WidgetCard({ widget, onRemove, onEdit, available }) {
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

  const albumData = widget.type === 'album' && widget.content_id
    ? available?.albums?.find((a) => a.id === widget.content_id)
    : null
  const albumCoverURL = albumData?.cover_photo?.url || null
  const albumName = albumData?.title || label

  return (
    <Box
      className="widget-drag-handle"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        cursor: 'grab',
      }}
    >
      {/* Edit + Remove buttons */}
      <Box sx={{ position: 'absolute', top: 4, right: 4, zIndex: 10, display: 'flex', gap: 0.5 }}>
        {widget.type !== 'profile' && (
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onEdit(widget) }}
            sx={{ bgcolor: 'background.paper', p: 0.25, opacity: 0.7, '&:hover': { opacity: 1 } }}
          >
            <EditIcon sx={{ fontSize: 13 }} />
          </IconButton>
        )}
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); onRemove(widget.id) }}
          sx={{ bgcolor: 'background.paper', p: 0.25, opacity: 0.7, '&:hover': { bgcolor: 'error.light', color: 'error.contrastText', opacity: 1 } }}
        >
          <CloseIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'hidden', p: 1.5, pt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {photoURL ? (
          <Box
            component="img"
            src={photoURL}
            alt={label}
            sx={{ width: '100%', flex: 1, objectFit: 'cover', borderRadius: 1 }}
          />
        ) : albumCoverURL ? (
          <>
            <Box
              component="img"
              src={albumCoverURL}
              alt={albumName}
              sx={{ width: '100%', flex: 1, objectFit: 'cover', borderRadius: 1 }}
            />
            <Typography
              variant="caption"
              align="center"
              sx={{ display: 'block', pt: 0.25, color: 'text.secondary', fontWeight: 500 }}
            >
              {albumName}
            </Typography>
          </>
        ) : (
          <>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              {entry?.label || widget.type}
            </Typography>
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
      <DialogTitle>Choose a {widgetType?.replace('_', ' ') ?? ''}</DialogTitle>
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

function TextInputDialog({ open, widgetType, initial, onConfirm, onClose }) {
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [QuillComp, setQuillComp] = useState(null)

  useEffect(() => {
    if (open) {
      setContent(initial?.content || '')
      setUrl(initial?.url || '')
      setLabel(initial?.label || '')
      if (widgetType === 'text') {
        loadQuill().then((Q) => setQuillComp(() => Q))
      }
    }
  }, [open, widgetType])

  function handleConfirm() {
    if (widgetType === 'text') {
      const stripped = content.replace(/<[^>]*>/g, '').trim()
      if (!stripped) return
      onConfirm({ content })
    } else {
      if (!url.trim()) return
      onConfirm({ url: url.trim(), label: label.trim() || url.trim() })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{widgetType === 'text' ? (initial?.content ? 'Edit text block' : 'Add text block') : (initial?.url ? 'Edit link' : 'Add link')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {widgetType === 'text' ? (
          <Box>
            {QuillComp ? (
              <QuillComp
                theme="snow"
                value={content}
                onChange={setContent}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link'],
                    ['clean'],
                  ],
                }}
                style={{ height: 220, marginBottom: 42 }}
              />
            ) : (
              <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>
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

const SIMPLE_DEFAULT_CONTENT = `<h1>Hello, welcome</h1>
<p>Welcome to my corner of the internet. I write about things I find interesting, share photos, and document projects I'm working on.</p>
<h2>What I'm up to</h2>
<p>Add what you're currently working on, reading, or thinking about.</p>`

// ── Simple mode editor ────────────────────────────────────────────────────────

function SimpleModeEditor({ simpleContent, setSimpleContent, widgets, onSave, saveStatus }) {
  const [QuillComp, setQuillComp] = useState(null)

  useEffect(() => {
    loadQuill().then((Q) => setQuillComp(() => Q))
  }, [])

  const saved = saveStatus === 'saved'
  const saving = saveStatus === 'saving'

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Write your homepage as a single rich-text page.
      </Typography>
      {QuillComp ? (
        <Paper variant="outlined" sx={{ mb: 2, '& .ql-container': { minHeight: 400, fontSize: 15 } }}>
          <QuillComp
            theme="snow"
            value={simpleContent || SIMPLE_DEFAULT_CONTENT}
            onChange={setSimpleContent}
            modules={{
              toolbar: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link', 'image'],
                ['clean'],
              ],
            }}
          />
        </Paper>
      ) : (
        <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      <Button
        variant="contained"
        color={saved ? 'success' : 'primary'}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save homepage'}
      </Button>
    </Box>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function Homepage() {
  const isWide = useMediaQuery('(min-width: 1400px)')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | error
  const [widgets, setWidgets] = useState([])
  const [available, setAvailable] = useState(null)
  const [canvasWidth, setCanvasWidth] = useState(800)
  const [mode, setMode] = useState('builder') // 'simple' | 'builder'
  const [simpleContent, setSimpleContent] = useState('')

  // Dialog state.
  const [pickerType, setPickerType] = useState(null)    // widget type being picked (add)
  const [textType, setTextType] = useState(null)        // 'text' | 'link' (add)
  const [editingWidget, setEditingWidget] = useState(null) // widget being edited

  const canvasRef = useRef(null)
  const saveTimerRef = useRef(null)
  // Refs so debounced save always uses current values without stale closures.
  const simpleContentRef = useRef('')
  const modeRef = useRef('builder')

  useEffect(() => { simpleContentRef.current = simpleContent }, [simpleContent])
  useEffect(() => { modeRef.current = mode }, [mode])

  // Measure canvas width. Use rAF to ensure the element is laid out before
  // reading its size, then track ongoing changes with ResizeObserver.
  useEffect(() => {
    if (!canvasRef.current) return
    const el = canvasRef.current
    const read = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setCanvasWidth(w)
    }
    // First read after layout.
    requestAnimationFrame(read)
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) setCanvasWidth(w)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Load initial data.
  useEffect(() => {
    client.get('/dashboard/homepage')
      .then((res) => {
        const { layout, ...rest } = res.data
        setWidgets(layout?.widgets?.length > 0 ? layout.widgets : DEFAULT_WIDGETS)
        setSimpleContent(layout?.simple_content || '')
        setMode(layout?.mode || 'builder')
        setAvailable({ ...rest, blog_posts: rest.posts || [] })
      })
      .catch((err) => {
        const msg = err.response?.data?.error || 'Failed to load homepage data.'
        setLoadError(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  // Auto-save with 1s debounce (builder mode).
  // Reads mode and simpleContent from refs so the callback stays stable.
  const scheduleSave = useCallback((updatedWidgets) => {
    clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(() => {
      client.put('/dashboard/homepage', {
        mode: modeRef.current,
        simple_content: simpleContentRef.current,
        widgets: updatedWidgets,
      })
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'))
    }, 1000)
  }, [])

  // Save for simple mode (manual).
  function handleSimpleSave() {
    setSaveStatus('saving')
    client.put('/dashboard/homepage', {
      mode: 'simple',
      simple_content: simpleContent,
      widgets,
    })
      .then(() => {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1500)
      })
      .catch(() => setSaveStatus('error'))
  }

  // Switch modes and persist immediately.
  function handleModeChange(_, newMode) {
    if (!newMode || newMode === mode) return
    setMode(newMode)
    setSaveStatus('saving')
    client.put('/dashboard/homepage', {
      mode: newMode,
      simple_content: simpleContent,
      widgets,
    })
      .then(() => setSaveStatus('saved'))
      .catch(() => setSaveStatus('error'))
  }

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
    if (editingWidget) {
      handlePickerConfirmEdit(item)
      return
    }
    const type = pickerType
    setPickerType(null)
    addWidget(type, { content_id: item.id, label: item.title || item.caption || '' })
  }

  function handleTextConfirm(extra) {
    if (editingWidget) {
      updateWidget(editingWidget.id, extra)
      setEditingWidget(null)
    } else {
      const type = textType
      setTextType(null)
      addWidget(type, extra)
    }
  }

  function updateWidget(id, extra) {
    setWidgets((prev) => {
      const updated = prev.map((w) => w.id === id ? { ...w, ...extra } : w)
      scheduleSave(updated)
      return updated
    })
  }

  function handleEditWidget(widget) {
    setEditingWidget(widget)
    if (widget.type === 'text' || widget.type === 'link') {
      setTextType(widget.type)
    } else if (CONTENT_TYPES.has(widget.type)) {
      setPickerType(widget.type)
    }
  }

  function handlePickerConfirmEdit(item) {
    if (editingWidget) {
      updateWidget(editingWidget.id, { content_id: item.id, label: item.title || item.caption || '' })
      setEditingWidget(null)
    }
    setPickerType(null)
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
          <Typography variant="h5" fontWeight={700}>Homepage</Typography>
          {mode === 'builder' && (
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
          )}
        </Box>

        {/* Mode toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
          >
            <ToggleButton value="simple">Simple</ToggleButton>
            <ToggleButton value="builder">Builder</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary">
            {mode === 'simple'
              ? 'Write your homepage as a single rich-text page.'
              : 'Drag and resize widgets to arrange your homepage. Changes save automatically.'}
          </Typography>
        </Box>
      </Box>

      {/* Simple mode */}
      {mode === 'simple' && (
        <SimpleModeEditor
          simpleContent={simpleContent}
          setSimpleContent={setSimpleContent}
          widgets={widgets}
          onSave={handleSimpleSave}
          saveStatus={saveStatus}
        />
      )}

      {/* Builder mode */}
      {mode === 'builder' && (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Canvas */}
        <Box
          ref={canvasRef}
          sx={{
            width: '100%',
            minHeight: 600,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)',
            backgroundSize: `calc(100% / 12) 80px`,
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
                Add widgets from the palette below.
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
            resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
            margin={[8, 8]}
          >
            {widgets.filter((w) => w.id).map((widget) => (
              <div key={widget.id} style={{ boxSizing: 'border-box' }}>
                <WidgetCard
                  widget={widget}
                  onRemove={removeWidget}
                  onEdit={handleEditWidget}
                  available={available}
                />
              </div>
            ))}
          </GridLayout>
        </Box>

        {/* Widget palette — grid below canvas */}
        <Box>
          <Typography variant="overline" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontSize: 11, letterSpacing: '0.08em' }}>
            Add widgets
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 1 }}>
            {PALETTE.map((entry) => {
              const Icon = entry.Icon
              return (
                <Paper
                  key={entry.type}
                  variant="outlined"
                  sx={{ p: 1.25, borderRadius: 1.5 }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Icon sx={{ fontSize: 15, color: 'text.secondary' }} />
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>
                        {entry.label}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      fullWidth
                      onClick={() => handlePaletteAdd(entry.type)}
                      sx={{ fontSize: 11, py: 0.25, minWidth: 0 }}
                    >
                      Add
                    </Button>
                  </Box>
                </Paper>
              )
            })}
          </Box>
        </Box>
      </Box>
      )}

      {/* Picker dialog for content-linked widgets */}
      <ContentPickerDialog
        open={Boolean(pickerType)}
        widgetType={pickerType}
        available={available}
        onPick={handlePickerConfirm}
        onClose={() => { setPickerType(null); setEditingWidget(null) }}
      />

      {/* Text / link input dialog */}
      <TextInputDialog
        open={Boolean(textType)}
        widgetType={textType}
        initial={editingWidget}
        onConfirm={handleTextConfirm}
        onClose={() => { setTextType(null); setEditingWidget(null) }}
      />
    </Box>
  )
}

class HomepageErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <Box sx={{ mt: 4, p: 3 }}>
          <Alert severity="error">
            Failed to render the homepage builder: {this.state.error?.message || 'Unknown error'}
          </Alert>
        </Box>
      )
    }
    return this.props.children
  }
}

const HomepageWithBoundary = () => (
  <HomepageErrorBoundary>
    <Homepage />
  </HomepageErrorBoundary>
)

export { HomepageWithBoundary as default }
