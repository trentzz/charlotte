import React, { useState } from 'react'
import { Box } from '@mui/material'
import Lightbox from './Lightbox.jsx'

/**
 * A 3-column photo grid with no rounded corners and a 3px gap.
 * Clicking a photo opens the Lightbox.
 *
 * Props:
 *   photos — array of { path, caption, ... }
 */
export default function PhotoGrid({ photos }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  if (!photos?.length) return null

  const open = (i) => {
    setLightboxIndex(i)
    setLightboxOpen(true)
  }

  const prev = () => setLightboxIndex((i) => (i - 1 + photos.length) % photos.length)
  const next = () => setLightboxIndex((i) => (i + 1) % photos.length)

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '3px',
        }}
      >
        {photos.map((photo, i) => {
          const rawSrc = photo.url || photo.path || ''
          const src = rawSrc.startsWith('/') ? rawSrc : `/${rawSrc}`
          return (
            <Box
              key={photo.id || i}
              component="img"
              src={src}
              alt={photo.caption || ''}
              onClick={() => open(i)}
              sx={{
                width: '100%',
                aspectRatio: '1 / 1',
                objectFit: 'cover',
                borderRadius: 0,
                display: 'block',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                '&:hover': { opacity: 0.88 },
              }}
            />
          )
        })}
      </Box>

      <Lightbox
        open={lightboxOpen}
        photos={photos}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={prev}
        onNext={next}
      />
    </>
  )
}
