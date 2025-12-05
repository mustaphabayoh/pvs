import React, { useEffect, useState } from 'react'
import { Typography, Button, TextField, Paper } from '@mui/material'
import Api from '../lib/api'

export default function ImportersPage({ token }){
  const [list, setList] = useState([])
  const [name, setName] = useState('')
  const [crn, setCrn] = useState('CRN-')
  const [email, setEmail] = useState('')

  async function load(){
    try{ const r = await Api.importers(token); setList(r) }catch(e){ console.warn(e) }
  }

  async function create(){
    try{ await Api.createImporter(token, { name, customs_registration_number: crn, contact_email: email }); setName(''); setCrn('CRN-'); setEmail(''); load() }catch(e){ alert('create failed ' + e.message) }
  }

  async function remove(id){ if(!confirm('delete?')) return; try{ await Api.deleteImporter(token, id); load() }catch(e){ alert('delete failed ' + e.message) } }

  useEffect(()=>{ load() }, [])

  return (
    <div>
      <Typography variant='h5'>Importers</Typography>
      <Paper style={{ padding: 12, marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TextField label='name' value={name} onChange={e=>setName(e.target.value)} />
          <TextField label='CRN' value={crn} onChange={e=>setCrn(e.target.value)} />
          <TextField label='email' value={email} onChange={e=>setEmail(e.target.value)} />
          <Button variant='contained' onClick={create}>Create</Button>
        </div>
      </Paper>

      <div style={{ marginTop: 12 }}>
        {list.map(i => (
          <Paper style={{ padding: 8, marginTop: 8 }} key={i.id}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{i.name}</div>
                <div style={{ color:'#666' }}>{i.customs_registration_number} — {i.contact_email}</div>
              </div>
              <div>
                <Button onClick={() => remove(i.id)} color='error'>Delete</Button>
              </div>
            </div>
          </Paper>
        ))}
      </div>
    </div>
  )
}
