import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationStateService } from '../../../features/reservation/services/reservation-state.service';

@Component({
  selector: 'app-progress-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-indicator.component.html',
  styleUrl: './progress-indicator.component.scss'
})
export class ProgressIndicatorComponent {
  private stateService = inject(ReservationStateService);

  currentStep = this.stateService.currentStep;

  steps = [
    { number: 1, label: 'Date & Time' },
    { number: 2, label: 'Guest Info' },
    { number: 3, label: 'Party Details' },
    { number: 4, label: 'Preferences' }
  ];
}
