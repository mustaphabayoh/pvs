import React, { useEffect, useState } from 'react'
import { Paper, Typography, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import Api from '../lib/api'

export default function Dashboard({ token, onLogout }){
  const [hello, setHello] = useState(null)
  const [importers, setImporters] = useState([])
  const [verifications, setVerifications] = useState([])
  const [containers, setContainers] = useState('')
  const [amount, setAmount] = useState('100')
  const [bank, setBank] = useState('MyBank')

  useEffect(() => {
    let mounted = true
    Api.health().then(h => { if(mounted) setHello(h) }).catch(()=>{})
    Api.importers(token).then(list => { if(mounted) setImporters(list) }).catch(()=>{})
    Api.pendingVerifications(token).then(list => { if(mounted) setVerifications(list) }).catch(()=>{})
    return () => { mounted = false }
  }, [])

  const nav = useNavigate()

  return (
    <Paper style={{ padding: 24, maxWidth: 700, margin: '24px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">PVS Dashboard</Typography>
        <div>
          <Button onClick={() => nav('/admin')}>Admin Console</Button>
          <Button onClick={() => nav('/customs')}>Customs</Button>
          <Button onClick={() => nav('/importer')}>Importer</Button>
          <Button onClick={() => nav('/quay')}>Quay</Button>
          <Button onClick={onLogout}>Logout</Button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Typography variant="body1">Backend status: {hello && hello.ok ? 'OK' : 'Unknown'}</Typography>
        <pre style={{ marginTop: 12 }}>{JSON.stringify(hello, null, 2)}</pre>
        <div style={{ marginTop: 12 }}>
          <Typography variant="subtitle1">Importers</Typography>
          {importers.length ? importers.map(i => (<div key={i.id}>{i.name} - {i.customs_registration_number}</div>)) : <div style={{ color: '#666' }}>none yet</div>}
        </div>
        <div style={{ marginTop: 18 }}>
          <Typography variant="subtitle1">Create verification</Typography>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input placeholder="bank" value={bank} onChange={e => setBank(e.target.value)} />
            <input placeholder="amount" value={amount} onChange={e => setAmount(e.target.value)} />
            <input placeholder="containers (comma)" value={containers} onChange={e => setContainers(e.target.value)} />
            <button onClick={async () => {
              try{
                const payload = { bank_name: bank, amount: amount, currency_code: 'USD', reference_number: 'REF1', customs_registration_number: 'CRN1', importer_id: 1 }
                await Api.createVerification(token, payload)
                const list = await Api.pendingVerifications(token)
                setVerifications(list)
                alert('verification created')
              }catch(e){ alert('failed: ' + e.message) }
            }}>Create</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <Typography variant="subtitle1">Pending verifications</Typography>
            {verifications.length ? verifications.map(v => (<div key={v.id}>{v.bank_name} — {v.amount} — {v.status}</div>)) : <div style={{ color: '#666' }}>none</div>}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <Typography variant="subtitle1">Create booking</Typography>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input placeholder="container numbers (comma)" />
            <button onClick={async () => {
              try{
                const payload = { importer_id: 1, document_type: 'STANDARD', containers: ['C1','C2'] }
                await Api.createBooking(token, payload)
                alert('booking created')
              }catch(e){ alert('failed: ' + e.message) }
            }}>Create Booking</button>
          </div>
        </div>
      </div>
    </Paper>
  )
}
