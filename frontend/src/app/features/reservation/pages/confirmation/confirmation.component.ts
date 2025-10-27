import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ReservationApiService } from '../../services/reservation-api.service';
import { ReservationStateService } from '../../services/reservation-state.service';
import { RegionService } from '../../../../core/services/region.service';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ErrorMessageComponent } from '../../../../shared/components/error-message/error-message.component';
import { Reservation } from '../../../../core/models/reservation.model';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, LoaderComponent, ErrorMessageComponent],
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.scss'
})
export class ConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private reservationApi = inject(ReservationApiService);
  private regionService = inject(RegionService);
  private stateService = inject(ReservationStateService);
  private router = inject(Router);

  reservation = signal<Reservation | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.router.navigate(['/reservation/step/1']);
      return;
    }

    try {
      const reservation = await firstValueFrom(
        this.reservationApi.getReservation(id)
      );
      this.reservation.set(reservation);

      // Clear state after confirmation
      this.stateService.reset();
    } catch (error: any) {
      this.error.set('Failed to load reservation details');
      console.error(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  getRegionDisplayName(regionId: string): string {
    const region = this.regionService.getRegionById(regionId);
    return region?.displayName || 'Unknown Region';
  }

  makeNewReservation(): void {
    this.router.navigate(['/reservation/step/1']);
  }
}
