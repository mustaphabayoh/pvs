const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:4000'

function authHeaders(token){
  return token ? { Authorization: 'Bearer ' + token } : {}
}

async function req(path, { token, method = 'GET', body } = {}){
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const text = await r.text()
  const data = text ? JSON.parse(text) : {}
  if(!r.ok){
    const error = new Error(data.message || `HTTP ${r.status}`)
    error.status = r.status
    error.code = data.error_code
    error.details = data.errors
    throw error
  }
  return data
}

export default {
  // auth
  login: (data) => req('/api/auth/login', { method: 'POST', body: data }),
  loginTwoFactor: (mfaToken, code) => req('/api/auth/login/2fa', { method: 'POST', token: mfaToken, body: { code } }),
  register: (data) => req('/api/auth/register', { method: 'POST', body: data }),
  me: (token) => req('/api/auth/me', { token }),
  changePassword: (token, data) => req('/api/auth/change-password', { method: 'POST', token, body: data }),
  twoFactorSetup: (token) => req('/api/auth/2fa/setup', { method: 'POST', token }),
  twoFactorEnable: (token, code) => req('/api/auth/2fa/enable', { method: 'POST', token, body: { code } }),
  twoFactorDisable: (token, data) => req('/api/auth/2fa/disable', { method: 'POST', token, body: data }),

  // admin
  adminUsers: (token, { page = 1, limit = 10 } = {}) => req(`/api/admin/users?page=${page}&limit=${limit}`, { token }),
  adminCreateUser: (token, data) => req('/api/admin/users', { method: 'POST', token, body: data }),
  adminUpdateRole: (token, id, role) => req('/api/admin/users/' + id, { method: 'PUT', token, body: { role } }),
  adminDeleteUser: (token, id) => req('/api/admin/users/' + id, { method: 'DELETE', token }),
  adminResetPassword: (token, id, password) => req(`/api/admin/users/${id}/reset-password`, { method: 'POST', token, body: password ? { password } : {} }),
  adminResetTwoFactor: (token, id) => req(`/api/admin/users/${id}/2fa/reset`, { method: 'POST', token }),
  adminUnlockUser: (token, id) => req(`/api/admin/users/${id}/unlock`, { method: 'POST', token }),
  adminSettings: (token) => req('/api/admin/settings', { token }),
  adminUpdateSettings: (token, settings) => req('/api/admin/settings', { method: 'PUT', token, body: { settings } }),

  // domain
  health: () => req('/health'),
  importers: (token) => req('/api/importers', { token }),
  createImporter: (token, data) => req('/api/importers', { method: 'POST', token, body: data }),
  updateImporter: (token, id, data) => req('/api/importers/' + id, { method: 'PUT', token, body: data }),
  deleteImporter: (token, id) => req('/api/importers/' + id, { method: 'DELETE', token }),
  createVerification: (token, data) => req('/api/verifications', { method: 'POST', token, body: data }),
  pendingVerifications: (token) => req('/api/verifications/pending', { token }),
  getBookings: (token, importer_id) => req('/api/bookings' + (importer_id ? '?importer_id=' + importer_id : ''), { token }),
  getBooking: (token, id) => req('/api/bookings/' + id, { token }),
  createBooking: (token, data) => req('/api/bookings', { method: 'POST', token, body: data })
}
