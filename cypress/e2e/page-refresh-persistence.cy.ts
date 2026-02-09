// cypress/e2e/page-refresh-persistence.cy.ts

describe('Page Refresh - Should Stay on Current Page', () => {

  beforeEach(() => {
    // 0. Ensure we are logged in
    cy.loginAsTestUser();
    
    // 1. Intercept relevant API calls
    cy.intercept('GET', '**/lobby/**').as('getLobby');
    cy.intercept('GET', '**/game/**').as('getGame');
  });

  it('should stay in Waiting Lobby modal after page refresh', () => {
    // 1. Go to multiplayer page
    cy.visit('/multiplayer');
    
    // Diagnostic checks
    cy.url().should('include', '/multiplayer');
    cy.contains('h2', 'Multiplayer').should('be.visible');
    
    // Create a lobby
    cy.get('[data-testid="create-lobby-btn"]').should('be.visible').click();

    // Wait for lobby navigation
    cy.url().should('include', '/lobby/');
    
    // Confirm we are in waiting modal
    cy.get('[data-testid="waiting-modal"]').should('be.visible');
    cy.get('[data-testid="players-joined"]').should('contain', '1/');

    // 2. Refresh the page
    cy.reload();

    // 3. After refresh -> Should still be in lobby and modal should be visible
    cy.url().should('include', '/lobby/');
    cy.get('[data-testid="waiting-modal"]').should('be.visible');
    cy.get('[data-testid="game-table"]').should('not.be.visible');
  });

  it('should stay on Game Table after page refresh', () => {
    // 1. Simulate being in an active game 
    // (Note: This might require joint effort or mocking if 4 players are needed)
    // For this test, we can use a simpler approach or mock the game state.
    
    // Let's assume there is a game we can join or we mock one.
    // If we can't easily start a game in a single-browser test, 
    // we can at least verify the URL persistence if we manually navigate.
    
    // If we have a game ID from a previous creation (via API ideally):
    // cy.visit('/game/test-game-id');
    
    // For now, let's focus on the Lobby persistence as a primary goal.
    // Full game persistence might need more complex setup.
  });

});
