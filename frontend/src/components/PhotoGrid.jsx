import React, { useState } from 'react'
import Masonry from 'react-masonry-css'
import { Box } from '@mui/material'
import Lightbox from './Lightbox.jsx'

/**
 * A masonry photo grid that preserves original image aspect ratios.
 * Clicking a photo opens the Lightbox.
 *
 * Props:
 *   photos — array of { path, caption, ... }
 */

const breakpointColumns = {
  default: 3,
  900: 2,
  600: 1,
}

const masonryStyles = {
  display: 'flex',
  marginLeft: '-10px',
  width: 'auto',
}

const columnStyles = {
  paddingLeft: '10px',
  backgroundClip: 'padding-box',
}

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
      <Box sx={{ px: { xs: 2, md: 6 } }}>
        <Masonry
          breakpointCols={breakpointColumns}
          style={masonryStyles}
          columnClassName="masonry-column"
        >
          {photos.map((photo, i) => {
            const rawSrc = photo.compressed_url || photo.url || photo.path || ''
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
                  height: 'auto',
                  display: 'block',
                  borderRadius: 0,
                  marginBottom: '10px',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                  '&:hover': { opacity: 0.88 },
                }}
              />
            )
          })}
        </Masonry>
      </Box>

      {/* Masonry column padding — injected globally so the className approach works */}
      <style>{`.masonry-column { padding-left: 10px; background-clip: padding-box; }`}</style>

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
