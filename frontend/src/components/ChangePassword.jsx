import React, { useState } from 'react'
import { Alert, Button, Paper, TextField, Typography } from '@mui/material'
import Api from '../lib/api'

export default function ChangePassword({ token, forced = false, onChanged }){
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [err, setErr] = useState(null)
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit(e){
    e.preventDefault()
    setErr(null); setDetails(null)
    if(newPassword !== confirmation){ setErr('Passwords do not match'); return }
    setLoading(true)
    try{
      const res = await Api.changePassword(token, { current_password: currentPassword, new_password: newPassword })
      onChanged(res.access_token)
    }catch(ex){
      setErr(ex.message)
      setDetails(ex.details)
    }
    setLoading(false)
  }

  return (
    <Paper style={{ padding: 24, maxWidth: 480, margin: '24px auto' }}>
      <Typography variant="h6" gutterBottom>Change password</Typography>
      {forced && <Alert severity="info" sx={{ mb: 2 }}>An administrator reset your password. Choose a new one to continue.</Alert>}
      <Typography variant="body2" sx={{ mb: 1 }}>
        Use at least 12 characters with upper and lower case letters, a digit and a symbol.
      </Typography>
      <form onSubmit={submit}>
        <TextField label="Current password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} fullWidth margin="normal" autoComplete="current-password" />
        <TextField label="New password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} fullWidth margin="normal" autoComplete="new-password" />
        <TextField label="Confirm new password" type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} fullWidth margin="normal" autoComplete="new-password" />
        {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
        {details && <ul>{details.map((d, i) => <li key={i}>{d.message || d}</li>)}</ul>}
        <Button type="submit" variant="contained" disabled={loading}>Update password</Button>
      </form>
    </Paper>
  )
}
