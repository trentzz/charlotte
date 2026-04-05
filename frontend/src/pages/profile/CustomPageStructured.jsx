import React from 'react'
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails,
  Stack, Card, CardContent, Button, Divider,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// ─── FAQ ─────────────────────────────────────────────────────────────────────

function FaqView({ data }) {
  const questions = data.questions || []
  if (questions.length === 0) {
    return <Typography color="text.secondary">No questions yet.</Typography>
  }
  return (
    <Box>
      {questions.map((item, i) => (
        <Accordion key={i} disableGutters elevation={0} variant="outlined" sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>{item.q}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{item.a}</Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  )
}

// ─── Resume ──────────────────────────────────────────────────────────────────

function ResumeView({ data }) {
  const sections = data.sections || []
  if (sections.length === 0) {
    return <Typography color="text.secondary">No sections yet.</Typography>
  }
  return (
    <Stack spacing={4}>
      {sections.map((section, si) => (
        <Box key={si}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {section.title}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {(section.items || []).length === 0 && (
            <Typography variant="body2" color="text.secondary">No items.</Typography>
          )}
          <Stack spacing={2}>
            {(section.items || []).map((item, ii) => (
              <Box key={ii}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography fontWeight={600}>{item.title}</Typography>
                  {item.date && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 2, flexShrink: 0 }}>
                      {item.date}
                    </Typography>
                  )}
                </Box>
                {item.org && (
                  <Typography variant="body2" color="text.secondary">{item.org}</Typography>
                )}
                {item.description && (
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                    {item.description}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}

// ─── Event ───────────────────────────────────────────────────────────────────

function EventView({ data }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <Card variant="outlined" sx={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <CardContent sx={{ py: 4 }}>
          {data.photo_url && (
            <Box
              component="img"
              src={data.photo_url}
              alt=""
              sx={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 1, mb: 3 }}
            />
          )}
          {(data.person1 || data.person2) && (
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {[data.person1, data.person2].filter(Boolean).join(' & ')}
            </Typography>
          )}
          {data.date && (
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {data.date}
            </Typography>
          )}
          {data.venue && (
            <Typography variant="body1" gutterBottom>
              {data.venue}
            </Typography>
          )}
          {data.message && (
            <Typography
              variant="body1"
              sx={{ mt: 2, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}
            >
              {data.message}
            </Typography>
          )}
          {data.rsvp_url && (
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                component="a"
                href={data.rsvp_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                RSVP
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export default function CustomPageStructured({ page, kindDef }) {
  let data = {}
  try {
    data = JSON.parse(page.data_json || '{}')
  } catch {
    data = {}
  }

  if (page.kind === 'faq') return <FaqView data={data} />
  if (page.kind === 'resume') return <ResumeView data={data} />
  if (page.kind === 'event') return <EventView data={data} />

  return (
    <Typography color="text.secondary">
      Unknown structured page kind: {page.kind}
    </Typography>
  )
}
