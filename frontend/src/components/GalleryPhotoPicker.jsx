import React, { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Tooltip, Typography,
} from '@mui/material'
import client from '../api/client.js'

// GalleryPhotoPicker — modal that lists the user's gallery photos and lets them pick one.
//
// Props:
//   open     — whether the dialog is visible
//   onClose  — called when the dialog is dismissed
//   onSelect — called with the selected photo object when the user confirms
//   label    — confirm button text (default: "Select photo")
export default function GalleryPhotoPicker({ open, onClose, onSelect, label = 'Select photo' }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSelected(null)
    setError(null)
    client.get('/dashboard/gallery/photos')
      .then((res) => setPhotos(res.data.photos || []))
      .catch(() => setError('Failed to load photos.'))
      .finally(() => setLoading(false))
  }, [open])

  function handleConfirm() {
    if (!selected) return
    onSelect(selected)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Pick a photo from your gallery</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <CircularProgress />
        ) : photos.length === 0 ? (
          <Typography color="text.secondary">No photos found.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1, mt: 1 }}>
            {photos.map((photo) => {
              const src = (photo.url || '').startsWith('/') ? photo.url : `/${photo.url}`
              const isSelected = selected?.id === photo.id
              return (
                <Tooltip key={photo.id} title={photo.caption || 'Click to select'}>
                  <Box
                    onClick={() => setSelected(photo)}
                    sx={{
                      position: 'relative',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid' : '2px solid transparent',
                      borderColor: isSelected ? 'primary.main' : 'transparent',
                    }}
                  >
                    <Box
                      component="img"
                      src={src}
                      alt={photo.caption || ''}
                      sx={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                    />
                    {isSelected && (
                      <Checkbox
                        checked
                        size="small"
                        sx={{
                          position: 'absolute', top: 2, right: 2,
                          bgcolor: 'white', borderRadius: '50%', p: 0.25,
                        }}
                      />
                    )}
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!selected}>
          {label}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
