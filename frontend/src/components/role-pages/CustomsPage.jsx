import React, { useEffect, useState } from 'react'
import { Typography, Button } from '@mui/material'
import Api from '../../lib/api'

export default function CustomsPage({ token }){
  const [pending, setPending] = useState([])

  useEffect(() => { Api.pendingVerifications(token).then(list => setPending(list)).catch(()=>{}) }, [])

  return (
    <div>
      <Typography variant="h5">Customs Officer</Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>Review pending verifications and issue slips.</Typography>
      <div style={{ marginTop: 12 }}>
        {pending.length ? pending.map(p => (
          <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div>{p.bank_name} — {p.amount} — {p.status}</div>
            <Button onClick={async () => { await fetch(`http://127.0.0.1:4000/api/verifications/${p.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ status: 'VERIFIED' }) }); alert('updated'); } }>Mark Verified</Button>
          </div>
        )) : <div style={{ color:'#666' }}>No pending verifications</div>}
      </div>
    </div>
  )
}
