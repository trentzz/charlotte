import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Chip, CircularProgress, Alert, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Tooltip,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BlockIcon from '@mui/icons-material/Block'
import DeleteIcon from '@mui/icons-material/Delete'
import client from '../../api/client.js'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    try {
      const res = await client.get('/admin/users')
      setUsers(res.data.users || res.data || [])
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function approve(id) {
    try {
      await client.post(`/admin/users/${id}/approve`)
      setUsers((us) => us.map((u) => u.id === id ? { ...u, approved: true, suspended: false } : u))
    } catch {
      setError('Failed to approve user.')
    }
  }

  async function suspend(id) {
    try {
      await client.post(`/admin/users/${id}/suspend`)
      setUsers((us) => us.map((u) => u.id === id ? { ...u, suspended: true } : u))
    } catch {
      setError('Failed to suspend user.')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await client.delete(`/admin/users/${deleteId}`)
      setUsers((us) => us.filter((u) => u.id !== deleteId))
      setDeleteId(null)
    } catch {
      setError('Failed to delete user.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <CircularProgress />

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Users</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Admin</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.suspended ? (
                    <Chip label="Suspended" color="error" size="small" />
                  ) : user.approved ? (
                    <Chip label="Active" color="success" size="small" variant="outlined" />
                  ) : (
                    <Chip label="Pending" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {user.is_admin && <Chip label="Admin" size="small" color="primary" />}
                </TableCell>
                <TableCell align="right">
                  {!user.approved && (
                    <Tooltip title="Approve">
                      <IconButton size="small" color="success" onClick={() => approve(user.id)}>
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!user.suspended && (
                    <Tooltip title="Suspend">
                      <IconButton size="small" color="warning" onClick={() => suspend(user.id)}>
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => setDeleteId(user.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently delete the user and all their content.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
