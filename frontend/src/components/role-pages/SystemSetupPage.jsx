import React, { useState } from 'react'
import { Typography, Tabs, Tab } from '@mui/material'
import UserManagement from '../UserManagement'
import SystemSettings from '../SystemSettings'

// Single entry point for every administrative capability: user accounts,
// credentials and two-factor enrollment live beside the system settings.
export default function SystemSetupPage({ token: tokenProp }){
  const token = tokenProp || localStorage.getItem('pvs_token')
  const [tab, setTab] = useState(0)

  return (
    <div>
      <Typography variant="h5">Advanced System Setup</Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>
        Manage users, credentials, two-factor enrollment and system settings.
      </Typography>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mt: 2 }}>
        <Tab label="Users & access" />
        <Tab label="System settings" />
      </Tabs>

      {tab === 0 && <UserManagement token={token} />}
      {tab === 1 && <SystemSettings token={token} />}
    </div>
  )
}
