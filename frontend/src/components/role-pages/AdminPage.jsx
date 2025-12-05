import React, { useState, useEffect } from 'react'
import { Typography, TextField, Button, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, TablePagination } from '@mui/material'
import Api from '../../lib/api'

export default function AdminPage(){
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const token = localStorage.getItem('pvs_token')

  async function load(){
    try{
      const res = await fetch(`http://127.0.0.1:4000/api/admin/users?page=${page+1}&limit=${rowsPerPage}`, { headers: { Authorization: 'Bearer ' + token }})
      const j = await res.json()
      setRows(j.data)
      setTotal(j.total)
    }catch(e){ console.warn(e) }
  }

  useEffect(()=>{ load() }, [page, rowsPerPage])

  return (
    <div>
      <Typography variant="h5">Admin Console</Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>Manage users, importers and system settings.</Typography>

      <div style={{ marginTop: 12 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.username}</TableCell>
                <TableCell>
                  <Select value={r.role} onChange={async (e) => { try { const updated = await fetch(`http://127.0.0.1:4000/api/admin/users/${r.id}`, { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ role: e.target.value }) }); if (updated.ok) load(); } catch(e){ alert('update failed') } }}>
                    <MenuItem value={'ADMIN'}>ADMIN</MenuItem>
                    <MenuItem value={'IMPORTER'}>IMPORTER</MenuItem>
                    <MenuItem value={'CUSTOMS_OFFICER'}>CUSTOMS_OFFICER</MenuItem>
                    <MenuItem value={'QUAY_OPERATOR'}>QUAY_OPERATOR</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button color='error' onClick={async () => { try { const del = await fetch(`http://127.0.0.1:4000/api/admin/users/${r.id}`, { method: 'DELETE', headers: { Authorization:'Bearer ' + token } }); if (del.ok) load(); } catch(e){ alert('delete failed') } }}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <TablePagination component='div' count={total} page={page} onPageChange={(e, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e)=>{ setRowsPerPage(parseInt(e.target.value)); setPage(0) }} />
      </div>
    </div>
  )
}
