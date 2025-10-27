// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Disable service worker to avoid caching issues in tests
Cypress.on('window:before:load', (win) => {
  // @ts-ignore
  delete win.navigator.__proto__.ServiceWorker;
});
