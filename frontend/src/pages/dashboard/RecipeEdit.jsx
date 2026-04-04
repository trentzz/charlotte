import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  Stack, Divider, IconButton, List, ListItem, ListItemText,
  ListItemSecondaryAction, Paper,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import client from '../../api/client.js'

export default function RecipeEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [form, setForm] = useState({
    title: '',
    description: '',
    cuisine: '',
    prep_time: '',
    cook_time: '',
    servings: '',
    ingredients: [],
    steps: [],
    notes: '',
  })
  const [ingredientInput, setIngredientInput] = useState('')
  const [stepInput, setStepInput] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
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
          ingredients: r.ingredients || [],
          steps: r.method_steps || r.steps || [],
          notes: r.notes || '',
        })
      })
      .catch(() => setError('Failed to load recipe.'))
      .finally(() => setLoading(false))
  }, [id, isNew])

  function handle(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function addIngredient() {
    const val = ingredientInput.trim()
    if (!val) return
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, val] }))
    setIngredientInput('')
  }

  function removeIngredient(i) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))
  }

  function addStep() {
    const val = stepInput.trim()
    if (!val) return
    setForm((f) => ({ ...f, steps: [...f.steps, val] }))
    setStepInput('')
  }

  function removeStep(i) {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))
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
        method_steps: form.steps,
      }
      if (isNew) {
        const res = await client.post('/dashboard/recipes', payload)
        const newId = res.data.id || res.data.recipe?.id
        navigate(`/dashboard/recipes/${newId}`, { replace: true })
      } else {
        await client.put(`/dashboard/recipes/${id}`, payload)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save recipe.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box maxWidth={640}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {isNew ? 'New recipe' : 'Edit recipe'}
      </Typography>

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
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Ingredients</Typography>
          <List dense>
            {form.ingredients.map((ing, i) => (
              <ListItem key={i} sx={{ pl: 0 }}>
                <ListItemText primary={ing} />
                <ListItemSecondaryAction>
                  <IconButton size="small" onClick={() => removeIngredient(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } }}
              placeholder="e.g. 2 cups flour"
              sx={{ flex: 1 }}
            />
            <Button variant="outlined" onClick={addIngredient} startIcon={<AddIcon />} size="small">
              Add
            </Button>
          </Box>
        </Box>

        <Divider />

        {/* Method steps */}
        <Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Method</Typography>
          <List dense>
            {form.steps.map((step, i) => (
              <ListItem key={i} sx={{ pl: 0, alignItems: 'flex-start' }}>
                <Typography variant="body2" sx={{ mr: 1, fontWeight: 700, pt: 0.5, minWidth: 24, color: 'text.secondary' }}>
                  {i + 1}.
                </Typography>
                <ListItemText primary={step} />
                <ListItemSecondaryAction>
                  <IconButton size="small" onClick={() => removeStep(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              value={stepInput}
              onChange={(e) => setStepInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep() } }}
              placeholder="Describe this step…"
              sx={{ flex: 1 }}
              multiline
            />
            <Button variant="outlined" onClick={addStep} startIcon={<AddIcon />} size="small">
              Add
            </Button>
          </Box>
        </Box>

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

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.title}>
            {saving ? 'Saving…' : isNew ? 'Create recipe' : 'Save changes'}
          </Button>
          <Button onClick={() => navigate('/dashboard/recipes')} disabled={saving}>
            Cancel
          </Button>
        </Box>
      </Stack>
    </Box>
  )
}
