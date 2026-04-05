import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  FormControlLabel, Switch, Stack, Chip, Paper, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel, Slider,
  Accordion, AccordionSummary, AccordionDetails, Card, CardContent,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/Check'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PushPinIcon from '@mui/icons-material/PushPin'
import client from '../../api/client.js'

// ─── FAQ editor ─────────────────────────────────────────────────────────────

function FaqEditor({ data, onChange }) {
  const questions = data.questions || []

  function addQuestion() {
    onChange({ ...data, questions: [...questions, { q: '', a: '' }] })
  }

  function removeQuestion(i) {
    const updated = questions.filter((_, idx) => idx !== i)
    onChange({ ...data, questions: updated })
  }

  function updateQuestion(i, field, value) {
    const updated = questions.map((q, idx) => idx === i ? { ...q, [field]: value } : q)
    onChange({ ...data, questions: updated })
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={600}>Questions & answers</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addQuestion}>
          Add question
        </Button>
      </Box>
      {questions.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No questions yet. Click "Add question" to add one.
        </Typography>
      )}
      <Stack spacing={2}>
        {questions.map((item, i) => (
          <Paper key={i} variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">Question {i + 1}</Typography>
              <IconButton size="small" color="error" onClick={() => removeQuestion(i)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <Stack spacing={1.5}>
              <TextField
                label="Question"
                value={item.q}
                onChange={(e) => updateQuestion(i, 'q', e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Answer"
                value={item.a}
                onChange={(e) => updateQuestion(i, 'a', e.target.value)}
                fullWidth
                multiline
                rows={3}
                size="small"
              />
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  )
}

// ─── Resume editor ───────────────────────────────────────────────────────────

function ResumeItemEditor({ item, sectionType, onChange, onRemove }) {
  function handle(field, value) {
    onChange({ ...item, [field]: value })
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <IconButton size="small" color="error" onClick={onRemove}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
      <Stack spacing={1.5}>
        <TextField
          label="Title"
          value={item.title || ''}
          onChange={(e) => handle('title', e.target.value)}
          fullWidth
          size="small"
        />
        {sectionType !== 'skills' && (
          <>
            <TextField
              label="Organisation"
              value={item.org || ''}
              onChange={(e) => handle('org', e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Date / period"
              value={item.date || ''}
              onChange={(e) => handle('date', e.target.value)}
              fullWidth
              size="small"
              placeholder="e.g. Jan 2020 – Mar 2023"
            />
          </>
        )}
        <TextField
          label="Description"
          value={item.description || ''}
          onChange={(e) => handle('description', e.target.value)}
          fullWidth
          multiline
          rows={3}
          size="small"
        />
      </Stack>
    </Paper>
  )
}

function ResumeEditor({ data, onChange }) {
  const defaultSections = [
    { type: 'work', title: 'Work experience', items: [] },
    { type: 'education', title: 'Education', items: [] },
    { type: 'skills', title: 'Skills', items: [] },
  ]
  const sections = data.sections || defaultSections

  function updateSection(i, updated) {
    const newSections = sections.map((s, idx) => idx === i ? updated : s)
    onChange({ ...data, sections: newSections })
  }

  function addItem(i) {
    const section = sections[i]
    const emptyItem = section.type === 'skills'
      ? { title: '', description: '' }
      : { title: '', org: '', date: '', description: '' }
    updateSection(i, { ...section, items: [...(section.items || []), emptyItem] })
  }

  function removeItem(sectionIdx, itemIdx) {
    const section = sections[sectionIdx]
    updateSection(sectionIdx, {
      ...section,
      items: section.items.filter((_, idx) => idx !== itemIdx),
    })
  }

  function updateItem(sectionIdx, itemIdx, updated) {
    const section = sections[sectionIdx]
    updateSection(sectionIdx, {
      ...section,
      items: section.items.map((it, idx) => idx === itemIdx ? updated : it),
    })
  }

  return (
    <Stack spacing={3}>
      {sections.map((section, si) => (
        <Card key={si} variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>{section.title}</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => addItem(si)}>
                Add item
              </Button>
            </Box>
            {(section.items || []).length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No items yet.
              </Typography>
            )}
            {(section.items || []).map((item, ii) => (
              <ResumeItemEditor
                key={ii}
                item={item}
                sectionType={section.type}
                onChange={(updated) => updateItem(si, ii, updated)}
                onRemove={() => removeItem(si, ii)}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

// ─── Event editor ────────────────────────────────────────────────────────────

function EventEditor({ data, onChange }) {
  function handle(field, value) {
    onChange({ ...data, [field]: value })
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Person 1"
          value={data.person1 || ''}
          onChange={(e) => handle('person1', e.target.value)}
          fullWidth
        />
        <TextField
          label="Person 2"
          value={data.person2 || ''}
          onChange={(e) => handle('person2', e.target.value)}
          fullWidth
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Date"
          value={data.date || ''}
          onChange={(e) => handle('date', e.target.value)}
          fullWidth
          placeholder="e.g. Saturday, 12 April 2025"
        />
        <TextField
          label="Venue"
          value={data.venue || ''}
          onChange={(e) => handle('venue', e.target.value)}
          fullWidth
        />
      </Box>
      <TextField
        label="Message"
        value={data.message || ''}
        onChange={(e) => handle('message', e.target.value)}
        fullWidth
        multiline
        rows={3}
      />
      <TextField
        label="RSVP URL"
        value={data.rsvp_url || ''}
        onChange={(e) => handle('rsvp_url', e.target.value)}
        fullWidth
        type="url"
      />
      <TextField
        label="Photo URL"
        value={data.photo_url || ''}
        onChange={(e) => handle('photo_url', e.target.value)}
        fullWidth
      />
    </Stack>
  )
}

// ─── Extra field renderer (for entry dialog) ─────────────────────────────────

function ExtraField({ col, value, onChange }) {
  if (col.type === 'select' && col.options) {
    const options = Array.isArray(col.options) ? col.options : col.options.split(',').map((s) => s.trim())
    return (
      <FormControl fullWidth size="small">
        <InputLabel>{col.label}</InputLabel>
        <Select
          label={col.label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  }
  if (col.type === 'textarea') {
    return (
      <TextField
        label={col.label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        multiline
        rows={4}
        size="small"
        required={col.required}
      />
    )
  }
  return (
    <TextField
      label={col.label}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
      size="small"
      type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
      required={col.required}
      InputLabelProps={col.type === 'date' ? { shrink: true } : undefined}
    />
  )
}

// ─── Entry dialog ─────────────────────────────────────────────────────────────

function EntryDialog({ open, onClose, onSave, kindDef, initial }) {
  const extraCols = (kindDef?.list_columns || []).filter(
    (c) => !['title', 'subtitle', 'rating', 'status', 'entry_date'].includes(c.key)
  )

  const empty = {
    title: '',
    subtitle: '',
    rating: '',
    status: '',
    entry_date: '',
    fields_json: {},
  }

  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          title: initial.title || '',
          subtitle: initial.subtitle || '',
          rating: initial.rating ?? '',
          status: initial.status || '',
          entry_date: initial.entry_date || '',
          fields_json: (() => {
            try { return JSON.parse(initial.fields_json || '{}') } catch { return {} }
          })(),
        })
      } else {
        setForm(empty)
      }
      setError(null)
    }
  }, [open, initial])

  function handle(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleExtra(key, value) {
    setForm((f) => ({ ...f, fields_json: { ...f.fields_json, [key]: value } }))
  }

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      await onSave({
        ...form,
        fields_json: JSON.stringify(form.fields_json),
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit entry' : 'Add entry'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => handle('title', e.target.value)}
            required
            fullWidth
            size="small"
            autoFocus
          />
          <TextField
            label={kindDef?.kind === 'books' ? 'Author' : kindDef?.kind === 'movies' ? 'Director' : 'Subtitle'}
            value={form.subtitle}
            onChange={(e) => handle('subtitle', e.target.value)}
            fullWidth
            size="small"
          />
          <Box>
            <Typography variant="body2" gutterBottom>Rating (0–10)</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                value={Number(form.rating) || 0}
                onChange={(_, v) => handle('rating', v)}
                min={0}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
                sx={{ flexGrow: 1 }}
              />
              <Typography variant="body2" sx={{ minWidth: 30 }}>
                {form.rating || 0}/10
              </Typography>
            </Box>
          </Box>
          <TextField
            label="Status"
            value={form.status}
            onChange={(e) => handle('status', e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. Read, In progress, Abandoned"
          />
          <TextField
            label="Date"
            value={form.entry_date}
            onChange={(e) => handle('entry_date', e.target.value)}
            fullWidth
            size="small"
            type="date"
            InputLabelProps={{ shrink: true }}
          />
          {extraCols.map((col) => (
            <ExtraField
              key={col.key}
              col={col}
              value={form.fields_json[col.key] || ''}
              onChange={(v) => handleExtra(col.key, v)}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.title}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Entry table ──────────────────────────────────────────────────────────────

function EntryTable({ pageId, entries: initialEntries, kindDef }) {
  const [entries, setEntries] = useState(initialEntries || [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave(data) {
    if (editEntry) {
      const res = await client.put(`/dashboard/custom-pages/${pageId}/entries/${editEntry.id}`, data)
      const updated = res.data.entry || res.data
      setEntries((es) => es.map((e) => e.id === updated.id ? updated : e))
    } else {
      const res = await client.post(`/dashboard/custom-pages/${pageId}/entries`, data)
      const created = res.data.entry || res.data
      setEntries((es) => [...es, created])
    }
    setEditEntry(null)
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await client.delete(`/dashboard/custom-pages/${pageId}/entries/${deleteId}`)
      setEntries((es) => es.filter((e) => e.id !== deleteId))
      setDeleteId(null)
    } catch {
      setError('Failed to delete entry.')
    } finally {
      setDeleting(false)
    }
  }

  function openAdd() {
    setEditEntry(null)
    setDialogOpen(true)
  }

  function openEdit(entry) {
    setEditEntry(entry)
    setDialogOpen(true)
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          Entries ({entries.length})
        </Typography>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAdd}>
          Add entry
        </Button>
      </Box>

      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No entries yet.</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Subtitle</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{entry.title}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{entry.subtitle}</Typography>
                  </TableCell>
                  <TableCell>
                    {entry.rating > 0 && (
                      <Typography variant="body2">{entry.rating}/10</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.status && (
                      <Chip label={entry.status} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{entry.entry_date}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(entry)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(entry.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <EntryDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditEntry(null) }}
        onSave={handleSave}
        kindDef={kindDef}
        initial={editEntry}
      />

      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete this entry?</DialogTitle>
        <DialogContent>
          <Typography>This cannot be undone.</Typography>
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

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function CustomPageEdit() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [page, setPage] = useState(null)
  const [entries, setEntries] = useState([])
  const [kindDef, setKindDef] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  // Form fields.
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('')
  const [dataJson, setDataJson] = useState({})

  useEffect(() => {
    client.get(`/dashboard/custom-pages/${id}`)
      .then((res) => {
        const p = res.data.page || res.data
        setPage(p)
        setEntries(res.data.entries || [])
        setKindDef(res.data.kind_def || null)
        setTitle(p.title || '')
        setDescription(p.description || '')
        setBody(p.body || '')
        try {
          setDataJson(JSON.parse(p.data_json || '{}'))
        } catch {
          setDataJson({})
        }
      })
      .catch(() => setError('Failed to load page.'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await client.put(`/dashboard/custom-pages/${id}`, {
        title,
        description,
        body,
        data_json: JSON.stringify(dataJson),
      })
      const updated = res.data.page || res.data
      setPage(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublish() {
    try {
      const res = await client.patch(`/dashboard/custom-pages/${id}/toggle`)
      const updated = res.data.page || res.data
      setPage(updated)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update publish status.')
    }
  }

  async function handleNavPinToggle(e) {
    const navPinned = e.target.checked
    try {
      const res = await client.put(`/dashboard/custom-pages/${id}`, { nav_pinned: navPinned })
      const updated = res.data.page || res.data
      setPage(updated)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update nav pin.')
    }
  }

  if (loading) return <CircularProgress />
  if (!page) return <Alert severity="error">Page not found.</Alert>

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/dashboard/custom-pages')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          {page.title}
        </Typography>
        <Chip label={page.kind} size="small" variant="outlined" />
        <Chip
          label={page.format}
          size="small"
          color={page.format === 'freeform' ? 'default' : page.format === 'list' ? 'info' : 'secondary'}
          variant="outlined"
        />
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(page.published)}
              onChange={handleTogglePublish}
            />
          }
          label={
            <Typography component="span" sx={{ display: 'inline-block', minWidth: '5rem' }}>
              {page.published ? 'Published' : 'Draft'}
            </Typography>
          }
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PushPinIcon sx={{ fontSize: 18, color: page.nav_pinned ? 'primary.main' : 'text.disabled' }} />
          <Typography variant="body2" sx={{ display: 'inline-block', minWidth: '5rem' }}>
            {page.nav_pinned ? 'Top nav' : 'Dropdown'}
          </Typography>
          <Switch
            checked={Boolean(page.nav_pinned)}
            onChange={handleNavPinToggle}
            size="small"
          />
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={3}>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={2}
          helperText="Shown below the title on the public page."
        />

        <Divider />

        {/* Format-specific content */}
        {page.format === 'freeform' && (
          <TextField
            label="Body (Markdown)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            multiline
            minRows={16}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
          />
        )}

        {page.format === 'list' && (
          <EntryTable pageId={id} entries={entries} kindDef={kindDef} />
        )}

        {page.format === 'structured' && page.kind === 'faq' && (
          <FaqEditor data={dataJson} onChange={setDataJson} />
        )}

        {page.format === 'structured' && page.kind === 'resume' && (
          <ResumeEditor data={dataJson} onChange={setDataJson} />
        )}

        {page.format === 'structured' && page.kind === 'event' && (
          <EventEditor data={dataJson} onChange={setDataJson} />
        )}

        {page.format !== 'list' && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !title}
              color={saved ? 'success' : 'primary'}
              startIcon={saved ? <CheckIcon /> : null}
            >
              {saving ? 'Saving…' : saved ? 'Changes saved' : 'Save changes'}
            </Button>
            <Button onClick={() => navigate('/dashboard/custom-pages')} disabled={saving}>
              Back
            </Button>
          </Box>
        )}

        {page.format === 'list' && (
          <Box>
            <Button onClick={() => navigate('/dashboard/custom-pages')}>
              ← Back to custom pages
            </Button>
          </Box>
        )}
      </Stack>
    </Box>
  )
}
