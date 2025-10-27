import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationStateService } from '../../../features/reservation/services/reservation-state.service';

/**
 * Lock Timer Component
 *
 * Displays a real-time countdown timer showing remaining lock time.
 * Updates every second to show the descending countdown from 5 minutes.
 *
 * Features:
 * - Shows lock status with icon
 * - Displays time in MM:SS format
 * - Warning indicator when < 1 minute remains
 * - Automatically updates every second
 */
@Component({
  selector: 'app-lock-timer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lock-timer.component.html',
  styleUrl: './lock-timer.component.scss'
})
export class LockTimerComponent implements OnInit, OnDestroy {
  private stateService = inject(ReservationStateService);

  // Lock active state from service
  isActive = this.stateService.isLockActive;

  // Local signal for time remaining (updated every second)
  timeRemaining = signal<number>(0);

  // Computed signal for warning state (< 1 minute)
  isWarning = computed(() => this.timeRemaining() < 60000);

  private timerInterval?: ReturnType<typeof setInterval>;

  constructor() {
    // Effect to initialize timer when lock becomes active
    effect(() => {
      if (this.stateService.isLockActive()) {
        this.updateTimeRemaining();
      } else {
        this.timeRemaining.set(0);
      }
    });
  }

  ngOnInit(): void {
    // Update timer every second for real-time countdown
    this.timerInterval = setInterval(() => {
      this.updateTimeRemaining();
    }, 1000);

    // Initialize time immediately
    this.updateTimeRemaining();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  /**
   * Updates the time remaining from the state service
   * This ensures we always show the most current countdown value
   * Recalculates based on current time and lock expiration
   */
  private updateTimeRemaining(): void {
    const lock = this.stateService.lockInfo();
    if (!lock || !this.stateService.isLockActive()) {
      this.timeRemaining.set(0);
      return;
    }

    // Calculate remaining time based on current time
    const now = new Date().getTime();
    const expires = new Date(lock.expiresAt).getTime();
    const remaining = Math.max(0, expires - now);

    this.timeRemaining.set(remaining);
  }

  /**
   * Formats milliseconds into MM:SS format for display
   * @param ms - Milliseconds to format
   * @returns Formatted time string (e.g., "4:35" or "0:45")
   */
  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
