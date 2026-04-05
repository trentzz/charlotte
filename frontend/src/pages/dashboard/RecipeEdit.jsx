import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  Stack, Divider, IconButton, Paper, List, ListItem, ListItemText,
  ListItemSecondaryAction, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Checkbox, FormControlLabel, Switch,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import CheckIcon from '@mui/icons-material/Check'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import client from '../../api/client.js'

// ── Sortable item used for both ingredients and method steps ───────────────────

function SortableItem({ id, label, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <ListItem ref={setNodeRef} style={style} sx={{ pl: 0, pr: 6 }} dense>
      <Box
        {...attributes}
        {...listeners}
        sx={{ cursor: 'grab', color: 'text.disabled', mr: 1, display: 'flex', alignItems: 'center' }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <ListItemText primary={label} />
      <ListItemSecondaryAction>
        <IconButton size="small" onClick={onRemove}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  )
}

// ── Ingredient group editor ────────────────────────────────────────────────────

// globalOffset is the count of ingredients in all groups before this one.
function IngredientGroupEditor({ group, groupIndex, globalOffset, onChange, onRemoveGroup }) {
  const [input, setInput] = useState('')

  const sensors = useSensors(useSensor(PointerSensor))

  function addItem() {
    const val = input.trim()
    if (!val) return
    onChange(groupIndex, { ...group, items: [...group.items, val] })
    setInput('')
  }

  function removeItem(i) {
    onChange(groupIndex, { ...group, items: group.items.filter((_, idx) => idx !== i) })
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = group.items.indexOf(active.id)
    const newIndex = group.items.indexOf(over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(groupIndex, { ...group, items: arrayMove(group.items, oldIndex, newIndex) })
  }

  // Use the item text as the sortable id. If duplicates exist, append index to disambiguate.
  const itemIds = group.items.map((item, i) => `ing-${groupIndex}-${i}-${item}`)

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
        <TextField
          size="small"
          label="Section heading (optional)"
          value={group.title}
          onChange={(e) => onChange(groupIndex, { ...group, title: e.target.value })}
          sx={{ flex: 1 }}
        />
        <IconButton size="small" color="error" onClick={() => onRemoveGroup(groupIndex)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <List dense disablePadding>
            {group.items.map((item, i) => (
              <SortableItem
                key={itemIds[i]}
                id={itemIds[i]}
                label={`${globalOffset + i + 1}. ${item}`}
                onRemove={() => removeItem(i)}
              />
            ))}
          </List>
        </SortableContext>
      </DndContext>

      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
          placeholder="e.g. 200g flour"
          sx={{ flex: 1 }}
        />
        <Button variant="outlined" onClick={addItem} startIcon={<AddIcon />} size="small">
          Add
        </Button>
      </Box>
    </Paper>
  )
}

// Parse "mm:ss" or "m:ss" string into total seconds. Returns 0 if invalid.
function parseMmSs(str) {
  const parts = String(str || '').split(':')
  if (parts.length !== 2) return 0
  const m = parseInt(parts[0], 10)
  const s = parseInt(parts[1], 10)
  if (isNaN(m) || isNaN(s)) return 0
  return m * 60 + s
}

// Format total seconds as "m:ss".
function formatMmSs(totalSeconds) {
  const s = Math.max(0, totalSeconds || 0)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// TimerInput — small "m:ss" editable text field for optional step/section timers.
function TimerInput({ value, onChange }) {
  const [draft, setDraft] = useState(() => value > 0 ? formatMmSs(value) : '')

  function commit() {
    const secs = parseMmSs(draft)
    onChange(secs)
    setDraft(secs > 0 ? formatMmSs(secs) : '')
  }

  return (
    <TextField
      size="small"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
      placeholder="0:00"
      inputProps={{ style: { width: 52, fontVariantNumeric: 'tabular-nums', textAlign: 'center' } }}
      sx={{ width: 72 }}
      title="Timer (m:ss). Leave blank or 0:00 for no timer."
    />
  )
}

// ── Sortable step item with optional timer ─────────────────────────────────────

function SortableStepItem({ id, label, timerSeconds, onRemove, onTimerChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <ListItem ref={setNodeRef} style={style} sx={{ pl: 0, pr: 0 }} dense>
      <Box
        {...attributes}
        {...listeners}
        sx={{ cursor: 'grab', color: 'text.disabled', mr: 1, display: 'flex', alignItems: 'center', flexShrink: 0 }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <ListItemText primary={label} sx={{ mr: 1 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        <TimerInput value={timerSeconds} onChange={onTimerChange} />
        <IconButton size="small" onClick={onRemove}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </ListItem>
  )
}

// ── Method group editor ────────────────────────────────────────────────────────

// Steps are stored as objects: { text: string, timer_seconds?: number }.
// Legacy plain strings are accepted but converted on load.
function normaliseStep(step) {
  if (typeof step === 'string') return { text: step, timer_seconds: 0 }
  return { text: step.text || '', timer_seconds: step.timer_seconds || 0 }
}

function MethodGroupEditor({ group, groupIndex, onChange, onRemoveGroup }) {
  const [input, setInput] = useState('')

  // Normalise steps to objects on first use.
  const steps = (group.steps || []).map(normaliseStep)

  const sensors = useSensors(useSensor(PointerSensor))

  function addStep() {
    const val = input.trim()
    if (!val) return
    onChange(groupIndex, { ...group, steps: [...steps, { text: val, timer_seconds: 0 }] })
    setInput('')
  }

  function removeStep(i) {
    onChange(groupIndex, { ...group, steps: steps.filter((_, idx) => idx !== i) })
  }

  function updateStepTimer(i, secs) {
    const updated = steps.map((s, idx) => idx === i ? { ...s, timer_seconds: secs } : s)
    onChange(groupIndex, { ...group, steps: updated })
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const stepIds = steps.map((s, i) => `meth-${groupIndex}-${i}-${s.text}`)
    const oldIndex = stepIds.indexOf(active.id)
    const newIndex = stepIds.indexOf(over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(groupIndex, { ...group, steps: arrayMove(steps, oldIndex, newIndex) })
  }

  const stepIds = steps.map((s, i) => `meth-${groupIndex}-${i}-${s.text}`)

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
        <TextField
          size="small"
          label="Section heading (optional)"
          value={group.title}
          onChange={(e) => onChange(groupIndex, { ...group, title: e.target.value })}
          sx={{ flex: 1 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>Section timer</Typography>
          <TimerInput
            value={group.timer_seconds || 0}
            onChange={(secs) => onChange(groupIndex, { ...group, timer_seconds: secs })}
          />
        </Box>
        <IconButton size="small" color="error" onClick={() => onRemoveGroup(groupIndex)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
          <List dense disablePadding>
            {steps.map((step, i) => (
              <SortableStepItem
                key={stepIds[i]}
                id={stepIds[i]}
                label={`${i + 1}. ${step.text}`}
                timerSeconds={step.timer_seconds || 0}
                onRemove={() => removeStep(i)}
                onTimerChange={(secs) => updateStepTimer(i, secs)}
              />
            ))}
          </List>
        </SortableContext>
      </DndContext>

      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep() } }}
          placeholder="Describe this step…"
          sx={{ flex: 1 }}
          multiline
        />
        <Button variant="outlined" onClick={addStep} startIcon={<AddIcon />} size="small">
          Add
        </Button>
      </Box>
    </Paper>
  )
}

// ── Variation editor ───────────────────────────────────────────────────────────

function VariationEditor({ variation, index, totalIngredients, totalSteps, onChange, onRemove }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Stack spacing={1.5} sx={{ flex: 1 }}>
          <TextField
            size="small"
            label="Variation name"
            value={variation.title}
            onChange={(e) => onChange(index, { ...variation, title: e.target.value })}
            fullWidth
            placeholder="e.g. Vegan version"
          />
          <TextField
            size="small"
            label="Notes / substitutions"
            value={variation.notes}
            onChange={(e) => onChange(index, { ...variation, notes: e.target.value })}
            fullWidth
            multiline
            rows={3}
            placeholder="e.g. Replace eggs with flax eggs and milk with oat milk."
          />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Starting from ingredient #"
              type="number"
              inputProps={{ min: 0, max: totalIngredients }}
              value={variation.from_ingredient || ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                onChange(index, { ...variation, from_ingredient: isNaN(v) || v <= 0 ? 0 : v })
              }}
              sx={{ width: 200 }}
              helperText={totalIngredients > 0 ? `1–${totalIngredients}, or blank` : 'No ingredients yet'}
            />
            <TextField
              size="small"
              label="Starting from step #"
              type="number"
              inputProps={{ min: 0, max: totalSteps }}
              value={variation.from_step || ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                onChange(index, { ...variation, from_step: isNaN(v) || v <= 0 ? 0 : v })
              }}
              sx={{ width: 200 }}
              helperText={totalSteps > 0 ? `1–${totalSteps}, or blank` : 'No steps yet'}
            />
          </Box>
        </Stack>
        <IconButton size="small" color="error" onClick={() => onRemove(index)} sx={{ mt: 0.5 }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  )
}

// ── Gallery photo picker ───────────────────────────────────────────────────────

// GalleryPhotoPicker lets the user select an existing photo from their gallery.
// onPick receives the selected photo object.
function GalleryPhotoPicker({ open, onClose, onPick }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSelected(null)
    setError(null)
    client.get('/dashboard/gallery/photos')
      .then((res) => setPhotos(res.data.photos || []))
      .catch(() => setError('Failed to load photos.'))
      .finally(() => setLoading(false))
  }, [open])

  function handleConfirm() {
    if (!selected) return
    onPick(selected)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Pick a photo from your gallery</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <CircularProgress />
        ) : photos.length === 0 ? (
          <Typography color="text.secondary">No photos found.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1, mt: 1 }}>
            {photos.map((photo) => {
              const src = (photo.url || '').startsWith('/') ? photo.url : `/${photo.url}`
              const isSelected = selected?.id === photo.id
              return (
                <Tooltip key={photo.id} title={photo.caption || 'Click to select'}>
                  <Box
                    onClick={() => setSelected(photo)}
                    sx={{
                      position: 'relative',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid' : '2px solid transparent',
                      borderColor: isSelected ? 'primary.main' : 'transparent',
                    }}
                  >
                    <Box
                      component="img"
                      src={src}
                      alt={photo.caption || ''}
                      sx={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                    />
                    {isSelected && (
                      <Checkbox
                        checked
                        size="small"
                        sx={{
                          position: 'absolute', top: 2, right: 2,
                          bgcolor: 'white', borderRadius: '50%', p: 0.25,
                        }}
                      />
                    )}
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!selected}>
          Use photo
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main editor ────────────────────────────────────────────────────────────────

export default function RecipeEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isNew = id === 'new'

  const [form, setForm] = useState({
    title: '',
    description: '',
    cuisine: '',
    prep_time: '',
    cook_time: '',
    servings: '',
    notes: '',
  })
  const [slug, setSlug] = useState('')
  const [published, setPublished] = useState(false)
  const [ingredientsGroups, setIngredientsGroups] = useState([{ title: '', items: [] }])
  const [methodGroups, setMethodGroups] = useState([{ title: '', steps: [] }])
  const [variations, setVariations] = useState([])
  const [photos, setPhotos] = useState([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const photoInputRef = useRef(null)
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isNew) return
    client.get(`/dashboard/recipes/${id}`)
      .then((res) => {
        const r = res.data.recipe || res.data
        setForm({
          title: r.title || '',
          description: r.description || '',
          cuisine: r.cuisine || '',
          prep_time: r.prep_time ?? '',
          cook_time: r.cook_time ?? '',
          servings: r.servings ?? '',
          notes: r.notes || '',
        })
        setPublished(Boolean(r.published))
        setSlug(r.slug || '')

        // Prefer structured groups; fall back to flat arrays from legacy data.
        if (r.ingredients_groups && r.ingredients_groups.length > 0) {
          setIngredientsGroups(r.ingredients_groups.map((g) => ({
            title: g.title || '',
            items: g.items || [],
          })))
        } else if (r.ingredients && r.ingredients.length > 0) {
          const flat = Array.isArray(r.ingredients)
            ? r.ingredients
            : r.ingredients.split('\n').filter(Boolean)
          setIngredientsGroups([{ title: '', items: flat }])
        } else {
          setIngredientsGroups([{ title: '', items: [] }])
        }

        if (r.method_groups && r.method_groups.length > 0) {
          setMethodGroups(r.method_groups.map((g) => ({
            title: g.title || '',
            timer_seconds: g.timer_seconds || 0,
            steps: (g.steps || []).map((s) =>
              typeof s === 'string' ? { text: s, timer_seconds: 0 } : { text: s.text || '', timer_seconds: s.timer_seconds || 0 }
            ),
          })))
        } else {
          const flat = r.method_steps || r.steps || []
          const flatArr = Array.isArray(flat)
            ? flat
            : flat.split('\n').filter(Boolean)
          setMethodGroups([{ title: '', timer_seconds: 0, steps: flatArr.map((s) => typeof s === 'string' ? { text: s, timer_seconds: 0 } : s) }])
        }

        if (r.variations && r.variations.length > 0) {
          setVariations(r.variations.map((v) => ({
            title: v.title || '',
            notes: v.notes || '',
            from_ingredient: v.from_ingredient || 0,
            from_step: v.from_step || 0,
          })))
        }

        if (r.photos && r.photos.length > 0) {
          setPhotos(r.photos)
        }
      })
      .catch(() => setError('Failed to load recipe.'))
      .finally(() => setLoading(false))
  }, [id, isNew])

  function handle(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  // Ingredient group helpers
  function updateIngGroup(i, updated) {
    setIngredientsGroups((gs) => gs.map((g, idx) => (idx === i ? updated : g)))
  }
  function addIngGroup() {
    setIngredientsGroups((gs) => [...gs, { title: '', items: [] }])
  }
  function removeIngGroup(i) {
    setIngredientsGroups((gs) => gs.filter((_, idx) => idx !== i))
  }

  // Method group helpers
  function updateMethGroup(i, updated) {
    setMethodGroups((gs) => gs.map((g, idx) => (idx === i ? updated : g)))
  }
  function addMethGroup() {
    setMethodGroups((gs) => [...gs, { title: '', steps: [] }])
  }
  function removeMethGroup(i) {
    setMethodGroups((gs) => gs.filter((_, idx) => idx !== i))
  }

  // Variation helpers
  function updateVariation(i, updated) {
    setVariations((vs) => vs.map((v, idx) => (idx === i ? updated : v)))
  }
  function addVariation() {
    setVariations((vs) => [...vs, { title: '', notes: '', from_ingredient: 0, from_step: 0 }])
  }
  function removeVariation(i) {
    setVariations((vs) => vs.filter((_, idx) => idx !== i))
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    // Reset input so the same file can be re-selected if needed.
    e.target.value = ''
    setPhotoError(null)
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      files.forEach((f) => fd.append('photos', f))
      const res = await client.post(`/dashboard/recipes/${id}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const uploaded = res.data?.data?.uploaded || []
      setPhotos((prev) => [...prev, ...uploaded])
      if (res.data?.data?.failed > 0) {
        setPhotoError(`${res.data.data.failed} file(s) failed to upload.`)
      }
    } catch {
      setPhotoError('Upload failed.')
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handlePhotoDelete(photoId) {
    try {
      await client.delete(`/dashboard/recipes/${id}/photos/${photoId}`)
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    } catch {
      setPhotoError('Failed to delete photo.')
    }
  }

  // Add a gallery photo to the recipe's photo list without re-uploading.
  async function handleGalleryPick(photo) {
    setPhotoError(null)
    try {
      // Re-use the recipe photo upload endpoint with the gallery photo URL.
      // We convert it to a FormData upload using the photo's URL as source — instead,
      // we store the gallery URL directly in the photos list for display.
      // The recipe photo system stores separate recipe_photos records, so we
      // fetch the file from the gallery URL and upload it as a recipe photo.
      const response = await fetch(photo.url.startsWith('/') ? photo.url : `/${photo.url}`)
      const blob = await response.blob()
      const file = new File([blob], photo.url.split('/').pop() || 'photo.jpg', { type: blob.type || 'image/jpeg' })
      const fd = new FormData()
      fd.append('photos', file)
      const res = await client.post(`/dashboard/recipes/${id}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const uploaded = res.data?.data?.uploaded || []
      setPhotos((prev) => [...prev, ...uploaded])
    } catch {
      setPhotoError('Failed to link gallery photo.')
    }
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const payload = {
        ...form,
        prep_time: form.prep_time ? Number(form.prep_time) : null,
        cook_time: form.cook_time ? Number(form.cook_time) : null,
        servings: form.servings ? Number(form.servings) : null,
        ingredients_groups: ingredientsGroups,
        method_groups: methodGroups,
        variations,
      }
      if (isNew) {
        const res = await client.post('/dashboard/recipes', payload)
        const created = res.data || {}
        const newId = created.id
        setSlug(created.slug || '')
        navigate(`/dashboard/recipes/${newId}`, { replace: true })
      } else {
        const res = await client.put(`/dashboard/recipes/${id}`, payload)
        const updated = res.data || {}
        if (updated.slug) setSlug(updated.slug)
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save recipe.')
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublish() {
    setToggling(true)
    try {
      await client.patch(`/dashboard/recipes/${id}/toggle`)
      setPublished((prev) => !prev)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update publish status.')
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box maxWidth={720}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          {isNew ? 'New recipe' : 'Edit recipe'}
        </Typography>
        {!isNew && (
          <FormControlLabel
            control={
              <Switch
                checked={published}
                onChange={handleTogglePublish}
                color="success"
              />
            }
            label={
              <Typography component="span" sx={{ display: 'inline-block', minWidth: '5rem' }}>
                {published ? 'Published' : 'Draft'}
              </Typography>
            }
          />
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={2}>
        <TextField label="Title" name="title" value={form.title} onChange={handle} required fullWidth />
        <TextField label="Description" name="description" value={form.description} onChange={handle} multiline rows={2} fullWidth />
        <TextField label="Cuisine" name="cuisine" value={form.cuisine} onChange={handle} fullWidth />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Prep time (min)"
            name="prep_time"
            value={form.prep_time}
            onChange={handle}
            type="number"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Cook time (min)"
            name="cook_time"
            value={form.cook_time}
            onChange={handle}
            type="number"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Servings"
            name="servings"
            value={form.servings}
            onChange={handle}
            type="number"
            sx={{ flex: 1 }}
          />
        </Box>

        <Divider />

        {/* Ingredients */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>Ingredients</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addIngGroup}>
              Add section
            </Button>
          </Box>
          {ingredientsGroups.map((group, i) => {
            const offset = ingredientsGroups.slice(0, i).reduce((acc, g) => acc + (g.items || []).length, 0)
            return (
              <IngredientGroupEditor
                key={i}
                group={group}
                groupIndex={i}
                globalOffset={offset}
                onChange={updateIngGroup}
                onRemoveGroup={removeIngGroup}
              />
            )
          })}
        </Box>

        <Divider />

        {/* Method */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>Method</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addMethGroup}>
              Add section
            </Button>
          </Box>
          {methodGroups.map((group, i) => (
            <MethodGroupEditor
              key={i}
              group={group}
              groupIndex={i}
              onChange={updateMethGroup}
              onRemoveGroup={removeMethGroup}
            />
          ))}
        </Box>

        <Divider />

        {/* Variations */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>Variations</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addVariation}>
              Add variation
            </Button>
          </Box>
          {variations.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              No variations yet. Add one for dietary alternatives or serving ideas.
            </Typography>
          )}
          {variations.map((v, i) => (
            <VariationEditor
              key={i}
              variation={v}
              index={i}
              totalIngredients={ingredientsGroups.reduce((acc, g) => acc + (g.items || []).length, 0)}
              totalSteps={methodGroups.reduce((acc, g) => acc + (g.steps || []).length, 0)}
              onChange={updateVariation}
              onRemove={removeVariation}
            />
          ))}
        </Box>

        <Divider />

        {/* Photos — only shown when editing an existing recipe */}
        {!isNew && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>Photos</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  startIcon={<AddPhotoAlternateIcon />}
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                >
                  {photoUploading ? 'Uploading…' : 'Upload'}
                </Button>
                <Button
                  size="small"
                  startIcon={<PhotoLibraryIcon />}
                  onClick={() => setGalleryPickerOpen(true)}
                  disabled={photoUploading}
                >
                  Pick from gallery
                </Button>
              </Stack>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
              />
            </Box>

            {photoError && (
              <Alert severity="warning" sx={{ mb: 1 }} onClose={() => setPhotoError(null)}>
                {photoError}
              </Alert>
            )}

            {photos.length === 0 && !photoUploading && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No photos yet. Upload a cover shot or step photos.
              </Typography>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {photos.map((p) => (
                <Box
                  key={p.id}
                  sx={{ position: 'relative', width: 120, flexShrink: 0 }}
                >
                  <Box
                    component="img"
                    src={p.url}
                    alt={p.caption || 'Recipe photo'}
                    sx={{
                      width: 120,
                      height: 90,
                      objectFit: 'cover',
                      borderRadius: 1,
                      display: 'block',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handlePhotoDelete(p.id)}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bgcolor: 'rgba(0,0,0,0.55)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                      p: 0.4,
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  {p.caption && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 120,
                      }}
                    >
                      {p.caption}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Divider />

        <TextField
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={handle}
          multiline
          rows={3}
          fullWidth
        />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', pb: 12 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.title}
            color={saved ? 'success' : 'primary'}
            startIcon={saved ? <CheckIcon /> : null}
          >
            {saving ? 'Saving…' : saved ? 'Changes saved' : isNew ? 'Create recipe' : 'Save changes'}
          </Button>
          {!isNew && slug && user?.username && (
            <Button
              variant="outlined"
              component={RouterLink}
              to={`/u/${user.username}/recipes/${slug}`}
              endIcon={<OpenInNewIcon />}
            >
              View page
            </Button>
          )}
          <Button onClick={() => navigate('/dashboard/recipes')} disabled={saving}>
            Cancel
          </Button>
        </Box>
      </Stack>

      <GalleryPhotoPicker
        open={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        onPick={handleGalleryPick}
      />
    </Box>
  )
}
