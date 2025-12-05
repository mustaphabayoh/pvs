export function parseJwt(token) {
  try{
    const b64 = token.split('\.')[1]
    const json = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  }catch(e){ return null }
}
