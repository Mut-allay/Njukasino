import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    setupNodeEvents(_on, _config) {
      // implement node event listeners here
    },
    defaultCommandTimeout: 30000, // 30s per command (signup/onboarding can be slow)
    pageLoadTimeout: 120000, // 120 seconds for page load
    requestTimeout: 30000, // 30s for API requests
    responseTimeout: 30000, // 30s for API responses
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
  },
  viewportWidth: 1280,
  viewportHeight: 720,
});
