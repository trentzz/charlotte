import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Typography, Box, CircularProgress, Alert, Divider,
  Link, List, ListItem, ListItemText, Chip, Paper,
  ImageList, ImageListItem, ImageListItemBar, IconButton, Button, Tooltip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import TimerIcon from '@mui/icons-material/Timer'
import client from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'

// ── Timer logic ────────────────────────────────────────────────────────────────

// Format seconds as "m:ss".
function fmtTime(secs) {
  const s = Math.max(0, secs)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Global timer state lives here so it persists across re-renders of child components.
// Each timer: { id, label, duration, timeLeft, startedAt }
function useTimers() {
  const [timers, setTimers] = useState([])
  const tickRef = useRef(null)

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setTimers((prev) => prev.map((t) => {
        if (t.timeLeft <= 0) return t
        return { ...t, timeLeft: t.timeLeft - 1 }
      }))
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  function startTimer(id, label, duration) {
    setTimers((prev) => {
      const existing = prev.findIndex((t) => t.id === id)
      const entry = { id, label, duration, timeLeft: duration, startedAt: Date.now() }
      if (existing !== -1) {
        const next = [...prev]
        next[existing] = entry
        return next
      }
      return [...prev, entry]
    })
  }

  function resetTimer(id) {
    setTimers((prev) => prev.map((t) => t.id === id ? { ...t, timeLeft: t.duration, startedAt: Date.now() } : t))
  }

  function addTime(id, secs) {
    setTimers((prev) => prev.map((t) => t.id === id ? { ...t, timeLeft: t.timeLeft + secs } : t))
  }

  return { timers, startTimer, resetTimer, addTime }
}

// ── Active timer bar ───────────────────────────────────────────────────────────

function TimerBar({ timers, onReset, onAddTime }) {
  // Show the most recently started timer.
  if (timers.length === 0) return null

  const active = [...timers].sort((a, b) => b.startedAt - a.startedAt)[0]
  const done = active.timeLeft <= 0

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        bgcolor: done ? 'error.main' : 'primary.main',
        color: 'white',
        px: 3,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <TimerIcon fontSize="small" />
      <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 160 }}>
        {active.label} — {done ? 'Done!' : fmtTime(active.timeLeft)}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" variant="outlined" color="inherit" onClick={() => onReset(active.id)}>
          Reset
        </Button>
        <Button size="small" variant="outlined" color="inherit" onClick={() => onAddTime(active.id, 30)}>
          +30s
        </Button>
        <Button size="small" variant="outlined" color="inherit" onClick={() => onAddTime(active.id, 60)}>
          +1min
        </Button>
      </Box>
    </Box>
  )
}

// ── Timer chip button ──────────────────────────────────────────────────────────

function TimerChip({ label, seconds, timerId, onStart }) {
  return (
    <Chip
      icon={<TimerIcon fontSize="small" />}
      label={fmtTime(seconds)}
      size="small"
      onClick={() => onStart(timerId, label, seconds)}
      sx={{ cursor: 'pointer', ml: 1, verticalAlign: 'middle' }}
      color="primary"
      variant="outlined"
    />
  )
}

// ── Ingredients section ────────────────────────────────────────────────────────

function IngredientsSection({ groups, legacyIngredients }) {
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

// ── Method section ─────────────────────────────────────────────────────────────

function MethodSection({ groups, legacySteps, onStartTimer }) {
  const hasGroups = groups && groups.length > 0 &&
    groups.some((g) => g.steps && g.steps.length > 0)

  if (hasGroups) {
    let globalStep = 0
    return (
      <>
        {groups.map((group, gi) => {
          const startStep = globalStep
          const steps = group.steps || []
          globalStep += steps.length

          return (
            <Box key={gi} sx={{ mb: 2 }}>
              {group.title && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                    {group.title}
                  </Typography>
                  {(group.timer_seconds > 0) && (
                    <TimerChip
                      label={group.title}
                      seconds={group.timer_seconds}
                      timerId={`group-${gi}`}
                      onStart={onStartTimer}
                    />
                  )}
                </Box>
              )}
              <List disablePadding>
                {steps.map((step, i) => {
                  const text = typeof step === 'string' ? step : (step.text || '')
                  const secs = typeof step === 'object' ? (step.timer_seconds || 0) : 0
                  const stepNum = startStep + i + 1
                  const label = text.length > 40 ? `Step ${stepNum}` : `Step ${stepNum}: ${text.substring(0, 40)}`
                  return (
                    <ListItem key={i} sx={{ pl: 0, alignItems: 'flex-start' }}>
                      <Typography variant="body2" sx={{ mr: 2, fontWeight: 700, minWidth: 28, color: 'text.secondary', flexShrink: 0, pt: 0.25 }}>
                        {stepNum}.
                      </Typography>
                      <ListItemText
                        primary={
                          <Box component="span">
                            {text}
                            {secs > 0 && (
                              <TimerChip
                                label={label}
                                seconds={secs}
                                timerId={`step-${gi}-${i}`}
                                onStart={onStartTimer}
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  )
                })}
              </List>
            </Box>
          )
        })}
      </>
    )
  }

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

// ── Main component ─────────────────────────────────────────────────────────────

export default function RecipePost() {
  const { username, slug } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { timers, startTimer, resetTimer, addTime } = useTimers()

  const isOwner = user?.username?.toLowerCase() === username?.toLowerCase()

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
    <>
      <TimerBar timers={timers} onReset={resetTimer} onAddTime={addTime} />

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Typography variant="h2" fontWeight={700} gutterBottom sx={{ flex: 1 }}>
            {recipe?.title}
          </Typography>
          {isOwner && data?.recipe?.id && (
            <Tooltip title="Edit recipe">
              <IconButton
                component={RouterLink}
                to={`/dashboard/recipes/${data.recipe.id}`}
                size="small"
                sx={{ mt: 1, flexShrink: 0 }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

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
              onStartTimer={startTimer}
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
    </>
  )
}
