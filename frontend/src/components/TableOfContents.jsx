import React, { useEffect, useState } from 'react'
import { Box, Typography, Link } from '@mui/material'

// Extracts headings from an HTML string and returns [{id, level, text}].
// If a heading has no id, generates one from the text.
function extractHeadings(html) {
  if (!html || typeof document === 'undefined') return []
  const div = document.createElement('div')
  div.innerHTML = html
  const nodes = div.querySelectorAll('h1, h2, h3, h4')
  const headings = []
  nodes.forEach((node) => {
    const text = node.textContent.trim()
    if (!text) return
    // Goldmark adds IDs for markdown; add one for WYSIWYG headings that lack it.
    let id = node.id
    if (!id) {
      id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      node.id = id
    }
    headings.push({ id, level: parseInt(node.tagName[1], 10), text })
  })
  return headings
}

export default function TableOfContents({ contentHtml }) {
  const [headings, setHeadings] = useState([])
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    setHeadings(extractHeadings(contentHtml))
  }, [contentHtml])

  // Highlight the heading currently in view using IntersectionObserver.
  useEffect(() => {
    if (headings.length === 0) return
    const observers = []
    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id)
        },
        { rootMargin: '0px 0px -60% 0px', threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [headings])

  if (headings.length < 2) return null

  return (
    <Box
      component="nav"
      aria-label="Table of contents"
      sx={{
        position: 'sticky',
        top: 80,
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        pl: 2,
        borderLeft: '2px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="overline"
        sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 700, letterSpacing: '0.1em' }}
      >
        On this page
      </Typography>
      {headings.map(({ id, level, text }) => (
        <Link
          key={id}
          href={`#${id}`}
          underline="none"
          sx={{
            display: 'block',
            pl: (level - 2) * 1.5,
            py: 0.3,
            fontSize: 13,
            color: activeId === id ? 'primary.main' : 'text.secondary',
            fontWeight: activeId === id ? 600 : 400,
            '&:hover': { color: 'text.primary' },
            transition: 'color 0.15s',
          }}
          onClick={(e) => {
            e.preventDefault()
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          {text}
        </Link>
      ))}
    </Box>
  )
}
