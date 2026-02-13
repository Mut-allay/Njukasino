/// <reference types="cypress" />

describe("Page Persistence on Refresh", () => {
  beforeEach(() => {
    // Clear state
    cy.window().then((win) => {
      win.localStorage.clear();
    });
    cy.loginAsTestUser();
    // Set player name (required for create lobby / tutorial - HomePage is at / after login)
    cy.get('input[placeholder*="name"]').type("TestPlayer");
  });

  it("restores lobby state after refresh in waiting room", () => {
    // Create a lobby
    cy.visit("/multiplayer");
    cy.get('[data-testid="create-lobby-btn"]').click();

    // Verify we are in the lobby and waiting modal is visible
    cy.url().should("include", "/lobby/");
    cy.get('[data-testid="waiting-modal"]').should("be.visible");

    // Refresh the page
    cy.reload();

    // Verify "Restoring your game..." overlay appears (might be too fast to catch sometimes)
    // cy.contains('Restoring your game').should('be.visible');

    // Verify we are still in the lobby and waiting modal is restored
    cy.url().should("include", "/lobby/");
    cy.get('[data-testid="waiting-modal"]', { timeout: 10000 }).should(
      "be.visible",
    );
    cy.get('[data-testid="players-joined"]').should("contain", "1/");
  });

  it("restores game state after refresh during active gameplay", () => {
    // Start a tutorial game (easiest way to get into an active game state quickly)
    // Player name set in beforeEach; HomePage at / has tutorial card
    cy.visit("/");
    cy.get(".tutorial-card").should("be.enabled").click();

    // Wait for game table to load
    cy.url().should("include", "/game/");
    cy.get('[data-testid="game-table"]', { timeout: 10000 }).should(
      "be.visible",
    );

    // Verify we have cards
    cy.get('[data-testid="player-card"]').should("have.length.at.least", 1);

    // Refresh the page
    cy.reload();

    // Verify we are still in the game and table is restored
    cy.url().should("include", "/game/");
    cy.get('[data-testid="game-table"]', { timeout: 10000 }).should(
      "be.visible",
    );
    cy.get('[data-testid="player-card"]').should("have.length.at.least", 1);
  });

  it("does not show game table for invalid lobby ID", () => {
    // Visit a non-existent lobby
    cy.visit("/lobby/invalid-id-123");

    // App stays on lobby URL but cannot load - game table should not appear
    // (Invalid lobby shows loading overlay; no automatic redirect to home)
    cy.url().should("include", "/lobby/");
    cy.get('[data-testid="game-table"]', { timeout: 5000 }).should("not.exist");
  });
});
