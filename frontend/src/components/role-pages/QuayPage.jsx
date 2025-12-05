import React, { useState } from 'react'
import { Typography, Button, TextField } from '@mui/material'
import Api from '../../lib/api'

export default function QuayPage({ token }){
  const [containers, setContainers] = useState('C1')

  return (
    <div>
      <Typography variant="h5">Quay Operator</Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>Manage quay operations and container movements.</Typography>
      <div style={{ marginTop: 12 }}>
        <TextField value={containers} onChange={e=>setContainers(e.target.value)} />
        <Button onClick={async () => {
          try{
            await Api.createBooking(token, { importer_id: 1, document_type: 'STANDARD', containers: containers.split(',').map(s=>s.trim()) })
            alert('booking created')
          }catch(e){ alert('failed ' + e.message) }
        }} sx={{ ml: 2 }}>Create Booking</Button>
      </div>
    </div>
  )
}
