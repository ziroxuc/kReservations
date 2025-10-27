/// <reference types="cypress" />

/**
 * Custom Cypress Commands for Kafè Reservation System
 */

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Complete Step 1: Date and Time Selection
       * @param date - Date in YYYY-MM-DD format (must be between July 24-31, 2025)
       * @param timeSlot - Time slot (18:00, 18:30, 19:00, etc.)
       */
      completeStep1(date: string, timeSlot: string): Chainable<void>;

      /**
       * Complete Step 2: Guest Information
       * @param name - Customer name
       * @param email - Email address
       * @param phone - Phone number
       */
      completeStep2(name: string, email: string, phone: string): Chainable<void>;

      /**
       * Complete Step 3: Party Details
       * @param partySize - Number of guests (1-12)
       * @param childrenCount - Number of children
       * @param hasBirthday - Whether there's a birthday celebration
       * @param birthdayName - Name of birthday person (optional)
       */
      completeStep3(
        partySize: number,
        childrenCount: number,
        hasBirthday: boolean,
        birthdayName?: string
      ): Chainable<void>;

      /**
       * Complete Step 4: Preferences and Region Selection
       * @param regionName - Display name of the region (e.g., "Main Hall")
       * @param smokingRequest - Whether smoking is requested
       */
      completeStep4(regionName: string, smokingRequest: boolean): Chainable<void>;

      /**
       * Wait for API request to complete
       * @param alias - Alias of the intercepted request
       */
      waitForApi(alias: string): Chainable<void>;

      /**
       * Get element by data-cy attribute
       * @param selector - Value of data-cy attribute
       */
      getByCy(selector: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

// Custom command to get by data-cy attribute
Cypress.Commands.add('getByCy', (selector: string) => {
  return cy.get(`[data-cy="${selector}"]`);
});

// Custom command to complete Step 1
Cypress.Commands.add('completeStep1', (date: string, timeSlot: string) => {
  cy.url().should('include', '/reservation/step/1');

  // Select date - for input[type="date"], we need to set value directly and trigger change event
  cy.get('input[type="date"]')
    .should('be.visible')
    .invoke('val', date)  // Set value directly
    .trigger('change')    // Trigger change event to notify Angular
    .trigger('blur');     // Trigger blur to ensure change detection

  // Wait for slots to appear (they load after date selection)
  cy.get('.time-slots', { timeout: 10000 }).should('be.visible');
  cy.get('.time-slot-btn', { timeout: 10000 }).should('have.length.greaterThan', 0);

  // Select time slot - click the button that contains the time
  cy.contains('.time-slot-btn', timeSlot).should('be.visible').click();

  // Wait a moment for selection to register
  cy.wait(500);

  // Verify Next Step button is enabled
  cy.contains('button', 'Next Step').should('not.be.disabled');

  // Click Next Step button
  cy.contains('button', 'Next Step').click();
});

// Custom command to complete Step 2
Cypress.Commands.add('completeStep2', (name: string, email: string, phone: string) => {
  cy.url().should('include', '/reservation/step/2');

  // Fill in guest information
  cy.get('input[formControlName="customerName"]').should('be.visible').clear().type(name);
  cy.get('input[formControlName="email"]').should('be.visible').clear().type(email);
  cy.get('input[formControlName="phone"]').should('be.visible').clear().type(phone);

  // Verify form is valid
  cy.contains('button', 'Next Step').should('not.be.disabled');

  // Click Next Step button
  cy.contains('button', 'Next Step').click();
});

// Custom command to complete Step 3
Cypress.Commands.add(
  'completeStep3',
  (partySize: number, childrenCount: number, hasBirthday: boolean, birthdayName?: string) => {
    cy.url().should('include', '/reservation/step/3');

    // Set party size
    cy.get('input[formControlName="partySize"]').should('be.visible').clear().type(partySize.toString());

    // Set children count
    cy.get('input[formControlName="childrenCount"]').should('be.visible').clear().type(childrenCount.toString());

    // Set birthday checkbox
    if (hasBirthday) {
      cy.get('input[formControlName="hasBirthday"]').check();

      // Wait for birthday name field to appear
      cy.get('input[formControlName="birthdayName"]').should('be.visible');

      if (birthdayName) {
        cy.get('input[formControlName="birthdayName"]').clear().type(birthdayName);
      }
    }

    // Verify form is valid
    cy.contains('button', 'Next Step').should('not.be.disabled');

    // Click Next Step button
    cy.contains('button', 'Next Step').click();
  }
);

// Custom command to complete Step 4
Cypress.Commands.add('completeStep4', (regionName: string, smokingRequest: boolean) => {
  cy.url().should('include', '/reservation/step/4');

  // Set smoking request if needed
  if (smokingRequest) {
    cy.get('input[formControlName="hasSmokingRequest"]').should('be.visible').check();
    cy.wait(500); // Wait for region filtering
  }

  // Wait for regions to load
  cy.get('.region-card', { timeout: 10000 }).should('have.length.greaterThan', 0);

  // Select region by clicking on the card with the display name
  cy.contains('.region-card h4', regionName, { timeout: 10000 })
    .should('be.visible')
    .parent('.region-card')
    .should('not.have.class', 'disabled')
    .click();

  // Wait for availability check to complete and success message
  cy.contains('.alert-success', 'This slot is available', { timeout: 15000 }).should('be.visible');

  // Verify Lock & Continue button is enabled
  cy.contains('button', 'Lock & Continue').should('not.be.disabled');

  // Click Lock & Continue button
  cy.contains('button', 'Lock & Continue').click();

  // Wait for navigation to review page
  cy.url({ timeout: 10000 }).should('include', '/review');
});

// Custom command to wait for API
Cypress.Commands.add('waitForApi', (alias: string) => {
  cy.wait(`@${alias}`);
});

export {};
