import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReservationStateService } from '../../services/reservation-state.service';
import { ProgressIndicatorComponent } from '../../../../shared/components/progress-indicator/progress-indicator.component';
import { StepDateTimeComponent } from '../../components/step-date-time/step-date-time.component';
import { StepGuestInfoComponent } from '../../components/step-guest-info/step-guest-info.component';
import { StepPartyDetailsComponent } from '../../components/step-party-details/step-party-details.component';
import { StepPreferencesComponent } from '../../components/step-preferences/step-preferences.component';

@Component({
  selector: 'app-reservation-flow',
  standalone: true,
  imports: [
    CommonModule,
    ProgressIndicatorComponent,
    StepDateTimeComponent,
    StepGuestInfoComponent,
    StepPartyDetailsComponent,
    StepPreferencesComponent
  ],
  templateUrl: './reservation-flow.component.html',
  styleUrl: './reservation-flow.component.scss'
})
export class ReservationFlowComponent implements OnInit {
  private route = inject(ActivatedRoute);
  stateService = inject(ReservationStateService);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const stepNumber = parseInt(params.get('stepNumber') || '1');
      this.stateService.setCurrentStep(stepNumber);
    });
  }
}
