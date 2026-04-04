import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, CircularProgress, Alert, Divider,
  Link, List, ListItem, ListItemText, Chip, Paper,
  ImageList, ImageListItem, ImageListItemBar,
} from '@mui/material'
import client from '../../api/client.js'

// Render a list of ingredient groups. Falls back to a flat ingredient array for
// legacy recipes that have not been re-saved with the new structure.
// Ingredients are numbered globally across all groups.
function IngredientsSection({ groups, legacyIngredients }) {
  // Prefer structured groups when present and non-empty.
  const hasGroups = groups && groups.length > 0 &&
    groups.some((g) => g.items && g.items.length > 0)

  if (hasGroups) {
    let globalNum = 0
    return (
      <>
        {groups.map((group, gi) => (
          <Box key={gi} sx={{ mb: 2 }}>
            {group.title && (
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 0.5 }}>
                {group.title}
              </Typography>
            )}
            <List dense disablePadding>
              {(group.items || []).map((item, i) => {
                globalNum += 1
                const num = globalNum
                return (
                  <ListItem key={i} sx={{ py: 0.25, pl: 0, alignItems: 'flex-start' }}>
                    <Typography variant="body2" sx={{ mr: 1.5, fontWeight: 700, minWidth: 24, color: 'text.secondary', flexShrink: 0, pt: 0.1 }}>
                      {num}.
                    </Typography>
                    <ListItemText primary={item} />
                  </ListItem>
                )
              })}
            </List>
          </Box>
        ))}
      </>
    )
  }

  // Legacy flat list — number sequentially.
  const flat = Array.isArray(legacyIngredients) ? legacyIngredients : []
  if (flat.length === 0) return null
  return (
    <List dense sx={{ mb: 1 }}>
      {flat.map((ing, i) => (
        <ListItem key={i} sx={{ py: 0.25, pl: 0, alignItems: 'flex-start' }}>
          <Typography variant="body2" sx={{ mr: 1.5, fontWeight: 700, minWidth: 24, color: 'text.secondary', flexShrink: 0, pt: 0.1 }}>
            {i + 1}.
          </Typography>
          <ListItemText
            primary={typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`.trim()}
          />
        </ListItem>
      ))}
    </List>
  )
}

// Render method groups or fall back to a flat steps array.
function MethodSection({ groups, legacySteps }) {
  const hasGroups = groups && groups.length > 0 &&
    groups.some((g) => g.steps && g.steps.length > 0)

  if (hasGroups) {
    let globalStep = 0
    return (
      <>
        {groups.map((group, gi) => {
          const startStep = globalStep
          globalStep += (group.steps || []).length
          return (
            <Box key={gi} sx={{ mb: 2 }}>
              {group.title && (
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 0.5 }}>
                  {group.title}
                </Typography>
              )}
              <List disablePadding>
                {(group.steps || []).map((step, i) => (
                  <ListItem key={i} sx={{ pl: 0, alignItems: 'flex-start' }}>
                    <Typography variant="body2" sx={{ mr: 2, fontWeight: 700, minWidth: 28, color: 'text.secondary', flexShrink: 0, pt: 0.25 }}>
                      {startStep + i + 1}.
                    </Typography>
                    <ListItemText primary={step} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )
        })}
      </>
    )
  }

  // Legacy flat list.
  const flat = Array.isArray(legacySteps) ? legacySteps : []
  if (flat.length === 0) return null
  return (
    <List sx={{ mb: 1 }}>
      {flat.map((step, i) => (
        <ListItem key={i} sx={{ pl: 0, alignItems: 'flex-start' }}>
          <Typography variant="body2" sx={{ mr: 2, fontWeight: 700, minWidth: 28, color: 'text.secondary', flexShrink: 0, pt: 0.25 }}>
            {i + 1}.
          </Typography>
          <ListItemText primary={typeof step === 'string' ? step : step.text} />
        </ListItem>
      ))}
    </List>
  )
}

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
  const attempts = recipe?.attempts || []
  const variations = recipe?.variations || []
  const photos = recipe?.photos || []

  const hasIngredients =
    (recipe?.ingredients_groups && recipe.ingredients_groups.some((g) => g.items?.length > 0)) ||
    (Array.isArray(recipe?.ingredients) && recipe.ingredients.length > 0)

  const hasMethod =
    (recipe?.method_groups && recipe.method_groups.some((g) => g.steps?.length > 0)) ||
    (Array.isArray(recipe?.steps) && recipe.steps.length > 0)

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

      {photos.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <ImageList
            variant="masonry"
            cols={photos.length === 1 ? 1 : photos.length === 2 ? 2 : 3}
            gap={8}
          >
            {photos.map((p) => (
              <ImageListItem key={p.id}>
                <img
                  src={p.url}
                  alt={p.caption || recipe?.title}
                  loading="lazy"
                  style={{ borderRadius: 4, display: 'block', width: '100%' }}
                />
                {p.caption && (
                  <ImageListItemBar
                    title={p.caption}
                    position="below"
                    sx={{ '& .MuiImageListItemBar-title': { fontSize: '0.75rem' } }}
                  />
                )}
              </ImageListItem>
            ))}
          </ImageList>
        </Box>
      )}

      <Divider sx={{ mb: 4 }} />

      {hasIngredients && (
        <>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Ingredients
          </Typography>
          <IngredientsSection
            groups={recipe?.ingredients_groups}
            legacyIngredients={recipe?.ingredients}
          />
        </>
      )}

      {hasMethod && (
        <>
          <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mt: hasIngredients ? 3 : 0 }}>
            Method
          </Typography>
          <MethodSection
            groups={recipe?.method_groups}
            legacySteps={recipe?.steps}
          />
        </>
      )}

      {recipe?.notes && (
        <>
          <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
            Notes
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {recipe.notes}
          </Typography>
        </>
      )}

      {variations.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Variations
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {variations.map((v, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                {(v.from_ingredient > 0 || v.from_step > 0) && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    {v.from_ingredient > 0 && (
                      <Chip
                        label={`From ingredient ${v.from_ingredient}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                    {v.from_step > 0 && (
                      <Chip
                        label={`From step ${v.from_step}`}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    )}
                  </Box>
                )}
                {v.title && (
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    {v.title}
                  </Typography>
                )}
                {v.notes && (
                  <Typography variant="body2">{v.notes}</Typography>
                )}
              </Paper>
            ))}
          </Box>
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
                    {attempt.title || `Attempt ${i + 1}`}
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
