import { Routes } from '@angular/router';
import { ReservationFlowComponent } from './features/reservation/pages/reservation-flow/reservation-flow.component';
import { ReviewComponent } from './features/reservation/pages/review/review.component';
import { ConfirmationComponent } from './features/reservation/pages/confirmation/confirmation.component';
import { reservationLockGuard } from './core/guards/reservation-lock.guard';
import { stepNavigationGuard } from './core/guards/step-navigation.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'reservation/step/1',
    pathMatch: 'full'
  },
  {
    path: 'reservation/step/:stepNumber',
    component: ReservationFlowComponent,
    canActivate: [stepNavigationGuard]
  },
  {
    path: 'review',
    component: ReviewComponent,
    canActivate: [reservationLockGuard]
  },
  {
    path: 'confirmation/:id',
    component: ConfirmationComponent
  },
  {
    path: '**',
    redirectTo: 'reservation/step/1'
  }
];
