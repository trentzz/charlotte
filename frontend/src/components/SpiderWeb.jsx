import React from 'react'
import { Box } from '@mui/material'

const DEGREES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
const RADII = [20, 40, 60, 80, 95]

// Decorative spider-web SVG. Used on public-facing pages (landing, login, register).
export default function SpiderWeb({ size = 200, sx }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 200 200"
      sx={{ width: size, height: size, ...sx }}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.8"
    >
      {/* Radial lines from centre */}
      {DEGREES.map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line
            key={deg}
            x1="100" y1="100"
            x2={100 + 95 * Math.cos(rad)}
            y2={100 + 95 * Math.sin(rad)}
          />
        )
      })}
      {/* Concentric web rings */}
      {RADII.map((r) => (
        <polygon
          key={r}
          points={DEGREES.map((deg) => {
            const rad = (deg * Math.PI) / 180
            return `${100 + r * Math.cos(rad)},${100 + r * Math.sin(rad)}`
          }).join(' ')}
        />
      ))}
    </Box>
  )
}
