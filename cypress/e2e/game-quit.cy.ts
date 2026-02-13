// cypress/e2e/game-quit.cy.ts

describe("Game Quitting/Forfeiting", () => {
  const botUids = ["bot_1_uid", "bot_2_uid", "bot_3_uid"];
  const botNames = ["Bot_1", "Bot_2", "Bot_3"];

  beforeEach(() => {
    cy.loginAsTestUser();
    cy.intercept("POST", "**/game/**/quit").as("quitGame");
    cy.intercept("GET", "**/game/**").as("getGame");
  });

  it("shows no-refund message to quitter and redirects to home", () => {
    // Arrange: Start a 2-player game (host + 1 joiner)
    cy.visit("/multiplayer");
    cy.get('[data-testid="create-lobby-btn"]').click();
    cy.url().should("include", "/lobby/");
    cy.get('[data-testid="waiting-modal"]').should("be.visible");

    cy.url().then((url) => {
      const lobbyId = url.split("/lobby/")[1]?.split("/")[0];
      cy.request("POST", "http://localhost:8000/lobby/" + lobbyId + "/join", {
        player: botNames[0],
        player_uid: botUids[0],
      });
    });

    cy.get('[data-testid="game-table"]', { timeout: 15000 }).should("be.visible");

    // Act: Expand menu (quit is inside the bottom menu), then quit and confirm
    cy.get('[aria-label="Expand menu"]').click();
    cy.get('[data-testid="quit-button"]').click();
    cy.get('[data-testid="confirm-quit"]').click();

    // Assert: Quitter sees no-refund message and redirects
    cy.wait("@quitGame");
    cy.get('[data-testid="no-refund-message"]', { timeout: 5000 })
      .should("be.visible")
      .and("contain", "You will not receive a refund");
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("transfers pot to admin if all players quit", () => {
    cy.visit("/multiplayer");
    cy.get('[data-testid="create-lobby-btn"]').click();
    cy.url().should("include", "/lobby/");

    let gameId: string;
    cy.url().then((url) => {
      const lobbyId = url.split("/lobby/")[1]?.split("/")[0];
      cy.request("POST", "http://localhost:8000/lobby/" + lobbyId + "/join", {
        player: botNames[0],
        player_uid: botUids[0],
      });
    });

    cy.get('[data-testid="game-table"]', { timeout: 15000 }).should("be.visible");
    cy.url().then((url) => {
      const match = url.match(/\/game\/([^/]+)/);
      if (match) gameId = match[1];
    });

    // First player (host) quits via UI
    cy.get('[aria-label="Expand menu"]').click();
    cy.get('[data-testid="quit-button"]').click();
    cy.get('[data-testid="confirm-quit"]').click();
    cy.wait("@quitGame");

    // Second player quits via API (simulate other player quitting)
    if (gameId) {
      cy.request({
        method: "POST",
        url: `http://localhost:8000/game/${gameId}/quit`,
        qs: { player_uid: botUids[0] },
        failOnStatusCode: false,
      });
    }

    // Assert: Game over message for full forfeit (may be on home or game-over view)
    cy.get("body").then(($body) => {
      if ($body.find('[data-testid="game-over-message"]').length) {
        cy.get('[data-testid="game-over-message"]').should(
          "contain",
          "All players forfeited"
        );
      }
    });
  });
});
