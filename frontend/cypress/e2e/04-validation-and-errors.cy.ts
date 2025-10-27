/**
 * E2E Test: Validation and Error Handling
 *
 * Tests form validations, business rules, and error handling
 * across all reservation steps.
 */

describe('Validation and Error Handling', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Step 1: Date and Time Validation', () => {
    it('should not allow dates outside July 24-31, 2025 range', () => {
      cy.visit('/reservation/step/1');

      // Try invalid date (too early)
      cy.get('input[type="date"]').clear().type('2025-07-23');

      // Next button should be disabled or clicking should not proceed
      cy.contains('button', 'Next').should('be.disabled');
    });

    it('should not allow dates in the past', () => {
      cy.visit('/reservation/step/1');

      // Try past date
      cy.get('input[type="date"]').clear().type('2024-07-24');

      cy.contains('button', 'Next').should('be.disabled');
    });

    it('should require both date and time slot selection', () => {
      cy.visit('/reservation/step/1');

      // Select only date
      cy.get('input[type="date"]').type('2025-07-24');

      // Don't select time slot - Next should be disabled
      cy.contains('button', 'Next').should('be.disabled');
    });
  });

  describe('Step 2: Guest Information Validation', () => {
    beforeEach(() => {
      cy.completeStep1('2025-07-24', '19:00');
    });

    it('should require customer name', () => {
      cy.url().should('include', '/reservation/step/2');

      // Try to proceed without name
      cy.get('input[formControlName="email"]').type('test@example.com');
      cy.get('input[formControlName="phone"]').type('+1234567890');

      cy.contains('button', 'Next').should('be.disabled');
    });

    it('should require valid email format', () => {
      cy.url().should('include', '/reservation/step/2');

      cy.get('input[formControlName="customerName"]').type('John Doe');
      cy.get('input[formControlName="phone"]').type('+1234567890');

      // Try invalid email
      cy.get('input[formControlName="email"]').type('invalid-email');

      // Next should be disabled
      cy.contains('button', 'Next').should('be.disabled');

      // Fix email
      cy.get('input[formControlName="email"]').clear().type('valid@example.com');

      cy.contains('button', 'Next').should('not.be.disabled');
    });

    it('should require phone number', () => {
      cy.url().should('include', '/reservation/step/2');

      cy.get('input[formControlName="customerName"]').type('John Doe');
      cy.get('input[formControlName="email"]').type('test@example.com');

      // Don't enter phone
      cy.contains('button', 'Next').should('be.disabled');
    });

    it('should validate phone number format', () => {
      cy.url().should('include', '/reservation/step/2');

      cy.get('input[formControlName="customerName"]').type('John Doe');
      cy.get('input[formControlName="email"]').type('test@example.com');

      // Try invalid phone (too short)
      cy.get('input[formControlName="phone"]').type('123');

      cy.contains('button', 'Next').should('be.disabled');

      // Fix phone
      cy.get('input[formControlName="phone"]').clear().type('+1234567890');

      cy.contains('button', 'Next').should('not.be.disabled');
    });
  });

  describe('Step 3: Party Details Validation', () => {
    beforeEach(() => {
      cy.completeStep1('2025-07-24', '19:00');
      cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
    });

    it('should require party size between 1 and 12', () => {
      cy.url().should('include', '/reservation/step/3');

      // Try party size 0
      cy.get('input[formControlName="partySize"]').clear().type('0');

      cy.contains('button', 'Next').should('be.disabled');

      // Try party size > 12
      cy.get('input[formControlName="partySize"]').clear().type('15');

      cy.contains('button', 'Next').should('be.disabled');

      // Valid party size
      cy.get('input[formControlName="partySize"]').clear().type('4');

      cy.contains('button', 'Next').should('not.be.disabled');
    });

    it('should not allow children count to exceed party size', () => {
      cy.url().should('include', '/reservation/step/3');

      cy.get('input[formControlName="partySize"]').clear().type('4');
      cy.get('input[formControlName="childrenCount"]').clear().type('5');

      // Should show validation error or disable next button
      cy.contains('button', 'Next').should('be.disabled');

      // Fix children count
      cy.get('input[formControlName="childrenCount"]').clear().type('2');

      cy.contains('button', 'Next').should('not.be.disabled');
    });

    it('should require birthday name when birthday is selected', () => {
      cy.url().should('include', '/reservation/step/3');

      cy.get('input[formControlName="partySize"]').type('4');
      cy.get('input[formControlName="childrenCount"]').type('0');

      // Check birthday checkbox
      cy.get('input[formControlName="hasBirthday"]').check();

      // Birthday name field should appear
      cy.get('input[formControlName="birthdayName"]').should('be.visible');

      // Next should be disabled without birthday name
      cy.contains('button', 'Next').should('be.disabled');

      // Enter birthday name
      cy.get('input[formControlName="birthdayName"]').type('Jane Doe');
    });

    it('should allow party size of 1 (single person)', () => {
      cy.url().should('include', '/reservation/step/3');

      cy.get('input[formControlName="partySize"]').clear().type('1');
      cy.get('input[formControlName="childrenCount"]').clear().type('0');

      cy.contains('button', 'Next').should('not.be.disabled');
    });
  });

  describe('Step 4: Region Selection and Constraints', () => {
    it('should disable regions that don\'t allow children when children are in party', () => {
      cy.completeStep1('2025-07-24', '19:00');
      cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
      cy.completeStep3(4, 2, false); // 2 children

      cy.url().should('include', '/reservation/step/4');

      // Wait for regions to load
      cy.wait(1000);

      // Bar should be disabled (doesn't allow children)
      cy.contains('.region-card', 'Bar').should('have.class', 'disabled');

      // Main Hall should be enabled (allows children)
      cy.contains('.region-card', 'Main Hall').should('not.have.class', 'disabled');
    });
  });

  describe('Business Rules Validation', () => {
    it('should allow 1-person reservations', () => {
      cy.completeStep1('2025-07-24', '19:00');
      cy.completeStep2('Solo Diner', 'solo@example.com', '+1234567890');
      cy.completeStep3(1, 0, false);

      // Should be able to proceed
      cy.url().should('include', '/reservation/step/4');
    });

    it('should allow group of children without adults in child-friendly regions', () => {
      cy.completeStep1('2025-07-24', '19:00');
      cy.completeStep2('Parent Name', 'parent@example.com', '+1234567890');

      // 3 people, all children
      cy.completeStep3(3, 3, false);

      cy.url().should('include', '/reservation/step/4');

      cy.wait(1000);

      // Main Hall should be available (allows children)
      cy.contains('.region-card', 'Main Hall').should('not.have.class', 'disabled');

      // Bar should be disabled (no children allowed)
      cy.contains('.region-card', 'Bar').should('have.class', 'disabled');
    });

    it('should enforce maximum capacity of 12 per reservation', () => {
      cy.completeStep1('2025-07-24', '19:00');
      cy.completeStep2('Large Party', 'party@example.com', '+1234567890');

      cy.url().should('include', '/reservation/step/3');

      // Try to enter 13 people
      cy.get('input[formControlName="partySize"]').clear().type('13');

      cy.contains('button', 'Next').should('be.disabled');
    });
  });
});
