describe('Bookings Manager - dynamic container rows and validation', () => {
  beforeEach(() => {
    // stub API calls
    cy.intercept('GET', '**/api/verifications', { body: [] })
    cy.intercept('GET', '**/api/payments*', { body: [
      { PaymentID: 1, Status: 'APPROVED', ReferenceNumber: 'PAY-001', Amount: 100, BankName: 'Test Bank', ImporterID: 13 }
    ] }).as('getPayments')
    cy.intercept('GET', '/api/bookings', { body: [] })
    cy.intercept('GET', '/api/importers', { body: [ { ImporterID: 13, ImporterName: 'Importer 13' } ] })

    // login via backend to get a valid token and then visit bookings
    cy.request('POST', 'http://127.0.0.1:4000/api/auth/login', { username: 'admin', password: 'admin123' }).then(r => {
      expect(r.status).to.eq(200)
      cy.visit('/bookings', { onBeforeLoad(win) { win.localStorage.setItem('pvs_token', r.body.access_token) } })
      // wait for payments to be loaded and ensure the payments table is present
      cy.wait('@getPayments')
      cy.get('table').should('exist')
    })
  })

  it('create booking UI has been removed', () => {
    // Ensure the create booking form is not present and that payments list is visible
    cy.get('[data-testid="form-verification-select"]').should('not.exist')
    cy.get('[data-testid="form-create-booking"]').should('not.exist')
    cy.get('table').should('exist')
  })

  it('create booking submission removed', () => {
    // There should be no way to create bookings from the Bookings page
    cy.get('[data-testid="form-create-booking"]').should('not.exist')
  })
})