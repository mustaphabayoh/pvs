const BASE = process.env.VITE_API_BASE || 'http://localhost:4000'

async function req(path, opts = {}){
  const url = BASE + path
  const r = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts))
  if(!r.ok){ const text = await r.text(); throw new Error(`HTTP ${r.status}: ${text}`) }
  return r.json()
}

export default {
  login: (data) => req('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => req('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  health: () => req('/health'),
  // token optional - if provided it will be sent as Authorization header
  importers: (token) => req('/api/importers', { method: 'GET', headers: token ? { Authorization: 'Bearer ' + token } : {} }),
  createImporter: (token, data) => req('/api/importers', { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: JSON.stringify(data) }),
  updateImporter: (token, id, data) => req('/api/importers/' + id, { method: 'PUT', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: JSON.stringify(data) }),
  deleteImporter: (token, id) => req('/api/importers/' + id, { method: 'DELETE', headers: token ? { Authorization: 'Bearer ' + token } : {} }),
  createVerification: (token, data) => req('/api/verifications', { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: JSON.stringify(data) }),
  pendingVerifications: (token) => req('/api/verifications/pending', { method: 'GET', headers: token ? { Authorization: 'Bearer ' + token } : {} }),
  getBookings: (token, importer_id) => req('/api/bookings' + (importer_id ? '?importer_id=' + importer_id : ''), { method: 'GET', headers: token ? { Authorization: 'Bearer ' + token } : {} }),
  getBooking: (token, id) => req('/api/bookings/' + id, { method: 'GET', headers: token ? { Authorization: 'Bearer ' + token } : {} }),
  createBooking: (token, data) => req('/api/bookings', { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: JSON.stringify(data) })
}
