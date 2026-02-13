/// <reference types="cypress" />

export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login as a test user
       * @example cy.loginAsTestUser()
       */
      loginAsTestUser(): Chainable<Element>;

      /**
       * Custom command to signup and login a fresh test user
       * @example cy.signupAndLoginTestUser()
       */
      signupAndLoginTestUser(): Chainable<Element>;

      /**
       * Custom command to join a lobby and start a game
       * @example cy.joinLobbyAndStartGame()
       */
      joinLobbyAndStartGame(): Chainable<Element>;
    }
  }
}

Cypress.Commands.add("loginAsTestUser", () => {
  cy.visit("/sign-in");
  cy.get("#phone").type("974464060");
  cy.get("#password").type("password123");
  cy.get('button[type="submit"]').click();
  // Wait for redirect to home
  cy.url().should("eq", Cypress.config().baseUrl + "/");
});

Cypress.Commands.add("signupAndLoginTestUser", () => {
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const phone = `9${randomSuffix.toString().padStart(8, "0")}`;
  const password = "password123";
  const username = `Test_${randomSuffix}`;

  cy.visit("/sign-up");
  cy.get("#phone").type(phone);
  cy.get("#password").type(password);
  cy.get("#confirmPassword").type(password);
  cy.get('button[type="submit"]').click();

  // Wait for onboarding
  cy.url().should("include", "/onboarding");

  // Step 1: Username
  cy.get("#username").type(username);
  cy.get(".btn-primary").click();

  // Step 2: 18+
  cy.get(".checkbox-input").check();
  cy.get(".btn-primary").click();

  // Step 3: Terms
  cy.get(".checkbox-input").check();
  cy.get(".btn-primary").click();

  // Final redirect
  cy.url().should("eq", Cypress.config().baseUrl + "/");
});

Cypress.Commands.add("joinLobbyAndStartGame", () => {
  cy.visit("/multiplayer");
  cy.get('[data-testid="create-lobby-btn"]').click();

  // Wait for lobby creation and navigation
  cy.url().should("include", "/lobby/");

  // Verify waiting modal is visible
  cy.get('[data-testid="waiting-modal"]').should("be.visible");

  // Note: Starting the game usually requires multiple players.
  // For this test, we might only be able to test the lobby persistence
  // unless we mock the "start" condition or have a backend way to force start.
});
