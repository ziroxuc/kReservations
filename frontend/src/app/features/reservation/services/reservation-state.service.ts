import { Injectable, signal, computed } from '@angular/core';
import { ReservationData, LockInfo } from '../../../core/models/reservation.model';
import { TimeSlot, Alternative } from '../../../core/models/availability.model';

@Injectable({ providedIn: 'root' })
export class ReservationStateService {
  // Private writable signals
  private _currentStep = signal<number>(1);
  private _reservationData = signal<Partial<ReservationData>>({});
  private _lockInfo = signal<LockInfo | null>(null);
  private _availableSlots = signal<TimeSlot[]>([]);
  private _alternatives = signal<Alternative[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _sessionId = signal<string>(this.generateSessionId());

  // Public readonly signals
  readonly currentStep = this._currentStep.asReadonly();
  readonly reservationData = this._reservationData.asReadonly();
  readonly lockInfo = this._lockInfo.asReadonly();
  readonly availableSlots = this._availableSlots.asReadonly();
  readonly alternatives = this._alternatives.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly sessionId = this._sessionId.asReadonly();

  // Computed signals
  readonly isLockActive = computed(() => {
    const lock = this._lockInfo();
    if (!lock) return false;
    return new Date(lock.expiresAt) > new Date();
  });

  readonly lockTimeRemaining = computed(() => {
    const lock = this._lockInfo();
    if (!lock) return 0;
    const now = new Date().getTime();
    const expires = new Date(lock.expiresAt).getTime();
    return Math.max(0, expires - now);
  });

  readonly canProceedFromStep = computed(() => {
    const step = this._currentStep();
    const data = this._reservationData();

    switch(step) {
      case 1: return !!(data.date && data.timeSlot);
      case 2: return !!(data.customerName && data.email && data.phone);
      case 3: return data.partySize !== undefined && data.partySize > 0;
      case 4: return !!data.region;
      default: return false;
    }
  });

  readonly progressPercentage = computed(() => {
    return (this._currentStep() / 4) * 100;
  });

  readonly isFormComplete = computed(() => {
    const data = this._reservationData();
    return !!(
      data.date && data.timeSlot && data.customerName &&
      data.email && data.phone && data.partySize &&
      data.region !== undefined && data.childrenCount !== undefined
    );
  });

  // Actions
  setCurrentStep(step: number): void {
    this._currentStep.set(step);
  }

  nextStep(): void {
    this._currentStep.update(current => Math.min(current + 1, 4));
  }

  previousStep(): void {
    this._currentStep.update(current => Math.max(current - 1, 1));
  }

  updateReservationData(data: Partial<ReservationData>): void {
    this._reservationData.update(current => ({ ...current, ...data }));
  }

  setLockInfo(lock: LockInfo | null): void {
    this._lockInfo.set(lock);
  }

  setAvailableSlots(slots: TimeSlot[]): void {
    this._availableSlots.set(slots);
  }

  setAlternatives(alternatives: Alternative[]): void {
    this._alternatives.set(alternatives);
  }

  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  clearError(): void {
    this._error.set(null);
  }

  reset(): void {
    this._currentStep.set(1);
    this._reservationData.set({});
    this._lockInfo.set(null);
    this._availableSlots.set([]);
    this._alternatives.set([]);
    this._error.set(null);
    this._sessionId.set(this.generateSessionId());
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
