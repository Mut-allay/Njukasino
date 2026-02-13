// cypress/e2e/portrait-view.cy.ts — iPhone X portrait viewport

describe(
  "Portrait View Card Rendering",
  { viewportWidth: 375, viewportHeight: 812 },
  () => {
    const botUids = ["bot_1_uid", "bot_2_uid", "bot_3_uid"];
    const botNames = ["Bot_1", "Bot_2", "Bot_3"];

    beforeEach(() => {
      cy.loginAsTestUser();
    });

    it("shows card face values properly in portrait mode", () => {
      // Arrange: Start a game (2-player for speed)
      cy.visit("/multiplayer");
      cy.get('[data-testid="create-lobby-btn"]').click();
      cy.url().should("include", "/lobby/");

      cy.url().then((url) => {
        const lobbyId = url.split("/lobby/")[1]?.split("/")[0];
        cy.request("POST", "http://localhost:8000/lobby/" + lobbyId + "/join", {
          player: botNames[0],
          player_uid: botUids[0],
        });
      });

      cy.get('[data-testid="game-table"]', { timeout: 15000 }).should(
        "be.visible"
      );

      // Assert: Player's cards have visible value/suit (not white/blank)
      cy.get('[data-testid="player-card"]').each(($card) => {
        const hasValue =
          $card.find('[data-testid="card-value"]').length > 0 ||
          $card.find(".card-value").length > 0;
        const hasSuit =
          $card.find('[data-testid="card-suit"]').length > 0 ||
          $card.find(".card-suit").length > 0;
        const hasImage = $card.find(".card-face-image").length > 0;
        const visible = hasValue || hasSuit || hasImage;
        // Chai expect is a valid assertion; ESLint flags it as expression
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(visible, "card should show value, suit, or image").to.be.true;
      });
    });
  }
);
