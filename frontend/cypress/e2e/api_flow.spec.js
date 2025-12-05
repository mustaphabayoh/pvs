describe('API end-to-end flow', () => {
  it('creates an importer, submits verification, verifies it, then creates a booking', () => {
    // login importer
    cy.request('POST', 'http://127.0.0.1:4000/api/auth/login', { username: 'importer1', password: 'password' }).then((res) => {
      expect(res.status).to.eq(200)
      const impToken = res.body.access_token
      // create importer
      const unique = 'CPS-' + Date.now()
      cy.request({ method: 'POST', url: 'http://127.0.0.1:4000/api/importers', headers: { Authorization: 'Bearer ' + impToken }, body: { name: 'Cypress Importer', customs_registration_number: unique, contact_email: 'cypress@example.com' } }).then(r => {
        expect(r.status).to.eq(201)
        const importerId = r.body.id
        // create verification
        cy.request({ method: 'POST', url: 'http://127.0.0.1:4000/api/verifications', headers: { Authorization: 'Bearer ' + impToken }, body: { importer_id: importerId, bank_name: 'CypBank', amount: 123, currency_code: 'USD', reference_number: 'CREF1' } }).then(vres => {
          expect(vres.status).to.eq(201)
          const verId = vres.body.id
          // verify as customs officer
          cy.request('POST', 'http://127.0.0.1:4000/api/auth/login', { username: 'customs1', password: 'password' }).then(cRes => {
            expect(cRes.status).to.eq(200)
            const cToken = cRes.body.access_token
            cy.request({ method: 'POST', url: `http://127.0.0.1:4000/api/verifications/${verId}/status`, headers: { Authorization: 'Bearer ' + cToken }, body: { status: 'VERIFIED' } }).then(up => {
              expect(up.status).to.eq(200)
              // create booking as admin
              cy.request('POST', 'http://127.0.0.1:4000/api/auth/login', { username: 'admin', password: 'password' }).then(aRes => {
                const aToken = aRes.body.access_token
                cy.request({ method: 'POST', url: 'http://127.0.0.1:4000/api/bookings', headers: { Authorization: 'Bearer ' + aToken }, body: { importer_id: importerId, document_type: 'STANDARD', containers: ['C1'] } }).then(bk => {
                  expect(bk.status).to.eq(201)
                })
              })
            })
          })
        })
      })
    })
  })
})
