import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs/operators';
import { ReservationStateService } from '../../services/reservation-state.service';

@Component({
  selector: 'app-step-party-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-party-details.component.html',
  styleUrl: './step-party-details.component.scss'
})
export class StepPartyDetailsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private stateService = inject(ReservationStateService);
  private router = inject(Router);

  form!: FormGroup;
  showBirthdayName = signal(false);

  ngOnInit(): void {
    const data = this.stateService.reservationData();

    this.form = this.fb.group({
      partySize: [data.partySize || 1, [Validators.required, Validators.min(1), Validators.max(12)]],
      childrenCount: [data.childrenCount || 0, [Validators.required, Validators.min(0)]],
      hasBirthday: [data.hasBirthday || false],
      birthdayName: [data.birthdayName || '']
    });

    // Validation: childrenCount cannot be greater than partySize
    this.form.get('childrenCount')?.addValidators(
      this.childrenCountValidator.bind(this)
    );

    // Revalidate childrenCount when partySize changes
    this.form.get('partySize')?.valueChanges.subscribe(() => {
      this.form.get('childrenCount')?.updateValueAndValidity();
    });

    // Show birthday name field if there's a birthday celebration
    this.form.get('hasBirthday')?.valueChanges.subscribe((hasBirthday) => {
      this.showBirthdayName.set(hasBirthday);

      if (hasBirthday) {
        this.form.get('birthdayName')?.setValidators([Validators.required]);
      } else {
        this.form.get('birthdayName')?.clearValidators();
      }
      this.form.get('birthdayName')?.updateValueAndValidity();
    });

    this.form.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(value => {
      if (this.form.valid) {
        this.stateService.updateReservationData(value);
      }
    });
  }

  childrenCountValidator(control: AbstractControl): ValidationErrors | null {
    const partySize = this.form?.get('partySize')?.value || 0;
    const childrenCount = control.value || 0;
    return childrenCount > partySize ? { exceedsPartySize: true } : null;
  }

  get partySizeControl() { return this.form.get('partySize')!; }
  get childrenCountControl() { return this.form.get('childrenCount')!; }
  get hasBirthdayControl() { return this.form.get('hasBirthday')!; }
  get birthdayNameControl() { return this.form.get('birthdayName')!; }

  onNext(): void {
    if (this.form.valid) {
      this.stateService.updateReservationData(this.form.value);
      this.stateService.nextStep();
      this.router.navigate(['/reservation/step/4']);
    } else {
      this.form.markAllAsTouched();
    }
  }

  onBack(): void {
    this.stateService.previousStep();
    this.router.navigate(['/reservation/step/2']);
  }
}
