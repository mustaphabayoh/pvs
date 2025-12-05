import React, { useEffect, useState } from 'react'
import { Typography, Button, TextField, Paper } from '@mui/material'
import Api from '../lib/api'

export default function BookingsManager({ token }){
  const [list, setList] = useState([])
  const [importerId, setImporterId] = useState(1)
  const [containers, setContainers] = useState('C1,C2')

  async function load(){
    try{ const r = await Api.getBookings(token); setList(r) }catch(e){ console.warn(e) }
  }

  useEffect(()=>{ load() }, [])

  async function create(){
    try{
      const conts = containers.split(',').map(s=>s.trim()).filter(Boolean)
      await Api.createBooking(token, { importer_id: Number(importerId), document_type: 'STANDARD', containers: conts })
      setContainers('')
      load()
    }catch(e){ alert('create failed ' + e.message) }
  }

  return (
    <div>
      <Typography variant='h5'>Bookings</Typography>
      <Paper style={{ padding: 12, marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TextField label='importer_id' value={importerId} onChange={e=>setImporterId(e.target.value)} />
          <TextField label='containers CSV' value={containers} onChange={e=>setContainers(e.target.value)} />
          <Button variant='contained' onClick={create}>Create booking</Button>
        </div>
      </Paper>

      <div style={{ marginTop: 12 }}>
        {list.map(b => (
          <Paper style={{ padding: 8, marginTop: 8 }} key={b.id}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>#{b.id} — {b.document_type}</div>
                <div style={{ color:'#666' }}>importer: {b.importer_id} created: {b.created_at}</div>
              </div>
            </div>
          </Paper>
        ))}
      </div>
    </div>
  )
}
