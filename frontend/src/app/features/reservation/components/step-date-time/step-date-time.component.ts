import { Component, OnInit, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReservationStateService } from '../../services/reservation-state.service';
import { AvailabilityService } from '../../services/availability.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';

@Component({
  selector: 'app-step-date-time',
  standalone: true,
  imports: [CommonModule, LoaderComponent, ErrorMessageComponent],
  templateUrl: './step-date-time.component.html',
  styleUrl: './step-date-time.component.scss'
})
export class StepDateTimeComponent implements OnInit {
  private stateService = inject(ReservationStateService);
  private availabilityService = inject(AvailabilityService);
  private wsService = inject(WebSocketService);
  private router = inject(Router);

  // Signals
  selectedDate = computed(() => this.stateService.reservationData().date);
  selectedTimeSlot = computed(() => this.stateService.reservationData().timeSlot);
  availableSlots = this.stateService.availableSlots;
  isLoading = this.stateService.isLoading;
  error = this.stateService.error;
  canProceed = computed(() => !!this.selectedDate() && !!this.selectedTimeSlot());

  readonly minDate = '2025-07-24';
  readonly maxDate = '2025-07-31';

  // Effect to load slots when date changes (must be in injection context)
  constructor() {
    effect(() => {
      const date = this.selectedDate();
      if (date) {
        this.loadAvailableSlots(date);
        this.wsService.subscribeToDate(date);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Subscribe to availability changes via WebSocket
    this.wsService.onAvailabilityChanged$.subscribe((data) => {
      console.log('🔄 Component received availability change:', data);
      const date = this.selectedDate();
      if (date) {
        console.log('🔄 Reloading slots for date:', date);
        this.loadAvailableSlots(date);
      }
    });
  }

  onDateChange(event: Event): void {
    const date = (event.target as HTMLInputElement).value;
    this.stateService.updateReservationData({ date, timeSlot: undefined });
  }

  onDateInput(event: Event): void {
    const date = (event.target as HTMLInputElement).value;
    if (date) {
      this.stateService.updateReservationData({ date, timeSlot: undefined });
    }
  }

  selectTimeSlot(timeSlot: string): void {
    this.stateService.updateReservationData({ timeSlot });
  }

  async loadAvailableSlots(date: string): Promise<void> {
    console.log('📅 Loading available slots for:', date);
    await this.availabilityService.fetchAvailableSlots(date);
    console.log('✅ Slots loaded:', this.availableSlots().length, 'slots');
  }

  onNext(): void {
    if (this.canProceed()) {
      this.stateService.nextStep();
      this.router.navigate(['/reservation/step/2']);
    }
  }
}
