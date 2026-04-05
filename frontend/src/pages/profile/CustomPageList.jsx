import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Collapse,
  IconButton,
} from '@mui/material'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

function RatingDisplay({ rating }) {
  if (!rating || Number(rating) === 0) return null
  return (
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
      {rating}/10
    </Typography>
  )
}

function EntryCard({ entry, kindDef }) {
  const [expanded, setExpanded] = useState(false)

  const isBucketlist = kindDef?.kind === 'bucketlist'
  const done = entry.status === 'done'

  // Extra fields from kind_def that have notes/long content.
  const extraCols = (kindDef?.list_columns || []).filter(
    (c) => !['title', 'subtitle', 'rating', 'status', 'entry_date'].includes(c.key)
  )
  let fields = {}
  try {
    fields = JSON.parse(entry.fields_json || '{}')
  } catch {
    fields = {}
  }

  const notesCols = extraCols.filter((c) => c.type === 'textarea')
  const inlineCols = extraCols.filter((c) => c.type !== 'textarea')

  const hasExpandable = notesCols.length > 0 && notesCols.some((c) => fields[c.key])

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Title row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
          {isBucketlist && (
            <Box sx={{ mt: 0.25, flexShrink: 0, color: done ? 'success.main' : 'text.disabled' }}>
              {done ? <CheckBoxIcon fontSize="small" /> : <CheckBoxOutlineBlankIcon fontSize="small" />}
            </Box>
          )}
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={isBucketlist && done ? { textDecoration: 'line-through', color: 'text.secondary' } : {}}
          >
            {entry.title}
          </Typography>
        </Box>

        {/* Subtitle */}
        {entry.subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
            {entry.subtitle}
          </Typography>
        )}

        {/* Inline extra fields */}
        {inlineCols.map((col) => fields[col.key] && (
          <Box key={col.key} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" component="span">
              {col.label}:{' '}
            </Typography>
            <Typography variant="caption" component="span">
              {fields[col.key]}
            </Typography>
          </Box>
        ))}

        {/* Footer row: rating, status, date */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <RatingDisplay rating={entry.rating} />
          {entry.status && !isBucketlist && (
            <Chip label={entry.status} size="small" variant="outlined" />
          )}
          {entry.entry_date && (
            <Typography variant="caption" color="text.secondary">
              {entry.entry_date}
            </Typography>
          )}
        </Box>

        {/* Expandable notes */}
        {hasExpandable && (
          <Box sx={{ mt: 1 }}>
            <IconButton size="small" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {expanded ? 'Hide notes' : 'Show notes'}
              </Typography>
            </IconButton>
            <Collapse in={expanded}>
              {notesCols.map((col) => fields[col.key] && (
                <Box key={col.key} sx={{ mt: 1 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" display="block">
                    {col.label}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}>
                    {fields[col.key]}
                  </Typography>
                </Box>
              ))}
            </Collapse>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default function CustomPageList({ page, entries, kindDef }) {
  if (!entries || entries.length === 0) {
    return (
      <Typography color="text.secondary">No entries yet.</Typography>
    )
  }

  return (
    <Grid container spacing={2}>
      {entries.map((entry) => (
        <Grid item xs={12} sm={6} md={4} key={entry.id}>
          <EntryCard entry={entry} kindDef={kindDef} />
        </Grid>
      ))}
    </Grid>
  )
}
