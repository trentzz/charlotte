import React from 'react'
import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  AppBar, Toolbar, Typography, Button, Box, Container,
} from '@mui/material'
import { useAuth } from '../context/AuthContext.jsx'

export default function PublicLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
          >
            Charlotte
          </Typography>
          {user ? (
            <Button component={RouterLink} to="/dashboard" color="inherit">
              Dashboard
            </Button>
          ) : (
            <>
              <Button component={RouterLink} to="/login" color="inherit">
                Log in
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                sx={{ ml: 1 }}
              >
                Register
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>

      <Box
        component="footer"
        sx={{ py: 2, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}
      >
        <Typography variant="caption">Charlotte</Typography>
      </Box>
    </Box>
  )
}
