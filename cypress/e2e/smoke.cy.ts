describe("Smoke Test", () => {
  it("loads the landing page", () => {
    cy.visit("/");
    // Landing page shows for unauthenticated users (title is "NJUKA KING" in hero)
    cy.contains(/njuka king/i).should("be.visible");
  });
});
