import React, { useCallback, useEffect, useState } from 'react'
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
import ChangePassword from './components/ChangePassword'
import Api from './lib/api'

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('pvs_token') || null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(!!token)

  const logout = useCallback(() => {
    localStorage.removeItem('pvs_token')
    setToken(null)
    setSession(null)
  }, [])

  const signIn = useCallback((accessToken) => {
    localStorage.setItem('pvs_token', accessToken)
    setToken(accessToken)
  }, [])

  // The server is the source of truth for role and password state; never trust the JWT body alone.
  useEffect(() => {
    if(!token){ setSession(null); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Api.me(token)
      .then(me => { if(!cancelled){ setSession(me); setLoading(false) } })
      .catch(() => { if(!cancelled){ logout(); setLoading(false) } })
    return () => { cancelled = true }
  }, [token, logout])

  const role = session ? session.role : null

  function guard(element, allowedRoles){
    if(!token) return <Navigate to='/' />
    if(loading || !session) return null
    if(allowedRoles && !allowedRoles.includes(session.role)) return <Navigate to='/dashboard' />
    return element
  }

  if(token && session && session.must_change_password){
    return (
      <div style={{ padding: 24 }}>
        <ChangePassword token={token} forced onChanged={(t) => signIn(t)} />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <NavBar role={role} onLogout={logout} />
      <div style={{ padding: 24 }}>
        <Routes>
          <Route path='/' element={token ? <Navigate to='/dashboard' /> : <Login onLogin={signIn} />} />
          <Route path='/register' element={<Register onRegistered={logout} onBack={logout} />} />
          <Route path='/change-password' element={guard(<ChangePassword token={token} onChanged={signIn} />)} />
          <Route path='/dashboard' element={guard(<Dashboard token={token} onLogout={logout} />)} />
          <Route path='/admin' element={guard(<AdminPage token={token} />, ['ADMIN'])} />
          <Route path='/importer' element={guard(<ImporterPage token={token} />, ['IMPORTER', 'ADMIN'])} />
          <Route path='/importers' element={guard(<ImportersPage token={token} />, ['IMPORTER', 'ADMIN', 'CUSTOMS_OFFICER'])} />
          <Route path='/bookings' element={guard(<BookingsManager token={token} />, ['IMPORTER', 'ADMIN', 'QUAY_OPERATOR'])} />
          <Route path='/customs' element={guard(<CustomsPage token={token} />, ['CUSTOMS_OFFICER', 'ADMIN'])} />
          <Route path='/quay' element={guard(<QuayPage token={token} />, ['QUAY_OPERATOR', 'ADMIN'])} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
