import React from 'react'
import { Outlet } from 'react-router-dom'

// PublicLayout is a minimal pass-through wrapper. Each public page (Landing,
// Login, Register) manages its own chrome and theming.
export default function PublicLayout() {
  return <Outlet />
}
