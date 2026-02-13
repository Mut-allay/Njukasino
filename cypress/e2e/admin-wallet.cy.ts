// cypress/e2e/admin-wallet.cy.ts

describe("Admin Wallet Collection", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.visit("/admin");
  });

  it("shows house balance on admin dashboard", () => {
    cy.get('[data-testid="house-balance"]').should("be.visible");
    // Balance shows as K + number (e.g. K0 or K1,234)
    cy.get('[data-testid="house-balance"]')
      .invoke("text")
      .should("match", /K[\d,]+/);
  });

  it("displays 10% cut description", () => {
    cy.contains("10% cut").should("be.visible");
  });
});
