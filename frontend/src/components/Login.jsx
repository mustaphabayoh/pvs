import React, { useState } from 'react'
import { Alert, TextField, Button, Paper, Typography } from '@mui/material'
import Api from '../lib/api'
import TwoFactorEnrollment from './TwoFactorEnrollment'

const STEP = { CREDENTIALS: 'credentials', CODE: 'code', ENROLL: 'enroll' }

export default function Login({ onLogin }){
  const [step, setStep] = useState(STEP.CREDENTIALS)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [mfaToken, setMfaToken] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  function complete(res){
    setPassword('')
    onLogin(res.access_token, res)
  }

  async function submitCredentials(e){
    e.preventDefault()
    setLoading(true); setErr(null)
    try{
      const res = await Api.login({ username, password })
      if(res.mfa_setup_required){ setMfaToken(res.mfa_token); setStep(STEP.ENROLL) }
      else if(res.mfa_required){ setMfaToken(res.mfa_token); setStep(STEP.CODE) }
      else if(res.access_token) complete(res)
      else setErr('Login failed')
    }catch(ex){ setErr(ex.message || 'Login failed') }
    setLoading(false)
  }

  async function submitCode(e){
    e.preventDefault()
    setLoading(true); setErr(null)
    try{
      complete(await Api.loginTwoFactor(mfaToken, code.trim()))
    }catch(ex){ setErr(ex.message || 'Verification failed') }
    setLoading(false)
  }

  if(step === STEP.ENROLL){
    return <TwoFactorEnrollment token={mfaToken} onEnrolled={complete} />
  }

  if(step === STEP.CODE){
    return (
      <Paper style={{ padding: 24, maxWidth: 420, margin: '24px auto' }}>
        <Typography variant="h6" gutterBottom>Two-factor verification</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>Enter the code from your authenticator app, or one of your recovery codes.</Typography>
        <form onSubmit={submitCode}>
          <TextField label="Verification code" value={code} onChange={e => setCode(e.target.value)} fullWidth margin="normal" autoFocus />
          {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button disabled={loading} type="submit" variant="contained">Verify</Button>
            <Button disabled={loading} onClick={() => { setStep(STEP.CREDENTIALS); setCode(''); setMfaToken(null); setErr(null) }}>Cancel</Button>
          </div>
        </form>
      </Paper>
    )
  }

  return (
    <Paper style={{ padding: 24, maxWidth: 420, margin: '24px auto' }}>
      <Typography variant="h6" gutterBottom>Sign in</Typography>
      <form onSubmit={submitCredentials}>
        <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} fullWidth margin="normal" autoComplete="username" />
        <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth margin="normal" autoComplete="current-password" />
        {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
        <Typography variant="caption" color="text.secondary">
          Forgotten your password? Contact an administrator — passwords can only be reset by an administrator.
        </Typography>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button disabled={loading} type="submit" variant="contained">Sign in</Button>
        </div>
      </form>
    </Paper>
  )
}
