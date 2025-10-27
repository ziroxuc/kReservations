import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, firstValueFrom } from 'rxjs';
import { ReservationStateService } from '../../services/reservation-state.service';
import { AvailabilityService } from '../../services/availability.service';
import { ReservationApiService } from '../../services/reservation-api.service';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { RegionSelectorComponent } from '../region-selector/region-selector.component';
import { AlternativeSlotsComponent } from '../alternative-slots/alternative-slots.component';
import { AvailabilityCheck, Alternative } from '../../../../core/models/availability.model';

@Component({
  selector: 'app-step-preferences',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderComponent, RegionSelectorComponent, AlternativeSlotsComponent],
  templateUrl: './step-preferences.component.html',
  styleUrl: './step-preferences.component.scss'
})
export class StepPreferencesComponent implements OnInit {
  private fb = inject(FormBuilder);
  protected stateService = inject(ReservationStateService);
  private availabilityService = inject(AvailabilityService);
  private reservationApi = inject(ReservationApiService);
  private router = inject(Router);

  form!: FormGroup;
  isChecking = signal(false);
  availabilityResult = signal<AvailabilityCheck | null>(null);
  alternatives = this.stateService.alternatives;

  ngOnInit(): void {
    const data = this.stateService.reservationData();

    this.form = this.fb.group({
      region: [data.region || null, [Validators.required]],
      hasSmokingRequest: [data.hasSmokingRequest || false]
    });

    // When region changes, validate availability
    this.form.valueChanges.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.checkAvailability();
    });
  }

  async checkAvailability(): Promise<void> {
    const region = this.form.get('region')?.value;
    if (!region) return;

    const data = this.stateService.reservationData();
    if (!data.date || !data.timeSlot || !data.partySize) return;

    this.isChecking.set(true);

    const result = await this.availabilityService.checkAvailability({
      date: data.date,
      timeSlot: data.timeSlot,
      regionId: region,
      partySize: data.partySize,
      childrenCount: data.childrenCount || 0,
      hasSmokingRequest: this.form.get('hasSmokingRequest')?.value
    });

    this.availabilityResult.set(result);
    this.isChecking.set(false);

    // If not available, load alternatives
    if (!result.available) {
      await this.availabilityService.fetchAlternatives({
        date: data.date,
        timeSlot: data.timeSlot,
        partySize: data.partySize,
        childrenCount: data.childrenCount || 0,
        hasSmokingRequest: this.form.get('hasSmokingRequest')?.value
      });
    }
  }

  async onLockAndProceed(): Promise<void> {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const result = this.availabilityResult();
    if (!result?.available) {
      this.stateService.setError('This slot is no longer available');
      return;
    }

    this.stateService.updateReservationData(this.form.value);
    this.stateService.setLoading(true);

    try {
      const data = this.stateService.reservationData();
      
      const lockInfo = await firstValueFrom(
        this.reservationApi.lockSlot({
          date: data.date!,
          timeSlot: data.timeSlot!,
          regionId: data.region!,
          sessionId: this.stateService.sessionId()
        })
      );

      this.stateService.setLockInfo(lockInfo);
      this.router.navigate(['/review']);
    } catch (error: any) {
      this.stateService.setError(error.error?.message || 'Failed to lock reservation');
    } finally {
      this.stateService.setLoading(false);
    }
  }

  onBack(): void {
    this.stateService.previousStep();
    this.router.navigate(['/reservation/step/3']);
  }

  onSelectAlternative(alternative: Alternative): void {
    this.stateService.updateReservationData({
      date: alternative.date,
      timeSlot: alternative.timeSlot,
      region: alternative.region
    });
    this.router.navigate(['/reservation/step/1']);
  }
}
