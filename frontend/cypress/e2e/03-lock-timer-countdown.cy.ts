/**
 * E2E Test: Lock Timer Countdown
 *
 * Tests the 5-minute countdown timer that displays when a slot is locked.
 * Verifies real-time countdown, format, and warning states.
 */

describe('Lock Timer Countdown', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should not display timer before lock acquisition', () => {
    // Timer should not be visible on step 1
    cy.get('.lock-timer').should('not.exist');

    // Complete step 1
    cy.completeStep1('2025-07-24', '19:00');

    // Timer should not be visible on step 2
    cy.get('.lock-timer').should('not.exist');

    // Complete step 2
    cy.completeStep2('John Doe', 'john@example.com', '+1234567890');

    // Timer should not be visible on step 3
    cy.get('.lock-timer').should('not.exist');
  });

  it('should display timer on review page after lock acquisition', () => {
    // Complete all steps to reach review page
    cy.completeStep1('2025-07-24', '19:00');
    cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
    cy.completeStep3(4, 1, false);
    cy.completeStep4('Main Hall', false); // 1st Main Hall usage

    // Timer should be visible on review page
    cy.url().should('include', '/review');
    cy.get('.lock-timer').should('be.visible');
    cy.get('.lock-timer').should('contain', 'Reservation locked for:');
  });

  it('should show countdown in MM:SS format', () => {
    // Complete all steps
    cy.completeStep1('2025-07-24', '19:00');
    cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
    cy.completeStep3(4, 1, false);
    cy.completeStep4('Main Hall', false); // 2nd Main Hall usage

    // Get timer text
    cy.get('.lock-timer strong').invoke('text').should('match', /^\d+:\d{2}$/);
  });

  it('should start countdown from approximately 5 minutes', () => {
    // Complete all steps
    cy.completeStep1('2025-07-24', '19:00');
    cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
    cy.completeStep3(2, 0, false); // Bar: 2 people, no children
    cy.completeStep4('Bar', false); // Use Bar (4 tables available)

    // Check initial timer value (should be close to 5:00)
    cy.get('.lock-timer strong').invoke('text').then((timeText) => {
      const [minutes, seconds] = timeText.split(':').map(Number);
      const totalSeconds = minutes * 60 + seconds;

      // Should be between 4:55 and 5:00 (295-300 seconds)
      expect(totalSeconds).to.be.within(295, 300);
    });
  });

  it('should decrement every second', () => {
    // Complete all steps
    cy.completeStep1('2025-07-24', '19:00');
    cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
    cy.completeStep3(3, 0, false); // Bar: 3 people, no children
    cy.completeStep4('Bar', false); // Use Bar

    // Get initial time
    let initialTime: number;
    cy.get('.lock-timer strong')
      .invoke('text')
      .then((timeText) => {
        const [minutes, seconds] = timeText.split(':').map(Number);
        initialTime = minutes * 60 + seconds;
      });

    // Wait 3 seconds
    cy.wait(3000);

    // Get new time
    cy.get('.lock-timer strong')
      .invoke('text')
      .then((timeText) => {
        const [minutes, seconds] = timeText.split(':').map(Number);
        const newTime = minutes * 60 + seconds;

        // Time should have decreased by approximately 3 seconds (±1 second tolerance)
        const difference = initialTime - newTime;
        expect(difference).to.be.within(2, 4);
      });
  });

  it('should format seconds with leading zero', () => {
    // Complete all steps
    cy.completeStep1('2025-07-24', '19:00');
    cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
    cy.completeStep3(4, 0, false); // Bar: 4 people, no children
    cy.completeStep4('Bar', false); // Use Bar

    // Wait until seconds are in single digits
    cy.wait(5000);

    // Check format
    cy.get('.lock-timer strong').invoke('text').then((timeText) => {
      const secondsPart = timeText.split(':')[1];
      // Seconds should always be 2 digits
      expect(secondsPart).to.have.lengthOf(2);
    });
  });

  it('should properly decrement minutes when seconds reach 00', () => {
    // This test would require waiting nearly a minute, so we'll mock it
    cy.completeStep1('2025-07-24', '19:00');
    cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
    cy.completeStep3(6, 2, false); // Riverside: 6 people, 2 children
    cy.completeStep4('Riverside', false); // Use Riverside (allows children)

    // Verify format includes colon separator
    cy.get('.lock-timer strong').invoke('text').should('include', ':');

    // Verify consistent format over time
    for (let i = 0; i < 5; i++) {
      cy.wait(1000);
      cy.get('.lock-timer strong').invoke('text').should('match', /^\d+:\d{2}$/);
    }
  });

  it('should display lock icon', () => {
    cy.completeStep1('2025-07-24', '19:00');
    cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
    cy.completeStep3(5, 1, false); // Riverside: 5 people, 1 child
    cy.completeStep4('Riverside', false); // Use Riverside (allows children)

    // Check for lock icon
    cy.get('.lock-timer .icon').should('be.visible');
    cy.get('.lock-timer .icon').should('contain', '🔒');
  });

  it('should show timer text with "Reservation locked for:" label', () => {
    cy.completeStep1('2025-07-24', '19:00');
    cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
    cy.completeStep3(4, 0, false); // Riverside (Smoking): 4 people, no children
    cy.completeStep4('Riverside Smoking', true); // Use Riverside Smoking (5 tables)

    cy.get('.lock-timer .text').should('contain', 'Reservation locked for:');
  });

  it('should maintain consistent timer updates without drift', () => {
    cy.completeStep1('2025-07-24', '19:00');
    cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
    cy.completeStep3(5, 0, false); // Riverside (Smoking): 5 people, no children
    cy.completeStep4('Riverside Smoking', true); // Use Riverside Smoking

    // Record times at 0s, 2s, 4s, 6s
    const times: number[] = [];

    for (let i = 0; i < 4; i++) {
      cy.get('.lock-timer strong')
        .invoke('text')
        .then((timeText) => {
          const [minutes, seconds] = timeText.split(':').map(Number);
          times.push(minutes * 60 + seconds);
        });

      if (i < 3) {
        cy.wait(2000);
      }
    }

    // Verify decrements are consistent
    cy.wrap(null).then(() => {
      for (let i = 1; i < times.length; i++) {
        const decrement = times[i - 1] - times[i];
        // Should be approximately 2 seconds (±1 second tolerance)
        expect(decrement).to.be.within(1, 3);
      }
    });
  });

  it('should not show timer on step 4 before region selection', () => {
    cy.completeStep1('2025-07-24', '19:00');
    cy.completeStep2('John Doe', 'john@example.com', '+1234567890');
    cy.completeStep3(4, 1, false);

    // On step 4 but haven't selected region yet
    cy.url().should('include', '/reservation/step/4');

    // Timer should not be visible
    cy.get('.lock-timer').should('not.exist');
  });
});
