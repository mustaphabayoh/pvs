import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import AdminPage from './components/role-pages/AdminPage'
import ImporterPage from './components/role-pages/ImporterPage'
import CustomsPage from './components/role-pages/CustomsPage'
import QuayPage from './components/role-pages/QuayPage'
import NavBar from './components/NavBar'
import ImportersPage from './components/Importers'
import BookingsManager from './components/BookingsManager'
import { parseJwt } from './lib/jwt'

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('pvs_token') || null)
  const role = token ? (parseJwt(token) && parseJwt(token).role) : null

  return (
    <BrowserRouter>
      <NavBar role={role} onLogout={() => { localStorage.removeItem('pvs_token'); setToken(null) }} />
      <div style={{ padding: 24 }}>
        <Routes>
          <Route path='/' element={token ? <Navigate to='/dashboard' /> : <Login onLogin={(t) => { localStorage.setItem('pvs_token', t); setToken(t) }} />} />
          <Route path='/register' element={<Register onRegistered={(username) => { localStorage.removeItem('pvs_token'); setToken(null) }} />} />
          <Route path='/dashboard' element={token ? <Dashboard token={token} onLogout={() => { localStorage.removeItem('pvs_token'); setToken(null) }} /> : <Navigate to='/' />} />
          <Route path='/admin' element={token ? <AdminPage token={token} /> : <Navigate to='/' />} />
          <Route path='/importer' element={token ? <ImporterPage token={token} /> : <Navigate to='/' />} />
          <Route path='/importers' element={token ? <ImportersPage token={token} /> : <Navigate to='/' />} />
          <Route path='/bookings' element={token ? <BookingsManager token={token} /> : <Navigate to='/' />} />
          <Route path='/customs' element={token ? <CustomsPage token={token} /> : <Navigate to='/' />} />
          <Route path='/quay' element={token ? <QuayPage token={token} /> : <Navigate to='/' />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
