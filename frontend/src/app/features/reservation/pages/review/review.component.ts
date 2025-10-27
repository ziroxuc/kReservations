import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ReservationStateService } from '../../services/reservation-state.service';
import { ReservationApiService } from '../../services/reservation-api.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { RegionService } from '../../../../core/services/region.service';
import { LockTimerComponent } from '../../../../shared/components/lock-timer/lock-timer.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { ReservationData } from '../../../../core/models/reservation.model';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, LockTimerComponent, LoaderComponent, ErrorMessageComponent],
  templateUrl: './review.component.html',
  styleUrl: './review.component.scss'
})
export class ReviewComponent implements OnInit, OnDestroy {
  private stateService = inject(ReservationStateService);
  private reservationApi = inject(ReservationApiService);
  private regionService = inject(RegionService);
  private router = inject(Router);
  private wsService = inject(WebSocketService);

  reservationData = this.stateService.reservationData;
  lockInfo = this.stateService.lockInfo;
  isLoading = this.stateService.isLoading;
  error = this.stateService.error;

  private lockExpiredSub?: Subscription;

  ngOnInit(): void {
    // Verify that active lock exists
    if (!this.stateService.isLockActive()) {
      this.router.navigate(['/reservation/step/1']);
      return;
    }

    // Listen for lock expiration
    this.lockExpiredSub = this.wsService.onLockExpired$.subscribe((data) => {
      if (data.sessionId === this.stateService.sessionId()) {
        alert('Your reservation lock has expired. Please try again.');
        this.router.navigate(['/reservation/step/1']);
      }
    });
  }

  ngOnDestroy(): void {
    this.lockExpiredSub?.unsubscribe();
  }

  editStep(step: number): void {
    this.stateService.setCurrentStep(step);
    this.router.navigate([`/reservation/step/${step}`]);
  }

  async confirmReservation(): Promise<void> {
    this.stateService.setLoading(true);
    this.stateService.clearError();

    try {
      const data = this.reservationData();
      const reservation = await firstValueFrom(
        this.reservationApi.createReservation(
          data as ReservationData,
          this.stateService.sessionId()
        )
      );

      this.router.navigate(['/confirmation', reservation.id]);
    } catch (error: any) {
      this.stateService.setError(
        error.error?.message || 'Failed to confirm reservation. Please try again.'
      );
    } finally {
      this.stateService.setLoading(false);
    }
  }

  async cancelReservation(): Promise<void> {
    if (!confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    try {
      await firstValueFrom(
        this.reservationApi.releaseLock(this.stateService.sessionId())
      );
      this.stateService.reset();
      this.router.navigate(['/reservation/step/1']);
    } catch (error) {
      console.error('Error releasing lock:', error);
      this.router.navigate(['/reservation/step/1']);
    }
  }

  getRegionDisplayName(regionId: string): string {
    const region = this.regionService.getRegionById(regionId);
    return region?.displayName || 'Unknown Region';
  }
}
