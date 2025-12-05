(async ()=>{
  try{
    const fetch = globalThis.fetch
    const login = await fetch('http://127.0.0.1:4000/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ username: 'admin', password: 'password' }) })
    console.log('login status', login.status)
    const j = await login.json()
    console.log('token available:', !!j.access_token)
    const list = await fetch('http://127.0.0.1:4000/api/importers', { headers: { Authorization: 'Bearer ' + j.access_token }})
    console.log('importers status', list.status)
    console.log(await list.text())
  } catch (e) {
    console.error('error', e)
  }
})()
