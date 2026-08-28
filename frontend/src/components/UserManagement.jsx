import React, { useState, useEffect, useCallback } from 'react'
import { Alert, Typography, TextField, Button, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, TablePagination, Paper, Stack } from '@mui/material'
import Api from '../lib/api'

const ROLES = ['ADMIN', 'IMPORTER', 'CUSTOMS_OFFICER', 'QUAY_OPERATOR']

export default function UserManagement({ token }){
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [err, setErr] = useState(null)
  const [notice, setNotice] = useState(null)
  const [secret, setSecret] = useState(null)
  const [newUser, setNewUser] = useState({ username: '', role: 'IMPORTER' })

  const load = useCallback(async () => {
    try{
      const res = await Api.adminUsers(token, { page: page + 1, limit: rowsPerPage })
      setRows(res.data)
      setTotal(res.total)
    }catch(ex){ setErr(ex.message) }
  }, [token, page, rowsPerPage])

  useEffect(() => { load() }, [load])

  async function run(action, successMessage){
    setErr(null); setNotice(null)
    try{
      const res = await action()
      if(res && res.temporary_password){
        setSecret({ username: res.username, password: res.temporary_password })
      }
      if(successMessage) setNotice(successMessage)
      await load()
      return res
    }catch(ex){ setErr(ex.message) }
  }

  return (
    <div>
      {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      {notice && <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert>}
      {secret && (
        <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setSecret(null)}>
          Temporary password for <strong>{secret.username}</strong>: <code>{secret.password}</code>
          {' '}— share it over a trusted channel; it is shown only once and must be changed at next sign-in.
        </Alert>
      )}

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle1">Create user</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }} alignItems="center">
          <TextField label="Username" size="small" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
          <Select size="small" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
            {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </Select>
          <Button
            variant="contained"
            disabled={!newUser.username}
            onClick={async () => {
              const res = await run(() => Api.adminCreateUser(token, newUser))
              if(res) setNewUser({ username: '', role: 'IMPORTER' })
            }}
          >Create</Button>
        </Stack>
      </Paper>

      <div style={{ marginTop: 12 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>2FA</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.username}</TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={r.role}
                    onChange={e => run(() => Api.adminUpdateRole(token, r.id, e.target.value), 'Role updated; existing sessions were revoked.')}
                  >
                    {ROLES.map(role => <MenuItem key={role} value={role}>{role}</MenuItem>)}
                  </Select>
                </TableCell>
                <TableCell>{r.totp_enabled ? 'Enabled' : 'Not enrolled'}</TableCell>
                <TableCell>
                  {r.locked ? 'Locked' : r.must_change_password ? 'Password change pending' : 'Active'}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => run(() => Api.adminResetPassword(token, r.id))}>Reset password</Button>
                    <Button size="small" onClick={() => run(() => Api.adminResetTwoFactor(token, r.id), 'Two-factor reset; the user must enroll again.')}>Reset 2FA</Button>
                    {r.locked && <Button size="small" onClick={() => run(() => Api.adminUnlockUser(token, r.id), 'Account unlocked.')}>Unlock</Button>}
                    <Button size="small" color="error" onClick={() => run(() => Api.adminDeleteUser(token, r.id), 'User deleted.')}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <TablePagination component='div' count={total} page={page} onPageChange={(e, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e)=>{ setRowsPerPage(parseInt(e.target.value)); setPage(0) }} />
      </div>
    </div>
  )
}
