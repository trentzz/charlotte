import React, { useEffect, useCallback } from 'react'
import { Box, IconButton, Modal, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'

/**
 * Full-screen lightbox with previous/next navigation and keyboard support.
 *
 * Props:
 *   open       — boolean
 *   photos     — array of { path, caption }
 *   index      — currently displayed photo index
 *   onClose    — () => void
 *   onPrev     — () => void
 *   onNext     — () => void
 */
export default function Lightbox({ open, photos, index, onClose, onPrev, onNext }) {
  const theme = useTheme()

  const handleKey = useCallback((e) => {
    if (!open) return
    if (e.key === 'ArrowLeft') onPrev()
    if (e.key === 'ArrowRight') onNext()
    if (e.key === 'Escape') onClose()
  }, [open, onPrev, onNext, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!open || !photos?.length) return null

  const photo = photos[index]
  if (!photo) return null

  // Resolve path/url to an absolute URL. The API uses `url`; legacy code used `path`.
  const rawSrc = photo.url || photo.path || ''
  const src = rawSrc.startsWith('/') ? rawSrc : `/${rawSrc}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          bgcolor: 'rgba(0,0,0,0.93)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
        }}
        onClick={onClose}
      >
        {/* Close button */}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', top: 16, right: 16, color: '#fff' }}
        >
          <CloseIcon />
        </IconButton>

        {/* Previous */}
        {photos.length > 1 && (
          <IconButton
            onClick={(e) => { e.stopPropagation(); onPrev() }}
            sx={{ position: 'absolute', left: 16, color: '#fff' }}
          >
            <ArrowBackIosNewIcon />
          </IconButton>
        )}

        {/* Image */}
        <Box
          component="img"
          src={src}
          alt={photo.caption || ''}
          onClick={(e) => e.stopPropagation()}
          sx={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            objectFit: 'contain',
            display: 'block',
            borderRadius: 0,
          }}
        />

        {/* Next */}
        {photos.length > 1 && (
          <IconButton
            onClick={(e) => { e.stopPropagation(); onNext() }}
            sx={{ position: 'absolute', right: 16, color: '#fff' }}
          >
            <ArrowForwardIosIcon />
          </IconButton>
        )}

        {/* Caption */}
        {photo.caption && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 24,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: '#ccc',
              fontSize: 14,
              px: 4,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {photo.caption}
          </Box>
        )}

        {/* Counter */}
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#aaa',
            fontSize: 13,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {index + 1} / {photos.length}
        </Box>
      </Box>
    </Modal>
  )
}
