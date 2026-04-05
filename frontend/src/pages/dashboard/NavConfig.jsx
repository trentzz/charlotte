import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Box, Typography, Button, Paper, Divider, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Checkbox,
  List, ListItemButton, ListItemText, ListItemIcon, Alert, CircularProgress,
  TextField,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import client from '../../api/client.js'

const SECTION_DEFS = {
  home:     { label: 'Home',     hasDropdown: false },
  about:    { label: 'About',    hasDropdown: false },
  blog:     { label: 'Blog',     hasDropdown: true, key: 'blog' },
  projects: { label: 'Projects', hasDropdown: true, key: 'projects' },
  gallery:  { label: 'Gallery',  hasDropdown: true, key: 'gallery' },
  recipes:  { label: 'Recipes',  hasDropdown: true, key: 'recipes' },
}

const DEFAULT_SECTIONS = ['home', 'about', 'blog', 'projects', 'gallery', 'recipes']

function sortByOrder(pages, order) {
  if (!order || order.length === 0) return pages
  const idx = new Map(order.map((id, i) => [id, i]))
  return [...pages].sort((a, b) => {
    const ai = idx.has(a.id) ? idx.get(a.id) : Infinity
    const bi = idx.has(b.id) ? idx.get(b.id) : Infinity
    return ai - bi
  })
}

function SortableSectionCard({ sectionKey, label, customLabel, onLabelChange, pinnedSlugs, hasDropdown, onPickerOpen }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionKey })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Paper ref={setNodeRef} style={style} variant="outlined" sx={{ px: 2, py: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Drag handle */}
        <Box
          {...attributes}
          {...listeners}
          sx={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'text.disabled', mr: 0.5, touchAction: 'none' }}
        >
          <DragIndicatorIcon sx={{ fontSize: 20 }} />
        </Box>

        {/* Editable label */}
        <TextField
          variant="standard"
          size="small"
          value={customLabel}
          onChange={(e) => onLabelChange(sectionKey, e.target.value)}
          placeholder={label}
          slotProps={{
            input: {
              sx: {
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: 'text.primary',
                '& input::placeholder': { color: 'text.primary', opacity: 0.65, fontWeight: 600 },
              },
            },
          }}
          sx={{ flexGrow: 1 }}
        />

        {/* Pinned items chip */}
        {hasDropdown && (
          <Chip
            label={pinnedSlugs.length > 0 ? `${pinnedSlugs.length} pinned` : 'Using recent'}
            size="small"
            variant={pinnedSlugs.length > 0 ? 'filled' : 'outlined'}
            color={pinnedSlugs.length > 0 ? 'primary' : 'default'}
            onClick={onPickerOpen}
            sx={{ cursor: 'pointer' }}
          />
        )}
      </Box>
    </Paper>
  )
}

function SortablePageCard({ page }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Paper ref={setNodeRef} style={style} variant="outlined" sx={{ px: 2, py: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          {...attributes}
          {...listeners}
          sx={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'text.disabled', mr: 0.5, touchAction: 'none' }}
        >
          <DragIndicatorIcon sx={{ fontSize: 20 }} />
        </Box>
        <Typography variant="body1" fontWeight={500} sx={{ flexGrow: 1 }}>
          {page.title}
        </Typography>
        <Chip
          label={page.published ? 'Published' : 'Draft'}
          size="small"
          color={page.published ? 'success' : 'default'}
          variant="outlined"
        />
      </Box>
    </Paper>
  )
}

