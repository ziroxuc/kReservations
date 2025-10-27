import { TestBed } from '@angular/core/testing';
import { ReservationStateService } from './reservation-state.service';

describe('ReservationStateService', () => {
  let service: ReservationStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReservationStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with step 1', () => {
    expect(service.currentStep()).toBe(1);
  });

  it('should update reservation data', () => {
    service.updateReservationData({ customerName: 'John Doe' });
    expect(service.reservationData().customerName).toBe('John Doe');
  });

  it('should compute lock active status correctly', () => {
    expect(service.isLockActive()).toBe(false);

    service.setLockInfo({
      lockId: 'test-lock',
      sessionId: 'test-session',
      expiresAt: new Date(Date.now() + 300000).toISOString()
    });

    expect(service.isLockActive()).toBe(true);
  });

  it('should validate step completion', () => {
    expect(service.canProceedFromStep()).toBe(false);

    service.updateReservationData({
      date: '2025-07-24',
      timeSlot: '19:00'
    });

    expect(service.canProceedFromStep()).toBe(true);
  });

  it('should reset state', () => {
    service.updateReservationData({ customerName: 'Test' });
    service.setCurrentStep(3);
    service.reset();

    expect(service.currentStep()).toBe(1);
    expect(service.reservationData()).toEqual({});
  });

  it('should move to next step', () => {
    service.setCurrentStep(1);
    service.nextStep();
    expect(service.currentStep()).toBe(2);
  });

  it('should move to previous step', () => {
    service.setCurrentStep(3);
    service.previousStep();
    expect(service.currentStep()).toBe(2);
  });

  it('should not go below step 1', () => {
    service.setCurrentStep(1);
    service.previousStep();
    expect(service.currentStep()).toBe(1);
  });

  it('should not go above step 4', () => {
    service.setCurrentStep(4);
    service.nextStep();
    expect(service.currentStep()).toBe(4);
  });
});
