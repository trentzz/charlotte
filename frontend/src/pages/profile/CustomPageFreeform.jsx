import React from 'react'
import { Box } from '@mui/material'

export default function CustomPageFreeform({ page, bodyHtml }) {
  return (
    <Box
      sx={{
        '& h1, & h2, & h3': { mt: 3, mb: 1, fontWeight: 700 },
        '& p': { mb: 1.5, lineHeight: 1.7 },
        '& a': { color: 'primary.main' },
        '& code': {
          bgcolor: 'action.hover',
          px: 0.5,
          borderRadius: 0.5,
          fontSize: '0.85em',
          fontFamily: 'monospace',
        },
        '& pre': {
          bgcolor: 'action.hover',
          p: 2,
          borderRadius: 1,
          overflow: 'auto',
          '& code': { bgcolor: 'transparent', p: 0 },
        },
        '& ul, & ol': { pl: 3, mb: 1.5 },
        '& blockquote': {
          borderLeft: '3px solid',
          borderColor: 'divider',
          pl: 2,
          color: 'text.secondary',
          my: 2,
        },
      }}
      dangerouslySetInnerHTML={{ __html: bodyHtml || '' }}
    />
  )
}
