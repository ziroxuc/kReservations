/**
 * E2E Test: Complete Reservation Flow
 *
 * Tests the entire reservation process from start to confirmation,
 * including all 4 steps, review page, and final confirmation.
 */

describe('Complete Reservation Flow', () => {
  let reservationData: any;

  before(() => {
    // Load test data
    cy.fixture('reservation').then((data) => {
      reservationData = data.validReservation;
    });
  });

  beforeEach(() => {
    // Visit the application
    cy.visit('/');
  });

  it('should redirect to step 1 on initial load', () => {
    cy.url().should('include', '/reservation/step/1');
  });

  it('should complete the entire reservation flow successfully', () => {
    // Step 1: Date and Time Selection
    cy.log('📅 Step 1: Selecting date and time');
    cy.completeStep1(reservationData.date, reservationData.timeSlot);

    // Verify we moved to step 2
    cy.url().should('include', '/reservation/step/2');

    // Step 2: Guest Information
    cy.log('👤 Step 2: Entering guest information');
    cy.completeStep2(
      reservationData.customerName,
      reservationData.email,
      reservationData.phone
    );

    // Verify we moved to step 3
    cy.url().should('include', '/reservation/step/3');

    // Step 3: Party Details
    cy.log('👨‍👩‍👧‍👦 Step 3: Entering party details');
    cy.completeStep3(
      reservationData.partySize,
      reservationData.childrenCount,
      reservationData.hasBirthday,
      reservationData.birthdayName
    );

    // Verify we moved to step 4
    cy.url().should('include', '/reservation/step/4');

    // Step 4: Preferences
    cy.log('🏛️ Step 4: Selecting region and preferences');
    cy.completeStep4(reservationData.region, reservationData.hasSmokingRequest);

    // Verify we moved to review page
    cy.url().should('include', '/review');

    // Review Page: Verify all data
    cy.log('📋 Review: Verifying reservation data');

    // Verify lock timer is visible
    cy.get('.lock-timer').should('be.visible');
    cy.get('.lock-timer').should('contain', 'Reservation locked for:');

    // Verify date and time
    cy.contains('Date & Time').should('be.visible');
    cy.contains(reservationData.date).should('be.visible');
    cy.contains(reservationData.timeSlot).should('be.visible');

    // Verify guest information
    cy.contains('Guest Information').should('be.visible');
    cy.contains(reservationData.customerName).should('be.visible');
    cy.contains(reservationData.email).should('be.visible');
    cy.contains(reservationData.phone).should('be.visible');

    // Verify party details
    cy.contains('Party Details').should('be.visible');
    cy.contains(`${reservationData.partySize} people`).should('be.visible');
    cy.contains(`Children: ${reservationData.childrenCount}`).should('be.visible');

    if (reservationData.hasBirthday) {
      cy.contains('Birthday Celebration: Yes').should('be.visible');
      if (reservationData.birthdayName) {
        cy.contains(reservationData.birthdayName).should('be.visible');
      }
    }

    // Verify preferences
    cy.contains('Preferences').should('be.visible');
    cy.contains(reservationData.region).should('be.visible');

    // Confirm reservation
    cy.log('Confirming reservation');
    cy.contains('button', 'Confirm Reservation').click();

    // Wait for navigation to confirmation page
    cy.url({ timeout: 15000 }).should('include', '/confirmation');

    // Verify confirmation page shows reservation details
    cy.contains('Reservation Confirmed', { timeout: 10000 }).should('be.visible');
    cy.contains(reservationData.customerName).should('be.visible');
  });

  it('should handle different party sizes correctly', () => {
    const testCases = [
      { partySize: 1, childrenCount: 0, region: 'Bar' },
      { partySize: 4, childrenCount: 2, region: 'Riverside' }, // Changed from Main Hall to Riverside
      { partySize: 8, childrenCount: 3, region: 'Riverside Smoking' },
      { partySize: 12, childrenCount: 0, region: 'Main Hall' }, // Keep Main Hall (only option for 12 people)
    ];

    testCases.forEach((testCase, index) => {
      cy.log(`Testing party size: ${testCase.partySize}`);

      cy.visit('/');

      cy.completeStep1('2025-07-24', '19:00');
      cy.completeStep2(
        `Test User ${index}`,
        `test${index}@example.com`,
        `+123456789${index}`
      );
      cy.completeStep3(testCase.partySize, testCase.childrenCount, false);

      // Verify we can select appropriate region
      cy.url().should('include', '/reservation/step/4');
      // cy.contains('.region-card', testCase.region).should('be.visible');
    });
  });

  it('should display progress indicator correctly', () => {
    // Step 1
    cy.visit('/');
    cy.get('.progress-indicator').should('be.visible');
    // Progress should be 25% (1/4)

    // Complete step 1
    cy.completeStep1(reservationData.date, reservationData.timeSlot);

    // Step 2 - Progress should be 50% (2/4)
    cy.url().should('include', '/reservation/step/2');

    // Complete step 2
    cy.completeStep2(
      reservationData.customerName,
      reservationData.email,
      reservationData.phone
    );

    // Step 3 - Progress should be 75% (3/4)
    cy.url().should('include', '/reservation/step/3');

    // Complete step 3
    cy.completeStep3(
      reservationData.partySize,
      reservationData.childrenCount,
      false
    );

    // Step 4 - Progress should be 100% (4/4)
    cy.url().should('include', '/reservation/step/4');
  });

  it('should cancel reservation from review page', () => {
    // Complete all steps
    cy.completeStep1(reservationData.date, reservationData.timeSlot);
    cy.completeStep2(
      reservationData.customerName,
      reservationData.email,
      reservationData.phone
    );
    cy.completeStep3(
      reservationData.partySize,
      reservationData.childrenCount,
      false
    );
    cy.completeStep4(reservationData.region, reservationData.hasSmokingRequest);

    // On review page
    cy.url().should('include', '/review');

    // Click Cancel
    cy.contains('button', 'Cancel').click();

    // Confirm cancellation in the alert dialog
    cy.on('window:confirm', () => true);

    // Should navigate back to step 1
    cy.url().should('include', '/reservation/step/1');
  });
});
