describe('UI smoke', () => {
  it('can show Dashboard when token is present', () => {
    // login via backend and set token in localStorage then visit app
    cy.request('POST', 'http://127.0.0.1:4000/api/auth/login', { username: 'importer1', password: 'password' }).then((r) => {
      expect(r.status).to.eq(200)
      window.localStorage.setItem('pvs_token', r.body.access_token)
      cy.visit('/')
      cy.contains('PVS Dashboard')
      cy.contains('Backend status')
    })
  })
})
