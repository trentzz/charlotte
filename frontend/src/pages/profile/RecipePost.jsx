import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, CircularProgress, Alert, Divider,
  Link, List, ListItem, ListItemText, Chip, Paper,
} from '@mui/material'
import client from '../../api/client.js'

export default function RecipePost() {
  const { username, slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get(`/u/${username}/recipes/${slug}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Recipe not found.'))
      .finally(() => setLoading(false))
  }, [username, slug])

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
      <CircularProgress />
    </Box>
  )

  if (error) return (
    <Container sx={{ py: 4 }}>
      <Alert severity="error">{error}</Alert>
    </Container>
  )

  const recipe = data?.recipe
  const ingredients = recipe?.ingredients || []
  const steps = recipe?.method_steps || recipe?.steps || []
  const attempts = recipe?.attempts || []

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h2" fontWeight={700} gutterBottom>
        {recipe?.title}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {recipe?.cuisine && <Chip label={recipe.cuisine} size="small" />}
        {recipe?.prep_time && (
          <Chip label={`${recipe.prep_time} min prep`} size="small" variant="outlined" />
        )}
        {recipe?.cook_time && (
          <Chip label={`${recipe.cook_time} min cook`} size="small" variant="outlined" />
        )}
        {recipe?.servings && (
          <Chip label={`Serves ${recipe.servings}`} size="small" variant="outlined" />
        )}
      </Box>

      {recipe?.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {recipe.description}
        </Typography>
      )}

      <Divider sx={{ mb: 4 }} />

      {ingredients.length > 0 && (
        <>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Ingredients
          </Typography>
          <List dense sx={{ mb: 3 }}>
            {ingredients.map((ing, i) => (
              <ListItem key={i} sx={{ py: 0.25, pl: 0 }}>
                <ListItemText primary={typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`.trim()} />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {steps.length > 0 && (
        <>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Method
          </Typography>
          <List sx={{ mb: 3 }}>
            {steps.map((step, i) => (
              <ListItem key={i} sx={{ pl: 0, alignItems: 'flex-start' }}>
                <Typography variant="body2" sx={{ mr: 2, fontWeight: 700, minWidth: 24, color: 'text.secondary' }}>
                  {i + 1}.
                </Typography>
                <ListItemText primary={typeof step === 'string' ? step : step.text} />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {recipe?.notes && (
        <>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Notes
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {recipe.notes}
          </Typography>
        </>
      )}

      {attempts.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Attempts journal
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {attempts.map((attempt, i) => (
              <Paper key={attempt.id || i} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Attempt {i + 1}
                  </Typography>
                  {attempt.made_on && (
                    <Typography variant="caption" color="text.secondary">
                      {new Date(attempt.made_on).toLocaleDateString('en-AU', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </Typography>
                  )}
                </Box>
                {attempt.notes && (
                  <Typography variant="body2">{attempt.notes}</Typography>
                )}
                {attempt.rating && (
                  <Typography variant="caption" color="text.secondary">
                    Rating: {attempt.rating}/5
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        </>
      )}

      <Box sx={{ mt: 6 }}>
        <Link component={RouterLink} to={`/u/${username}/recipes`} underline="hover">
          ← Back to recipes
        </Link>
      </Box>
    </Container>
  )
}
