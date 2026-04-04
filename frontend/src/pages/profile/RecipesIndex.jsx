import React, { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, Grid, Card, CardContent, CardActionArea,
  CircularProgress, Alert, Divider, Chip,
} from '@mui/material'
import client from '../../api/client.js'

function RecipeCard({ recipe, username }) {
  return (
    <Card elevation={1}>
      <CardActionArea component={RouterLink} to={`/u/${username}/recipes/${recipe.slug}`}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {recipe.title}
          </Typography>
          {recipe.description && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {recipe.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            {recipe.cuisine && <Chip label={recipe.cuisine} size="small" variant="outlined" />}
            {recipe.prep_time && (
              <Typography variant="caption" color="text.secondary">
                {recipe.prep_time} min prep
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default function RecipesIndex() {
  const { username } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get(`/u/${username}/recipes`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.status === 404 ? null : 'Failed to load recipes.'))
      .finally(() => setLoading(false))
  }, [username])

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

  const recipes = data?.recipes || []

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" fontWeight={700} gutterBottom>
        Recipes
      </Typography>
      <Divider sx={{ mb: 4 }} />
      {recipes.length === 0 ? (
        <Typography color="text.secondary">No recipes yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {recipes.map((recipe) => (
            <Grid item xs={12} sm={6} key={recipe.slug || recipe.id}>
              <RecipeCard recipe={recipe} username={username} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}
