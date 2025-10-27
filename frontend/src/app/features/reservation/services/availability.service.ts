import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ReservationStateService } from './reservation-state.service';
import { TimeSlot, AvailabilityCheck, Alternative } from '../../../core/models/availability.model';

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private api = inject(ApiService);
  private stateService = inject(ReservationStateService);

  async fetchAvailableSlots(date: string): Promise<void> {
    this.stateService.setLoading(true);
    this.stateService.clearError();

    try {
      const slots = await firstValueFrom(
        this.api.get<TimeSlot[]>('/availability/slots', { date })
      );
      this.stateService.setAvailableSlots(slots);
    } catch (error: any) {
      this.stateService.setError('Failed to load available slots');
      console.error(error);
    } finally {
      this.stateService.setLoading(false);
    }
  }

  async checkAvailability(data: {
    date: string,
    timeSlot: string,
    regionId: string, // Now region ID instead of Region enum
    partySize: number,
    childrenCount: number,
    hasSmokingRequest: boolean
  }): Promise<AvailabilityCheck> {
    try {
      return await firstValueFrom(
        this.api.post<AvailabilityCheck>('/availability/check', data)
      );
    } catch (error) {
      console.error('Error checking availability:', error);
      return { available: false, reason: 'Error checking availability' };
    }
  }

  async fetchAlternatives(data: {
    date: string,
    timeSlot: string,
    partySize: number,
    childrenCount: number,
    hasSmokingRequest: boolean
  }): Promise<void> {
    try {
      const alternatives = await firstValueFrom(
        this.api.get<Alternative[]>('/availability/alternatives', data)
      );
      this.stateService.setAlternatives(alternatives);
    } catch (error) {
      console.error('Error fetching alternatives:', error);
      this.stateService.setAlternatives([]);
    }
  }
}
