import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs/operators';
import { ReservationStateService } from '../../services/reservation-state.service';

@Component({
  selector: 'app-step-guest-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-guest-info.component.html',
  styleUrl: './step-guest-info.component.scss'
})
export class StepGuestInfoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private stateService = inject(ReservationStateService);
  private router = inject(Router);

  form!: FormGroup;

  ngOnInit(): void {
    const data = this.stateService.reservationData();

    this.form = this.fb.group({
      customerName: [data.customerName || '', [Validators.required, Validators.minLength(2)]],
      email: [data.email || '', [Validators.required, Validators.email]],
      phone: [data.phone || '', [Validators.required, Validators.pattern(/^[+]?[\d\s\-()]{10,}$/)]]
    });

    // Auto-save on value changes (debounced)
    this.form.valueChanges.pipe(
      debounceTime(500)
    ).subscribe(value => {
      if (this.form.valid) {
        this.stateService.updateReservationData(value);
      }
    });
  }

  get nameControl() { return this.form.get('customerName')!; }
  get emailControl() { return this.form.get('email')!; }
  get phoneControl() { return this.form.get('phone')!; }

  onNext(): void {
    if (this.form.valid) {
      this.stateService.updateReservationData(this.form.value);
      this.stateService.nextStep();
      this.router.navigate(['/reservation/step/3']);
    } else {
      this.form.markAllAsTouched();
    }
  }

  onBack(): void {
    this.stateService.previousStep();
    this.router.navigate(['/reservation/step/1']);
  }
}
