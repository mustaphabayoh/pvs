import React, { useEffect, useState } from 'react'
import { Typography, Button, TextField } from '@mui/material'
import Api from '../../lib/api'

export default function ImporterPage({ token }){
  const [importers, setImporters] = useState([])
  const [bank, setBank] = useState('')
  const [amount, setAmount] = useState('100')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    Api.importers(token).then(list => setImporters(list)).catch(()=>{})
  }, [])

  return (
    <div>
      <Typography variant="h5">Importer Workspace</Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>Create verifications and manage bookings.</Typography>
      <div style={{ marginTop: 12 }}>
        <Typography variant="subtitle1">Your importers</Typography>
        {importers.length ? importers.map(i => (<div key={i.id}>{i.name} — {i.customs_registration_number}</div>)) : <div style={{ color: '#666' }}>none</div>}
      </div>

      <div style={{ marginTop: 12 }}>
        <Typography variant="subtitle1">Create verification</Typography>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <TextField label="Bank" value={bank} onChange={e=>setBank(e.target.value)} />
          <TextField label="Amount" value={amount} onChange={e=>setAmount(e.target.value)} />
          <TextField select label="Importer" SelectProps={{ native: true }} value={selected||''} onChange={e=>setSelected(e.target.value)}>
            <option value=''>Select</option>
            {importers.map(i => (<option key={i.id} value={i.id}>{i.name}</option>))}
          </TextField>
          <Button onClick={async () => {
            if(!selected) return alert('select importer')
            try{
              await Api.createVerification(token, { importer_id: Number(selected), bank_name: bank || 'Bank', amount: Number(amount), currency_code: 'USD', reference_number: 'REF-' + Date.now() })
              alert('verification created')
            }catch(e){ alert('error ' + e.message) }
          }}>Submit</Button>
        </div>
      </div>
    </div>
  )
}
