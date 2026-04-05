import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog, DialogContent, TextField, Box, Typography, List, ListItemButton,
  ListItemText, InputAdornment, Chip, Divider, CircularProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useNavigate } from 'react-router-dom'
import client from '../api/client.js'

const TYPE_LABELS = {
  blog: 'Blog',
  project: 'Project',
  recipe: 'Recipe',
  album: 'Album',
}

const TYPE_COLOURS = {
  blog: 'primary',
  project: 'secondary',
  recipe: 'warning',
  album: 'info',
}

export default function SearchModal({ open, onClose, username }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  // Reset state when modal opens.
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search triggered by query changes.
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await client.get(`/u/${username}/search`, { params: { q: query } })
        setResults(res.data.results || [])
        setSelectedIndex(0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, username])

  function hrefFor(result) {
    switch (result.type) {
      case 'blog':    return `/u/${username}/blog/${result.slug}`
      case 'project': return `/u/${username}/projects/${result.slug}`
      case 'recipe':  return `/u/${username}/recipes/${result.slug}`
      case 'album':   return `/u/${username}/gallery/${result.slug}`
      default:        return `/u/${username}`
    }
  }

  function handleSelect(result) {
    onClose()
    navigate(hrefFor(result))
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex])
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '15%',
          m: 0,
          borderRadius: 2,
          maxHeight: '70vh',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? <CircularProgress size={18} /> : <SearchIcon />}
              </InputAdornment>
            ),
            sx: { borderRadius: '8px 8px 0 0', fontSize: '1.1rem', px: 1 },
          }}
          sx={{ '& fieldset': { border: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}
        />

        {results.length > 0 && (
          <List disablePadding sx={{ overflowY: 'auto', maxHeight: 'calc(70vh - 60px)' }}>
            {results.map((r, i) => (
              <React.Fragment key={`${r.type}-${r.slug}`}>
                <ListItemButton
                  selected={i === selectedIndex}
                  onClick={() => handleSelect(r)}
                  sx={{ px: 2, py: 1.25 }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={TYPE_LABELS[r.type] || r.type}
                          color={TYPE_COLOURS[r.type] || 'default'}
                          size="small"
                          sx={{ fontSize: 11, height: 20 }}
                        />
                        <Typography variant="body1" fontWeight={500}>{r.title}</Typography>
                      </Box>
                    }
                    secondary={r.description || null}
                    secondaryTypographyProps={{ noWrap: true, fontSize: 13 }}
                  />
                </ListItemButton>
                {i < results.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}

        {query.trim().length >= 2 && !loading && results.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              No results for "{query}"
            </Typography>
          </Box>
        )}

        {query.trim().length < 2 && (
          <Box sx={{ p: 2.5, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              Type to search blog posts, projects, albums, and recipes
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
