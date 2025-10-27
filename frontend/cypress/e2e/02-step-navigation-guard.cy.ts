/**
 * E2E Test: Step Navigation Guard
 *
 * Tests that users cannot skip steps by manipulating the URL.
 * Ensures step completion requirements are enforced.
 */

describe('Step Navigation Guard', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('URL Manipulation Prevention', () => {
    it('should allow direct access to step 1', () => {
      cy.visit('/reservation/step/1');
      cy.url().should('include', '/reservation/step/1');
    });

    it('should redirect to step 1 when trying to access step 2 without completing step 1', () => {
      cy.visit('/reservation/step/2');
      cy.url().should('include', '/reservation/step/1');
    });

    it('should redirect to step 1 when trying to access step 3 without completing step 1', () => {
      cy.visit('/reservation/step/3');
      cy.url().should('include', '/reservation/step/1');
    });

    it('should redirect to step 1 when trying to access step 4 without completing step 1', () => {
      cy.visit('/reservation/step/4');
      cy.url().should('include', '/reservation/step/1');
    });

    it('should redirect to step 1 when accessing review page without lock', () => {
      cy.visit('/review');
      cy.url().should('include', '/reservation/step/1');
    });
  });

  describe('Sequential Step Completion', () => {
    it('should allow step 2 after completing step 1', () => {
      // Complete step 1
      cy.completeStep1('2025-07-24', '19:00');

      // Should be on step 2
      cy.url().should('include', '/reservation/step/2');
    });
  });

  describe('Invalid Step Numbers', () => {
    it('should redirect to step 1 for step 0', () => {
      cy.visit('/reservation/step/0');
      cy.url().should('include', '/reservation/step/1');
    });

    it('should redirect to step 1 for step 5', () => {
      cy.visit('/reservation/step/5');
      cy.url().should('include', '/reservation/step/1');
    });

    it('should redirect to step 1 for step 999', () => {
      cy.visit('/reservation/step/999');
      cy.url().should('include', '/reservation/step/1');
    });

    it('should redirect to step 1 for negative step numbers', () => {
      cy.visit('/reservation/step/-1');
      cy.url().should('include', '/reservation/step/1');
    });

    it('should redirect to step 1 for non-numeric step values', () => {
      cy.visit('/reservation/step/abc');
      cy.url().should('include', '/reservation/step/1');
    });
  });

  describe('Browser Navigation', () => {
    it('should handle browser back button correctly', () => {
      // Complete step 1
      cy.completeStep1('2025-07-24', '19:00');
      cy.url().should('include', '/reservation/step/2');

      // Use browser back button
      cy.go('back');

      // Should be on step 1
      cy.url().should('include', '/reservation/step/1');
    });

    it('should handle browser forward button correctly', () => {
      // Complete step 1
      cy.completeStep1('2025-07-24', '19:00');
      cy.url().should('include', '/reservation/step/2');

      // Use browser back button
      cy.go('back');
      cy.url().should('include', '/reservation/step/1');

      // Use browser forward button
      cy.go('forward');
      cy.url().should('include', '/reservation/step/2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle incomplete data in step 1', () => {
      // Go to step 1
      cy.visit('/reservation/step/1');

      // Select only date, no time slot
      cy.get('input[type="date"]').type('2025-07-24');

      // Try to go to step 2
      cy.visit('/reservation/step/2');

      // Should redirect back to step 1
      cy.url().should('include', '/reservation/step/1');
    });
  });
});