export default function NavConfig() {
  const [sections, setSections] = useState([...DEFAULT_SECTIONS])
  const [pinned, setPinned] = useState({})
  const [labels, setLabels] = useState({})
  const [available, setAvailable] = useState({})
  const [customPages, setCustomPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [pickerSection, setPickerSection] = useState(null)
  const labelDebounce = useRef(null)

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    client.get('/dashboard/nav-config')
      .then((res) => {
        const cfg = JSON.parse(res.data.nav_config || '{}')
        setSections(cfg.sections || [...DEFAULT_SECTIONS])
        setPinned(cfg.pinned || {})
        setLabels(cfg.labels || {})
        setAvailable(res.data.available || {})

        const pages = res.data.custom_pages || []
        const order = cfg.custom_pages_order || []
        setCustomPages(sortByOrder(pages, order))
      })
      .catch(() => setError('Failed to load nav configuration.'))
      .finally(() => setLoading(false))
  }, [])

  const save = useCallback((newSections, newPinned, newCustomPages, newLabels) => {
    const order = newCustomPages.map((p) => p.id)
    const cfg = JSON.stringify({
      sections: newSections,
      pinned: newPinned,
      labels: newLabels,
      custom_pages_order: order,
    })
    client.put('/dashboard/nav-config', { nav_config: cfg })
      .then(() => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      })
      .catch(() => setError('Failed to save.'))
  }, [])

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.indexOf(active.id)
    const newIndex = sections.indexOf(over.id)
    const next = arrayMove(sections, oldIndex, newIndex)
    setSections(next)
    save(next, pinned, customPages, labels)
  }

  function handleLabelChange(sectionKey, value) {
    const next = { ...labels, [sectionKey]: value }
    setLabels(next)
    clearTimeout(labelDebounce.current)
    labelDebounce.current = setTimeout(() => {
      save(sections, pinned, customPages, next)
    }, 800)
  }

  function handlePageDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = customPages.findIndex((p) => p.id === active.id)
    const newIndex = customPages.findIndex((p) => p.id === over.id)
    const next = arrayMove(customPages, oldIndex, newIndex)
    setCustomPages(next)
    save(sections, pinned, next, labels)
  }

  function handlePickerClose(selectedSlugs) {
    const next = { ...pinned, [pickerSection]: selectedSlugs }
    setPinned(next)
    setPickerSection(null)
    save(sections, next, customPages, labels)
  }

  if (loading) return <CircularProgress />

  return (
    <Box maxWidth={560}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          Navigation
        </Typography>
        {saved && (
          <Chip
            icon={<CheckIcon />}
            label="Saved"
            size="small"
            color="success"
            variant="outlined"
          />
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Drag to reorder sections, edit labels, and pin specific content to each dropdown.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections} strategy={verticalListSortingStrategy}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sections.map((sectionKey) => {
              const def = SECTION_DEFS[sectionKey]
              if (!def) return null
              const pinnedSlugs = pinned[sectionKey] || []
              const customLabel = labels[sectionKey] ?? ''

              return (
                <SortableSectionCard
                  key={sectionKey}
                  sectionKey={sectionKey}
                  label={def.label}
                  customLabel={customLabel}
                  onLabelChange={handleLabelChange}
                  pinnedSlugs={pinnedSlugs}
                  hasDropdown={def.hasDropdown}
                  onPickerOpen={() => setPickerSection(sectionKey)}
                />
              )
            })}
          </Box>
        </SortableContext>
      </DndContext>

      {customPages.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Custom page order
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Drag to set the display order for your custom pages in the navigation.
          </Typography>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePageDragEnd}>
            <SortableContext items={customPages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {customPages.map((page) => (
                  <SortablePageCard key={page.id} page={page} />
                ))}
              </Box>
            </SortableContext>
          </DndContext>
        </Box>
      )}

      {pickerSection && (
        <PinnedItemsPicker
          section={pickerSection}
          sectionLabel={labels[pickerSection] || SECTION_DEFS[pickerSection]?.label || pickerSection}
          availableItems={available[pickerSection] || []}
          currentPinned={pinned[pickerSection] || []}
          onClose={handlePickerClose}
        />
      )}
    </Box>
  )
}

function PinnedItemsPicker({ section, sectionLabel, availableItems, currentPinned, onClose }) {
  const [selected, setSelected] = useState(new Set(currentPinned))

  function toggle(slug) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else if (next.size < 8) {
        next.add(slug)
      }
      return next
    })
  }

  function handleSave() {
    // Preserve pinned order: keep slugs from currentPinned that are still selected,
    // then append newly selected ones.
    const ordered = currentPinned.filter((s) => selected.has(s))
    const added = [...selected].filter((s) => !currentPinned.includes(s))
    onClose([...ordered, ...added])
  }

  function handleClear() {
    onClose([])
  }

  return (
    <Dialog open onClose={() => onClose(currentPinned)} maxWidth="sm" fullWidth>
      <DialogTitle>
        Pinned items — {sectionLabel}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {availableItems.length === 0 ? (
          <Box sx={{ px: 3, py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No published content found for this section.
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Select up to 8 items. Unselected sections fall back to recent content.
              </Typography>
            </Box>
            <List dense disablePadding>
              {availableItems.map((item, i) => (
                <React.Fragment key={item.slug}>
                  {i > 0 && <Divider component="li" />}
                  <ListItemButton
                    onClick={() => toggle(item.slug)}
                    disabled={!selected.has(item.slug) && selected.size >= 8}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={selected.has(item.slug)}
                        tabIndex={-1}
                        disableRipple
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      secondary={`/${item.slug}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItemButton>
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
        <Button size="small" color="inherit" onClick={handleClear}>
          Clear pinned
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={() => onClose(currentPinned)}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleSave}>
            Save
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
