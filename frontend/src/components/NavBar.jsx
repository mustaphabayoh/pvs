import React from 'react'
import { AppBar, Toolbar, Typography, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function NavBar({ role, onLogout }){
  const nav = useNavigate()
  return (
    <AppBar position="static" sx={{ mb: 2 }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>PVS — {role || 'Guest'}</Typography>
        {role === 'ADMIN' && <Button color="inherit" onClick={() => nav('/system-setup')}>System Setup</Button>}
        {(role === 'IMPORTER' || role === 'ADMIN') && <Button color="inherit" onClick={() => nav('/importers')}>Importers</Button>}
        {role === 'IMPORTER' && <Button color="inherit" onClick={() => nav('/importer')}>Workspace</Button>}
        {role === 'CUSTOMS_OFFICER' && <Button color="inherit" onClick={() => nav('/customs')}>Customs</Button>}
        {role === 'QUAY_OPERATOR' && <Button color="inherit" onClick={() => nav('/quay')}>Quay</Button>}
        {(role === 'IMPORTER' || role === 'QUAY_OPERATOR' || role === 'ADMIN') && <Button color="inherit" onClick={() => nav('/bookings')}>Bookings</Button>}
        <Button color="inherit" onClick={onLogout}>Logout</Button>
      </Toolbar>
    </AppBar>
  )
}
