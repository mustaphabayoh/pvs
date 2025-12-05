import React, { useState } from 'react'
import { TextField, Button, Paper, Typography } from '@mui/material'
import Api from '../lib/api'

export default function Register({ onRegistered, onBack }){
  const [username, setUsername] = useState('newuser')
  const [password, setPassword] = useState('password')
  const [role, setRole] = useState('importer')
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit(e){
    e.preventDefault()
    setLoading(true); setErr(null)
    try{
      const res = await Api.register({ username, password, role })
      if(res && res.id){ onRegistered(username) }
      else setErr('Registration failed')
    }catch(ex){ setErr(ex.message || 'error') }
    setLoading(false)
  }

  return (
    <Paper style={{ padding: 24, maxWidth: 420, margin: '24px auto' }}>
      <Typography variant="h6" gutterBottom>Create account</Typography>
      <form onSubmit={submit}>
        <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} fullWidth margin="normal" />
        <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth margin="normal" />
        <TextField label="Role (admin/importer/customs_officer)" value={role} onChange={e => setRole(e.target.value)} fullWidth margin="normal" />
        {err && <Typography color="error">{err}</Typography>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button disabled={loading} type="submit" variant="contained">Create</Button>
          <Button disabled={loading} onClick={onBack}>Back to sign in</Button>
        </div>
      </form>
    </Paper>
  )
}
