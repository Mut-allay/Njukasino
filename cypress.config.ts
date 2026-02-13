import { defineConfig } from "cypress";

// Match your dev server port (npm run dev). Set CYPRESS_BASE_URL to override, e.g. http://localhost:5175
const baseUrl =
  process.env.CYPRESS_BASE_URL ||
  "http://localhost:5173";

export default defineConfig({
  e2e: {
    baseUrl,
    setupNodeEvents(on, config) {
      // Optional: add plugins here; return config to merge with Cypress config
      return config;
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
