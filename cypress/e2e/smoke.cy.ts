describe('Smoke Test', () => {
  it('loads the landing page', () => {
    cy.visit('/');
    cy.contains('h1', 'Njuka King').should('be.visible');
  });
});
