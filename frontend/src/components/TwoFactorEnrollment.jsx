import React, { useEffect, useState } from 'react'
import { Alert, Button, Paper, TextField, Typography } from '@mui/material'
import Api from '../lib/api'

// Guides a user through TOTP enrollment. `token` may be a short-lived enrollment
// token issued during login, or a normal session token.
export default function TwoFactorEnrollment({ token, onEnrolled }){
  const [setup, setSetup] = useState(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    Api.twoFactorSetup(token)
      .then(res => { if(!cancelled) setSetup(res) })
      .catch(ex => { if(!cancelled) setErr(ex.message) })
    return () => { cancelled = true }
  }, [token])

  async function submit(e){
    e.preventDefault()
    setLoading(true); setErr(null)
    try{
      const res = await Api.twoFactorEnable(token, code)
      setRecoveryCodes(res.recovery_codes)
      setResult(res)
    }catch(ex){ setErr(ex.message) }
    setLoading(false)
  }

  if(recoveryCodes){
    return (
      <Paper style={{ padding: 24, maxWidth: 480, margin: '24px auto' }}>
        <Typography variant="h6" gutterBottom>Save your recovery codes</Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>Each code works once and they are shown only now.</Alert>
        <pre style={{ background: '#f5f5f5', padding: 12 }}>{recoveryCodes.join('\n')}</pre>
        <Button variant="contained" onClick={() => onEnrolled(result)}>Continue</Button>
      </Paper>
    )
  }

  return (
    <Paper style={{ padding: 24, maxWidth: 480, margin: '24px auto' }}>
      <Typography variant="h6" gutterBottom>Set up two-factor authentication</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Scan the QR code with an authenticator app, then enter the 6-digit code to confirm.
      </Typography>
      {setup && <img src={setup.qr_data_url} alt="Authenticator QR code" style={{ width: 200, height: 200 }} />}
      {setup && <Typography variant="caption" component="div" sx={{ wordBreak: 'break-all', mb: 1 }}>Manual key: {setup.secret}</Typography>}
      <form onSubmit={submit}>
        <TextField label="Authentication code" value={code} onChange={e => setCode(e.target.value)} fullWidth margin="normal" inputProps={{ inputMode: 'numeric', maxLength: 6 }} />
        {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
        <Button type="submit" variant="contained" disabled={loading || !setup}>Enable two-factor</Button>
      </form>
    </Paper>
  )
}
