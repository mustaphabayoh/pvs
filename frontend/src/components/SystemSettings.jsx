import React, { useState, useEffect, useCallback } from 'react'
import { Alert, Typography, TextField, Button, Paper, Stack, Switch, FormControlLabel } from '@mui/material'
import Api from '../lib/api'

export default function SystemSettings({ token }){
  const [definitions, setDefinitions] = useState([])
  const [values, setValues] = useState({})
  const [err, setErr] = useState(null)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try{
      const res = await Api.adminSettings(token)
      setDefinitions(res.definitions || [])
      setValues(res.settings || {})
    }catch(ex){ setErr(ex.message) }
  }, [token])

  useEffect(() => { load() }, [load])

  async function save(){
    setErr(null); setNotice(null); setSaving(true)
    try{
      const res = await Api.adminUpdateSettings(token, values)
      setValues(res.settings || {})
      setNotice('Settings saved.')
    }catch(ex){
      setErr(ex.details ? ex.details.map(d => `${d.field}: ${d.message}`).join(', ') : ex.message)
    }finally{
      setSaving(false)
    }
  }

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="subtitle1">System settings</Typography>
      {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      {notice && <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert>}

      <Stack spacing={2} sx={{ mt: 2 }}>
        {definitions.map(def => def.type === 'boolean' ? (
          <FormControlLabel
            key={def.key}
            control={
              <Switch
                checked={!!values[def.key]}
                onChange={e => setValues({ ...values, [def.key]: e.target.checked })}
              />
            }
            label={def.label}
          />
        ) : (
          <TextField
            key={def.key}
            label={def.label}
            size="small"
            type={def.type === 'integer' ? 'number' : 'text'}
            helperText={def.description}
            value={values[def.key] ?? ''}
            onChange={e => setValues({
              ...values,
              [def.key]: def.type === 'integer' ? Number(e.target.value) : e.target.value
            })}
          />
        ))}
        <div>
          <Button variant="contained" disabled={saving || !definitions.length} onClick={save}>Save settings</Button>
        </div>
      </Stack>
    </Paper>
  )
}
