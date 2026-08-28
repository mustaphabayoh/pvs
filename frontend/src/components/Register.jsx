import React, { useState } from 'react'
import { Alert, TextField, Button, Paper, Typography } from '@mui/material'
import Api from '../lib/api'

// Self-registration only creates importer accounts; privileged roles are provisioned by an admin.
export default function Register({ onRegistered, onBack }){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [err, setErr] = useState(null)
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit(e){
    e.preventDefault()
    setErr(null); setDetails(null)
    if(password !== confirmation){ setErr('Passwords do not match'); return }
    setLoading(true)
    try{
      const res = await Api.register({ username, password })
      if(res && res.id) onRegistered(username)
      else setErr('Registration failed')
    }catch(ex){ setErr(ex.message || 'Registration failed'); setDetails(ex.details) }
    setLoading(false)
  }

  return (
    <Paper style={{ padding: 24, maxWidth: 420, margin: '24px auto' }}>
      <Typography variant="h6" gutterBottom>Create importer account</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Passwords need at least 12 characters with upper and lower case letters, a digit and a symbol.
      </Typography>
      <form onSubmit={submit}>
        <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} fullWidth margin="normal" autoComplete="username" />
        <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth margin="normal" autoComplete="new-password" />
        <TextField label="Confirm password" type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} fullWidth margin="normal" autoComplete="new-password" />
        {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
        {details && <ul>{details.map((d, i) => <li key={i}>{d.message || d}</li>)}</ul>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button disabled={loading} type="submit" variant="contained">Create</Button>
          <Button disabled={loading} onClick={onBack}>Back to sign in</Button>
        </div>
      </form>
    </Paper>
  )
}
